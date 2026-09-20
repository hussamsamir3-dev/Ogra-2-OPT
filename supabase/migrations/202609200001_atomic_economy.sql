-- STAGING FIRST. Existing players / player_vehicles / saves / trips / flags schema
-- is required. No player records are reset or recreated by this migration.
begin;
alter table public.players add column if not exists ogra_revision bigint not null default 0;
create table if not exists public.ogra_receipts (
 player_id uuid not null references public.players(id) on delete cascade,
 request_id uuid not null, fingerprint text not null, result jsonb not null,
 created_at timestamptz not null default now(), primary key(player_id,request_id)
);
create table if not exists public.ogra_runs (
 id uuid primary key, player_id uuid not null references public.players(id) on delete cascade,
 route_id text not null, vehicle_id text not null, started_at timestamptz not null default now(),
 settled_at timestamptz, abandoned boolean not null default false
);
create index if not exists ogra_runs_player on public.ogra_runs(player_id,started_at desc);
create table if not exists public.ogra_claims (
 player_id uuid not null references public.players(id) on delete cascade,
 claim text not null, created_at timestamptz not null default now(),primary key(player_id,claim)
);
alter table public.ogra_receipts enable row level security;
alter table public.ogra_runs enable row level security;
alter table public.ogra_claims enable row level security;
revoke all on public.ogra_receipts,public.ogra_runs,public.ogra_claims from public,anon,authenticated;
grant all on public.ogra_receipts,public.ogra_runs,public.ogra_claims to service_role;

create or replace function public.ogra_revision_bump() returns trigger
language plpgsql set search_path='' as $$
begin new.ogra_revision=old.ogra_revision+1;return new;end $$;
drop trigger if exists ogra_revision_bump on public.players;
create trigger ogra_revision_bump before update on public.players for each row execute function public.ogra_revision_bump();
create or replace function public.ogra_vehicle_revision() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.players set ogra_revision=ogra_revision where id=coalesce(new.player_id,old.player_id);
 return coalesce(new,old);
end $$;
drop trigger if exists ogra_vehicle_revision on public.player_vehicles;
create trigger ogra_vehicle_revision after insert or update or delete on public.player_vehicles for each row execute function public.ogra_vehicle_revision();

create or replace function public.ogra_save_preferences(p_uid uuid,p_local jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if jsonb_typeof(p_local)<>'object' or pg_column_size(p_local)>32768 then raise exception 'invalid preferences';end if;
 -- Top-level merge and settings merge; empty reads never clear the save.
 insert into public.saves(player_id,data,updated_at) values(p_uid,p_local,now())
 on conflict(player_id) do update set data=coalesce(public.saves.data,'{}'::jsonb)||excluded.data||
 case when excluded.data?'set' then jsonb_build_object('set',coalesce(public.saves.data->'set','{}'::jsonb)||(excluded.data->'set')) else '{}'::jsonb end,updated_at=now();
end $$;

create or replace function public.ogra_start_run(p_uid uuid,p_id uuid,p_route text,p_vehicle text) returns public.ogra_runs
language plpgsql security definer set search_path='' as $$
declare r public.ogra_runs;
begin
 perform 1 from public.players where id=p_uid and (banned_until is null or banned_until<=now()) for update;
 if not found then raise exception 'player unavailable';end if;
 select * into r from public.ogra_runs where id=p_id;
 if found then
  if r.player_id<>p_uid or r.route_id<>p_route or r.vehicle_id<>p_vehicle or r.abandoned or r.settled_at is not null then raise exception 'run conflict';end if;
  return r;
 end if;
 if not exists(select 1 from public.player_vehicles where player_id=p_uid and vehicle_id=p_vehicle) then raise exception 'not owned';end if;
 update public.ogra_runs set abandoned=true where player_id=p_uid and settled_at is null and not abandoned;
 insert into public.ogra_runs(id,player_id,route_id,vehicle_id) values(p_id,p_uid,p_route,p_vehicle) returning * into r;
 return r;
end $$;

-- Only the authenticated Edge Functions (service role) may call this RPC.
-- Prices and evidence validation occur in Edge; the database enforces one
-- transaction, revision checks, ownership scope, claims and replay protection.
create or replace function public.ogra_commit(p_uid uuid,p_request uuid,p_fingerprint text,p_revision bigint,p_changes jsonb,p_result jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.players; n public.players; prior public.ogra_receipts; v public.player_vehicles;
 patch jsonb; k text; out_result jsonb; run public.ogra_runs;
begin
 select * into p from public.players where id=p_uid for update;
 if not found or (p.banned_until is not null and p.banned_until>now()) then raise exception 'player unavailable';end if;
 select * into prior from public.ogra_receipts where player_id=p_uid and request_id=p_request;
 if found then
  if prior.fingerprint<>p_fingerprint then raise exception 'receipt conflict';end if;
  return prior.result;
 end if;
 if p.ogra_revision<>p_revision then raise exception 'revision conflict';end if;
 if p_changes?'claim' then
  -- Legacy claims are respected when upgrading an existing database.
  if exists(select 1 from public.flags where player_id=p_uid and kind=p_changes->>'claim') then raise exception 'claim conflict';end if;
  if exists(select 1 from public.ogra_claims where player_id=p_uid and claim=p_changes->>'claim') then raise exception 'claim conflict';end if;
  insert into public.ogra_claims(player_id,claim) values(p_uid,p_changes->>'claim');
 end if;
 if p_changes?'runId' then
  select * into run from public.ogra_runs where id=(p_changes->>'runId')::uuid and player_id=p_uid for update;
  if not found or run.abandoned or run.settled_at is not null then raise exception 'run conflict';end if;
  update public.ogra_runs set settled_at=now() where id=run.id;
 end if;
 patch=coalesce(p_changes->'player','{}'::jsonb);
 for k in select jsonb_object_keys(patch) loop
  if not k=any(array['cash','xp','level','licence_class','licence_exp','licence_pts','total_trips','total_pax','total_km','total_fines']) then raise exception 'invalid player field';end if;
 end loop;
 select * into n from jsonb_populate_record(p,patch);
 if n.cash<0 or n.xp<0 or n.level<1 then raise exception 'invalid economy values';end if;
 update public.players set cash=n.cash,xp=n.xp,level=n.level,licence_class=n.licence_class,licence_exp=n.licence_exp,licence_pts=n.licence_pts,total_trips=n.total_trips,total_pax=n.total_pax,total_km=n.total_km,total_fines=n.total_fines,last_seen=now() where id=p_uid;
 if p_changes?'vehicle' then
  patch=p_changes->'vehicle';
  if coalesce((patch->>'create')::boolean,false) then
   insert into public.player_vehicles(player_id,vehicle_id,fuel) values(p_uid,patch->>'id',(patch->>'fuel')::numeric);
  else
   select * into v from public.player_vehicles where player_id=p_uid and vehicle_id=patch->>'id' for update;
   if not found then raise exception 'vehicle ownership conflict';end if;
   select * into v from jsonb_populate_record(v,patch-'id'-'create');
   if v.fuel<0 then raise exception 'invalid fuel';end if;
   update public.player_vehicles set fuel=v.fuel,condition=v.condition,upgrades=v.upgrades,cosmetics=v.cosmetics where player_id=p_uid and vehicle_id=patch->>'id';
  end if;
 end if;
 if p_changes?'trip' then
  patch=p_changes->'trip';
  insert into public.trips(player_id,route_id,vehicle_id,started_at,duration_s,passengers,distance_km,fare_earned,tips,fines,fuel_cost,net,xp_gained)
  values(p_uid,patch->>'route_id',patch->>'vehicle_id',(patch->>'started_at')::timestamptz,(patch->>'duration_s')::integer,(patch->>'passengers')::integer,(patch->>'distance_km')::numeric,(patch->>'fare_earned')::numeric,(patch->>'tips')::numeric,(patch->>'fines')::numeric,(patch->>'fuel_cost')::numeric,(patch->>'net')::numeric,(patch->>'xp_gained')::integer);
 end if;
 select * into p from public.players where id=p_uid;
 out_result=p_result||jsonb_build_object('revision',p.ogra_revision);
 if out_result?'player' then out_result=jsonb_set(out_result,'{player,revision}',to_jsonb(p.ogra_revision),true);end if;
 insert into public.ogra_receipts(player_id,request_id,fingerprint,result) values(p_uid,p_request,p_fingerprint,out_result);
 return out_result;
end $$;
revoke all on function public.ogra_revision_bump(),public.ogra_vehicle_revision(),public.ogra_save_preferences(uuid,jsonb),public.ogra_start_run(uuid,uuid,text,text),public.ogra_commit(uuid,uuid,text,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ogra_save_preferences(uuid,jsonb),public.ogra_start_run(uuid,uuid,text,text),public.ogra_commit(uuid,uuid,text,bigint,jsonb,jsonb) to service_role;
commit;
