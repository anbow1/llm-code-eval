"""
Engineering task set (run with --suite engineering): two Three.js tasks that test physics and mechanics,
not only how a picture looks.

e1_watch_unitas   a hand-wound wristwatch movement (ETA/Unitas 6497-1) that works as a mechanism: toothed wheels
                  that mesh at the right centre distances and ratios, a pallet fork that flips as the balance
                  passes its centre, an escape wheel that advances only then, and an exploded view.
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
  const bal = [], pal = [], esc2 = [];
  for (let i = 0; i <= 20 * 240; i++) {
    const s = w.state(); bal.push(s.balance); pal.push(s.pallet); esc2.push(s.escape); w.step(1 / 240);
  }
  out.bal = bal; out.pal = pal; out.esc2 = esc2;
  // the going train: every wheel moves with the others (sampled at uneven times)
  out.kin = [];
  for (const T of [0.37, 7.31, 61.93, 1234.57]) {
    w.reset(); w.step(T); const s = w.state();
    out.kin.push({ center: s.center, third: s.third, fourth: s.fourth, escape: s.escape, barrel: s.barrel,
                   second: s.second, minute: s.minute });
  }
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
  // wheel data and assembled world positions (x, z) of the train wheels
  out.train = {};
  for (const n of ['mainspring_barrel', 'center_wheel', 'third_wheel', 'fourth_wheel', 'escape_wheel']) {
    const p = parts.find(q => q && q.name === n);
    if (!p) continue;
    p.updateWorldMatrix(true, false);
    const e = p.matrixWorld.elements, u = p.userData || {};
    out.train[n] = { x: e[12], z: e[14], teeth: u.teeth, pinion: u.pinion, radius: u.radius,
                     pinionRadius: u.pinionRadius };
  }
  w.explode(1); const p1 = parts.map(p => [p.position.x, p.position.y, p.position.z]);
  out.disp = p0.map((a, i) => Math.hypot(p1[i][0] - a[0], p1[i][1] - a[1], p1[i][2] - a[2]));
  w.explode(0);
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


TRAIN = ["mainspring_barrel", "center_wheel", "third_wheel", "fourth_wheel", "escape_wheel"]


def _num(x):
    return isinstance(x, (int, float)) and x == x


def _train_checks(f, res):
    tr = f.get("train") or {}
    ok = all(n in tr for n in TRAIN)
    w = {n: tr.get(n, {}) for n in TRAIN}
    try:
        ratio_cf = (w["center_wheel"]["teeth"] / w["third_wheel"]["pinion"]) * \
                   (w["third_wheel"]["teeth"] / w["fourth_wheel"]["pinion"])
        ratio_fe = w["fourth_wheel"]["teeth"] / w["escape_wheel"]["pinion"]
        ratio_bc = w["mainspring_barrel"]["teeth"] / w["center_wheel"]["pinion"]
        res["train_ratios"] = ok and abs(ratio_cf - 60) <= 0.6 and abs(ratio_fe - 10) <= 0.1 \
            and w["escape_wheel"]["teeth"] == 15 and 4 <= ratio_bc <= 10
    except Exception:
        res["train_ratios"] = False
    # meshing: the centre distance of each driving wheel and the next pinion = the sum of their pitch radii
    try:
        mesh = True
        for a, b in zip(TRAIN, TRAIN[1:]):
            A, B = w[a], w[b]
            want = A["radius"] + B["pinionRadius"]
            got = ((A["x"] - B["x"]) ** 2 + (A["z"] - B["z"]) ** 2) ** 0.5
            mesh = mesh and _num(want) and want > 0 and abs(got - want) <= 0.15 * want
        res["gears_mesh"] = ok and mesh
    except Exception:
        res["gears_mesh"] = False
    # kinematics: the train turns together, meshing wheels in opposite directions, the hands on their wheels
    try:
        kin = f["kin"]
        good = True
        for k in kin[1:]:
            c, t3, f4, e = k["center"], k["third"], k["fourth"], k["escape"]
            good = good and abs(f4 - 60 * c) <= 0.02 * abs(60 * c) + 0.03          # fourth = 60 x centre (unwrapped)
            good = good and abs(e + 10 * f4) <= 0.02 * abs(10 * f4) + 0.25          # escape = -10 x fourth
            r3 = w["center_wheel"]["teeth"] / w["third_wheel"]["pinion"]
            good = good and abs(t3 + r3 * c) <= 0.02 * abs(r3 * c) + 0.03           # third = -ratio x centre
            rb = w["mainspring_barrel"]["teeth"] / w["center_wheel"]["pinion"]
            good = good and abs(k["barrel"] + c / rb) <= 0.02 * abs(c / rb) + 0.01  # barrel = -centre / ratio
            good = good and _mod_dist(k["second"], f4) <= 0.03 and _mod_dist(k["minute"], c) <= 0.02
        res["train_kinematics"] = good
    except Exception:
        res["train_kinematics"] = False
    # escapement: the fork flips 5 times a second, each time the balance passes its centre, and only then
    # does the escape wheel advance
    try:
        bal, pal, esc = f["bal"], f["pal"], f["esc2"]
        dt = 1 / 240
        flips = [i for i in range(1, len(pal)) if pal[i] * pal[i - 1] < 0]
        zeros = [i for i in range(1, len(bal)) if bal[i] * bal[i - 1] <= 0 and bal[i] != bal[i - 1]]
        moves = [i for i in range(1, len(esc)) if abs(esc[i] - esc[i - 1]) > 1e-9]
        rate = len(flips) / 20.0
        inner = [i for i in flips if 8 <= i <= len(bal) - 9]   # a flip at the very end has its zero outside
        near = all(min(abs(i - z) for z in zeros) * dt <= 0.03 for i in inner) if inner and zeros else False
        amp = max(abs(x) for x in pal) if pal else 0
        res["pallet_sync"] = abs(rate - 5) <= 0.1 and near and 0.05 <= amp <= 0.5
        res["escape_only_on_beat"] = bool(moves) and all(min(abs(i - j) for j in flips) <= 1 for i in moves) \
            if flips else False
    except Exception:
        res["pallet_sync"] = res["escape_only_on_beat"] = False


WATCH_KEYS = ("watch_api", "balance_2_5_hz", "balance_amplitude", "balance_steady", "escape_ticks",
              "seconds_hand", "minute_hand", "hour_ratio", "train_ratios", "gears_mesh", "train_kinematics",
              "pallet_sync", "escape_only_on_beat", "parts_40_unique", "jewels_17", "explode_separates",
              "parts_visible")


def check_watch(ctx):
    res = {}
    f = ctx.eval(WATCH_JS)
    if not f:
        return {k: False for k in WATCH_KEYS}
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
    step = TWO_PI / 30
    multiples = all(abs(e / step - round(e / step)) < 0.01 for e in esc)
    # 5 beats per second, half a tooth (12 degrees) per beat: one turn per 6 s, 10 turns per minute
    res["escape_ticks"] = abs(abs(esc[-1] - esc[0]) - 5 * step) < 0.02 and multiples
    res["seconds_hand"] = _mod_dist(f["s30"], PI) <= 0.03 and _mod_dist(f["s60"], 0.0) <= 0.03
    res["minute_hand"] = _mod_dist(f["m900"], PI / 2) <= 0.02 and _mod_dist(f["m3600"], 0.0) <= 0.02
    res["hour_ratio"] = _mod_dist(f["h3600"], PI / 6) <= 0.01  # 12 hours per turn: 1/12 of the minute hand
    names = f["names"]
    res["parts_40_unique"] = f["nparts"] >= 40 and all(names) and len(set(names)) == len(names)
    res["jewels_17"] = f["jewels"] >= 17
    disp = f["disp"]
    res["explode_separates"] = sum(d >= 0.5 for d in disp) >= 0.8 * max(1, len(disp))
    _train_checks(f, res)
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


def _hot_core_count(png):
    """Near-white, very bright pixels: the hot core of the plume (half resolution)."""
    img = _png_pixels(png)
    small = img.resize((img.size[0] // 2, img.size[1] // 2))
    px = small.load()
    n = 0
    for y in range(small.size[1]):
        for x in range(small.size[0]):
            r, g, b = px[x, y]
            if r > 240 and g > 225 and b > 150:
                n += 1
    return n


def _smoke_share(png):
    """Share of bright, colourless pixels (white or light grey steam and smoke) in the lower half of the picture."""
    img = _png_pixels(png)
    w, h = img.size
    low = img.crop((0, h // 2, w, h)).resize((320, 90))
    data = list(low.getdata())
    return sum(1 for r, g, b in data if min(r, g, b) > 165 and max(r, g, b) - min(r, g, b) < 30) / len(data)


SMOKE_JS = r"""
async () => {
  const r = window.__rocket;
  r.paused = true; r.reset(); r.step(4);
  await new Promise(res => setTimeout(res, 400));
  return true;
}
"""


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
                  "plume_hot_core", "smoke_clouds_at_pad", "karman_dark_sky_with_stars"):
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
        res["plume_hot_core"] = _hot_core_count(png) >= 20
    except Exception:
        res["plume_at_liftoff"] = res["plume_hot_core"] = False
    try:
        ctx.page.evaluate(SMOKE_JS)
        png = ctx.page.screenshot()
        (ctx.workdir / "smoke_t4.png").write_bytes(png)
        res["smoke_clouds_at_pad"] = _smoke_share(png) >= 0.03
    except Exception:
        res["smoke_clouds_at_pad"] = False
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
(17 jewels, 18 000 vibrations per hour = 2.5 Hz = 5 beats per second, hand-wound, Swiss lever escapement with a
15-tooth escape wheel). The point is the mechanics: it must work like the real movement, with simplified shapes.
Units: 1 unit = 1 mm. The movement lies in the x-z plane (the plate is horizontal), all wheel axes are vertical (y).

How it works (this is what must be visible and what is measured)
- The mainspring in the barrel drives the going train: barrel -> center wheel (1 turn per hour, carries the minute
  hand) -> third wheel -> fourth wheel (1 turn per minute, carries the small seconds hand) -> escape wheel.
  Each wheel drives the PINION of the next one; meshing wheels turn in opposite directions.
- The escapement lets the train move only in steps: the balance swings, the pallet fork flips from one side to
  the other each time the balance passes its centre (a beat), and at each beat the escape wheel is released and
  moves half a tooth (12 degrees). So the escape wheel turns once per 6 s, 10 times a minute, and the whole train
  (and the hands) moves in small jumps, 5 per second.
- The hairspring breathes (coils in and out) with the balance. The cannon pinion, minute wheel and hour wheel (the
  motion works, 12:1) drive the hour hand.

Wheels: real toothed gears (an extruded THREE.Shape with teeth, not plain cylinders), and pinions as separate small
toothed parts on the same axis. Each train wheel stores its data in userData:
  { teeth, pinion, radius, pinionRadius }   (teeth of the wheel, leaves of its own pinion, pitch radii in mm)
- Ratios: (center.teeth / third.pinion) * (third.teeth / fourth.pinion) = 60, fourth.teeth / escape.pinion = 10,
  escape wheel 15 teeth, barrel.teeth / center.pinion between 4 and 10 (the barrel turns once in 4-10 hours).
  For example: barrel 72, center 80 / pinion 12, third 75 / pinion 10, fourth 80 / pinion 10, escape 15 / pinion 8.
- Placement: with explode(0), the distance between the axes of a wheel and the next wheel (in x-z) equals
  wheel.radius + next.pinionRadius, so the teeth really mesh. Use one tooth size (module) per mesh, e.g. 0.1 mm:
  radius = module * teeth / 2.

Parts (window.__watch.parts: an array of THREE.Object3D, each with a unique non-empty name)
- At least 40 separate meshes, with unique names, including: mainspring_barrel, mainspring, arbor, center_wheel,
  third_wheel, fourth_wheel, escape_wheel, their pinions, pallet_fork, balance_wheel, hairspring, balance_cock, stud,
  crown, stem, setting_lever, click, ratchet_wheel, cannon_pinion, hour_wheel, minute_wheel, the 17 jewels named
  jewel_1 ... jewel_17 (at the pivots), the main plate and the bridges, and the screws.
- Metal parts in brass or steel (metalness with an environment map, so they are not black), the jewels in red.

Realism: as realistic as possible, like a macro photograph of a real 6497 movement (shapes may be simplified,
the look must not be)
- Materials: physically based (MeshPhysicalMaterial where it helps), an environment map for reflections (e.g.
  RoomEnvironment with PMREMGenerator), ACES tone mapping, soft shadows.
- Finishes drawn procedurally (canvas or shader, no downloaded textures): Geneva stripes (cotes de Geneve) on the
  bridges, perlage (overlapping circular grain) on the main plate, polished bevels (chamfered edges) on the bridges,
  gilded or rhodium-plated plates, heat-blued screws with slotted heads, steel wheels and pinions with a polished
  look, golden chatons around the ruby jewels, translucent red jewels (transmission or clearcoat), a blued hairspring
  as a thin flat spiral, an engraved text on the bridge ("UNITAS 6497 17 JEWELS SWISS MADE").
- Wheels with spokes (crossings), not solid discs; the balance wheel with screws or a smooth rim; the hairspring
  attached to the stud on the balance cock.
- Lighting like a studio macro shot: a key light, a soft fill, a rim light, a dark background, a shallow depth of
  field is welcome (e.g. BokehPass).

Timing (window.__watch, the simulated clock)
- reset(): sets the time t to 0 and every angle to 0.
- step(dt): advances the simulated time t by dt seconds (for any dt, including large ones).
- state(): returns, in radians, computed from t with exact formulas, where k = floor(5*t) is the number of beats
  and tau = k / 5 is the time the train has been released for:
    balance(t) = 1.2*PI * sin(2*PI*2.5*t)            (balance angle; amplitude 216 degrees; passes 0 at each beat)
    pallet(t)  = 0.2 * (k even ? 1 : -1)             (pallet fork: flips at each beat)
    escape(t)  = -k * 2*PI/30                        (half a tooth per beat)
    fourth(t)  =  2*PI * tau / 60                    (one turn per minute)
    third(t)   = -fourth(t) * fourth.pinion / third.teeth
    center(t)  =  2*PI * tau / 3600                  (one turn per hour)
    barrel(t)  = -center(t) * center.pinion / barrel.teeth
    second(t)  = fourth(t), minute(t) = center(t), hour(t) = minute(t) / 12
  Return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour }, angles not wrapped.
- paused (boolean): when true, the render loop must not call step(); it keeps rendering.
- explode(f): f in [0, 1]. 0 = assembled (every part at its place in the movement), 1 = exploded (every part moved
  away from the centre, along its own direction, clearly separated).
- The movement starts ASSEMBLED and running, so the mechanism can be watched working; the key E (and a button)
  animates between the assembled and the exploded view.
- The render loop calls step(min(delta, 1/30)) when not paused. Rotate every wheel, pinion, the fork, the balance
  and the hands with the angles from state(), so the picture matches the simulation.

Scene
- The camera frames the movement from above and in front, close enough to see the teeth mesh and the escapement
  work; orbit controls. A text label near each main part
  (canvas texture or DOM is fine).
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

Realism: as realistic as possible, it must look like a launch photograph, not a diagram
- Setting: the Florida coast. Flat land with green scrub vegetation, the Atlantic Ocean on the horizon behind the pad,
  roads and low buildings around it, a pale hazy sky near the horizon (fog or haze toward the distance).
- Pad: a concrete pad with a flame trench, a lattice launch/umbilical tower next to the rocket, and tall lattice
  lightning-protection masts around the pad.
- Rocket: white body with a visible interstage and a darker band, an engine section with nozzles, a nose fairing,
  markings (a flag and lettering drawn on a canvas texture), physically based materials.
- Rendering: physically based materials, ACES tone mapping, shadows from the sun, atmospheric scattering in the sky
  (e.g. the Sky addon or your own shader), aerial perspective (distant things paler and bluer), bloom for the flame
  (e.g. UnrealBloomPass); procedural textures (canvas or shader) for the concrete, the ground and the vegetation.
- Liftoff: a blinding white-yellow core at the nozzles fading to orange, Mach diamonds are welcome, a
  flickering light from the plume that lights the pad and the rocket, and large billowing white steam and smoke clouds
  that roll sideways out of the flame trench along the ground and then rise. Build the clouds from many soft particles
  or sprites, so they look soft and volumetric, not like solid spheres.
- Ascent: the plume grows longer and wider as the air thins; the contrail stays in the sky and drifts slowly.
- Camera: like launch photography: a low camera near the pad looking up at liftoff, then a long-lens shot that tracks
  the rocket upward.
- Sky: from blue at the ground to black at 100 km (the Karman line). Stars must appear above about 70 km and be clearly
  visible above 100 km. Drive the sky from the rocket's altitude.
- Trail: a visible white contrail behind the rocket, drawn from the trail points.
- No external assets (no textures, models or fonts from the network).

Reply with a single ```ts code block and nothing else.""",
        "check": check_rocket,
    },
]

PY_TASKS = []
