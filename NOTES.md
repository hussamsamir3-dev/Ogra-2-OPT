# OGRA Nightshift update (19 Sep 2026)

The notes below are the ORIGINAL handover and are retained for history.
Their "pause freeze (not fixed)" status is superseded by this update.
Read START-HERE.md for the current build, verified fix, and test limits.

The actual exit hang was reproduced in the original finishSession:
online economy setters reject changes to XP and level, making the level-up
while loop infinite when XP >= xpFor(level). The calculation now uses local
variables with a bounded loop, only offline. Online progression remains
server-controlled. Audio/network timing was not required to reproduce it.

New UI and gameplay extensions: assets/nightshift.js + assets/nightshift.css.
All original vehicle, route, service, and account assets are preserved.

---

# Original Ogra ~ أجرة project handover (19 Sep 2026)

Build in `index.html`: **2026-09-19q**

## Files
- `index.html` — the whole game (single file, ~1.9 MB)
- `net.js` — Supabase sign-in / save sync → goes in `assets/`
- `assets/` — all art, audio and data (compressed: 15.6 MB → 8.3 MB, no image resized)
- `admin.html`, `ogra-admin.zip` — admin console + its SQL and edge function

## Live setup
- GitHub Pages: https://hussamsamir3-dev.github.io/Orgra-/
- Supabase project `zmbyrpiiqvfrmszvhvvh` (Frankfurt)
- Supabase → Authentication → URL Configuration
  - Site URL: `https://hussamsamir3-dev.github.io/Orgra-/`
  - Redirect URLs: `https://hussamsamir3-dev.github.io/Orgra-/**`
- Built-in email sends only to project members and is capped at 2/hour. Use a
  custom SMTP provider, or switch "Confirm email" off.

## OPEN BUG — pause freeze (not fixed)
**Symptom:** on the live site only (not when opening index.html locally), pausing
during a trip freezes the page. Environment sounds keep playing; nothing else
responds. Force-quitting Safari is the only way out.

**What is known:**
- Audio continuing while everything stops means the browser's **main thread is
  blocked inside one function** — Web Audio runs on its own thread. So this is a
  hang (infinite loop or blocking call), not a layout, z-index or input problem.
- It does **not** reproduce with the file opened locally, where the radio streams,
  the background music and the Supabase connection are all absent. Those three are
  the only meaningful difference, so the cause is most likely among them.
- It does not reproduce in Chromium on desktop or in phone emulation.
- The pause sequence itself completes (breadcrumbs reached the final step), so the
  hang happens after pausing, while the game sits paused.

**What was already tried (all failed on device):**
scaling the window to fit; forcing it above the canvas; removing `:has()` and
sticky CSS; a custom touch handler; a rewritten pause panel; suspending audio and
hiding the canvas while paused; deferring saves; leaving the radio streaming
instead of stopping it.

**Suggested next step for whoever picks this up:**
connect the iPhone to a Mac and use Safari's Web Inspector (Develop → iPhone →
the page) with the Timeline recording while pausing. The blocked call shows up
directly in the JavaScript stack. Everything else is guesswork without it.

## Other recent work in this build
Ramped road joins (no more steps), speed humps restored, workshop/repair system
rebuilt, wear and damage, rest-house breaks with passengers, air conditioning,
smarter traffic, checkpoints, rain, progress-bar icons, route unlocks by distance,
all vehicles on all routes, performance work (median frame time 37 ms → 22 ms).
