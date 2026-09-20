import {createClient} from 'npm:@supabase/supabase-js@2';
import {Rejection,requireThat,object,UUID} from './policy.mjs';
export {requireThat,UUID};
export const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','access-control-allow-methods':'POST,GET,OPTIONS','cache-control':'no-store'};
export const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});
export function serve(handler,methods=['POST']){Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(!methods.includes(req.method))return reply(405,{error:'method not allowed'});
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();requireThat(token&&token.length<8192,'sign in required',401);
  const db=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.auth.getUser(token);requireThat(!error&&data?.user,'invalid session',401);
  let body={};if(req.method!=='GET'){
   requireThat(Number(req.headers.get('content-length')||0)<=32768,'request too large',413);
   const reader=req.body?.getReader();let bytes=0,chunks=[];
   if(reader){for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>32768){await reader.cancel();throw new Rejection(413,'request too large')}chunks.push(value)}}
   const buf=new Uint8Array(bytes);let off=0;for(const c of chunks){buf.set(c,off);off+=c.length}
   try{body=JSON.parse(new TextDecoder().decode(buf)||'{}')}catch{throw new Rejection(400,'bad JSON')}
   requireThat(object(body),'invalid body');
  }
  return await handler({req,db,user:data.user,token,body});
 }catch(e){if(e instanceof Rejection)return reply(e.status,{error:e.message});console.error('OGRA request failed',e?.code||e?.name||'unknown');return reply(503,{error:'service temporarily unavailable'})}
})}
export async function checked(query){const {data,error}=await query;if(error)throw error;return data}
export async function player(db,id){const p=await checked(db.from('players').select('*').eq('id',id).single());requireThat(p,'no player row',404);requireThat(!p.banned_until||new Date(p.banned_until)<=new Date(),'account suspended',403);return p}
export async function digest(body){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)))),x=>x.toString(16).padStart(2,'0')).join('')}
export async function receipt(db,uid,id,hash){requireThat(typeof id==='string'&&UUID.test(id),'requestId required');const r=await checked(db.from('ogra_receipts').select('fingerprint,result').eq('player_id',uid).eq('request_id',id).maybeSingle());if(r){requireThat(r.fingerprint===hash,'requestId already used for a different action',409);return r.result}return null}
export async function commit(db,p,id,hash,changes,result){
 const {data,error}=await db.rpc('ogra_commit',{p_uid:p.id,p_request:id,p_fingerprint:hash,p_revision:p.ogra_revision,p_changes:changes,p_result:result});
 if(error){if(error.message?.includes('conflict'))throw new Rejection(409,'Profile changed. Refresh and try again.');throw error}return reply(200,data);
}
