import {createClient} from 'npm:@supabase/supabase-js@2';
import {serve,reply,checked,requireThat,UUID} from '../_shared/http.ts';
serve(async({db,user,token,body:r})=>{
 const admin=await checked(db.from('admins').select('user_id').eq('user_id',user.id).maybeSingle());requireThat(admin,'admin only',403);
 const action=r.action;requireThat(['create_dev','set_password','delete_account'].includes(action),'unknown action');
 const note=typeof r.note==='string'?r.note.slice(0,500):null;
 const audit=async(phase,target,detail)=>checked(db.from('admin_audit').insert({admin_id:user.id,admin_email:user.email,action:action+'_'+phase,target,detail}));
 if(action==='create_dev'){
  const email=String(r.email||'').trim().toLowerCase(),password=String(r.password||''),name=r.name?String(r.name).slice(0,80):null;
  requireThat(email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'invalid email');requireThat(password.length>=12&&password.length<=128,'password must contain 12–128 characters');
  await audit('requested',user.id,{email,note});
  const made=await checked(db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name,dev:true}}));const id=made.user.id;
  try{
   await checked(db.from('players').upsert({id,email,name},{onConflict:'id'}));
   // Ignore duplicate save only; never overwrite an existing save with defaults.
   const save=await checked(db.from('saves').select('player_id').eq('player_id',id).maybeSingle());if(!save)await checked(db.from('saves').insert({player_id:id}));
   const asAdmin=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_ANON_KEY'),{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});
   await checked(asAdmin.rpc('admin_make_dev',{p_player:id,p_note:note}));
  }catch(e){
   // Only compensate the just-created account. Existing accounts are never removed.
   const rollback=await db.auth.admin.deleteUser(id);
   await audit('failed',id,{accountRemoved:!rollback.error});
   return reply(503,{error:rollback.error?'Provisioning failed; newly created account needs admin review.':'Provisioning failed; new sign-in account rolled back.',id});
  }
  try{await audit('completed',id,{email})}catch{return reply(200,{ok:true,id,email,auditPending:true})}
  return reply(200,{ok:true,id,email});
 }
 const id=String(r.id||'');requireThat(UUID.test(id),'invalid player id');
 const target=await checked(db.auth.admin.getUserById(id));requireThat(target?.user,'account not found',404);
 if(action==='set_password'){
  const password=String(r.password||'');requireThat(password.length>=12&&password.length<=128,'password must contain 12–128 characters');
  await audit('requested',id,{note});await checked(db.auth.admin.updateUserById(id,{password}));
 }else{
  requireThat(id!==user.id,'you cannot delete your own account');
  const otherAdmin=await checked(db.from('admins').select('user_id').eq('user_id',id).maybeSingle());requireThat(!otherAdmin,'Remove admin privileges before deleting this account.',409);
  await audit('requested',id,{note});
  // Auth deletion must succeed before any gameplay rows are removed.
  await checked(db.auth.admin.deleteUser(id));
  const cleanup=await db.from('players').delete().eq('id',id);
  if(cleanup.error){await audit('cleanup_required',id,{authDeleted:true});return reply(200,{ok:true,id,cleanupRequired:true})}
 }
 try{await audit('completed',id,null)}catch{return reply(200,{ok:true,id,auditPending:true})}
 return reply(200,{ok:true,id});
});
