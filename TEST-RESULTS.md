# Nightshift / Driver+ validation — 20 September 2026

## Driver+ checks

- 16 Node tests passed: finite/range validation, settings allowlists, prototype-key
  rejection, upgrade tier pricing, real sticker/rim payloads, catalog fuel/route rules,
  level 22+, request IDs, read-only sync, network timeout, failed sign-in profile,
  stale revisions, duplicate purchase prevention and retained/retried receipts.
- Driver+ studio fits 1440×900, 820×1180, 390×844 and 844×390 viewports.
- Gameplay and studio transitions checked at desktop, tablet and phone sizes.
- Portrait gauges clear the pedals; all six auxiliary touch targets are at least
  40×40 CSS pixels and stay within the viewport (designed at 44×44).
- Editing studio controls then closing restores the previous pause state.
- Cruise engages under valid conditions and disengages on brake input.
- Battery saver caps scene resolution; wet-road AI increases its following headway.
- Scrape callback runs without the original undefined-function error.
- Stubbed protocol 2 start and settlement sends one run ID and one report.
- No runtime errors in the Driver+ browser suite.

Run the included Node checks with:

```
node --test tests/network.test.cjs supabase/tests/policy.test.mjs
```

Browser tests require Playwright and its Chromium installation. Set CHROMIUM_PATH
only if using a separately installed Chromium binary.

```
node tests/browser-driver-plus.cjs
node tests/browser-regression.cjs
```

**Not executed:** Supabase migrations, Deno deployment, database concurrency tests,
live authenticated purchases/trips, admin account operations, or physical Safari tests.
The SQL transaction design and Edge Function syntax were reviewed locally; this is
not a claim that the live database's policies or all existing admin RPCs are secure.

## Automated checks completed

| Check | Result |
| --- | --- |
| Original finishSession with locked online XP=500, level=1 | Reproduced non-returning loop; isolated worker terminated after 700 ms |
| Patched finishSession, identical locked state | Returns normally |
| Browser: online pause → end shift at the locked-XP threshold | Pass; approximately 0.24 seconds in the test environment |
| Online XP and level remain unchanged by client settlement | Pass |
| Repeated finalization sends only one trip report | Pass |
| Online pause → main menu | Pass |
| Four full start / pause / resume / end-or-quit / restart cycles | Pass |
| Routes, garage, showroom, missions, rewards, licence, settings, free drive, modes | Rendered successfully |
| Contract completion with simulated qualifying telemetry | Pass |
| Mastery banked once; logbook survives reload | Pass |
| Portrait 390×844 and landscape 844×390 layouts | Checked, no horizontal overflow |
| English and Arabic/RTL | Checked |
| Touch-enabled landscape: tap start, pause, end shift, return to HQ | Pass |
| Open directly using file://, start and pause → main menu | Pass |
| Runtime JavaScript errors during final suite | None |
| Missing local resource requests during final suite | None |
| 54 inline scripts and the new external JavaScript | Syntax checked |

Screenshots were visually reviewed for launch, desktop HQ, phone HQ in both
languages, landscape pause, and the shift report. Decorative motion has a
reduced-motion alternative.

## Boundaries

- Automated browser: Chromium on Linux, including touch/mobile emulation.
- Online condition: the real sealed economy plus an in-memory report stub.
- External requests were blocked during tests. No real account economy was modified.
- Not tested on a physical iPhone, actual Safari/WebKit, or a live signed-in backend.
- Existing physics, every vehicle, every route, full-route completion, live radio
  availability, and all service/purchase combinations have not been exhaustively tested.
- Contract telemetry was advanced in a test fixture; this validates accounting and
  settlement, not a human playthrough of every challenge.

Recommended deployment check: retain the previous version, upload the whole folder,
then repeat pause/resume/end/menu on your actual device while signed in.
