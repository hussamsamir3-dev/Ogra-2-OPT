# OGRA backend upgrade — staging package

These files replace the supplied purchase, sync and trip Edge Functions and add the
revised admin-account function. **Nothing has been deployed or executed against your
Supabase project.** Your complete schema, policies, constraints and admin RPC source
were not supplied, so staging verification is required before production cutover.

## What this changes

| Area | Change |
| --- | --- |
| Purchase/trip writes | One database transaction updates money, vehicle state, trip history and receipt; errors roll back all of it |
| Concurrency | Player row lock and revision check reject calculations made from an outdated profile |
| Replay | Per-player request receipts return the same result for a repeated request; altered reuse is refused |
| Shift timing | Server-created run ID and server elapsed time; one active run per player |
| Fuel | Actual vehicle fuel type, upgraded tank capacity, bounded litres, no second cash charge on trip settlement |
| Garage | Owned vehicle required, allowlisted upgrades/cosmetics, integer tiers, all gained tiers charged, validated stickers and rim ownership |
| Sync | Empty sync is read-only; preferences merge; incoming money/ownership cannot overwrite server records |
| Progression | Existing XP thresholds retained; levels above 21 become reachable; existing higher levels never reduced by trip settlement |
| Admin accounts | Checked authorization/database errors, stronger password bounds, audit intent, partial-failure reporting, protected admin deletion |

The catalog was extracted from the actual game: 25 player vehicles and 17 routes,
including current route unlock levels, fuel types and tank sizes. This resolves the
supplied server/client mismatch. Catalog fuel prices are game balance values.

## Existing data

The migration adds players.ogra_revision and three private tables: ogra_receipts,
ogra_runs and ogra_claims. It adds revision triggers and service-role-only RPCs.
It does not recreate players, reset balances, erase cars, or replace save data.
Legacy daily/mission claims in flags are respected.

Expected existing columns/types follow the supplied functions:

- players: id UUID, cash/xp/level, banned_until, licence_class/exp/pts,
  total_trips/pax/km/fines, last_seen; the profile also reads name/email/reputation.
- player_vehicles: player_id, vehicle_id, fuel, condition/upgrades/cosmetics JSONB,
  is_current; unique(player_id, vehicle_id).
- saves: player_id unique, data JSONB, updated_at.
- trips: player_id, route_id, vehicle_id, started_at, duration_s, passengers,
  distance_km, fare_earned, tips, fines, fuel_cost, net, xp_gained.
- flags: player_id, kind. Admin-account additionally uses admins and admin_audit,
  plus your existing admin_make_dev RPC.

If your real types or constraints differ, adapt the migration in staging. In
particular, check JSON versus JSONB and auth.users → players deletion behavior.

## Deployment order

1. Back up the database, existing functions and current website. Use a separate
   staging project with representative test accounts and your complete schema.
2. Run `preflight.sql` there. Review direct write policies/grants on economy tables
   and privileges on all admin RPCs. Client roles must not be able to mint cash,
   edit vehicle ownership/upgrades, or call the new service-only RPCs directly.
   This package does not silently revoke your existing application's grants.
3. Apply migrations/202609200001_atomic_economy.sql in staging as one transaction.
   If any prerequisite fails, roll back and correct the schema mapping first.
4. Check all four functions with Deno/Supabase CLI. Keep the _shared folder beside
   them. The functions read only SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and, for
   admin delegation, SUPABASE_ANON_KEY from the environment. Never put the service
   key into the game or GitHub Pages.
5. Deploy purchase, trip and admin-account to staging, then sync last. Sync's
   `protocol: 2` response enables the new client run/receipt flow. Run the scenarios
   below before repeating this coordinated deployment in production.
6. Upload index.html and assets/ to your web host; do not host server source/tests.
   Require a full reload and end active legacy sessions during cutover. A legacy
   client cannot settle a protocol 2 trip without first starting a server run.

Example CLI commands, from a configured staging project:

```
supabase db push
supabase functions deploy purchase
supabase functions deploy trip
supabase functions deploy admin-account
supabase functions deploy sync
```

CLI project initialization/linking is environment-specific and is not included.
Leave gateway verification consistent with your current publishable-key setup;
each function also verifies the bearer token through Auth before using service role.

## Staging acceptance scenarios

- Sign in, change settings, reload, open garage; preferences and owned modifications survive.
- Buy with insufficient funds: neither money nor inventory changes.
- Submit two purchases concurrently: at most one stale calculation commits; the other
  returns 409. Retry after refresh. Two identical request IDs produce one debit.
- Force a vehicle/trip insert error: player balance must remain unchanged.
- Repeat a daily claim with different IDs: only one reward.
- Upgrade several tiers, change paint, buy/fill rims and stickers, refuel near tank
  capacity, repair an owned part, issue/renew a licence, and spin once.
- Start a run, drive, pause, finish, retry the same report: exactly one payout.
  Empty run: no money/XP. Unknown IDs, nonfinite inputs and excessive telemetry: rejected.
- Two browser tabs: an older run is abandoned when a new run starts; its report must
  be refused. A successfully settled run still returns its original receipt.
- Interrupt a response and retry: client reuses the receipt ID. Verify authoritative
  balance after refresh, including purchases between a report and its retry.
- Admin/non-admin access, developer provisioning failure, set password, self/admin
  deletion refusal, successful deletion and audit records. Test only disposable accounts.
- Mobile Safari signed-in pause/resume/end/menu and orientation changes.

## Behavior changes and remaining limits

- Self-reported rating/on-time fields no longer grant bonus cash. Passenger fares
  and distance XP remain, with elapsed-time/distance/fuel bounds.
- Server-backed daily missions currently support pax (25), trips (2), km (40),
  noFine (2 recorded qualifying trips) and long (one 30 km trip). Other mission
  claims return a clear unsupported-evidence error; their local displays remain.
- Reported passenger counts, fines and distance still originate in the browser.
  Bounds and run IDs reduce abuse but cannot prove a real drive occurred. This is
  not an authoritative multiplayer simulation or complete anti-cheat system.
- Existing admin RPC implementations and all database RLS policies remain unverified.
- Trip condition/wear persistence is unchanged; the new backend does not trust
  arbitrary client condition increases. Full server-authoritative wear and workshop
  economy reconciliation require a later event-ledger implementation.
- Protocol 2 receipts should be retained for replay protection. Runs/receipts need
  an operational retention policy; do not delete receipts while clients may retry.
- Concurrent user actions may receive 409 rather than an automatic retry. Refresh
  and repeat deliberately; no hidden double purchases are issued.
- Account deletion crosses Auth and application data; it cannot be one SQL transaction.
  The function deletes Auth first and reports cleanupRequired/auditPending precisely.
  Inspect your foreign keys and external storage cleanup before enabling production deletion.

Design references: [Supabase auth callbacks](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
and [database function security](https://supabase.com/docs/guides/database/functions).
