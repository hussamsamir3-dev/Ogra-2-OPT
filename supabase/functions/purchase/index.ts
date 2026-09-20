import catalog from '../_shared/catalog.json' with {type:'json'};
import {serve,reply,checked,player,requireThat,digest,receipt,commit} from '../_shared/http.ts';
import {number,conditionParts,garagePatch} from '../_shared/policy.mjs';
serve(async({db,user,body:r})=>{
 const p=await player(db,user.id),hash=await digest(r),prior=await receipt(db,p.id,r.requestId,hash);if(prior)return reply(200,prior);
 const changes:any={},kind=r.kind;let cost=0,extra={};
 if(kind==='vehicle'){
  const v=catalog.vehicles.find(v=>v.id===r.id);requireThat(v,'unknown vehicle');requireThat(v.lvl<=p.level,'level too low',403);
  const own=await checked(db.from('player_vehicles').select('vehicle_id').eq('player_id',p.id).eq('vehicle_id',v.id).maybeSingle());requireThat(!own,'already owned',409);
  cost=v.price;changes.vehicle={id:v.id,create:true,fuel:Math.min(15,v.tank)};
 }else if(['garage','upgrade','paint','repair','fuel'].includes(kind)){
  const v=catalog.vehicles.find(v=>v.id===r.vehicleId);requireThat(v,'unknown vehicle');
  const own=await checked(db.from('player_vehicles').select('*').eq('player_id',p.id).eq('vehicle_id',v.id).maybeSingle());requireThat(own,'not owned',403);
  changes.vehicle={id:v.id};
  if(kind==='fuel'){
   const amount=number(r.litres,.01,500,'litres'),tank=v.tank*(1+.2*Number(own.upgrades?.tank||0));
   const litres=Math.min(amount,Math.max(0,tank-Number(own.fuel)));requireThat(litres>.001,'tank already full',409);
   const fuel=own.upgrades?.cng?'cng':v.fuel;cost=Math.ceil(litres*catalog.fuels[fuel].price);changes.vehicle.fuel=Number(own.fuel)+litres;extra={litres};
  }else if(kind==='repair'){
   requireThat(conditionParts.includes(r.part),'unknown part');const cond={...(own.condition||{})};cost=Math.round(80+Math.max(0,100-Number(cond[r.part]??100))*26);cond[r.part]=100;changes.vehicle.condition=cond;
  }else{
   const patch=kind==='upgrade'?{upgrades:{[r.part]:r.tier}}:kind==='paint'?{cosmetics:{paint:r.paint,...(r.paint2?{paint2:r.paint2}:{}),...(r.stripe?{stripe:r.stripe}:{})}}:r;
   const priced=garagePatch(patch,own,v,catalog);cost=priced.cost;Object.assign(changes.vehicle,{upgrades:priced.upgrades,cosmetics:priced.cosmetics});
  }
 }else if(kind==='licence'){
  // Keep the supplied server's established licence prices and terms.
  const l={private:{price:1800,days:120},pro:{price:5200,days:90}}[r.id];requireThat(l,'unknown licence');cost=l.price;
  changes.player={licence_class:r.id,licence_exp:new Date(Date.now()+l.days*86400000).toISOString().slice(0,10),licence_pts:0};
 }else if(kind==='daily'){
  changes.claim='daily:'+new Date().toISOString().slice(0,10);cost=-500;
 }else if(kind==='claimMission'){
  // Daily objectives use recorded trips, not a client's "completed" flag.
  const trips=await checked(db.from('trips').select('passengers,distance_km,fines').eq('player_id',p.id).gte('started_at',new Date().toISOString().slice(0,10)).limit(500));
  const totals=trips.reduce((a,t)=>({pax:a.pax+Number(t.passengers||0),km:a.km+Number(t.distance_km||0)}),{pax:0,km:0});
  const rules={pax:[totals.pax>=25,350],trips:[trips.length>=2,400],km:[totals.km>=40,300],noFine:[trips.filter(t=>Number(t.fines)===0&&Number(t.distance_km)>1).length>=2,350],long:[trips.some(t=>Number(t.distance_km)>=30),600]};
  const rule=rules[r.missionId];requireThat(rule,'This mission needs server-verifiable evidence before it can be claimed.',422);requireThat(rule[0],'mission not completed',422);cost=-rule[1];changes.claim='mission:'+r.missionId+':'+new Date().toISOString().slice(0,10);
 }else if(kind==='spin'){
  requireThat(Number(p.cash)>=500,'insufficient funds',402);const wheel=[150,250,500,100,1000,200,350,2500],bytes=new Uint32Array(1);crypto.getRandomValues(bytes);const index=bytes[0]%wheel.length;cost=500-wheel[index];extra={spin:{index,won:wheel[index]}};
 }else requireThat(false,'unknown purchase kind');
 requireThat(Number(p.cash)>=cost,'insufficient funds',402);
 changes.player={...(changes.player||{}),cash:Number(p.cash)-cost};
 return commit(db,p,r.requestId,hash,changes,{ok:true,spent:cost,cash:Number(p.cash)-cost,...extra,stored:changes.vehicle||null});
});
