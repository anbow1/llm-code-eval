"""
Engineering task set (run with --suite engineering): two Three.js tasks that test physics and mechanics,
not only how a picture looks.

e1_watch_unitas   a hand-wound wristwatch movement (ETA/Unitas 6497-1) in an exploded view: the balance, the
                  escapement and the gear train must have the right frequency and ratios.
e2_rocket_launch  a launch from Cape Canaveral: the ascent follows a simple physics model (thrust-to-weight,
                  burn, gravity turn), the plume and the trail are visible, and above the Karman line (100 km)
                  the sky is dark with stars.

The checks read the simulation through window hooks (__watch, __rocket), so they test the numbers. The pictures
are checked only for the few things a number cannot show (a plume, a dark sky with stars).
Uses the same system prompt as tasks.py.
"""
import io

from tasks import PY_SYSTEM, THREE_SYSTEM  # noqa: F401  (re-exported)

VIEWPORT = (1280, 720)
TWO_PI = 6.283185307179586
PI = 3.141592653589793


def _mod_dist(a, b):
    """Distance between two angles (radians), taking the wrap at 2*pi into account."""
    d = (a - b) % TWO_PI
    return min(d, TWO_PI - d)


# ---------------------------------------------------------------- e1: watch
WATCH_JS = r"""
() => {
  const w = window.__watch;
  if (!w || typeof w.step !== 'function' || typeof w.state !== 'function' || typeof w.reset !== 'function'
      || typeof w.explode !== 'function' || !Array.isArray(w.parts)) return null;
  const was = w.paused; w.paused = true;
  const out = {};
  // balance: 20 s at 240 steps per second (fine steps: the frequency is measured from the sign changes)
  w.reset();
  const bal = [];
  for (let i = 0; i <= 20 * 240; i++) { bal.push(w.state().balance); w.step(1 / 240); }
  out.bal = bal;
  // escape wheel: one second in 1/120 s steps
  w.reset();
  const esc = [];
  for (let i = 0; i <= 120; i++) { esc.push(w.state().escape); w.step(1 / 120); }
  out.esc = esc;
  // seconds / minute / hour hands: large steps, the hands must follow the time exactly
  w.reset(); w.step(30); out.s30 = w.state().second;
  w.reset(); w.step(60); out.s60 = w.state().second;
  w.reset(); w.step(900); out.m900 = w.state().minute;
  w.reset(); w.step(3600); const s3600 = w.state(); out.m3600 = s3600.minute; out.h3600 = s3600.hour;
  w.reset();
  // parts and the exploded view
  const parts = w.parts;
  out.nparts = parts.length;
  out.names = parts.map(p => (p && p.name) || '');
  out.jewels = parts.filter(p => /^jewel_\d+$/.test((p && p.name) || '')).length;
  w.explode(0); const p0 = parts.map(p => [p.position.x, p.position.y, p.position.z]);
  w.explode(1); const p1 = parts.map(p => [p.position.x, p.position.y, p.position.z]);
  out.disp = p0.map((a, i) => Math.hypot(p1[i][0] - a[0], p1[i][1] - a[1], p1[i][2] - a[2]));
  w.paused = was;
  return out;
}
"""


def _zero_crossings(xs):
    return sum(1 for a, b in zip(xs, xs[1:]) if a * b < 0)


def _bright_share(png, box=(0.2, 0.15, 0.8, 0.85), level=70):
    """Share of pixels brighter than `level` (0-255) in the middle of the picture: are the parts lit and visible."""
    img = _png_pixels(png).convert("L")
    w, h = img.size
    crop = img.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))).resize((160, 100))
    data = list(crop.getdata())
    return sum(v > level for v in data) / len(data)


def check_watch(ctx):
    res = {}
    f = ctx.eval(WATCH_JS)
    if not f:
        for k in ("watch_api", "balance_2_5_hz", "balance_amplitude", "balance_steady", "escape_ticks",
                  "seconds_hand", "minute_hand", "hour_ratio", "parts_40_unique", "jewels_17", "explode_separates"):
            res[k] = False
        return res
    res["watch_api"] = True
    bal = f["bal"]
    # 2.5 Hz (18 000 vibrations per hour): two sign changes per period, 20 s of simulated time
    freq = _zero_crossings(bal) / (2 * 20.0)
    res["balance_2_5_hz"] = abs(freq - 2.5) / 2.5 <= 0.02
    amp = max(abs(x) for x in bal)
    res["balance_amplitude"] = PI <= amp <= 2 * PI  # 180 to 360 degrees; a real balance swings about 200-300
    first = max(abs(x) for x in bal[:481])      # first 2 s
    last = max(abs(x) for x in bal[-481:])      # last 2 s
    res["balance_steady"] = abs(first - last) <= 0.1 * first  # no decay in an ideal movement
    esc = f["esc"]
    step = TWO_PI / 15
    multiples = all(abs(e / step - round(e / step)) < 0.01 for e in esc)
    res["escape_ticks"] = abs((esc[-1] - esc[0]) - 5 * step) < 0.02 and multiples  # 5 ticks per second, 1 tooth each
    res["seconds_hand"] = _mod_dist(f["s30"], PI) <= 0.03 and _mod_dist(f["s60"], 0.0) <= 0.03
    res["minute_hand"] = _mod_dist(f["m900"], PI / 2) <= 0.02 and _mod_dist(f["m3600"], 0.0) <= 0.02
    res["hour_ratio"] = _mod_dist(f["h3600"], PI / 6) <= 0.01  # 12 hours per turn: 1/12 of the minute hand
    names = f["names"]
    res["parts_40_unique"] = f["nparts"] >= 40 and all(names) and len(set(names)) == len(names)
    res["jewels_17"] = f["jewels"] >= 17
    disp = f["disp"]
    res["explode_separates"] = sum(d >= 0.5 for d in disp) >= 0.8 * max(1, len(disp))
    # the picture: the exploded parts are lit and visible, not dark shapes on a dark background
    res["parts_visible"] = _bright_share(ctx.shot) >= 0.04
    return res


# ---------------------------------------------------------------- e2: rocket
ROCKET_JS = r"""
() => {
  const r = window.__rocket;
  if (!r || typeof r.step !== 'function' || typeof r.state !== 'function' || typeof r.reset !== 'function'
      || !Array.isArray(r.trail)) return null;
  const was = r.paused; r.paused = true;
  const out = {};
  r.reset(); r.step(0.1); out.acc01 = r.state().acc;
  r.reset(); out.pitch0 = r.state().pitch;
  r.reset();
  const S = [r.state()];
  for (let i = 0; i < 1200; i++) { r.step(0.25); S.push(r.state()); }   // 300 s
  out.S = S.map(s => ({ t: s.t, alt: s.alt, pitch: s.pitch, acc: s.acc }));
  out.trailLen = r.trail.length;
  r.reset();
  r.paused = was;
  return out;
}
"""

PLUME_JS = r"""
async () => {
  const r = window.__rocket;
  r.paused = true; r.reset(); r.step(2);
  await new Promise(res => setTimeout(res, 400));
  return true;
}
"""

KARMAN_JS = r"""
async () => {
  const r = window.__rocket;
  r.paused = true; r.reset();
  let n = 0;
  while (r.state().alt < 100000 && n < 2000) { r.step(0.5); n++; }
  await new Promise(res => setTimeout(res, 400));
  return r.state();
}
"""


def _png_pixels(png):
    from PIL import Image
    return Image.open(io.BytesIO(png)).convert("RGB")


def _flame_count(png):
    img = _png_pixels(png)
    w, h = img.size
    small = img.resize((w // 2, h // 2))
    px = small.load()
    n = 0
    for y in range(small.size[1]):
        for x in range(small.size[0]):
            r, g, b = px[x, y]
            if r > 200 and b < 140 and r - b > 90:  # bright and warm: an orange or yellow flame, not smoke or sky
                n += 1
    return n


def _sky_metrics(png):
    """Mean luminance of the top quarter (dark sky above 100 km) and bright star-like pixels in the top half."""
    from PIL import Image
    img = _png_pixels(png).convert("L")
    w, h = img.size
    top = img.crop((0, 0, w, h // 4))
    mean_top = sum(top.getdata()) / (w * (h // 4))
    half = img.crop((0, 0, w, h // 2)).load()
    stars = 0
    for y in range(h // 2):
        for x in range(w):
            if half[x, y] > 200:
                stars += 1
    return mean_top, stars


def check_rocket(ctx):
    res = {}
    f = ctx.eval(ROCKET_JS)
    if not f:
        for k in ("rocket_api", "liftoff_thrust_to_weight", "vertical_start", "gravity_turn",
                  "mass_burn_acc_grows", "karman_line_reached", "trail_visible", "plume_at_liftoff",
                  "karman_dark_sky_with_stars"):
            res[k] = False
        return res
    res["rocket_api"] = True
    S = f["S"]
    g0 = 9.81
    acc01 = f["acc01"]
    res["liftoff_thrust_to_weight"] = 0.1 * g0 <= acc01 <= 0.6 * g0  # net 0.1-0.6 g = thrust-to-weight 1.1-1.6
    res["vertical_start"] = abs(f["pitch0"]) <= 0.05
    after = [s["pitch"] for s in S if s["t"] >= 10.0]
    monotone = all(b >= a - 1e-9 for a, b in zip(after, after[1:]))
    p150 = next((s["pitch"] for s in S if abs(s["t"] - 150.0) < 1e-6), None)
    res["gravity_turn"] = monotone and p150 is not None and 0.3 <= p150 <= 1.5708
    acc20 = next((s["acc"] for s in S if abs(s["t"] - 20.0) < 1e-6), None)
    acc150 = next((s["acc"] for s in S if abs(s["t"] - 150.0) < 1e-6), None)
    res["mass_burn_acc_grows"] = bool(acc20) and acc150 is not None and acc150 > 1.5 * acc20
    kar = next((s for s in S if s["alt"] >= 100000.0), None)
    alts = [s["alt"] for s in S if kar is None or s["t"] <= kar["t"]]
    res["karman_line_reached"] = kar is not None and all(b >= a - 1e-6 for a, b in zip(alts, alts[1:]))
    res["trail_visible"] = f["trailLen"] >= 50

    # pictures: the plume at the first seconds, the sky above the Karman line
    try:
        ctx.page.evaluate(PLUME_JS)
        png = ctx.page.screenshot()
        (ctx.workdir / "plume_t2.png").write_bytes(png)
        res["plume_at_liftoff"] = _flame_count(png) >= 40
    except Exception:
        res["plume_at_liftoff"] = False
    try:
        ctx.page.evaluate(KARMAN_JS)
        png = ctx.page.screenshot()
        (ctx.workdir / "karman.png").write_bytes(png)
        mean_top, stars = _sky_metrics(png)
        res["karman_dark_sky_with_stars"] = mean_top < 40 and stars >= 8
    except Exception:
        res["karman_dark_sky_with_stars"] = False
    ctx.eval("() => { if (window.__rocket) window.__rocket.paused = false; }")
    return res


THREE_TASKS = [
    {
        "id": "e1_watch_unitas",
        "viewport": VIEWPORT,
        "standalone": True,
        "prompt": """Build a working model of a hand-wound mechanical wristwatch movement: the ETA/Unitas 6497-1
(17 jewels, 18 000 vibrations per hour = 2.5 Hz, hand-wound, Swiss lever escapement with a 15-tooth escape wheel).
The movement is shown in an EXPLODED view: every part floats apart, so the parts can be seen and named.
Units: 1 unit = 1 mm. The model must be physically consistent: the frequencies and gear ratios below are the
measurable part of the task.

Parts (window.__watch.parts: an array of THREE.Object3D, each with a unique non-empty name)
- At least 40 separate meshes, with unique names: mainspring_barrel, mainspring, arbor, center_wheel, third_wheel,
  fourth_wheel, escape_wheel (15 teeth), pallet_fork, balance_wheel, hairspring, balance_cock, stud, crown, stem,
  setting_lever, click, ratchet_wheel, cannon_pinion, hour_wheel, minute_wheel, the 17 jewels named jewel_1 ... jewel_17,
  the main plate and the bridges, and the screws.
- Simple geometry (cylinders, boxes, tori) is fine, but the parts must be in roughly the right places relative to each other.
- Metal parts in brass or steel, the jewels in red.

Timing (window.__watch, the simulated clock)
- reset(): sets the time t to 0 and the angles to their starting values.
- step(dt): advances the simulated time t by dt seconds (for any dt, including large ones).
- state(): returns { t, balance, escape, second, minute, hour } in radians, computed from t with exact formulas:
    balance(t) = 1.2*PI * cos(2*PI*2.5*t)            (balance wheel angle; amplitude 216 degrees)
    escape(t)  = floor(5*t) * 2*PI/15                (escape wheel: one tooth per tick, 5 ticks per second)
    second(t)  = 2*PI * t / 60                       (seconds hand: one turn per 60 s)
    minute(t)  = 2*PI * t / 3600                     (minute hand: one turn per hour)
    hour(t)    = 2*PI * t / 43200                    (hour hand: one turn per 12 h)
- paused (boolean): when true, the render loop must not call step(); it keeps rendering.
- explode(f): f in [0, 1]. 0 = assembled (every part at its place in the movement), 1 = exploded (every part moved away
  from the centre, along its own direction, clearly separated). The movement starts exploded (f = 1).
- The render loop calls step(min(delta, 1/30)) when not paused, so the movement runs in real time. Rotate the balance,
  the escape wheel and the gears with the angles from state() so the picture matches the simulation.

Scene
- Dark background, a warm key light and a soft fill, shadows. The camera frames the movement from above and in front,
  so the exploded parts and their names are visible. Add a text label near each part (canvas texture or DOM is fine).
- No external assets (no textures, models or fonts from the network).

Reply with a single ```ts code block and nothing else.""",
        "check": check_watch,
    },
    {
        "id": "e2_rocket_launch",
        "viewport": VIEWPORT,
        "standalone": True,
        "prompt": """Build a launch scene: a Falcon-9-like rocket (about 70 m tall, 3.7 m diameter, mass 550 000 kg at
liftoff) on a launch pad at Cape Canaveral (a concrete pad with a launch tower), and its ascent to space.
Units: 1 unit = 1 m. The ascent must follow a physics model, not an animation.

Physics (window.__rocket, the simulated flight)
- Constants: g0 = 9.81 m/s^2, Earth radius R = 6 371 000 m, liftoff mass m0 = 550 000 kg, dry mass 220 000 kg.
- Thrust: T = 1.3 * m0 * g0 (thrust-to-weight 1.3 at liftoff), limited to 3 * m * g0 (throttle) and zero after the burn.
- Burn: 200 s. The mass falls linearly from m0 to the dry mass during the burn.
- Gravity: g(h) = g0 * (R / (R + h))^2, where h is the altitude.
- Pitch = the angle of the thrust from vertical (0 = straight up). Pitch is 0 at liftoff; after 10 s it starts to grow
  (a gravity turn), reaching about 0.5 rad at 150 s, and it never decreases.
- Equations of motion: vertical and horizontal acceleration from the thrust component and gravity; integrate with a
  fixed substep of at most 0.02 s; the rocket cannot go below the pad.
- window.__rocket = {
    reset(): time 0, the rocket on the pad, trail emptied (keep the same array object),
    step(dt): advances the simulated time by dt seconds (any dt; use substeps inside),
    state(): { t, alt (m), vel (m/s), acc (net vertical acceleration, m/s^2), pitch (rad) },
    trail: array of {x, y, z} world points of the rocket, one per step() call,
    paused: boolean (when true, the render loop does not call step()),
  }
- The render loop calls step(min(delta, 1/30)) when not paused.

Pictures
- Liftoff: an orange-white exhaust plume under the engines from the first frame, and steam and smoke clouds spreading
  at the pad.
- Trail: a visible white contrail line behind the rocket, drawn from the trail points.
- Sky: from blue at the ground to black at 100 km (the Karman line). Stars must appear above about 70 km and be clearly
  visible above 100 km. Drive the sky from the rocket's altitude.
- Camera: from the ground at the start, then following the rocket upward.
- No external assets.

Reply with a single ```ts code block and nothing else.""",
        "check": check_rocket,
    },
]

PY_TASKS = []
