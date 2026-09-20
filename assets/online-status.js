/* OGRA — online status.
   The game already prints its own connection indicator in the corner, so this
   second badge was a duplicate sitting on the opposite side and colliding with
   the HUD on a phone. The module now only keeps the underlying state; the badge
   is not drawn. */
(() => {
  'use strict';
  const kill = () => { const el = document.getElementById('ogNetStatus'); if (el) el.remove(); };
  kill();
  setInterval(kill, 700);
  document.addEventListener('DOMContentLoaded', kill, {once:true});
})();
