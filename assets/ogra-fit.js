/* OGRA — screen fit and the Driver+ controls in gameplay.
   1. one type scale for the whole game, driven by the real screen size
   2. the driving studio and speed hold reachable while driving, not only from HQ */
(() => {
  'use strict';
  const tr = (en, ar) => (typeof LANG !== 'undefined' && LANG.cur === 'ar') ? ar : en;

  /* ---------- 1. type scale ---------- */
  function fit(){
    const w = innerWidth, h = innerHeight, short = Math.min(w, h), long = Math.max(w, h);
    /* a phone held sideways is short but wide: scale from the short edge,
       a desktop from the long one, and never let text fall below 12px */
    const base = short < 480 ? short/28 : short < 820 ? short/34 : long/86;
    const k = Math.max(12, Math.min(20, base));
    const r = document.documentElement;
    r.style.setProperty('--ogText', k.toFixed(2) + 'px');
    r.style.setProperty('--ogGap', (k*0.62).toFixed(2) + 'px');
    r.classList.toggle('ogTiny', short < 400);
    r.classList.toggle('ogShortScreen', h < 520);
    r.classList.toggle('ogWide', w / h > 1.9);
  }
  fit();
  addEventListener('resize', fit);
  addEventListener('orientationchange', () => setTimeout(fit, 250));
  setInterval(fit, 2000);

  /* ---------- 2. Driver+ in the driving screen ---------- */
  const el = id => document.getElementById(id);
  function hudControls(){
    try {
      const playing = typeof GAME !== 'undefined' && GAME.state === 'play';
      const col = document.querySelector('#hud .h-tr');
      let bar = el('dpHud');
      if (!playing || !col) { if (bar) bar.remove(); return; }
      const phone = innerHeight <= 560 || innerWidth <= 900;
      const host = phone ? document.body : col;
      if (!bar || bar.parentElement !== host) {
        if (bar) bar.remove();
        bar = document.createElement('div'); bar.id = 'dpHud';
        bar.innerHTML =
          `<button type="button" class="pn hb" data-drive="open" title="${tr('Driving studio','استوديو السواقة')}"><span class="dpOrbit">◉</span></button>
           <div id="dpCC">
             <button type="button" class="pn hb" data-dp="faster">+</button>
             <b id="dpCCv">40</b>
             <button type="button" class="pn hb" data-dp="slower">−</button>
             <button type="button" class="pn hb" data-dp="cruise" id="dpCCb">CC</button>
           </div>`;
        host.appendChild(bar);                      /* in the HUD column on a big screen, free-standing on a phone */
        bar.addEventListener('click', e => {
          const b = e.target.closest('[data-dp]'); if (!b) return;
          e.preventDefault(); e.stopPropagation();
          const G = GAME.G; if (!G) return;
          G.dp = G.dp || {target:40, cruise:false};
          const k = b.dataset.dp;
          if (k === 'slower') G.dp.target = Math.max(20, (G.dp.target || 40) - 5);
          if (k === 'faster') G.dp.target = Math.min(120, (G.dp.target || 40) + 5);
          if (k === 'cruise') G.dp.cruise = !G.dp.cruise;
          paint();
        });
      }
      bar.classList.toggle('dpFloat', phone);
      if (phone) parkPlace(); else { bar.style.cssText = ''; }
      paint();
    } catch(e) {}
  }

  /* on a phone the bar sits just above the parking brake, clear of the pedals */
  function parkPlace(){
    const bar = el('dpHud'); if (!bar) return;
    const anchor = document.getElementById('bHand') || document.getElementById('bPark');
    const r = anchor && anchor.getBoundingClientRect();
    /* logical insets first: in a right-to-left page inset-inline-start is the
       physical right, and setting it later would wipe what we just applied */
    bar.style.insetInlineStart = 'auto'; bar.style.insetInlineEnd = 'auto';
    bar.style.insetBlockStart = 'auto'; bar.style.insetBlockEnd = 'auto';
    bar.style.left = 'auto'; bar.style.top = 'auto';
    if (r && r.width > 4) {
      bar.style.right = Math.max(6, Math.round(innerWidth - r.right)) + 'px';
      bar.style.bottom = Math.max(6, Math.round(innerHeight - r.top + 8)) + 'px';
    } else {
      bar.style.right = '10px'; bar.style.bottom = '84px';
    }
  }
  addEventListener('resize', () => setTimeout(() => { try { parkPlace(); } catch(e) {} }, 80));


  function paint(){
    try {
      const G = (typeof GAME !== 'undefined') && GAME.G; if (!G) return;
      const v = el('dpCCv'), b = el('dpCCb'); if (!v || !b) return;
      const dp = G.dp || {};
      const t = Math.round(dp.target || 40);
      if (v.textContent !== String(t)) v.textContent = t;
      b.classList.toggle('on', !!dp.cruise);
      const label = dp.cruise ? tr('CC ON', 'مثبّت') : 'CC';
      if (b.textContent !== label) b.textContent = label;
    } catch(e) {}
  }

  /* hold the set speed while cruise is engaged */
  if (typeof updateGame === 'function') {
    const _ug = updateGame;
    updateGame = function(G, dt, inp){
      const out = _ug.apply(this, arguments);
      try {
        const dp = G && G.dp;
        if (dp && dp.cruise && G.car && G.car.on && !G.car.hand && G.car.sel === 'D') {
          const target = (dp.target || 40)/3.6, v = G.car.vx || 0;
          if (G.car.brk > .08) { dp.cruise = false; }              /* braking cancels it */
          else if (v < target - .3) G.car.thr = Math.min(1, (G.car.thr || 0) + dt*1.6);
          else if (v > target + .3) G.car.thr = Math.max(0, (G.car.thr || 0) - dt*2.2);
        }
      } catch(e) {}
      return out;
    };
  }

  setInterval(hudControls, 250);
})();
