-- Read-only inspection. Run in staging, then review with the real schema owner.
select table_name,column_name,data_type,udt_name from information_schema.columns
where table_schema='public' and table_name in ('players','player_vehicles','saves','trips','flags','admins','admin_audit')
order by table_name,ordinal_position;
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('players','player_vehicles','saves','trips','flags','admins','admin_audit');
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
and table_name in ('players','player_vehicles','saves','trips','flags','admins','admin_audit');
select p.proname,p.prosecdef,p.proconfig,p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like 'admin_%' or p.proname like 'ogra_%');
