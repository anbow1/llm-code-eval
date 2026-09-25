"""
Task definitions for the local-LLM code eval.
Each task = prompt + automated checks.  Edit freely.
"""
import math

# =====================================================================
# System prompts
# =====================================================================

THREE_SYSTEM = """You are an expert TypeScript and Three.js developer.
Write ONE complete TypeScript file for the browser.

Hard rules:
- Import Three.js as: import * as THREE from 'three';  Addons from 'three/addons/...'.
- The file must compile with `tsc --strict` with zero errors.
- Create the WebGLRenderer yourself and append its canvas to document.body. The page has no other HTML.
- Size the renderer from window.innerWidth / window.innerHeight and handle window resize (camera aspect + renderer size).
- Use renderer.setAnimationLoop for the render loop. Motion must use delta/elapsed time, not frame counts.
- Expose for testing:
    (window as any).__scene = scene;
    (window as any).__camera = camera;
    (window as any).__renderer = renderer;
- After the first frame is rendered, set (window as any).__ready = true.
- No external assets (no textures, models, fonts or network requests).

Reply with a single ```ts code block and nothing else."""

PY_SYSTEM = """You are an expert Python developer.
Write Python 3.11+ code using only the standard library.
Reply with a single ```python code block containing the complete solution.
No tests, no example usage, no input(), no printing."""


# =====================================================================
# Snapshot helpers (snapshots come from the page, see SNAPSHOT_JS in run_eval.py)
# =====================================================================

def meshes(snap):
    return [o for o in snap if o["isMesh"]]


def by_uuid(snap):
    return {o["uuid"]: o for o in snap}


def has_type(snap, t):
    return any(o["type"] == t for o in snap)


def mat_types(o):
    return {m["type"] for m in o["mats"]}


def changed(a, b, eps=1e-4):
    return any(abs(x - y) > eps for x, y in zip(a["mw"], b["mw"]))


def translated(a, b, eps=1e-4):
    return any(abs(x - y) > eps for x, y in zip(a["mw"][12:15], b["mw"][12:15]))


def pairs(ctx, objs):
    u1 = by_uuid(ctx.s1)
    return [(o, u1[o["uuid"]]) for o in objs if o["uuid"] in u1]


# =====================================================================
# Three.js checks
# =====================================================================

def check_cube(ctx):
    std = [m for m in meshes(ctx.s0)
           if mat_types(m) & {"MeshStandardMaterial", "MeshPhysicalMaterial"}]
    return {
        "box_geometry": any(m["geom"] and m["geom"]["type"] == "BoxGeometry" for m in std),
        "standard_material": bool(std),
        "ambient_light": has_type(ctx.s0, "AmbientLight"),
        "directional_light": has_type(ctx.s0, "DirectionalLight"),
        "cube_rotates": any(changed(a, b) for a, b in pairs(ctx, std)),
        "picture_animates": ctx.img_changed,
    }


def _angle(o):
    return math.atan2(o["mw"][14], o["mw"][12])


def check_solar(ctx):
    ms = meshes(ctx.s0)
    moving = [(a, b) for a, b in pairs(ctx, ms) if translated(a, b)]
    top = min((a["meshAncestors"] for a, _ in moving), default=0)
    planets = [(a, b) for a, b in moving if a["meshAncestors"] == top]
    speeds = []
    for a, b in planets:
        d = abs(_angle(b) - _angle(a))
        d = min(d, 2 * math.pi - d)
        speeds.append(d)
    distinct = sorted(speeds)
    speeds_differ = len(distinct) >= 3 and all(
        distinct[i + 1] > distinct[i] * 1.05 + 1e-6 for i in range(len(distinct) - 1))
    sun = any(any(mm["type"] == "MeshBasicMaterial" or (mm["emissive"] or 0) > 0
                  for mm in m["mats"]) for m in ms)
    return {
        "at_least_5_meshes": len(ms) >= 5,
        "sun_basic_or_emissive": sun,
        "point_light": has_type(ctx.s0, "PointLight"),
        "4_bodies_move": len(moving) >= 4,
        "moon_child_of_planet": any(a["meshAncestors"] >= 1 for a, _ in moving),
        "3_different_speeds": speeds_differ,
    }


def check_instanced(ctx):
    ims = [o for o in ctx.s0 if o["type"] == "InstancedMesh"]
    plain = [o for o in ctx.s0 if o["type"] == "Mesh"]
    return {
        "instanced_mesh": bool(ims),
        "count_10000": any(o["count"] >= 10000 for o in ims),
        "instance_colors": any(o["hasInstanceColor"] for o in ims),
        "few_plain_meshes": len(plain) < 50,
        "wave_animates": any(abs(a["imSum"] - b["imSum"]) > 1e-6 for a, b in pairs(ctx, ims)),
        "picture_animates": ctx.img_changed,
    }


def _shader_meshes(snap):
    return [m for m in meshes(snap)
            if mat_types(m) & {"ShaderMaterial", "RawShaderMaterial"}]


def _utime(o):
    for mm in o["mats"]:
        u = mm.get("uniforms") or {}
        if isinstance(u.get("uTime"), (int, float)):
            return u["uTime"]
    return None


def check_shader(ctx):
    sm = _shader_meshes(ctx.s0)
    with_time = [m for m in sm if _utime(m) is not None]
    return {
        "shader_material": bool(sm),
        "uTime_uniform": bool(with_time),
        "uTime_advances": any((_utime(b) or 0) > (_utime(a) or 0) for a, b in pairs(ctx, with_time)),
        "plane_128_segments": any(m["geom"] and m["geom"]["vcount"] >= 129 * 129 for m in sm),
        "picture_animates": ctx.img_changed,
    }


BLUE, RED = 0x4488FF, 0xFF0000


def _colors(o):
    return [mm["color"] for mm in o["mats"]]


def check_click(ctx):
    cubes = [m for m in meshes(ctx.s0) if m["type"] == "Mesh"]
    res = {
        "25_cubes": len(cubes) == 25,
        "own_materials": len({mm["uuid"] for m in cubes for mm in m["mats"]}) >= 25,
        "start_color_4488ff": bool(cubes) and all(_colors(m) == [BLUE] for m in cubes),
        "click_selects": False,
        "single_selection": False,
        "background_clears": False,
    }
    if len(cubes) < 13:
        return res
    a, b = cubes[0]["uuid"], cubes[12]["uuid"]

    def reds():
        snap = ctx.snapshot()
        return [m for m in meshes(snap) if RED in _colors(m)], by_uuid(snap)

    ctx.click_object(a)
    r, _ = reds()
    res["click_selects"] = len(r) == 1 and r[0]["uuid"] == a

    ctx.click_object(b)
    r, u = reds()
    res["single_selection"] = (len(r) == 1 and r[0]["uuid"] == b
                               and a in u and _colors(u[a]) == [BLUE])

    ctx.click_xy(4, 4)
    r, _ = reds()
    res["background_clears"] = len(r) == 0 and res["click_selects"]
    return res


def check_terrain(ctx):
    cand = [m for m in meshes(ctx.s0) if m["geom"] and m["geom"]["type"] == "BufferGeometry"]
    t = max(cand, key=lambda m: m["geom"]["vcount"], default=None)
    g = t["geom"] if t else None
    return {
        "custom_buffer_geometry": bool(g) and g["vcount"] >= 128 * 128,
        "indexed": bool(g) and g["indexed"],
        "normals_point_up": bool(g) and g["hasNormal"] and g["avgNy"] > 0.5,
        "vertex_colors": bool(g) and g["hasColor"] and any(mm["vertexColors"] for mm in t["mats"]),
        "has_height": bool(g) and g["sizeY"] > 0.2,
        "orbit_controls": ctx.eval("typeof window.__controls?.update === 'function'"),
        "lights": has_type(ctx.s0, "DirectionalLight") and has_type(ctx.s0, "AmbientLight"),
    }


THREE_TASKS = [
    {
        "id": "t1_cube",
        "prompt": """Create a scene with a single cube (BoxGeometry + MeshStandardMaterial) at the origin that rotates continuously around the X and Y axes.
- Light it with one AmbientLight and one DirectionalLight.
- PerspectiveCamera placed so the cube is clearly visible.
- Background color different from the cube color.
- Rotation speed must be frame-rate independent (use delta time).""",
        "check": check_cube,
    },
    {
        "id": "t2_solar",
        "prompt": """Build a mini solar system. Y is up; all orbits are in the XZ plane around the origin.
- Sun: sphere at the origin with MeshBasicMaterial, plus a PointLight at the origin that actually lights the planets (mind physically based light intensity/decay).
- 3 planets: spheres with MeshStandardMaterial at distances about 4, 7 and 10, each orbiting the sun at a different angular speed (inner planets faster).
- Every planet also spins on its own axis.
- Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet.
- A weak AmbientLight so dark sides are not pure black.
- Camera above and to the side, looking at the origin, whole system visible.""",
        "check": check_solar,
    },
    {
        "id": "t3_instanced_wave",
        "prompt": """Render a 100x100 grid (10,000) of small cubes using ONE InstancedMesh (not 10,000 separate meshes).
- Animate a radial wave: every frame set each instance's Y to sin(distanceFromCenter * k - time * speed) * amplitude via setMatrixAt, then flag instanceMatrix for update.
- Give every instance its own color with setColorAt (e.g. a gradient by grid position).
- Reuse one Object3D or Matrix4 for the updates: no allocations inside the render loop.
- MeshStandardMaterial, AmbientLight + DirectionalLight.
- Camera at an angle so the whole grid and the wave are visible.""",
        "check": check_instanced,
    },
    {
        "id": "t4_shader_water",
        "prompt": """Create a plane (PlaneGeometry 10x10 with 128x128 segments) rotated to lie flat in the XZ plane, using a custom THREE.ShaderMaterial with GLSL vertex and fragment shaders you write yourself.
- Vertex shader: displace vertices up/down with a moving wave pattern based on position and a float uniform named `uTime` (seconds).
- Fragment shader: color by height (low = deep blue, high = white foam). Pass the height with a varying.
- Update uTime every frame from elapsed time.
- No lights needed (ShaderMaterial is unlit).
- Camera at an angle so the waves are clearly visible.""",
        "check": check_shader,
    },
    {
        "id": "t5_raycast_click",
        "prompt": """Create a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera, with visible gaps between them. Do not add any other meshes.
- Each cube has its OWN MeshStandardMaterial with color 0x4488ff.
- Clicking a cube selects it: its material color becomes 0xff0000. Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff.
- Clicking empty background clears the selection (all cubes 0x4488ff).
- Use THREE.Raycaster with normalized device coordinates computed from the canvas bounding rect.
- PerspectiveCamera looking straight at the grid, the whole grid visible with margin. No camera movement, no animation of the cubes.
- AmbientLight + DirectionalLight.""",
        "check": check_click,
    },
    {
        "id": "t6_terrain",
        "prompt": """Build a procedural terrain from a hand-made BufferGeometry (do NOT use PlaneGeometry or any other built-in geometry for the terrain).
- Grid of 128x128 vertices, 20x20 units in the XZ plane, centered at the origin.
- Height y = sum of 3 sine/cosine layers with different frequencies (or a small value-noise function you write yourself), amplitude about 2.
- Index buffer via setIndex: two triangles per grid cell, with winding so the faces point UP (+Y).
- Call computeVertexNormals().
- Vertex colors by height (green low, brown middle, white high); MeshStandardMaterial with vertexColors: true.
- AmbientLight + DirectionalLight.
- OrbitControls imported from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame, exposed as (window as any).__controls = controls.
- Camera above the terrain at an angle, whole terrain visible.""",
        "check": check_terrain,
    },
]


# =====================================================================
# Python tasks (tests run in a subprocess; `S` = the solution module)
# =====================================================================

PY_TASKS = [
    {
        "id": "p1_parse_duration",
        "prompt": """Write a function `parse_duration(s: str) -> int` that converts a duration string to total seconds.
Rules:
- A part is <non-negative integer><unit> with NO space between number and unit. Units: d (86400 s), h, m, s. Lowercase only.
- Units must appear in the order d, h, m, s. Each unit at most once. Any subset is allowed ("2d", "1h30m", "45s", "1d4s").
- Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed.
- No normalization: "90m" is valid (5400).
- Anything else raises ValueError: empty or blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators.""",
        "tests": r'''
VALID = [("1h30m", 5400), ("2d", 172800), ("45s", 45), ("1d 2h 3m 4s", 93784),
         ("0s", 0), ("90m", 5400), ("  1h  ", 3600), ("1d4s", 86404), ("1h   30m", 5400),
         ("10d23h59m59s", 950399)]
INVALID = ["", "   ", "1x", "30m1h", "1h1h", "h", "1.5h", "-1h", "+1h", "1H",
           "1h30", "1 h", "1h,30m", "abc", "1d2d", "5", "1s2m"]
for s, want in VALID:
    def t(s=s, want=want):
        got = S.parse_duration(s)
        assert got == want, f"{s!r}: got {got!r}, want {want}"
    TESTS.append((f"valid {s!r}", t))
for s in INVALID:
    def t(s=s):
        try:
            got = S.parse_duration(s)
        except ValueError:
            return
        raise AssertionError(f"{s!r}: expected ValueError, got {got!r}")
    TESTS.append((f"invalid {s!r}", t))
''',
    },
    {
        "id": "p2_sliding_median",
        "prompt": """Write `sliding_median(nums: list[float], k: int) -> list[float]` that returns the median of every contiguous window of size k (len(nums) - k + 1 values, in order).
- For even k the median is the mean of the two middle values. Return floats.
- Raise ValueError if k < 1 or k > len(nums).
- Must be efficient: n = 200_000 with k = 1_000 must finish in well under 2 seconds on a normal PC.""",
        "tests": r'''
import random, time, statistics
def brute(a, k):
    return [float(statistics.median(a[i:i+k])) for i in range(len(a)-k+1)]
def close(x, y):
    return len(x) == len(y) and all(abs(p-q) < 1e-9 for p, q in zip(x, y))
def t():
    got = S.sliding_median([1,3,-1,-3,5,3,6,7], 3)
    assert close(got, [1,-1,-1,3,5,6]), got
TESTS.append(("example odd k", t))
def t():
    got = S.sliding_median([1,2,3,4], 2)
    assert close(got, [1.5,2.5,3.5]), got
TESTS.append(("even k", t))
def t():
    assert close(S.sliding_median([5,1,4], 1), [5,1,4])
    assert close(S.sliding_median([5,1,4,2], 4), [3.0])
TESTS.append(("k=1 and k=n", t))
def t():
    a = [2,2,2,1,1,3,3,3,2]
    assert close(S.sliding_median(a, 4), brute(a, 4))
TESTS.append(("duplicates", t))
def t():
    rnd = random.Random(1)
    for _ in range(40):
        n = rnd.randint(1, 60); k = rnd.randint(1, n)
        a = [rnd.randint(-20, 20) for _ in range(n)]
        assert close(S.sliding_median(a, k), brute(a, k)), (a, k)
TESTS.append(("random vs brute force", t))
def t():
    for k in (0, 5):
        try:
            S.sliding_median([1,2,3], k)
        except ValueError:
            continue
        raise AssertionError(f"k={k}: expected ValueError")
TESTS.append(("invalid k", t))
def t():
    rnd = random.Random(2)
    a = [rnd.random() for _ in range(200_000)]
    t0 = time.perf_counter()
    out = S.sliding_median(a, 1000)
    dt = time.perf_counter() - t0
    assert len(out) == 199_001
    assert dt < 5.0, f"too slow: {dt:.1f}s"
TESTS.append(("performance 200k/1000", t))
''',
    },
    {
        "id": "p3_topo_order",
        "prompt": """Write `topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]`.
- Nodes are 0..n-1. An edge (a, b) means a must come before b.
- Return the lexicographically smallest valid ordering.
- Duplicate edges may appear.
- If there is a cycle (including a self-loop), raise ValueError.
- Must handle n = 200_000 with 400_000 edges in about a second.""",
        "tests": r'''
import random, time, itertools
def smallest(n, edges):
    for p in itertools.permutations(range(n)):
        pos = {v: i for i, v in enumerate(p)}
        if all(pos[a] < pos[b] for a, b in edges):
            return list(p)
    return None
def t():
    assert S.topo_order(0, []) == []
    assert S.topo_order(3, []) == [0, 1, 2]
TESTS.append(("empty / no edges", t))
def t():
    assert S.topo_order(4, [(3, 0)]) == [1, 2, 3, 0]
TESTS.append(("lexicographic", t))
def t():
    assert S.topo_order(3, [(2, 1), (2, 1), (1, 0)]) == [2, 1, 0]
TESTS.append(("duplicate edges", t))
def t():
    for n, e in [(1, [(0, 0)]), (3, [(0, 1), (1, 2), (2, 0)]), (4, [(0, 1), (2, 3), (3, 2)])]:
        try:
            S.topo_order(n, e)
        except ValueError:
            continue
        raise AssertionError(f"no ValueError for {e}")
TESTS.append(("cycles", t))
def t():
    rnd = random.Random(3)
    for _ in range(60):
        n = rnd.randint(1, 6)
        perm = list(range(n)); rnd.shuffle(perm)
        edges = []
        for _ in range(rnd.randint(0, 8)):
            i, j = sorted(rnd.sample(range(n), 2)) if n > 1 else (0, 0)
            if i != j:
                edges.append((perm[i], perm[j]))
        assert S.topo_order(n, edges) == smallest(n, edges), (n, edges)
TESTS.append(("random vs brute force", t))
def t():
    rnd = random.Random(4)
    n = 200_000
    perm = list(range(n)); rnd.shuffle(perm)
    edges = []
    for _ in range(400_000):
        i = rnd.randrange(n - 1); j = rnd.randrange(i + 1, min(n, i + 50))
        edges.append((perm[i], perm[j]))
    t0 = time.perf_counter()
    out = S.topo_order(n, edges)
    dt = time.perf_counter() - t0
    pos = [0] * n
    for idx, v in enumerate(out):
        pos[v] = idx
    assert len(out) == n and all(pos[a] < pos[b] for a, b in edges)
    assert dt < 5.0, f"too slow: {dt:.1f}s"
TESTS.append(("performance 200k/400k", t))
''',
    },
    {
        "id": "p4_gather_limited",
        "prompt": """Write `async def gather_limited(funcs, limit: int) -> list`, where funcs is a list of zero-argument callables that each return an awaitable (e.g. `lambda: fetch(url)`).
- Run them with at most `limit` running at the same time. Start the next one as soon as any slot frees up (not in fixed batches).
- Return the results in the same order as funcs.
- If any call raises: cancel all still-running calls, do not start any new ones, and re-raise that first exception.
- Raise ValueError if limit < 1. An empty list returns [].
Use asyncio only.""",
        "tests": r'''
import asyncio, time
def run(coro):
    return asyncio.run(asyncio.wait_for(coro, 10))
def t():
    async def main():
        async def job(i):
            await asyncio.sleep(0.01 * ((i * 7) % 5))
            return i * i
        return await S.gather_limited([lambda i=i: job(i) for i in range(12)], 3)
    assert run(main()) == [i * i for i in range(12)]
TESTS.append(("results in order", t))
def t():
    state = {"now": 0, "peak": 0}
    async def main():
        async def job():
            state["now"] += 1
            state["peak"] = max(state["peak"], state["now"])
            await asyncio.sleep(0.02)
            state["now"] -= 1
        await S.gather_limited([job for _ in range(20)], 4)
    run(main())
    assert state["peak"] == 4, f"peak concurrency {state['peak']}, want 4"
TESTS.append(("respects limit", t))
def t():
    async def main():
        async def job(d):
            await asyncio.sleep(d)
        funcs = [lambda: job(0.30)] + [lambda: job(0.05) for _ in range(6)]
        t0 = time.perf_counter()
        await S.gather_limited(funcs, 2)
        return time.perf_counter() - t0
    dt = run(main())
    assert dt < 0.40, f"took {dt:.2f}s: looks like fixed batches"
TESTS.append(("sliding window, not batches", t))
def t():
    state = {"started": 0, "cancelled": 0, "finished": 0}
    class Boom(Exception):
        pass
    async def main():
        async def bad():
            state["started"] += 1
            await asyncio.sleep(0.01)
            raise Boom("x")
        async def slow():
            state["started"] += 1
            try:
                await asyncio.sleep(0.3)
                state["finished"] += 1
            except asyncio.CancelledError:
                state["cancelled"] += 1
                raise
        try:
            await S.gather_limited([bad] + [slow for _ in range(9)], 2)
        except Boom:
            await asyncio.sleep(0.4)
            return "raised"
        return "no exception"
    assert run(main()) == "raised"
    assert state["started"] <= 3, f"started {state['started']} after failure"
    assert state["finished"] == 0 and state["cancelled"] >= 1, state
TESTS.append(("error: cancel + stop", t))
def t():
    async def main():
        assert await S.gather_limited([], 3) == []
        async def one():
            return 1
        assert await S.gather_limited([one, one], 10) == [1, 1]
        try:
            await S.gather_limited([one], 0)
        except ValueError:
            return True
        return False
    assert run(main()), "limit=0 should raise ValueError"
TESTS.append(("edge cases", t))
''',
    },
]
