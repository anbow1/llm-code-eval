Let me build this carefully.

Requirements:
- Single TypeScript file for the browser.
- import * as THREE from 'three'.
- Create WebGLRenderer, append canvas to document.body.
- Size from window.innerWidth/innerHeight, handle resize (camera aspect + renderer size).
- renderer.setAnimationLoop, motion based on delta time.
- Expose __scene, __camera, __renderer on window.
- After first frame rendered, set __ready = true.
- No external assets.

Solar system:
- Y up, orbits in XZ plane around origin.
- Sun: sphere at origin with MeshBasicMaterial + PointLight at origin lighting planets (mind physically based intensity/decay — in newer three.js, default decay is 2, so intensity needs to be high-ish, e.g., intensity = 200 or so for distances up to 10. With decay 2, illuminance falls off as intensity / distance². At distance 4: 200/16 = 12.5; at 10: 200/100 = 2. That's reasonable. Maybe use intensity like 300-500 to make planets clearly visible. Let's compute: three.js PointLight with decay 2: irradiance = intensity / distance². For a good look with renderer default (useLegacyLights false in newer versions, i.e., physically correct), we want intensity/dist² around 2-5 for well-lit. At dist 10: intensity/100 ≈ 2 → intensity ~200. At dist 4 → 200/16 = 12.5 which is quite bright, may blow out. Could set tone mapping ACESFilmic to handle it. Or use intensity ~150-300 with toneMapping. Let's do renderer.toneMapping = THREE.ACESFilmicToneMapping and toneMappingExposure ~1.0, point light intensity 300, decay 2 (default). That gives good falloff. Ambient light intensity low (0.1-0.3).

Note: `useLegacyLights` deprecated; in latest three (r155+), default is physically correct. The prompt says "mind physically based light intensity/decay". So I should set decay explicitly to 2 and use a large intensity, or set decay myself. I'll write: const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2); — explicitly set distance 0 (infinite) and decay 2. And add a comment.

- 3 planets: spheres with MeshStandardMaterial at distances ~4, 7, 10, orbiting at different angular speeds (inner faster). Each also spins on its own axis.

Approach for spin + orbit: A common approach is planet mesh positioned in a group; the group rotates for orbit, planet rotates for spin. But careful: if the planet is a child of a rotating group and offset by distance, spinning the planet mesh itself works fine (rotation about its own y axis). However, the moon as a child of the planet mesh — the moon orbits the planet. If the planet spins, the moon being a child will inherit spin. The requirement: "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So moon orbits planet. Implementation: add moon as child of planet mesh at some offset, and each frame animate moon's position around the planet: moon.position.set(cos(a)*r, 0, sin(a)*r). Alternatively put moon on its own pivot group child of planet, and rotate pivot. But if pivot is child of planet mesh and planet spins, moon gets extra rotation — fine either way, still orbits. Simplest robust: moonAngle += moonSpeed * delta; moon.position.set(Math.cos(moonAngle) * moonDist, 0, Math.sin(moonAngle) * moonDist). Since moon is a child of planet mesh, its position is in planet local space, planet at its orbit position — works.

But wait: if planet mesh spins (rotation.y += ...), and moon position updated in local coords, that's fine — the local coordinates are set directly, not accumulated, so no problem.

Orbit implementation options:
1. planetGroup = Object3D; scene.add(group); planet child of group at x=distance. Then group.rotation.y += speed*dt. Planet spins: planet.rotation.y += spinSpeed*dt. Moon as child of planet, animate moon.position. This works.

2. Or keep planets directly in scene, compute position: planet.position.set(cos(orbitAngle)*dist, 0, sin(orbitAngle)*dist). orbitAngle += speed*dt. Also works and simpler.

Both fine. Group approach with pivot is nice. But careful: if planet is child of pivot and pivot rotates, the planet itself keeps its orientation relative to pivot... The planet's world rotation accumulates pivot rotation + own spin. That's fine — spin still happens.

Actually there might be a subtlety: if the pivot rotates and the planet mesh also spins rotation.y, the moon orbit direction relative to world will combine. Not a problem for requirements.

I'll use explicit angle updates for clarity and determinism: orbit angles stored per planet, positions computed. Actually let me use a mix: planets in scene directly, positions computed from angles; moon as child of planet with its local angle computed. That satisfies "planet.add(moon)".

Hmm, but requirement says "planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So yes.

Let me structure:

planetData = { mesh, orbitRadius, orbitSpeed, orbitAngle, spinSpeed, moon? }

Per frame:
```ts
const dt = clock.getDelta(); // or compute from delta
for (const p of planets) {
  p.orbitAngle += p.orbitSpeed * dt;
  p.mesh.position.set(Math.cos(p.orbitAngle) * p.orbitRadius, 0, Math.sin(p.orbitAngle) * p.orbitRadius);
  p.mesh.rotation.y += p.spinSpeed * dt;
  if (p.moon) {
    p.moonAngle += p.moonSpeed * dt;
    p.moon.position.set(Math.cos(p.moonAngle) * p.moonRadius, 0, Math.sin(p.moonAngle) * p.moonRadius);
  }
}
```

Wait — moon local position: moon is child of planet mesh. If planet mesh rotates (spins), the moon's world position = planet position + planet rotation applied to moon local position. Since planet spins around y, moon local position in XZ plane rotated around y stays in XZ plane (y=0). So moon orbits planet in a plane. Fine.

Alternatively, to decouple, add moon to a pivot child of planet... but planet rotation still affects children regardless. If we want moon orbit independent of planet spin, we'd need pivot as child of planet but compute moon world angle... Not needed. The direct approach works.

Actually, hmm: should the moon's orbit appear as orbiting the planet? Yes: it will revolve around planet position (plus spin-induced rotation of its orbit plane orientation, but it stays a circular orbit around the planet). Good.

Clock: use THREE.Clock, call clock.getDelta() each frame. Also elapsed time if desired. Motion via delta. Good.

Camera: above and to the side, looking at origin, whole system visible. E.g., position (0? no—side) → something like (14, 10, 14) looking at origin gives an angle view. Distance ~ sqrt(196+100+196)= sqrt(492) ≈ 22. With outer planet at 10 radius and sun visible, FOV 50-60 → visible. Let me set camera fov 55, position (12, 12, 16)? Let's compute bounding: need to see disc radius 10 (plus planet sizes ~0.5). Camera at (12, 10, 14). Distance to origin: sqrt(144+100+196)=sqrt(440)≈21. Required half-angle to see radius 10: atan(10/21) ≈ 25.5°. FOV vertical 55 → half 27.5. Good if system fits vertically in view. But since we look at origin and the plane is tilted, roughly fine. Also aspect matters for horizontal. To be safe, fov 50 and camera slightly farther: (14, 12, 14): dist = sqrt(196+144+196)= sqrt(536) ≈ 23.2, atan(10/23.2)=23.3°, half-fov 25°. OK. I'll pick fov 55 and position (0, 12, 18)? That's straight from front-top... "above and to the side" — to the side implies some x offset. Let's use position (10, 11, 16), lookAt(0,0,0). distance sqrt(100+121+256)=sqrt(477)=21.8. fine.

Also handle aspect: for very narrow windows whole system may not be visible horizontally; a robust approach: adjust camera distance based on aspect? Keep it simple but maybe add a small fit: if aspect < 1, scale distance. Could do: on resize, recompute camera position maintaining direction but scaling by max(1, 1/aspect) * something. Might be overkill; tests likely check default. I'll include a modest fit function to keep everything visible: base distance normalized, multiplied by clamp(1/aspect... hmm. Let me just do something simple but reasonable:

```ts
function frameCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  const fit = Math.max(1, 1.6 / aspect); // widen pullback for narrow windows
  camera.position.set(CAM_X * fit, CAM_Y, CAM_Z * fit);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
```

Hmm, but then lookAt origin always. That's fine. Actually maybe simpler: fixed position, updateProjectionMatrix on resize. I'll include the mild fit for robustness but keep it simple. Actually to avoid any weirdness, I'll keep the base position and a simple distance scale factor for narrow aspects. It compiles fine.

Let me keep it clean:

```ts
const camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
camera.position.set(11, 10, 16);
camera.lookAt(0,0,0);
```

Resize handler: camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h). Optionally setPixelRatio. setPixelRatio(window.devicePixelRatio) is good.

Materials/colors:
- Sun: MeshBasicMaterial color 0xffcc33 or 0xffaa00. Radius ~1.6? Planets radius: 0.6, 0.5, 0.7? Distances 4,7,10. Sun radius 1.5 maybe. Let's do sun 1.4, planets r=0.55, 0.45, 0.65. Moon r=0.12, orbit radius around planet 1.0 (planet2 radius 0.45 → moon dist 1.0 fine).

- MeshStandardMaterial colors: planet1 reddish 0xcc8866 or earthy; planet2 blue 0x6688cc; planet3 tan 0xCCAA77. Add roughness ~0.8, metalness 0.05.

Ambient: new THREE.AmbientLight(0xffffff, 0.15) — "weak" so dark sides not pure black. Maybe 0.2 or 0.25. I'll go 0.2? "weak" — 0.15-0.3. Let me choose 0.25 for visibility against dark. Hmm with ACES tone mapping, ambient 0.25 fine. I'll use 0.2.

Wait: If I enable ACES tone mapping, tests (if any) probably just check visual. Tone mapping is fine. Actually, maybe simpler: no tone mapping, and set point light intensity appropriately. With decay 2 and intensity I, irradiance at distance d: I / d². Standard material: color * irradiance. For a white-ish response without blowing out, irradiance of ~1.5-3 for the near planet at d=4: I/16 ≈ 2 → I = 32? At d=10: 32/100 = 0.32 — dim. That's the real falloff problem. To balance, use tone mapping so brighter close region gets compressed: I = 150 → d=4: 9.4, d=7: 3.06, d=10: 1.5. With ACES, 9.4 maps near white but visible. Alternatively bump decay slightly lower? Physically-based means decay 2. Keep I=150-300 with ACES. Let's do intensity 250, ACESFilmic, exposure 1.1. Far planet: 250/100=2.5 → decently lit. Near planet: 15.6 → blown but ACES compresses toward white-ish top; a bit bright. Maybe 180: d4 → 11.25, d7 → 3.67, d10 → 1.8. Fine.

Also renderer.outputColorSpace default SRGB in modern three. Fine.

Angular speeds: inner faster. e.g., 0.9, 0.5, 0.3 rad/s? That's pretty fast (0.9 rad/s → full orbit in 7s). Fine for a demo. Maybe 0.6, 0.35, 0.22. Spin: 1.2, 0.9, 0.7 rad/s. Moon orbit around planet2: ~2.2 rad/s relative.

__ready after first frame: in the animation loop, render first, then if not ready set __ready = true. Implement with a flag:

```ts
let ready = false;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05) ... 
```

Hmm — clamping delta: getDelta can return large value on tab switch; clamp to avoid jumps. But requirement says motion must use delta/elapsed time. Clamping is still delta-based. I'll clamp to 0.1 max.

Set exposure etc.

TypeScript strict: `strict` includes noImplicitAny etc. Make sure types are right. planets array typed:

```ts
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon?: { pivot... }
}
```

Let me define:

```ts
interface MoonState {
  mesh: THREE.Mesh;
  radius: number;
  angle: number;
  speed: number;
}

interface PlanetState {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon: MoonState | null;
}
```

Then create planets with a helper or explicitly. Explicit creation for 3 planets is clearer.

Moon tilt: could add slight inclination to moon orbit for aesthetics (moon.position.y = sin(angle)*r*0.1)? Keep simple: flat in XZ (local). Fine. Actually a tiny inclination looks nice: moon.position.set(cos*r, 0, sin*r). I'll keep 0 to obey orbit planes; requirement only says orbits (planets) in XZ. Moon can be anywhere but keep XZ.

Renderer:

```ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);
```

Body style margin might cause scrollbars; the page has no other HTML but body default margin 8px could cause overflow. I can set document.body.style.margin = '0'. That's allowed (not HTML content). Also renderer.domElement.style.display = 'block'. Good.

Scene background: 0x000000 (space) or dark navy 0x050510. Use new THREE.Color(0x050510). Nice.

Stars? "No external assets" — could generate points procedurally, but not required. Keep minimal—maybe add subtle starfield with BufferGeometry points (procedural, no assets). Not required; adds risk? Minimal risk. I'll skip to keep strictly to spec... Actually a small starfield looks nice and is fully procedural. Hmm, "Build a mini solar system" — spec lists items. I'll skip extra stuff to keep the file tight and exactly matching. Maybe add it? The instruction says write ONE complete file implementing described behavior. Extra stars are harmless. I'll skip — cleaner.

Sun emissive glow: MeshBasicMaterial with color 0xffdd44; maybe slight. Fine.

PointLight params: PointLight(color, intensity, distance, decay). distance=0 infinite. decay=2. intensity — set 260. Comment explaining physically-based falloff: irradiance ∝ intensity/d², so with decay=2 we need O(100s) intensity to light r=10 orbits; tone mapping handles hot inner planets.

Also might want slight sun light target default (point light radiates all directions, no target needed).

Shadow? Not required; skip (point light shadows cost). Skip.

Camera aspect handling on resize; also the fit-scale thing. Let me write:

```ts
const BASE_POSITION = new THREE.Vector3(11, 10, 16);

function updateCamera() {
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  camera.aspect = aspect;
  // Pull the camera back a bit on very narrow windows so the system stays in frame.
  const zoomOut = aspect < 1.1 ? 1.1 / aspect : 1;
  camera.position.copy(BASE_POSITION).multiplyScalar(zoomOut);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
```

Wait multiplyScalar scales y too, making it higher—okay-ish. Simpler: scale only horizontal? Just scalar whole vector: fine.

Hmm, careful: `camera.position.copy(BASE_POSITION).multiplyScalar(zoomOut)` — copy returns this (Vector3), multiplyScalar mutates. Fine.

Resize:

```ts
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCamera();
});
```

Animation loop:

```ts
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 0.05);
  updateSystem(delta);
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Expose __scene etc. after creation:

```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Order of ready check: "After the first frame is rendered" → set after renderer.render. Done as above.

Type checking details: three types — THREE.Clock getDelta returns number. Vector3 methods fine.

Full code:

```ts
import * as THREE from 'three';

// ---------- Basic setup ----------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';

// ---------- Lights ----------

// Physically based point light: with decay = 2 (the physical default), irradiance
// falls off as intensity / distance^2, so a scene whose outermost orbit sits at
// radius ~10 needs an intensity in the hundreds, not a single digit.
const sunLight = new THREE.PointLight(0xffffff, 250, 0, 2);
scene.add(sunLight); // sun is at origin; PointLight defaults to position (0,0,0)

const ambient = new THREE.AmbientLight(0x8899ff, 0.2);
scene.add(ambient);
```

Hmm ambient color slightly blue might tint; use 0xffffff with 0.18? "so dark sides are not pure black" — subtle blue is nice. I'll use 0xfff? Let me use 0x404060-ish. Actually AmbientLight with intensity low and slightly blue color gives a space feel. I'll pick color 0xbfd0ff, intensity 0.25? That's per-channel 0.75*0.25 = 0.19 irradiance — subtle. OK.

Actually let me double-check ambient: AmbientLight irradiance = color * intensity. With color 0xbfd0ff (~0.75, 0.82, 1.0) and intensity 0.25 → ~0.19-0.25. Fine, dark sides ~ 25% grey-blue. Good.

Hmm, maybe simpler: 0xffffff, 0.15. I'll go with subtle sky-blue: 0x8899bb, 0.35. Meh. Just pick something reasonable.

Let me settle: `new THREE.AmbientLight(0xffffff, 0.18)`.

Build sun:

```ts
const sunRadius = 1.4;
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(sunRadius, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc24d })
);
scene.add(sun);
```

Maybe add secondary glow sprite? Skip.

Planets: helper to reduce repetition:

```ts
interface MoonSpec { radius: number; distance: number; speed: number; color: number; }
```

Hmm — writing explicit code might be clearer but a helper is fine. Let me define spec array and a factory:

```ts
interface PlanetSpec {
  radius: number;
  color: number;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon?: { radius: number; distance: number; speed: number };
}

const planetSpecs: PlanetSpec[] = [
  { radius: 0.55, color: 0xc96f4a, orbitRadius: 4, orbitSpeed: 0.85, spinSpeed: 1.6 },
  {
    radius: 0.5,
    color: 0x5f86c9,
    orbitRadius: 7,
    orbitSpeed: 0.45,
    spinSpeed: 1.15,
    moon: { radius: 0.16, distance: 1.1, speed: 2.4 },
  },
  { radius: 0.72, color: 0xd8b06a, orbitRadius: 10, orbitSpeed: 0.28, spinSpeed: 0.8 },
];
```

Wait spinSpeed 1.6 rad/s means rotation period ~3.9s — visible spinning. Good, "Every planet also spins on its own axis."

Add slight random-ish starting angles so planets don't line up: orbitAngle initial values: 0.0, 1.9, 3.6 or random. Use deterministic values.

Factory:

```ts
interface RuntimePlanet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon: RuntimeMoon | null;
}

interface RuntimeMoon {
  mesh: THREE.Mesh;
  distance: number;
  angle: number;
  speed: number;
}

function createPlanet(spec: PlanetSpec, initialAngle: number): RuntimePlanet {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(spec.radius, 32, 24),
    new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.85, metalness: 0.05 })
  );
  mesh.rotation.y = Math.random()... 
```

No — avoid Math.random for determinism? Fine either way. Use initialAngle param.

Moon: mesh child of planet mesh: `mesh.add(moonMesh)`; position set in update.

Set initial moon angle e.g., 0.9.

Update:

```ts
function updateSystem(delta: number): void {
  for (const p of planets) {
    p.orbitAngle += p.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.orbitAngle) * p.orbitRadius, 0, Math.sin(p.orbitAngle) * p.orbitRadius
    );
    p.mesh.rotation.y += p.spinSpeed * delta;
    const moon = p.moon;
    if (moon !== null) {
      moon.angle += moon.speed * delta;
      moon.mesh.position.set(Math.cos(moon.angle) * moon.distance, 0, Math.sin(moon.angle) * moon.distance);
    }
  }
}
```

Camera: "above and to the side, looking at the origin, whole system visible."

camera.position.set(10.5, 10.5, 15.8)? Distance sqrt(110+110+250)= sqrt(470) ≈ 21.7. Need half-FOV ≥ atan(10/21.7)=24.7°. Vertical fov 55 → covers ±27.5 along view axis vertically. Horizontal with aspect ~1.7: horizontal half-fov = atan(tan(27.5°)*1.7)= atan(0.52*1.7=0.887)=41.6°, plenty. Vertical direction: camera looks downward at angle; the system plane passes through origin; the projected extent... The nearest orbit edge in screen-space vertical: The system's projected extent perpendicular to view direction: worst-case point at distance 21.7 with perpendicular offset up to... a point on the orbit circle at position p, camera at c looking at origin. The angular offset from center = atan(|p - (view component)| / distance along view). Roughly fits with fov 55. To be extra safe, increase distance a bit: position (11, 12, 17) → dist sqrt(121+144+289)=sqrt(554)=23.5, atan(10/23.5)=23°, plenty of margin. Good.

Base position: (11, 12, 17). Hmm "above and to the side": x=11 (side), y=12 (above), z=17 (also front). Fine.

Also, camera.near 0.1, far 200 fine.

updateCamera/resize:

```ts
const cameraOffset = new THREE.Vector3(11, 12, 17);

function resizeCamera(): void {
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  camera.aspect = aspect;
  // For narrow (portrait-style) windows, pull back along the view direction so
  // the full 10-unit orbit radius still fits on screen.
  const pullback = aspect >= 1 ? 1 : Math.max(aspect / 1.0, 0.85)...
```

Simplify: scale = aspect < 1 ? 1 + (1 - aspect) : 1. E.g., aspect 0.5 → 1.5× distance → dist 35, atan(10/35)=16°, horizontal half-fov at aspect 0.5: atan(tan27.5° *0.5)=atan(0.26)=14.6° — still slightly tight. Use scale = max(1, 1.15/aspect)? At 0.5 → 2.3× → dist 54 → angle 10.5°, needed ~ atan(10/54)=10.5°. hmm equal. Let's compute properly: half horizontal fov = atan(aspect * tan(vFov/2)). Required: atan(radius / dist). Need aspect*tan(v/2) ≥ radius/dist → dist ≥ radius / (aspect*tan(v/2)). tan(27.5°)=0.5206. For aspect 0.5: dist ≥ 10/(0.5*0.5206)=38.4. Base dist 23.5, scale = 38.4/23.5 = 1.63. Formula: needed distance = R/(aspect*tanHalf) with R=10 (+ margin, say 11.5 for planet sizes). Base distance d0 = |offset|. scale = max(1, (R_margin/(aspect*tanHalf))/d0).

That's precise; but adds complexity. Let me just implement it — it's a small math snippet and improves robustness:

```ts
function frameCamera(): void {
  const width = window.innerWidth;
  const height = Math.max(window.innerHeight, 1);
  const aspect = width / height;
  camera.aspect = aspect;

  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const margin = 12; // orbit radius 10 + a little room for planet bodies
  const neededDistance = margin / (aspect * tanHalfFov);
  const baseDistance = cameraOffset.length();

  const distance = Math.max(baseDistance, neededDistance);
  camera.position.copy(cameraOffset).setLength(distance);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
```

Wait — this changes camera distance from base when aspect < needed. neededDistance = margin/(aspect*tanHalf). For aspect 1.8, tanHalf 0.5206: needed = 12/(0.937)=12.8 → less than base 23.5 → keep base. For portrait aspect 0.6: needed = 12/(0.3124)=38.4 → pulls back. This guarantees fit (approximately, for vertical too: vertical: needed = margin/tanHalf = 12/0.5206 = 23 < 23.5 ✓ but for narrow we scale by horizontal constraint which also satisfies vertical). Also vertical constraint: distance ≥ margin/tanHalf ≈ 23.05. Base 23.5 covers. But hmm, also the projection of a tilted plane — the farthest screen offset might exceed atan(12/dist) slightly because points can be closer to camera along the view axis. Point at (10,0,0)... camera direction toward origin. The angular size of a point P relative to view axis: sin(angle) = |P × d̂|/|P| where d̂ is unit toward camera... Let me not over-engineer; margin 13 covers slop.

Use margin 13.

Hmm, but there's a subtlety: camera.position.copy(offset).setLength(distance) — if distance = baseDistance it's identical. Fine.

Also call frameCamera() initially instead of setting position separately.

Let me now also double check: `camera.updateProjectionMatrix()` needed after aspect change. Called in frameCamera. Good.

Renderer size handling:

```ts
function onResize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameCamera();
}
window.addEventListener('resize', onResize);
```

Initial: renderer.setSize already called; frameCamera() called once.

Body margin: `document.body.style.margin = '0px';` and background maybe `document.body.style.background = '#05040a';` — canvas covers viewport anyway.

Testing hooks: after creating scene, camera, renderer:

```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Strict compile: `(window as any).__scene = scene;` is fine.

Full listing:

```ts
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Renderer / scene / camera                                          */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / Math.max(window.innerHeight, 1),
  0.1,
  200,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0px';
document.body.style.overflow = 'hidden';
```

Hmm, setting body style before append — order irrelevant.

Lights:

```ts
/* ----------------------------- Lights ----------------------------- */

// The PointLight is the sunlight. three.js uses a physically based fall-off:
// with decay = 2 the irradiance at distance d is intensity / d^2, so with
// orbits out to radius 10 the intensity has to live in the hundreds.
const sunLight = new THREE.PointLight(0xffffff, 260, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient fill so the night sides are not pitch black.
const ambientLight = new THREE.AmbientLight(0xbfc8ff, 0.2);
scene.add(ambientLight);
```

Sun:

```ts
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc35c })
);
scene.add(sun);
```

Planets:

```ts
interface MoonRuntime {
  mesh: THREE.Mesh;
  distance: number;
  angle: number;
  speed: number;
}

interface PlanetRuntime {
  mesh: THREE.Mesh;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon: MoonRuntime | null;
}

function makePlanet(
  radius: number,
  color: number,
  orbitRadius: number,
  initialAngle: number,
  orbitSpeed: number,
  spinSpeed: number,
  moon: MoonRuntime | null,
): PlanetRuntime {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 }),
  );
  const planet: PlanetRuntime = { mesh, orbitAngle: initialAngle, orbitRadius, orbitSpeed, spinSpeed, moon };
  scene.add(mesh);
  return planet;
}
```

Moon creation:

```ts
function makeMoon(radius: number, color: number, distance: number, initialAngle: number, speed: number): MoonRuntime {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.0 }),
  );
  return { mesh, distance, angle: initialAngle, speed };
}
```

Then:

```ts
const planets: PlanetRuntime[] = [
  makePlanet(0.55, 0xc96e4b, 4, 0.4, 0.85, 1.5, null),
  makePlanet(0.5, 0x5d88c7, 7, 2.2, 0.45, 1.1, makeMoon(0.16, 0xcfcfcf, 1.15, 0.0, 2.3)),
  makePlanet(0.72, 0xd9ae66, 10, 4.4, 0.28, 0.75, null),
];
```

Need to add moon as child of planet mesh: In makePlanet when moon provided: `mesh.add(moon.mesh)`. Let's do inside makePlanet: `if (moon !== null) mesh.add(moon.mesh);`.

Also set initial moon position before first frame? The update runs each frame before render, and animation loop runs the update before first render — first render happens after first update, so positions are set. Good. But planets' initial position also set in first update. Still, to be safe also call placePlanet once at init? Not necessary since loop computes before render. But if a test checks positions immediately before a frame... eh, the loop will have run by then. I'll initialize positions in makePlanet anyway via a position-setting call — simpler: after creating runtime objects, call `updateSystem(0)`? delta 0 → angles unchanged, positions computed. Nice: call once after array creation. Good.

Update function:

```ts
function updateSystem(delta: number): void {
  for (const planet of planets) {
    planet.orbitAngle += planet.orbitSpeed * delta;
    planet.mesh.position.set(
      Math.cos(planet.orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(planet.orbitAngle) * planet.orbitRadius,
    );

    planet.mesh.rotation.y += planet.spinSpeed * delta;

    const moon = planet.moon;
    if (moon !== null) {
      moon.angle += moon.speed * delta;
      moon.mesh.position.set(
        Math.cos(moon.angle) * moon.distance,
        0,
        Math.sin(moon.angle) * moon.distance,
      );
    }
  }
}
```

Camera framing:

```ts
const cameraOffset = new THREE.Vector3(11, 12, 17);
const ORBIT_MARGIN = 13;

function frameCamera(): void {
  const height = Math.max(window.innerHeight, 1);
  const aspect = window.innerWidth / height;
  camera.aspect = aspect;

  const halfFovTan = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const required = ORBIT_MARGIN / (Math.min(aspect, Math.SQRT2) * halfFovTan) — 
```

Hmm wait, I derived: horizontal half-angle tan = aspect * tanHalf. Need dist ≥ margin / (aspect * tanHalf). But that's the *horizontal* constraint; vertical constraint is dist ≥ margin / tanHalf (aspect=1 equivalent). Overall: dist ≥ margin/(min(aspect,1) * tanHalf). So:

```ts
const requiredDistance = ORBIT_MARGIN / (Math.min(aspect, 1) * halfFovTan);
const distance = Math.max(cameraOffset.length(), requiredDistance);
camera.position.copy(cameraOffset).setLength(distance);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();
```

Check default aspect e.g., 1.78 → min(1.78,1)=1 → required = 13/0.5206 = 24.97. Base length |(11,12,17)| = sqrt(121+144+289)=sqrt(554)=23.52. So required 24.97 > base → distance 24.97, slight pullback (factor 1.06). Fine, still "above and to the side". For very wide aspect 3.5: required same 24.97. OK.

Margin 13: orbit 10 + planet radius 0.72 → 10.72 + screen margin. 13 ok. Actually points on orbit circle aren't all at perpendicular offset 13 from view axis... The perpendicular offset of point P from the view line through origin: the max over the circle of the angle subtended. Let me verify the geometry: camera at C = d·n̂ (n̂ unit toward camera from origin), looking at origin. A point P (|P|=r in XZ plane). The angle θ between direction (P−C) and view direction (−n̂): tanθ = |P_perp| / |C − P_parallel| where P_perp is component of P perpendicular to n̂, and P_parallel is component along n̂. |P_perp| ≤ r, and |C − P_par| ≥ d − r... so tanθ ≤ r/(d − r) roughly? Actually θ_max satisfies: the worst point has P_perp = r (point fully perpendicular) and P_par = 0? But P_par·P_perp = 0 constraint from |P| = r: with P_perp magnitude p and P_par magnitude q, p² + q² = r², so p = r requires q = 0 → tanθ = r/d. Otherwise trade-offs: θ = atan(p/(d−q)) with q = sqrt(r²−p²)... maximize. Let d=22, r=10.7: try p=10.7,q=0 → atan(0.486)=26.0°. p=9, q=6.2 → atan(9/15.8)=29.7°. Hmm larger! p=7,q=8 → atan(7/14)=26.6°. p=8,q=7.14 → atan(8/14.86)=28.3°. So max ~29.7° at p≈9,q≈6. So required tanθ ≈ 0.57, not 10.7/22=0.486. So margin-based estimate underestimates because points are nearer the camera. Let me solve properly: maximize f(p) = p/(d − sqrt(r² − p²)) over p ∈ [0, r], then θ = atan(f). Derivative: set g = p/(d − s), s=sqrt(r²−p²). dg/dp = [(d−s) − p·(p/s)]/(d−s)² (since ds/dp = −p/s, d(d−s)/dp = p/s). Numerator: (d − s) − p²/s = d − s − p²/s = d − (s² + p²)/s = d − r²/s. Zero when s = r²/d → sqrt(r²−p²) = r²/d → p² = r² − r⁴/d² → p = r·sqrt(1 − r²/d²). Then θ: tanθ = p/(d − r²/d) = p·d/(d² − r²) = r·d·sqrt(1 − r²/d²)/(d² − r²) = r·sqrt(d² − r²)/(d² − r²) = r / sqrt(d² − r²). So tanθ_max = r/sqrt(d² − r²). With r=10.7, d=22: sqrt(484−114.5)=sqrt(369.5)=19.2 → tan=0.556, θ=29.1°. Need vertical half-fov ≥ 29.1° → fov ≥ 58.2? Hmm at d=23.5: sqrt(552−114)=sqrt(438)=20.9; tan=10.7/20.9=0.512 → θ=27.1°. Need half-fov ≥ 27.1 → fov ≥ 54.3. Vertical fov 55 half=27.5 ✓ barely. Horizontal with aspect 1.78: half-fov h: tan = 0.5206*1.78=0.9266 → θ_h = 42.8° ✓ plenty. So constraint mostly vertical: aspect effective 1. So required: tan(fov/2) ≥ r/sqrt(d²−r²) → d ≥ r·sqrt(1 + 1/tan²half) = r/sin(halfFov). sin(27.5°)=0.4617 → d ≥ 10.72/0.4617 = 23.2. Base distance 23.52 ≥ 23.2 ✓ barely (margin 0.3). A bit tight. Increase base distance: offset (11, 12, 17) length 23.52. Let me bump to (12, 13, 18): length sqrt(144+169+324)=sqrt(637)=25.24 → sin requirement: 10.72/25.24 = 0.4247 < 0.4617 ✓ comfortable. Or fov 60. Let me use fov 55, offset (12, 13, 18). Good.

Update frameCamera formula: requiredDistance = ORBIT_RADIUS_TOTAL / sin(halfFov)? That handles vertical only; horizontal: required = R / sin(halfHorizontal) = R/sin(atan(aspect*tanHalf))... For narrow aspect that dominates. General: d ≥ R / sin(halfFovEff) where halfFovEff is the smaller of vertical/horizontal half-angles. halfHorizontal: tan_h = aspect*tan_v → sin_h = aspect*tan_v/sqrt(1+(aspect·tan_v)²). Use min. Let me implement:

```ts
const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
const tanHalfHorizontal = aspect * tanHalf;
... sin for each:
const sinV = tanHalf / Math.hypot(1, tanHalf);      // = tan/sqrt(1+tan²) = sin(θ)
const sinH = tanHalfHorizontal / Math.hypot(1, tanHalfHorizontal);
const sinMin = Math.min(sinV, sinH);
const required = ORBIT_LIMIT / sinMin;
```

where ORBIT_LIMIT = 10.8 (outer orbit 10 + planet radius ~0.72). sin θ where tanθ = t: sin = t/sqrt(1+t²). Yes.

For aspect wide: sinMin = sinV = tanHalf/sqrt(1+tanHalf²) = sin(27.5°) = 0.4617. required = 10.8/0.4617 = 23.39. Base d = 25.24 ✓ no pullback. For aspect 0.6: tanH = 0.3124, sinH = 0.3124/sqrt(1.0976)=0.2981 → required = 10.8/0.2981 = 36.2 → pullback to 36.2 (factor 1.43). ✓ 

Good — mathematically sound framing. Add small safety factor 1.08 maybe: required = (ORBIT_LIMIT / sinMin) * 1.05. Let me just multiply ORBIT_LIMIT=11.5 instead of extra factor: required = 11.5/sinMin = 24.9 wide; base 25.24 ✓ barely. Use ORBIT_LIMIT 11.5: for wide, 24.9 ≤ 25.24 ✓ (no pullback, uses base distance). Hmm that's cutting close; margin small but formula is exact so fine; the exact worst-case point subtends exactly θ_max. Let me add * 1.05 safety → 26.1 > 25.24 → slight pullback always. Meh — that changes default framing slightly. Alternatively keep ORBIT_LIMIT 11.5 without safety: at default, distance stays at base 25.24 which by the formula exceeds required 24.9 → fine.

Hmm wait, formula: d ≥ R/sinθ where θ is half-fov. Required = R/sinMin. With R = 10.8: 23.39 ≤ 25.24 ✓. With R = 11.5: 24.9 ≤ 25.24 ✓. Either fits. Use 11 (10 orbit + ~1 for planet radii & breathing): 11/0.4617 = 23.82 ≤ 25.24 ✓. Good, ORBIT_LIMIT = 11.

Now camera distance ~25 units — planets at 0.5-0.7 radius will look smallish but visible; whole system visible requirement satisfied. Maybe make planets slightly bigger: radii 0.6, 0.55, 0.8, moon 0.18 orbit dist 1.2. Sun 1.5.

Let me also double check the moon (child of spinning planet): planet spin 1.1 rad/s rotates the moon's orbit frame; moon local angle advances 2.3 rad/s → world angular speed up to ~3.4 rad/s. Moon distance 1.2 from planet center; planet radius 0.55. OK — no collision with planet since 1.2 > 0.55 + 0.18. Fine.

One more consideration: the moon's orbit plane remains XZ (local y=0) even under Y-rotation of parent. ✓.

Clock delta: `const delta = Math.min(clock.getDelta(), 0.05)` — but if the tab is throttled, motion slows vs wall-clock; acceptable. Actually clamping causes slow-motion after lag; some prefer no clamp. Tests might simulate time? They'd likely check that planets moved between frames. Clamping at 0.05 could interfere if the test artificially advances... They can't easily fake clock. Fine. Actually, to be safest for potential tests that read positions across a rAF tick, clamping at 0.05 still yields movement. Good.

Also note: getDelta first call returns time since clock creation (small). Fine.

__ready flag: define `let readySignalled = false;` then in loop after render: `if (!readySignalled) { readySignalled = true; (window as any).__ready = true; }`.

TypeScript config unknown; `import * as THREE from 'three'` with types from @types/three or three's own types. THREE.MathUtils.degToRad exists. THREE.ACESFilmicToneMapping exists. Fine.

Potential strict issues: none apparent. `moon: MoonRuntime | null` and `makeMoon(...)` returns MoonRuntime. `if (moon !== null)` narrows. 

Window listeners: `window.addEventListener('resize', onResize)`.

Let me also make sure `camera.position.copy(cameraOffset).setLength(distance)` — Vector3.setLength exists (sets length). ✓.

Also initial camera aspect passed to constructor: use window.innerWidth / window.innerHeight — fine; frameCamera recomputes anyway.

Orbit initial angles: planet1 0.7, planet2 2.4, planet3 4.6 — spread out.

Also, should planets have slightly tilted axes? Not required. Keep rotation.y for spin; tilt optional. Skip tilt (axis Y) — but then spin on Y axis is invisible for a uniform sphere! Spinning a Featureless sphere shows nothing. Hmm — "Every planet also spins on its own axis" is satisfied mathematically (rotation.y increments), but visually nothing changes since the sphere and material are uniform. Should I add surface variation? Without textures, I could add subtle displacement/vertex colors, or add a child marker... A cheap trick: MeshStandardMaterial with `flatShading: true` and low-poly sphere → facets show rotation. Or rotate a slightly bumpy geometry. Vertex-color patches: assign per-vertex colors (e.g., bands/noise) so rotation is visible — that's still procedural (no assets) and tasteful.

But careful: "spheres with MeshStandardMaterial" — vertex colors are fine. Setting `vertexColors: true` with color attribute. Let me add gentle two-tone coloring per planet via vertex colors: e.g., color = base ± noise-ish stripes along y (latitude bands) → makes spin visible when combined with axis tilt. If axis is exactly Y and camera looks from above-ish, bands rotating about Y are azimuthal stripes — rotation visible only if stripes are non-uniform in longitude. Latitude bands (varying with y) look identical under Y-rotation. Need longitude variation: color varying with atan2(z,x) — but that's just making the sphere non-uniform so the spin shows. That satisfies the requirement visually. 

Simplest robust approach: low-segment sphere (e.g., 18x12) with flatShading? Flat shading with faceted normals does show rotation (facets catch light differently)... actually flat shading of a uniformly-lit sphere still shows facet edges subtly; rotation changes which facets face the light → visible. But MeshStandardMaterial flatShading on a sphere: light from sun point light → facets rotate → shading changes → visibly spinning. That works and is cheap.

Alternatively vertex colors with slight random per-vertex variation ("patches") → rotation visible. I like vertex-color patches: deterministic pseudo-noise from vertex position (e.g., hash of rounded position) alternating light/dark patches. Let me implement a small helper:

```ts
function bandedColors(geometry: THREE.BufferGeometry, base: THREE.Color, spin contrast...): 
```

Hmm, complexity grows. Alternative: combine both — give each planet a slight axial tilt (rotation.z = tilt) and longitude-varying vertex colors. Tilt is realistic and makes spin obvious from our camera; but requirement says orbits in XZ plane — tilt of the spin axis is fine and doesn't affect orbit plane since positions are set in world space.

Trade-off: The tests (if any automated) might check planet.rotation or something — unlikely. Visual requirement "spins on its own axis" — to be visually verifiable by a human, non-uniform surface helps. I'll implement vertex colors with longitude-dependent variation.

Let me write a helper that takes SphereGeometry, base color, and adds a `color` attribute where each vertex color = base lerped toward a darker/lighter tone by a deterministic function of position:

```ts
function surfaceColors(geometry: THREE.BufferGeometry, base: THREE.Color): void {
  const pos = geometry.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = Math.sin(x * 3.1 + y * 2.3 + z * 4.7) * Math.sin(y * 5.0 + x * 1.7);
    const t = 0.5 + n * 0.25; // 0.25..0.75-ish → clamp
    c.copy(base).multiplyScalar(0.75 + 0.5 * t)?? 
```

Hmm careful: multiplyScalar on a Color in linear vs sRGB... The material color and vertex colors: with vertexColors true, final = color * vertexColor. Set material.color white? If I use vertexColors, I might set material.color to base and vertex colors as multipliers around 1.0 (e.g., 0.75–1.15). That gives mottled surface. Good:

```ts
const shade = 0.78 + 0.32 * (0.5 + 0.5 * noise); // 0.78..1.10
colors[i*3] = base.r * shade ... 
```

Wait, does vertexColor multiply material color? Yes: diffuse = color * vertexColor. So set material color = planet color, vertex colors = grayscale-ish multipliers (r=g=b=shade) or slightly hue-tinted. Grayshade multipliers keep hue. 

Actually — simpler alternative achieving visible spin: add a small "moon"-like bright bump? No.

Another very simple approach: MeshStandardMaterial doesn't need texture; the mottled vertex colors are nice. Let me use a deterministic pseudo-noise: sum of sines of position → smooth blobs. Multiply base.

But hmm: vertex colors interpolate across faces giving smooth blobs — good.

Then spin on rotation.y with an axis tilt: planet.mesh.rotation order default 'XYZ'; if I set rotation.z = tilt (constant) and increment rotation.y each frame, Euler composition gets weird (rotating y after z tilt in local frame...). With Euler XYZ order, rotation applies as R = Rx·Ry·Rz? In three.js, Euler 'XYZ' means rotation matrix = Rz? Let me recall: three.js Euler order 'XYZ' applies rotations about X, then Y, then Z in... The convention: for order 'XYZ', the matrix is computed as Rx * Ry * Rz? Hmm. In three.js, makeRotationFromEuler for 'XYZ' computes R = Rx*Ry*Rz? Actually the code: for 'XYZ': te[0] = c2*c3 ... This corresponds to R = Rx(x)·Ry(y)·Rz(z)? The convention in three: order 'XYZ' means intrinsic rotations applied in the order X, then Y, then Z? The resulting matrix for 'XYZ' is Rz? I recall three.js 'XYZ' produces R = RxRyRz (applied to vector: first Z rotation then Y then X? no...). Let me think concretely: For 'XYZ', the matrix elements: te[0] = c2*c3; te[4] = -c2*s3... This is consistent with R = Rx·Ry·Rz? Let me verify: RxRyRz applied to z-axis... eh.

The practical question: if I increment rotation.y and fixed rotation.z ≠ 0, the spin axis in world space will be R_x?·... it will precess rather than stay fixed. To keep it simple and safe, I'll skip axial tilt or implement tilt via a parent group: planet mesh child of a tilted holder; spin increments mesh.rotation.y in local frame (local Y = tilted axis). But then moon as child of planet mesh with local position in XZ plane — the moon's orbit plane would be tilted too (tilted with planet axis). Requirement only constrains planet orbits to XZ. Moon orbit tilt is physically sensible (moon orbits near equatorial plane). Not a problem.

Hmm — but hold on: the requirement "Moon: a small sphere added as a child of the planet mesh (planet.add(moon))" — with tilt holder, planet mesh is child of holder child of scene. planet.add(moon) still satisfied. Fine.

But is tilt worth the complexity? It makes spin visible only if surface non-uniform. If I add vertex-color mottling, spin is visible even without tilt (mottled texture rotates about Y; camera sees it). With camera above and to the side looking down at ~30-35°, a Y-spinning mottled sphere shows movement (the blobs move horizontally). Good enough. Skip tilt; keep axis exactly Y for cleanliness. Actually small tilt adds realism but Y-spin suffices.

Wait, one more consideration about visibility of spin: point light from center — planet lit from sun direction; mottled colors rotate → the pattern visibly rotates. ✓.

Alternatively simpler and still fine: skip vertex colors entirely; rotation.y increments satisfy "spins on its own axis" literally. The instructions to me (the coder) enumerate behaviors; automated checks might sample rotation angles. Vertex colors don't hurt checks. I'll include the mottling since it's cheap and makes it look alive. Actually... let me weigh risk: vertex colors code is straightforward; low risk. Include.

Implementation detail: geometry.attributes.position is a BufferAttribute; use .getX/.getY/.getZ. After setting 'color' attribute, set material vertexColors: true. Material color = base. Vertex multipliers ~0.72–1.12.

Noise function: deterministic; e.g.,

```ts
const n = Math.sin(x * 5.3 + z * 6.1) * 0.6 + Math.sin(y * 7.7 + x * 2.9) * 0.4;
```

Coordinates normalized by radius (sphere radius r): divide by radius to make pattern scale-independent-ish. Fine: use nx = x / radius etc. Then shade = 0.85 + 0.18 * n (range 0.67..1.03). Slight bands: add latitudinal term sin(y/r * 4)? Keep as is.

Colors in linear space: geometry color attributes are interpreted... With renderer.outputColorSpace = SRGB (default) and no color management changes, vertex colors are treated as linear values multiplied into the material color. Material colors set with Color from hex go through color management (converted sRGB→linear) when `THREE.ColorManagement.enabled` (default true in newer versions) — actually `new THREE.Color(0x...)` with color management enabled converts to linear-srgb working space. Vertex color attributes are used as-is (linear). My multipliers are relative so fine.

Now, sun with MeshBasicMaterial: unlit, fine. Maybe add subtle: color 0xffb63b? MeshBasic ignores lights. Could bump with slight emissive look. Fine.

Also: I might add a faint glow via a second bigger sphere with basic material and low opacity — optional; skip (transparency sorting hassle). Skip.

Renderer clear color via scene.background set. Fine.

Let me also consider: physically based light intensity — maybe tests sample `renderer` etc. Nothing specific beyond "mind physically based light intensity/decay": I set decay=2 explicitly and intensity 260, plus tone mapping. Also I might add a comment. Good.

Now write the resize robustly: also handle when window.innerHeight could be 0 → Math.max(...,1) guard in frameCamera; renderer.setSize with 0 height is fine-ish.

Let me now also handle devicePixelRatio on resize (setPixelRatio unchanged; fine).

Edge: `renderer.setAnimationLoop` with function typed `() => void` — fine.

Complete code assembly:

```ts
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Scene, camera, renderer                                            */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / Math.max(window.innerHeight, 1),
  0.1,
  300,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0px';
document.body.style.overflow = 'hidden';

/* ------------------------------------------------------------------ */
/* Lights                                                             */
/* ------------------------------------------------------------------ */

// PointLight = sunlight. three.js fall-off is physically based: with decay = 2,
// irradiance at distance d is intensity / d^2. With the outermost orbit at
// radius 10 the intensity must be in the hundreds to light the planets well;
// ACES tone mapping keeps the inner planets from blowing out.
const sunLight = new THREE.PointLight(0xffffff, 260, 0, 2); // distance 0 = infinite range
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient fill so night sides are not pure black.
const ambientLight = new THREE.AmbientLight(0xbfc8ff, 0.22);
scene.add(ambientLight);

/* ------------------------------------------------------------------ */
/* Sun                                                                */
/* ------------------------------------------------------------------ */

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc35c }), // self-luminous: ignores lights
);
scene.add(sun);

/* ------------------------------------------------------------------ */
/* Planets                                                            */
/* ------------------------------------------------------------------ */

interface MoonState {
  mesh: THREE.Mesh;
  distance: number; // orbit radius around its planet (local space)
  angle: number;    // current orbit angle
  speed: number;    // rad/s
}

interface PlanetState {
  mesh: THREE.Mesh;
  radius: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number; // rad/s; inner planets get larger values
  spinSpeed: number;  // rad/s around its own Y axis
  moon: MoonState | null;
}

// Subtle mottling via vertex colours so each planet's rotation is visible.
function applySurfaceMottle(mesh: THREE.Mesh, radius: number): void {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const positions = geometry.getAttribute('position');
  const shades = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const nx = positions.getX(i) / radius;
    const ny = positions.getY(i) / radius;
    const nz = positions.getZ(i) / radius;
    const noise =
      Math.sin(nx * 5.3 + ny * 3.1 + nz * 6.7) * 0.55 +
      Math.sin(ny * 8.2 + nz * 2.3) * 0.45;
    const shade = 0.86 + 0.16 * noise; // ~0.7 .. 1.02
    shades[i * 3 + 0] = shade;
    shades[i * 3 + 1] = shade;
    shades[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(shades, 3));
}
```

Hmm: noise range −1..1 → shade 0.70..1.02. Good.

Wait — mesh.geometry type: THREE.SphereGeometry; I typed as BufferGeometry via cast? `mesh.geometry` is typed as BufferGeometry in three's types (Mesh<TGeometry extends BufferGeometry...>). Actually `Mesh` default generic is `BufferGeometry | ...`? In three types, `class Mesh<TGeometry extends BufferGeometry = BufferGeometry, ...>` so mesh.geometry is BufferGeometry if not parameterized. `geometry.getAttribute('position')` returns BufferAttribute | InterleavedBufferAttribute | undefined? Signature: getAttribute(name: string): BufferAttribute | InterleavedBufferAttribute. Hmm — in some versions it may return `BufferAttribute | InterleavedBufferAttribute`. It's not undefined in current types (throws if absent). To be safe with strict TS: after constructor I know it's SphereGeometry with position. I can type the helper parameter as `geometry: THREE.BufferGeometry` and call `geometry.getAttribute('position')`; assign to `positions`. getX exists on both BufferAttribute and InterleavedBufferAttribute. count exists on both. OK. If the union type makes it awkward, it's still fine since both have count/getX/getY/getZ.

Actually check: does `getAttribute` return type include undefined? In three r150+ types: `getAttribute(name: BuiltinShaderAttributeName | (string & {})): BufferAttribute | InterleavedBufferAttribute;` I believe no undefined. To be safe, guard: `if (!positions) return;` — but then TS narrows... if type never undefined, the guard is allowed? `if (!positions) return;` with non-nullable type → TS complains? No — TS allows truthiness checks on non-nullable values without error (no "unnecessary condition" by default; that's an eslint rule, not tsc). Safe either way. I'll include no guard but structure so it compiles either way: use `const positions = geometry.getAttribute('position');` then `positions.count`. If a particular @types version declared `| undefined`... hmm, official three types (from three package "types" via @types/three) — three now ships its own types since r161? The npm "three" package includes .d.ts. getAttribute returns BufferAttribute | InterleavedBufferAttribute. I'll avoid the risk: use SphereGeometry directly typed and read `geometry.attributes.position`?? attributes is `{ [name: string]: BufferAttribute | InterleavedBufferAttribute }` — indexing gives the union possibly with `| undefined` under noUncheckedIndexedAccess (strict doesn't include noUncheckedIndexedAccess by default; "strict" flag set = strictNullChecks etc but not noUncheckedIndexedAccess). tsc --strict alone doesn't enable noUncheckedIndexedAccess, so indexing is non-undefined. Either approach compiles. I'll use getAttribute and add a defensive `if (positions === undefined) return;`? If the declared type doesn't include undefined, comparing with undefined is still legal ("This comparison appears unintentional"? That error (TS2367) happens when types have no overlap — comparing `BufferAttribute | InterleavedBufferAttribute` with `undefined`... `=== undefined` where left is non-nullable object: TS gives error 2367? Actually TS2367 triggers for comparisons where type ranges don't overlap, e.g., number === string. For `obj === undefined` where obj is non-nullable: TS considers it an error "This comparison appears to be unintentional because the types ... have no overlap"? Hmm, I believeTS does flag `x === undefined` when x is a non-nullable object type?? Let me recall... `const a = new Date(); a === undefined` → TS error 2367? I think TS does NOT error on `a === undefined` for object types... Actually it does error: "This comparison appears to be unintentional because the types 'Date' and 'undefined' have no overlap." Hmm, I've seen that error for `=== undefined`. Yes, TS2367 fires for `=== undefined`/`=== null` comparisons with non-nullable types. So DON'T include the guard; avoid risk both ways by using a different pattern:

```ts
const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
```

Cast via `as` — fine and robust. I'll do:

```ts
const positions = geometry.getAttribute('position');
```

and trust the official typings (no undefined). Both @types/three and bundled three types: getAttribute... In @types/three (three.js types by @types), BufferGeometry.getAttribute(name: string): BufferAttribute | InterleavedBufferAttribute. No undefined. In the shipped types (three/src/core/BufferGeometry.d.ts): same, no undefined. OK, safe. Keep plain call.

Continue planets:

```ts
function createPlanet(
  radius: number,
  color: number,
  orbitRadius: number,
  orbitAngle0: number,
  orbitSpeed: number,
  spinSpeed: number,
): PlanetState {
  const geometry = new THREE.SphereGeometry(radius, 40, 28);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.05,
    vertexColors: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  applySurfaceMottle(mesh, radius);
  scene.add(mesh);
  return { mesh, radius, orbitRadius, orbitAngle: orbitAngle0, orbitSpeed, spinSpeed, moon: null };
}
```

Then set moons separately for planet 2:

```ts
const p1 = createPlanet(0.6, 0xc96e4b, 4, 0.7, 0.9, 1.8);
const p2 = createPlanet(0.55, 0x5d88c7, 7, 2.4, 0.5, 1.3);
const p3 = createPlanet(0.8, 0xd8ae6a, 10, 4.6, 0.3, 0.9);
```

Moon for p2:

```ts
{
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xcfcfd6, roughness: 0.95, metalness: 0 }),
  );
  const moon: MoonState = { mesh: moonMesh, distance: 1.25, angle: 0, speed: 2.4 };
  p2.mesh.add(moonMesh);          // moon is a child of its planet
  p2.moon = moon;
}
```

Planets array:

```ts
const planets: PlanetState[] = [p1, p2, p3];
```

Update function as before.

Camera framing constants:

```ts
const cameraOffset = new THREE.Vector3(12, 13, 18); // above (y) + to the side (x/z)
const ORBIT_LIMIT = 11; // outermost orbit (10) + planet radius head-room

function frameCamera(): void {
  const height = Math.max(window.innerHeight, 1);
  const aspect = window.innerWidth / height;
  camera.aspect = aspect;

  // Pull the camera far enough along its fixed direction that the outermost
  // orbit fits in both the vertical and horizontal frustum.
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const sinVertical = tanHalf / Math.hypot(1, tanHalf);
  const tanHalfHorizontal = aspect * tanHalf;
  const sinHorizontal = tanHalfHorizontal / Math.hypot(1, tanHalfHorizontal);
  const sinLimit = Math.min(sinVertical, sinHorizontal);
  const requiredDistance = ORBIT_LIMIT / sinLimit;

  camera.position.copy(cameraOffset).setLength(Math.max(cameraOffset.length(), requiredDistance));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
```

Check base length sqrt(637) ≈ 25.24. required for landscape (sinLimit = sin 27.5° ≈ 0.4617) = 11/0.4617 = 23.82 → base wins, camera at 25.24. ✓ portrait aspect 0.5: tanH = 0.2603, sinH = 0.2603/sqrt(1.0678)=0.2519; required = 11/0.2519 = 43.7 → pullback. ✓.

Wait `Math.hypot(1, tanHalf)` = sqrt(1+tan²) = sec → tan/sec = sin. ✓.

Resize:

```ts
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameCamera();
});
```

Initial: frameCamera(); after creation. Also initial planet placement: updateSystem(0) — with delta 0 sets initial positions (cos/sin of angles). Do that so scene is correct even before first frame.

Resize:

```ts
window.addEventListener('resize', onResize);
```

Animation:

```ts
const clock = new THREE.Clock();
let readySignalled = false;

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);
  updateSystem(delta);
  renderer.render(scene, camera);
  if (!readySignalled) {
    readySignalled = true;
    (window as any).__ready = true;
  }
});
```

Order of exports: place the `(window as any)` assignments near the end before the loop.

Double-check "delta time" requirement: yes, all motion scaled by delta.

Check planet speeds: "different angular speed (inner planets faster)": 0.9, 0.5, 0.3 rad/s with radii 4,7,10 ✓ different and inner fastest.

Spin speeds differ ✓.

Moon: speed 2.4 rad/s around planet; planet2 orbit 0.5. ✓.

Check types again: `new THREE.PointLight(0xffffff, 260, 0, 2)` — constructor (color?, intensity?, distance?, decay?) ✓.

`THREE.ACESFilmicToneMapping` ✓ enum.

`renderer.domElement.style.display = 'block'` ✓.

`document.body.style.margin = '0px'` — body exists (script at... module scripts are deferred; body exists). ✓.

Strict TS: all variables typed; `for (const planet of planets)` ✓. Functions typed return void. `applySurfaceMottle(mesh: THREE.Mesh, radius: number)` uses mesh.geometry — Mesh geometry typed as TGeometry default `BufferGeometry`? In three's TypeScript definitions, `class Mesh<...>` default `TGeometry extends BufferGeometry = BufferGeometry`. getAttribute exists. ✓.

Wait, applySurfaceMottle called with mesh created with SphereGeometry — Mesh constructor without explicit generics infers `Mesh<SphereGeometry, MeshStandardMaterial>`; geometry typed SphereGeometry; getAttribute available (inherited). ✓.

One more: `geometry.setAttribute('color', new THREE.BufferAttribute(shades, 3));` ✓.

`vertexColors: true` ✓.

Sun geometry: SphereGeometry(1.5, 48, 32) — MeshBasicMaterial color. ✓.

Also maybe make sun slightly emissive-looking: basic material color bright #ffca5f. fine.

Ambient: 0.22 with bluish tint.

Also, note: The tests might verify `__scene` contains PointLight and AmbientLight; planets orbit XZ etc. All good.

Exposure 1.1: with ACES + intensity 260: irradiance at p1 (r=4): 260/16 = 16.25; ACES tone maps ~16 → near white but the mottling keeps some shading; might look blown out. Reduce to 200: p1: 12.5, p2: 4.08, p3: 2.0. ACES: input ~4.08 → output ~0.9-ish (ACES approx: (x(2.51x+0.03))/(x(2.43x+0.59)+0.14) with x=4.08*exposure... at 1.1 exposure: x=4.49 → 4.49*(11.27+0.03)/(4.49*(10.9+0.59)+0.14) = 4.49*11.3/(4.49*11.49+0.14)=50.7/(51.6+0.14)=50.7/51.74=0.98. p1: x=13.75 → 13.75*(34.51+0.03)/(13.75*(33.44+0.59)+0.14)=13.75*34.54/(13.75*34.03+0.14)=475/(468+0.14)=475/468.2=1.014→ clips ~1.0. So p1 near-white on the lit side; the day side is blown but night side shows mottled color near terminator. Hmm, that's ugly — p1's lit hemisphere loses color. Reduce intensity to 130: p1: 130/16=8.1 → x=8.9 → output: 8.9*22.34/(8.9*21.6+0.14)=198.8/(192.3+0.14)... wait compute: numerator x*(2.51x+0.03)=8.9*(22.34+0.03)=8.9*22.37=199.1; denominator x*(2.43x+0.59)+0.14=8.9*(21.63+0.59)+0.14=8.9*22.22+0.14=197.8+0.14=197.9 → 199.1/197.9=1.006 → still ~1. ACES white point is soft; inputs ≥ ~8 are basically white. For p1 not blown want irradiance ≲ 5 → intensity ≤ 80. Then p3: 80/100=0.8 → ACES: x=0.88 → 0.88*(2.21+0.03)/(0.88*(2.14+0.59)+0.14) = 0.88*2.24/(0.88*2.73+0.14)=1.97/(2.40+0.14)=1.97/2.54=0.78 → decent. p2: 80/49 = 1.63 → x=1.8: 1.8*(4.52+0.03)/(1.8*(4.37+0.59)+0.14)=1.8*4.55/(1.8*4.96+0.14)=8.19/(8.93+0.14)=8.19/9.07=0.90. Hmm p2 bright 0.9, p1 0.98 blown-ish, p3 0.78. The falloff range across 4→10 (16→100 distance²) is 6.25×; hard to have all evenly lit. That's physically accurate though. Compromise: intensity ~150 with ACES: p1: 150/16=9.4→x=10.3→≈1.0 (blown white-ish); meh.

Alternative: lower decay? Physically based default is 2; the prompt says "mind physically based light intensity/decay" — meaning ensure intensity accounts for decay=2. I could use decay = 2 but boost... The issue is dynamic range; that's realistic (Mercury is blasted, Neptune dim). With ACES + vertex mottle, p1 day side washed but terminator/night visible; p3 dimmer but visible thanks to tone mapping curve lifting midtones? ACES output 0.78 for p3 is fine-ish.

Alternatively set intensity 120: p1 x=8.25→ ~1.0 blow; p2: 120/49=2.45→x=2.69: 2.69*(6.75+0.03+... compute: 2.51*2.69=6.75+0.03=6.78; num=2.69*6.78=18.24; den=2.69*(2.43*2.69+0.59)+0.14=2.69*(6.54+0.59)+0.14=2.69*7.13+0.14=19.18+0.14=19.32 → 0.944. p3: 1.2→x=1.32: 1.32*(3.31+0.03)/(1.32*(3.21+0.59)+0.14)=1.32*3.34/(1.32*3.80+0.14)=4.41/(5.02+0.14)=4.41/5.16=0.855. Hmm wait that's brighter than p3 at 80? ACES at 1.2 → 0.855? That seems high... let me recompute ACES: (x*(2.51x+0.03))/(x*(2.43x+0.59)+0.14). x=1.2: 2.51*1.2=3.012+0.03=3.042; num=1.2*3.042=3.65. 2.43*1.2=2.916+0.59=3.506; den=1.2*3.506+0.14=4.207+0.14=4.347. ratio=3.65/4.347=0.84. Yes ACES is punchy. x=0.8: 2.51*0.8=2.008+0.03=2.038; num=0.8*2.038=1.63. 2.43*0.8=1.944+0.59=2.534; den=0.8*2.534+0.14=2.027+0.14=2.167. ratio=1.63/2.167=0.752. So even irradiance 0.8 → 0.75 out. ACES lifts low-mid. So with intensity 120 + exposure 1.1: p3 lit side ≈ 0.86 bright-ish. All planets quite bright; fine visually — maybe too bright overall. Let me choose intensity 150, exposure 1.0: p1: 150/16=9.4 → ~1.0 blown; hmm.

Alternatively decay 2 exact but intensity 90, exposure 1.0: p1: 5.6 → x=5.6*: num=5.6*(14.06+0.03)=5.6*14.09=78.9; den=5.6*(13.61+0.59)+0.14=5.6*14.2+0.14=79.5+0.14=79.66 → 0.99. Still ~1. ACES saturates fast. Honestly anything ≥ 6 irradiance is ~white. So to keep p1's day side from clipping, need irradiance at r=4 ≤ ~4 → intensity ≤ 64. Then p3: 64/100=0.64 → ACES ≈ 0.64: compute x=0.64: 2.51*0.64=1.606+0.03=1.636; num=0.64*1.636=1.047; 2.43*0.64=1.555+0.59=2.145; den=0.64*2.145+0.14=1.373+0.14=1.513; ratio=0.692. Night sides → ambient. So intensity 60-70 gives nice range: inner planet bright (near 1.0 at hotspot), outer ~0.6-0.7. That looks good actually.

But hmm — these computations ignore that MeshStandardMaterial irradiance from PointLight = intensity/d² times lambert/distance attenuation exactly? three point light shader: `getDistanceAttenuation = pow(saturate(-lightDistance/cutoffDistance+1), decay)`? No — with physically correct mode (default now): attenuation = 1/d² with windowing when cutoffDistance>0. getDistanceAttenuation(lightDistance, cutoffDistance, decayExponent) = pow(saturate(-lightDistance/cutoffDistance + 1.0), decayExponent) when cutoffDistance>0 else `1/pow(lightDistance, decayExponent)`? Let me recall the shader:

```glsl
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
#if defined ( LEGACY_LIGHTS )
  ...
#else
  float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
  if ( cutoffDistance > 0.0 ) {
    distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
  }
  return distanceFalloff;
#endif
}
```

So with decay 2, falloff = 1/d². And PointLight intensity in W/sr-ish... the irradiance = intensity * falloff (times PI factors handled internally: punctual light intensity... in physical mode irradiance = intensity / d² directly, since they removed the PI scaling when LEGACY_LIGHTS off? There was: `directLight.color = pointLight.color; directLight.color *= getDistanceAttenuation(...)` and pointLight.color = color * intensity * ... hmm in WebGLLights: `state.pointLights[i].color.copy(color).multiplyScalar(intensity)` — no PI factor? For physical lights, PointLight intensity is in candela; irradiance at d: candela/d²... but there's a factor: in WebGLLights.js (non-legacy): `uniforms.color.copy( light.color ).multiplyScalar( light.intensity )`? I recall for punctual lights they don't multiply by PI in physical mode; in legacy mode they divided by PI or multiplied... Whatever — with modern three, intensity ≈ candela and irradiance = intensity/d² (no π). My numbers: intensity 260 → p3: 2.6 → bright. So ~70-130 range for good looks. I'll pick 150? p1 blown white on hot side. Meh — visually "sun-blasted inner planet" reads okay-ish but loses color... Actually, hold on: mottled vertex colors darken (0.7 multiplier) reducing clip slightly; ACES at ~9 gives ~0.98 flat → p1's lit side basically white regardless of mottle. The terminator area shows gradient. It will still look decent — like a hot inner planet.

Balance: intensity 120. p1: 7.5 →~0.99 white-ish hot side; p2: 2.45→0.94; p3: 1.2→0.87. Hmm all quite bright because ACES lift. Then ambient 0.22 adds. Overall bright scene — fine.

Alternatively, skip tone mapping → then irradiance maps ~linearly to displayed brightness (sRGB encode). NoBlending: irradiance 2.6 → very bright clipped; 16 → clipped. Use intensity ~60 without tonemapping: p1: 3.75 (clip white), p2: 1.22 (bright), p3: 0.6 (medium-dark). ACES handles clips better. Keep ACES + intensity around 120-150. I'll set 140 and exposure 1.0. Let me finalize: intensity 140, exposure 1.0, decay 2, ACES.

p1 (d=4): 8.75 → ~0.995 blown day side; night side 0 + ambient 0.22 → dark but visible mottle. Terminator gradient. Acceptable. Or lower intensity to 100: p1: 6.25→ ~0.96 (slight color survives: ACES at 6.25: num=6.25*(15.69+0.03)=6.25*15.72=98.25; den=6.25*(15.19+0.59)+0.14=6.25*15.78+0.14=98.6+0.14=98.76 → 0.995. blown anyway, ha. 4.0: num=4*(10.04+0.03)=40.3; den=4*(9.72+0.59)+0.14=4*10.31+0.14=41.38 → 0.974. So even 4 clips ~0.97 — ACES just does that with bright inputs. To truly keep p1 colorful need irradiance ≤ ~2 (mapping to ~0.85): intensity ≤ 32 → p3: 0.32 → ACES: x=0.32: 2.51*.32=.803+.03=.833; num=.32*.833=.267; 2.43*.32=.778+.59=1.368; den=.32*1.368+.14=.438+.14=.578; ratio=.46. Then p3 lit 0.46, p2: 32/49=0.653→0.69, p1: 2→ x=2: num=2*(5.02+.03)=10.1; den=2*(4.86+.59)+.14=2*5.45+.14=11.04; ratio=0.915. Hmm that's decent too: p1 0.92, p2 0.7, p3 0.46. All visible, none blown. But p3 darkish. Ambient 0.22 lifts floor.

There's no perfect; pick intensity 80: p1: 5 (0.98), p2: 1.63 (0.9), p3: 0.8 (0.75). Reasonable spread: bright inner, dimmer outer. Good middle ground. Plus ambient 0.22 everywhere (night sides ~0.13-0.2 after material color ~0.3-0.5 reflectance...). Material base colors are mid-tone (0.4-0.8 linear-ish). Let me sanity check planet3 color 0xd8ae6a → linear ≈ (0.68, 0.42, 0.15). Irradiance 0.8 → outgoing ≈ 0.55,0.34,0.12 → after ACES ~0.72,0.5,0.2 → sRGB ~0.87,0.74,0.48 → nice tan. p1 0xc96e4b linear ≈ (0.58,0.15,0.07): irradiance 5 → clipped white-ish center fading to color at terminator — ok hot planet. Fine. Choose intensity 80? Or 100. I'll go 100 — "mind physically based intensity" satisfied either way; visual check passes.

Hmm, actually let me reconsider: maybe don't over-think; 100 with ACES, ambient 0.25. Good.

One more subtlety: three r155+ changed default: renderer.useLegacyLights default false → physically correct. decay default already 2 for point lights for long time. OK.

Also add subtle: sun MeshBasicMaterial color 0xffcc55 → tone mapped down slightly (basic material also tonemapped: yes, tone mapping applies to all materials unless material.toneMapped=false). Bright sun color ~ (1, 0.73, 0.29) → ACES → ~0.95ish fine. Could set `material.toneMapped = false` on sun so it stays vivid. Nice touch: MeshBasicMaterial({color, toneMapped: false}) so tone mapping doesn't dull the sun; but with exposure, sun would be 0xffc35c in sRGB → displayed as-is-ish → vivid. Yes, set sun material toneMapped: false. Hmm, but MeshBasicMaterial toneMapped property exists on Material — fine, `toneMapped: false` param allowed via material params. ✓.

Camera near/far: near 0.1, far 300 ✓.

Let me reconsider the initial camera aspect in constructor — using window sizes directly; then frameCamera() recomputes properly. Fine.

Also — one consideration: `renderer.setAnimationLoop` callback — delta via clock. Also add `const elapsed = clock.elapsedTime` unused? Skip.

Also, the update loop uses `updateSystem(delta)` — delta clamped ≥ 0. `Math.min(clock.getDelta(), 0.05)`.

Testing hooks placement: assignments must run once. Put after renderer creation, before loop — but __ready set in loop. Note: assignments of __scene/__camera/__renderer should happen synchronously at script evaluation so tests can access before first frame. ✓.

Also maybe expose nothing else. OK.

Now, potential lint: `document.body.style.overflow = 'hidden';` fine.

Edge case: TypeScript `strict` with DOM lib assumed present. ✓.

Write final code with comments. Also ensure no unused variables (strict doesn't flag unused... `noUnusedLocals` is separate from --strict; but keep clean anyway). `radius` in PlanetState used only in creation; remove unused fields to be tidy — I'll keep `radius` out; not needed. Actually used in applySurfaceMottle param separately. Remove radius from PlanetState? It's harmless but unused — keep minimal: drop it.

Also p1/p2/p3 variable names: use `planet1, planet2, planet3` then array. Moon block: cleaner to create the moon inline and assign:

```ts
const planet2 = createPlanet(...);
const moon2 = new THREE.Mesh(...);
planet2.mesh.add(moon2); // the moon rides along with its planet, orbiting it locally
planet2.moon = { mesh: moon2, distance: 1.3, angle: 0.9, speed: 2.2 };
```

Clean.

Initial placement call: `updateSystem(0);` — sets positions for planets & moon (moon angle 0.9 → position set). Good; do it after creating planets and moon (moon created after planet2 but before updateSystem call → order: create all, then call).

Let me also double check applySurfaceMottle noise: positions from SphereGeometry(radius,...) — vertices at radius r; dividing by radius normalizes. SphereGeometry has duplicated seam vertices (u=0 vs u=1) with same position → same color → no seam artifact (position-based, continuous). Pole vertices duplicated with same position → fine. Noise continuous over surface ✓.

The noise uses normalized coords so blobs angular; fine.

One more visual: dark side with only ambient 0.22 * color: planet3 night: 0.68*0.22 = 0.15 linear → sRGB ~0.43 → visible grey-blue-ish. Hmm that's fairly bright for night side; ambient 0.22 with color 0xbfc8ff (linear ~ (0.53,0.58,1.0))? 0xbfc8ff → linear approx: 0.75→0.53? sRGB 191/255=0.749 → linear 0.52; 0xbfc8ff: r 0.75, g 0.784, b 1.0 → linear (0.52, 0.57, 1.0). ×0.22 → (0.114, 0.125, 0.22). Planet3 night: ×its albedo (0.68,0.42,0.15) → (0.078, 0.052, 0.033) → sRGB ≈ (0.30, 0.25, 0.20). Subtle dark brown — good, not pure black. ✓ ambient 0.22 reasonable. Maybe 0.25. Fine.

Also, should the sun light color be pure white? Slight warm 0xfff2e0? Keep white for simplicity; sun material provides warmth visually. I'll use 0xfff4e6? nah white.

Also I realize: with ACES tone mapping + exposure — fine.

Finally, check the loop callback type: `renderer.setAnimationLoop((time: DOMHighResTimeStamp) => ...)` — callback param optional; my arrow uses no params. ✓.

Also, `window.addEventListener('resize', ...)` — should also handle pixel ratio changes? Not needed.

Now, one more requirement scan:
- "Import Three.js as: import * as THREE from 'three';" ✓ (no addons needed).
- "The file must compile with tsc --strict" ✓.
- Renderer created, canvas appended ✓.
- Sized from innerWidth/Height + resize ✓.
- setAnimationLoop with delta ✓ (__ready after first frame ✓).
- __scene/__camera/__renderer ✓.
- No external assets ✓ (all procedural).
- Y up (default) ✓; orbits XZ ✓ positions y=0.
- Sun MeshBasicMaterial at origin ✓ + PointLight ✓ physically-based intensity/decay noted ✓.
- 3 planets MeshStandardMaterial at ~4,7,10 ✓ different speeds, inner faster ✓.
- Each spins on own axis ✓ (rotation.y += spin*dt).
- Planet2 moon child of planet mesh ✓ orbiting planet ✓.
- Weak AmbientLight ✓.
- Camera above and to the side, looking at origin, whole system visible ✓.

Code formatting: single ts code block, nothing else. Add concise comments.

One thing: "camera.position.copy(cameraOffset).setLength(...)" — Vector3.setLength(l) sets length to l (implemented via multiplyScalar(l/length())). length>0 ✓.

Also `Math.hypot` fine.

Let me also reconsider `ORBIT_LIMIT = 11`. Planet 3 radius 0.8 → outer extent 10.8 + moonless. 11 ✓. Also framing formula uses sin of the effective half-FOV — exact for a sphere of radius R centered at origin containing all objects? Points lie in a plane through origin; worst-case subtense I derived: tanθ_max = r/sqrt(d²−r²) → sinθ_max = r/d. So the condition for all points within half-angle θ where sin θ_bound = R/d: point at r ≤ R has max sin angle over the sphere... For any point with |P| ≤ R, max angular offset from view axis satisfies sin(angle) = |P_perp_to_view...| hmm: the angle φ between vector (P − C) and (O − C): cosφ = ((P−C)·(O−C))/(|P−C||O−C|). For |P| ≤ R, the max angle over P: sinφ ≤ R/d? The set of points within ball radius R around origin, viewed from distance d: angular radius α satisfies sinα = R/d. Yes — the ball of radius R around origin subtends half-angle asin(R/d) — standard result (tangent lines to sphere... for a ball it's asin(R/d)). Our points are within a disc of radius 10.8 in the XZ plane (a subset of the ball radius 10.8) → all within angular radius asin(10.8/d) from origin direction. Need asin(R/d) ≤ half-fov min(horizontal, vertical) → d ≥ R/sin(min-half-fov). My formula: requiredDistance = ORBIT_LIMIT / sinLimit exactly. ✓ Sound.

But wait — that assumed camera looks at origin: yes, lookAt(0,0,0) always. ✓. Also camera direction fixed = cameraOffset direction. ✓.

Alright — but double-check the aspect half-fov horizontal relation: horizontal half-angle tan = aspect × verticalTan ✓ for standard PerspectiveCamera (tan(fov/2) vertical, aspect multiplies for horizontal): yes, x = aspect·y.

Final check on `frameCamera` being called initially — call once right after defining, before the loop. Also camera.position initial set there.

Order in file: scene → camera → renderer → body styles → lights → sun → planets → moon wiring → planets array → update fn → camera framing → resize → initial frameCamera + updateSystem(0) → expose hooks → clock + loop.

Also note: `updateSystem(0)` before `frameCamera` — irrelevant order.

Type annotations: make everything explicit where inference would be `any`. `(window as any).__scene = scene;` fine.

Potential TS strict complaint: none.

Let me also double check `THREE.MathUtils.degToRad` exists ✓.

Write final answer now. Also decide sun radius 1.5 vs planets distances 4 — inner planet at 4 with planet radius 0.6; fine, no overlap with sun 1.5. ✓.

Spin speeds: 1.8, 1.3, 0.9 rad/s — visible. Orbit: 0.9 (inner), 0.5, 0.3.

Moon speed 2.2 rad/s → period 2.9 s — lively. distance 1.3 planet radius 0.55 + moon 0.18 → clearance ✓.

Let me write out the final file carefully, checking syntax.

Additionally, I need to double check `const positions = geometry.getAttribute('position');` typing union has `.count` and `.getX(i)` — BufferAttribute and InterleavedBufferAttribute both define count: number and getX/getY/getZ(index: number): number. ✓. Loop `for (let i = 0; i < positions.count; i++)`. ✓.

`new THREE.BufferAttribute(shades, 3)` ✓.

Also mesh param typing in applySurfaceMottle: pass geometry and radius instead:

```ts
function applySurfaceMottle(geometry: THREE.BufferGeometry, radius: number): void
```

Call: `applySurfaceMottle(geometry, radius);` — cleaner typing. ✓.

Also, `scene.add(mesh)` inside createPlanet ✓.

Now write everything.

```ts
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Scene / camera / renderer                                          */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / Math.max(window.innerHeight, 1),
  0.1,
  300,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0px';
document.body.style.overflow = 'hidden';

/* ------------------------------------------------------------------ */
/* Lights                                                             */
/* ------------------------------------------------------------------ */

// The sun's light. three.js point lights use physically based attenuation:
// with decay = 2 (the physical inverse-square law) the irradiance at a
// distance d is intensity / d^2. With orbits out at radius 10 the intensity
// therefore has to be in the hundreds-of-candela range for the planets to be
// properly lit; ACES tone mapping keeps the inner planets from clipping.
const sunLight = new THREE.PointLight(0xffffff, 150, 0, 2); // distance 0 = no range limit
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Weak ambient fill so the night sides of the planets are not pure black.
const ambientLight = new THREE.AmbientLight(0xbfc8ff, 0.25);
scene.add(ambientLight);
```

Hmm I flip-flopped 100 vs 150. Pick 150? p1: 150/16=9.4 (clips day side). p3: 1.5 → 0.87. Hmm. 100: p1 6.25→0.99; p2 2.04→0.86; p3 1.0→0.80?? wait ACES at 1.0: num=1*(2.51+0.03)=2.54; den=1*(2.43+0.59)+0.14=3.02+0.14=3.16 → 0.80. Hmm ACES at 1.0 gives 0.80? That seems too high — but that's the filmic curve (mid-gray lift). Yes the curve maps 1.0→~0.8. OK.

I'll set 120. Whatever — pick 140 and stop. Actually let me think about which gives the nicest look overall: want outer planet clearly visible (≥ ~0.5 output on lit side): irradiance i3 → output: i=0.7: num=0.7*(1.757+0.03)=0.7*1.787=1.251; den=0.7*(1.701+0.59)+0.14=0.7*2.291+0.14=1.604+0.14=1.744 → 0.717. i=0.5: num=0.5*(1.255+0.03)=0.6425; den=0.5*(1.215+0.59)+0.14=0.5*1.805+0.14=0.9025+0.14=1.0425 → 0.616. i=0.35: num=0.35*(0.8785+0.03)=0.318; den=0.35*(0.8505+0.59)+0.14=0.35*1.4405+0.14=0.504+0.14=0.644 → 0.494. So even 0.35 → 0.49 output. ACES is forgiving. So intensity 100 gives outputs: p1 0.99 (blown), p2 0.86, p3 0.8?? wait p3 at 100: 100/100=1.0 → 0.80. All bright; spread small. intensity 60: p1: 3.75 → 0.96; p2: 1.22 → 0.84; p3: 0.6: num=0.6*(1.506+0.03)=0.6*1.536=0.922; den=0.6*(1.458+0.59)+0.14=0.6*2.048+.14=1.229+.14=1.369 → 0.673. spread: 0.96/0.84/0.67 — nice falloff feel, none black, only p1 slightly hot. intensity 60 it is? But then "properly lit" — yes visible. Hmm, but p1 clipping at 0.95+... ACES reaches ~0.99 at 6; p1 day side ~0.97 white-ish — slight color loss only at hot center. OK.

Alternatively intensity 80: p1: 5→0.98, p2: 1.63→0.89, p3: 0.8→0.75. I'll go 80. Eh. Decisions: pick 80 as a balanced value with comment. Hmm, honestly the visual difference between 80 and 150 is modest because of ACES. Choose 100 as round number... Final: 100. Exposure 1.0. Done deliberating.

Ambient 0.25.

Sun: radius 1.5, color 0xffc35c toneMapped false. Hmm if toneMapped false, displayed at full sRGB value (1, 0.76, 0.36)-ish → vivid yellow-orange. nice.

Actually, also consider adding a subtle second sun sphere for glow: skip.

Now planets:

```ts
/* ------------------------------------------------------------------ */
/* Planets                                                            */
/* ------------------------------------------------------------------ */

interface MoonState {
  mesh: THREE.Mesh;
  distance: number;
  angle: number;
  speed: number;
}

interface PlanetState {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon: MoonState | null;
}

// Vertex-colour mottling so each planet's axial spin is actually visible on
// what would otherwise be a featureless sphere.
function applySurfaceMottle(geometry: THREE.BufferGeometry, radius: number): void {
  const positions = geometry.getAttribute('position');
  const shades = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const nx = positions.getX(i) / radius;
    const ny = positions.getY(i) / radius;
    const nz = positions.getZ(i) / radius;
    const noise =
      Math.sin(nx * 5.3 + ny * 3.1 + nz * 6.7) * 0.55 +
      Math.sin(ny * 8.2 + nz * 2.3) * 0.45;
    const shade = 0.86 + 0.16 * noise; // ≈ 0.70 … 1.02
    shades[i * 3] = shade;
    shades[i * 3 + 1] = shade;
    shades[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(shades, 3));
}

function createPlanet(
  radius: number,
  color: number,
  orbitRadius: number,
  startAngle: number,
  orbitSpeed: number,
  spinSpeed: number,
): PlanetState {
  const geometry = new THREE.SphereGeometry(radius, 40, 28);
  applySurfaceMottle(geometry, radius);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.0,
    vertexColors: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return { mesh, orbitRadius, orbitAngle: startAngle, orbitSpeed, spinSpeed, moon: null };
}

const planet1 = createPlanet(0.6, 0xc96e4b, 4, 0.7, 0.9, 1.8);
const planet2 = createPlanet(0.55, 0x5d88c7, 7, 2.4, 0.5, 1.3);
const planet3 = createPlanet(0.8, 0xd8ae6a, 10, 4.6, 0.3, 0.9);

// Planet 2's moon: a small sphere parented to the planet mesh itself, so it
// rides along with the planet's orbit/spin while circling it locally.
const moonGeometry = new THREE.SphereGeometry(0.18, 24, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xcfcfd6, roughness: 0.95, metalness: 0.0 });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
planet2.mesh.add(moonMesh);
planet2.moon = { mesh: moonMesh, distance: 1.3, angle: 0.9, speed: 2.2 };

const planets: PlanetState[] = [planet1, planet2, planet3];
```

Update:

```ts
/* ------------------------------------------------------------------ */
/* Motion (all rates are per second, scaled by frame delta)           */
/* ------------------------------------------------------------------ */

function updateSystem(delta: number): void {
  for (const planet of planets) {
    // Orbit around the sun, in the XZ plane.
    planet.orbitAngle += planet.orbitSpeed * delta;
    planet.mesh.position.set(
      Math.cos(planet.orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(planet.orbitAngle) * planet.orbitRadius,
    );

    // Spin around the planet's own (Y) axis.
    planet.mesh.rotation.y += planet.spinSpeed * delta;

    // Moon: local orbit around its parent planet (also in the parent's XZ plane).
    const moon = planet.moon;
    if (moon !== null) {
      moon.angle += moon.speed * delta;
      moon.mesh.position.set(
        Math.cos(moon.angle) * moon.distance,
        0,
        Math.sin(moon.angle) * moon.distance,
      );
    }
  }
}
```

Camera:

```ts
/* ------------------------------------------------------------------ */
/* Camera framing: above and to the side, whole system in view        */
/* ------------------------------------------------------------------ */

const cameraOffset = new THREE.Vector3(12, 13, 18); // side + above + behind-ish
const ORBIT_LIMIT = 11; // outermost orbit (10) plus planet body head-room

function frameCamera(): void {
  const height = Math.max(window.innerHeight, 1);
  const aspect = window.innerWidth / height;
  camera.aspect = aspect;

  // Distance needed so a sphere of radius ORBIT_LIMIT around the origin fits
  // inside both frustum half-angles, viewed from the current direction.
  const tanHalfVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const sinVertical = tanHalfVertical / Math.hypot(1, tanHalfVertical);
  const tanHalfHorizontal = aspect * tanHalfVertical;
  const sinHorizontal = tanHalfHorizontal / Math.hypot(1, tanHalfHorizontal);
  const requiredDistance = ORBIT_LIMIT / Math.min(sinVertical, sinHorizontal);

  camera.position.copy(cameraOffset).setLength(Math.max(cameraOffset.length(), requiredDistance));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
```

Resize:

```ts
function onResize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameCamera();
}
window.addEventListener('resize', onResize);
```

Init:

```ts
frameCamera();
updateSystem(0); // place everything before the first frame
```

Hooks + loop:

```ts
/* ------------------------------------------------------------------ */
/* Test hooks + render loop                                           */
/* ------------------------------------------------------------------ */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let readySignalled = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05); // clamp tab-switch spikes
  updateSystem(delta);
  renderer.render(scene, camera);

  if (!readySignalled) {
    readySignalled = true;
    (window as any).__ready = true; // first frame has been rendered
  }
});
```

Check: cameraOffset.length() called with camera position not yet set — cameraOffset vector length; fine.

Wait: initial `frameCamera()` — uses camera.aspect assignment etc. ✓.

One more check — `renderer.setSize(window.innerWidth, window.innerHeight)` called both at start and in onResize; fine.

`clock.getDelta()` first frame: time since clock creation (few ms) ✓.

Does anything reference `camera.aspect` before updateProjectionMatrix? lookAt + updateProjectionMatrix inside frameCamera ✓.

Also `sun` unused var? It's added to scene; variable `sun` used only in scene.add — fine (declared const, used). TS noUnusedLocals not in --strict anyway.

`moonGeometry/moonMaterial/moonMesh` — used. ✓.

Also: `applySurfaceMottle(geometry, radius)` — geometry is SphereGeometry; param type BufferGeometry — SphereGeometry extends BufferGeometry ✓. getAttribute exists ✓.

`positions.count` — property exists ✓.

One concern: `geometry.setAttribute('color', ...)` before material compile — material created after mottle applied? In createPlanet I call applySurfaceMottle(geometry, radius) BEFORE creating material/mesh — order fine since attribute is on geometry, used at first render. But `vertexColors: true` set on material ✓.

Another check: `MeshStandardMaterial` params object type — all valid keys ✓ (`vertexColors`, `roughness`, `metalness`, `color`).

`THREE.Mesh` type import fine.

Everything compiles under strict in my assessment.

Final nicety: maybe rename delta clamp constant inline. Fine.

Also let me reconsider the sun color with toneMapped false inside MeshBasicMaterial params: `new THREE.MeshBasicMaterial({ color: 0xffc35c, toneMapped: false })` — Material params include toneMapped ✓.

Also the moon's surface: plain grey MeshStandardMaterial — no vertexColors. ✓ default vertexColors false.

Potential subtlety — planet2 mesh has vertexColors material; moon separate material fine.

Also the moon spin: rides along; not required.

Alright — also, about "planet.add(moon)" requirement check by an automated test: they might traverse scene graph to find moon as child of a planet whose orbitRadius ≈ 7 → our planet2.mesh.add(moonMesh) ✓.

Also, tests may verify planet meshes are MeshStandardMaterial ✓, sun MeshBasicMaterial ✓, PointLight at origin ✓ (position 0,0,0), AmbientLight exists with low intensity (< maybe 0.5) ✓ (0.25).

Orbit radii: exactly 4, 7, 10 ✓.

"whole system visible" — tests might screenshot; framing handles ✓.

One risk: a test measuring renderer size vs window size ✓ setPixelRatio doesn't affect canvas CSS size ✓.

I think we're good. Also double-check that we don't accidentally use `--strict`-offending `let readySignalled = false;` — fine.

Also, in strict mode `window` typed as Window & typeof globalThis ✓.

Note about the delta clamp: min(getDelta(), 0.05) — but getDelta internally updates oldTime; fine.

Final: ensure output contains ONLY the code block per instructions ("Reply with a single ```ts code block and nothing else."). I'll output just the code block.

One last review of the file for syntax errors... assemble mentally:

Full mental compile pass:

```ts
import * as THREE from 'three';
```
✓

All braces: let me count functions: applySurfaceMottle {...}, createPlanet {...}, updateSystem {...}, frameCamera {...}, onResize {...}, plus the arrow in setAnimationLoop. All closed properly in the final write.

Also, `positions.getX(i)` — i typed number ✓.

Write it.