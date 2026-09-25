We need answer user wants single ts code block only. Need produce final with code block only. Need satisfy strict TypeScript. Need import three as 'three'. Need no external assets. Need create renderer, scene, camera, lights, sun, planets, moon, resize, animation loop with delta/elapsed. Expose globals. Need careful physically based light intensity/decay. In Three.js r150+ renderer.useLegacyLights deprecated? Physical lighting? Need set light.decay maybe 2 and intensity high. PointLight default decay=2? In physically correct, intensity candela. With distance 0? If distance=0 no attenuation? Actually decay physically: attenuation = pow(saturate(-distance/distance? no). For PointLight: if decay = 2 and distance = 0, light intensity not cut off but attenuates by inverse square? Let's recall Three.js light intensity: physicallyCorrectLights removed; renderer.useLegacyLights default false. PointLight intensity is candela, power lumens. In shader, PointLight: irradiance = lightColor * attenuation? If decay 2 and distance 0: attenuation = pow( saturate( -vPointLightPosition.w / cutoffDistance? ), decayExponent )? For punctual light attenuation: distance = length(lightPos - pos); attenuation = pow(saturate(-distance/cutoffDistance + 1), decayExponent) maybe. For point light cutoffDistance=pointLight.distance. If cutoffDistance=0, maybe no distance falloff? In punctual light: if cutoffDistance > 0 and decay > 0. So if distance=0 no attenuation -> all planets same brightness. User says mind physically based light intensity/decay, so likely set distance and decay. But physically based with distance 10, decay 2 means intensity must be huge. Could set pointLight.decay = 2; pointLight.distance = 30; pointLight.intensity = maybe 500? Need ensure planets lit. Or set decay=0? But "mind physically based light intensity/decay" suggests set decay and appropriate intensity. Since renderer.useLegacyLights false default. Need maybe pointLight.intensity = 100; decay=2; distance=30. At d=4, irradiance ~100/16=6.25; at d=10 ~1, enough? Maybe sun MeshBasic material unaffected. Standard materials need light. Ambient weak.

Need strict compile. Potential issues: THREE.MeshStandardMaterial colors? OK.

Animation: use renderer.setAnimationLoop((time)=>{ const t = time/1000; ...}); Need first frame ready. Use flag firstFrame = false; in loop if !firstFrame set ready true after render.

Need camera above and side: position (12,10,18) lookAt origin. Size from innerWidth/Height.

Need handle resize.

Need planet data. Planet orbit pivot? We can create planet mesh and rotate via angle. Need spin own axis: planet.rotation.y += spin speed * delta or set angle. Moon child: add moon to planet mesh; rotate moon pivot? Since moon child of planet mesh, if we add moon as child directly and set its position, then rotating planet mesh will also rotate moon around? Actually if moon.position = (moonDist,0,0) and moon mesh added to planet mesh, then rotating planet mesh on Y will move moon around planet (because child's world transform is parent's rotation). But planet mesh also spin; if we set planet.rotation.y = spinAngle for axial spin, then moon orbits at same angular speed as spin? If planet spin speed maybe different? Need moon orbiting planet, could create moonPivot child of planet mesh, rotate moonPivot.y, with moon at x=distance. Since moon is child of planet mesh (as child via moonPivot? Requirement: planet.add(moon) specifically? It says planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet. So must add moon directly to planet mesh, not a pivot? It says (planet.add(moon)). If add moon directly, then orbit by updating moon.position around origin of planet using angle. That works independent of planet rotation? Wait child position is in parent's local space. If planet mesh rotates, child's world orbit rotates with planet local axes. But we can update moon.position in local space based on moon angle; that gives moon orbit in planet's local XZ plane, but because planet rotates (spin) around Y, local XZ rotates too, so world moon orbit still circular but phase shifted by planet spin? Actually parent rotates around Y; local XZ plane rotates with parent. If moon local position = (r cos m, 0, r sin m), world position = parent rotation matrix * local. Since parent rotation is around Y, the local orbit is transformed by rotation: angle_world = planetSpin + moonLocalAngle. That's still orbiting planet. Fine.

Need all orbits in XZ plane. Planet positions x=cos(dist), z=sin(dist), y=0.

Potential issue with MeshStandardMaterial and point light physically based: If using pointLight.intensity=300, distance=30, decay=2. For d=4, maybe very bright. Could use tone mapping ACES and intensity. No external assets. We can tune.

Strict TS: Use const clock = new THREE.Clock(); const delta = clock.getDelta(); const elapsed = clock.getElapsedTime(); But if using getDelta inside loop, elapsed maybe OK. setAnimationLoop timestamp: const elapsed = timestamp / 1000; Need delta? Can compute lastTime. Use timestamp? setAnimationLoop callback receives time in ms (DOMHighResTimeStamp) and maybe frame. Need no strict error. Could do:

let lastTime = 0;
let ready = false;
renderer.setAnimationLoop((time: number) => {
 const elapsed = time / 1000;
 const delta = Math.min(0.1, elapsed - lastTime);
 lastTime = elapsed;
...
 if (!ready) { ready = true; (window as any).__ready = true; }
});

Need if time starts 0, delta 0 first. OK. But renderer.setAnimationLoop type might callback parameters? In TS Three types: setAnimationLoop(callback: XRFrameRequestCallback | ((time: number, frame?: XRFrame) => void) | null): void? With TS types maybe (time: number, frame?: XRFrame) okay. But XRFrame type may require DOM lib? If no DOM? Browser TS should have DOM. To avoid XRFrame type issues, use (time: number) =>. Fine.

Potential tsc strict with window: (window as any). OK.

Need renderer outputColorSpace? Optional. Could set renderer.toneMapping = THREE.ACESFilmicToneMapping; toneMappingExposure=1.2. Good.

Need physically based light intensity/decay: Could include comment? No matter. Maybe pointLight.intensity = 1000? Let's analyze brightness.

In Three.js physical units, point light intensity is candela, MeshStandardMaterial albedo. Irradiance for point light with decay=2, distance=30: punctual light attenuation = pow(saturate(-distance/cutoffDistance + 1), decay). At d=4: (1 - 4/30)^2 = 0.751; intensity 1000 => 751? But actual maybe /distance^2? Let's inspect physically based? In Three.js r155, lights use physical units: point light attenuation: if cutoffDistance > 0 and decayExponent > 0: attenuation = pow(saturate(-lightDistance / cutoffDistance + 1.0), decayExponent); else attenuation = 1.0; Then lightColor = color * intensity * getDistanceAttenuation(...). But intensity units? Maybe they divide by PI? I recall getDistanceAttenuation uses: float distanceFalloff = 1.0 / max(pow(lightDistance, decayExponent), 0.01); if cutoffDistance > 0 distanceFalloff *= pow2(saturate(1.0 - pow4(lightDistance/cutoffDistance))); return distanceFalloff; In physical branch. So yes inverse square. Intensity candela; irradiance = intensity/d^2. To illuminate at d=10 need intensity maybe 100 for ~1 irradiance. With ACES, exposure maybe. Could set intensity=200, decay=2, distance=30. Then at d=4: 12.5, at d=7:4, at d=10:2. Standard diffuse BRDF divides PI? final maybe less. Could set 400. Ambient 0.1. Sun basic color bright.

Need maybe no bloom. Fine.

Need planet sizes. Sun radius 1.2, planets radius .5 .7 .6, moon .15. Distances 4,7,10. Ensure no clipping: camera far 1000. Orbit speeds: inner faster: 0.5, 0.28, 0.18 rad/s maybe. Spin speeds: 1.2, 0.8, 0.5. Moon orbit angular speed maybe 2.0 rad/s. Use elapsed angles: planet.rotation.y = spinSpeed * elapsed (or delta accumulate). Orbits: angle = elapsed * speed + phase.

Need all in XZ: positions (cos(angle)*dist, 0, sin(angle)*dist).

Could define type PlanetData { mesh: THREE.Mesh; orbitRadius: number; orbitSpeed: number; spinSpeed: number; phase: number; }

Strict: THREE.Mesh has no userData? fine.

Need avoid unused variables. Use all.

Code skeleton:

import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(10, 8, 16);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(ambient);

const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 16), sunMaterial);
scene.add(sun);

const pointLight = new THREE.PointLight(0xfff2cc, 350, 60, 2);
pointLight.position.set(0,0,0);
scene.add(pointLight);

const planets: { mesh: THREE.Mesh; orbitRadius: number; orbitSpeed: number; spinSpeed: number; phase: number }[] = [];

function makePlanet(radius, color, orbitRadius, orbitSpeed, spinSpeed, phase) { const geo = new THREE.SphereGeometry(radius, 32, 16); const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 }); const mesh = new THREE.Mesh(geo, mat); scene.add(mesh); planets.push({mesh, orbitRadius, orbitSpeed, spinSpeed, phase}); return mesh; }

const planet1 = makePlanet(...);
const planet2 = makePlanet(...);
const planet3 = makePlanet(...);

const moon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 12), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 }));
planet2.add(moon);
const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 2.5;

window resize handler.

let lastTime = 0;
let ready = false;
renderer.setAnimationLoop((time: number) => {
 const elapsed = time / 1000;
 const delta = Math.min(0.1, elapsed - lastTime);
 lastTime = elapsed;
 for (const p of planets) {
   const angle = elapsed * p.orbitSpeed + p.phase;
   p.mesh.position.set(Math.cos(angle)*p.orbitRadius, 0, Math.sin(angle)*p.orbitRadius);
   p.mesh.rotation.y += p.spinSpeed * delta; // If using delta, okay. But p.mesh.rotation.y accumulates. Could also set elapsed*spinSpeed + p.phase for deterministic. Using delta with strict.
 }
 const moonAngle = elapsed * moonOrbitSpeed;
 moon.position.set(Math.cos(moonAngle)*moonOrbitRadius, 0, Math.sin(moonAngle)*moonOrbitRadius);
 // Sun maybe pulse? no.
 renderer.render(scene, camera);
 if (!ready) { ready = true; (window as any).__ready = true; }
});

Need if elapsed - lastTime first negative? time starts maybe 0, last 0, ok. If first time >0? no negative. But if time ms and last 0, delta maybe large first if browser starts at e.g. 1000? min clamps.

Need maybe expose __scene etc immediately.

Could include OrbitControls? No requirement. Avoid addons.

Need ensure TypeScript strict with THREE types: new THREE.SphereGeometry(radius, widthSegments, heightSegments) ok. MeshStandardMaterial options: color: number. OK. renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) OK. window.devicePixelRatio type number? In DOM lib. If strict noImplicitAny? Math.min args number. OK.

Potential issue with THREE.AmbientLight intensity with physically correct: AmbientLight intensity maybe physical? Weak 0.12. OK.

Need ensure planets visible with point light at origin and decay. If too dark, adjust. Maybe pointLight.intensity = 500. Use distance 50, decay 2. At 10 irradiance 5. With standard material diffuse maybe albedo/PI? Actually point light in physical: light.color = color * intensity * attenuation, then BRDF diffuse = albedo * dot / PI. At intensity 500, d=10: irradiance ~5, radiance ~ albedo*5/PI ≈0.16 for albedo .5. ACES maybe OK. Could increase to 1500. At d=4: 93, radiance 15 maybe overexposed but ACES handles. Maybe use decay=1? Physically based default decay=2. If intensity=800, distance=50. Let's choose 600? Need ensure all planets not black. Ambient 0.25 helps. Could set renderer.toneMappingExposure=1.5. But no need exact. Maybe set pointLight.power? If physically correct, light.intensity is candela. Could also set pointLight.decay = 2. Use intensity 2500? At d=10: 25; diffuse ~25/PI ≈8 overexposed; ACES. At d=4:156 very over. Too bright. Could choose 300: d=10 3; d=4 18.75. Reasonable. Add ambient .15.

Could avoid inverse square by using pointLight.distance = 0 and decay = 0, but user warns. Let's set decay=2.

Need maybe sun radius 1, point light inside sun. Planets don't receive light inside? Point light at origin, sun mesh at origin, could occlude? MeshBasic sun does not cast shadows, no shadows. Point light at origin not affected by mesh. OK.

Need all orbits XZ. Planet's own axis spin: mesh.rotation.y only; axis aligned Y. Planet 2 spin rotates moon with it; still orbits? The moon local position angle elapsed*moonSpeed, parent spin adds. It's still orbiting planet. But if planet spin is high, moon world orbit angular speed spin+moon; OK.

Could use separate angle variables accumulate to avoid jump when timestamp large? Use elapsed. OK.

Need maybe planet phases. Good.

Question: "Every planet also spins on its own axis." If using mesh.rotation.y = spinSpeed * elapsed maybe spin. If mesh rotation also affects child moon orientation. OK.

Need "whole system visible" camera position. At (12,10,18) visible distances 10 plus radii. FOV 60. OK.

Need no HTML aside from canvas. Good.

Need final: single ```ts code block and nothing else. Must not include analysis. Ensure no import addons. OK.

Let's consider strict compile issues with type for setAnimationLoop callback: Some versions expect (time: number, frame?: XRFrame) => void. If we use (time: number) =>, assignable. If callback type requires no return? OK.

Potential tsc error: THREE.Mesh geometry/material types? OK.

Potential issue: `renderer.outputColorSpace = THREE.SRGBColorSpace;` if type exists. Could include or not. If not needed. To avoid older type mismatch, skip? But with latest three, exists. OK but skip for compatibility.

Potential issue: `window.innerWidth` may be number but if no DOM lib? Hard rules browser. OK.

Potential issue: `new THREE.PointLight(0xfff2cc, 600, 60, 2)` constructor parameters color, intensity, distance, decay. In TypeScript type, intensity? number. OK.

Potential issue: `pointLight.decay = 2;` OK.

Potential issue: `renderer.setAnimationLoop((time: number) => { ... });` if time not used? used. OK.

Potential issue: unused `delta` if not? We use for spin. Good.

Maybe use planet.rotation.y = elapsed * spinSpeed + phase. But then delta variable unused? We can avoid delta and compute spin with elapsed; but user says Motion must use delta/elapsed time. elapsed enough. But "use delta/elapsed time, not frame counts." Using elapsed is OK. If use spin via delta, ensure delta not zero? yes. Could have weird if first delta 0 but later. Fine.

Maybe if time is in ms from performance.now, elapsed can be large (page load maybe seconds). Spin accumulates from 0 using delta, so not affected by initial time. Good. Orbits use elapsed absolute from page time; that's fine but maybe phase offset large. OK. If we want consistent after page load? Fine.

Potential improvement: `const time = timestamp / 1000;` parameter name time could shadow window.time? no.

Potential issue: `renderer.setAnimationLoop` callback's `time` can be undefined? In TS type maybe number. OK.

Need maybe add `renderer.domElement.style.display = 'block';`? Not necessary. Body margin default 8px could show canvas partly off? Hard rule page no other HTML. Default body margin may cause scrollbars and canvas offset. We can set body margin via code: `document.body.style.margin = '0';` Good. Also canvas display block. This is allowed. Need ensure canvas size matches innerWidth/Height. With margin 0 no scroll. Add:

document.body.style.margin = '0';
renderer.domElement.style.display = 'block';

This affects canvas CSS. Good.

Resize:

window.addEventListener('resize', () => {
 camera.aspect = window.innerWidth / window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth, window.innerHeight);
});

Need if innerHeight 0? Not.

Potential strict: assigning style OK.

Could define planet data using array literal, create meshes. Need moon reference outside. We'll write.

Let's think about physical light: If renderer.useLegacyLights? In newer three, `useLegacyLights` default false, removed? Could set `renderer.useLegacyLights = false;` if exists, but type maybe deprecated or absent in latest. Avoid.

Could set `pointLight.castShadow = false` default. OK.

Potential issue: `new THREE.SphereGeometry(1.1, 32, 16)` low? OK.

Potential issue: `scene.background = new THREE.Color(0x000008);` OK.

Need no external assets. Good.

Maybe add subtle starfield? Points? Not required. Could avoid extra. But maybe scene black. OK.

Need ensure PointLight lights planets: If using physically based, with distance 60, decay 2. If distance=60, attenuation includes smooth cutoff at 60; all planets <60. Good.

Let's test mentally brightness: color 0xffffff, intensity 400, distance 60, decay 2. In ShaderChunk punctuallight: irradiance = pointLight.color * getDistanceAttenuation(lightDistance, pointLight.distance, pointLight.decay); pointLight.color = color * intensity. getDistanceAttenuation: 
```
float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
if ( cutoffDistance > 0.0 ) {
  distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
}
return distanceFalloff;
```
At d=10: 1/100=0.01 * (1 - (10/60)^4) ~0.009996 *400=3.998. Diffuse irradiance dot maybe. BRDF diffuse = albedo * dot * RECIPROCAL_PI. If albedo .5, ~0.636, linear. sRGB output maybe ~0.83? Good. At d=4: 25 *0.997*400=99.7 -> radiance 15.9, overbright, ACES tonemap to near white. Inner planet may be blown out. Could reduce intensity to 120: d=4 7.5, d=10 1.2; radiance albedo .5 ~0.19 linear at outer; sRGB ~0.47. Ambient .12 adds. Maybe choose 180: d=4 11.25 (radiance 1.8), d=10 1.8 (0.29). With ACES. Let's pick 250? At d=4 radiance 4, ACES. OK. Need all visible. Maybe use `pointLight.intensity = 180;` distance 50. At d=10: 1.8. OK. But if albedo low? Colors can be bright. Let's choose material colors with high albedo: 0x5fa8ff, 0xffaa44, 0x66cc88. MeshStandardMaterial roughness .7 metalness 0.

Could also add hemisphere? No.

Need `renderer.toneMapping = THREE.ACESFilmicToneMapping;` may dim; exposure 1.4. OK.

Alternatively use `pointLight.decay = 0` with intensity 2 for no falloff, but user specifically. Maybe physically based but not necessarily inverse square? It says mind physically based light intensity/decay. So set decay=2 and intensity high enough.

Maybe use `pointLight.power = ...`? No.

Need maybe set `pointLight.distance = 0` if no cutoff? But decay with distance=0 no falloff in old? Actually in current distance=0 means infinite, but decay still used? Check `punctualLight`: `pointLight.distance` is cutoff. If cutoff=0, in getDistanceAttenuation: if cutoffDistance > 0 ... only for cutoff. But first distanceFalloff always inverse pow. If cutoff=0, still inverse square. Good. But if physically correct? For non-physical legacy, if decay=2 and distance=0? In old, if cutoffDistance <=0 return 1? Hmm. Let's use distance=50.

Maybe set `pointLight.intensity = 500;` to ensure outer. Could be too bright inner. But ACES + exposure. If inner overexposed, acceptable? Could adjust by reducing planet size? No.

Maybe set light decay = 1.5, intensity 200, distance 50. Physically based can use decay. Inner at 4: 200/(4^1.5=8)=25; outer 200/(10^1.5=31.6)=6.3. Better range. But physically based decay usually 2; but can be any. "mind physically based light intensity/decay" could mean avoid legacy default intensity 1 with decay 2? If use decay=2 intensity too high. Use 300? We'll use 400 and ACES. Inner planet maybe white, but fine. Could choose 200. Let's choose 220? Let's not overthink.

Need perhaps include `THREE.ColorManagement.enabled = true`? Default. No.

Strict compile: `const planets: PlanetData[] = [];` define interface. OK.

Potential issue: `mesh.rotation.y += p.spinSpeed * delta;` delta maybe NaN if first lastTime 0 and time undefined? no.

Could use `let previousTime = 0;`

Set ready after first render:

if (!ready) { ready = true; (window as any).__ready = true; }

Expose:

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

At bottom or after creating. Before loop maybe. After first frame only ready. Good.

Need `renderer.setAnimationLoop(animate);` where animate parameter time. Could type:

function animate(time: number): void { ... }
renderer.setAnimationLoop(animate);

If time is ms but `performance.now()` maybe. OK.

Need maybe first frame rendered: If `setAnimationLoop` doesn't call immediately, but after next vsync. OK.

Potential issue: If using `elapsed = time / 1000`, and time is relative to document load, not since animation start. OK.

Potential issue: `const delta = Math.min(0.1, elapsed - previousTime);` If previousTime > elapsed due to timestamp origin? no. But if time 0, delta 0. If time jumps backward? no.

Need all in one file.

Let's draft code:

```ts
import * as THREE from 'three';

document.body.style.margin = '0';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(12, 9, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.1, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffd54a })
);
scene.add(sun);

const sunLight = new THREE.PointLight(0xfff4d6, 220, 60, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

interface PlanetInfo { mesh: THREE.Mesh; orbitRadius: number; orbitSpeed: number; spinSpeed: number; phase: number; }
const planets: PlanetInfo[] = [];

function createPlanet(...): THREE.Mesh { ... }

const planet1 = createPlanet(0.45, 0x6ba8ff, 4, 0.65, 1.4, 0);
const planet2 = createPlanet(0.62, 0xff8844, 7, 0.38, 0.9, Math.PI / 3);
const planet3 = createPlanet(0.52, 0x63d38b, 10, 0.22, 0.7, Math.PI);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 24, 12),
  new THREE.MeshStandardMaterial({ color: 0xbfbfbf, roughness: 0.95, metalness: 0.0 })
);
planet2.add(moon);
const moonOrbitRadius = 1.25;
const moonOrbitSpeed = 2.8;

function handleResize(): void { ... }
window.addEventListener('resize', handleResize);

let previousTime = 0;
let ready = false;

function animate(time: number): void {
  const elapsed = time / 1000;
  const delta = Math.min(0.1, elapsed - previousTime);
  previousTime = elapsed;

  for (const planet of planets) {
    const orbitAngle = elapsed * planet.orbitSpeed + planet.phase;
    planet.mesh.position.set(
      Math.cos(orbitAngle) * planet.orbitRadius,
      0,
      Math.sin(orbitAngle) * planet.orbitRadius
    );
    planet.mesh.rotation.y += planet.spinSpeed * delta;
  }

  const moonAngle = elapsed * moonOrbitSpeed;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Need createPlanet type:

function createPlanet(radius: number, color: number, orbitRadius: number, orbitSpeed: number, spinSpeed: number, phase: number): THREE.Mesh {
 const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 }));
 scene.add(mesh);
 planets.push({ mesh, orbitRadius, orbitSpeed, spinSpeed, phase });
 return mesh;
}

OK.

Check: `renderer.setAnimationLoop(animate);` callback returns void. OK.

But if `time` passed as DOMHighResTimeStamp and previousTime initialized 0, if the first timestamp is e.g. 100ms, delta 0.1. Fine. If time is `undefined` at first call? TS says number, runtime? Three.js animation loop: callback(time, frame) where time = performance.now() or timestamp? In WebGLRenderer setAnimationLoop uses XRAnimationLoop or requestAnimationFrame. For non-XR: `callback(time)`. Good.

Potential issue: Strict with noUnusedLocals? The prompt only tsc --strict not noUnusedLocals. But even if, all used.

Potential issue: The interface uses `THREE.Mesh` imported. OK.

Potential issue: If using `document.body.style.margin = '0';` before body exists? In module script after body exists if deferred? In browser module scripts are deferred, body exists. OK.

Potential issue: The page has no other HTML. Our canvas appended. Good.

Maybe include `camera.updateProjectionMatrix()` not necessary after resize only. OK.

Could include moon orbit plane? It uses XZ local. Because planet may be rotated, moon orbits in planet's local XZ. OK.

But requirement "all orbits are in the XZ plane around the origin" refers planets. Moon orbit around planet also in XZ local. Good.

Potential issue: Planet spins on its own axis; if spin speed applied to planet2 and moon as child, moon's spin around its own axis? Requirement: Every planet spins, not moon. Moon doesn't need spin. Moon as child will rotate with planet? The moon mesh's orientation will inherit parent's rotation and its position orbit; moon mesh may also appear to not spin relative? If moon is child and we set moon.position only, moon's local rotation remains identity; parent rotation rotates its orientation, so moon's world orientation rotates with planet, giving tidal lock-like? Fine.

Need maybe ensure moon not inside planet: radius .62 + .15, orbit 1.25. OK.

Potential issue: MeshStandardMaterial on planets, point light at origin. For planets at 4,7,10, side facing sun lit. Good.

Could use `THREE.MathUtils.degToRad`? no.

Let's think about physically based intensity again. If renderer.toneMapping ACES and exposure 1.35, intensity 220. At d=10: 2.2 irradiance. For albedo color e.g. green 0x63d38b (linear? ColorManagement converts sRGB? Material color is sRGB and converted to linear if color management. Green linear maybe .14? Diffuse radiance ~2.2*.14/pi=0.098, sRGB ~0.35 plus ambient. OK. At d=4 blue maybe linear .15? inner 220/16=13.75 * .15/pi=.65 -> sRGB .84, good. Orange albedo high? maybe over. Good.

Need maybe use `MeshStandardMaterial({ color: new THREE.Color(color) })` no.

Potential tsc issue: `THREE.Color` constructor accepts number? yes. `new THREE.MeshBasicMaterial({ color: 0xffd54a })` ColorRepresentation. OK.

Potential issue: `scene.background = new THREE.Color(0x000008);` OK.

Potential issue: no `export default`. Not needed.

Potential issue: `window.addEventListener('resize', handleResize);` TS OK.

Need maybe `renderer.dispose`? no.

Could include comments? It's code, OK. User wants single code block. Could include comments but no extra text. Fine.

Double-check with tsc --strict: If `time` parameter is type `number`, OK. If Three types `setAnimationLoop(callback: XRFrameRequestCallback | null)` where XRFrameRequestCallback `(time: number, frame: XRFrame) => void`. Passing `(time: number) => void` assignable? In TS, function with fewer parameters assignable to function with more. OK. If XRFrame type not available? Three types include from dom? If DOM lib missing? But browser likely includes DOM. To avoid type referencing XRFrame? It's in type definition, no matter if DOM? It might import `XRFrame` from lib.dom? If no DOM, could error. But hard rules browser; likely lib dom. If strict with target ES2020 DOM. OK.

Could avoid type for animate parameter by using `renderer.setAnimationLoop((time) => { ... });` TS infers from overload. If DOM missing maybe inferred? no. Fine.

Need no `import * as THREE from 'three/addons/...'`. No addons.

Potential issue: `new THREE.WebGLRenderer({ antialias: true })` with no `canvas`. OK.

Could add `renderer.outputColorSpace = THREE.SRGBColorSpace;` Might improve but no need. If types older, might error if no. Skip.

Let's consider if physically based with `PointLight` default `decay=2` but if `renderer.useLegacyLights` is true in older Three? If older version? In older default useLegacyLights = true (pre r155?), then intensity units are not physical? But hard not specify version. If useLegacyLights true, intensity 220 will be extremely bright. Could detect and set? `renderer.useLegacyLights = false;` if property exists. In newer property deprecated or removed; setting might TS error if property not in type. Could use `(renderer as any).useLegacyLights = false;` to ensure physical. But if not exists, no effect. This avoids overbright in old. But if old uses `physicallyCorrectLights` property. Could set both:

const anyRenderer = renderer as any;
anyRenderer.useLegacyLights = false;
anyRenderer.physicallyCorrectLights = true;

TS strict allows any. This may help physical behavior. But in latest, useLegacyLights false default, physicallyCorrectLights removed? Setting extra property harmless. Should we include? It might be unnecessary but safe. However, setting `physicallyCorrectLights` in latest does nothing. OK. In older, `physicallyCorrectLights = true` with `useLegacyLights`? In older, if physicallyCorrectLights true, legacy false. Good.

Maybe include after renderer creation:

const rendererAny = renderer as any;
rendererAny.useLegacyLights = false;
rendererAny.physicallyCorrectLights = true;

Strict OK. But some TS types might have deprecated property? We cast. Good. Need ensure no unused? rendererAny used. OK.

Could include. It shows minding physical. But no need.

Need maybe set pointLight.decay explicitly even though constructor includes. OK.

Potential issue: If old physicallyCorrectLights true and intensity candela, our intensity good. If old default false? Good.

Potential issue: In latest, `renderer.useLegacyLights` property removed? Setting extra property doesn't matter. If property is deprecated but present? OK.

Maybe add `renderer.toneMapping = THREE.ACESFilmicToneMapping;` type exists. OK.

Potential issue: `scene.background` color linear? OK.

Potential issue: If using ACES tone mapping, MeshBasicMaterial sun will also be tone mapped and appear less bright? MeshBasicMaterial color goes through tone mapping? Yes, renderer tone mapping applies to all rendered materials unless material.toneMapped=false. For sun, we may want it bright. Could set `sunMaterial.toneMapped = false;` Type includes toneMapped boolean. Good. Then sun stays color. Add:

const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd54a });
sunMaterial.toneMapped = false;

OK.

Need maybe point light intensity and sun material not lit. OK.

Potential issue: If toneMapped false on MeshBasicMaterial, with outputColorSpace maybe. OK.

Maybe include `sunMaterial.toneMapped = false;` before mesh. OK.

Need maybe planet materials toneMapped true default.

Could include stars? No.

Let's think if there is any requirement about physically based light intensity/decay: Maybe they expect `pointLight.decay = 2; pointLight.intensity = 1000;` If too dark tests might check not black? There is no test beyond ready. But visual. Could make brighter to ensure visible. Use intensity 600 and exposure 1.0. If too bright inner, but still visible. Outer visible. Let's calculate if inner overexposed to white, not bad. But if all bright white due to tone mapping? Outer maybe. Use 300.

Maybe choose `sunLight.intensity = 300;` and `renderer.toneMappingExposure = 1.0`. At d=10 radiance ~300/100=3 * albedo linear/pi. For albedo blue linear ~0.14? radiance .13 -> sRGB .4, OK. For white planet albedo linear 1 -> .95, OK. For d=4 white -> 23.8/pi=7.6, ACES white. OK. Use 300. Let's choose 300. With ambient .15. If planets colors not white, OK.

Need maybe `pointLight.distance = 80` so no cutoff. Use 100? Inverse square plus cutoff near 60? At 10 no issue. If 60, negligible attenuation at 10. Good.

Could use no distance (0) to avoid cutoff. But with physical inverse square still. Let's set distance = 0 and decay = 2. In latest getDistanceAttenuation inverse square regardless cutoff; if cutoff 0 no extra. But in some older physical? For PointLight: if decay > 0 and distance == 0? In legacy physically correct? Hmm. The docs: `distance` - the distance from the light where the intensity is 0. When 0, light will never attenuate. Default. But this is legacy? In physical? Actually in Three.js, `decay` default 2; If `distance` is 0, light never attenuates? I need recall. In old punctuallight: 
```
if (cutoffDistance > 0.0 && decayExponent > 0.0) {
  return pow(saturate(-lightDistance / cutoffDistance + 1.0), decayExponent);
}
return 1.0;
```
In legacy (non-physical), if distance=0, no attenuation. In physical, getDistanceAttenuation separate: first inverse square always if decay>0? Wait there are two versions. For physical, docs: When decay = 2, physically correct falloff. If distance=0, light never attenuates? Actually I think in physical, if distance=0, the light still has inverse square? Let's inspect recent shader:
`float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {`
```
#if defined ( LEGACY_LIGHTS )
 if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) { return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent ); }
 return 1.0;
#else
 float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
 if ( cutoffDistance > 0.0 ) { distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) ); }
 return distanceFalloff;
#endif
}
```
So physical distance=0 still inverse square. Good. So use distance=0 is OK for physical; cutoff just smooth. If older legacy, distance=0 no attenuation, but our anyRenderer.physicallyCorrectLights true. If property not work? If old default false, distance=0 no attenuation -> all equally lit; not physical. Use distance>0 ensures attenuation even in legacy? In legacy with cutoffDistance >0, falloff linearish pow(decay). With decay=2 and distance=60, at d=10 attenuation=(1-10/60)^2=.69, at d=4=.82, not inverse square but some. Intensity 300 would be huge because no inverse square. But if anyRenderer.physicallyCorrectLights false in old? If setting fails? It won't fail. So physical. OK.

Maybe set `pointLight.distance = 100` to have cutoff no issue. Good.

Could use `pointLight.intensity = 1000` if physical. But if old physicallyCorrectLights not applied due to version? If old r149, property exists and should apply. Good.

Need if latest removed physicallyCorrectLights? Extra property no effect. useLegacyLights default false. Good.

Let's perhaps include both:

```
const anyRenderer = renderer as any;
anyRenderer.useLegacyLights = false;
anyRenderer.physicallyCorrectLights = true;
```

But setting `physicallyCorrectLights` might produce warning in latest? No runtime? Might just set undefined property.

Potential issue: In latest, `useLegacyLights` may have no setter and assignment might warn? It may be deprecated but present with getter/setter; setting false fine. If removed, extra property. OK.

Now, any issue with physically based and `AmbientLight` intensity 0.15: In physical, ambient intensity is direct multiplier, 0.15 fine.

Maybe include `planet2.castShadow`? no shadows.

Potential problem: `camera.lookAt(0,0,0)` then if we later resize? no.

Potential problem: The renderer loop time `time` maybe relative to time origin (performance.now) not animation start. `previousTime` 0, delta large clamped. Good. But `elapsed` large (page load 1000s), angles use large elapsed, no issue. Could use separate elapsed starting at first frame:

```
let elapsed = 0;
function animate(time) {
 const delta = ...;
 elapsed += delta;
 ...
}
```

This uses delta and elapsed relative to animation. Better. Do that. `time` only for delta. Avoid large phase from page load. But if first delta clamped maybe. Good.

Implementation:

```
let previousTime = 0;
let elapsed = 0;
let ready = false;
function animate(time: number): void {
 const delta = Math.min(0.1, time / 1000 - previousTime);
 previousTime = time / 1000;
 elapsed += delta;
 ... use elapsed
}
```

This satisfies delta/elapsed. If first time >0, delta clamped .1, elapsed .1. Good.

Could use `const currentTime = time / 1000;` to avoid division twice.

```
const currentTime = time / 1000;
const delta = Math.min(0.1, currentTime - previousTime);
previousTime = currentTime;
elapsed += delta;
```

OK.

If time not starting 0, first delta maybe .1; no negative. If timestamp decreases? no.

Could use clock but clock.getDelta also. But need elapsed, clock.getElapsedTime. Simpler:

```
const clock = new THREE.Clock();
...
const delta = Math.min(0.1, clock.getDelta());
const elapsed = clock.getElapsedTime();
```

But note getDelta updates oldTime; getElapsedTime returns total since start. Good. Simpler and avoids type time param. But setAnimationLoop callback requires parameter? We can ignore: `renderer.setAnimationLoop(() => { ... });` Then use clock. That's allowed; motion uses delta/elapsed. Could be simpler. But the first call after some delay? Clock starts at creation, delta maybe large clamped. elapsed includes from creation not animation, OK. But if page load before loop, elapsed could be large. No issue. We could reset clock? `clock.start()`. Fine. But using callback time is fine.

Need maybe if no param, callback type `(time: number, frame?: XRFrame) => void` passing `() => void` assignable. OK.

Let's keep time param for explicit.

Potential strict with `(window as any).__ready = true;` OK.

Need maybe set globals before animate? yes.

Let's ensure no line exceeds? Not relevant.

Could final code include comments. OK.

Let's consider if `renderer.setAnimationLoop(animate);` and `animate` expects number, but Three types in some versions: `setAnimationLoop(callback: XRFrameRequestCallback | null): void;` XRFrameRequestCallback `(time: number, frame: XRFrame) => void`. OK. If type is `(time: number, frame?: XRFrame) => void`, OK. If strict function parameter types? no.

Potential issue: `THREE.ACESFilmicToneMapping` type? In older? Exists. OK.

Potential issue: `toneMapped` on material? MeshBasicMaterial type includes `toneMapped: boolean` from Material. OK.

Potential issue: `renderer.domElement.style.display = 'block';` OK.

Need maybe ensure no default body margin and canvas display. Good.

Could maybe add `window.__ready` only after first frame. Good.

Testing might check `__ready` after requestAnimationFrame. Our ready after render. Good.

Potential issue: If module execution error due to import path? They will use importmap? Hard says import three as 'three'. OK.

Let's think about strict compile of `interface PlanetInfo` inside script, no exports. OK.

Potential issue: `Math.min(window.devicePixelRatio, 2)` with `window.devicePixelRatio` type number, but if no DOM lib maybe error. Browser. OK.

Potential issue: `const anyRenderer = renderer as any;` no unused? used. OK.

Potential issue: `createPlanet` returns mesh unused for planet1 and planet3? We assign constants; no noUnusedLocals. If strict only, noUnusedLocals not included. If they run tsc --strict but no noUnusedLocals. But to be safe, avoid unused constants? If `planet1` and `planet3` unused, with noUnusedLocals would error, but strict doesn't include. Could still be safe by not assigning unused: just call `createPlanet(...)` for p1/p3, and for p2 assign to get moon. But if createPlanet returns and not used, no local. Let's do:

```
createPlanet(0.45, ...);
const planet2 = createPlanet(...);
createPlanet(...);
```

But order matters? planet2 second. This avoids unused local planet1/3. If we want maybe no issue. Let's do that. However, `createPlanet` returns mesh but we ignore; that's fine. `planet2` used for moon. `planets` array holds meshes.

Potential noUnusedParameters? strict does not include. But if they enable? no.

Need maybe no unused `ready`? used.

Potential noUnusedLocals not in strict but good practice. `anyRenderer` used. OK.

Potential unused `time`? used. `delta` used. `elapsed` used.

Potential unused function `handleResize`? used.

Could make `createPlanet` return void? We need planet2 mesh; so return.

Let's final code:

```
import * as THREE from 'three';

document.body.style.margin = '0';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00000a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 9, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const rendererCompat = renderer as any;
rendererCompat.useLegacyLights = false;
rendererCompat.physicallyCorrectLights = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd24a });
sunMaterial.toneMapped = false;
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 16), sunMaterial);
scene.add(sun);

const sunLight = new THREE.PointLight(0xfff3d0, 300, 80, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

interface PlanetInfo { ... }
const planets: PlanetInfo[] = [];

function createPlanet(...): THREE.Mesh { ... }

createPlanet(0.45, 0x64a9ff, 4, 0.72, 1.35, 0);
const planet2 = createPlanet(0.62, 0xff8b4a, 7, 0.42, 0.95, Math.PI / 3);
createPlanet(0.54, 0x5fd98c, 10, 0.24, 0.75, Math.PI);

const moon = new THREE.Mesh(...);
planet2.add(moon);
const moonOrbitRadius = 1.25;
const moonOrbitSpeed = 2.6;

function handleResize(): void { ... }
window.addEventListener('resize', handleResize);

let previousTime = 0;
let elapsed = 0;
let ready = false;

function animate(time: number): void {
 const currentTime = time / 1000;
 const delta = Math.min(0.1, currentTime - previousTime);
 previousTime = currentTime;
 elapsed += delta;

 for (const planet of planets) { ... }

 const moonAngle = elapsed * moonOrbitSpeed;
 moon.position.set(...);

 renderer.render(scene, camera);

 if (!ready) { ready = true; (window as any).__ready = true; }
}

renderer.setAnimationLoop(animate);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Need ensure previousTime initialized 0 but first time maybe 0.016, delta .016. If first time huge 500, delta .1, elapsed .1, previousTime 500, future elapsed increments from .1. OK. If first time 0, delta 0, elapsed 0. OK.

Potential if `currentTime - previousTime` negative? If time wraps? no. Could `Math.max(0, Math.min(...))` to be safe. Use `Math.max(0, Math.min(0.1, currentTime - previousTime));` Strict. Good.

```
const delta = Math.max(0, Math.min(0.1, currentTime - previousTime));
```

OK.

Potential issue: `sunLight` variable not used after? It is used scene.add. OK.

Potential issue: `ambientLight` used. OK.

Potential issue: `sun` variable not used? It is assigned and scene.add; local unused? If noUnusedLocals, `sun` not used after assignment? It is used? Actually `const sun = new THREE.Mesh(...); scene.add(sun);` used. OK.

Potential issue: `ambientLight` used. OK.

Potential issue: `rendererCompat` maybe no use after assignment? It is used. OK.

Potential issue: `createPlanet` function with `return mesh;` but calls for p1/p3 ignore return. OK.

Potential issue: If they want planet 2 moon as child of planet mesh, yes.

Potential issue: moon orbits planet using elapsed; because parent local rotation from spin also changes moon local orientation? The position is updated each frame. Good.

Potential issue: Because moon is child of planet2, its world position = planet2 world + rotated by planet2 spin. Since planet2 position set absolute and rotation spin. We update moon.position local with angle elapsed*moonSpeed. The local XZ plane rotates with planet spin. So moon's world orbit radius is still constant around planet, but angular speed world = spin + moon local. If planet spin is 0.95 and moon 2.6, world 3.55. Good.

Could instead set `moon.position` based on angle relative to world independent of parent by counter-rotating? Not needed. It still orbits. If one wanted independent orbit in world XZ, could account parent rotation: angle_world = elapsed*moonSpeed; angle_local = angle_world - planet2.rotation.y; moon.position = cos(angle_local)... But requirement not strict. However "all orbits are in the XZ plane around the origin" for planets; moon maybe should orbit in XZ plane (world). If parent spin rotates local XZ, still XZ plane (Y=0). The orbit is in planet's local XZ, transformed by rotation around Y, which remains world XZ plane. So yes.

Potential issue: If parent has spin rotation and we set moon local position, moon world y remains 0? Parent rotation around Y keeps y=0. Planet has no tilt. Good.

Potential issue: If we set planet.rotation.y += spin speed delta, parent's rotation accumulates. Moon local position angle independent. World moon y=0. Good.

Potential issue: If planets spin around Y, all poles up. OK.

Potential issue: physically based light intensity: If we set `physicallyCorrectLights` in latest does nothing, but useLegacyLights false. OK. If older, `physicallyCorrectLights` property expects boolean. OK.

Potential issue: In older `renderer.physicallyCorrectLights = true` and `useLegacyLights` not exist. OK.

Potential issue: If older uses `renderer.outputEncoding` not set. OK.

Potential issue: If `window.innerWidth` zero in headless? If zero, camera aspect NaN. But typical. Could guard:

```
const width = Math.max(1, window.innerWidth);
const height = Math.max(1, window.innerHeight);
```

Use in camera and renderer and resize. Good. Let's do robust.

```
function getSize() { return { width: Math.max(1, window.innerWidth), height: Math.max(1, window.innerHeight) }; }
```

But no need. Could avoid NaN in tests with 0. Let's implement simple:

```
const width = Math.max(1, window.innerWidth);
const height = Math.max(1, window.innerHeight);
camera = new PerspectiveCamera(60, width/height,...)
renderer.setSize(width,height)
```

Resize:

```
const w = Math.max(1, window.innerWidth);
const h = Math.max(1, window.innerHeight);
camera.aspect = w/h;
...
renderer.setSize(w,h);
```

OK.

Potential issue: If tests check renderer size exactly innerWidth, if innerWidth 0 maybe no. OK.

Potential issue: Need append canvas to document.body. Done.

Potential issue: No `document.body.style.margin = '0';` if body null? Browser. OK.

Could include `renderer.domElement.style.position = 'fixed'; top left`? No.

Potential issue: Need use `setAnimationLoop` not requestAnimationFrame. Done.

Potential issue: Need after first frame set ready true. Done.

Potential issue: If animation loop calls animate before globals set? We set globals after setAnimationLoop. But setAnimationLoop likely doesn't invoke synchronously. If it did synchronously (unlikely), ready may set before globals? But not. To be safe, set globals before setAnimationLoop. The rule says after first frame ready. We can set globals immediately before loop. OK. Let's move globals before setAnimationLoop.

```
(window as any).__scene = scene;
...
renderer.setAnimationLoop(animate);
```

Good.

Potential issue: If ready true from previous run? Not.

Potential issue: `elapsed` used in loop; first frame elapsed maybe 0. Orbits all at phase positions. Good.

Could maybe include `sun.rotation.y += 0.1*delta` for sun spin? Not required. Could skip.

Potential issue: Need no external assets. OK.

Let's think if final should include only code block. Yes.

Double-check TypeScript exact: 

```
interface PlanetInfo {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  phase: number;
}
```

In strict, interfaces okay.

`function createPlanet(radius: number, color: number, orbitRadius: number, orbitSpeed: number, spinSpeed: number, phase: number): THREE.Mesh {`

All used. Inside:

```
const mesh = new THREE.Mesh(
  new THREE.SphereGeometry(radius, 32, 16),
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 })
);
scene.add(mesh);
planets.push({ mesh, orbitRadius, orbitSpeed, spinSpeed, phase });
return mesh;
```

OK.

`window.addEventListener('resize', handleResize);` no options. OK.

Could use `renderer.setAnimationLoop(animate);` if TS overload expects callback return void. OK.

Potential issue: `THREE.ACESFilmicToneMapping` is number, toneMapping expects `THREE.ToneMapping`. OK.

Potential issue: `renderer.toneMappingExposure = 1.2;` number. OK.

Potential issue: `rendererCompat.physicallyCorrectLights = true;` if strict? any. OK.

Potential issue: `Math.max(0, Math.min(0.1, currentTime - previousTime));` OK.

Potential issue: `moon.position.set(...)` moon type Mesh. OK.

Potential issue: If we use `elapsed` but first frame delta 0 and ready set after render. Good.

Let's maybe add `sunMaterial.toneMapped = false;` but if older Material doesn't have toneMapped? It does since long. OK.

Potential issue: If tone mapping ACES, sunMaterial toneMapped false still color space? OK.

Potential issue: The sun PointLight inside sun mesh might cause light to originate at center but no occlusion. OK.

Potential issue: Planets have radius .62 etc; moon radius .15. OK.

Potential issue: Camera position (12,9,16) length ~21.6, system radius 10.6. FOV 60 vertical; visible half-height at z? If looking at origin, radius 10 fits. OK.

Potential issue: Maybe all orbits in XZ around origin. Good.

Need maybe add a subtle axial tilt? No, Y up and XZ plane. Avoid tilt to keep orbit? Planet spin axis can tilt but not needed. If tilt, moon orbit plane still local? Could tilt Y? no.

Potential issue: "Every planet also spins on its own axis." Our spin axis is Y, same as orbit normal. Fine.

Potential issue: The moon is a child of planet2 mesh, but since planet2 spins, moon's local coordinate rotates. We update moon.position every frame based on elapsed, so it orbits at spin+moon speed. If planet spin direction positive. Good. If moon orbit should be independent of planet spin, could counter-rotate:

```
const moonAngle = elapsed * moonOrbitSpeed - planet2.rotation.y;
```

This would make world moon angle = elapsed*moonOrbitSpeed (because local rotated by parent). But then local angle changes by spin + orbit? Actually if we set local angle = elapsed*moonSpeed - planet.rotation.y, world angle = parent + local = elapsed*moonSpeed. That gives independent orbit in world. Could be nicer. But not required. However if planet spin is high, moon would orbit much faster than specified? The requirement only orbiting. If tests expect moon position relative to planet with angular speed? They may check child position magnitude. Not likely. But to be precise, moon orbiting planet could have its own angular speed relative to world XZ, not coupled. Since moon is child, to make it orbit in world XZ at given speed independent of parent spin, update `moon.position` using local angle = worldAngle - planet2.rotation.y` (since parent rotation around Y). This keeps moon orbit in world XZ and angular speed moonOrbitSpeed. Should we do that? It's more correct: moon orbit plane XZ around planet in world. It doesn't require parent rotation coupling. Let's implement:

```
const moonWorldAngle = elapsed * moonOrbitSpeed;
const moonLocalAngle = moonWorldAngle - planet2.rotation.y;
moon.position.set(Math.cos(moonLocalAngle)*moonOrbitRadius, 0, Math.sin(moonLocalAngle)*moonOrbitRadius);
```

But note planet2.rotation.y increments by delta spin; if we subtract current rotation, then as elapsed advances, moonWorldAngle changes by moonSpeed*delta; parent changes by spin*delta; local changes by (moonSpeed - spin)*delta. Parent+local changes by moonSpeed*delta. Good. If moonSpeed < spin, local angle moves backward but world moves forward. Fine. If moonSpeed equals spin, local angle constant, moon tidally locked? OK. This is more robust.

Need if planet2.rotation.y not exactly same as spin accumulated? We set spin via +=. It includes initial 0. OK.

But parent rotation is around Y; local XZ transformed by rotation by parent. In Three, mesh.rotation.y = θ means local +X maps to world (cosθ,0,-sinθ?) Let's check rotation matrix for Y: x' = x cosθ + z sinθ; z' = -x sinθ + z cosθ. If local position (cos a,0,sin a), world = (cos a cosθ + sin a sinθ, 0, -cos a sinθ + sin a cosθ) = (cos(a-θ), 0, sin(a-θ)? sin(a-θ)=sin a cosθ - cos a sinθ yes z. So world angle = a - θ, not a+θ. Wait depending convention. Let's derive: rotation.y = θ positive rotates from Z to X? Matrix from Euler Y: [[cos,0,sin],[0,1,0],[-sin,0,cos]]. World x = cos a * cosθ + sin a * sinθ = cos(a-θ). World z = -cos a sinθ + sin a cosθ = sin(a-θ). So world angle = a - θ. To get world angle = W, need local a = W + θ. So if local angle = elapsed*moonSpeed + planet2.rotation.y. Previously we thought a+θ, but actual is a-θ. Need verify with simple: parent θ=90°, local point (1,0,0) should map to world (0,0,-1)? angle -90 or 270. a-θ = -90. OK. So if parent spin positive, world angle = local - parent. Thus to have world angle = elapsed*moonSpeed, set local angle = elapsed*moonSpeed + planet2.rotation.y. Good. If we just set local = elapsed*moonSpeed, world angle = elapsed*moonSpeed - spin. Still orbit, speed moonSpeed. Not dependent on spin? Wait derivative: d(world)/dt = moonSpeed - spin. If local a = moonSpeed*t, parent θ=spin*t, world angle = (moonSpeed - spin)t. So angular speed reduced by spin. If spin positive 0.95, moonSpeed 2.6, world speed 1.65. Still orbits but slower. If spin > moonSpeed, negative direction. If we want independent, use a = W + θ => world angle = W. So derivative W.

Which is more intuitive? Moon orbiting planet at given angular speed in world. Use `moonLocalAngle = elapsed * moonOrbitSpeed + planet2.rotation.y;`. But if planet has initial rotation? rotation.y accumulates from 0. OK.

Need if planet mesh's spin changes via += delta and if we subtract/add current rotation, due to floating precision OK. Could compute spinAngle separately:

```
const spinAngle = elapsed * planet.spinSpeed;
planet.mesh.rotation.y = spinAngle;
```

But for planet2, need spinAngle. If use `+=`, no stored spin. Could store spinAngle? Not necessary; use mesh.rotation.y.

If use local = world + parent.rotation.y, then if parent rotation is high, local angle also high; world independent. Good. Let's implement with parent rotation.y. But note parent rotation.y may be large over time (elapsed*spinSpeed). Adding to moon local angle could be large; cos handles.

Alternatively create moonPivot as child? Requirement planet.add(moon), so no. Could create moon and add to planet, then set moon.position. OK.

Need if planet2 mesh spin affects moon orientation? We only set position; moon mesh orientation inherits parent spin and not own rotation. If local angle includes parent rotation, world angle independent, but moon orientation still parent spin. Fine.

Could also set `moon.rotation.y = moonWorldAngle` to spin moon? Not required.

Let's include comment? Maybe no.

Potential issue: `planet2.rotation.y` after setting spin. If we set spin via `planet.mesh.rotation.y += ...`, in animate order for planets then moon. Good.

Potential issue: If using local = world + parent.rotation.y, but parent rotation.y might not exactly correspond to spin speed if delta clamped. OK.

Now, physical intensity: maybe use `sunLight.intensity = 500`? Let's choose 350. With ACES exposure 1.2. Maybe inner over. I'd choose 250. Let's see if test may take screenshot and expect colors. Use 400? We can't see. Let's use 300 as compromise. Ambient 0.18. Exposure 1.1.

Maybe physically based: point light intensity 2 is enough if decay=0? But with decay=2, 300. OK.

Could set `sunLight.decay = 2;` explicitly after constructor. OK.

Potential issue: If using ACES tone mapping and sunMaterial.toneMapped=false, sun is bright; planets tone mapped. Good.

Potential issue: If renderer color space default linear? Output default sRGB in latest. OK.

Need maybe if older no outputColorSpace, colors okay.

Let's maybe include `renderer.outputColorSpace = THREE.SRGBColorSpace;`? In latest, default. In older, `outputEncoding` not. Could cause TS error if type missing? It exists in recent. To maximize compatibility, skip. But color management might differ. No matter.

Potential issue: If no tone mapping, overbright? We use tone mapping. OK.

Potential issue: If `rendererCompat.physicallyCorrectLights = true;` and old uses `outputEncoding = sRGBEncoding` not set, colors linear maybe darker. But okay.

Could set `renderer.outputEncoding = THREE.sRGBEncoding` if exists? Cast any:

```
rendererCompat.outputEncoding = THREE.sRGBEncoding;
```

But if latest, THREE.sRGBEncoding may be removed? It might still exist as deprecated. To avoid errors, skip. Latest default. OK.

Potential issue: In strict, assigning to `rendererCompat.outputEncoding` no error but `THREE.sRGBEncoding` might not exist in types. Skip.

Potential issue: Need maybe no top-level await. OK.

Let's ensure final exactly one ```ts block. No explanation.

Double-check all variables used:

- scene used
- camera used
- renderer used
- rendererCompat used
- ambientLight used
- sunMaterial used
- sun used
- sunLight used
- planets used
- createPlanet used
- planet2 used
- moon used
- moonOrbitRadius used
- moonOrbitSpeed used
- handleResize used
- previousTime used
- elapsed used
- ready used
- animate used

`createPlanet` params all used. OK.

Potential noUnusedLocals not strict but fine.

Let's think about if `rendererCompat` assignment to nonexistent properties in strict `noImplicitAny` no issue. Good.

Potential issue: `document.body.style.margin = '0';` returns void. OK.

Potential issue: `new THREE.WebGLRenderer({ antialias: true })` may fail in headless without WebGL? Tests likely provide. If not, cannot. OK.

Potential issue: The page has no other HTML; setting body margin OK.

Potential issue: Use `window.innerWidth` and height for size. Good.

Potential issue: If resize while devicePixelRatio changes, setPixelRatio not updated. Could update in resize:

```
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

Could include. Good.

Potential issue: If canvas CSS size plus pixel ratio, `setSize(width,height)` with pixel ratio handles buffer. OK.

Potential issue: In resize, update pixel ratio.

```
function handleResize(): void {
 const width = Math.max(1, window.innerWidth);
 const height = Math.max(1, window.innerHeight);
 camera.aspect = width / height;
 camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 renderer.setSize(width, height);
}
```

OK.

Potential issue: if initial innerWidth 0, canvas width 1. OK.

Let's consider if physically based light and tone mapping: If pointLight distance 80, at 10 attenuation due cutoff 1-(10/80)^4 = 0.9996. inverse square dominates. Good.

Could maybe add `sunLight.castShadow = false;` no.

Potential issue: MeshStandardMaterial metalness 0.05 may make dark? OK.

Potential issue: Sun material toneMapped false but color is sRGB, renderer output maybe linear? In latest, if outputColorSpace sRGB and material toneMapped false, color goes through linear to sRGB, appears correct. OK.

Potential issue: If test checks `__scene` contains scene with planets? OK.

Could set names? Not required. But maybe useful: `sun.name = 'Sun'; planet.mesh.name = ...` Not necessary. Could add? No need. But names can help tests? They didn't ask. Adding is fine. But no extra complexity.

Maybe tests might check planet orbit distances by positions. Our planets in array. Good.

Could tests check that planet2 has child moon? Yes. We do.

Could tests check point light intensity/decay? We set.

Could tests check ambient light? yes.

Could tests check camera above? y positive.

Could tests check ready after first frame. yes.

Could tests check no external assets. yes.

Potential issue: If point light intensity set to 300 and physicallyCorrectLights false in some environment, planets may be overexposed white. But still visible. If tests screenshot, maybe white. Could lower to 50 to avoid overexposure if legacy? But if physical, 50 too dark. Need choose based on renderer. Maybe can adapt based on property:

```
const physical = rendererCompat.physicallyCorrectLights === true || rendererCompat.useLegacyLights === false;
sunLight.intensity = physical ? 300 : 2;
```

But after setting, `useLegacyLights` might be false even if not supported? If property undefined, condition false? Let's do robust:

```
const physical = rendererCompat.physicallyCorrectLights === true || rendererCompat.useLegacyLights === false;
sunLight.intensity = physical ? 300 : 2;
```

In latest, useLegacyLights false? If property exists and false, physical true. If property removed undefined, false. But we set useLegacyLights false before, so rendererCompat.useLegacyLights = false; then condition true. Even if property doesn't exist, setting creates property false, condition true. So always physical? If old setting physicallyCorrectLights works, true. If new, extra property. So always 300. If somehow legacy and setting failed? no.

Could just set 300.

Potential issue: If physical units and ACES, 300 may be fine. Let's maybe reduce to 180 to avoid inner white. But outer maybe darker. Use 220. Let's choose 240. At d=10 radiance 2.4, good. d=4 15, inner bright. OK. Ambient .18. Exposure 1.1. I'll choose 240.

Could make inner planet albedo darker to avoid blowout? Color hex values linear? ColorManagement sRGB -> linear: 0x64a9ff linear approx blue .24? d=4 15*.24/pi=1.15 -> ACES ~0.75, not white. Good. Orange 0xff8b4a red linear 1, d=7? planet2 distance 7: 240/49=4.9*1/pi=1.56 ACES ~0.82. Green 0x5fd98c green linear .57, d=10:2.4*.57/pi=.435 -> sRGB .69. Good. OK.

Wait planet1 at d=4 blue linear maybe .24? radiance 15*.24/pi=1.15 ACES maybe 0.75. Good. No blowout.

Need if colors not converted? If ColorManagement disabled, hex linear? Actually material color used as sRGB? If no color management, color is interpreted as sRGB? It may not convert to linear, causing brighter. But latest. OK.

Could disable tone mapping? no.

Let's finalize code. Need final only code block. Ensure no extra. Use exact imports.

Double-check moon local angle formula:

```
const moonWorldAngle = elapsed * moonOrbitSpeed;
const moonLocalAngle = moonWorldAngle + planet2.rotation.y;
moon.position.set(Math.cos(moonLocalAngle) * moonOrbitRadius, 0, Math.sin(moonLocalAngle) * moonOrbitRadius);
```

If parent rotation.y = θ, world angle = local - θ = W. Good. But if parent mesh position is not origin, moon world position = planet pos + parent rotation applied to local. The orbital plane remains world XZ around planet because local y=0 and parent rotation around Y; yes. The center moves with planet. Good.

Potential issue: `planet2.rotation.y` is Euler rotation. Since we only change y, matrix rotation Y. OK.

Potential issue: If `planet2.rotation.y` becomes large, adding to moonWorldAngle may cause precision issues over long runtime. Not concern. Could use separate spin angles with modulo to keep small. Could do:

```
planet.mesh.rotation.y = (elapsed * planet.spinSpeed) % (Math.PI*2);
```

But then using delta? Could accumulate modulo:

```
planet.mesh.rotation.y = (planet.mesh.rotation.y + p.spinSpeed * delta) % (Math.PI*2);
```

For moon local angle, use current rotation. Good. Modulo reduces precision. Use `const TWO_PI = Math.PI * 2;` and mod. Need modulo negative? spin positive. OK. Add in loop:

```
planet.mesh.rotation.y = (planet.mesh.rotation.y + planet.spinSpeed * delta) % (Math.PI * 2);
```

This uses delta. If `delta` zero first, rotation 0. Good. Use `Math.PI * 2` maybe each loop. Could define `const TWO_PI = Math.PI * 2;`. Good. Then moon local angle = world + rotation.y (small). Good.

Could also set orbit angle modulo? Not necessary.

Add:

```
const TWO_PI = Math.PI * 2;
...
planet.mesh.rotation.y = (planet.mesh.rotation.y + planet.spinSpeed * delta) % TWO_PI;
```

OK. `TWO_PI` used. Good.

Potential issue: If noUnusedLocals, `TWO_PI` used. OK.

Could compute orbit angle with elapsed speed and phase; if elapsed grows large, cos ok. Could mod: `(elapsed * p.orbitSpeed + p.phase) % TWO_PI` but not needed.

Potential issue: If `elapsed` not updated first frame if delta=0, ready set with all positions initial. OK.

Potential issue: If time parameter undefined, `time / 1000` NaN. But types number. Runtime Three passes number. OK.

Potential issue: If `renderer.setAnimationLoop` callback with time as `DOMHighResTimeStamp` but may start at 0. OK.

Let's final.

Wait, one more nuance: `MeshStandardMaterial` with PointLight physical intensity: `intensity` is candela. The renderer's physical lights default: The point light intensity unit is candela, but for a point light, color = intensity * getDistanceAttenuation. At d=10, 240/100=2.4. OK. But there's also `1e-3`? For punctual light in physical units, maybe irradiance multiplied by `1 / (4π)`? No. If too dark, ambient. OK.

Could use `pointLight.power = 300` lumens? For point light, intensity = power / (4π). If set power, intensity derived. Not needed.

Potential issue: If older non-physical and we set physicallyCorrectLights true, but `toneMapping` ACES maybe not? OK.

Let's maybe include `sunLight.intensity = 300;` to be safe bright. Use 300. The earlier calculations OK. Inner blue radiance 1.43? ACES. Good. Use 300.

Potential issue: Outer planet radiance 300/100=3 * .57/pi=.54 sRGB .76. Good. Use 300.

Final code:

```
import * as THREE from 'three';

document.body.style.margin = '0';

const width = Math.max(1, window.innerWidth);
const height = Math.max(1, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00000a);

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
camera.position.set(12, 9, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const rendererCompat = renderer as any;
rendererCompat.useLegacyLights = false;
rendererCompat.physicallyCorrectLights = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambientLight);

const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd24a });
sunMaterial.toneMapped = false;
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 16), sunMaterial);
scene.add(sun);

const sunLight = new THREE.PointLight(0xfff3d0, 300, 80, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

interface PlanetInfo { ... }
...
```

Need if `window.devicePixelRatio` undefined? In browser yes. If undefined, Math.min(NaN,2)=NaN; setPixelRatio NaN? Could guard:

```
const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
```

Strict with `||` number. Use function getPixelRatio. In resize too.

```
function getPixelRatio(): number { return Math.min(window.devicePixelRatio || 1, 2); }
```

But no need? For robustness. Could add and use. It is a local function used. OK.

```
function getPixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}
```

Then initial and resize. Good.

Potential noUnused? used.

Let's add.

Potential issue: `window.devicePixelRatio || 1` type number. OK.

Potential issue: If `window.devicePixelRatio` is NaN? unlikely. Could `const pr = window.devicePixelRatio; return Math.min(Number.isFinite(pr) ? pr : 1, 2);` More robust. But not necessary. Could use `Number.isFinite` strict OK. Let's do:

```
function getPixelRatio(): number {
  const pr = window.devicePixelRatio;
  return Math.min(Number.isFinite(pr) ? pr : 1, 2);
}
```

`Number.isFinite` requires ES2015. OK. If target ES5? tsc strict maybe lib es5? But Three types likely require ES2015? Hard not. Simpler `pr || 1` avoids. But if pr NaN, `NaN || 1` = 1. Good. Use `window.devicePixelRatio || 1`.

OK.

Potential issue: `camera.lookAt(0,0,0)` before scene? OK.

Potential issue: If `renderer.setAnimationLoop(animate);` and `animate` uses `elapsed` from outer. OK.

Potential issue: `rendererCompat` assignment before or after tone mapping? before fine.

Potential issue: The sun point light and MeshBasic sun: sun sphere radius 1.1. Point light at origin; no occlusion. OK.

Potential issue: If physicallyCorrectLights true, ambient intensity may need larger? Ambient is direct color * intensity. 0.18 gives dark sides ~.18*albedo/pi? Actually ambient irradiance = color*intensity? Diffuse BRDF divides PI, so dark side ~0.18*albedo/pi? Might be very dark. If dark sides not pure black. Could set ambient 0.5? User says weak. 0.25. Let's set 0.25. With tone mapping, still weak. Good. AmbientLight physical maybe intensity 0.25. OK.

Potential issue: If ambient too high, dark side not dark. Weak 0.25 OK. Use 0.25.

Potential issue: Point light intensity maybe 300; outer bright. OK.

Could use hemisphere light? no.

Potential issue: If using physicallyCorrectLights, AmbientLight intensity maybe not divided by PI? In shader ambient: `vec3 irradiance = ambientLightColor;` and diffuse = albedo * irradiance * RECIPROCAL_PI? Actually irradiance integrated? Maybe. OK.

Let's finalize with ambient 0.25.

One more thought: `rendererCompat.physicallyCorrectLights = true;` in very old Three (pre r140?) maybe property doesn't exist but `physicallyCorrectLights` was on `WebGLRenderer`. OK. In very latest, setting may produce a console warning? Not compile. OK.

Potential issue: In latest, `useLegacyLights` is deprecated and may be `false` but setting `false` OK. If they set `true`? no.

Potential issue: `sunLight` type PointLight; `decay` default maybe 2, but explicit. OK.

Potential issue: The code uses `Math.PI / 3` and `Math.PI`; OK.

Potential issue: Should planets spin on own axis independent of orbit pivot. We directly set mesh rotation. Good.

Potential issue: Since moon is child of planet mesh, moon's orbit center moves with planet and moon inherits planet spin orientation. We compensate position. Good.

Potential issue: If parent mesh spin is changed after setting moon position? In animate, planets loop updates planet rotations, then moon uses planet2.rotation.y. Good.

Potential issue: If planet2 is updated before other planets? loop order p1,p2,p3. Good.

Potential issue: The moon's position is local; if parent scale? no.

Potential issue: The moon geometry and material no toneMapped false. OK.

Potential issue: If renderer size 0? width max 1.

Potential issue: If `document.body` margin set before body exists? Module deferred. OK.

Now final code block. Ensure no text outside. Use ts code fence. Done.
