/* OGRA Driver+ — extends the existing simulation and UI, no economy authority. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const tr = (en,ar) => LANG.cur === 'ar' ? ar : en;
  const num = v => Number.isFinite(+v) ? +v : 0;
  const defaults = {quality:'auto',coach:true,motion:true,haptic:false};
  function prefs(){ return Object.assign({}, defaults, S().set.driverPlus || {}); }
  const btn = (a,label) => `<button type="button" data-drive="${a}">${label}</button>`;
  let oldFocus, wasPaused, dialogG, uiClock=0, slowTime=0, frameEMA=16.7, lastDraw=0;
  window.OGRA_BUILD = '2026-09-20-driver-plus-2';
  const prep=prepSession;prepSession=function(G){
    const out=prep.apply(this,arguments);
    if(G.mode!=='attract'){
      G.dpFuelStart=num(G.car.fuel);
      if(G.route&&ogOnline()&&OGRA_NET.protocol>=2)G._netRun=(async()=>{
        const userId=OGRA_NET.user?.id;
        await OGRA_NET._settlement;
        if(userId!==OGRA_NET.user?.id)return {error:'account changed'};
        const pending=await OGRA_NET.retryTrip();
        if(pending&&!pending.ok){UI.toast(tr('Previous trip needs confirmation. This shift cannot bank until it is resolved.','الرحلة السابقة محتاجة تأكيد. الوردية دي مش هتتحفظ أونلاين لحد حلها.'),5000);return pending}
        return OGRA_NET.call('trip',{action:'start',requestId:OGRA_NET.uuid(),routeId:G.route.id,vehicleId:G.vid});
      })();
    }
    return out;
  };

  function resetInputs(){
    Object.keys(KEYS).forEach(k=>KEYS[k]=false);
    UI.pedal.gas=UI.pedal.brake=0;UI.hornDown=false;
    INP.gas=INP.brake=0;INP.horn=false;AU.hornOff();
  }
  function quality(){
    const p=prefs();
    document.body.classList.toggle('dpReduceMotion',!p.motion);
    window.OGRA_DPR_CAP=p.quality==='eco'?1:p.quality==='high'?2:matchMedia('(pointer:coarse)').matches?1.5:2;
    if(RD.cv)resize();
  }
  function close(){
    if(!el('dpDialog'))return;
    el('dpDialog').remove();resetInputs();
    if(GAME.state==='play'&&GAME.G===dialogG&&!GAME.G.ended){GAME.paused=wasPaused;AU.pauseGame(wasPaused)}
    oldFocus?.focus?.();
  }
  function open(){
    if(el('dpDialog'))return;
    oldFocus=document.activeElement;wasPaused=GAME.paused;dialogG=GAME.G;
    if(GAME.state==='play'){resetInputs();GAME.paused=true;AU.pauseGame(true)}
    const p=prefs(),G=GAME.state==='play'?GAME.G:null;
    const stops=(G?.world.stations||[]).filter(s=>s.x>=G.car.x-10).slice(0,6);
    const box=document.createElement('div');box.id='dpDialog';box.dir=LANG.cur==='ar'?'rtl':'ltr';
    box.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="dpTitle" class="dpPanel"><header><div><small>OGRA / DRIVER+</small><h2 id="dpTitle">${tr('Your driving studio','استوديو السواقة')}</h2></div>${btn('close','✕')}</header>
      <div class="dpColumns"><section><h3>${tr('Road companion','رفيق الطريق')}</h3><p>${tr('Live guidance, a calmer drive, and your next stops in one place.','إرشادات مباشرة وسواقة أهدى ومحطاتك الجاية في مكان واحد.')}</p>
      <label>${tr('Driving guidance','إرشادات السواقة')}<input data-pref="coach" type="checkbox" ${p.coach?'checked':''}></label>
      <label>${tr('Interface animation & camera shake','حركة الواجهة واهتزاز الكاميرا')}<input data-pref="motion" type="checkbox" ${p.motion?'checked':''}></label>
      <label>${tr('Haptic road alerts (supported devices)','اهتزاز التنبيهات (الأجهزة المدعومة)')}<input data-pref="haptic" type="checkbox" ${p.haptic?'checked':''}></label>
      <label>${tr('Graphics','الرسومات')}<select data-pref="quality"><option value="auto" ${p.quality==='auto'?'selected':''}>${tr('Adaptive','متكيفة')}</option><option value="high" ${p.quality==='high'?'selected':''}>${tr('High detail','تفاصيل عالية')}</option><option value="eco" ${p.quality==='eco'?'selected':''}>${tr('Battery saver','توفير البطارية')}</option></select></label>
      <p class="dpMuted">${tr('Adaptive graphics reduce resolution if rendering stays slow. Driving physics remain unchanged.','الرسومات المتكيفة بتقلل الدقة لو الأداء بطّأ باستمرار. فيزياء القيادة زي ما هي.')}</p>
      ${G?`<h3>${tr('Cruise control','مثبّت السرعة')}</h3><div class="dpCruise">${btn('slower','−5')}<b>${Math.round(G.dp?.target||40)} km/h</b>${btn('faster','+5')}${btn('cruise',G.dp?.cruise?tr('Disengage','إلغاء'):tr('Engage','تشغيل'))}</div><p class="dpMuted">${tr('Keeps your selected speed. Brake, reverse, doors, or handbrake disengage it. You must steer and brake for traffic. C toggles cruise.','بيحافظ على السرعة المختارة. الفرامل أو الرجوع أو الباب أو فرامل اليد بيلغوه. إنت المسؤول عن الحارة والفرملة للزحمة. C للتشغيل.')}</p>`:''}
      </section><section><h3>${G?tr('Route briefing','خطة الطريق'):tr('Ready for your next shift?','جاهز للوردية الجاية؟')}</h3>
      ${G?`<div class="dpSummary"><b>${esc(G.route?tn(G.route.n):tr('Free drive','جولة حرة'))}</b><span>${num(G.car.fuel).toFixed(1)} L · ${tr('estimated range','مدى تقديري')} ${Math.round(G.car.fuel/Math.max(1,G.car.spec.lp100)*100)} km</span></div><ol class="dpStops">${stops.map(s=>`<li><span>${esc(tn(s.n))}</span><b>${Math.max(0,(s.x-G.car.x)*G.scale/1000).toFixed(1)} km</b></li>`).join('')||`<li>${tr('Open road ahead','الطريق مفتوح قدامك')}</li>`}</ol>`:`<div class="dpSummary"><b>${tr('Drive with purpose','كل مشوار له هدف')}</b><span>${tr('Choose a route and a skill contract at HQ. Earn a clean streak, serve passengers, and beat your own best shift.','اختار خط وتحدي مهارة من مركز السائق. سوق بنضافة وخد الركاب واكسر أحسن نتيجة ليك.')}</span></div>`}
      <h3>${tr('Quick start','بداية سريعة')}</h3><ol class="dpHelp"><li>${tr('Start the engine, select D, release the handbrake.','شغّل المحرك واختار D وفك فرامل اليد.')}</li><li>${tr('Hold the accelerator. Slide upward for more power.','دوس البنزين وحرّك صباعك لفوق لقوة أكتر.')}</li><li>${tr('Brake early at stops. Open the doors when stationary.','افرمل بدري عند المحطة وافتح الباب وإنت واقف.')}</li><li>${tr('P / Esc pauses. C controls cruise. Keep a safe gap.','P / Esc للإيقاف. C للمثبّت. سيب مسافة أمان.')}</li></ol>
      </section></div><footer>${btn('close',tr('Back to the road','رجوع'))}</footer></section>`;
    document.body.appendChild(box);box.querySelector('button').focus();
  }
  function run(G){return G.dp||(G.dp={cruise:false,target:40,gap:Infinity,coach:'',warnAt:-99,stops:0,served:new Set(),crashes:num(G.trip.crashes),fuel0:num(G.car.fuel)})}
  function cruise(){
    const G=GAME.G;if(GAME.state!=='play'||!G||G.ended)return;
    const d=run(G),c=G.car;
    if(d.cruise){d.cruise=false;return}
    if(!c.on||c.sel!=='D'||c.hand||c.door){UI.toast(tr('Engine on, D selected, doors closed and handbrake released.','شغّل المحرك واختار D واقفل الباب وفك فرامل اليد.'));return}
    d.target=clamp(Math.round(Math.max(20,c.vx*3.6)/5)*5,20,100);d.cruise=true;
  }
  function action(a){
    if(a==='open')return open();if(a==='close')return close();
    const d=GAME.G&&run(GAME.G);
    if(a==='cruise')cruise();
    if(d&&a==='faster')d.target=clamp(d.target+5,20,100);
    if(d&&a==='slower')d.target=clamp(d.target-5,20,100);
    if(el('dpDialog')){const paused=wasPaused,focus=oldFocus;el('dpDialog').remove();open();wasPaused=paused;oldFocus=focus}
  }
  addEventListener('click',e=>{const b=e.target.closest?.('[data-drive]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();action(b.dataset.drive)},true);
  document.addEventListener('change',e=>{const key=e.target.dataset.pref;if(!Object.hasOwn(defaults,key))return;const p=prefs();p[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;S().set.driverPlus=p;saveGame();quality()});
  addEventListener('keydown',e=>{
    if(el('dpDialog')){
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return}
      if(e.key==='Tab'){const items=[...el('dpDialog').querySelectorAll('button,input,select')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
    }
    if(e.key.toLowerCase()==='c'&&!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&GAME.state==='play'&&!GAME.paused){e.preventDefault();cruise()}
  },true);
  const toHub=UI.toHub;UI.toHub=function(){el('dpDialog')?.remove();return toHub.apply(this,arguments)};
  const show=UI.show;UI.show=function(name){const out=show.apply(this,arguments);if(name==='hub'){const dock=document.querySelector('.nsDock');if(dock&&!dock.querySelector('[data-drive]'))dock.insertAdjacentHTML('beforeend',btn('open','<span class="dpOrbit">◉</span><span>Driver+</span>'));quality()}return out};
  const build=UI.buildHud;UI.buildHud=function(G){
    const out=build.apply(this,arguments);run(G);
    const gas=el('pGas')?.querySelector('span');if(gas)gas.textContent=tr('ACCELERATOR','بنزين');
    const paths={pause:'M8 5v14M16 5v14',door:'M5 21V3h14v18M5 14h14M14 17h2',lane:'M6 20V8m0 0L2 12m4-4 4 4M18 4v12m0 0-4-4m4 4 4-4',lights:'M12 5a7 7 0 0 0 0 14V5ZM16 6h6M16 10h6M16 14h6M16 18h6',hazard:'M12 3 2 21h20L12 3Zm0 6v6m0 3v1'};
    for(const[a,path]of Object.entries(paths)){const b=el('hud').querySelector(`[data-a="${a}"]`);if(b){b.innerHTML=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;b.setAttribute('aria-label',({pause:tr('Pause','إيقاف'),door:tr('Doors','الأبواب'),lane:tr('Change lane','تغيير الحارة'),lights:tr('Headlights','الأنوار'),hazard:tr('Hazard lights','الانتظار')})[a])}}
    el('hud').insertAdjacentHTML('beforeend',`<div id="dpBar"><button data-drive="open" aria-label="${tr('Open driving studio','افتح استوديو السواقة')}"><span class="dpOrbit">◉</span> DRIVER+</button><span id="dpGuidance"></span><button data-drive="cruise" id="dpCruiseBtn" aria-label="${tr('Toggle cruise control','تشغيل مثبّت السرعة')}">CC</button></div>`);return out;
  };

  // Input assist acts on the normal throttle, preserving the existing drivetrain.
  const update=updateGame;updateGame=function(G,dt,input){
    if(G.mode==='attract')return update.apply(this,arguments);
    const d=run(G),c=G.car;
    if(d.cruise){
      if(num(input.brake)>.05||!c.on||c.sel!=='D'||c.hand||c.door||num(G.trip.crashes)>d.crashes)d.cruise=false;
      else input=Object.assign({},input,{gas:Math.max(num(input.gas),clamp((d.target/3.6-c.vx)*.22+.15,0,1))});
    }
    const out=update.call(this,G,dt,input);d.crashes=num(G.trip.crashes);
    if(G.ended||GAME.paused)return out;
    const speed=Math.abs(c.vx)*3.6,limit=G.world.segAt(c.x).lim||60;
    let gap=Infinity,relative=0;
    for(const o of G.traffic){if(o.parked||Math.abs(o.lp-c.lane)>.45)continue;const g=o.x-c.x-(o.L+c.spec.L)/2;if(g>=0&&g<gap){gap=g;relative=c.vx-(o.lane?-o.v:o.v)}}
    d.gap=gap;
    const stop=(G.world.stations||[]).find(s=>s.x>c.x-4);
    const danger=relative>1&&gap/relative<2&&speed>12;
    d.coach=!c.on?tr('Start your engine','شغّل المحرك'):c.hand?tr('Release handbrake','فك فرامل اليد'):c.sel==='N'?tr('Select D to drive','اختار D للتحرك'):c.door?tr('Close the doors','اقفل الأبواب'):danger?tr('Brake • traffic ahead','افرمل • زحمة قدامك'):speed>limit+3?tr('Ease off • speed limit','هدي • حد السرعة'):G.wet?tr('Wet road • leave more space','طريق مبلول • زوّد المسافة'):stop&&stop.x-c.x<70?tr('Stop ahead • brake gently','محطة قدامك • افرمل بهدوء'):tr('Stay smooth • keep your distance','سوق بهدوء • سيب مسافة');
    d.danger=danger;
    if(danger&&G.clock-d.warnAt>8){d.warnAt=G.clock;if(prefs().coach){AU.ui('no');if(prefs().haptic&&navigator.vibrate)navigator.vibrate(30)}}
    // Passenger service achievements are feedback only; payouts still use the server.
    if(G.atStation&&speed<2&&c.door&&!d.served.has(G.atStation)&&G.onboard.length){d.served.add(G.atStation);d.stops++;if(d.stops%3===0)UI.toast(tr('SERVICE RHYTHM · 3 stops served','خدمة ممتازة · ٣ محطات'),2300)}
    uiClock+=dt;if(uiClock>=.2){uiClock=0;const text=el('dpGuidance');if(text){text.textContent=prefs().coach?d.coach:'';text.parentElement.classList.toggle('danger',danger&&prefs().coach)}const b=el('dpCruiseBtn');if(b){b.textContent=d.cruise?'CC '+d.target:'CC';b.classList.toggle('on',d.cruise)}}
    if(!prefs().motion)RD.shake=0;
    return out;
  };
  // Weather-aware AI headways and a local speed-limit target, on the existing IDM.
  const traffic=updTraffic;updTraffic=function(G,dt){
    for(const o of G.traffic){if(o.parked||o.dead||o.siren||o.jamV||o.broke)continue;
      if(o.dpSpeed==null){o.dpSpeed=o.v0;o.dpHeadway=o.Th||1.3;o.dpLimit=G.world.segAt(o.x).lim||60}
      const limit=G.world.segAt(o.x).lim||60,weather=G.wet?.78:G.weather==='fog'?.85:1;
      o.Th=o.dpHeadway*(G.wet?1.5:1);
      const target=Math.min(o.dpSpeed*limit/o.dpLimit,limit/3.6*1.05)*weather;
      o.v0+= (target-o.v0)*Math.min(1,dt*.8);
    }
    return traffic.apply(this,arguments);
  };
  // Adaptive resolution only: never slow simulation time to claim higher FPS.
  const render=renderScene;renderScene=function(G,dt){
    const now=performance.now(),elapsed=now-lastDraw;lastDraw=now;
    if(GAME.state==='play'&&!GAME.paused&&elapsed<150){frameEMA=frameEMA*.97+elapsed*.03;if(prefs().quality==='auto'&&frameEMA>30)slowTime+=dt;else slowTime=Math.max(0,slowTime-dt);if(slowTime>6&&window.OGRA_DPR_CAP>1){window.OGRA_DPR_CAP=Math.max(1,window.OGRA_DPR_CAP-.25);slowTime=0;resize()}}
    return render.apply(this,arguments);
  };
  window.OGRA_DRIVER_PLUS={version:'2.0.0',open,close,quality,frameMs:()=>frameEMA};
})();
