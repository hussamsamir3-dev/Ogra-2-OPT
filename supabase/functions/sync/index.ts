import {serve,reply,checked,player,requireThat} from '../_shared/http.ts';
import {cleanLocal} from '../_shared/policy.mjs';
serve(async({req,db,user,body})=>{
 const p=await player(db,user.id);
 // Empty sync is a read: sign-in and post-purchase refresh must not erase preferences.
 if(req.method==='POST'&&body.local&&Object.keys(body.local).length){
  const clean=cleanLocal(body.local);
  if(Object.keys(clean).length)await checked(db.rpc('ogra_save_preferences',{p_uid:user.id,p_local:clean}));
 }
 const vehicles=await checked(db.from('player_vehicles').select('*').eq('player_id',p.id));
 const save=await checked(db.from('saves').select('data').eq('player_id',p.id).maybeSingle());
 return reply(200,{ok:true,protocol:2,player:{email:p.email,name:p.name,cash:Number(p.cash),xp:Number(p.xp),level:p.level,revision:p.ogra_revision,reputation:Number(p.reputation),licence:{cls:p.licence_class,exp:p.licence_exp,pts:p.licence_pts},stats:{trips:p.total_trips,pax:p.total_pax,km:Number(p.total_km),fines:Number(p.total_fines)}},vehicles:vehicles.map(v=>({id:v.vehicle_id,fuel:Number(v.fuel),cond:v.condition,cosmetics:v.cosmetics,upgrades:v.upgrades,current:v.is_current})),local:save?.data||{}});
},['POST','GET']);
