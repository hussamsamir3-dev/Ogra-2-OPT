/* OGRA — gameplay corrections
   capacity · rolling back in D · rest-house spending · fuel that is kept ·
   the vehicle you used last */
(() => {
  'use strict';
  const S0 = () => (typeof S === 'function') ? S() : null;

  /* ---------- 1. never more passengers than the vehicle holds ---------- */
  function cap(G){
    const sp = G && G.car && G.car.spec; if (!sp) return 99;
    return (sp.seats || 14) + (sp.stand || 0);
  }
  function clampPax(G){
    try {
      const max = cap(G), out = (G.rest && G.rest.outPax) || [];
      const total = (G.onboard || []).length + out.length;
      if (total <= max) return;
      let over = total - max;
      /* the ones who went into the café are the last to be squeezed back in */
      while (over > 0 && out.length) { out.pop(); over--; }
      while (over > 0 && G.onboard.length) { G.onboard.pop(); over--; }
    } catch(e) {}
  }
  if (typeof board === 'function') {
    const _board = board;
    window.board = board = function(G, p, st){
      try {
        const out = (G.rest && G.rest.outPax) || [];
        if ((G.onboard || []).length + out.length >= cap(G)) return;   /* full is full */
      } catch(e) {}
      return _board.apply(this, arguments);
    };
  }

  /* ---------- 2. an automatic never creeps backwards in D ---------- */
  function noRollback(G, dt){
    const car = G && G.car; if (!car) return;
    const auto = !car.spec || car.spec.gears !== 'manual';
    if (!auto) return;
    if (car.sel === 'D' && car.vx < 0) { car.vx = 0; if (car.vz) car.vz = 0; }
    if (car.sel === 'R' && car.vx > 0) car.vx = 0;
    /* a touch of creep, the way a torque converter behaves */
    if (car.sel === 'D' && car.on && !car.hand && (car.brk || 0) < .05 && car.vx < .7 && (car.thr || 0) < .05) {
      car.vx = Math.min(.7, car.vx + dt*.35);
    }
  }

  /* ---------- 3. the café and the rest house take your money ---------- */
  function fixShop(){
    try {
      if (typeof rhBuy !== 'function') return;
      const probe = String(rhBuy);
      if (!/Math\.max\(s\.cash, m\.p\)/.test(probe)) return;    /* only the patched version needs undoing */
      /* an earlier patch topped the balance up to the price before charging it,
         so spending appeared free. Charge it properly instead. */
      const menu = (typeof RH_MENU !== 'undefined') ? RH_MENU : null;
      const _buy = rhBuy;
      window.rhBuy = rhBuy = function(id){
        const s = S0(), m = menu && menu.find(q => q.id === id);
        const before = s ? s.cash : 0;
        const r = _buy.apply(this, arguments);
        try {
          if (s && m) {
            if (s.cash > before - m.p) s.cash = Math.max(0, before - m.p);   /* make sure it was taken */
            if (typeof saveGame === 'function') saveGame();
          }
        } catch(e) {}
        return r;
      };
      window.__ogShopFixed = true;
    } catch(e) {}
  }
  fixShop();
  setInterval(() => { if (!window.__ogShopFixed) fixShop(); }, 1500);   /* it is defined when a rest house opens */


  /* ---------- 3b. the balance you SEE follows the balance you have ---------- */
  (function money(){
    const fmt = n => {
      try { return (typeof money === 'function') ? money(n) : Math.round(n).toLocaleString('en-US'); }
      catch(e) { return Math.round(n).toLocaleString('en-US'); }
    };
    /* the old helper took the largest of the local, server and on-screen figures,
       so a purchase was immediately "corrected" back up by whichever was stale */
    window.OG_cash = function(){ const s = S0(); return s ? (s.cash || 0) : 0; };

    function refresh(){
      try {
        const s = S0(); if (!s) return;
        const cash = Math.round(s.cash || 0), txt = cash.toLocaleString('en-US');
        const w = document.getElementById('rhWallet');
        if (w) {
          const ar = (typeof LANG !== 'undefined' && LANG.cur === 'ar');
          const line = (ar ? '💰 محفظتك: ' : '💰 Wallet: ') + txt + (ar ? ' ج' : ' EGP');
          if (w.textContent !== line) w.textContent = line;
        }
        document.querySelectorAll('.tbCash, #topBar .tbCash, #hudCash, .cash.led, #hCash').forEach(el => {
          const n = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10);
          if (Number.isFinite(n) && n !== cash) el.textContent = el.textContent.replace(/[\d,\u0660-\u0669]+/, txt);
        });
      } catch(e) {}
    }
    setInterval(refresh, 400);
    document.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('[data-rh]')) {
        setTimeout(refresh, 30); setTimeout(refresh, 300); setTimeout(refresh, 900);
        try { if (typeof saveGame === 'function') saveGame(); } catch(err) {}
      }
    }, true);
  })();

  /* ---------- 4 & 5. fuel is kept between shifts ---------- */
  function keepFuel(G){
    try {
      const s = S0(), own = G && G.own, car = G && G.car;
      if (!s || !own || !car) return;
      if (Number.isFinite(car.fuel)) {
        own.fuel = Math.max(0, Math.min(car.E ? car.E.tank : own.fuel, car.fuel));
      }
    } catch(e) {}
  }
  let saveT = 0;
  if (typeof updateGame === 'function') {
    const _ug = updateGame;
    window.updateGame = updateGame = function(G, dt, inp){
      const out = _ug.apply(this, arguments);
      try {
        const d = Math.min(dt, .05);
        noRollback(G, d); clampPax(G); keepFuel(G);
        saveT += d; if (saveT > 10) { saveT = 0; if (typeof saveGame === 'function') saveGame(); }
      } catch(e) {}
      return out;
    };
  }
  /* filling up before a shift really fills the tank */
  if (typeof UI !== 'undefined' && UI.act) {
    const _act = UI.act;
    UI.act = function(a, p, elm){
      const r = _act.apply(this, arguments);
      try {
        if (a === 'fuel' || a === 'refuel' || a === 'fuelAll' || a === 'prepFuel') {
          const s = S0(), id = (UI.sel && UI.sel.vid) || (s && s.veh), own = s && s.owned && s.owned[id];
          const sp = (typeof effSpec === 'function' && own) ? effSpec(typeof vehById === 'function' ? vehById(id) : null, own) : null;
          if (own && sp && sp.tank) { own.fuel = sp.tank; if (typeof saveGame === 'function') saveGame(); if (UI.refresh) UI.refresh(); }
        }
      } catch(e) {}
      return r;
    };
  }

  /* ---------- 6. the vehicle you drove last is already chosen ---------- */
  function lastVehicle(){
    try {
      const s = S0(); if (!s || !UI || !UI.sel) return;
      const last = s.lastVeh || s.veh || (s.cur && s.cur.line);
      if (last && s.owned && s.owned[last]) { UI.sel.vid = UI.sel.vid || last; s.veh = s.veh || last; }
    } catch(e) {}
  }
  setTimeout(lastVehicle, 1200);
  if (typeof startGame === 'function') {
    const _sg = startGame;
    window.startGame = startGame = function(){
      try { const s = S0(); if (s) { s.lastVeh = (UI.sel && UI.sel.vid) || s.veh; if (typeof saveGame === 'function') saveGame(); } } catch(e) {}
      return _sg.apply(this, arguments);
    };
  }
})();

/* ============================================================
   Roadside shops · junctions · walk cycles · rounded gradients
   ============================================================ */
(() => {
  'use strict';
  const S0 = () => (typeof S === 'function') ? S() : null;

  /* ---------- 1. every purchase leaves the wallet ----------
     Online, a purchase was handed to the server and the local balance was
     never touched, so shops on the road appeared to cost nothing. */
  function wrapBuy(){
    try {
      if (!window.OGRA_NET || typeof OGRA_NET.buy !== 'function' || OGRA_NET.buy.__charges) return;
      const _buy = OGRA_NET.buy.bind(OGRA_NET);
      const priceOf = (kind, payload) => {
        try {
          if (payload && typeof payload.price === 'number') return payload.price;
          if (kind === 'fuel' && payload && typeof payload.litres === 'number') {
            const s = S0(), own = s && s.owned[payload.vehicleId], sp = own && (typeof vehById === 'function') && vehById(payload.vehicleId);
            const E = (sp && typeof effSpec === 'function') ? effSpec(sp, own) : null;
            const unit = (E && typeof FUEL !== 'undefined' && FUEL[E.fuelType]) ? FUEL[E.fuelType].price : 0;
            return Math.round(payload.litres*unit);
          }
        } catch(e) {}
        return 0;
      };
      const w = function(kind, payload){
        const s = S0(), cost = priceOf(kind, payload);
        if (s && cost > 0) { s.cash = Math.max(0, (s.cash || 0) - cost); try { saveGame(); } catch(e) {} }
        const out = _buy(kind, payload);
        try {
          out && out.then && out.then(r => {
            try {
              if (r && typeof r.cash === 'number') s.cash = r.cash;          /* the server's figure wins if it sends one */
              else if (r && !r.ok && cost > 0) s.cash = (s.cash || 0) + cost; /* refused: give it back */
              saveGame(); if (UI && UI.refresh) UI.refresh();
            } catch(e) {}
          }).catch(() => {});
        } catch(e) {}
        return out;
      };
      w.__charges = true;
      OGRA_NET.buy = w;
    } catch(e) {}
  }
  wrapBuy(); setInterval(wrapBuy, 1500);

  /* ---------- 2. no cross streets ---------- */
  function noCross(G){
    const W = G && G.world; if (!W) return;
    ['isx','cross','tl'].forEach(k => { if (W[k] && W[k].length) W[k].length = 0; });
    for (const o of (G.traffic || [])) if (o && (o.cross || o.turning)) o.__void = true;
  }

  /* ---------- 3. one walk cycle per person, start to finish ---------- */
  const STRIDE = 1.55, FRAME = 6.2832/8;
  function walk(list, dt){
    for (const p of (list || [])) {
      if (!p) continue;
      if (p.__ph == null) {
        p.__ph = Math.random()*6.2832;
        /* the phase belongs to this person alone: other systems may not add to it */
        try { Object.defineProperty(p, 'ph', {get(){ return p.__ph; }, set(){}, configurable:true}); } catch(e) {}
      }
      const v = Math.abs(p.v || 0);
      let moving = v > .03;
      if (moving) { p.__ph += Math.min(FRAME, (v*dt/STRIDE)*6.2832); p.face = p.v > 0 ? 1 : -1; }
      else if (p.walkTo != null && Math.abs(p.walkTo - p.x) > .15) {
        const dir = p.walkTo > p.x ? 1 : -1;
        p.x += dir*1.05*dt; p.face = dir; moving = true;
        p.__ph += Math.min(FRAME, (1.05*dt/STRIDE)*6.2832);
      }
      if (p.__ph > 62.83) p.__ph -= 62.83;
      p.walk = moving;
    }
  }

  /* ---------- 4. long, rounded gradients instead of straight ramps ---------- */
  function rounded(W){
    if (!W || W.__rounded || typeof W.elev !== 'function') return;
    const raw = W.elev.bind(W);
    const S6 = t => { t = Math.max(0, Math.min(1, t)); return t*t*t*(t*(t*6 - 15) + 10); };   /* smoothstep, second order */
    W.elev = function(x){
      /* a weighted blend over 90 m: the crests and dips keep their height but
         arrive and leave on a curve rather than a corner */
      let sum = 0, tot = 0;
      for (let i = -45; i <= 45; i += 7.5) {
        const w = S6(1 - Math.abs(i)/50) + .05, v = raw(x + i);
        if (Number.isFinite(v)) { sum += v*w; tot += w; }
      }
      const v0 = raw(x);
      return tot ? (sum/tot)*.82 + v0*.18 : v0;
    };
    W.__rounded = true;
  }

  if (typeof updateGame === 'function') {
    const _ug = updateGame;
    window.updateGame = updateGame = function(G, dt, inp){
      const out = _ug.apply(this, arguments);
      try {
        const d = Math.min(dt, .05);
        noCross(G); rounded(G && G.world); walk(G.walkers, d); walk(G.peds, d);
      } catch(e) {}
      return out;
    };
  }
})();
