/* ============================================================
   Ogra online layer — Supabase
   ------------------------------------------------------------
   The device holds no authority over money. It reports events;
   the server replies with the true balance and the client adopts
   it. With no server reachable the game runs in practice mode,
   where nothing is banked.
   ============================================================ */
(function () {
  const SUPABASE_URL = 'https://zmbyrpiiqvfrmszvhvvh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pTIK6OotwX1_23Xyy2sQfw_6GAJIu6K';
  const FN = SUPABASE_URL + '/functions/v1';

  const NET = window.OGRA_NET = {
    sb: null, online: false, practice: true, user: null, lastServer: null,

    /* ---------- boot ---------- */
    async init() {
      if (!window.supabase) return this.offline('supabase library missing');
      this.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

      const { data } = await this.sb.auth.getSession();
      if (data && data.session) { this.user = data.session.user; await this.afterAuth(); }
      else this.gate(true);

      this.sb.auth.onAuthStateChange((evt, session) => {
        // Never await another auth call inside Supabase's auth lock.
        if (session && session.user) {
          const changed = this.user?.id !== session.user.id;
          if(changed)this.lastServer=null;
          this.user = session.user;
          if (changed || (!this.online && evt !== 'TOKEN_REFRESHED'))
            setTimeout(() => this.afterAuth(), 0);
        }
        else { clearInterval(this._t); this.user = null; this.lastServer=null; this.practice = true; this.online = false; this.gate(true); }
      });
    },

    async token(waitMs) {
      /* Supabase refreshes the session in the background. Asking for the token
         mid-refresh returns null, so give it a moment before giving up. */
      const deadline = Date.now() + (waitMs == null ? 4000 : waitMs);
      for (;;) {
        try {
          const { data } = await this.sb.auth.getSession();
          if (data && data.session && data.session.access_token)
            return data.session.access_token;
        } catch (e) {}
        if (Date.now() > deadline) return null;
        await new Promise(r => setTimeout(r, 250));
      }
    },

    async call(name, body) {
      const t = await this.token();
      if (!t) {
        this.lastError = 'not signed in (no session token)';
        console.error('[ogra]', name, this.lastError);
        return null;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const readOnly=name==='sync'&&(!body?.local||Object.keys(body.local).length===0);
        const r = await fetch(FN + '/' + name, {
          signal: controller.signal,
          method: readOnly ? 'GET' : 'POST',
          headers: {
            'content-type': 'application/json',
            /* the gateway checks apikey; the function checks the user token */
            apikey: SUPABASE_KEY,
            authorization: 'Bearer ' + t
          },
          body: readOnly ? undefined : JSON.stringify(body === undefined ? {} : body)
        });
        const j = await r.json().catch(() => null);
        if (r.status === 403 && j && ['banned','account suspended'].includes(j.error)) { this.showBan(j); return null; }
        if (!r.ok) {
          this.lastError = 'HTTP ' + r.status + (j && j.error ? ' - ' + j.error : '')
            + (r.status === 404 ? '  (function "' + name + '" is not deployed)' : '');
          console.error('[ogra]', name, this.lastError);
          /* 400-499 means the server answered and said no. Hand that reason
             back so the player sees the real message, not "no response". */
          if (r.status >= 400 && r.status < 500 && j && j.error) return Object.assign({},j,{httpStatus:r.status});
          return null;
        }
        this.lastError = null;
        return j;
      } catch (e) {
        /* Some browser extensions wrap window.fetch and throw "Failed to
           fetch" on requests they dislike. That is not our failure and must
           never surface as a fatal error, so swallow it and carry on. */
        const msg = (e && e.message) || String(e);
        this.lastError = 'network: ' + msg;
        if (/Failed to fetch/i.test(msg)) this.lastError += ' (a browser extension may be blocking requests)';
        console.warn('[ogra]', name, this.lastError);
        return null;
      } finally { clearTimeout(timer); }
    },

    /* ---------- signed in ---------- */
    async afterAuth() {
      if (this._authLoading) return this._authLoading;
      this._authLoading = this.loadProfile();
      try { return await this._authLoading; } finally { this._authLoading = null; }
    },

    async loadProfile() {
      const uid = this.user?.id;
      const p = await this.call('sync', { local: {} });
      if (uid !== this.user?.id) return;
      if (!p?.ok || !p.player || !Array.isArray(p.vehicles)) { this.offline(p?.error || this.lastError || 'could not reach the server'); return; }
      this.protocol = p.protocol || 1;
      this.online = true; this.practice = false;
      /* the local watchdog is irrelevant now the server is in charge, and a
         ban it recorded earlier should not follow the player around */
      try { if (typeof AC !== 'undefined' && AC.clear) AC.clear(); } catch (e) {}
      this.adopt(p.player);
      this.applyVehicles(p.vehicles, p.local);
      this.gate(false);
      this.startSync();
    },

    /* the server's word replaces whatever the device thinks */
    adopt(sp) {
      if (!sp) return;
      if (sp.revision != null && this.lastServer?.revision != null && +sp.revision < +this.lastServer.revision) return;
      this.lastServer = Object.assign({}, this.lastServer, sp);
      this.adopting = true;            /* the seal lets the server's own figures through */
      try {
        const s = S();
        if (Number.isFinite(+sp.cash)) s.cash = Math.max(0, +sp.cash);
        if (Number.isFinite(+sp.xp)) s.xp = Math.max(0, +sp.xp);
        if (Number.isFinite(+sp.level)) s.lvl = Math.max(1, Math.floor(+sp.level));
        if (sp.licence) s.lic = {
          cls: sp.licence.cls,
          exp: sp.licence.exp ? Math.floor(new Date(sp.licence.exp).getTime() / 86400000) : 0,
          pts: sp.licence.pts || 0, issued: Date.now()
        };
        if (typeof UI !== 'undefined' && UI.refresh) UI.refresh();
      } catch (e) {}
      this.adopting = false;
    },

    applyVehicles(list, local) {
      try {
        const s = S();
        if (Array.isArray(list) && list.length) {
          s.owned = {};
          list.forEach(v => {
            const cos = v.cosmetics || {};
            const row = Object.assign({ id: v.id, fuel: v.fuel, cond: v.cond || {},
              up: v.upgrades || {}, stk: cos.stk || [], parts: {} }, cos);
            /* rims are one object in the game, two fields on the server */
            if (cos.rimT || cos.rimC) row.rim = { t: cos.rimT, c: cos.rimC };
            /* the lists of what has been BOUGHT, separate from what is fitted */
            if (Array.isArray(cos.rims)) row.rims = cos.rims;
            if (Array.isArray(cos.stk))  row.stk  = cos.stk;
            s.owned[v.id] = row;
            if (v.current) s.cur.line = v.id;
          });
        }
        if (local && typeof local === 'object') {
          if (local.set) s.set = Object.assign(s.set, local.set);
          if (local.avatar) s.avatar = local.avatar;
          if (local.name) s.name = local.name;
        }
      } catch (e) {}
    },

    /* ---------- reporting ---------- */
    async reportTrip(t) {
      if (this.practice) return null;
      const reportingUser=this.user?.id;
      const runPromise=t.runPromise;delete t.runPromise;
      if(this.protocol>=2){
        const run=await runPromise;
        if(!run?.ok||!run.runId){try{UI.toast('Online shift could not be opened. This run was not banked.',5000)}catch{}return {error:'Online shift could not be opened. This run was not banked.'}}
        t.runId=run.runId;
      }
      const uid=this.user?.id;
      if(uid!==reportingUser)return {error:'account changed'};
      if(this.protocol>=2&&uid){try{localStorage.setItem('ogra-pending-trip:'+uid,JSON.stringify(t))}catch{}}
      const res = await this.call('trip', t);
      if (res && res.player && uid===this.user?.id) this.adopt(res.player);
      if(this.protocol>=2&&uid&&(res?.ok||res?.httpStatus===422)){try{localStorage.removeItem('ogra-pending-trip:'+uid)}catch{}}
      if(!res||res.error){try{UI.toast(res?.error||'Trip confirmation unavailable. Check your online profile.',5000)}catch{}}
      return res;
    },

    async retryTrip(){
      if(this.protocol<2||this.practice||!this.user)return null;
      const uid=this.user.id;let t;
      try{t=JSON.parse(localStorage.getItem('ogra-pending-trip:'+uid)||'null')}catch{return null}
      if(!t)return null;
      const res=await this.call('trip',t);
      if(res?.ok){if(uid===this.user?.id&&res.player)this.adopt(res.player);localStorage.removeItem('ogra-pending-trip:'+uid)}
      if(res?.httpStatus===422||(res?.httpStatus===409&&/closed shift/.test(res.error||''))){localStorage.removeItem('ogra-pending-trip:'+uid);try{UI.toast('Previous trip was rejected and was not banked.',5000)}catch{}return {ok:true,rejected:true}}
      return res||{error:'Previous trip is still awaiting online confirmation.'};
    },

    async buy(kind, data) {
      if (this.practice) return { error: 'practice' };
      if (this._buying) return { error: 'A purchase is already being processed. Please wait.' };
      this._buying = true;
      const uid=this.user?.id;
      try {
      const body=Object.assign({kind},data),key='ogra-pending-purchase:'+uid;
      let request=Object.assign({requestId:this.uuid()},body);
      if(this.protocol>=2&&uid){
        let pending;try{pending=JSON.parse(localStorage.getItem(key)||'null')}catch{}
        if(pending){
          const previous=Object.assign({},pending);delete previous.requestId;
          if(JSON.stringify(previous)!==JSON.stringify(body))return {error:'A previous purchase needs confirmation. Retry that same purchase first.'};
          request=pending;
        }
        try{localStorage.setItem(key,JSON.stringify(request))}catch{}
      }
      const res = await this.call('purchase', request);
      if(this.protocol>=2&&uid&&res){try{localStorage.removeItem(key)}catch{}}
      if (res && res.ok) {
        /* a purchase can change the licence, the vehicle list or its fuel -
           not just the balance - so pull the whole picture back */
        const full = await this.call('sync', { local: {} });
        if(uid!==this.user?.id)return res;
        if (full?.ok) { this.adopt(full.player); this.applyVehicles(full.vehicles, full.local); }
        else if (res.cash != null) this.adopt(Object.assign({}, this.lastServer, { cash: res.cash, revision:res.revision }));
        try { if (typeof UI !== 'undefined' && UI.refresh) UI.refresh(); } catch (e) {}
      }
      return res;
      } finally { this._buying = false; }
    },

    startSync() {
      clearInterval(this._t);
      this._t = setInterval(async () => {
        if (this.practice || this._syncing || this._buying || document.hidden) return;
        this._syncing = true;
        const uid = this.user?.id;
        try {
        let local = {};
        try { const s = S(); local = { set: s.set, avatar: s.avatar, name: s.name }; } catch (e) {}
        const res = await this.call('sync', { local });
        if (res && res.player && uid === this.user?.id && !this._buying) this.adopt(res.player);
        } finally { this._syncing = false; }
      }, 30000);
    },

    uuid(){
      if(crypto.randomUUID)return crypto.randomUUID();
      const a=crypto.getRandomValues(new Uint8Array(16));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;
      const h=Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
    },

    /* ---------- auth actions ---------- */
    async signIn(email, pass, note) {
      const { error } = await this.sb.auth.signInWithPassword({ email, password: pass });
      if (error) note(error.message);
    },
    async signUp(email, pass, note) {
      const ar = (typeof LANG !== 'undefined' && LANG.cur === 'ar');
      const { error } = await this.sb.auth.signUp({ email, password: pass });
      if (error) note(error.message);
      else note(ar ? 'بعتنالك إيميل تأكيد — افتحه وبعدين سجّل دخول.'
                   : 'Check your email to confirm, then sign in.', true);
    },
    signOut() { if (this.sb) this.sb.auth.signOut(); },

    /* ---------- screens ---------- */
    offline(why) {
      this.online = false; this.practice = true;
      console.warn('[ogra] offline:', why);
      this.gate(true, why);
    },

    gate(show, note) {
      let el = document.getElementById('ogGate');
      if (!show) { if (el) el.remove(); return; }
      /* Once dismissed it must never come back mid-session: it covers the
         whole screen and silently swallows every click underneath. */
      try { if (sessionStorage.getItem('ogra_gate_dismissed')) return; } catch (e) {}
      if (el) return;
      const ar = (typeof LANG !== 'undefined' && LANG.cur === 'ar');
      el = document.createElement('div');
      el.id = 'ogGate';
      el.innerHTML = `
        <div class="gateCard">
          <div class="gateLogo">OGRA <span>أجرة</span></div>
          <p class="gateMsg">${ar ? 'سجّل دخولك عشان رصيدك ومستواك يتحفظوا'
                                  : 'Sign in so your balance and progress are saved'}</p>
          <input class="gateIn" id="ogEmail" type="email" autocomplete="email"
                 placeholder="${ar ? 'الإيميل' : 'Email'}">
          <input class="gateIn" id="ogPass" type="password" autocomplete="current-password"
                 placeholder="${ar ? 'كلمة السر' : 'Password'}">
          <button class="gateBtn" data-go="in">${ar ? 'دخول' : 'Sign in'}</button>
          <button class="gateBtn ghost" data-go="up">${ar ? 'حساب جديد' : 'Create account'}</button>
          <button class="gateBtn link" data-go="practice">${ar ? 'العب من غير حساب' : 'Play offline'}</button>
          <div class="gateNote" id="ogNote"></div>
          <div class="gateNote small">${ar
            ? 'في وضع اللعب بدون حساب، الفلوس والمستوى مش هيتحفظوا.'
            : 'Offline play does not bank money or progress.'}</div>
        </div>`;
      document.body.appendChild(el);
      el.querySelector('#ogNote').textContent = note || '';

      const note2 = (m, ok) => {
        const n = document.getElementById('ogNote');
        if (n) { n.textContent = m; n.className = 'gateNote' + (ok ? ' ok' : ' bad'); }
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-go]'); if (!b) return;
        const email = (document.getElementById('ogEmail') || {}).value || '';
        const pass  = (document.getElementById('ogPass')  || {}).value || '';
        if (b.dataset.go === 'practice') { this.practice = true; el.remove();
          try { sessionStorage.setItem('ogra_gate_dismissed', '1'); } catch (e) {}
          return; }
        if (!email || !pass) return note2(ar ? 'اكتب الإيميل وكلمة السر' : 'Enter email and password');
        if (b.dataset.go === 'in') this.signIn(email, pass, note2);
        else this.signUp(email, pass, note2);
      });
    },

    showBan(j) {
      /* A ban stops play immediately: the reason is shown, then the app
         closes on a ten second count. Lifting it is a manual change to
         banned_until in the database - nothing here can undo it. */
      if (document.getElementById('ogBan')) return;
      this.online = false; this.practice = true;
      try { clearInterval(this._t); } catch (e) {}
      try { if (typeof GAME !== 'undefined') { GAME.paused = true; } } catch (e) {}
      try { if (typeof MUSIC !== 'undefined') MUSIC.want(false); } catch (e) {}
      try { if (typeof AU !== 'undefined' && AU.ctx) AU.ctx.suspend(); } catch (e) {}

      const ar = (typeof LANG !== 'undefined' && LANG.cur === 'ar');
      const reason = j && j.reason ? String(j.reason) : 'irregular activity';
      const REASON_AR = {
        'edited save data': 'تم تعديل بيانات الحفظ',
        'claimed a trip in a vehicle that is not owned': 'رحلة بمركبة غير مملوكة',
        'reported a payout above the maximum possible': 'أرباح أعلى من الحد الممكن',
        'repeated trips faster than physically possible': 'رحلات أسرع من الممكن فعلياً'
      };
      const reasonAr = REASON_AR[reason] || 'نشاط غير طبيعي';

      const el = document.createElement('div');
      el.id = 'ogBan';
      el.innerHTML = `<div class="gateCard">
        <div class="gateLogo" style="color:#ff6b6b">⛔ ${ar ? 'الحساب موقوف' : 'Account suspended'}</div>
        <p class="gateMsg"><b>${ar ? reasonAr : reason}</b><br>
          <small>${ar ? reason : reasonAr}</small></p>
        <div class="gateNote">${ar ? 'اللعبة هتقفل خلال' : 'Closing in'}
          <b id="ogBanN" style="color:#ffd98a;font-size:22px">10</b>
          ${ar ? 'ثانية' : 'seconds'}</div>
        <div class="gateNote small">${ar
          ? 'لرفع الإيقاف، عدّل banned_until في قاعدة البيانات.'
          : 'To lift this, clear banned_until in the database.'}</div></div>`;
      document.body.appendChild(el);

      let n = 10;
      const tick = setInterval(() => {
        n--;
        const box = document.getElementById('ogBanN');
        if (box) box.textContent = String(Math.max(0, n));
        if (n <= 0) {
          clearInterval(tick);
          try { window.close(); } catch (e) {}
          /* window.close() only works for script-opened windows, so leave a
             dead screen behind rather than a playable game */
          setTimeout(() => {
            try {
              document.body.innerHTML =
                '<div style="position:fixed;inset:0;background:#05080d;color:#ff6b6b;'
                + 'display:grid;place-items:center;font:800 18px Cairo,system-ui,sans-serif;'
                + 'text-align:center;padding:8vw">'
                + (ar ? 'الحساب موقوف<br><small style="color:#8e9bb0">'
                      : 'Account suspended<br><small style="color:#8e9bb0">')
                + (ar ? reasonAr : reason) + '</small></div>';
            } catch (e) {}
          }, 250);
        }
      }, 1000);
    }
  };;

  document.head.insertAdjacentHTML('beforeend', `<style>
  #ogGate,#ogBan{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;
    background:rgba(6,9,15,.95);backdrop-filter:blur(8px);
    font-family:Cairo,system-ui,sans-serif;color:#e8eef8;padding:5vw;overflow:auto}
  .gateCard{max-width:min(92vw,400px);width:100%;text-align:center;background:rgba(16,25,42,.92);
    border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:26px 20px}
  .gateLogo{font-weight:900;font-style:italic;font-size:36px;letter-spacing:.02em;
    background:linear-gradient(180deg,#fff,#ffd98a 60%,#ffb627);-webkit-background-clip:text;
    background-clip:text;color:transparent}
  .gateLogo span{font-style:normal;font-size:22px;-webkit-text-fill-color:#ffd98a}
  .gateMsg{color:#cfd8e6;line-height:1.6;margin:12px 0 16px;font-weight:700;font-size:15px}
  .gateIn{display:block;width:100%;margin:8px 0;padding:12px 14px;border-radius:12px;
    border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);
    color:#e8eef8;font:inherit;font-size:15px}
  .gateIn::placeholder{color:#7c8798}
  .gateBtn{display:block;width:100%;margin:8px 0;padding:13px 16px;border:0;border-radius:13px;
    font:inherit;font-weight:900;cursor:pointer;
    background:linear-gradient(180deg,#ffd98a,#ffb627);color:#161208}
  .gateBtn.ghost{background:rgba(255,255,255,.06);color:#e8eef8;border:1px solid rgba(255,255,255,.14)}
  .gateBtn.link{background:none;color:#8e9bb0;font-weight:700;text-decoration:underline}
  .gateNote{margin-top:10px;color:#93a1b6;font-size:13px;line-height:1.55;min-height:1em}
  .gateNote.bad{color:#ff9d9d} .gateNote.ok{color:#8ef0b0}
  .gateNote.small{font-size:12px;opacity:.75}
  </style>`);

  /* online mode only when actually served over http(s) */
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    /* Put the gate up at once so a new player signs in before the menu is
       ever visible, rather than seeing it and being interrupted. */
    document.addEventListener('DOMContentLoaded', () => {
      try { if (!NET.user) NET.gate(true); } catch (e) {}
    });
    window.addEventListener('load', () => NET.init());
  } else {
    console.log('[ogra] file:// — offline practice mode');
    NET.practice = true;
  }
})();
