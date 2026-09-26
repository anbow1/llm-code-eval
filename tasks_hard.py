"""
Harder task set (run with --suite hard).
3 Python tasks with hidden tests + 3 TypeScript/Three.js tasks checked in the browser.
Uses the same system prompts as tasks.py.
"""
import io

from tasks import PY_SYSTEM, THREE_SYSTEM, by_uuid, has_type, meshes  # noqa: F401  (re-exported)


# =====================================================================
# Three.js checks
# =====================================================================

SIM_JS = r"""
(steps) => {
  const s = window.__sim;
  if (!s || !Array.isArray(s.balls) || typeof s.step !== 'function') return null;
  s.paused = true;
  const B = s.balls;
  const energy = () => B.reduce((e, b) => e + 0.5 * b.m * (b.vx*b.vx + b.vy*b.vy + b.vz*b.vz), 0);
  const e0 = energy();
  const p0 = B.map(b => [b.x, b.y, b.z]);
  let maxOut = 0, minGap = Infinity, bad = false;
  for (let i = 0; i < steps; i++) {
    s.step(1 / 120);
    for (const b of B) {
      for (const v of [b.x, b.y, b.z, b.vx, b.vy, b.vz]) if (!Number.isFinite(v)) bad = true;
      maxOut = Math.max(maxOut, Math.abs(b.x) + b.r - 5, Math.abs(b.y) + b.r - 5, Math.abs(b.z) + b.r - 5);
    }
    if (i % 10 === 0) {
      for (let a = 0; a < B.length; a++) for (let c = a + 1; c < B.length; c++) {
        const d = Math.hypot(B[a].x - B[c].x, B[a].y - B[c].y, B[a].z - B[c].z) - B[a].r - B[c].r;
        minGap = Math.min(minGap, d);
      }
    }
  }
  const moved = B.some((b, i) => Math.hypot(b.x - p0[i][0], b.y - p0[i][1], b.z - p0[i][2]) > 0.5);
  const masses = new Set(B.map(b => b.m)).size;
  s.paused = false;
  return { n: B.length, e0, e1: energy(), maxOut, minGap, moved, bad, masses,
           radii: B.every(b => Math.abs(b.r - 0.4) < 1e-9) };
}
"""


def check_physics(ctx):
    spheres = [m for m in meshes(ctx.s0) if m["geom"] and m["geom"]["type"] == "SphereGeometry"]
    res = {"20_sphere_meshes": len(spheres) >= 20, "picture_animates": ctx.img_changed}
    r = ctx.eval(SIM_JS, 600)
    if not r:
        res.update({k: False for k in ("sim_api", "stay_in_box", "no_overlap", "energy_conserved",
                                       "balls_move", "masses_differ")})
        return res
    res["sim_api"] = r["n"] == 20 and r["radii"] and not r["bad"]
    res["stay_in_box"] = r["maxOut"] <= 0.02 and not r["bad"]
    res["no_overlap"] = r["minGap"] >= -0.02 and not r["bad"]
    res["energy_conserved"] = r["e0"] > 0 and abs(r["e1"] - r["e0"]) <= 0.01 * r["e0"] and not r["bad"]
    res["balls_move"] = r["moved"]
    res["masses_differ"] = r["masses"] >= 2
    return res


INST_INFO_JS = r"""
() => {
  const m = window.__mesh;
  if (!m || !m.isInstancedMesh) return null;
  const THREE_Color = m.material.color ? m.material.color.constructor : null;
  if (!THREE_Color || !m.instanceColor) return { count: m.count, colors: null };
  const col = new THREE_Color();
  const colors = [];
  for (let i = 0; i < m.count; i++) { m.getColorAt(i, col); colors.push(col.getHex()); }
  return { count: m.count, colors };
}
"""

INST_XY_JS = r"""
(i) => {
  const m = window.__mesh;
  const M = m.matrixWorld.clone();
  const t = new (M.constructor)();
  m.getMatrixAt(i, t);
  const e = t.elements;
  const v = window.__camera.position.clone().set(e[12], e[13], e[14]).applyMatrix4(M).project(window.__camera);
  const r = window.__renderer.domElement.getBoundingClientRect();
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height];
}
"""

GRAY, RED = 0x808080, 0xFF0000


def check_instanced_pick(ctx):
    res = {k: False for k in ("instanced_900", "starts_gray", "click_turns_red", "red_visible_on_screen",
                              "second_click_independent",
                              "click_again_toggles_back", "background_does_nothing", "single_mesh")}
    info = ctx.eval(INST_INFO_JS)
    plain = [o for o in ctx.s0 if o["type"] == "Mesh"]
    res["single_mesh"] = len(plain) == 0 and any(o["type"] == "InstancedMesh" for o in ctx.s0)
    if not info:
        return res
    res["instanced_900"] = info["count"] == 900
    if not info["colors"] or info["count"] < 900:
        return res
    res["starts_gray"] = all(c == GRAY for c in info["colors"])

    def reds():
        i2 = ctx.eval(INST_INFO_JS) or {"colors": []}
        return {i for i, c in enumerate(i2["colors"] or []) if c == RED}

    def click(i):
        xy = ctx.eval(INST_XY_JS, i)
        if xy:
            ctx.click_xy(*xy)

    a, b = 0, 467
    click(a)
    res["click_turns_red"] = reds() == {a}
    xy = ctx.eval(INST_XY_JS, a)
    if xy:  # the color must also reach the GPU (instanceColor.needsUpdate)
        ctx.page.wait_for_timeout(200)
        px = _pixel(ctx.page.screenshot(), int(xy[0]), int(xy[1]))
        res["red_visible_on_screen"] = px[0] > 180 and px[1] < 80 and px[2] < 80
    else:
        res["red_visible_on_screen"] = False
    click(b)
    res["second_click_independent"] = reds() == {a, b}
    click(a)
    res["click_again_toggles_back"] = reds() == {b}
    before = reds()
    ctx.click_xy(3, 3)
    res["background_does_nothing"] = reds() == before and bool(before)
    return res


def _pixel(png, x, y):
    from PIL import Image
    return Image.open(io.BytesIO(png)).convert("RGB").getpixel((x, y))


def _close(p, q, tol):
    return all(abs(a - b) <= tol for a, b in zip(p, q))


def check_postfx(ctx):
    comp = ctx.eval("(() => { const c = window.__composer; if (!c || !Array.isArray(c.passes)) return null;"
                    " return { n: c.passes.length, w: c.renderTarget1 ? c.renderTarget1.width : 0 }; })()")
    png = ctx.shot
    corner = _pixel(png, 5, 5)
    center = _pixel(png, 400, 300)
    res = {
        "composer_exposed": bool(comp) and comp["n"] >= 2,
        "background_inverted_srgb": _close(corner, (0xCC, 0x99, 0x66), 6),
        "sphere_inverted_to_black": _close(center, (0, 0, 0), 12),
        "composer_resizes": False,
    }
    if comp:
        dpr = ctx.eval("window.devicePixelRatio") or 1
        ctx.page.set_viewport_size({"width": 640, "height": 480})
        ctx.page.wait_for_timeout(400)
        w1 = ctx.eval("window.__composer.renderTarget1.width")
        res["composer_resizes"] = w1 == round(640 * dpr)
        ctx.page.set_viewport_size({"width": 800, "height": 600})
        ctx.page.wait_for_timeout(300)
    return res


THREE_TASKS = [
    {
        "id": "h_t1_physics",
        "prompt": """Simulate 20 balls bouncing inside a closed box and render them.
- Box: the cube from -5 to +5 on every axis. Draw its edges (e.g. LineSegments + EdgesGeometry) so it is visible. No gravity.
- Every ball has radius exactly 0.4 and a mass; use at least two different masses (e.g. random 1..3). Start positions must not overlap and must be fully inside the box; start velocities random, speed about 2..4 units/s.
- Physics: perfectly elastic collisions with the walls AND between balls (use the masses, conserve momentum and kinetic energy). Balls must never leave the box and must never stay overlapping (separate overlapping pairs).
- Render every ball as its own Mesh with SphereGeometry and MeshStandardMaterial; add AmbientLight + DirectionalLight; keep the meshes in sync with the physics.
- Expose the simulation for testing:
    (window as any).__sim = { balls, step, paused }
  where balls is an array of plain objects { x, y, z, vx, vy, vz, r, m } (numbers, the live state that step() updates), step(dt: number) advances the physics by dt seconds (use substeps so it stays stable), and paused is a boolean: when __sim.paused is true the render loop must keep rendering but must NOT call step().
- The render loop calls step() with the frame delta (clamp it to at most 1/30 s) when not paused.
- Camera placed so the whole box is visible.""",
        "check": check_physics,
    },
    {
        "id": "h_t2_instanced_pick",
        "prompt": """Render a 30x30 grid (900) of boxes using ONE InstancedMesh (no other meshes at all).
- Grid in the XY plane facing the camera, box size 0.8, spacing 1.0 (visible gaps), centered on the origin. PerspectiveCamera looking straight at the grid, whole grid visible with a margin. No camera movement, no animation.
- Every instance starts with color 0x808080 set via setColorAt. Use a MeshBasicMaterial (white) so the instance colors show exactly.
- Clicking an instance toggles its color: gray (0x808080) becomes red (0xff0000), red becomes gray. Every instance toggles independently (clicking one does not change others). Clicking empty background changes nothing.
- Use THREE.Raycaster with normalized device coordinates from the canvas bounding rect and use intersection.instanceId. Remember to flag the instance colors for upload after changing them.
- Expose the InstancedMesh as (window as any).__mesh = mesh.""",
        "check": check_instanced_pick,
    },
    {
        "id": "h_t3_postfx_invert",
        "prompt": """Build a post-processing color-inversion effect with the correct color space.
- Scene background: scene.background = new THREE.Color(0x336699). One sphere (radius 1, MeshBasicMaterial color 0xffffff) at the origin. PerspectiveCamera at (0, 0, 4) looking at the origin.
- Use EffectComposer from 'three/addons/postprocessing/EffectComposer.js' with a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass.
- Requirement: the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect. The background 0x336699 must appear on screen as 0xcc9966 and the white sphere as black. Think about where the linear -> sRGB conversion happens and order the passes (or convert in the shader) so this holds.
- Render with composer.render() in the animation loop (not renderer.render()).
- On window resize update the camera, the renderer AND the composer size.
- Expose (window as any).__composer = composer.""",
        "check": check_postfx,
    },
]


# =====================================================================
# Python tasks
# =====================================================================

PY_TASKS = [
    {
        "id": "h_p1_interval_set",
        "prompt": """Write a class `IntervalSet` that stores a set of real numbers as disjoint half-open intervals [lo, hi).
Methods:
- add(lo, hi): add [lo, hi). Ignore if lo >= hi.
- remove(lo, hi): remove [lo, hi) (may split an interval in two). Ignore if lo >= hi.
- contains(x) -> bool: is x in the set?
- total_length() -> number: sum of all interval lengths.
- intervals() -> list[tuple]: all intervals as (lo, hi) tuples, sorted, disjoint, and with touching intervals merged ([1,3) + [3,5) gives [(1, 5)]).
- __len__(): number of intervals.
Bounds may be ints or floats. Keep the original values (no rounding).
Performance: contains() must be O(log n); 60 000 add() calls of small disjoint intervals in random order followed by 200 000 contains() calls must take well under 5 seconds.""",
        "tests": r'''
S_mod = S
import random, time
def brute_check(S, ops):
    grid = [False] * 60
    for op, lo, hi in ops:
        (S.add if op == "a" else S.remove)(lo, hi)
        for x in range(max(lo, 0), min(hi, 60)):
            grid[x] = op == "a"
    want, i = [], 0
    while i < 60:
        if grid[i]:
            j = i
            while j < 60 and grid[j]: j += 1
            want.append((i, j)); i = j
        else: i += 1
    return want
def t():
    S = S_mod.IntervalSet()
    S.add(1, 3); S.add(3, 5)
    assert S.intervals() == [(1, 5)], S.intervals()
    assert len(S) == 1 and S.total_length() == 4
TESTS.append(("merge touching", t))
def t():
    S = S_mod.IntervalSet(); S.add(0, 10); S.remove(3, 5)
    assert S.intervals() == [(0, 3), (5, 10)], S.intervals()
    assert S.contains(2.999) and not S.contains(3) and not S.contains(4.5) and S.contains(5) and not S.contains(10)
TESTS.append(("split + half-open", t))
def t():
    S = S_mod.IntervalSet(); S.add(5, 5); S.add(7, 2); S.remove(4, 4)
    assert S.intervals() == [] and len(S) == 0 and S.total_length() == 0
TESTS.append(("empty ranges ignored", t))
def t():
    S = S_mod.IntervalSet(); S.add(0.5, 1.25); S.add(2, 2.5); S.add(1.25, 2)
    assert S.intervals() == [(0.5, 2.5)] and abs(S.total_length() - 2.0) < 1e-12
TESTS.append(("floats", t))
def t():
    S = S_mod.IntervalSet()
    for lo in range(0, 20, 2): S.add(lo, lo + 1)
    S.add(-5, 30)
    assert S.intervals() == [(-5, 30)] and len(S) == 1
    S.remove(-10, 100)
    assert S.intervals() == []
TESTS.append(("swallow many", t))
def t():
    rnd = random.Random(7)
    for _ in range(300):
        S = S_mod.IntervalSet()
        ops = [(rnd.choice("aar"), *sorted((rnd.randint(0, 60), rnd.randint(0, 60)))) for _ in range(rnd.randint(1, 25))]
        want = brute_check(S, ops)
        assert S.intervals() == want, (ops, S.intervals(), want)
        assert S.total_length() == sum(h - l for l, h in want)
        for x in range(0, 60):
            assert S.contains(x) == any(l <= x < h for l, h in want)
TESTS.append(("random vs brute force", t))
def t():
    rnd = random.Random(8)
    starts = list(range(0, 60000 * 3, 3)); rnd.shuffle(starts)
    S = S_mod.IntervalSet()
    t0 = time.perf_counter()
    for n, s in enumerate(starts):
        S.add(s, s + 1)
        if n % 1000 == 0 and time.perf_counter() - t0 > 8.0:
            raise AssertionError(f"too slow: only {n} of 60000 add() calls in 8 s")
    hits = 0
    for n in range(200000):
        hits += S.contains(rnd.random() * 180000)
        if n % 5000 == 0 and time.perf_counter() - t0 > 8.0:
            raise AssertionError(f"too slow: only {n} of 200000 contains() calls in time")
    dt = time.perf_counter() - t0
    assert len(S) == 60000 and 55000 < hits < 78000, (len(S), hits)
    assert dt < 8.0, f"too slow: {dt:.1f}s"
TESTS.append(("performance 60k/200k", t))
''',
    },
    {
        "id": "h_p2_expr_eval",
        "prompt": """Write `evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction`, an exact calculator.
Grammar and rules:
- Numbers: integers or decimals ("12", "3.5", ".5", "7."). Convert exactly (Fraction("3.5")), never via float.
- Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in `variables` (values are int or Fraction). Unknown name -> NameError.
- Binary + - * / with the usual precedence, left-associative.
- Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4, but a unary sign is allowed right after ^: 2^-1 = 1/2. The exponent must evaluate to an integer, otherwise ValueError. 0 ^ negative -> ZeroDivisionError.
- Unary + and -, may repeat ("--3" = 3).
- Functions: abs(x) (exactly 1 argument), min(...) and max(...) (1 or more arguments, comma separated). Wrong number of arguments or unknown function -> ValueError.
- Parentheses and any whitespace between tokens.
- Division by zero -> ZeroDivisionError.
- Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError.
Always return a Fraction. Standard library only; do not use eval() or exec().""",
        "tests": r'''
S_mod = S
import random
from fractions import Fraction as F
E = S_mod.evaluate
CASES = [("1+2*3", 7), ("(1+2)*3", 9), ("2^3^2", 512), ("-2^2", -4), ("(-2)^2", 4), ("2^-1", F(1, 2)),
         ("10/4", F(5, 2)), ("7 - 2 - 1", 4), ("64/4/2", 8), ("--3", 3), ("-+-3", 3), (".5+7.", F(15, 2)),
         ("3.25*4", 13), ("max(1, 5, 3) - min(4, 2)", 3), ("abs(-7/2)", F(7, 2)), ("2*x^2 + y", 21),
         ("  ( ( 1 ) ) ", 1), ("0.1+0.2", F(3, 10)), ("2^0", 1), ("(1/3)^-2", 9), ("-x", -3), ("max(-1)", -1),
         ("1-2^2^0", -1), ("-(2+3)*2", -10), ("2^(1+1)^2", 16)]
for s, want in CASES:
    def t(s=s, want=want):
        got = E(s, {"x": 3, "y": F(3)})
        assert isinstance(got, F), f"{s!r}: returned {type(got).__name__}, not Fraction"
        assert got == want, f"{s!r}: got {got}, want {want}"
    TESTS.append((f"value {s!r}", t))
ERRORS = [("", ValueError), ("1 +", ValueError), ("* 2", ValueError), ("(1", ValueError), ("1)", ValueError),
          ("2 3", ValueError), ("1..2", ValueError), ("abs 3", ValueError), ("3 $ 4", ValueError),
          ("abs(1, 2)", ValueError), ("min()", ValueError), ("foo(1)", ValueError), ("2^(1/2)", ValueError),
          ("1/0", ZeroDivisionError), ("0^-1", ZeroDivisionError), ("q + 1", NameError), ("max(1,)", ValueError)]
for s, exc in ERRORS:
    def t(s=s, exc=exc):
        try:
            got = E(s, {"x": 3})
        except exc:
            return
        except Exception as e:
            raise AssertionError(f"{s!r}: raised {type(e).__name__}, want {exc.__name__}")
        raise AssertionError(f"{s!r}: returned {got!r}, want {exc.__name__}")
    TESTS.append((f"error {s!r}", t))
PREC = {"+": 1, "-": 1, "*": 2, "/": 2, "neg": 3, "^": 4, "atom": 9}
def gen(rnd, d):
    if d == 0 or rnd.random() < 0.25:
        return ("num", rnd.choice([rnd.randint(0, 9), rnd.randint(10, 99), F(rnd.randint(1, 99), 10)]))
    r = rnd.random()
    if r < 0.12: return ("neg", gen(rnd, d - 1))
    if r < 0.25: return ("^", gen(rnd, d - 1), ("num", rnd.randint(0, 3)) if rnd.random() < .7 else ("neg", ("num", rnd.randint(1, 2))))
    return (rnd.choice("+-*/"), gen(rnd, d - 1), gen(rnd, d - 1))
def val(n):
    k = n[0]
    if k == "num": return F(n[1])
    if k == "neg": return -val(n[1])
    a, b = val(n[1]), val(n[2])
    if k == "+": return a + b
    if k == "-": return a - b
    if k == "*": return a * b
    if k == "/": return a / b
    return a ** int(b)
def prec(n): return PREC["atom"] if n[0] == "num" else PREC[n[0]]
def show(n):
    k = n[0]
    if k == "num":
        v = n[1]
        return str(v) if not isinstance(v, F) or v.denominator == 1 else f"{v.numerator / 10:.1f}" if v.denominator == 10 else str(float(v))
    if k == "neg":
        s = show(n[1]); return "-" + (f"({s})" if prec(n[1]) < 3 else s)
    l, r = show(n[1]), show(n[2])
    p = PREC[k]
    if k == "^":
        l = f"({l})" if prec(n[1]) <= p else l
        r = f"({r})" if prec(n[2]) < 3 else r
    else:
        l = f"({l})" if prec(n[1]) < p else l
        r = f"({r})" if prec(n[2]) <= p else r
    return f"{l} {k} {r}"
def t():
    rnd = random.Random(11); n_ok = 0
    while n_ok < 400:
        tree = gen(rnd, 4)
        try:
            want = val(tree)
        except ZeroDivisionError:
            continue
        if abs(want.numerator) > 10**40 or want.denominator > 10**40: continue
        s = show(tree)
        got = E(s)
        assert got == want, f"{s!r}: got {got}, want {want}"
        n_ok += 1
TESTS.append(("400 random expressions", t))
''',
    },
    {
        "id": "h_p3_line_diff",
        "prompt": """Write `diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]` that returns a shortest edit script.
- Each item is ("=", line) for a line kept from both, ("-", line) for a line only in a, ("+", line) for a line only in b.
- Taking the "=" and "-" items in order must give exactly a; taking the "=" and "+" items in order must give exactly b.
- The number of "=" items must be as large as possible (it equals the length of the longest common subsequence), so the script is minimal. Lines can repeat.
- Performance: two lists of 20 000 lines that differ in about 50 places must be diffed in under 2 seconds, and two completely different lists of 1 000 lines in under 6 seconds. (Hint: Myers' O((N+M)·D) algorithm.)
- Standard library only; do not use difflib (its output is not always minimal).""",
        "tests": r'''
S_mod = S
import random, time, threading
D = S_mod.diff_lines
def timed(fn, limit):
    """Run fn in a daemon thread; fail (instead of hanging) if it is too slow."""
    box = {}
    def run():
        try: box["r"] = fn()
        except BaseException as e: box["e"] = e
    th = threading.Thread(target=run, daemon=True); th.start(); th.join(limit)
    if th.is_alive(): raise AssertionError(f"too slow: not finished after {limit:.0f} s")
    if "e" in box: raise box["e"]
    return box["r"]
def lcs(a, b):
    prev = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(prev[j] + 1 if x == y else max(prev[j + 1], cur[j]))
        prev = cur
    return prev[-1]
def valid(a, b, s):
    assert all(isinstance(t, tuple) and len(t) == 2 and t[0] in "=-+" for t in s), "bad item format"
    assert [l for o, l in s if o in "=-"] == a, "script does not rebuild a"
    assert [l for o, l in s if o in "=+"] == b, "script does not rebuild b"
    return sum(1 for o, _ in s if o == "=")
def t():
    assert D([], []) == []
    assert valid(["x"], [], D(["x"], [])) == 0
    assert valid([], ["y"], D([], ["y"])) == 0
TESTS.append(("empty", t))
def t():
    a = "a b c a b b a".split(); b = "c b a b a c".split()
    assert valid(a, b, D(a, b)) == lcs(a, b) == 4
TESTS.append(("classic example", t))
def t():
    rnd = random.Random(5)
    for _ in range(300):
        a = [rnd.choice("abc") for _ in range(rnd.randint(0, 14))]
        b = [rnd.choice("abc") for _ in range(rnd.randint(0, 14))]
        assert valid(a, b, D(a, b)) == lcs(a, b), (a, b)
TESTS.append(("random small, repeated lines", t))
def t():
    rnd = random.Random(6)
    for _ in range(20):
        a = [rnd.choice("abcdefgh") for _ in range(rnd.randint(100, 200))]
        b = list(a)
        for _ in range(rnd.randint(1, 30)):
            i = rnd.randrange(len(b) + 1)
            if rnd.random() < 0.5 and b: b.pop(min(i, len(b) - 1))
            else: b.insert(i, rnd.choice("abcdefghxyz"))
        assert valid(a, b, D(a, b)) == lcs(a, b)
TESTS.append(("random medium vs LCS", t))
def t():
    rnd = random.Random(9)
    a = [f"line {i}" for i in range(20000)]
    b = list(a)
    dels = sorted(rnd.sample(range(20000), 25), reverse=True)
    for i in dels: b.pop(i)
    for k in range(25): b.insert(rnd.randrange(len(b) + 1), f"new {k}")
    s = timed(lambda: D(a, b), 4.0)
    assert valid(a, b, s) == 20000 - 25
TESTS.append(("performance 20k lines, 50 changes", t))
def t():
    a = [f"a{i}" for i in range(1000)]; b = [f"b{i}" for i in range(1000)]
    s = timed(lambda: D(a, b), 12.0)
    assert valid(a, b, s) == 0
TESTS.append(("performance 1000 vs 1000 all different", t))
''',
    },
]
