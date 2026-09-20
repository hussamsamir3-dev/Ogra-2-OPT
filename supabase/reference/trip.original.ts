/* ============================================================
   Ogra — Edge Function: trip
   Self-contained: paste this whole file into the Supabase
   function editor and deploy. Nothing else to add.
   ============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ---------- economy tables (the authority on every price) ---------- */
/* ============================================================
   THE AUTHORITATIVE ECONOMY
   ------------------------------------------------------------
   Every price, fare, fine and XP threshold lives here, on the
   server. The game client never sends money - it reports what
   happened, and this file decides what that was worth.
   Editing the client cannot change any number below.
   ============================================================ */

const ROUTES = [
  {
    "id": "cairo_hurghada",
    "name": "Cairo → Hurghada",
    "fare": 420,
    "lvl": 15,
    "len": "long",
    "km": 450,
    "stops": 6,
    "coachOnly": true
  },
  {
    "id": "cairo_gouna",
    "name": "Cairo → El Gouna",
    "fare": 470,
    "lvl": 18,
    "len": "long",
    "km": 470,
    "stops": 6,
    "coachOnly": true
  },
  {
    "id": "cairo_sharm",
    "name": "Cairo → Sharm El Sheikh",
    "fare": 520,
    "lvl": 20,
    "len": "long",
    "km": 490,
    "stops": 6,
    "coachOnly": true
  },
  {
    "id": "maadi_tahrir",
    "name": "Maadi → Tahrir",
    "fare": 8,
    "lvl": 1,
    "len": "short",
    "km": 13,
    "stops": 6,
    "coachOnly": false
  },
  {
    "id": "giza_haram",
    "name": "Giza Square → Pyramids",
    "fare": 6,
    "lvl": 1,
    "len": "short",
    "km": 10,
    "stops": 5,
    "coachOnly": false
  },
  {
    "id": "ramses_hussein",
    "name": "Ramses → El Hussein",
    "fare": 7,
    "lvl": 2,
    "len": "short",
    "km": 5,
    "stops": 5,
    "coachOnly": false
  },
  {
    "id": "asher_ramses",
    "name": "El Hay El Asher → Ramses",
    "fare": 13,
    "lvl": 3,
    "len": "medium",
    "km": 17,
    "stops": 6,
    "coachOnly": false
  },
  {
    "id": "alex_corniche",
    "name": "Raml Station → Montaza",
    "fare": 7,
    "lvl": 4,
    "len": "medium",
    "km": 18,
    "stops": 8,
    "coachOnly": false
  },
  {
    "id": "asher_shorouk",
    "name": "El Hay El Asher → El Shorouk",
    "fare": 18,
    "lvl": 5,
    "len": "medium",
    "km": 30,
    "stops": 5,
    "coachOnly": false
  },
  {
    "id": "asher_capital",
    "name": "El Hay El Asher → New Capital",
    "fare": 34,
    "lvl": 6,
    "len": "long",
    "km": 45,
    "stops": 5,
    "coachOnly": false
  },
  {
    "id": "banha",
    "name": "El Mo’assasa → Banha",
    "fare": 30,
    "lvl": 7,
    "len": "long",
    "km": 48,
    "stops": 5,
    "coachOnly": false
  },
  {
    "id": "cairo_sokhna",
    "name": "Qattameya → Ain Sokhna",
    "fare": 95,
    "lvl": 9,
    "len": "long",
    "km": 120,
    "stops": 4,
    "coachOnly": false
  },
  {
    "id": "cairo_alex",
    "name": "El Mo’assasa → Moharram Bek",
    "fare": 150,
    "lvl": 10,
    "len": "long",
    "km": 220,
    "stops": 6,
    "coachOnly": false
  },
  {
    "id": "bus_tahrir_korba",
    "name": "Abdel Moneim Riad → Korba",
    "fare": 14,
    "lvl": 12,
    "len": "medium",
    "km": 14,
    "stops": 6,
    "coachOnly": false
  },
  {
    "id": "bus_ramses_haram",
    "name": "Ramses → Pyramids",
    "fare": 14,
    "lvl": 12,
    "len": "medium",
    "km": 19,
    "stops": 6,
    "coachOnly": false
  },
  {
    "id": "mini_ramses_october",
    "name": "Ramses → El Hosary (6th Oct.)",
    "fare": 25,
    "lvl": 9,
    "len": "medium",
    "km": 36,
    "stops": 6,
    "coachOnly": false
  },
  {
    "id": "coach_cairo_alex",
    "name": "Cairo Gateway → Sidi Gaber",
    "fare": 260,
    "lvl": 18,
    "len": "long",
    "km": 225,
    "stops": 5,
    "coachOnly": false
  }
];

const VEHICLES = [
  {
    "id": "v_suzuki",
    "name": "Suzuki Every Minivan",
    "price": 95000,
    "lvl": 1,
    "cat": "micro",
    "seats": 7
  },
  {
    "id": "v_foton",
    "name": "Foton Gratour Mini",
    "price": 120000,
    "lvl": 2,
    "cat": "micro",
    "seats": 8
  },
  {
    "id": "v_n300",
    "name": "Chevrolet N300 Van",
    "price": 0,
    "lvl": 1,
    "cat": "micro",
    "seats": 11
  },
  {
    "id": "micro_classic",
    "name": "Toyota HiAce H200",
    "price": 165000,
    "lvl": 5,
    "cat": "micro",
    "seats": 14
  },
  {
    "id": "van_euro",
    "name": "Foton Toano Long",
    "price": 190000,
    "lvl": 4,
    "cat": "micro",
    "seats": 14
  },
  {
    "id": "micro_hr",
    "name": "King Long Kingo Wide",
    "price": 230000,
    "lvl": 6,
    "cat": "micro",
    "seats": 15
  },
  {
    "id": "micro_jumbo",
    "name": "Golden Dragon 6532",
    "price": 280000,
    "lvl": 7,
    "cat": "micro",
    "seats": 16
  },
  {
    "id": "v_shineray",
    "name": "Foton View CS2",
    "price": 420000,
    "lvl": 8,
    "cat": "minibus",
    "seats": 18
  },
  {
    "id": "van_xl",
    "name": "King Long Kingo 6600",
    "price": 450000,
    "lvl": 8,
    "cat": "minibus",
    "seats": 19
  },
  {
    "id": "v_joya6",
    "name": "Joylong Joya 6",
    "price": 480000,
    "lvl": 9,
    "cat": "minibus",
    "seats": 19
  },
  {
    "id": "mini_rosa",
    "name": "Mitsubishi Fuso Rosa",
    "price": 700000,
    "lvl": 10,
    "cat": "minibus",
    "seats": 25
  },
  {
    "id": "coaster",
    "name": "Toyota Coaster B70",
    "price": 640000,
    "lvl": 11,
    "cat": "minibus",
    "seats": 26
  },
  {
    "id": "v_isuzu",
    "name": "Isuzu NPR Bus",
    "price": 720000,
    "lvl": 12,
    "cat": "minibus",
    "seats": 28
  },
  {
    "id": "v_higer",
    "name": "Higer KLQ6728",
    "price": 780000,
    "lvl": 12,
    "cat": "minibus",
    "seats": 29
  },
  {
    "id": "v_yutong77",
    "name": "Yutong ZK6770",
    "price": 850000,
    "lvl": 13,
    "cat": "minibus",
    "seats": 30
  },
  {
    "id": "citybus",
    "name": "King Long XMQ6127",
    "price": 1250000,
    "lvl": 15,
    "cat": "bus",
    "seats": 35
  },
  {
    "id": "v_zk6128",
    "name": "Yutong ZK6128HG",
    "price": 1600000,
    "lvl": 16,
    "cat": "bus",
    "seats": 38
  },
  {
    "id": "coach",
    "name": "Golden Dragon Navigator 6125",
    "price": 2400000,
    "lvl": 19,
    "cat": "bus",
    "seats": 49
  },
  {
    "id": "v_tourismo",
    "name": "Mercedes-Benz Tourismo RHD",
    "price": 3400000,
    "lvl": 22,
    "cat": "bus",
    "seats": 51
  },
  {
    "id": "car_old",
    "name": "Fiat 128 Nasr",
    "price": 55000,
    "lvl": 1,
    "cat": "car",
    "seats": 3
  },
  {
    "id": "hatch_city",
    "name": "Lada 2107 Riva",
    "price": 90000,
    "lvl": 2,
    "cat": "car",
    "seats": 3
  },
  {
    "id": "hatch",
    "name": "Hyundai Verna",
    "price": 140000,
    "lvl": 4,
    "cat": "car",
    "seats": 3
  },
  {
    "id": "sedan_compact",
    "name": "Daewoo Lanos (Nasr)",
    "price": 170000,
    "lvl": 3,
    "cat": "car",
    "seats": 4
  },
  {
    "id": "sedan16",
    "name": "Chevrolet Optra",
    "price": 260000,
    "lvl": 7,
    "cat": "car",
    "seats": 4
  },
  {
    "id": "sedan_mid",
    "name": "Toyota Corolla 1.8",
    "price": 380000,
    "lvl": 9,
    "cat": "car",
    "seats": 4
  }
];

const FUEL = {
  "diesel": {
    "price": 10.25,
    "name": "Diesel"
  },
  "b80": {
    "price": 10.4,
    "name": "Petrol 80"
  },
  "b92": {
    "price": 11.15,
    "name": "Petrol 92"
  },
  "b95": {
    "price": 12,
    "name": "Petrol 95"
  },
  "cng": {
    "price": 6.5,
    "name": "Natural gas"
  }
};

const LICENCES = [
  {
    "id": "private",
    "price": 1800,
    "days": 120
  },
  {
    "id": "pro",
    "price": 5200,
    "days": 90
  }
];

/* XP needed to reach each level (index 0 = level 1 -> 2) */
const XP_CURVE = [
  220,
  644,
  1208,
  1886,
  2666,
  3536,
  4491,
  5523,
  6630,
  7806,
  9049,
  10355,
  11723,
  13150,
  14634,
  16174,
  17767,
  19413,
  21110,
  22857
];

/* fines, in EGP */
const FINES = {
  no_licence:      1500,
  licence_expired:  800,
  wrong_class:     1200,
  over_capacity:    500,
  poor_condition:   400,
  at_fault_crash:   300,   // + 22 per km/h over the limit
  speed_camera:     150,   // + 14 per km/h over the limit
  red_light:        400,
  pedestrian:      3000
};

/* what a completed trip is worth, before fines */
const PAY = {
  perPassenger:      1.00,  // x the route fare, per seat filled
  onTimeBonus:       0.15,  // fraction of base added for punctuality
  fiveStarBonus:     0.10,
  fuelCostPerLitre:  null,  // taken from FUEL below
  maxTipPerPax:      5
};

/* physical limits used to spot impossible reports */
const SANITY = {
  minSecPerKm:      18,     // faster than this is not possible
  maxSecPerKm:     900,     // slower than this is idling, not driving
  maxPassengers:    70,
  maxTripPayout: 120000,
  maxBalanceJumpPerMinute: 60000
};




/* ---------- shared helpers ---------- */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

const json = (code: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status: code,
    headers: { ...CORS, 'content-type': 'application/json' }
  });

/* The service client bypasses Row Level Security. Only these functions
   hold the key, which is why only they can move money. */
const admin = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

/* Identify the caller from their bearer token. Never from the body. */
async function whoIs(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

async function getPlayer(db: any, uid: string) {
  const { data } = await db.from('players').select('*').eq('id', uid).single();
  return data;
}

const isBanned = (p: any) =>
  p?.banned_until && new Date(p.banned_until) > new Date();

const bannedResponse = (p: any) =>
  json(403, { error: 'banned', until: p.banned_until, reason: p.ban_reason || 'irregular activity' });

async function flag(db: any, uid: string, kind: string, detail: unknown, severity = 1) {
  await db.from('flags').insert({ player_id: uid, kind, detail, severity });
}

async function ban(db: any, uid: string, reason: string, hours = 1) {
  const until = new Date(Date.now() + hours * 3600_000).toISOString();
  await db.from('players').update({
    banned_until: until, ban_reason: reason, cash: 0, xp: 0, level: 1
  }).eq('id', uid);
}

/* level follows from XP. The client never states it. */
function levelFor(xp: number) {
  let lvl = 1;
  for (let i = 0; i < XP_CURVE.length; i++) {
    if (xp >= XP_CURVE[i]) lvl = i + 2; else break;
  }
  return Math.min(lvl, XP_CURVE.length + 1);
}


/* ---------- trip ---------- */
/* ============================================================
   POST /functions/v1/trip
   The client reports WHAT HAPPENED. This decides what it was worth.
   No money figure is ever read from the request.
   ============================================================ */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  const user = await whoIs(req);
  if (!user) return json(401, { error: 'sign in required' });

  const db = admin();
  const p = await getPlayer(db, user.id);
  if (!p) return json(404, { error: 'no player row' });
  if (isBanned(p)) return bannedResponse(p);

  let r: any;
  try { r = await req.json(); } catch { return json(400, { error: 'bad body' }); }

  /* the only things we accept from the device */
  const routeId    = String(r.routeId || '');
  const vehicleId  = String(r.vehicleId || '');
  const durationS  = Math.max(0, Math.round(+r.durationS || 0));
  const passengers = Math.max(0, Math.round(+r.passengers || 0));
  const onTime     = !!r.onTime;
  const rating     = Math.max(0, Math.min(5, +r.rating || 0));
  const fineKeys   = Array.isArray(r.fines) ? r.fines.slice(0, 20) : [];
  const overBy     = Math.max(0, Math.round(+r.overBy || 0));
  const litres     = Math.max(0, +r.litresUsed || 0);
  /* r.cash, r.xp and r.level are ignored entirely if present */

  const route = ROUTES.find((x: any) => x.id === routeId);
  if (!route) return json(400, { error: 'unknown route' });

  const veh = VEHICLES.find((v: any) => v.id === vehicleId);
  const { data: owned } = await db.from('player_vehicles')
    .select('*').eq('player_id', p.id).eq('vehicle_id', vehicleId).maybeSingle();

  if (!veh || !owned) {
    await flag(db, p.id, 'trip_with_unowned_vehicle', { routeId, vehicleId }, 3);
    const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await db.from('players').update({ banned_until: until,
      ban_reason: 'claimed a trip in a vehicle that is not owned' }).eq('id', p.id);
    return json(403, { error: 'banned',
      reason: 'claimed a trip in a vehicle that is not owned', until });
  }

  /* ---- could this trip physically have happened? ----
     Measure against the distance actually driven, not the whole route: a
     player who abandons a 450 km run after two minutes has done nothing
     wrong, and judging them against the full length brands them a cheat. */
  const routeKm = route.km || 1;
  const drivenKm = Math.max(0, Math.min(routeKm, +r.distanceKm || 0)) || routeKm;
  const km = drivenKm;
  const secPerKm = durationS / Math.max(0.5, drivenKm);
  const reject: string[] = [];
  /* only judge speed on a trip long enough for the figure to mean anything */
  if (drivenKm >= 3 && secPerKm < SANITY.minSecPerKm) reject.push('impossible_speed');
  if (durationS <= 0)                 reject.push('zero_duration');
  if (passengers > Math.min(SANITY.maxPassengers, veh.seats * (route.stops || 1)))
                                      reject.push('too_many_passengers');
  if (route.lvl > p.level)            reject.push('route_locked');
  if (route.coachOnly && veh.cat !== 'bus') reject.push('wrong_vehicle_class');

  if (reject.length) {
    await db.from('trips').insert({
      player_id: p.id, route_id: routeId, vehicle_id: vehicleId,
      started_at: new Date(Date.now() - durationS * 1000).toISOString(),
      duration_s: durationS, passengers, distance_km: km,
      accepted: false, reject_note: reject.join(',')
    });
    await flag(db, p.id, reject[0], { routeId, durationS, passengers, secPerKm, drivenKm }, 2);
    if (reject.includes('impossible_speed')) {
      /* One odd trip is not proof of anything - a dropped connection or a
         quick restart can produce it. Ban only on a repeated pattern. */
      /* Timing alone is a rejection, not a ban - a dropped connection or a
         quick restart can produce an odd figure. Only something physically
         absurd, repeated, is treated as manipulation. */
      if (secPerKm < 4 && drivenKm > 20) {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count } = await db.from('flags')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', p.id).eq('kind', 'impossible_speed').gte('created_at', since);
        if ((count || 0) >= 3) {
          const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
          await db.from('players').update({ banned_until: until,
            ban_reason: 'repeated trips faster than physically possible' }).eq('id', p.id);
          return json(403, { error: 'banned',
            reason: 'repeated trips faster than physically possible', until });
        }
      }
      return json(422, { error: 'trip rejected', why: reject });
    }
    return json(422, { error: 'trip rejected', why: reject });
  }

  /* ---- the payout, computed here and nowhere else ---- */
  const base  = Math.round(route.fare * passengers * PAY.perPassenger);
  const bonus = Math.round(base * ((onTime ? PAY.onTimeBonus : 0) +
                                   (rating >= 4.8 ? PAY.fiveStarBonus : 0)));
  const tips  = Math.round(Math.min(passengers * PAY.maxTipPerPax, base * 0.12 * (rating / 5)));

  let fines = 0;
  for (const k of fineKeys) {
    const f0 = (FINES as any)[k];
    if (!f0) continue;
    let f = f0;
    if (k === 'at_fault_crash') f += overBy * 22;
    if (k === 'speed_camera')   f += overBy * 14;
    fines += f;
  }

  const fuelKey  = (FUEL as any)[veh.fuel] ? veh.fuel : 'b92';
  const fuelCost = Math.round(litres * ((FUEL as any)[fuelKey]?.price ?? 11.15));
  const net      = base + bonus + tips - fines - fuelCost;

  if (base + bonus + tips > SANITY.maxTripPayout) {
    await flag(db, p.id, 'payout_too_high', { base, bonus, tips, routeId }, 3);
    const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await db.from('players').update({ banned_until: until,
      ban_reason: 'reported a payout above the maximum possible' }).eq('id', p.id);
    return json(403, { error: 'banned',
      reason: 'reported a payout above the maximum possible', until });
  }

  const xpGain  = Math.round(km * 1.5 + passengers * 4 + (onTime ? 25 : 0));
  const newXp   = Number(p.xp) + xpGain;
  const newLvl  = levelFor(newXp);
  const newCash = Math.max(0, Number(p.cash) + net);

  await db.from('trips').insert({
    player_id: p.id, route_id: routeId, vehicle_id: vehicleId,
    started_at: new Date(Date.now() - durationS * 1000).toISOString(),
    duration_s: durationS, passengers, distance_km: km,
    fare_earned: base + bonus, tips, fines, fuel_cost: fuelCost,
    net, xp_gained: xpGain
  });

  await db.from('players').update({
    cash: newCash, xp: newXp, level: newLvl,
    total_trips: p.total_trips + 1,
    total_pax:   p.total_pax + passengers,
    total_km:    Number(p.total_km) + km,
    total_fines: Number(p.total_fines) + fines,
    reputation:  Math.max(1, Math.min(5, Number(p.reputation) * 0.9 + (rating || 4.5) * 0.1)),
    last_seen:   new Date().toISOString()
  }).eq('id', p.id);

  if (litres > 0) {
    await db.from('player_vehicles')
      .update({ fuel: Math.max(0, Number(owned.fuel) - litres) })
      .eq('player_id', p.id).eq('vehicle_id', vehicleId);
  }

  return json(200, {
    ok: true,
    breakdown: { base, bonus, tips, fines, fuelCost, net, xpGain },
    player: { cash: newCash, xp: newXp, level: newLvl }
  });
});