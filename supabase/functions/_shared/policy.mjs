export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class Rejection extends Error {constructor(status,message){super(message);this.status=status}}
export function requireThat(ok,message,status=400){if(!ok)throw new Rejection(status,message)}
export function number(value,min,max,name){requireThat(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,`invalid ${name}`);return value}
export function integer(value,min,max,name){const n=number(value,min,max,name);requireThat(Number.isInteger(n),`invalid ${name}`);return n}
export function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}
export function cleanLocal(value){
  requireThat(object(value),'invalid local preferences');
  const out={};
  if(value.name!==undefined){requireThat(typeof value.name==='string'&&value.name.length<=60,'invalid name');out.name=value.name.trim()}
  if(value.avatar!==undefined){requireThat(typeof value.avatar==='string'&&/^[\w-]{1,60}$/.test(value.avatar),'invalid avatar');out.avatar=value.avatar}
  if(value.set!==undefined){
    requireThat(object(value.set),'invalid settings');
    // Settings only, never cars, money, or arbitrary top-level save fields.
    const allowed=new Set(['q','vol','traffic','speed','voice','autoDoor','dynZoom','zoom','haptic','music','lang','units','leftHand','lh','btnScale','hudScale','difficulty','driverPlus','fps','shadows','particles','amb','radio','manual','vibration','sound','ctrl','camera','autoshift','showFPS','bs']);
    const safe=(v,depth=0)=>{
      if(typeof v==='boolean')return v;
      if(typeof v==='number'){requireThat(Number.isFinite(v)&&Math.abs(v)<=1000,'invalid setting');return v}
      if(typeof v==='string'){requireThat(v.length<=60,'invalid setting');return v}
      requireThat(object(v)&&depth<2&&Object.keys(v).length<=30,'invalid setting');
      const o={};for(const [k,x]of Object.entries(v)){requireThat(/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/.test(k)&&!['constructor','prototype','__proto__'].includes(k),'invalid setting key');o[k]=safe(x,depth+1)}return o;
    };
    out.set={};for(const[k,v]of Object.entries(value.set))if(allowed.has(k))out.set[k]=safe(v);
  }
  return out;
}
export function levelFor(xp){let level=1;const curve=[220,644,1208,1886,2666,3536,4491,5523,6630,7806,9049,10355,11723,13150,14634,16174,17767,19413,21110,22857];for(const threshold of curve){if(xp<threshold)return level;level++}let threshold=curve.at(-1);while(level<100){threshold+=Math.round(220*Math.pow(level,1.55));if(xp<threshold)break;level++}return level}
export const conditionParts=['engine','gearbox','susp','tires','brakes','body'];
export function garagePatch(request,owned,vehicle,catalog){
  const upgrades={...(owned.upgrades||{})},cosmetics={...(owned.cosmetics||{})};let cost=0;
  requireThat(request.upgrades===undefined||object(request.upgrades),'invalid upgrades');
  for(const[k,v]of Object.entries(request.upgrades||{})){
    const part=catalog.parts.find(p=>p.id===k);requireThat(part&&(!part.only||part.only===vehicle.cat),'unknown upgrade');
    const to=integer(v,0,part.max,k),from=Number(upgrades[k]||0);requireThat(to>=from,'upgrades cannot be downgraded');
    for(let tier=from+1;tier<=to;tier++)cost+=Math.round(1200*Math.pow(1.85,tier-1));upgrades[k]=to;
  }
  const prices={paint:800,paint2:400,stripe:300,stripeCol:0,rimT:600,rimC:200,tint:350,horn:450};
  requireThat(request.cosmetics===undefined||object(request.cosmetics),'invalid cosmetics');
  for(const[k,v]of Object.entries(request.cosmetics||{})){
    if(k==='stk'){requireThat(JSON.stringify(v)===JSON.stringify(request.stickers||[]),'sticker payload mismatch');continue}
    if(k==='rims'){
      requireThat(Array.isArray(v)&&v.length<=30&&v.every(id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,32}$/.test(id)),'invalid rims');
      const have=new Set(cosmetics.rims||[vehicle.rim||'steel']);for(const id of v)if(!have.has(id)){requireThat(catalog.rims?.some(r=>r.id===id),'unknown rim');cost+=600;have.add(id)}cosmetics.rims=[...have];continue;
    }
    requireThat(Object.hasOwn(prices,k),'unknown cosmetic');
    if(k==='paint2'&&v===null){cosmetics.paint2=null;continue}
    if(['paint','paint2','stripeCol','rimC'].includes(k))requireThat(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v),'invalid colour');
    else if(k==='tint')integer(v,0,3,k);
    else requireThat((typeof v==='string'&&/^[a-zA-Z0-9_-]{1,32}$/.test(v))||(typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=20),'invalid cosmetic value');
    if(JSON.stringify(cosmetics[k]??null)!==JSON.stringify(v))cost+=prices[k];cosmetics[k]=v;
  }
  if(request.stickers!==undefined){
    requireThat(Array.isArray(request.stickers)&&request.stickers.length<=12,'invalid stickers');
    // Existing sticker objects are small placement records. Reject markup and exotic keys.
    for(const s of request.stickers){requireThat(object(s)&&JSON.stringify(s).length<400,'invalid sticker');for(const[k,v]of Object.entries(s)){requireThat(['id','x','y','s','scale','rot','a','t','side','c','text','font','pos','col'].includes(k),'invalid sticker field');requireThat((typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000)||(typeof v==='string'&&v.length<=60&&!/[<>]/.test(v)),'invalid sticker value')}}
    if(JSON.stringify(cosmetics.stk||[])!==JSON.stringify(request.stickers))cost+=request.stickers.length*150;cosmetics.stk=request.stickers;
  }
  requireThat(cost<=500000,'garage total out of range',422);return {cost,upgrades,cosmetics};
}
