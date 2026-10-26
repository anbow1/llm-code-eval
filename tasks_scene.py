"""
Scene task set (run with --suite scene): one larger Three.js task with the weight on graphics quality.
The automatic checks test what can be measured (the boat really floats on the same waves the shader draws,
the leaves sway, shadows, fog, tone mapping, a sky gradient, a fixed camera for the gallery); how good the
picture looks is compared by eye on the gallery image (make_top10.py) and the standalone scene.html of each run.
Uses the same system prompt as tasks.py.
"""
import io

from tasks import PY_SYSTEM, THREE_SYSTEM  # noqa: F401  (re-exported)

VIEWPORT = (1280, 720)

# Samples the boat and the waves at n frames. The sample is taken inside renderer.render, i.e. after the scene placed
# the boat for that frame, so the boat's position and time() belong to the same moment however slow the renderer is.
FLOAT_JS = r"""
async (n) => {
  const o = window.__ocean, boat = window.__boat, r = window.__renderer;
  if (!o || typeof o.heightAt !== 'function' || typeof o.time !== 'function' || !boat || !boat.isObject3D || !r)
    return null;
  const V = boat.position.constructor, Q = boat.quaternion.constructor;
  const out = [];
  let lastT = -1e9;
  const orig = r.render;
  r.render = function (...args) {
    try {
      const t = o.time();
      if (out.length < n && t - lastT >= 0.2) {  // at most one sample per 0.2 s of wave time
        lastT = t;
        boat.updateMatrixWorld(true);
        const p = new V(); boat.getWorldPosition(p);
        const q = boat.getWorldQuaternion(new Q());
        // heightAt at time() and up to 0.5 s earlier, in case the shader time and time() differ by a step
        const hs = [];
        for (let lag = 0; lag <= 0.5001; lag += 0.05) hs.push(o.heightAt(p.x, p.z, t - lag));
        out.push({ y: p.y, x: p.x, z: p.z, h: hs[0], hs, t, q: [q.x, q.y, q.z, q.w] });
      }
    } catch (e) { /* keep rendering */ }
    return orig.apply(this, args);
  };
  const t0w = performance.now();
  while (out.length < n && performance.now() - t0w < 30000) await new Promise(res => setTimeout(res, 100));
  r.render = orig;
  // the waves themselves: height at a few points now and a second later
  const t0 = o.time();
  const pts = [[30, 30], [-40, 25], [50, -35], [-60, -60], [70, 10]];
  const a = pts.map(([x, z]) => o.heightAt(x, z, t0));
  const b = pts.map(([x, z]) => o.heightAt(x, z, t0 + 1.0));
  // wave height over a wider set of points and times, for "are the waves big enough to see"
  const grid = [];
  for (const dt of [0, 0.7, 1.9]) for (let i = 0; i < 12; i++) {
    const ang = i * 0.5236, rad = 30 + 7 * i;
    grid.push(o.heightAt(rad * Math.cos(ang), rad * Math.sin(ang), t0 + dt));
  }
  let meshes = 0;
  boat.traverse(c => { if (c.isMesh) meshes++; });
  let boatShadow = false;
  boat.traverse(c => { if (c.isMesh && c.castShadow) boatShadow = true; });
  return { samples: out, a, b, grid, meshes, boatShadow };
}
"""

LEAVES_JS = r"""
async () => {
  const l = window.__leaves;
  if (!l || !l.isInstancedMesh) return null;
  const sum = () => { const a = l.instanceMatrix.array; let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * ((i % 13) + 1); return s; };
  const s0 = sum();
  await new Promise(r => setTimeout(r, 2500));  // long enough for a frame even in a slow software renderer
  return { count: l.count, changed: Math.abs(sum() - s0) > 1e-4, castShadow: !!l.castShadow };
}
"""

WORLD_JS = r"""
() => {
  const r = window.__renderer, s = window.__scene, c = window.__camera, sun = window.__sun, isl = window.__island;
  const out = {};
  out.shadowMap = !!(r && r.shadowMap && r.shadowMap.enabled);
  out.sunShadow = !!(sun && sun.isDirectionalLight && sun.castShadow);
  out.toneMapping = r ? r.toneMapping : 0;
  out.fog = !!(s && s.fog);
  if (c) {
    const d = c.getWorldDirection(new c.position.constructor());
    const want = new c.position.constructor(0 - c.position.x, 2 - c.position.y, 0 - c.position.z).normalize();
    out.cam = [c.position.x, c.position.y, c.position.z, d.dot(want)];
  }
  if (isl && isl.isObject3D) {
    let recv = false;
    isl.traverse(o => { if (o.isMesh && o.receiveShadow) recv = true; });
    isl.updateMatrixWorld(true);
    // world-space bounds from the geometry vertices (Box3 needs the THREE namespace, which is bundled away)
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    isl.traverse(o => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const p = o.geometry.attributes.position, e = o.matrixWorld.elements;
      const step = Math.max(1, Math.floor(p.count / 5000));
      for (let i = 0; i < p.count; i += step) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const w = [e[0]*x + e[4]*y + e[8]*z + e[12], e[1]*x + e[5]*y + e[9]*z + e[13], e[2]*x + e[6]*y + e[10]*z + e[14]];
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], w[k]); hi[k] = Math.max(hi[k], w[k]); }
      }
    });
    out.island = { lo, hi, recv };
    // where the island's middle lands on screen (0..1), to check it is lit and not a black silhouette
    if (c) {
      const m = new c.position.constructor((lo[0] + hi[0]) / 2, Math.max(0.5, hi[1] * 0.4), (lo[2] + hi[2]) / 2);
      m.project(c);
      out.islandScreen = [(m.x + 1) / 2, (1 - m.y) / 2];
    }
  }
  return out;
}
"""


def _region_colors(png, box):
    from PIL import Image
    img = Image.open(io.BytesIO(png)).convert("RGB")
    w, h = img.size
    crop = img.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))).resize((80, 20))
    return len(crop.getcolors(80 * 20) or [])


def _region_luma(png, cx, cy, half=0.035):
    """Mean brightness (0-255) of a small box around a screen point given in 0..1 coordinates."""
    from PIL import Image, ImageStat
    img = Image.open(io.BytesIO(png)).convert("L")
    w, h = img.size
    box = (int(max(0, cx - half) * w), int(max(0, cy - half) * h), int(min(1, cx + half) * w), int(min(1, cy + half) * h))
    if box[2] <= box[0] or box[3] <= box[1]:
        return 0.0
    return ImageStat.Stat(img.crop(box)).mean[0]


def _region_changed(a, b, box):
    from PIL import Image, ImageChops
    ia, ib = (Image.open(io.BytesIO(x)).convert("RGB") for x in (a, b))
    w, h = ia.size
    bx = (int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))
    d = ImageChops.difference(ia.crop(bx), ib.crop(bx)).convert("L").point(lambda v: 255 if v > 8 else 0)
    return d.histogram()[255] > 0.01 * (bx[2] - bx[0]) * (bx[3] - bx[1])


def check_ocean_island(ctx):
    res = {}
    f = ctx.eval(FLOAT_JS, 12)  # 12 frames, at least 0.2 s of wave time apart
    if f and f["samples"]:
        S = f["samples"]
        ys = [s["y"] for s in S]

        def spread_at(i):  # how far the boat strays from heightAt (plus a constant offset) at lag i
            d = [s["y"] - s["hs"][i] for s in S]
            m = sum(d) / len(d)
            return max(abs(x - m) for x in d), m
        spread, mean = min(spread_at(i) for i in range(len(S[0]["hs"])))
        res["ocean_api"] = all(isinstance(v, (int, float)) for v in f["a"] + f["b"]) and len(S) >= 6 \
            and S[-1]["t"] > S[0]["t"]
        res["waves_move"] = max(abs(x - y) for x, y in zip(f["a"], f["b"])) > 0.05
        res["waves_visible"] = max(f["grid"]) - min(f["grid"]) > 0.5  # crest to trough about 0.5 units or more
        # the boat sits on the same surface: its height follows heightAt with a constant offset, to within a fifth
        # of how far it moves (a boat on its own sine, or on other waves than heightAt reports, drifts off)
        rise = max(ys) - min(ys)
        res["boat_floats"] = rise > 0.1 and spread <= max(0.03, 0.2 * rise) and abs(mean) < 2.0
        qs = [s["q"] for s in S]
        tilt = max(1 - abs(sum(a * b for a, b in zip(qs[0], q))) for q in qs[1:])
        res["boat_tilts"] = tilt > 1e-5  # about 0.5 degrees or more
        res["boat_built"] = f["meshes"] >= 3
        res["boat_casts_shadow"] = f["boatShadow"]
    else:
        for k in ("ocean_api", "waves_move", "waves_visible", "boat_floats", "boat_tilts", "boat_built",
                  "boat_casts_shadow"):
            res[k] = False
    lv = ctx.eval(LEAVES_JS)
    res["palm_leaves"] = bool(lv) and lv["count"] >= 30
    res["leaves_sway"] = bool(lv) and lv["changed"]
    w = ctx.eval(WORLD_JS) or {}
    isl = w.get("island")
    res["island"] = bool(isl) and 4 <= isl["hi"][1] <= 20 and (isl["hi"][0] - isl["lo"][0]) >= 20 \
        and (isl["hi"][2] - isl["lo"][2]) >= 20 and abs((isl["hi"][0] + isl["lo"][0]) / 2) < 10
    res["shadows"] = w.get("shadowMap", False) and w.get("sunShadow", False) and bool(isl) and isl["recv"]
    res["fog_and_tone_mapping"] = w.get("fog", False) and (w.get("toneMapping") or 0) != 0
    cam = w.get("cam")
    res["camera_view"] = bool(cam) and abs(cam[0] - 35) < 0.5 and abs(cam[1] - 12) < 0.5 \
        and abs(cam[2] - 35) < 0.5 and cam[3] > 0.995
    # the picture: a sky gradient at the top, moving water at the bottom, a rich image overall
    res["sky_gradient"] = _region_colors(ctx.shot, (0, 0, 1, 0.15)) >= 8
    res["water_animates"] = _region_changed(ctx.shot0, ctx.shot, (0, 0.8, 1, 1))
    res["picture_rich"] = _region_colors(ctx.shot, (0, 0, 1, 1)) >= 120
    # the water is really on screen: the bottom quarter is not a flat background (a failed water shader leaves one
    # color there), and the island is lit, not a near-black silhouette
    res["water_visible"] = _region_colors(ctx.shot, (0, 0.75, 1, 1)) >= 50
    sp = (w.get("islandScreen") or [None, None]) if isl else [None, None]
    res["island_lit"] = sp[0] is not None and 0 <= sp[0] <= 1 and 0 <= sp[1] <= 1 \
        and _region_luma(ctx.shot, sp[0], sp[1]) >= 25
    return res


THREE_TASKS = [
    {
        "id": "s1_ocean_island",
        "viewport": VIEWPORT,
        "standalone": True,          # also save scene.html: one file that opens in any browser
        "gallery": [2000, 5000],
        "shot_gap": 2500,
        "resize_wait": 3000,         # ms after the window resize before reading the new size            # ms between the two screenshots compared for motion (slow software rendering)     # extra screenshots (ms after the first) for the gallery image
        "prompt": """Build a realistic, good-looking 3D scene: a small boat rocking on an ocean next to a tropical island.
Graphics quality matters: aim for a picture that looks like a game, not a demo.

Ocean
- A large water surface (at least 400 x 400 units, centered on the origin) animated in a vertex shader (ShaderMaterial, or a
  built-in material extended with onBeforeCompile). Use a sum of at least 3 directional waves (Gerstner or sine) with
  different directions, wavelengths and speeds; waves must be clearly visible (crest-to-trough height about 0.5 to 2 units).
- Shade the water well: normals from the waves, a deep/shallow color, Fresnel reflection of the sky, a specular highlight
  from the sun; foam near crests or near the shore is a plus.
- Expose the same wave function to JavaScript:
    (window as any).__ocean = { heightAt(x: number, z: number, t: number): number, time(): number }
  heightAt returns the vertical displacement your shader applies at the undisplaced position (x, z) at wave time t
  (for Gerstner waves ignore the small horizontal shift). time() returns the wave time in seconds that the shader uses
  right now. The two must match the picture.

Boat
- A boat built from primitives (hull, deck or cabin, mast and sail; at least 3 meshes in one Group), about 4 units long,
  floating at about (12, 0, 14) and staying within 25 units of the origin (it may drift slowly).
- Every frame its height follows the water: y = heightAt(x, z, time()) plus a constant offset, and its pitch and roll
  follow the wave slope (sample heightAt in front of, behind and beside the hull).
- Expose the Group as (window as any).__boat. Its meshes cast shadows.

Island
- A procedural island centered on the origin: about 30 to 50 units across, peak 5 to 15 units above the water, sloping
  into the sea, with sand near the water and grass or rock higher up (vertex colors, a shader, or several materials).
- At least 5 palm trees on it: a curved trunk and a crown of leaves. Draw ALL leaves of all palms as ONE InstancedMesh
  with at least 30 instances, and sway them in the wind by updating the instance matrices every frame
  (instanceMatrix.needsUpdate = true). Expose it as (window as any).__leaves.
- Expose the island (Mesh or Group) as (window as any).__island; it receives shadows.

Light and atmosphere
- A sky: a gradient sky dome or the Sky addon ('three/addons/objects/Sky.js'), with a visible sun position.
- A DirectionalLight as the sun, matching the sky's sun direction, casting shadows (renderer.shadowMap.enabled, a shadow
  camera that covers the island and the boat). Expose it as (window as any).__sun. Add hemisphere or ambient fill light.
- scene.fog that blends the far ocean into the horizon, ACESFilmic (or AgX) tone mapping, sRGB output.

Camera and performance
- PerspectiveCamera at exactly (35, 12, 35) looking at (0, 2, 0); keep this view (OrbitControls are allowed if they start
  there and do not move by themselves).
- It must run smoothly on a mid-range GPU: keep the ocean grid at or below 256 x 256 segments and shadow maps at or below
  2048 x 2048.""",
        "check": check_ocean_island,
    },
]

PY_TASKS = []
