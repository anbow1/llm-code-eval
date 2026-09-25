Let me write a complete TypeScript file.

Key points: PointLight intensity — with physically correct lighting (default in three r155+, useLegacyLights false), point light intensity in candela; decay default 2. For distances ~4-10, intensity needs to be large-ish, e.g. intensity = 80-300. Let's set renderer.toneMapping maybe. Actually simpler: set light intensity to something like 300 with decay 2, or use decay 0? "mind physically based light intensity/decay" — so keep decay 2 and boost intensity. With decay 2, illuminance at distance d = intensity/d². At d=4 → intensity/16; want ~ maybe 3-ish → intensity ~ 50-100. Let's use intensity 150. Planets at 10 get 1.5. Fine. Could scale intensity per planet but keep single light. Maybe intensity = 250.

Use ACESFilmicToneMapping perhaps; keep simple.

Orbits: use pivot groups or compute position via angle each frame. Planet positions: set angle += speed*dt, position.set(cos*r, 0, sin*r). Spin: mesh.rotation.y += spinSpeed*dt.

Moon: child of planet mesh, but planet mesh spins on its own axis — if moon is child of the planet mesh, moon inherits spin. Better to add moon to a separate group? Requirement says planet.add(moon). If moon is child of the planet mesh, it'll also spin with planet's rotation.y which would add extra motion. To avoid, make planet a Group with an inner mesh that spins, and add moon to group. But requirement says "a small sphere added as a child of the planet mesh (planet.add(moon))". Hmm. I can make planet mesh that doesn't spin, and inner child mesh spins? That complicates. Alternative: moon orbits by setting its local position each frame: moon.position.set(cos*r,0,sin*r) relative to planet. If planet spins on y, moon child inherits rotation, so its local position rotates too — that changes orbit speed unpredictably. Simplest: put moon as child of planet mesh, and each frame set moon position on circle in planet's local space. But the planet's own rotation.y adds. Could compensate by using an intermediate pivot: planet mesh spins; add pivot group as child? Requirement says planet.add(moon). I could interpret "planet mesh" loosely: create planet Group (which holds the sphere mesh that spins), and planet.add(moon) where planet is the group. But the hint literally says planet.add(moon). I'll make planet a THREE.Group containing sphere mesh that spins; moon child of group; group orbits. Actually to satisfy both spin and moon orbit cleanly, use:

- planetGroup at orbital position, planetGroup.add(sphereMesh) spins sphereMesh, planetGroup.add(moon) moon positioned each frame.

Hmm, but "planet mesh" — I'll name the group `planet` and note it. Alternatively, keep moon as child of spinning mesh but counteract: moon.position set in local coords; the mesh rotation.y rotates moon's position too. The moon's orbit speed would be planet spin + moon's own local angular motion. That's fine visually actually — just different combined speed. But cleaner to counteract: each frame set moon.position.set(cos(a)*r, 0, sin(a)*r) where a = moonAngle - planet.rotation.y... Actually since rotation.y is about Y and moon position is in XZ plane, rotating the parent rotates the moon position around Y. So setting moon local angle a, world angle = a + planet.rotation.y. To get desired world angle, a = desired - planet.rotation.y. But that's overkill; simpler to use a group.

I'll do: planet = Group; sphere child spins; moon child of group, moon.position updated per frame. That satisfies "planet.add(moon)". I'll comment accordingly.

Camera: above and to the side, looking at origin: position e.g. (12, 8, 14)? Distance should show whole system (radius 10 plus planets). Use camera position (14, 9, 14), lookAt origin. FOV 50. Distance sqrt(196+81+196)=~21.4. At fov 50, visible radius ~ 21.4*tan(25°) ≈ 10. Good.

Add starfield? Not required; keep minimal but maybe add subtle background. Keep it simple, no external assets. Could add a few small stars using Points with basic material — optional. I'll add a simple star points field for looks; it's procedural, fine. Keep it minimal though to avoid errors. I'll include small star field.

Sun: sphere radius ~1.5, MeshBasicMaterial color 0xffcc66 or use emissive-like. Add PointLight.

Planets: radii 0.4, 0.55, 0.7; distances 4,7,10; speeds e.g. 1.2, 0.8, 0.5 rad/s (or proportional). Spin speeds different.

Moon: radius 0.15, orbit radius ~1.2 around planet 2.

AmbientLight intensity 0.05-0.1 (with physically-based, ambient intensity behaves similar). Use 0.06? MeshStandardMaterial with ambient 0.05 might be dark. Use 0.15.

Renderer: antialias, setPixelRatio, toneMapping ACESFilmic, outputColorSpace default sRGB.

Handle resize.

__ready after first frame: in animation loop, set once.

Write code carefully with strict TS: non-null assertions where needed.

Let me write:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 200);
camera.position.set(14, 9, 14);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// lights
const sunLight = new THREE.PointLight(0xfff4e0, 300, 0, 2); // intensity, distance=0 (infinite), decay=2
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// sun
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffd27f }));
scene.add(sun);

// stars
const starGeo = new THREE.BufferGeometry();
const positions: number[] = [];
for (let i=0;i<800;i++){ ... random on sphere radius 60-100 ... }
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true })));
```

Wait: points at radius 60-100 with camera far 200 fine.

Planets config array:

```ts
interface PlanetDef { name: string; distance: number; radius: number; color: number; orbitSpeed: number; spinSpeed: number; }
```

Create planets: group per planet; sphere MeshStandardMaterial with roughness ~0.9, metalness 0.

Store userData or local arrays for update.

Moon: child of planet group for planet index 1; moonOrbitRadius 1.2, moonSpeed 2.

Also give planet 2 slight tilt? Not needed.

Update loop with delta from setAnimationLoop callback: (time) => { const t = time/1000 ... } Actually setAnimationLoop callback receives time in ms. Use clock.getDelta() alternatively. Use THREE.Clock.

First frame ready flag: after render, if not set, set true.

Resize handler.

Ensure document.body has margin 0? Page has no other HTML; canvas appended. Could add style to remove margins: document.body.style.margin = '0'. Fine.

Also overflow hidden.

Point light intensity: with decay 2 and intensity in candela, illuminance at d: I/d². Planet at 4: 300/16=18.75 lux → very bright with tone mapping; at 10: 3 lux. Hmm range big. Maybe intensity 150: at 4 → 9.4, at 10 → 1.5. Reasonable. Use 150? Standard material response: lux values produce bright surfaces. With ACES tone mapping, fine. I'll use intensity 200 and see. Actually can't test; pick 200. At d=4, 12.5; d=10, 2. Ok.

Sun mesh basic material color bright — maybe use color 0xffffff-ish warm, and tone mapping will handle. MeshBasicMaterial not affected by tone mapping? Tone mapping applies to all materials in output. Fine.

Write final code.

Edge: `renderer.setAnimationLoop(loop)` with loop(time: number). Use `const elapsed = time / 1000` and compute angles directly from elapsed for stability, or accumulate. I'll use elapsed-based absolute angles: orbitAngle = baseAngle + speed*elapsed. Moon: elapsed too.

Spinning: mesh.rotation.y = spinSpeed * elapsed. Simple.

Ready flag after first render call.

Expose window.__scene etc. Need `declare global`? No — using (window as any) cast is fine with strict.

Full code:

```ts
import * as THREE from 'three';

function createSolarSystem(): void {
  const scene = new THREE.Scene();
  ...
}

createSolarSystem();
```

Or just top-level. Top-level is fine.

Types: arrays with explicit interfaces.

Let me draft:

```ts
import * as THREE from 'three';

const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);

const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(16, 10, 16);
camera.lookAt(0, 0, 0);

const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
```

Hmm, body style — okay.

Lights, sun, stars, planets.

Planets definitions:

```ts
interface PlanetSpec {
  name: string;
  distance: number;
  radius: number;
  color: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number;  // rad/s
  initialAngle: number;
}

const planetSpecs: PlanetSpec[] = [
  { name: 'Mercury-like', distance: 4, radius: 0.35, color: 0xd8b98a, orbitSpeed: 1.4, spinSpeed: 2.0, initialAngle: 0.5 },
  { name: 'Earth-like', distance: 7, radius: 0.55, color: 0x3f7fbf, orbitSpeed: 0.9, spinSpeed: 1.6, initialAngle: 2.2 },
  { name: 'Mars-like', distance: 10, radius: 0.45, color: 0xb05c3a, orbitSpeed: 0.55, spinSpeed: 1.2, initialAngle: 4.0 },
];
```

For each create group, mesh standard material roughness 0.85 metalness 0.1, add to scene, store.

Moon for planet index 1: radius 0.15, orbit radius 1.3, speed 2.5, as child of planet group; store moonAngle etc. But if using absolute-time angles, moon angle = elapsed * speed.

Update in loop:

```ts
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  for (const p of planets) {
    const angle = p.spec.initialAngle + p.spec.orbitSpeed * elapsed;
    p.group.position.set(Math.cos(angle)*p.spec.distance, 0, Math.sin(angle)*p.spec.distance);
    p.mesh.rotation.y = p.spec.spinSpeed * elapsed; // hmm delta-based? use += spinSpeed*delta
  }
  moon...
  camera.lookAt? no need each frame
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Requirement: "Motion must use delta/elapsed time, not frame counts." elapsed time is fine.

But clock.getDelta then clock.elapsedTime — elapsedTime updates on getDelta call? Actually getDelta updates elapsedTime. Yes, .getDelta() adds to elapsedTime. Or use the time param of setAnimationLoop: time in ms since start. Use elapsed = time/1000. Simpler and delta = time - lastTime. I'll use the time param:

```ts
let lastTime = 0; // hmm but time param first frame is large? Actually setAnimationLoop passes time (ms) from requestAnimationFrame timestamps.
```

Use clock approach: delta-based accumulation:

```ts
const clock = new THREE.Clock();
...
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  orbitAngle += orbitSpeed * delta; ...
});
```

Accumulate per planet. Fine.

Resize:

```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Expose:

```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Stars: create Points; positions random on sphere shell radius 80-140? Camera far 300 ok. Points material size 0.5, sizeAttenuation true; color 0x9db4ff slightly.

Random: Math.random. Position: direction random via spherical: u,v.

```ts
const starCount = 900;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = 90 + Math.random() * 60;
  const s = Math.sqrt(1 - u * u);
  starPositions[i*3] = r * s * Math.cos(theta);
  starPositions[i*3+1] = r * u;
  starPositions[i*3+2] = r * s * Math.sin(theta);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.6, sizeAttenuation: true });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);
```

Sun geometry radius 1.6, 48 segments.

Moon spec: distance from planet 2 center: planet radius 0.55 + gap: 1.3. Moon radius 0.15. Speed 2.4. Moon color 0xcccccc, MeshStandardMaterial (it gets lit by point light — good).

Moon orbiting planet: moon.position.set(cos(a)*r, 0, sin(a)*r) each frame relative to planet group. Since moon is child of group (not spinning mesh), local = world offset. Good. But requirement hint "planet.add(moon)". I'll do planetGroup.add(moon) — technically planet group. To be safe, name variable `planet` for group and add sphere mesh as child. Actually let me structure: each planet is a Group (the "planet" object) containing a sphere Mesh that spins. planet.add(moon) for planet 2. Comment explaining spin applied to inner mesh so moon's orbit stays clean.

Hmm but requirement says "Every planet also spins on its own axis" — sphere mesh spins. Good.

Types for planets array:

```ts
interface PlanetRuntime {
  spec: PlanetSpec;
  group: THREE.Group;
  mesh: THREE.Mesh;
  angle: number;
}
```

Moon runtime: mesh, angle.

Also tilt planet 2's axis slightly? Not required; keep axis Y so spin about Y.

Camera: "above and to the side" — position (14, 9, 14)? Distance ~21; fov 50 gives vertical half-angle 25°, tan = 0.466; visible half-extent at distance 21 ≈ 9.8 vertical, horizontal larger with aspect. System radius 10 + planet radius. Might clip slightly at extremes when planets are perpendicular to view direction — the farthest point from camera direction... Let's compute: camera at (14,9,14), target origin, distance = sqrt(196+81+196) = sqrt(473) ≈ 21.7. Worst case planet at distance 10 opposite side: distance from camera = 21.7+10 = 31.7 along view axis; half-fov vertical = 25°, tan 0.466 → vertical half extent at that depth ≈ 31.7*0.466 = 14.8, planet off-axis lateral max 10 → within. Fine. Also near planets closer. Good enough.

Maybe pull camera slightly more: (16, 10, 16) → distance sqrt(256+100+256)=sqrt(612)≈24.7. Safer. Use (16, 10, 16), fov 50.

PointLight intensity: 200, decay 2, distance 0. Also maybe add small light helper? No.

Sun MeshBasicMaterial color: use 0xffc868. With ACES tone mapping, basic material color 1.0 will be tonemapped down. Could bump material color via color multiplied? MeshBasicMaterial color can be >1? THREE.Color components can exceed 1 via setRGB? color.setRGB with values >1 allowed. Use `new THREE.Color(0xffc868)` then maybe fine. Keep simple.

Ambient intensity: 0.2? Dark sides "not pure black" — 0.1 with standard material gives 0.1*color; use 0.15. But physically-based ambient in three: AmbientLight intensity is in... it multiplies directly. 0.15 fine.

Also set renderer.outputColorSpace default SRGB — fine, default already.

Write final answer code block only.

Double-check strict TS issues: document.body possibly null? `document.body.appendChild` — body is HTMLElement | null? In TS DOM lib, document.body is HTMLElement (typed non-null actually: `readonly body: HTMLElement`). Yes it's non-null typed. Fine.

window.innerWidth typed number. Fine.

`(window as any)` fine.

setAnimationLoop callback type: (time: number, frame?) => void — passing zero-arg callback fine.

Let me assemble final file.