We need one file. Use three imports. Renderer, scene, camera. Sun sphere MeshBasicMaterial emissive-ish color. PointLight at origin with decay 2 and intensity high enough (physically correct in r155+, intensity in candela). Distance ~10, need intensity maybe 200-500. Use decay 2 -> illuminance = intensity / d^2. At d=10, need intensity ~ 100 gives 1. So use 400 or so. Let's use intensity 300, decay 2? That gives 3 at d=10, bright. Hmm 300/100 = 3 which is quite bright but fine. Maybe 150 -> 1.5. Use 200.

Sun radius 1.2. Planets radius 0.35, 0.5, 0.4. Orbits 4,7,10. Speeds 1.2, 0.7, 0.4? Inner faster.

Planet 2 moon as child of planet mesh, orbiting — need to animate moon's position relative to planet. Since it's a child of planet mesh, planet spins on its own axis which would make the moon's orbit rotate with it — that's fine visually but the moon orbit would be affected by planet spin. Actually that's a bit weird but acceptable. To rotate planet spin without affecting moon, could put moon under a group... but requirement says planet.add(moon). We can do planet mesh spin, and moon position updated manually each frame in local coordinates... but planet's rotation affects child positions. To avoid, we can just accept it, or we can set moon's position each frame in local space and compensate. Simpler: keep planet spin speed moderate and moon orbit; the moon will wobble. Or: spin the planet mesh but note that child transforms inherit. Alternative: make a planet group, add mesh to group, and add moon to the group... but requirement explicitly says planet.add(moon). Hmm, we could add moon to planet mesh but each frame set moon.position using local coords and... inheritance still applies.

Trick: we could set planet's spin via mesh rotation and counteract by setting moon matrix manually? Overkill. Just accept: moon orbit radius 1.0, planet spins at 1.5 rad/s, moon orbit at 2 rad/s. Visually it's an orbiting moon anyway, just the plane rotates. Fine. Actually it wouldn't be a "tilt" issue — rotation about Y axis just rotates the orbit phase, which is harmless! Rotating around Y just adds to the orbital angle. So it's completely fine. Since the moon orbits in XZ plane and planet spins about Y, the result is still a circular orbit in the XZ plane, just with a phase offset. 

But if we also want axial tilt, no. Keep planet spin about Y only.

Actually add slight tilt? No, keep simple.

Camera at (0, 9, 16) looking at origin, fov 50 — distances up to 10, whole system visible.

Add starfield? Not necessary but nice; no external assets, can use Points with random positions. Optional. Keep it minimal maybe add subtle stars via THREE.Points — fine. I'll add it, harmless.

Handle devicePixelRatio.

Write code:

```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 9, 16);
camera.lookAt(0,0,0);
```

Lights: ambient 0x223344 intensity 0.35 (r155+ ambient intensity is physical-ish but still scales). Use 0.3.

Sun: SphereGeometry(1.3, 32, 24), MeshBasicMaterial({color 0xffcc44}). Add point light intensity 220, decay 2, distance maybe 0 (infinite). Set distance 0 default is infinite. Ok.

Planets data array with distance, radius, color, speed, spin.

Use planet.add(moon) for planet 2.

Animation: elapsed via clock delta. Use angle += speed * dt.

Let me write:

```ts
interface PlanetData {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  orbitRadius: number;
  angle: number;
  angularSpeed: number;
  spinSpeed: number;
}
```

Create planets with THREE.Mesh typed.

Code:

```ts
const planets: Planet[] = [];
const planetDefs = [
  { dist: 4, radius: 0.4, color: 0x9fb8d0, orbitSpeed: 1.1, spinSpeed: 2.0, ... },
  ...
];
```

For each, mesh.position.x = dist, y=0. Then each frame compute angle.

For the moon: create in planet 2's local space: moon.position.set(1.05, 0, 0) and animate around.

Store moon angle.

Also maybe add a ring? no.

Orbit rings: optional, use RingGeometry or LineLoop with circle points. Nice touch: faint orbit lines. I'll add thin LineLoop circles of radius dist, rotated -PI/2 about X. That's fine (LineBasicMaterial). Keep subtle.

Animation loop:

```ts
const clock = new THREE.Clock();
let ready = false... 
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  sunMesh.rotation.y += dt * 0.1;
  for (const p of planets) {
    p.angle += p.angularSpeed * dt;
    p.mesh.position.set(Math.cos(p.angle)*p.dist, 0, Math.sin(p.angle)*p.dist);
    p.mesh.rotation.y += p.spinSpeed * dt;
  }
  moonAngle += dt * 2.2;
  moon.position.set(Math.cos(moonAngle)*1.1, Math.sin(moonAngle*0.5)*0.15, Math.sin(moonAngle)*1.1);
  renderer.render(scene, camera);
  if (!(window as any).__ready) (window as any).__ready = true;
});
```

Wait, __ready should be set after first frame rendered — this works.

Note: moon's local y offset gives slight incline — fine but keep 0 to stay in XZ plane... "all orbits are in the XZ plane" refers to planetary orbits around the sun. Moon orbit around planet—keep y=0 for safety.

Point light: also add a small visual? The sun sphere is basic material.

MeshStandardMaterial with roughness 0.7, metalness 0.05.

Sun light intensity: In three r155+, PointLight intensity is in candela; irradiance = intensity / d². At d=4 with decay 2: intensity 200/16 = 12.5 — way too bright, will blow out. Hmm. With renderer.toneMapping = ACESFilmic and exposure ~1, values >1 clip. Let's compute desired: at d=4 want ~1.5, at d=10 want ~0.6. intensity/d²: d=4 → I/16, want 1.5 → I=24; at d=10 → 24/100=0.24 too dim. Hmm, inverse square makes far dim. Use decay 1.2? Non-physical but allowed. Requirement says "mind physically based light intensity/decay" — so use decay 2 and pick intensity as compromise: I=60 → d=4: 3.75 (bright, will clip but with tone mapping ok), d=7: 1.22, d=10: 0.6. That's reasonable. With ACES tone mapping, 3.75 maps to about 0.9. Good. Use intensity 60 and toneMapping ACESFilmic, exposure 1.0.

Hmm but planet 1 at d=4 gets quite bright and side facing sun clipped white. That's fine, looks like strong sun.

Let's use intensity 50: d=4 → 3.1, d=7→1.02, d=10→0.5. Good.

Ambient 0.15 (with ACES, ambient 0.15 → dark). Use 0.25 color 0x334455? AmbientLight with color 0x445566 intensity 0.35 gives ~0.1-0.2 contribution. Fine.

Note: MeshStandardMaterial's lit result with ACES tone mapping — ok.

Set renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0.

Now TypeScript strict: window as any fine. Careful with types for arrays.

Let me write final code.

Also add stars: use BufferGeometry with Float32Array positions, PointsMaterial with size 0.08, sizeAttenuation true. Keep it simple with try. Random on sphere radius 60-120.

Resize handler.

Also add slight camera orbit? Not needed; maybe slow camera motion. Keep static per requirement.

Let me write the file.

```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
...
```

Full code:

```ts
import * as THREE from 'three';

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------- scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 9, 16);
camera.lookAt(0, 0, 0);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------- lights
scene.add(new THREE.AmbientLight(0x3a4a66, 0.35));

// Sun
const sunGeometry = new THREE.SphereGeometry(1.25, 48, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd15c });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// glow shell
const glow = new THREE.Mesh(
  new THREE.SphereGeometry(1.55, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
);
scene.add(glow);
```

Hmm glow shell with additive and depthWrite false — inner sun sphere occludes back? Fine.

Point light intensity 50 decay 2.

```ts
const sunLight = new THREE.PointLight(0xfff0c0, 50, 0, 2);
scene.add(sunLight);
```

Then planets.

```ts
type Planet = {
  mesh: THREE.Mesh;
  distance: number;
  angle: number;
  angularSpeed: number;
  spinSpeed: number;
};

const planetDefs = [
  { distance: 4, radius: 0.4, color: 0x9fd6ff, angularSpeed: 1.15, spinSpeed: 2.4 },
  { distance: 7, radius: 0.55, color: 0xffb37a, angularSpeed: 0.72, spinSpeed: 1.6 },
  { distance: 10, radius: 0.48, color: 0x8fe3a8, angularSpeed: 0.42, spinSpeed: 1.1 },
];
```

Note Mesh generic default: `THREE.Mesh` with no type params is fine (defaults). Actually `THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>` default — using bare `THREE.Mesh` is fine.

Orbit rings lines.

Then planets creation loop with index; for index === 1 add moon.

Moon: separate variable declared with `let moon: THREE.Mesh | null = null;` and moonAngle. Or handle in loop after creation.

I'll write:

```ts
const planets: Planet[] = [];
```

and after the loop, find planet 2's mesh: `const planetTwo = planets[1].mesh;` then create moon and `planetTwo.add(moon)`.

But the moon needs to be positioned each frame; store `moon` and `moonAngle`.

Typing: `const moon = new THREE.Mesh(moonGeo, moonMat);` fine.

Now animate.

Also for planets: position updates use p.mesh.position.

Write animation loop with clock.

Edge case: `(window as any).__ready` set once.

Full write out.

Also handle resize listener.

Double-check tsc strict: unused variables? `noUnusedLocals` might be on in strict? No, strict doesn't include noUnusedLocals. Fine but avoid anyway.

Let me produce final code.

Stars: 
```ts
const starCount = 900;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 60 + Math.random() * 80;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i*3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i*3+1] = r * Math.cos(phi);
  starPositions[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfd4ff, size: 0.9, sizeAttenuation: true }));
scene.add(stars);
```
Size 0.9 at distance 60-140 with size attenuation → small. Fine.

Camera far 2000 covers.

Done.