# OGRA — Nightshift / Driver+ Edition

Build: **2026-09-20-driver-plus-2**. This extends your existing 2D game and keeps
the Nightshift menu redesign and pause freeze fix.

## New in Driver+

- Driver+ studio from HQ and the driving HUD: route briefing, upcoming stops,
  estimated fuel range, guidance, graphics and motion settings.
- Cruise control through the studio, HUD CC button, or C. Brake, handbrake,
  reverse, open doors or collision disengage it. It controls throttle only;
  you remain responsible for braking and changing lanes.
- Live prompts for startup, stopping, speed limits, wet roads and closing traffic;
  optional haptic alerts. Three served stops trigger service feedback.
- AI adapts its target speed to road limits and increases following distance in rain.
- Adaptive graphics, high detail and battery saver; adjustable camera/interface motion.
- Rain and wipers now use elapsed time instead of assuming a 60 Hz display.
- Fixed a scrape-effect exception; clearer SVG controls and accelerator label.
- Reorganized portrait instruments and driving buttons into dedicated rows above
  the pedals, with larger touch targets and no gauge/pedal overlap.
- Safer online client: bounded requests, deferred auth callbacks, read-only profile
  refresh, overlapping-purchase protection and rejection of stale profile revisions.
- Protocol 2 adds persistent pending receipts and retries for uncertain purchases/trips.
  It activates only when the new backend is installed; legacy backend remains supported.

**Backend changes are included, not deployed.** Read `supabase/DEPLOYMENT.md` before
using them. They require a database migration and staging checks against your schema.
The existing sign-in URL and public key are preserved; no live player data was modified.

## Run it

1. Extract the entire ZIP to one folder.
2. Open index.html in Chrome or Edge for local play. Keep the assets folder beside it.
3. For an existing web host / GitHub Pages, upload index.html and the entire assets/
   folder, including both nightshift and driver-plus JS/CSS. Do not upload only index.html.
   Keep supabase/, tests/ and handover documents outside the public website.
4. Reload without the old cache after replacing files. No npm install or build step is required.

This archive has not been published to your live website. Existing Supabase configuration
is unchanged. Sign-in and online rewards require your working backend.
Local play does not require sign-in. External radio streams and cloud services may be
unavailable offline. No external splash.html is needed anymore.

## What changed

- Cinematic animated tap-to-start screen: native HTML/CSS, keyboard and touch compatible.
- Completely new animated Driver HQ, with vehicle showcase, day/evening/night selection,
  one-tap career start, daily route spotlight, route choice, and navigation dock.
- Restyled existing secondary menus without removing the original game systems.
- A single pause / resume / end-shift / main-menu lifecycle. P or Escape pauses/resumes.
- New end-of-shift report: driving grade, comfort, passengers, estimated trip net,
  clean-driving record, mastery score, and replay.
- Three optional per-shift skill contracts:
  - Silk road: 60 seconds of clean driving, moving at 8 km/h or more under the road limit.
    Speeding, a collision/fine, or hard braking resets the streak; stopping pauses it.
  - People first: pick up 6 passengers and spend at least 60 seconds moving at 8 km/h or more.
  - City explorer: cover 2 in-game reported km and spend at least 60 seconds moving at 8 km/h or more.
- Clean streak milestones every 15 seconds award 25 mastery points.
- Completed contracts award 250–350 mastery points. End an engaged shift to bank them.
- A local logbook of the last 12 engaged shifts and a personal best for each route/region.
- Mastery is cosmetic, stored on this browser/device separately from cash and online XP.
  It does not sync to the online leaderboard or provide an economy advantage.
  An idle shift under 30 seconds or without meaningful travel/passengers earns no mastery.
- Empty local shifts no longer grant the old automatic 50 XP.
- Fixed a startup watchdog that could reopen HQ over gameplay if you tapped Start quickly.

## Freeze fix

The old finishSession loop directly mutated s.xp and s.lvl. The online economy
seals those fields with setters that reject client writes. When XP was already at or
above the threshold, the loop never changed its condition and blocked the main thread.

The new code does not run local progression in online mode. Offline progression is
calculated in ordinary local variables with a bounded loop, then committed once.
The online report is asynchronous and session settlement remains idempotent.
The account seal and server authority have NOT been bypassed.

The new lifecycle also clears held pedals/keys and transient service overlays before
leaving; it prevents duplicate settlement and prevents pause shortcuts from resuming
an already-ended shift.

## Performance and reliability

- No world simulation or road rendering behind the new HQ or shift report.
- Hidden-tab frames do no game work; switching away releases held controls and pauses.
- Paused road rendering is capped at 5 FPS; fueling retains its original updates.
- Disabled per-frame localStorage debug traces and obsolete pause freeze/audio-suspend patches.
- Removed an unused performance-sampling animation loop.
- The menu music playlist now uses the track actually included in the archive.
- Menu animations use transforms and opacity; reduced-motion preference is respected.
- Existing save/profile keys are preserved. New mastery data uses a separate key.

## Test scope

See TEST-RESULTS.md. Physical iPhone Safari and the live authenticated backend were
not available for end-to-end validation. The exact locked-economy condition was
reproduced and tested using the real game code plus an in-memory server stub.
No live account balances, purchases, or server records were modified during testing.

For a final device check: start a shift, pause, resume, end a shift, return to HQ,
start another shift, pause, then choose Save & main menu. Test once while signed in
and once offline. Keep your current hosted version available until this check passes.
