We need answer with one ts code block only. Need produce final. Need craft complete TypeScript file for browser, imports three. Need compile tsc --strict. Need no external assets. Need use import * as THREE from 'three';? In TypeScript, ES import * as three? Usually valid in TS 5? `import * as THREE from 'three';` is TypeScript 5.0+? I think ES module doesn't allow `* as name`; it's namespace import? Actually TypeScript supports `import * as three from 'three'`? In TS, namespace import? Let's check: TS supports `import * as ns from "mod"`? I recall TypeScript supports namespace import? There is `import * as three from "three";` yes TS 5.0? The prompt explicitly says import as that. Use exactly. Need compile with tsc --strict. Need be careful with types. `renderer.setAnimationLoop` callback type may need? `renderer.setAnimationLoop(() => {...})`. Need access `window as any`. Need after first frame rendered set __ready true. Need use elapsed time or frame? Hard rule says Motion must use delta/elapsed time, not frame counts. Can use THREE.Clock getDelta. Need maybe use elapsed? Could use clock.getElapsedTime(), but motion based elapsed fine. Need camera resize. Need physically based light intensity/decay: PointLight with intensity maybe 50? For MeshStandardMaterial physicallyCorrectLights? In newer three `renderer.useLegacyLights` deprecated? `PointLight(color, intensity, distance, decay)`. If decay=2 physically correct, intensity in candela, need high values (e.g. 100). Could use `renderer.physicallyCorrectLights = true` deprecated? Better not use deprecated to compile maybe still exists? We can set `renderer.useLegacyLights = false`? This property type maybe boolean optional? Might compile but maybe not? Need compile with tsc strict; if not in @types? But using three types? They likely have. But safest avoid deprecated. Set point light intensity 300, distance 0 (infinite) decay 2? If decay 2, intensity units. With no tone mapping and exposure 1, need enough. For PBR, light intensity 500 maybe. We'll choose `new THREE.PointLight(new THREE.Color(1.0, 0.95, 0.8), 80, 0, 2)` maybe too dim. Need test mentally: MeshStandard material roughness .4. PointLight intensity=80 decay=2 at distance 10 => attenuation 1/(1+...?) Actually decay physically: irradiance = intensity / distance^2? 80 /100 = 0.8 maybe ok. At 4 => 5.0 bright. Use intensity 400 gives 4.0 at distance 10. But exposure default 1. Could be over. Use 200 -> 2 at 10, ok. Maybe set `renderer.toneMapping = THREE.ACESFilmicToneMapping` and `toneMappingExposure = 0.6` for nice. But no need. Need use MeshBasic sun maybe emissive? `new THREE.MeshBasicMaterial(new THREE.Color(1, 0.8, 0.2), toneMapped=false)`? MeshBasic color clamped? Use Color. Could set `toneMapped: false`. Need compile types. `material.toneMapped = false` exists? yes. But MeshBasicMaterial has toneMapped property. Could avoid. Need no external assets. Need scene, camera, renderer. Need append canvas to body. Need resize: handle window resize event; update renderer.setSize, camera aspect. Use setAnimationLoop. Need ensure after first frame rendered __ready=true. If set in animation callback after render? We can set after `renderer.render` first time. But `setAnimationLoop` callback gets delta? Actually `setAnimationLoop(callback)` callback called every frame, no args? Could be `render()`; use closure firstRendered flag. Or use `renderer.setAnimationLoop(render)` where render callback not receive args. We'll use clock inside. Need maybe call `renderer.render` inside callback? `setAnimationLoop` already calls callback not render. So callback should render? No, `setAnimationLoop` invokes callback each frame. You can inside callback call `renderer.render(scene,camera)`, yes. Or just update and let loop render? The API's callback does not automatically render scene. You must render in callback. That's fine. Could set __ready after first render.

Potential compile issues:
- `import * as THREE from 'three';` if TS target? Need maybe module. They explicitly require. If strict mode no error? I think TypeScript doesn't support namespace imports? Wait let's recall: ES2024? ECMAScript 2015 import doesn't support `* as`; but TypeScript added namespace imports? Search memory: TypeScript supports `import * as three from 'three'` in 5.0? Yes namespace imports in TypeScript. There is also `import { * as three }`? Hmm. Actually JavaScript import `import * as name from "module"` invalid. TypeScript 5.0 supports namespace import: `import * as ns from "mod";`? I recall TypeScript 4.9/5? I used `import * as fs from "node:fs"`? Not standard. Let me verify mentally: TypeScript has `import` with `import *`? I have seen TS docs: "Importing modules: import * as Foo from 'module';" Hmm no: In TypeScript, you can do `import * as three from 'three';`? The prompt says use that, so we follow.

Need no errors strict: If we use THREE types without installed? They assume. Need avoid any implicit any. Use types from window? `(window as any).__scene = scene;`. For resize handler use `addEventListener('resize', ...)` types from lib DOM. OK.

Need maybe dispose? no.

Let's design:
```
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010); // Color accepts hex number? Types: constructor accepts number | string? Yes `Color` accepts number|string. In @types maybe `new Color(number)` allowed? likely yes.
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(18, 12, 22);
camera.lookAt(0,0,0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.canvasElement); // renderer.canvasElement type? exists? Use `renderer.domElement`. In three, property `canvasElement`? Newer has `canvasElement`, old `domElement`. Which type? Use `renderer.domElement`. Need compile. OK.
```
Need append canvas: document.body.appendChild(renderer.domElement).

Lights:
```
const ambient = new THREE.AmbientLight(new THREE.Color(0x111111), 0.25); // intensity number
scene.add(ambient);
const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial(new THREE.Color(0xffd76a)));
scene.add(sun);
const sunLight = new THREE.PointLight(new THREE.Color(0xffe4b0), 200, 0, 2);
scene.add(sunLight);
```
`PointLight(color, intensity, distance, decay)` types? `PointLight(Color, number, number, number)` yes.

Planets: need create class/objects with radius, orbitRadius, angularSpeed, spinSpeed, color. Could define array with typed. Need ensure types:
```
type Planet = { mesh: THREE.Mesh, radius: number, distance: number, angularSpeed: number, spinSpeed: number, phase: number }
```
But if `THREE.Mesh` not exported as type? It's class. OK.

Maybe simpler:
```
const planetData = [
  { distance: 4, radius: 0.5, angularSpeed: 1.2, spinSpeed: 2.5, color: new THREE.Color(0x4477ff), phase: 0 },
  ...
];
const planets: { mesh: THREE.Mesh; angularSpeed: number; spinSpeed: number; distance: number; phase: number }[] = [];
for (const data of planetData) { ... planets.push({mesh: mesh, ...}); }
```
Need if no explicit type for `color`? OK.

Need planet2 has moon as child. We can create in loop, if i==1 create moon. But moon orbit around planet as child of mesh. If moon child of mesh, it will rotate along planet's local axis? If we set moon position relative to planet and update its transform by rotating child? Since if added as child, and planet mesh itself has position and rotation? If we set planet mesh position each frame and set mesh.rotation.y += spinSpeed*dt, moon child will orbit? If we want moon orbit around planet, as child: set moon's position based on angle, e.g. `moon.position.set(Math.cos(moonAngle)*moonOrbitRadius, 0, Math.sin(moonAngle)*moonOrbitRadius)` each frame. Because it's child of planet, its parent's transform includes planet spin. But if planet spin on Y, the moon orbit will spin in parent's local XZ plane; it will spin with planet axis if planet only spin about Y? Since child inherits rotation, setting its local position rotates with parent; the moon will appear orbiting but also affected by planet spin? Actually if planet has rotation.y, child moon's local position rotates by same rotation: orbiting speed becomes moonAngle + planetSpin? If you want independent? The moon as child can orbit around planet even if planet rotates, that's fine physically? But if planet spin is on Y, moon will also be rotated by parent; its position relative to world changes at combined angular. Could set moon angle relative to parent; then it's independent because local transform already rotated by parent. But if parent spin not desired to affect moon orbit? They only require added as child, orbiting planet. Could do simpler: make moon child of a `moonOrbitPivot` group attached as child to planet? But "planet.add(moon)" explicitly maybe must add moon directly. We can add directly and set moon's own position with local orbit, it is orbiting planet. It also spins with parent but still orbiting. Could use `moon.add(moonOrbitPivot)`? No, `moon` itself child of planet, maybe use a Group parent inside? But planet.add(moon) means direct child. We can create moonGroup = new THREE.Group(); moonGroup.add(moonMesh); planet.add(moonGroup); That violates wording? They say planet.add(moon), likely okay but not strictly. Need if moon is a mesh with child? Let's create `const moonPivot = new THREE.Group(); planet.add(moonPivot); moonPivot.add(moonMesh);` The moon is not direct child, but parent group is. Could use `const moon = new THREE.Group(); moon.add(sphere); planet.add(moon);` Then moon orbits group. But to satisfy phrase: "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." Maybe create `const moonMesh = ...; planetMesh.add(moonMesh);` and update moonMesh.position with a local angle; since it is direct child and parent rotates, still okay. Let's consider physics: Parent has no translation? Wait parent mesh's origin is at its center. If we set `planetMesh.position` world position and `planetMesh.rotation.y = spin`, the child moon local position gets rotated by parent rotation. To have moon orbit around planet in world XZ plane independent, we'd need counter-rotate: set `moon.position.set(cos(moonAngle - planet.rotation.y) * r, 0, sin(...))`. Or simply not care. But perhaps better: store planetSpin angle separately and set moon local position with `moonAngle - planetSpin` so world orbit stays independent. Because parent rotation.y = planetSpin, child local transform rotated by +planetSpin; to achieve local angle moonAngle relative to world, set local angle = moonAngle - parentSpin. That makes moon not spin with planet? But if parent has texture spin, child position is unaffected if set angle counter; moon not rotate around own axis? Could also moonMesh.rotation.y += spin speed; inherited rotation too, could set local rotation to desired - parent spin. Simpler: For direct child moon, set moonMesh.position from local angle and don't spin planet around Y? But all planets spin. We can store `spinY` and set moon position with `angle = moonAngle - spinY`. This gives direct child.

But we don't need precise; code simple. Need ensure moon orbit is in XZ plane around planet. If parent rotation.y is not exactly `spinAngle` because we set with spinSpeed*dt, we can track. Or use parent matrix? No.

Maybe implement planet objects with:
```
type PlanetState = { mesh: THREE.Mesh; distance: number; angularSpeed: number; spinSpeed: number; phase: number; moon?: THREE.Mesh; moonDistance?: number; moonAngularSpeed?: number };
```
TS object literal to type. Need `moon` optional? Could use `moon?: THREE.Mesh` with property assignment? For loop, `planets.push({...})`. Need assign moon after? Type. Let's define interface `PlanetState` with all fields:
```
interface PlanetState {
  mesh: THREE.Mesh;
  distance: number;
  angularSpeed: number;
  spinSpeed: number;
  phase: number;
  moon: THREE.Mesh | null;
  moonRadius: number;
  moonDistance: number;
  moonAngularSpeed: number;
}
```
In loop push object. If no moon, set null/0.

Need no `var`, all const/let. Need use `let time = 0` or elapsed. Hard says motion use delta/elapsed, not frame counts. We can use `clock.getElapsedTime()`, update positions as functions of elapsed. But spin: `mesh.rotation.y = elapsed * spinSpeed + phase`. This is deterministic based elapsed. For moon: if not direct child? Could use elapsed. But with parent rotation? If moon direct child, setting local position with `moonAngle - spinY`. We can compute from elapsed.

Alternatively create planet group: For each planet, create orbit pivot at origin, set rotation.y = angularSpeed*elapsed + phase, and child planet at distance on x. Then planet spins itself. This makes orbit independent of spin. This is robust and uses groups. But requirement: all orbits in XZ plane around origin. Orbit pivot rotation around Y. Planet mesh at (distance,0,0). Moon child of planet? Could use planet mesh added to pivot, moon pivot child of planet. But direct? Could use planet.add(moonMesh) direct. For moon orbit, use moon group child of planet. But direct requirement. Could use direct and set moon position based on elapsed and parent rotation? But parent group rotation does not change planet rotation? If planet mesh added to pivot as child at distance, planet mesh has local position x=distance; parent pivot rotation.y sets orbit. The planet mesh rotation.y local can spin. If moon is child of planet, parent planet rotation affects moon. Need counter with spin. But could set moon position based on elapsed and subtract spin angle. OK.

Could simpler: no groups for planet orbit, directly set `mesh.position.set(cos(elapsed * speed), 0, sin(...))`, `mesh.rotation.y = elapsed*spinSpeed`. Moon direct child: set local position with `moonAngle - spin`. This works.

Let's compute with elapsed:
```
for p: 
 const orbitAngle = elapsed * p.angularSpeed + p.phase;
 p.mesh.position.set(Math.cos(orbitAngle)*p.distance, 0, Math.sin(orbitAngle)*p.distance);
 p.mesh.rotation.y = elapsed * p.spinSpeed;
 if p.moon:
   const moonAngle = elapsed * p.moonAngularSpeed;
   const localAngle = moonAngle - p.mesh.rotation.y; // since parent rotation.y = p.spinAngle; if we set mesh.rotation.y with absolute, okay. But if orbit angle not relevant? Parent mesh position translation doesn't affect child local position. Only rotation.y.
   p.moon.position.set(Math.cos(localAngle) * p.moonDistance, 0, Math.sin(localAngle) * p.moonDistance);
   p.moon.rotation.y = elapsed * 1.5 - p.mesh.rotation.y? Actually parent rotation affects child rotation too. If we want spin, set local rotation = desiredWorldSpin - parentSpin. But no need.
```
But if we directly set p.mesh.rotation.y absolute, localAngle = moonAngle - currentSpin, works. But if spinSpeed negative? OK.

Could use delta instead of elapsed to avoid exact? Either is allowed. Use `elapsedTime = clock.getElapsedTime()`. That uses elapsed time. The render loop may be called with delta from animation loop? But use clock elapsed.

Need maybe `clock = new THREE.Clock();` but strict? yes. However, if we call `clock.getDelta()` and then use accumulated, we can satisfy delta. Could use `delta = clock.getDelta(); time += delta;` That uses delta and elapsed accumulated. Let's do this.

`const clock = new THREE.Clock(); let time = 0;` in animation callback:
```
const delta = clock.getDelta();
time += delta;
...
```
No frame counts. Good.

Need first frame set __ready after first render. Inside animation callback after render? `let firstRendered = false;` callback:
```
const render = () => {
  const delta = clock.getDelta();
  time += delta;
  update();
  renderer.render(scene, camera);
  if (!firstRendered) { firstRendered = true; (window as any).__ready = true; }
};
renderer.setAnimationLoop(render);
```
Need if renderer calls callback after? yes.

Potential issue: `clock.getDelta()` first call returns time since clock auto start? It starts at construction. First frame delta includes time before loop, but okay. If time is zero initially. Could use elapsed. Fine.

Need resize handler:
```
const resize = () => {
 const width = window.innerWidth; const height=window.innerHeight;
 renderer.setSize(width, height);
 camera.aspect = width / height;
 camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // set on resize? setPixelRatio can be called.
};
window.addEventListener('resize', resize);
```
Need types: `window.innerWidth` number. OK.

Need ensure camera above side: position (20,12,18). System max radius 10 + planet radius 0.7 + moon 0.3 = ~11. At FOV 45, distance ~27 visible. Good.

Need use physically based light intensity/decay: point light with decay=2 and distance=0. For physically correct rendering? Need set `renderer.useLegacyLights = false`? In newer Three, physicallyCorrectLights true. But if not set, legacy light model treats decay? Three's legacy uses intensity differently? In r155? PointLight with decay works physically if `useLegacyLights=false`; default in latest r155 maybe false? But not sure. To be safe, set `renderer.useLegacyLights = false;`? This property is deprecated in r155, but type maybe has `useLegacyLights` boolean? Could be. If compile with @types not? Maybe avoid deprecated. Instead set `renderer.physicallyCorrectLights = true`? Older. Deprecated? `WebGLRenderer` property type maybe not exists? Hmm. Modern @types three has `renderer.useLegacyLights: boolean` and deprecated `physicallyCorrectLights`? Actually `renderer.physicallyCorrectLights` is `boolean` property? Let's not set to avoid type errors. In modern three (r150+), physically correct is default? I think `useLegacyLights` default false, physicallyCorrectLights removed. We can mention intensity/decay by setting `decay: 2` high intensity.

Need MeshStandardMaterial. `new THREE.MeshStandardMaterial(new THREE.Color(color), new THREE.MeshStandardMaterial.Metalness(0.2)...)` Better object literal:
```
new THREE.MeshStandardMaterial({
 color: new THREE.Color(0x4477ff),
 roughness: 0.4,
 metalness: 0.2
});
```
Type accepts `MeshStandardMaterial` constructor accepts parameters object. OK.

Need `MeshBasicMaterial({ color: ... })`.

Need maybe add stars? Not required. Could add background color. Fine.

Need maybe no errors with `window as any` repeated. Use `(window as any).__scene = scene;` etc.

Potential issue: `document.body` may be null? In browser TS type ok. If no HTML, document.body exists. OK.

Potential issue: `import * as THREE` if TS strict maybe module resolution not? They expect. We output exactly.

Need maybe `three/addons/controls/OrbitControls.js`? Not required. Avoid addons.

Let's think about compilation: If we use `interface PlanetState` with optional fields? Need not use optional. Let's define:
```
type PlanetState = {
 mesh: THREE.Mesh;
 distance: number;
 angularSpeed: number;
 spinSpeed: number;
 phase: number;
 moon: THREE.Mesh | null;
 moonOrbitRadius: number;
 moonAngularSpeed: number;
 moonSpinSpeed: number;
};
```
Then create `const planets: PlanetState[] = [];`
For data array:
```
const specs = [
 { distance: 4.0, radius: 0.45, angularSpeed: 0.55, spinSpeed: 1.7, phase: 0.0, color: 0x44aaff },
 { distance: 7.0, radius: 0.65, angularSpeed: 0.33, spinSpeed: 1.2, phase: 1.7, color: 0xff6644 },
 { distance: 10.0, radius: 0.8, angularSpeed: 0.18, spinSpeed: 0.9, phase: 3.1, color: 0x44ff88 },
];
```
TS type specs inferred `Array<{distance:number, radius:number... color:number}>`. OK.
Loop:
```
for (let index = 0; index < specs.length; index += 1) {
 const spec = specs[index];
 const mesh = ...;
 scene.add(mesh);
 let moon: THREE.Mesh | null = null;
 let moonOrbitRadius = 0;
 let moonAngularSpeed = 0;
 let moonSpinSpeed = 0;
 if (index === 1) { ... mesh.add(moonMesh); moon=moonMesh; ...}
 planets.push({ mesh, distance: spec.distance, angularSpeed: spec.angularSpeed, ... moon, ... });
}
```
Need `moon` variable typed union? `let moon = null;` inferred null only? If later assign THREE.Mesh -> error? Need type union: `let moon: THREE.Mesh | null = null;`. OK.

Need in loop set moon position. But if direct child, parent mesh rotation.y = spin. Use time and spinSpeed. But if parent has initial rotation? We set absolute from time, initial zero. For moon angle:
```
if (p.moon) {
 const moonAngle = time * p.moonAngularSpeed;
 const localAngle = moonAngle - p.mesh.rotation.y;
 p.moon.position.set(Math.cos(localAngle) * p.moonOrbitRadius, 0, Math.sin(localAngle) * p.moonOrbitRadius);
 p.moon.rotation.y = time * p.moonSpinSpeed - p.mesh.rotation.y;
}
```
But note `p.mesh.rotation.y` may be normalized? Not needed. However, `p.mesh` is a child of scene; setting `p.mesh.position` and `p.mesh.rotation.y` changes its transform. If moon is child, its parent matrix includes this. Good. But if planet mesh has `rotation.x` or z zero. Good.

But if we directly set `mesh.position` each frame and `mesh.rotation.y`, the orbit is in XZ around origin. Good. But if moon is direct child and parent position moves, child moves with parent. Good.

Need maybe the parent mesh geometry's origin center. OK.

Potential visual issue: Sun mesh uses MeshBasicMaterial, no lighting. PointLight at origin inside sun may be occluded? PointLight emits from center; sun mesh MeshBasic is not blocking, transparent? Solid sphere but point light inside sphere? If sphere is opaque and at light source, it might not cast shadow? PointLight inside a closed mesh with opaque surface; since light position is same as mesh surface? The point light at origin, radius 1 sphere, the light is inside sphere but no shadows. For direct lighting, light at origin illuminates planets regardless of sun mesh. Good.

Need avoid shadow. No shadows.

Need camera not in sun? far.

Need maybe `renderer.setClearColor`? scene.background. Fine.

Need `THREE.Clock` type? import namespace.

Need strict: no unused? tsc doesn't check unused. OK.

Let's consider `THREE.SphereGeometry(radius, widthSegments, heightSegments)` type: first arg number, second number. OK.

Potential compile error due to `THREE.Color` constructor with number? In @types `Color` constructor may be overloaded? It has `constructor: constructor(color?: number | string, ...?)`? Actually Three Color can be `new THREE.Color("0xff0000")`? Number works? Examples: `new THREE.Color(0x44aa22)` accepted. Types maybe accepts `number | string`. Good.

Potential issue: `renderer.domElement` maybe type exists. Good.

Need if code has `let time = 0` and update before first render? Motion with delta. Fine.

Let's produce final code block only. Need no prose. Use TypeScript file.

Double-check exact import:
```
import * as THREE from 'three';
```
This is required. If `tsc --strict` with TS not supporting namespace imports? But user explicitly says import as that. Good.

Need ensure after first frame set ready. If renderer errors before callback? no.

Potential issue: `setAnimationLoop` callback in three may pass `time` and `delta`? If we define function with no parameters, OK? But callback expected `(deltaTime: number) => void`? Actually `WebGLRenderer.setAnimationLoop(callback: (time: number) => void)`? If we define no args, OK. But in TS, assignment of function with fewer parameters is allowed. OK.

Need if callback uses `renderer.render` after updating. Good.

Maybe should use `renderer.render(scene, camera)` each frame. `setAnimationLoop` doesn't auto render. OK.

Let's verify with types:
- `scene.background = new THREE.Color(...)`. Type maybe expects `Color | CubeTexture | null`; Color accepted.
- `renderer.toneMapping = THREE.ACESFilmicToneMapping;` constant type maybe `number` property? It is enum. If @types defines readonly? In three, property is number. Could omit to avoid type issue. But maybe nice. If setting `toneMapped=false` on materials? MeshBasicMaterial type may not have toneMapped? It does. But not needed. Could omit tone mapping.

Need physically based intensity. PointLight intensity high. But if no physicallyCorrect flag, high intensity may overexpose. Default renderer tone mapping default NoToneMapping and outputEncoding sRGB. In legacy lights, intensity acts more like irradiance times pi? If intensity 200, planets near 4 => intensity/distance? In legacy attenuation formula: distance=0 no attenuation, intensity 200 huge -> over white. But if no physically correct and distance 0? For PointLight legacy: irradiance = intensity * color; no distance attenuation? Actually legacy model: attenuation = 1 if distance=0, so intensity 200 => very bright. If physicallyCorrect not set? In modern three, `useLegacyLights=false` default, physical decay. But if older three default `useLegacyLights=true`, 200 overbright. To ensure works with both? Could set `renderer.useLegacyLights = false` if available. But compile? Let's check @types? WebGLRenderer has `useLegacyLights: boolean`. I think yes. If we set false, physically correct. But if three older types? They probably use modern @types. The prompt says physically based light intensity/decay. Could use `renderer.useLegacyLights = false`? It's deprecated and could be removed? In three r155, property removed? Let's recall: r155: `WebGLRenderer.useLegacyLights` is deprecated, but still exists? Maybe yes until r158? But types? The target likely Three.js r15x @types. It includes `useLegacyLights`? If not, compile error. Alternative set `renderer.physicallyCorrectLights = true`? Older deprecated? Which types include? Hmm.

Could avoid setting renderer, and instead rely on current default physical. But if they run in older default legacy? The prompt says mind physically based intensity/decay, so they likely expect decay=2 and intensity high. If environment uses legacy, high intensity will blow; but maybe okay with tone mapping. We can add tone mapping to control overexposure. If physical not set and intensity high, tone mapping helps: ACES with intensity 10, exposure 0.6. But if physical, 10 too dark at 10? Hmm.

Let's find robust approach: set `renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.7;`. If physical with intensity 300: at r=10, irradiance ~3, after exposure 0.7 -> 2.1 ACES bright maybe white. Too bright. Intensity 100: at 10 -> 1, exposure 0.7 -> 0.7 moderate, at 4 -> 6.25 overexposed. But inner planet too bright. Could use distance attenuation? Set distance=50, decay=2. Still. Maybe intensity=50? At 10 => 0.5, at 4 => 3.1 over. Use exposure 0.3? Hmm.

No need perfect. Set intensity=100? Let's approximate standard material color base; overexposed to white acceptable? Inner planets maybe washed. Could choose distances small? Prompt 4,7,10. Use intensity=30 maybe: at 10 0.3, at 4 1.875. With ambient 0.1. ACES exposure 0.8 => inner 1.07, outer 0.24. Reasonable. Use intensity 60: outer 0.6. Hmm. Use decay=2, distance=0. I choose 80 and ambient 0.35, no tone mapping? At 10 0.8, at 4 5.0 washed. Use tone mapping exposure 0.55. At 4 ACES maps high to ~1? Might still over. Could choose 25: at 10 0.25, at 4 1.56. With ambient. Maybe outer dark but visible. Need "actually lights the planets". Use 120 and exposure 0.4. At 10 1.2, at 4 7.5 (white). Fine. Outer lit. Use 120 and exposure 0.35: at 10 1.2*0.35=0.42 ACES -> ~0.35 (gray). Hmm. Let's choose intensity 100, exposure 0.6, ambient 0.15. At 10:1 *0.6=0.6 ACES ~0.45 visible. At 4:6.25*.6=3.75 ACES ~0.96 washed. Acceptable? Maybe better use `THREE.SRGBColorSpace` output and colors lower.

Maybe use `renderer.outputColorSpace = THREE.SRGBColorSpace`? Not needed. Color constructor hex likely sRGB? In three, color values are linear? Could use darker planet colors. Use color 0x2244aa etc. Then bright overexposed less.

Need no shadows.

Could not use physical decay? Prompt explicitly says mind physically based light intensity/decay. Use decay=2. Intensity = 250. Set `renderer.useLegacyLights = false` maybe robust. But compile concerns. Let's examine likely @types from `three` package in node_modules. They have types for `WebGLRenderer`:
```
interface WebGLRenderer {
 setAnimationLoop(callback: (time: number) => void): void;
 ...
 getPixelRatio(): number;
 setPixelRatio(pixelRatio: number): void;
 getToneMapping(): number;
 setToneMapping(toneMapping: number): void;
 setToneMappingExposure(toneMappingExposure: number): void;
 useLegacyLights: boolean;
 physicallyCorrectLights: boolean; // maybe deprecated? 
}
```
Maybe setting both would duplicate? Could set one with comment? Need compile. If property doesn't exist, error. Use only modern? The prompt likely tests code compiles with tsc --strict but not run with real three? It may have types. It likely accepts `renderer.useLegacyLights = false`? Hmm.

The `three` module type from npm may not include `useLegacyLights` if version old. They might test type-check using some stub? Since we must satisfy import * as THREE from 'three' not typical. Could be they run `tsc` against `three` global namespace? Unclear.

Maybe avoid setting renderer flags. Point light decay and intensity are valid regardless. They said "mind physically based light intensity/decay" meaning don't set too high/low if using physical. But code can set `new PointLight(color, intensity, distance, decay)` with high intensity. Good.

Need maybe no `toneMapped:false` if type issue. Avoid.

Let's think about TypeScript strict with `window.addEventListener`. In DOM lib, `addEventListener` overloaded: `(type: 'resize', listener: (event: Event) => void)`. We pass `(): void => ...` no param, OK. But in TS, event handler may need parameter? No, optional.

Need no `document.write`. OK.

Let's formulate final code.

Potential hidden requirement: after first frame is rendered, set ready true. Could set after `requestAnimationFrame`? Use `renderer.setAnimationLoop(render);` with first frame. If `renderer.setAnimationLoop` internally uses requestAnimationFrame and callback? The callback will run each frame. We render inside. Good.

Could call `renderer.render` after appending? first frame? The prompt says use setAnimationLoop for render loop. Good.

Need maybe if code uses `window.innerWidth` before DOM ready? No.

Let's consider adding controls? Not necessary.

Need maybe all orbits in XZ around origin. Our direct positions do that. Good.

Need maybe planet2 moon child of planet mesh. Direct.

Let's write code. Ensure no comments? Fine. The final code block only.

Double-check `THREE.Color` in object literal: If color as number in data array, create new `THREE.Color(spec.color)`. OK.

Need if `Math.PI` accessible. Yes.

Potential issue: `const specs = [...]` inferred as object with readonly? No.

Potential issue: `planets.push({ mesh, ... })`: shorthand for `mesh` allowed.

Potential issue: `let moon = null;` union assignment. We must initialize with union. Good.

Potential issue: In animation callback, property access on object with union null; check if `p.moon` not null. TS narrowing works? `if (p.moon) { p.moon.position ... }` Since `p.moon` is `THREE.Mesh | null`, narrowing OK. But if object literal property `moon: moon` where moon variable union, OK.

Potential issue: `p.mesh.rotation.y` assignment: `rotation` is Euler, property y mutable? Yes. In three types, `rotation` type `Euler` has y number. OK.

Potential issue: `clock = new THREE.Clock()` and `clock.getDelta()` returns number. Good.

Let's final. Need code block. Done. Wait final should be one ```ts code block and nothing else. Ensure no analysis. final.
