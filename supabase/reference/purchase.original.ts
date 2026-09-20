/* ============================================================
   Ogra — Edge Function: purchase
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





/* ---------- rewards the server grants, never the client ---------- */
const MISSION_REWARD: Record<string, number> = {
  "pax": 350,
  "trips": 400,
  "km": 300,
  "smooth": 450,
  "rides": 400,
  "noFine": 350,
  "five": 380,
  "night": 300,
  "repair": 150,
  "long": 600
};
const WHEEL: number[] = [150, 250, 500, 100, 1000, 200, 350, 2500];
const SPIN_COST = 500;
const DAILY_REWARD = 500;
const PAINT_COST = 800;

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


/* ---------- purchase ---------- */
/* POST /functions/v1/purchase — the server debits, or refuses. */

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

  const kind = String(r.kind || '');
  let cost = 0;
  let apply: (() => Promise<void>) | null = null;

  if (kind === 'vehicle') {
    const v = VEHICLES.find((x: any) => x.id === r.id);
    if (!v) return json(400, { error: 'unknown vehicle' });
    if (v.lvl > p.level) return json(403, { error: 'level too low' });
    const { data: have } = await db.from('player_vehicles')
      .select('vehicle_id').eq('player_id', p.id).eq('vehicle_id', v.id).maybeSingle();
    if (have) return json(409, { error: 'already owned' });
    cost = v.price;
    apply = async () => {
      await db.from('player_vehicles').insert({ player_id: p.id, vehicle_id: v.id, fuel: 15 });
    };

  } else if (kind === 'fuel') {
    const litres = Math.max(0, Math.min(400, +r.litres || 0));
    const veh = VEHICLES.find((x: any) => x.id === r.vehicleId);
    if (!veh) return json(400, { error: 'unknown vehicle' });
    const { data: owned } = await db.from('player_vehicles')
      .select('*').eq('player_id', p.id).eq('vehicle_id', veh.id).maybeSingle();
    if (!owned) return json(403, { error: 'not owned' });
    const f = (FUEL as any)[veh.fuel] || (FUEL as any).b92;
    cost = Math.round(litres * f.price);
    apply = async () => {
      await db.from('player_vehicles')
        .update({ fuel: Number(owned.fuel) + litres })
        .eq('player_id', p.id).eq('vehicle_id', veh.id);
    };

  } else if (kind === 'licence') {
    const l = LICENCES.find((x: any) => x.id === r.id);
    if (!l) return json(400, { error: 'unknown licence' });
    cost = l.price;
    apply = async () => {
      const exp = new Date(Date.now() + l.days * 86400_000).toISOString().slice(0, 10);
      await db.from('players')
        .update({ licence_class: l.id, licence_exp: exp, licence_pts: 0 })
        .eq('id', p.id);
    };

  } else if (kind === 'repair') {
    const wear = Math.max(0, Math.min(100, +r.wear || 0));
    cost = Math.round(80 + wear * 26);
    const vid = String(r.vehicleId || '');
    const part = String(r.part || 'body');
    apply = async () => {
      const { data: own } = await db.from('player_vehicles')
        .select('condition').eq('player_id', p.id).eq('vehicle_id', vid).maybeSingle();
      const cond = { ...(own?.condition || {}), [part]: 100 };
      await db.from('player_vehicles').update({ condition: cond })
        .eq('player_id', p.id).eq('vehicle_id', vid);
    };

  } else if (kind === 'paint') {
    cost = PAINT_COST;
    const vid = String(r.vehicleId || '');
    apply = async () => {
      const { data: own } = await db.from('player_vehicles')
        .select('cosmetics').eq('player_id', p.id).eq('vehicle_id', vid).maybeSingle();
      const cos = { ...(own?.cosmetics || {}), paint: String(r.paint || ''),
                    paint2: r.paint2 || null, stripe: r.stripe || 'none' };
      await db.from('player_vehicles').update({ cosmetics: cos })
        .eq('player_id', p.id).eq('vehicle_id', vid);
    };

  } else if (kind === 'upgrade') {
    const tier = Math.max(1, Math.min(5, +r.tier || 1));
    cost = Math.round(1200 * Math.pow(1.85, tier - 1));
    const vid = String(r.vehicleId || ''), part = String(r.part || '');
    apply = async () => {
      const { data: own } = await db.from('player_vehicles')
        .select('upgrades').eq('player_id', p.id).eq('vehicle_id', vid).maybeSingle();
      const up = { ...(own?.upgrades || {}), [part]: tier };
      await db.from('player_vehicles').update({ upgrades: up })
        .eq('player_id', p.id).eq('vehicle_id', vid);
    };

  } else if (kind === 'claimMission') {
    const mid = String(r.missionId || '');
    const reward = MISSION_REWARD[mid];
    if (reward == null) return json(400, { error: 'unknown mission' });
    const key = 'mission:' + mid + ':' + new Date().toISOString().slice(0, 10);
    const { data: already } = await db.from('flags')
      .select('id').eq('player_id', p.id).eq('kind', key).maybeSingle();
    if (already) return json(409, { error: 'already claimed' });
    cost = -reward;
    apply = async () => {
      await db.from('flags').insert({ player_id: p.id, kind: key,
        detail: { reward }, severity: 0, reviewed: true });
    };

  } else if (kind === 'spin') {
    if (Number(p.cash) < SPIN_COST) return json(402, { error: 'insufficient funds' });
    const idx = Math.floor(Math.random() * WHEEL.length);
    const won = WHEEL[idx];
    const after = Number(p.cash) - SPIN_COST + won;
    await db.from('players').update({ cash: after, last_seen: new Date().toISOString() })
      .eq('id', p.id);
    return json(200, { ok: true, spin: { index: idx, won }, cash: after });

  } else if (kind === 'daily') {
    const key = 'daily:' + new Date().toISOString().slice(0, 10);
    const { data: already } = await db.from('flags')
      .select('id').eq('player_id', p.id).eq('kind', key).maybeSingle();
    if (already) return json(409, { error: 'already claimed today' });
    cost = -DAILY_REWARD;
    apply = async () => {
      await db.from('flags').insert({ player_id: p.id, kind: key,
        detail: { reward: DAILY_REWARD }, severity: 0, reviewed: true });
    };

  } else if (kind === 'garage') {
    /* The workshop stages several changes at once - upgrades, paint, rims,
       stickers - and commits them together. The client sends the resulting
       state; the server prices it from its own tables and ignores whatever
       total the client thinks it should be. */
    const vid = String(r.vehicleId || '');
    const { data: own } = await db.from('player_vehicles')
      .select('upgrades, cosmetics').eq('player_id', p.id).eq('vehicle_id', vid).maybeSingle();
    if (!own) return json(403, { error: 'not owned' });

    const haveUp  = (own.upgrades  || {}) as Record<string, number>;
    const haveCos = (own.cosmetics || {}) as Record<string, unknown>;
    const wantUp  = (r.upgrades    || {}) as Record<string, number>;
    const wantCos = (r.cosmetics   || {}) as Record<string, unknown>;

    let total = 0;
    /* each tier costs more than the last; charge only for tiers gained */
    for (const part of Object.keys(wantUp)) {
      const from = Math.max(0, Math.min(5, +haveUp[part] || 0));
      const to   = Math.max(0, Math.min(5, +wantUp[part] || 0));
      if (to <= from) continue;
      for (let tier = from + 1; tier <= to; tier++)
        total += Math.round(1200 * Math.pow(1.85, tier - 1));
    }
    /* cosmetics: a flat charge per field that actually changed */
    const COS_PRICE: Record<string, number> = {
      paint: 800, paint2: 400, stripe: 300, stripeCol: 0,
      rimT: 600, rimC: 200, tint: 350, horn: 450
    };
    for (const key of Object.keys(wantCos)) {
      const price = COS_PRICE[key];
      if (price == null) continue;
      if (JSON.stringify(haveCos[key] ?? null) !== JSON.stringify(wantCos[key] ?? null))
        total += price;
    }
    if (Array.isArray(r.stickers)) total += Math.min(12, r.stickers.length) * 150;

    if (total > 500000) return json(422, { error: 'garage total out of range' });
    cost = total;
    apply = async () => {
      /* upsert, not update: an update that matches no row succeeds silently
         and saves nothing, which charged the player again on every attempt */
      const { error } = await db.from('player_vehicles').upsert({
        player_id: p.id,
        vehicle_id: vid,
        upgrades:  { ...haveUp,  ...wantUp },
        cosmetics: { ...haveCos, ...wantCos }
      }, { onConflict: 'player_id,vehicle_id' });
      if (error) throw new Error('garage save failed: ' + error.message);
    };

  } else {
    return json(400, { error: 'unknown purchase kind' });
  }

  if (cost > 0 && Number(p.cash) < cost)
    return json(402, { error: 'insufficient funds', cost, cash: Number(p.cash) });

  try { await apply!(); }
  catch (e) {
    /* never take the money if the thing being bought could not be saved */
    return json(500, { error: 'could not save purchase', detail: String(e && (e as Error).message || e) });
  }
  const after = Number(p.cash) - cost;
  await db.from('players').update({ cash: after, last_seen: new Date().toISOString() }).eq('id', p.id);

  let stored: unknown = null;
  if (kind === 'garage' || kind === 'upgrade' || kind === 'paint' || kind === 'repair') {
    const { data } = await db.from('player_vehicles')
      .select('upgrades, cosmetics').eq('player_id', p.id)
      .eq('vehicle_id', String(r.vehicleId || '')).maybeSingle();
    stored = data || null;
  }
  return json(200, { ok: true, spent: cost, cash: after, stored });
});