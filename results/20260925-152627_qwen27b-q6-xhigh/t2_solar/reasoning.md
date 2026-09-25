We need respond to user with single ts code block and nothing else. Need comply. Need produce TypeScript file complete, strict tsc zero errors. Need think carefully.

User: Build mini solar system. Import * as THREE from 'three'. Addons? probably not needed. Need create renderer append canvas. Size window, resize. Use setAnimationLoop. Motion delta/elapsed. Expose __scene, __camera, __renderer. After first frame rendered set __ready true. No external assets.

Requirements:
- Y up; orbits XZ plane around origin.
- Sun: sphere origin MeshBasicMaterial, plus PointLight origin that actually lights planets (mind physically based light intensity/decay).
- 3 planets: spheres MeshStandardMaterial at distances about 4,7,10, each orbiting sun different angular speed (inner faster).
- Every planet spins on own axis.
- Planet 2 has moon: small sphere added as child of planet mesh (planet.add(moon)), orbiting that planet.
- Weak AmbientLight so dark sides not pure black.
- Camera above and to side, looking origin, whole system visible.

Need strict TS. Need consider three.js physical light intensity/decay. In newer three, useLegacyLights? Since renderer.physicallyCorrectLights maybe deprecated. Modern three: renderer.useLegacyLights = false? Actually Three.js r155? default useLegacyLights = false? PointLight intensity is candela, decay physically 2 by default. For distance 4-10, need intensity maybe 100? Let's choose PointLight(0xffffff, 300, 0, 2) or maybe 800. With MeshStandardMaterial, ambient weak. To ensure lit, intensity high enough. Could set light.decay = 2. Physical: intensity at distance d = I / d^2? In three, with decay 2 and physically based, point light intensity in candela, irradiance = intensity / distance^2. At d=10, I=300 gives 3. At d=4 gives 18.75, maybe too bright but standard material okay? Might need tone mapping. Set renderer.toneMapping = THREE.ACESFilmicToneMapping; outputColorSpace = THREE.SRGBColorSpace? Strict types. Could set intensity 200. Maybe use light.power? But intensity works.

Need compile strict. Avoid any except window casts allowed? (window as any). tsc strict allows any. Need no missing types. Use import type? not necessary.

Need first frame ready: can set in animation callback before or after render. Need maybe use flag to set only once. const setReady = () => { (window as any).__ready = true; }; In animation callback after renderer.render if !ready. Since setAnimationLoop callback gets time, delta. We can use THREE.Clock. But three has Clock. Use clock.getDelta() returns seconds. Or use timestamp. Need motion uses delta/elapsed not frame counts. Use elapsed = clock.getElapsedTime(); delta = clock.getDelta(); But calling both? Clock.getElapsedTime returns elapsed and getDelta returns delta; both update? In three, getElapsedTime calls getDelta? Actually Clock has _startTime, _oldTime. getDelta() returns difference and updates _oldTime; getElapsedTime() returns diff since start and also updates? In code: getElapsedTime() { this.getDelta(); return this.elapsedTime; }? It updates. If call getDelta then getElapsedTime, second delta zero? Better call const delta = clock.getDelta(); const elapsed = clock.elapsedTime; after getDelta. Or use elapsed = clock.getElapsedTime(); delta = elapsed - lastElapsed. Simpler: const delta = clock.getDelta(); const elapsed = clock.elapsedTime;

Use angles: store angle variables in objects? Could use elapsed * angularSpeed. Since orbit position = radius * cos(angle), sin. If angle = elapsed * speed + phase. Spinning: planet.rotation.y = elapsed * spinSpeed + phase. Moon child: If moon added as child of planet, its local position should orbit planet. But if planet rotates, child moon will be carried by planet rotation? User wants planet.add(moon), orbiting that planet. If moon child of planet mesh and planet spins, moon position in planet local coordinates rotates with planet if we set moon.position constant? Actually if we want moon orbit in world or local? Since planet mesh rotation.y spin will rotate child around planet's local Y axis. That's okay: moon orbits as child, but also inherits spin and orbit. But if we set moon local position using time in animation, the planet's rotation adds to orientation. Need ensure moon orbits. Could create moonPivot child of planet? But requirement small sphere added as child of planet mesh (planet.add(moon)). We can directly planet.add(moon), not pivot. Then set moon.position.x/z in planet local space based on elapsed * moonSpeed + phase. Because planet's own rotation may make moon's world motion include spin, but still orbits. Maybe better not spin planet2 around Y? But every planet spins. It's okay.

Need planet distances about 4,7,10. Could use orbitGroup? Requirement orbits in XZ around origin. We can position planet meshes directly at coordinates each frame. Need planet.add(moon) for planet 2. If planet2 mesh is moved in world and rotated, moon child position local. Good.

Need whole system visible. Camera position (0, 10, 18) lookAt origin. For distance 10, radius 10; FOV 45 maybe. Need ensure far plane. Could position (0, 12, 20).

Potential strict issues:
- renderer = new THREE.WebGLRenderer({ antialias: true }); append canvas.
- scene = new THREE.Scene(); camera = PerspectiveCamera.
- const clock = new THREE.Clock();
- setAnimationLoop((time: number) => { const delta = clock.getDelta(); ...; renderer.render(...); if (!ready) { (window as any).__ready = true; ready = true; }}); The callback type? setAnimationLoop expects XRFrameRequestCallback? It can be (time: number, frame?: XRFrame) => void. If no types for XR? It's in three. Use renderer.setAnimationLoop(() => { ... }); no params needed. But need time? We can use clock. Use no param avoids type. But if no param, it's okay. For delta: const delta = clock.getDelta(); if (!Number.isFinite(delta) || delta < 0) delta = 0; const elapsed = clock.elapsedTime;
- Need maybe delta unused? We can use delta for angle? If using absolute elapsed, no need delta except maybe. User says motion must use delta/elapsed time. Using elapsed time is okay. To be safe, accumulate angles with delta: orbitAngle += orbitSpeed * delta; spinAngle += spinSpeed * delta. That uses delta. We can initialize angles with phase. Then use positions. This is robust and uses delta. For first frame delta may be large? okay. We can clamp delta to avoid huge jumps: const dt = Math.min(delta, 0.1); use dt. But elapsed still? Use delta. Good.

Need maybe if clock first delta large? clamp.

Define interface PlanetConfig { radius: number; orbitRadius: number; orbitSpeed: number; spinSpeed: number; color: number; scale: number; initialAngle: number; }.

Need type strict: arrays.

Planets:
1. Mercury-like: distance 4, radius 0.5, speed 0.9, spin 1.5, color 0xb8b0a8.
2. Earth: distance 7, radius 0.9, speed 0.45, spin 1.2, color 0x4f8cff, moon.
3. Mars: distance 10, radius 0.7, speed 0.28, spin 0.9, color 0xc45b3a.

Sun radius 1.5 maybe. PointLight intensity? If physical, at d=4 I=250 => 15.6, d=10=>2.5. Standard material with ambient 0.15 and tone mapping may be okay. Could use intensity 500: d=10=5, d=4=31. Might be bright. Maybe set renderer.toneMapping = THREE.ACESFilmicToneMapping; toneMappingExposure = 1.0. Use light intensity 350. Could also set light.decay = 2; distance 0. If three default useLegacyLights? If legacy false, intensity physical. If older version with legacy true? The requirement says physically based intensity/decay, so set renderer.useLegacyLights = false? But property may not exist in newer? In three r155+, useLegacyLights is deprecated but exists? In r165? maybe removed? Actually WebGLRenderer.useLegacyLights was deprecated in r155 and removed in r165? Let's check: Three.js migrated to physically correct lights default in r155? In r165, useLegacyLights removed? I think property might be removed. To avoid compile error, don't set useLegacyLights. Modern default is physical? If using latest three types, PointLight intensity default 1, decay 2. In physical mode, intensity is candela. We choose high intensity. If older default legacy true, high intensity 300 will blow out? But probably modern. Could set renderer.outputColorSpace = THREE.SRGBColorSpace. If types have. Should be okay. Could also use light.intensity = 800 and set material roughness/metalness? For visible.

Maybe to be safe across versions, use pointLight = new THREE.PointLight(0xffffff, 100, 0, 2); If legacy true, 100 is too bright (with no physical inverse square? In legacy, decay? legacy uses physicallyCorrect false; PointLight intensity 100 still huge? In legacy, light distance falloff? Actually if distance 0, no distance attenuation? In legacy with decay=2? I think legacy ignores physically correct? But intensity 100 would be very bright. But modern likely. Need maybe use power? PointLight.power? If set light.power = 1000? power is derived from intensity * 4π. In legacy, power maybe not? Hmm.

The user explicitly says mind physically based light intensity/decay. So likely modern three, use intensity in candela and decay 2. We can set light.decay = 2; light.distance = 0; light.intensity = 400. Could also comment? Final code only, no explanation. Comments okay. But single code block.

Need maybe use MeshBasicMaterial for sun with emissive? MeshBasicMaterial doesn't respond to light. color 0xffdd66. Add maybe sun mesh not receive light.

Need ambient light weak: new THREE.AmbientLight(0x404050, 0.25) or 0x223344 intensity 0.3.

Need orbit lines? not required. Could add subtle orbit circles? No external assets, geometry okay. But not necessary. Might improve. But keep minimal. If add LineLoop for orbits, use BufferGeometry and LineBasicMaterial. Strict okay. But not required. Could include? It may help. But user asked mini solar system; not need. Extra features okay as long requirements. But avoid complexity.

Need resize: function onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }; window.addEventListener('resize', onResize, false); Initial size: renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = ... update.

Need pixel ratio? optional. Set renderer.setPixelRatio(window.devicePixelRatio). Strict.

Need append canvas: document.body.appendChild(renderer.domElement); maybe style body margin? Since page no other HTML. We can set document.body.style.margin = '0'; background black? But if page has no other HTML, can still set. TypeScript: document.body.style.margin = '0'; document.body.style.overflow = 'hidden'; renderer.domElement.style.display = 'block';

Need strict no implicit any. Event listener type: window.addEventListener('resize', onResize); fine.

Need expose after creation before ready.

Potential issue: In strict, (window as any) okay. But if DOM lib not include? tsc strict with browser lib likely. We can use globalThis? But requirement window. Use (window as any).

Need first frame after rendered. If setAnimationLoop callback not called immediately? It is. We set after render. Good.

Need all orbits in XZ plane. Set positions y=0. Planets maybe at y=0. Moon orbit in local XZ plane? If planet.rotation.y only, local XZ remains world XZ except orbit? Moon local y=0. Good. But if planet has axial tilt? Not required. We can keep Y axis spin. If spin around Y, no tilt. Good.

Potential issue: Moon as child of planet2. If we rotate planet2 mesh around Y to spin, moon local position rotating with time will have combined angular speed = spin + moon relative? If set moon.position based on moonAngle in local coords, its world angle around planet includes planet's spin (orientation). But still orbit. If we want moon orbit independent of spin, could set moon.parent = planet but not rotate planet? No, planet spins. Could make moon's local position fixed and let planet spin carry moon around at spin speed; but moon speed tied to planet spin. Requirement moon orbiting that planet; can be via planet rotation? But they probably expect moon position updated. We can update local position. The combined motion okay. But if planet spin speed is 1.2 and moon speed maybe 2.0 local, world moon around planet =? In local coordinates, moon position angle changes at moonSpeed relative to planet's rotating frame. In world, if planet rotates at spinSpeed, the world angle of moon is spinAngle + moonLocalAngle? Since local frame rotated by spin. So total = spinSpeed + moonLocalSpeed. That's fine.

But one nuance: If planet mesh is positioned in world by setting planet.position, and rotated by planet.rotation.y, the child moon position local will be transformed by planet matrix. Good.

Need maybe use planet.position.set(Math.cos(orbitAngle)*orbitRadius, 0, Math.sin(orbitAngle)*orbitRadius). Y up; XZ plane. Good.

Need maybe planet initial angles different.

Need create meshes:
const sunGeometry = new THREE.SphereGeometry(1.6, 32, 16);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial); scene.add(sun);
const sunLight = new THREE.PointLight(0xfff2c4, 420, 0, 2); sunLight.decay = 2; scene.add(sunLight);

Planets material MeshStandardMaterial({ color, roughness:0.9, metalness:0.1 }).

Moon material MeshStandardMaterial({ color: 0xcccccc, roughness:1, metalness:0 }).

Moon scale 0.25 relative to planet 2 radius 0.9. local orbit radius 1.6.

Animation:
interface Planet { mesh: THREE.Mesh; orbitRadius: number; orbitSpeed: number; spinSpeed: number; orbitAngle: number; spinAngle: number; moon?: THREE.Mesh; moonAngle?: number; moonRadius?: number; moonSpeed?: number; }
But optional properties strict. Better define:
interface PlanetState { mesh: THREE.Mesh; orbitRadius: number; orbitSpeed: number; spinSpeed: number; orbitAngle: number; spinAngle: number; }
interface MoonState { mesh: THREE.Mesh; parent: THREE.Mesh; radius: number; speed: number; angle: number; }
const planets: PlanetState[] = [];
let moon: MoonState | null = null;

Add planet helper:
function createPlanet(distance: number, size: number, color: number, orbitSpeed: number, spinSpeed: number, initialAngle: number): PlanetState {
 const geometry = new THREE.SphereGeometry(size, 24, 16);
 const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
 const mesh = new THREE.Mesh(geometry, material);
 const state: PlanetState = { mesh, orbitRadius: distance, orbitSpeed, spinSpeed, orbitAngle: initialAngle, spinAngle: 0 };
 mesh.position.set(Math.cos(initialAngle)*distance, 0, Math.sin(initialAngle)*distance);
 scene.add(mesh);
 return state;
}

But helper uses scene; closure okay.

For moon: const moonPlanet = planets[1]; (index 1). Under strict noUncheckedIndexedAccess? tsc --strict does not include noUncheckedIndexedAccess unless set separately. User only says strict. So planets[1] type PlanetState. But if noUnchecked not on. Fine. Could be safe: const moonPlanet = planets[1]; if (moonPlanet) ... but strict without noUnchecked still allows. For robust if noUnchecked? They only strict. But we can write const moonPlanet = planets[1] as PlanetState? Hmm. If tsc with strict only, planets[1] is PlanetState. If noUnchecked, it would be PlanetState | undefined, but not required. Could still guard to be safe: const earth = planets[1]; if (!earth) throw new Error('...'); But throw might be okay. However if array length known, can use planets[1]! if noUnchecked? But non-null assertion okay in strict. Use const earth = planets[1]!; It compiles even with noUnchecked? Yes, if array indexing returns T | undefined, ! gives T. In strict without noUnchecked, T! okay. Use !.

Moon: const moonGeometry = new THREE.SphereGeometry(0.25, 16, 12); const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 1, metalness: 0 }); const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial); earth.mesh.add(moonMesh); const moonState: MoonState = { mesh: moonMesh, parent: earth.mesh, radius: 1.6, speed: 2.2, angle: 0.9 }; moon = moonState;

In update:
for (const p of planets) {
 p.orbitAngle += p.orbitSpeed * dt;
 p.spinAngle += p.spinSpeed * dt;
 const cos = Math.cos(p.orbitAngle); const sin = Math.sin(p.orbitAngle);
 p.mesh.position.set(cos * p.orbitRadius, 0, sin * p.orbitRadius);
 p.mesh.rotation.y = p.spinAngle;
}
if (moon) {
 moon.angle += moon.speed * dt;
 const cos = Math.cos(moon.angle); const sin = Math.sin(moon.angle);
 moon.mesh.position.set(cos * moon.radius, 0, sin * moon.radius);
 // maybe moon.rotation.y += moon.speed * dt * 0.5? Not required but can spin moon.
}
// maybe sun rotation? Sun can spin slowly. Not required but okay. sun.rotation.y += 0.05 * dt;

Need dt = Math.min(clock.getDelta(), 0.1); if (dt < 0) dt=0. But getDelta positive. Use const dt = Math.min(clock.getDelta(), 0.1); If first delta maybe 0. okay.

Ready flag: let ready = false; In loop after render: if (!ready) { ready = true; (window as any).__ready = true; }

Need maybe set animation loop before resize? okay.

Potential compile issue: THREE.SRGBColorSpace may not exist in older types? It exists. Could omit outputColorSpace to avoid. But modern. Could set renderer.toneMapping = THREE.ACESFilmicToneMapping; If not? It exists. Not necessary. But physically based light may produce colors; tone mapping nice. If types old? ACESFilmicToneMapping exists long. Use.

Potential compile issue: PointLight constructor parameters: (color?: number, intensity?: number, distance?: number, decay?: number). Good.

Potential compile issue: MeshStandardMaterial color accepts ColorRepresentation; number okay.

Potential issue: If using import * as THREE from 'three' and no addons, module resolution? okay.

Need only code block. Could include 'use strict'? Not needed.

Let's consider exact strict zero errors.

Draft:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 12, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const ambientLight = new THREE.AmbientLight(0x334455, 0.35);
scene.add(ambientLight);

const sunGeometry = new THREE.SphereGeometry(1.6, 32, 16);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd27a });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0,0,0);
scene.add(sun);

const sunLight = new THREE.PointLight(0xfff1cc, 520, 0, 2);
sunLight.position.set(0,0,0);
sunLight.decay = 2;
scene.add(sunLight);

interface PlanetState {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  orbitAngle: number;
  spinAngle: number;
}

interface MoonState {
  mesh: THREE.Mesh;
  parent: THREE.Mesh;
  radius: number;
  speed: number;
  angle: number;
  spinSpeed: number;
}

function addPlanet(distance: number, size: number, color: number, orbitSpeed: number, spinSpeed: number, initialAngle: number): PlanetState {
  const geometry = new THREE.SphereGeometry(size, 24, 16);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.08 });
  const mesh = new THREE.Mesh(geometry, material);
  const state: PlanetState = {
    mesh,
    orbitRadius: distance,
    orbitSpeed,
    spinSpeed,
    orbitAngle: initialAngle,
    spinAngle: initialAngle * 1.7,
  };
  mesh.position.set(Math.cos(state.orbitAngle) * distance, 0, Math.sin(state.orbitAngle) * distance);
  scene.add(mesh);
  return state;
}

const planets: PlanetState[] = [
  addPlanet(4, 0.45, 0x9b8f84, 0.95, 1.4, 0.4),
  addPlanet(7, 0.85, 0x4f7fd9, 0.48, 1.1, 2.3),
  addPlanet(10, 0.65, 0xc46b43, 0.27, 0.8, 4.4),
];

const earth = planets[1]!;
const moonGeometry = new THREE.SphereGeometry(0.22, 16, 12);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xbfbfbf, roughness: 1.0, metalness: 0.0 });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
earth.mesh.add(moonMesh);

const moon: MoonState = {
  mesh: moonMesh,
  parent: earth.mesh,
  radius: 1.5,
  speed: 2.4,
  angle: 1.1,
  spinSpeed: 0.9,
};

// maybe orbit lines? skip.

const clock = new THREE.Clock();
let ready = false;

function update(delta: number): void {
  const dt = Math.min(Math.max(delta, 0), 0.1);
  for (const planet of planets) {
    planet.orbitAngle += planet.orbitSpeed * dt;
    planet.spinAngle += planet.spinSpeed * dt;
    planet.mesh.position.set(
      Math.cos(planet.orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(planet.orbitAngle) * planet.orbitRadius
    );
    planet.mesh.rotation.y = planet.spinAngle;
  }
  moon.angle += moon.speed * dt;
  moon.spinSpeed? Actually spinSpeed is constant. Need moon spin angle. If MoonState has spinSpeed but no spinAngle. Could just moon.mesh.rotation.y += moon.spinSpeed * dt; But if using rotation.y increment, okay. Or add moonSpinAngle. Simpler: moon.mesh.rotation.y += moon.spinSpeed * dt; But if strict? okay.
  moon.mesh.position.set(Math.cos(moon.angle) * moon.radius, 0, Math.sin(moon.angle) * moon.radius);
  sun.rotation.y += 0.05 * dt;
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  update(delta);
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Check strict: MoonState has spinSpeed but not used except update. Good. `moon` not optional; no null. Good. `planets[1]!` okay. `Math.max(delta, 0)` if delta NaN? Math.max(NaN,0) NaN. Could use Number.isFinite. But getDelta returns number finite. To be safe: const dt = Number.isFinite(delta) ? Math.min(Math.max(delta,0),0.1) : 0; Good.

Potential issue: `renderer.outputColorSpace = THREE.SRGBColorSpace;` In some versions property may be string, okay. If type not? It exists. If older, maybe `outputEncoding`? But modern. Could omit to reduce risk. But physically based? Not necessary. If using three@latest, outputColorSpace default SRGB. Setting okay.

Potential issue: `THREE.ACESFilmicToneMapping` may require `toneMappingExposure`? no.

Potential issue: The file must compile with tsc --strict. Need no unused locals? `strict` does not include noUnusedLocals. But could have unused? All used. `parent` in MoonState not used? We set parent but not use. If noUnusedLocals? Interface property not local. okay. But maybe linter no. Could remove parent to avoid. But requirement planet.add(moon), not need store parent. MoonState: { mesh, radius, speed, angle, spinSpeed? } Could remove parent and spinSpeed if not used. But if we want moon spin, use mesh.rotation.y. Need no spinAngle? Could set moon.mesh.rotation.y = moon.angle * 0.5? Then no spinSpeed. Let's simplify:
interface MoonState { mesh: THREE.Mesh; radius: number; speed: number; angle: number; }
update: moon.angle += moon.speed * dt; moon.mesh.position.set(...); moon.mesh.rotation.y = moon.angle * 0.5;
No unused. Good.

But if moon child of rotating planet, moon.mesh.rotation.y local; okay.

Need maybe planet spin on own axis. We set rotation.y. If mesh has no tilt, axis Y. Good.

Need maybe `delta` parameter in update used. Good.

Need maybe camera whole system visible. At camera (0,12,20), fov 45, distance sqrt(484+400)=29.6. Vertical half height at distance ~ 29.6*tan(22.5)=12.3. Horizontal half width depends aspect. At width 16/9, horizontal half = 12.3*aspect=21.8. Outer radius 10 visible. At narrow aspect, horizontal half maybe <10? If portrait, aspect 0.5, half width 6.15, not whole system. Need whole system visible regardless? Could set camera farther or fov bigger, or adjust position based on aspect? Requirement whole system visible. For narrow windows, maybe camera should adapt. We can set camera.position.set(0, 14, 26) and fov 50. Still portrait maybe. Could in resize adjust camera position based on aspect to ensure radius 10 visible. Simpler: set fov 55, position (0, 14, 26), near 0.1 far 100. But if very narrow, still not. Could compute required distance: For perspective camera, to fit sphere radius R at origin, need distance d such that horizontal/vertical frustum. For fovY, vertical half-angle = fov/2, horizontal half-angle = atan(tan(fov/2)*aspect). Need min of vertical/horizontal. Required d = R / sin(minHalfAngle). But since object is disk radius 10 in XZ and camera above, not just sphere? But whole system visible if sphere radius ~11 fits. We can on resize set camera position distance based on aspect and fov to ensure. But user likely expects static. However "whole system visible" could be tested with window size default? Maybe. To be safe, implement resize to adjust camera position: keep direction (0, 0.55, 1) normalized, choose distance so radius 11 fits in frustum. But if camera too far, okay. Need lookAt origin. Could compute in onResize.

Let's design robust camera framing:
const CAMERA_FOV = 50;
const VIEW_RADIUS = 11.5;
const CAMERA_DIRECTION = new THREE.Vector3(0, 0.65, 1).normalize();
function updateCamera(): void {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.fov = CAMERA_FOV;
  camera.updateProjectionMatrix();
  const fovY = THREE.MathUtils.degToRad(camera.fov);
  const halfFovY = fovY / 2;
  const halfFovX = Math.atan(Math.tan(halfFovY) * aspect);
  const minHalfFov = Math.min(halfFovY, halfFovX);
  const distance = VIEW_RADIUS / Math.sin(minHalfFov);
  camera.position.copy(CAMERA_DIRECTION).multiplyScalar(Math.max(distance, 18));
  camera.lookAt(0,0,0);
  camera.updateProjectionMatrix();
}
Need initial call. But if aspect very large, halfFovX huge? min halfFovY. Good. If minHalfFov small, distance large. If minHalfFov close to 90? no. Need if minHalfFov <=0? aspect >0. For aspect 0? window innerWidth 0? maybe. Guard: if (minHalfFov <= 0.0001) distance = 40. Good.

But if camera direction has y=0.65, z=1, distance to fit sphere radius ensures entire sphere visible. Good. This satisfies camera above and side. Could be too far for normal: aspect 16/9, fov 50, halfY 25 deg, tan=0.466, aspect 1.778 => halfX atan(0.829)=39.6 deg, min half=25 deg, distance=11.5/sin25=27.5. Direction normalized length ~1.176, position (0, 16.7, 23.7). Good. For portrait aspect 0.5, halfX atan(0.233)=13.1, distance=11.5/sin13.1=50.8, pos far. Good.

Need maybe no `const CAMERA_DIRECTION = new THREE.Vector3(0, 0.65, 1).normalize();` okay.

But if using dynamic camera in resize, initial camera before resize? We'll set camera aspect and update. Could define camera with fov 50, position dummy, call updateCamera after renderer created. Need onResize call updateCamera. This is more robust.

Potential strict: `THREE.MathUtils.degToRad` exists. `camera.fov` number. `Math.min`. Good.

But user specified "Camera above and to the side, looking at the origin, whole system visible." Dynamic distance okay.

Need maybe `renderer.setPixelRatio(window.devicePixelRatio);` on resize too? Could. In onResize, renderer.setPixelRatio(window.devicePixelRatio). Not necessary but okay.

Need maybe body styles before append? okay.

Potential issue: If tsc strict with DOM lib, `window.innerWidth` is number. Good.

Potential issue: `document.body` may be null? In DOM type, body: HTMLElement. Not null. okay.

Potential issue: `renderer.setAnimationLoop(() => { ... });` The callback can receive time; if no params okay. But type expects `((time: number) => void) | null`. Our function `() => void` assignable. Good.

Need after first frame rendered set __ready = true. We set after render. Good.

Need no external assets. Good.

Need maybe use `THREE.Color` for background. okay.

Let's think about physical light intensity. If we set PointLight intensity 520, ambient 0.35. With tone mapping, planets visible. But maybe too dim? Let's estimate. In three physical, MeshStandardMaterial diffuse irradiance = lightColor * intensity / distance^2 * NdotL. At distance 10, 520/100=5.2. With albedo ~0.3, outgoing ~1.5, tone mapping ACES maps to visible. At distance 4, 520/16=32.5, albedo 0.3 => 9.75, ACES saturates but okay maybe too bright. Could lower to 250: d10=2.5, d4=15.6. Better. Use 260. Ambient 0.35. Could set sunLight.intensity = 280. Let's choose 300. d4=18.75, d10=3. Good. Tone mapping ACES. Fine.

Could also set `sunLight.power = 800;` but intensity direct simpler. The requirement "mind physically based light intensity/decay" maybe expect setting `decay = 2` and high intensity. We can add comment? code only. Comments okay. But maybe no comments to be concise.

Need maybe `sunLight.distance = 0;` means no cutoff. Good.

Need maybe planets MeshStandardMaterial receive light. Default. Good.

Need maybe `scene.add(sun)` and `scene.add(sunLight)`. Good.

Need maybe `sunLight.position.set(0, 0, 0);`.

Need maybe `moon` added as child of planet mesh: `earth.mesh.add(moonMesh);` exactly. Good.

Need maybe planet 2 is index 1. Distances about 4,7,10. Good.

Need all orbits around origin: we set positions relative origin. Good.

Need every planet spins: update rotation.y. Good.

Potential issue: Planet meshes have geometry centered at origin. Setting rotation.y spins around local Y through center. Good.

Potential issue: Moon child local position y=0. But planet mesh rotation.y will orient local XZ plane; still a circular orbit in plane perpendicular to planet axis. Since planet axis is Y, okay. But because planet also orbits sun, moon world path epicyclic. Good.

Potential issue: If planet2 spin changes local frame, moon's local position angle update plus parent rotation leads to moon possibly not exactly around planet center? It is always at local radius from center. Good.

Need maybe `moon.mesh.position.set(...)` in local coordinates. Good.

Could add orbit path lines for visual. If add, must be in XZ. Use THREE.LineLoop with points. But not required. Extra might not harm. But strict? Let's consider adding subtle orbit lines maybe nice. But code length. Could include to enhance. But if tests only check scene graph? extra objects okay. But no need.

Need maybe `renderer.shadowMap.enabled = false;` no.

Need maybe `const clock = new THREE.Clock();` If setAnimationLoop pauses, delta large; clamp. Good.

Need maybe `update(delta)` uses `Number.isFinite(delta)`. Good.

Need maybe if `delta` is undefined? setAnimationLoop callback no param, we call clock.getDelta. Good.

Need final answer only code block. Ensure no extra text.

Let's refine code for strict and robust.

Full code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03040a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const ambientLight = new THREE.AmbientLight(0x334455, 0.4);
scene.add(ambientLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffcf66 })
);
scene.add(sun);

const sunLight = new THREE.PointLight(0xfff2d4, 320, 0, 2);
sunLight.decay = 2;
scene.add(sunLight);

interface PlanetState {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  orbitAngle: number;
  spinAngle: number;
}

interface MoonState {
  mesh: THREE.Mesh;
  radius: number;
  speed: number;
  angle: number;
}

function createPlanet(
  orbitRadius: number,
  size: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number,
  initialAngle: number
): PlanetState {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 24, 16),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.08,
    })
  );
  const state: PlanetState = {
    mesh,
    orbitRadius,
    orbitSpeed,
    spinSpeed,
    orbitAngle: initialAngle,
    spinAngle: initialAngle * 1.3,
  };
  mesh.position.set(
    Math.cos(state.orbitAngle) * orbitRadius,
    0,
    Math.sin(state.orbitAngle) * orbitRadius
  );
  scene.add(mesh);
  return state;
}

const planets: PlanetState[] = [
  createPlanet(4, 0.45, 0x9a8f83, 0.95, 1.4, 0.5),
  createPlanet(7, 0.85, 0x4c7dd6, 0.46, 1.1, 2.4),
  createPlanet(10, 0.62, 0xc16b45, 0.26, 0.8, 4.6),
];

const planet2 = planets[1]!;
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 16, 12),
  new THREE.MeshStandardMaterial({
    color: 0xc8c8c8,
    roughness: 1,
    metalness: 0,
  })
);
planet2.mesh.add(moon);

const moonState: MoonState = {
  mesh: moon,
  radius: 1.5,
  speed: 2.3,
  angle: 1.2,
};

const clock = new THREE.Clock();
let ready = false;

const cameraDirection = new THREE.Vector3(0, 0.62, 1).normalize();
const viewRadius = 11.5;

function frameSystem(): void {
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  camera.aspect = aspect;
  const halfFovY = THREE.MathUtils.degToRad(camera.fov) / 2;
  const halfFovX = Math.atan(Math.tan(halfFovY) * aspect);
  const minHalfFov = Math.min(halfFovY, halfFovX);
  const distance =
    minHalfFov > 0.0001 ? viewRadius / Math.sin(minHalfFov) : 45;
  camera.position.copy(cameraDirection).multiplyScalar(Math.max(distance, 16));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function updateSystem(delta: number): void {
  const dt = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), 0.1) : 0;

  for (const planet of planets) {
    planet.orbitAngle += planet.orbitSpeed * dt;
    planet.spinAngle += planet.spinSpeed * dt;
    planet.mesh.position.set(
      Math.cos(planet.orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(planet.orbitAngle) * planet.orbitRadius
    );
    planet.mesh.rotation.y = planet.spinAngle;
  }

  moonState.angle += moonState.speed * dt;
  moon.position.set(
    Math.cos(moonState.angle) * moonState.radius,
    0,
    Math.sin(moonState.angle) * moonState.radius
  );
  moon.rotation.y = moonState.angle * 0.6;

  sun.rotation.y += 0.05 * dt;
}

function onResize(): void {
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameSystem();
}

window.addEventListener('resize', onResize);
frameSystem();

renderer.setAnimationLoop(() => {
  updateSystem(clock.getDelta());
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Check strict: `window.innerWidth / Math.max(window.innerHeight, 1)` number. `camera.fov` number. `THREE.MathUtils.degToRad` number. `Math.atan`. `minHalfFov > 0.0001`. `Math.sin`. Good.

But `renderer.outputColorSpace = THREE.SRGBColorSpace;` If type expects `THREE.ColorSpace`, string. Good. In some older three types, `outputColorSpace` not present? If compile against older, error. But likely modern. Could remove to reduce risk. The requirement doesn't mention color space. But physically based light maybe okay without. If we remove, less chance. However modern three default outputColorSpace is SRGB; setting not needed. If using three version where outputColorSpace exists, okay. If not, no. Since user says expert Three.js, likely latest. But to maximize compile across? Hard. `THREE.SRGBColorSpace` introduced r152? If old, fail. But import 'three' latest. Use it? I'd keep maybe not needed. `toneMapping` also could be old? ACESFilmic exists. `outputColorSpace` not essential. Remove to be safer? If latest, default SRGB. If older, default Linear? But visual. Compile? older may not have. The task likely uses modern. But zero errors with whatever installed? Usually they use recent three. `renderer.outputColorSpace` is current. I'd keep? Hmm.

Need "physically based light intensity/decay" maybe if `outputColorSpace` not set, colors might be off. But not compile.

Could set `renderer.useLegacyLights = false;` to ensure physical? But property may be removed/deprecated. In latest types maybe still? Let's check three r160: WebGLRenderer.useLegacyLights: boolean? deprecated but type? In r165 removed? Not safe. Don't.

Could set `sunLight.intensity = 320` enough. If legacy mode default in old three, 320 too bright. But requirement physical. okay.

Need maybe `MeshBasicMaterial` sun not lit. Good.

Potential issue: `document.body.style.margin = '0';` If body has other styles? okay.

Potential issue: `cameraDirection` const used in frameSystem. Good.

Potential issue: `planets[1]!` with strict no noUnchecked, okay. If lint no, okay. If TypeScript strict only, non-null assertion on non-nullable? It's allowed. No error.

Potential issue: `moon.rotation.y = moonState.angle * 0.6;` If moon is child of planet2, its rotation local. Good.

Potential issue: `updateSystem(clock.getDelta());` Clock.getDelta returns number. Good.

Potential issue: setAnimationLoop callback doesn't use provided time. okay.

Need maybe use elapsed time not just delta? We use delta accumulated. Good.

Need maybe if tab hidden, clock.getDelta huge, clamped 0.1. Good.

Need maybe first frame ready after render. Good.

Let's think if tests check `(window as any).__ready === true` after first frame. If animation loop first frame may be after requestAnimationFrame. Good.

Potential issue: If WebGL context fails? Not considered.

Potential issue: The page has no other HTML, but we modify body style. okay.

Need final only ```ts code block. Ensure no analysis in final.

Double-check user's hard rules:
- Import Three.js as: import * as THREE from 'three'; Addons from 'three/addons/...'. We do.
- File must compile tsc --strict zero errors. Need ensure no implicit any. The callback in setAnimationLoop is `() => void`, okay. `onResize` no params. `updateSystem(delta: number)`. `createPlanet` typed. `planets[1]!` okay. `(window as any)` okay.
- Create WebGLRenderer yourself and append canvas to document.body. yes.
- Size renderer from window.innerWidth / innerHeight and handle resize (camera aspect + renderer size). yes frameSystem sets aspect and update, onResize sets size.
- Use renderer.setAnimationLoop for render loop. yes.
- Motion must use delta/elapsed time, not frame counts. yes.
- Expose for testing. yes.
- After first frame rendered set ready. yes.
- No external assets. yes.

Specific:
- Sun: sphere at origin MeshBasicMaterial, plus PointLight at origin that actually lights planets (mind physically based light intensity/decay). yes.
- 3 planets: spheres MeshStandardMaterial at distances about 4,7,10, each orbiting sun different angular speed inner faster. speeds 0.95,0.46,0.26 yes.
- Every planet spins on own axis. yes rotation.y.
- Planet 2 has moon: small sphere added as child of planet mesh (planet.add(moon)), orbiting that planet. yes planet2.mesh.add(moon). Is planet 2 the second? yes index 1. Distances 7.
- Weak AmbientLight. yes intensity 0.4 maybe weak. Could be 0.25. 0.4 maybe okay. "weak" maybe 0.2. Use 0.25? With physical point light, dark side needs not pure black. 0.35. Fine.
- Camera above and to side, looking origin, whole system visible. frameSystem ensures.

Potential visual: PointLight at origin inside Sun mesh. Sun mesh MeshBasicMaterial might occlude light? In three, lights are not occluded by meshes unless shadows. Sun mesh does not block PointLight. Good.

Potential issue: Since PointLight is at origin and Sun sphere radius 1.6, light is inside geometry. Does that matter? No, light not affected by material, no shadows. Planets outside. Good.

Potential issue: If tests inspect that PointLight is at origin and lights planets. Good.

Potential issue: If tests inspect `scene.getObjectByName`? Not set. Not required.

Potential issue: If tests check moon is child of planet2 mesh: yes. But they may identify planet 2 by distance ~7 or second in scene? The planet meshes are added to scene in order: planet1, planet2, planet3. The moon is child of planet2. Good.

Potential issue: If tests check all planets have MeshStandardMaterial. yes.

Potential issue: If tests check sun material is MeshBasicMaterial. yes.

Potential issue: If tests check AmbientLight. yes.

Potential issue: If tests check PointLight intensity/decay physical: decay 2, intensity 320. Good.

Potential issue: If tests check orbits in XZ plane: positions y=0. Moon local y=0. Good.

Potential issue: If tests check angular speeds inner faster: yes.

Potential issue: If tests check spin on own axis: rotation.y changes. Good.

Potential issue: If tests check camera above and side: cameraDirection (0,0.62,1) above +z side. Good.

Potential issue: If tests check whole system visible: dynamic. Good.

Could there be an issue with frameSystem using `Math.max(window.innerHeight, 1)` but renderer.setSize uses actual innerHeight maybe 0? If height 0, aspect Infinity? We guard. Good.

Potential issue: `camera.fov` initially 50. frameSystem uses. Good.

Potential issue: `renderer.setPixelRatio` in onResize may reset size? okay.

Potential issue: `frameSystem()` called before first render. Good.

Potential issue: `document.body.style.margin = '0';` might be too late? canvas appended after? We set before append? In draft after renderer.domElement style then document body styles then append. okay.

Potential issue: If body not present? browser page has body. okay.

Let's consider exact TypeScript with strict and `import * as THREE from 'three'`. If no `allowSyntheticDefaultImports`? irrelevant. Module resolution? assume.

Need maybe no addons. okay.

Could there be a strict error due to `renderer.outputColorSpace = THREE.SRGBColorSpace;` if `THREE.SRGBColorSpace` type is `string` and property expects `ColorSpace` union? It's fine. But if three version type uses `WebGLRenderer.outputColorSpace: ColorSpace`, and `THREE.SRGBColorSpace` is `'srgb'` string literal. Good.

Could there be strict error due to `document.body.style.margin = '0';` CSSStyleDeclaration property margin: string. okay.

Could there be strict error due to `window.addEventListener('resize', onResize);` onResize type `() => void` assignable to EventListener? yes.

Could there be strict error due to unused `planet2`? used. `moon` used. `moonState` used. `cameraDirection` used. `viewRadius` used.

Could there be strict error due to `new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 })` property `metalness: number`, 0 okay.

Could there be strict error due to `sun.rotation.y += 0.05 * dt;` sun type Mesh, rotation Euler. okay.

Could there be strict error due to `clock.getDelta()` in callback without `this`? no.

Could there be strict error due to `Number.isFinite(delta)` where delta number. okay.

Potential issue: `renderer.setAnimationLoop(() => { ... });` In WebXR types, callback may be `(time: number, frame: XRFrame) => void`; but `() => void` is assignable. Good.

Potential issue: If `three` module uses global `XRFrame` type and lib dom not include? It has its own? okay.

Now maybe we should include orbit rings? Not necessary. But if we include, extra geometry. Could make scene nicer. But no need and increases risk. Keep minimal.

Let's consider if physical light intensity 320 with ambient 0.4 and ACES might make inner planet very bright, but okay. Could reduce to 220. At d4=13.75, d10=2.2. With ambient 0.4, dark side visible. Maybe 260. Let's choose 260. But if standard material roughness 0.85, diffuse. 260/d^2. At d10 2.6, visible. At d4 16.25, ACES compress. Good. Use 260.

Could set `sunLight.intensity = 260;`

Maybe in physical units, PointLight intensity 260 candela, at 10m 2.6 lux, okay. Ambient 0.4 is dimensionless? In physical, ambient intensity maybe 0.4. Good.

Potential issue: If renderer.toneMapping ACES, ambient 0.4 might be dark but not pure black. Good.

Potential issue: If outputColorSpace SRGB, colors okay.

Let's maybe set `renderer.toneMappingExposure = 1.1;` Not necessary.

Need maybe `scene.background` black. Good.

One nuance: `MeshStandardMaterial` with PointLight physical and no environment, metallic 0.08. okay.

Now final answer code block only. Ensure no trailing explanation.

Double-check final code with no missing semicolons. Use consistent.

Let's write final:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03040a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const ambientLight = new THREE.AmbientLight(0x334455, 0.35);
scene.add(ambientLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffcf66 })
);
scene.add(sun);

const sunLight = new THREE.PointLight(0xfff2d4, 260, 0, 2);
sunLight.decay = 2;
scene.add(sunLight);

interface PlanetState {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  orbitAngle: number;
  spinAngle: number;
}

interface MoonState {
  mesh: THREE.Mesh;
  radius: number;
  speed: number;
  angle: number;
}

function createPlanet(
  orbitRadius: number,
  size: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number,
  initialAngle: number
): PlanetState {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 24, 16),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.08,
    })
  );

  const state: PlanetState = {
    mesh,
    orbitRadius,
    orbitSpeed,
    spinSpeed,
    orbitAngle: initialAngle,
    spinAngle: initialAngle * 1.3,
  };

  mesh.position.set(
    Math.cos(state.orbitAngle) * orbitRadius,
    0,
    Math.sin(state.orbitAngle) * orbitRadius
  );

  scene.add(mesh);
  return state;
}

const planets: PlanetState[] = [
  createPlanet(4, 0.45, 0x9a8f83, 0.95, 1.4, 0.5),
  createPlanet(7, 0.85, 0x4c7dd6, 0.46, 1.1, 2.4),
  createPlanet(10, 0.62, 0xc16b45, 0.26, 0.8, 4.6),
];

const planet2 = planets[1]!;

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 16, 12),
  new THREE.MeshStandardMaterial({
    color: 0xc8c8c8,
    roughness: 1,
    metalness: 0,
  })
);
planet2.mesh.add(moon);

const moonState: MoonState = {
  mesh: moon,
  radius: 1.5,
  speed: 2.3,
  angle: 1.2,
};

const clock = new THREE.Clock();
let ready = false;

const cameraDirection = new THREE.Vector3(0, 0.62, 1).normalize();
const viewRadius = 11.5;

function frameSystem(): void {
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  camera.aspect = aspect;

  const halfFovY = THREE.MathUtils.degToRad(camera.fov) / 2;
  const halfFovX = Math.atan(Math.tan(halfFovY) * aspect);
  const minHalfFov = Math.min(halfFovY, halfFovX);
  const distance = minHalfFov > 0.0001 ? viewRadius / Math.sin(minHalfFov) : 45;

  camera.position.copy(cameraDirection).multiplyScalar(Math.max(distance, 16));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function updateSystem(delta: number): void {
  const dt = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), 0.1) : 0;

  for (const planet of planets) {
    planet.orbitAngle += planet.orbitSpeed * dt;
    planet.spinAngle += planet.spinSpeed * dt;

    planet.mesh.position.set(
      Math.cos(planet.orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(planet.orbitAngle) * planet.orbitRadius
    );
    planet.mesh.rotation.y = planet.spinAngle;
  }

  moonState.angle += moonState.speed * dt;
  moon.position.set(
    Math.cos(moonState.angle) * moonState.radius,
    0,
    Math.sin(moonState.angle) * moonState.radius
  );
  moon.rotation.y = moonState.angle * 0.6;

  sun.rotation.y += 0.05 * dt;
}

function onResize(): void {
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  frameSystem();
}

window.addEventListener('resize', onResize);
frameSystem();

renderer.setAnimationLoop(() => {
  updateSystem(clock.getDelta());
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Check if `renderer.outputColorSpace` may cause compile if type not? If concerned, remove. But final likely modern. The hard rule says Addons from three/addons, implies modern three. Good.

Could there be an issue with `planets[1]!` and strict `noUncheckedIndexedAccess` if hidden? The prompt only `tsc --strict`, not noUnchecked. But if they use additional flags? It says strict zero errors. Non-null assertion handles if index type T | undefined. Good.

Could there be an issue with `window` in module? If `tsc` with lib DOM. yes.

Could there be an issue with `document.body` if strict `noPropertyAccessFromIndexSignature`? no.

Could there be an issue with `renderer.domElement.style.display = 'block';` okay.

Could there be an issue with `scene.background = new THREE.Color(...);` okay.

Potential improvement: Use `renderer.setAnimationLoop(() => { const delta = clock.getDelta(); ... })`. If clock.getDelta called after long idle, dt clamped. Good.

Potential issue: If `renderer.setAnimationLoop` first call occurs before `frameSystem`? We call before. Good.

Potential issue: The sun light at origin may not light sun mesh because MeshBasic no. Good.

Potential issue: The PointLight intensity 260 might be considered not "actually lights" if physical and default useLegacyLights? In latest, yes. If older default legacy true, intensity 260 huge but still lights. If decay 2? In legacy, distance 0, decay maybe? Actually legacy PointLight with distance 0 has no attenuation? Then all planets lit 260, too bright but visible. With tone mapping, maybe white. But still lights. If test only checks light exists, okay.

Could set intensity 60 to be safe in legacy? But physical d10=0.6 too dim. The prompt specifically physical. Use 260.

Maybe set `sunLight.power = 1000;` In physical, power = intensity * 4π, so intensity ~79.5, too dim. No.

Maybe set `sunLight.intensity = 1000` and `renderer.toneMappingExposure = 0.8`. d10=10, d4=62. Too bright. 260 good.

Could add `sunLight.shadow`? no.

Now final. Ensure only code block. final.
