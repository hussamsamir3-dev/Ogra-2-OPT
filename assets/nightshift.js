/* OGRA Nightshift — menu, lifecycle, and optional local skill contracts.
   No external dependencies. Online cash/XP remain exclusively server-owned. */
(() => {
  'use strict';
  if (typeof UI === 'undefined' || typeof GAME === 'undefined') return;
  window.OGRA_BUILD = '2026-09-19-nightshift-1';
  window.__ogNoTouchAct = true;
  const $ = id => document.getElementById(id);
  const ar = () => LANG.cur === 'ar';
  const tx = (en, arabic) => ar() ? arabic : en;
  const n = v => Number.isFinite(+v) ? +v : 0;
  const safe = fn => { try { return fn(); } catch(e) { console.warn('[Nightshift]',e); } };
  const fmtN = v => Math.round(n(v)).toLocaleString(ar() ? 'ar-EG' : 'en-US');
  const icons = {
    route:'<path d="M5 6a3 3 0 1 0 0 .1M19 18a3 3 0 1 0 0 .1M8 6h7a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8"/>',
    wheel:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="m4 8 5 3m6 0 5-3m-8 7v6"/>',
    bolt:'<path d="m14 2-9 12h6l-1 8 9-12h-6z"/>',
    shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>',
    garage:'<path d="m3 10 9-7 9 7v11H3zM7 21V11h10v10M7 15h10M7 18h10"/>',
    settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    moon:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v2"/>'
  };
  const icon = key => `<svg viewBox="0 0 24 24" class="nsIcon" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key] || icons.star}</svg>`;
  const contracts = {
    smooth:{name:['Silk road','سواقة حرير'],desc:['Hold a 60-second clean-driving streak. Keep moving, obey the limit, avoid collisions.','سوق ٦٠ ثانية متواصلة بهدوء، تحت السرعة المحددة ومن غير حوادث.'],goal:60,points:300,icon:'shield'},
    service:{name:['People first','الراكب أولاً'],desc:['Pick up 6 passengers and drive for at least 60 seconds.','اركب ٦ ركاب وسوق لمدة ٦٠ ثانية على الأقل.'],goal:6,points:350,icon:'people'},
    explorer:{name:['City explorer','مستكشف المدينة'],desc:['Cover 2 km and drive for at least 60 seconds. Discover the road at your own pace.','اقطع ٢ كم وسوق لمدة ٦٠ ثانية على الأقل. استكشف الطريق براحتك.'],goal:2,points:250,icon:'route'}
  };
  let selected = 'smooth', busy = false, lastMode = 'line';
  let localKey = '', local;
  function progress(){
    const key = 'ogra-nightshift-v1:' + (window.OGRA_NET?.user?.id || GAME.prof?.cur || 'guest');
    if (localKey !== key) {
      localKey = key;
      local = safe(()=>JSON.parse(localStorage.getItem(key))) || {};
      local.points = n(local.points); local.shifts = n(local.shifts); local.best = local.best || {}; local.history = local.history || [];
    }
    return local;
  }
  function persist(){ safe(()=>localStorage.setItem(localKey,JSON.stringify(local))); }
  function clearInput(){
    Object.keys(KEYS).forEach(k=>KEYS[k]=false);
    UI.pedal.gas=0; UI.pedal.brake=0; UI.hornDown=false;
    INP.gas=0; INP.brake=0; INP.horn=false;
    safe(()=>AU.hornOff());
  }
  function cleanOverlays(){
    ['nsPause','pz','ogPause','nsContractHud','phone','wsWrap','rhScreen','restPrompt','acPanel2','volPop','ogNod'].forEach(id=>$(id)?.remove());
    UI.fueling=null; UI.ncData=null; UI.site=null;
    UI.modalHide(); clearInput();
    if ($('cv')) $('cv').style.visibility='';
  }
  const oldToHub = UI.toHub;
  UI.toHub = function(){
    cleanOverlays(); GAME.paused=false; GAME.state='hub';
    safe(()=>AU.pauseGame(false));
    oldToHub();
  };
  function closePause(){ $('nsPause')?.remove(); }
  function resume(){
    if(GAME.state!=='play'||GAME.G?.ended) return;
    closePause(); clearInput(); GAME.paused=false; safe(()=>AU.pauseGame(false));
  }
  function pause(){
    if(GAME.state!=='play'||!GAME.G||GAME.G.ended||$('nsPause')) return;
    if(!$('modal').classList.contains('hidden')||$('rhScreen')||$('wsWrap')) return;
    clearInput(); GAME.paused=true; safe(()=>AU.pauseGame(true));
    const el=document.createElement('div'); el.id='nsPause'; el.className='nsOverlay';
    el.innerHTML=`<section class="nsPanel" role="dialog" aria-modal="true" aria-labelledby="nsPauseTitle"><div class="nsEyebrow">${icon('wheel')} ${tx('SHIFT ON HOLD','الوردية متوقفة')}</div><h2 id="nsPauseTitle">${tx('Take a breath.','خد نفسك.')}</h2><p>${esc(GAME.G.route ? tn(GAME.G.route.n) : tx('Free drive','جولة حرة'))}</p><button class="nsPrimary" data-ns="resume">${tx('Back to the road','كمّل الطريق')} ${icon('arrow')}</button><div class="nsPauseStats"><span>${fmtN(GAME.G.trip?.pax)} ${tx('passengers','ركاب')}</span><span>${n(GAME.G.trip?.dist).toFixed(1)} ${tx('km','كم')}</span><span>${Math.floor(n(GAME.G.ns?.elapsed)/60)} ${tx('min','دقيقة')}</span></div><label class="nsVolume">${tx('Master volume','مستوى الصوت')}<input id="nsVolume" type="range" min="0" max="1" step=".05" value="${S().set.vol.master ?? 1}"></label><div class="nsPair"><button data-ns="end">${tx('End shift & report','إنهاء الوردية والتقرير')}</button><button data-ns="quit">${tx('Save & main menu','حفظ والقائمة الرئيسية')}</button></div><small>${tx('Earned trip results are settled once. No progress reset.','حساب الرحلة بيتسجل مرة واحدة. تقدمك محفوظ.')}</small></section>`;
    document.body.appendChild(el);
    $('nsVolume').addEventListener('input',e=>{S().set.vol.master=+e.target.value;AU.vol.master=+e.target.value;safe(()=>AU.setVol());saveGame()});
    el.querySelector('button').focus();
  }
  function end(kind='end',completed=false){
    const G=GAME.G;
    if(busy||!G||G.mode==='attract'||(G.ended&&GAME.state==='summary')) return;
    busy=true; cleanOverlays(); GAME.paused=true; GAME.state='leaving'; G.ended=true;
    try {
      finishSession(G,completed);
      settleMastery(G);
      safe(()=>saveGame());
      safe(()=>AU.pauseGame(true));
      $('hud').classList.add('hidden');
      if(kind==='quit') UI.toHub();
      else { GAME.state='summary'; UI.show('nightReport',{G,completed}); }
    } catch(e) {
      console.error('Shift exit failed',e);
      UI.toHub(); UI.toast(tx('Returned to menu. Check your last saved progress.','رجعنا للقائمة. راجع آخر تقدم محفوظ.'));
    } finally { busy=false; }
  }
  UI.tripEnd = (G,early)=>{if(G===GAME.G&&!G.ended)end('end',!early)};
  const oldAct=UI.act;
  UI.act=function(a,p,el){
    if(a==='endShift')return end('end');
    if(a==='quit')return end('quit');
    if(a==='summaryOk')return UI.toHub();
    if(a==='resume')return resume();
    return oldAct.apply(this,arguments);
  };
  const oldHudAct=UI.hudAct;
  UI.hudAct=function(a,p){if(a==='pause')return pause();if(GAME.paused||GAME.state!=='play')return;return oldHudAct.apply(this,arguments)};
  function initRun(G){
    if(G.mode==='attract')return;
    G.ns={contract:selected,elapsed:0,driving:0,streak:0,bestStreak:0,score:0,done:false,crashes:n(G.trip.crashes),fines:n(G.trip.fineN),stamp:0,dist0:n(G.trip.dist),pax0:n(G.trip.pax)};
    lastMode=G.mode;
  }
  const oldPrep=prepSession;
  prepSession=function(G){oldPrep(G);initRun(G)};
  function notify(message){UI.toast(message,2200);safe(()=>AU.ding())}
  function updateContract(G,dt){
    const c=G.ns;if(!c||G.ended||GAME.paused||GAME.state!=='play')return;
    const tr=G.trip, speed=Math.abs(n(G.car.vx))*3.6;
    c.elapsed+=dt;
    if(speed>=8)c.driving+=dt;
    const limit=n(G.world.segAt(G.car.x)?.lim)||60;
    const hit=n(tr.crashes)>c.crashes||n(tr.fineN)>c.fines;
    const clean=speed>=8&&speed<=limit+2&&!hit&&n(G.car.brk)<.85;
    if(clean)c.streak+=dt;else if(hit||speed>limit+2||n(G.car.brk)>=.85)c.streak=0;
    c.crashes=n(tr.crashes);c.fines=n(tr.fineN);
    c.bestStreak=Math.max(c.bestStreak,c.streak);
    const tier=Math.floor(c.streak/15);
    if(tier>c.stamp){c.stamp=tier;c.score+=25;notify(tx('CLEAN STREAK','سواقة نضيفة')+' · '+tier*15+'s · +25 '+tx('mastery','إتقان'))}
    if(!tier)c.stamp=0;
    const value=c.contract==='smooth'?c.streak:c.contract==='service'?n(tr.pax)-c.pax0:n(tr.dist)-c.dist0;
    c.value=Math.max(0,value);
    if(!c.done&&c.value>=contracts[c.contract].goal&&c.driving>=60){c.done=true;c.score+=contracts[c.contract].points;notify(tx('CONTRACT COMPLETE','التحدي اكتمل')+' · +'+contracts[c.contract].points+' '+tx('mastery','إتقان'))}
  }
  const oldUpdate=updateGame;
  updateGame=function(G,dt,input){const r=oldUpdate.apply(this,arguments);updateContract(G,dt);return r};
  function settleMastery(G){
    const c=G.ns;if(!c||c.settled)return;c.settled=true;
    const p=progress(), tr=G.trip;
    const engaged=c.elapsed>=30&&(n(tr.dist)>.05||n(tr.pax)>0);
    c.total=engaged?Math.max(0,Math.round(c.score+n(tr.dist)*15+n(tr.pax)*10)):0;
    c.grade=!engaged?'—':n(tr.crashes)>2?'C':n(tr.crashes)||n(tr.fineN)?'B':c.done?'S':'A';
    if(!engaged)return;
    p.points+=c.total;p.shifts++;
    const key=G.route?.id||G.region?.id||G.mode;
    c.record=c.total>n(p.best[key]);p.best[key]=Math.max(c.total,n(p.best[key]));
    p.history.unshift({route:G.route?tn(G.route.n):tx('Free drive','جولة حرة'),score:c.total,grade:c.grade,day:new Date().toISOString().slice(0,10)});p.history=p.history.slice(0,12);persist();
  }
  let hudAt=0;
  const oldHud=UI.hud;
  UI.hud=function(G,dt){const r=oldHud.apply(this,arguments);if(performance.now()-hudAt<250)return r;hudAt=performance.now();
    if(G.ns){let el=$('nsContractHud');if(!el){el=document.createElement('button');el.id='nsContractHud';el.dataset.ns='contractInfo';$('hud').appendChild(el)}
      const c=G.ns,d=contracts[c.contract];
      el.innerHTML=`${icon(c.done?'star':d.icon)}<span><b>${d.name[ar()?1:0]}</b><small>${c.done?tx('Complete · bank it at shift end','اكتمل · يتحفظ بنهاية الوردية'):Math.min(n(c.value),d.goal).toFixed(c.contract==='explorer'?1:0)+' / '+d.goal+' · '+tx('tap for details','اضغط للتفاصيل')}</small></span><i style="--progress:${Math.min(100,n(c.value)/d.goal*100)}%"></i>`;
    }return r};
  function routeChoice(){
    const s=S(),pool=ROUTES.filter(r=>r.lvl<=s.lvl);
    return pool.find(r=>r.id===UI.sel.route)||pool[0]||ROUTES[0];
  }
  function vehicleMarkup(key,label){
    const m=ASSETS.veh[key];if(!m)return '';
    const wheels=m.wr&&m.wb?[m.mid-m.wb/2,m.mid+m.wb/2].map(x=>`<i class="nsWheel" style="left:${x/m.L*100}%;top:${(1-m.wy/m.H)*100}%;width:${m.wr*2/m.L*100}%"></i>`).join(''):'';
    return `<div class="nsSprite" style="aspect-ratio:${m.w}/${m.h}"><img src="${m.d}" alt="${esc(label)}" draggable="false">${wheels}</div>`;
  }
  function button(label,action,param='',cls=''){return `<button class="${cls}" data-ns="${action}" data-value="${param}">${label}</button>`}
  UI.scr.hub=function(){
    const s=S(),p=progress(),r=routeChoice();UI.sel.route=r.id;const v=vehById(s.owned[UI.sel.vid]?UI.sel.vid:s.cur.line)||vehById(s.cur.line), own=s.owned[v.id],d=contracts[selected];
    const fuel=Math.round(n(own.fuel)),condition=Math.round(Object.values(own.cond).reduce((a,b)=>a+n(b),0)/Object.keys(own.cond).length);
    const routes=ROUTES.filter(q=>q.lvl<=s.lvl),spot=routes[Math.floor(Date.now()/86400000)%routes.length];
    const image=ASSETS.veh[v.spr]?.d||'assets/veh_n300.webp';
    const history=p.history[0];
    return `<main class="scr nsHub" dir="${ar()?'rtl':'ltr'}">
      <div class="nsBackdrop"></div><div class="nsFx"><div class="nsGrid"></div><div class="nsLight nsLight1"></div><div class="nsLight nsLight2"></div></div>
      <header class="nsHeader"><div class="nsBrand">OGRA<span>أجرة</span><small>NIGHTSHIFT / 01</small></div><div class="nsHeaderRight"><span class="nsLive">${tx('DRIVER HQ','مركز السائق')}</span>${button(tx('العربية','English'),'language','','nsLang')}<button class="nsSquare" data-ns="nav" data-value="profile" aria-label="${tx('Driver profile','ملف السائق')}">${icon('people')}</button><button class="nsSquare" data-ns="nav" data-value="settings" aria-label="${tx('Settings','الإعدادات')}">${icon('settings')}</button></div></header>
      <div class="nsDashboard"><section class="nsHero"><div class="nsEyebrow"><span class="nsDot"></span>${tx('EGYPT IS CALLING','مصر بتناديك')}</div><h1>${tx('THE CITY<br>NEVER STOPS.','المدينة<br>ما بتهداش.')}<em>${tx('Neither does your story.','وكل مشوار حكاية.')}</em></h1><p class="nsIntro">${tx('One driver. A thousand stories. Make the next shift yours.','سائق واحد. ألف حكاية. خلي الوردية الجاية على مزاجك.')}</p>
      <div class="nsVehicle"><div class="nsOrbit"></div><div class="nsVehicleLines"></div>${vehicleMarkup(v.spr,tn(v.n))}<div class="nsVehicleCaption"><span>${tx('READY IN YOUR GARAGE','جاهزة في جراجك')}</span><b>${esc(tn(v.n))}</b><small>${fuel} L <i>•</i> ${condition}% ${tx('condition','الحالة')}</small></div></div>
      <div class="nsHeroStats"><div><small>${tx('WALLET / EGP','الرصيد / جنيه')}</small><strong>${fmtN(s.cash)}</strong></div><div><small>${tx('DRIVER LEVEL','مستوى السائق')}</small><strong>${fmtN(s.lvl)}<span>/ ${tx('career','المسيرة')}</span></strong></div><div><small>${tx('LOCAL MASTERY','الإتقان المحلي')}</small><strong>${fmtN(p.points)}<span>MP</span></strong></div></div></section>
      <section class="nsOperations"><div class="nsRouteCard"><div class="nsEyebrow">${icon('route')}${tx('YOUR NEXT SHIFT','ورديتك الجاية')}<span class="nsTag">${tx('CAREER','المسيرة')}</span></div><h2>${esc(tn(r.n))}</h2><div class="nsRouteMeta"><span>${r.realKm||Math.round(r.gameM/1000)} ${tx('km','كم')}</span><span>${fmtN(r.fare)} ${tx('EGP / fare','جنيه / الأجرة')}</span><span>${routes.length} ${tx('routes unlocked','خط مفتوح')}</span></div><div class="nsTime">${['morning','evening','night'].map(k=>button(icon(k==='night'?'moon':'sun')+t(k),'time',k,UI.sel.tod===k?'on':'')).join('')}</div>${button(tx('START YOUR ENGINE','يلا نبدأ الوردية')+icon('arrow'),'launch','','nsPrimary')}<div class="nsRouteLinks">${button(tx('Choose another route','اختار خط تاني'),'nav','routes')}${button(tx('Free drive ↗','جولة حرة ↗'),'nav','free')}</div></div>
      <div class="nsContractCard"><div class="nsEyebrow">${icon('bolt')}${tx('OPTIONAL SHIFT CONTRACT','تحدي الوردية الاختياري')}<b>+${d.points} MP</b></div><div class="nsContractChoices">${Object.entries(contracts).map(([k,q])=>button(icon(q.icon)+q.name[ar()?1:0],'contract',k,k===selected?'on':'')).join('')}</div><p>${d.desc[ar()?1:0]}</p><small>${tx('Skill points stay on this device. No cash or online XP advantage.','نقاط مهارة على الجهاز ده. بدون زيادة فلوس أو خبرة أونلاين.')}</small></div>
      <div class="nsSpotlight">${icon('moon')}<div><small>${tx('TODAY’S SPOTLIGHT','خط النهارده')}</small><b>${esc(tn(spot.n))}</b></div>${button(icon('arrow'),'spotlight',spot.id,'nsSquare')}</div>
      <div class="nsLast"><span>${history?tx('LAST SHIFT','آخر وردية'):tx('YOUR STORY STARTS HERE','حكايتك بتبدأ هنا')}</span><b>${history?esc(history.grade)+' · '+fmtN(history.score)+' MP':tx('Build your first clean-driving streak.','ابدأ أول سلسلة سواقة نضيفة.')}</b>${button(tx('Logbook ↗','السجل ↗'),'logbook')}</div></section></div>
      <nav class="nsDock" aria-label="${tx('Main navigation','القائمة الرئيسية')}">${[['route','routes','Routes','الخطوط'],['garage','workshop','My garage','جراجي'],['wheel','showroom','Showroom','المعرض'],['people','modes','Drive modes','أوضاع اللعب'],['star','missions','Missions','المهام'],['bolt','rewards','Rewards','الجوائز'],['shield','dmv','Licence','الرخصة'],['settings','settings','Settings','الإعدادات']].map(([i,k,en,arabic])=>button(icon(i)+`<span>${tx(en,arabic)}</span>`,'nav',k)).join('')}</nav><footer class="nsFooter"><span>OGRA / ${tx('NIGHTSHIFT EDITION','إصدار الوردية الليلية')}</span><span>${tx('YOUR ROAD. YOUR RULES. DRIVE RESPONSIBLY.','طريقك. حكايتك. سوق بمسؤولية.')}</span></footer>
    </main>`;
  };
  UI.after.hub=function(){};
  UI.scr.nightReport=function({G,completed}){
    const c=G.ns||{},tr=G.trip,r=G.result||{};
    return `<main class="scr nsReport"><section class="nsReportPanel"><div class="nsEyebrow">${icon('star')}${completed?tx('ROUTE COMPLETE','الخط اكتمل'):tx('SHIFT COMPLETE','الوردية انتهت')}</div><div class="nsReportHeading"><div><h1>${tx('Every shift<br>tells a story.','كل وردية<br>لها حكاية.')}</h1><p>${esc(G.route?tn(G.route.n):tx('Free drive','جولة حرة'))}</p></div><div class="nsGrade">${c.grade||'—'}<small>${tx('DRIVER GRADE','تقييم السائق')}</small></div></div><div class="nsReportStats"><div><small>${tx('TRIP NET / EGP','صافي الرحلة / جنيه')}</small><b>${fmtN(tripNet(G))}</b></div><div><small>${tx('DISTANCE','المسافة')}</small><b>${n(tr.dist).toFixed(1)} <em>km</em></b></div><div><small>${tx('PASSENGERS','الركاب')}</small><b>${fmtN(tr.pax)}</b></div><div><small>${tx('COMFORT','الراحة')}</small><b>${fmtN(r.comfort)}%</b></div></div><div class="nsReportReward">${icon(c.done?'star':'shield')}<div><h3>${c.done?tx('Contract completed','التحدي اكتمل'):tx('Keep building your skills','كمّل وطوّر مهارتك')}</h3><p>${tx('Best clean streak','أفضل سلسلة نضيفة')}: ${Math.floor(n(c.bestStreak))}s ${c.record?' · '+tx('NEW PERSONAL BEST','رقم شخصي جديد'):''}</p></div><strong>+${fmtN(c.total)}<small>MP</small></strong></div><p class="nsReportNote">${ogOnline()?tx('Online cash and XP are confirmed by your server. The trip net above is a local estimate; mastery points are device-only.','الفلوس والخبرة أونلاين بيأكدهم السيرفر. صافي الرحلة تقديري، ونقاط الإتقان محلية.'):tx('Career progress saved locally. Mastery is separate from cash and XP. Short idle shifts earn no mastery.','تقدمك اتحفظ محلياً. الإتقان منفصل عن الفلوس والخبرة. الوقوف بدون لعب ما يكسبش إتقان.')}</p><div class="nsPair">${button(tx('BACK TO HQ','القائمة الرئيسية'),'home','','nsPrimary')}${button(tx('Drive again','وردية تانية')+icon('arrow'),'again')}</div></section></main>`;
  };
  const oldShow=UI.show;
  UI.show=function(name,p){
    document.body.classList.toggle('commandHub',name==='hub'&&GAME.state!=='play');
    document.body.classList.toggle('commandReport',name==='nightReport');
    const r=oldShow.apply(this,arguments);
    return r;
  };
  function launch(){
    cleanOverlays();GAME.paused=false;UI.sel.tab='line';UI.sel.vid=UI.sel.vid||S().cur.line;
    safe(()=>AU.pauseGame(false));startGame();
  }
  function logbook(){const p=progress();UI.modalShow(`<div class="mtitle">${tx('Driver logbook','سجل السائق')}</div><p>${fmtN(p.points)} MP · ${fmtN(p.shifts)} ${tx('shifts','ورديات')}</p><div class="nsLogbook">${p.history.length?p.history.map(h=>`<div><b>${esc(h.grade)} · ${esc(h.route)}</b><span>${fmtN(h.score)} MP <small>${esc(h.day)}</small></span></div>`).join(''):`<p>${tx('Your completed drives will appear here. Get moving for at least 30 seconds to start your record.','وردياتك هتظهر هنا. سوق لمدة ٣٠ ثانية على الأقل عشان تبدأ سجلك.')}</p>`}</div><button class="btn" data-a="mclose">${tx('Close','إغلاق')}</button>`)}
  function action(a,v){
    if(a==='resume')return resume();
    if(a==='pause')return pause();
    if(a==='end'||a==='quit')return end(a);
    if(a==='home')return UI.toHub();
    if(a==='launch')return launch();
    if(a==='again'){UI.toHub();return lastMode==='free'?startFree():startGame()}
    if(a==='nav'){if(v==='routes')UI.sel.tab='line';if(v==='workshop')UI.sel.wvid=UI.sel.vid||S().cur.line;return UI.show(v)}
    if(a==='language'){setLang(ar()?'en':'ar');return UI.show('hub')}
    if(a==='contract'){selected=v;return UI.show('hub')}
    if(a==='time'){UI.sel.tod=v;return UI.show('hub')}
    if(a==='spotlight'){UI.sel.route=v;return UI.show('hub')}
    if(a==='logbook')return logbook();
    if(a==='enter'){safe(()=>AU.init());$('nsLaunch')?.remove();return}
    if(a==='contractInfo'){const c=GAME.G.ns,d=contracts[c.contract];UI.toast(d.desc[ar()?1:0]+' '+tx('Minimum driving time: 60 seconds.','الحد الأدنى للقيادة: ٦٠ ثانية.'),5000)}
  }
  window.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-ns]');
    if(b){e.preventDefault();e.stopImmediatePropagation();safe(()=>AU.ui('ok'));return action(b.dataset.ns,b.dataset.value)}
    if(e.target.closest?.('[data-a="pause"]')){e.preventDefault();e.stopImmediatePropagation();return pause()}
  },true);
  window.addEventListener('keydown',e=>{
    if(document.getElementById('dpDialog'))return;
    if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    if($('nsLaunch')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();return action('enter')}
    if(GAME.state==='play'&&['Escape','p','P'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)$('nsPause')?resume():pause()}
    if($('nsPause')&&e.key==='Tab'){const els=[...$('nsPause').querySelectorAll('button,input')];const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  },true);
  addEventListener('blur',clearInput);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause()}});
  function splash(){
    $('ogSplashHost')?.remove();
    const el=document.createElement('div');el.id='nsLaunch';el.dir=ar()?'rtl':'ltr';
    el.innerHTML=`<div class="nsLaunchBg"></div><div class="nsGrid"></div><div class="nsLaunchRings"></div><div class="nsLight nsLight1"></div><div class="nsLight nsLight2"></div><header><b>OGRA <span>أجرة</span></b><small>${tx('EGYPTIAN DRIVING STORIES','حكايات السواقة المصرية')}</small></header><div class="nsLaunchContent"><div class="nsEyebrow"><span class="nsDot"></span>${tx('NIGHTSHIFT EDITION','إصدار الوردية الليلية')}</div><h1>OGRA<span>أجرة</span></h1><p>${tx('THE ROAD HAS A STORY. MAKE IT YOURS.','الطريق له حكاية. خليها حكايتك.')}</p><div class="nsLaunchVehicle"><img src="assets/veh_hiace.webp" alt="Egyptian minibus" draggable="false"></div>${button(tx('TAP TO START','اضغط عشان تبدأ')+icon('arrow'),'enter','','nsPrimary')}<small>${tx('Ready to drive · tap or press Enter','جاهز للانطلاق · اضغط للبدء')}</small></div><footer><span>30°02′ N / 31°14′ E</span><span>${tx('BUILT FOR THE LONG ROAD','للمشاوير اللي تستاهل')}</span><span>V. NIGHTSHIFT 01</span></footer>`;
    el.querySelector('.nsLaunchVehicle').innerHTML=vehicleMarkup('hiace',tx('Egyptian minibus','ميكروباص مصري'));
    document.body.appendChild(el);
  }
  let readyAttempts=0;
  const wait=setInterval(()=>{if(GAME.save&&GAME.state==='hub'){clearInterval(wait);UI.show('hub');splash()}else if(++readyAttempts>100)clearInterval(wait)},100);
  // Public read-only build information for diagnostics and integration tests.
  window.OG_NIGHTSHIFT={version:'1.0.0',contracts:Object.keys(contracts)};
})();
