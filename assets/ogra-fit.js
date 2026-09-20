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
      if (!bar || bar.parentElement !== col) {
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
        col.appendChild(bar);                       /* lives in the HUD column, so it stacks with the rest */
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
      paint();
    } catch(e) {}
  }

  setInterval(hudControls, 250);
})();
