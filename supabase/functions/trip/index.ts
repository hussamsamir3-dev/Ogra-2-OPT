import catalog from '../_shared/catalog.json' with {type:'json'};
import {serve,reply,checked,player,requireThat,digest,receipt,commit,UUID} from '../_shared/http.ts';
import {number,integer,levelFor} from '../_shared/policy.mjs';
serve(async({db,user,body:r})=>{
 const p=await player(db,user.id);
 const route=catalog.routes.find(x=>x.id===r.routeId),v=catalog.vehicles.find(x=>x.id===r.vehicleId);requireThat(route&&v,'unknown route or vehicle');
 requireThat(p.level>=route.lvl,'route locked',403);
 const own=await checked(db.from('player_vehicles').select('*').eq('player_id',p.id).eq('vehicle_id',v.id).maybeSingle());requireThat(own,'not owned',403);
 if(r.action==='start'){
  requireThat(typeof r.requestId==='string'&&UUID.test(r.requestId),'requestId required');
  const run=await checked(db.rpc('ogra_start_run',{p_uid:p.id,p_id:r.requestId,p_route:route.id,p_vehicle:v.id}));
  return reply(200,{ok:true,runId:run.id});
 }
 requireThat(typeof r.runId==='string'&&UUID.test(r.runId),'Start an online shift before reporting it.',409);
 const hash=await digest(r),prior=await receipt(db,p.id,r.runId,hash);if(prior)return reply(200,prior);
 const run=await checked(db.from('ogra_runs').select('*').eq('id',r.runId).eq('player_id',p.id).maybeSingle());
 requireThat(run&&run.route_id===route.id&&run.vehicle_id===v.id&&!run.settled_at&&!run.abandoned,'invalid or closed shift',409);
 const elapsed=(Date.now()-new Date(run.started_at).getTime())/1000;
 requireThat(elapsed>=0&&elapsed<=14400,'shift expired',422);
 const duration=number(r.durationS,0,14400,'duration'),km=number(r.distanceKm,0,route.km*1.1,'distance');
 const passengers=integer(r.passengers,0,Math.min(300,v.seats*Math.max(2,route.stops)),'passengers');
 // Route compression is fixed by the shipped route catalog, never by a body multiplier.
 const scale=route.km*1000/route.gameM;
 requireThat(duration<=elapsed*4+10,'invalid duration',422);
 requireThat(km<=((elapsed+3)*65*scale/1000),'distance exceeds elapsed time',422);
 requireThat(passengers<=Math.floor(elapsed/2)+v.seats,'passengers exceed elapsed time',422);
 const engaged=km>=.05&&elapsed>=5;
 requireThat(engaged||passengers===0,'empty shift cannot claim passengers',422);
 const base=engaged?Math.round(route.fare*passengers):0;
 // Self-reported star ratings/on-time flags no longer mint unverifiable bonus cash.
 const finesTable={no_licence:1500,expired_licence:800,wrong_class:1200,over_capacity:500,poor_condition:400,at_fault_crash:300,speed_camera:150,red_light:400,pedestrian_hit:3000};
 requireThat(r.fines===undefined||Array.isArray(r.fines)&&r.fines.length<=100,'invalid fines');
 let fines=0;for(const key of r.fines||[]){requireThat(Object.hasOwn(finesTable,key),'unknown fine');fines+=finesTable[key]}
 const reported=number(r.litresUsed??0,0,500,'fuel used');
 const used=engaged?Math.max(reported,km*v.lp100/100*.45):0;
 requireThat(used<=Number(own.fuel)+.25,'reported journey exceeds available fuel',422);
 const net=base-fines,xpGain=engaged?Math.round(km*1.5+passengers*4):0;
 requireThat(base<=120000,'payout outside permitted range',422);
 const xp=Number(p.xp)+xpGain,cash=Math.max(0,Number(p.cash)+net),level=Math.max(Number(p.level),levelFor(xp));
 const changes:any={runId:run.id,player:{cash,xp,level,total_trips:Number(p.total_trips||0)+(engaged?1:0),total_pax:Number(p.total_pax||0)+passengers,total_km:Number(p.total_km||0)+km,total_fines:Number(p.total_fines||0)+fines},vehicle:{id:v.id,fuel:Math.max(0,Number(own.fuel)-used)}};
 if(engaged)changes.trip={route_id:route.id,vehicle_id:v.id,started_at:run.started_at,duration_s:Math.round(duration),passengers,distance_km:km,fare_earned:base,tips:0,fines,fuel_cost:0,net,xp_gained:xpGain};
 return commit(db,p,run.id,hash,changes,{ok:true,breakdown:{base,bonus:0,tips:0,fines,fuelCost:0,net,xpGain},player:{cash,xp,level}});
});
