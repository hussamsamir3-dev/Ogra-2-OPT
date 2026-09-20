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
