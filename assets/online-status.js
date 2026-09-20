/* OGRA cloud-save status badge. Reads OGRA_NET without containing credentials. */
(() => {
  'use strict';
  let closeTimer;
  const ar = () => typeof LANG !== 'undefined' && LANG.cur === 'ar';
  const copy = state => ({
    connecting: ar()?['جاري الاتصال','جاري فحص الحفظ السحابي']:['CONNECTING','Checking cloud save'],
    online: ar()?['متصل أونلاين','التقدم والفلوس بيتحفظوا']:['ONLINE','Progress and money are saved'],
    practice: ar()?['لعب بدون حفظ','التقدم والفلوس مش هيتحفظوا']:['OFFLINE PRACTICE','Progress and money are not saved'],
    signedout: ar()?['غير مسجل','سجل دخولك لتفعيل الحفظ']:['SIGN-IN REQUIRED','Sign in to enable cloud saving'],
    error: ar()?['خطأ في الاتصال','اضغط لمعرفة التفاصيل']:['CONNECTION ERROR','Tap to see details']
  })[state];
  function badge(){
    let el=document.getElementById('ogNetStatus');
    if(el)return el;
    el=document.createElement('button');el.id='ogNetStatus';el.type='button';el.setAttribute('aria-live','polite');
    el.innerHTML='<i></i><span><b></b><small></small></span>';
    el.onclick=()=>{el.classList.toggle('open');clearTimeout(closeTimer);closeTimer=setTimeout(()=>el.classList.remove('open'),5000)};
    document.body.appendChild(el);return el;
  }
  function state(){
    const n=window.OGRA_NET;
    if(!navigator.onLine)return['error',ar()?'لا يوجد اتصال بالإنترنت':'No internet connection'];
    if(!n)return['connecting',''];
    if(n.online&&!n.practice)return['online',''];
    if(n._authLoading)return['connecting',''];
    if(n.user&&n.lastError)return['error',String(n.lastError)];
    if(n.user)return['connecting',''];
    try{if(sessionStorage.getItem('ogra_gate_dismissed'))return['practice','']}catch{}
    return['signedout',''];
  }
  function paint(){
    const [s,detail]=state(),el=badge(),text=copy(s);el.className=s;
    el.querySelector('b').textContent=text[0];el.querySelector('small').textContent=detail||text[1];el.title=detail||text[1];
  }
  const css=document.createElement('style');css.textContent=`
  #ogNetStatus{position:fixed;top:max(10px,env(safe-area-inset-top));inset-inline-end:max(10px,env(safe-area-inset-right));z-index:2147483700;display:flex;align-items:center;gap:8px;max-width:min(88vw,330px);min-height:35px;padding:7px 11px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(7,13,24,.9);color:#eef6ff;box-shadow:0 8px 26px rgba(0,0,0,.34);backdrop-filter:blur(12px);font:700 11px Cairo,system-ui,sans-serif;cursor:pointer;text-align:start;transition:.2s transform,.2s border-color}
  #ogNetStatus:hover{transform:translateY(-1px)}#ogNetStatus>i{width:9px;height:9px;flex:none;border-radius:50%;background:#aab4c4;box-shadow:0 0 0 4px rgba(170,180,196,.12)}#ogNetStatus span{display:grid;line-height:1.15}#ogNetStatus b{font-size:11px;letter-spacing:.06em;white-space:nowrap}#ogNetStatus small{display:none;margin-top:3px;color:#b9c5d6;font-size:10px;font-weight:600;max-width:260px;white-space:normal}#ogNetStatus.open{border-radius:15px}#ogNetStatus.open small{display:block}
  #ogNetStatus.online{border-color:rgba(69,235,151,.48)}#ogNetStatus.online>i{background:#45eb97;box-shadow:0 0 0 4px rgba(69,235,151,.14),0 0 13px #45eb97}#ogNetStatus.connecting{border-color:rgba(255,190,71,.5)}#ogNetStatus.connecting>i{background:#ffbe47;animation:ogNetPulse 1s infinite}#ogNetStatus.practice,#ogNetStatus.signedout{border-color:rgba(146,166,196,.35)}#ogNetStatus.practice>i,#ogNetStatus.signedout>i{background:#92a6c4}#ogNetStatus.error{border-color:rgba(255,91,104,.58)}#ogNetStatus.error>i{background:#ff5b68;box-shadow:0 0 0 4px rgba(255,91,104,.14)}@keyframes ogNetPulse{50%{opacity:.35;transform:scale(.72)}}@media(max-width:520px){#ogNetStatus{top:max(6px,env(safe-area-inset-top));inset-inline-end:6px;padding:6px 9px;min-height:31px}#ogNetStatus b{font-size:10px}}`;
  document.head.appendChild(css);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
  setInterval(paint,1000);addEventListener('online',paint);addEventListener('offline',paint);
})();
