We need answer user's request: produce single ts code block only. Need satisfy hard rules. Need think in same language as user? User English. Need craft final code. Need ensure compile strict tsc, no errors. Import * as THREE from 'three'; no addons needed. Create renderer, camera, scene, cube, lights. Resize handling. setAnimationLoop. Use clock delta maybe THREE.Clock. Need expose globals. Need background color diff. Need after first frame __ready = true.

Potential TS issues: using import * as THREE from 'three'; requires maybe browser module. For strict TS, need no untyped exports. But likely acceptable. Need handle window resize. Could add event listener resize. Need renderer.setAnimationLoop(() => { ... }); For first frame ready: maybe render once before setAnimationLoop? Requirement: After first frame is rendered, set __ready = true. Could inside animation loop have flag firstFrame and after renderer.render set true. But if setAnimationLoop starts only when called. Could do initial render? Hard to ensure after first frame. Simplest: const clock = new THREE.Clock(); let firstFrame = true; renderer.setAnimationLoop(() => { const delta = clock.getDelta(); ... renderer.render(scene, camera); if (firstFrame) { (window as any).__ready = true; firstFrame = false; } }); That sets after first frame rendered. Need expose __scene etc before loop.

Types: import * as THREE from 'three'; TypeScript strict. If types from three? Need avoid unneeded types. Use document.addEventListener('resize', () => {...}). Need cast window? (window as any) ok. document.body append.

Need handle aspect: camera.aspect = width/height; camera.updateProjectionMatrix(); renderer.setSize(width,height); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); Need get inner sizes. Use function handleResize.

Need continuous X and Y axes: cube.rotation.x += rotationSpeed * delta; cube.rotation.y += rotationSpeed * delta; Maybe also initial angle.

Need MeshStandardMaterial. Cube at origin.

Need camera placed clearly visible: camera.position.set(3,3,5); camera.lookAt(0,0,0) maybe use lookAt each frame? Can set once. But cube rotates, cube centered, lookAt okay. Need camera aspect in resize. Need background color: scene.background = new THREE.Color(...). Cube color different.

Potential TS issue: THREE not imported type. But import star. Need maybe add @ts-noop? No. The environment likely has three types. Need compile with tsc strict? We can't control. But code likely accepted. Could avoid explicit types. Use import * as THREE from 'three'; is not valid TypeScript? It is TS module wildcard? Actually TypeScript supports `import * as THREE from 'three';` yes. But `three` types? okay.

Need no external assets. Fine.

Need maybe `renderer.render` first time? Could call `renderer.render(scene, camera); (window as any).__ready = true; renderer.setAnimationLoop...`. But if we call renderer.render before setting loop, then first frame already rendered. Requirement after first frame rendered set true. That satisfies. Then animation loop only updates. But if we call before loop then __ready set immediately even before actual frame? We actually render. But no need. If set ready before renderer.render maybe not. So call renderer.render then ready then loop. However setAnimationLoop's first iteration might also render. But ready already true after explicit first render. But explicit first render may not be from animation loop. Is it okay? "After the first frame is rendered, set __ready = true." It is after rendering. Could still be okay. But if testing expects __ready only after renderer.setAnimationLoop? Hard.

Maybe better: inside animation loop with firstFrame after render. But if __ready set after first rendered frame in loop. Let's do that. Need if setAnimationLoop callback may not execute until requestAnimationFrame. If tests check after requestAnimationFrame? likely.

But to ensure __ready true after first frame rendered, set inside loop after render. Good.

Potential issue: if user expects `window.__ready` set after first rendered frame from loop. fine.

Need maybe guard against zero delta? fine.

Need use `renderer.setAnimationLoop` as callback type `() => void`. In TS, THREE types define `setAnimationLoop( callback: () => void)`. okay.

Potential issue with `window.devicePixelRatio` type: number. okay.

Need maybe use `window.innerWidth` etc. Fine.

Need add resize listener: window.addEventListener? In TS DOM, `window.addEventListener('resize', handleResize)` exists? yes. Use `window.addEventListener`.

Need `renderer.setSize(width, height)` expects number. `window.innerWidth` number. okay.

Need `camera.aspect = width / height` where height could 0? window height not 0. Could guard.

Full code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const cubeColor = new THREE.Color('#2fd3c7'); // no, CubeGeometry + MeshStandardMaterial)
But comment typo.
const backgroundColor = new THREE.Color('#10131a');
scene.background = backgroundColor;

const geometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshStandardMaterial({ color: cubeColor, roughness:0.35, metalness:0.25 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.6);
dir.position.set(5,8,7);
scene.add(dir);

let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(60, width/height, 0.1, 100);
camera.position.set(3,3,5);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
document.body.appendChild(renderer.domElement);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const update = () => {
 const w = window.innerWidth; const h = window.innerHeight; if (w !== width || h !== height) { width = w; height = h; renderer.setSize(width,height); renderer.setPixelRatio(...); camera.aspect = width/height; camera.updateProjectionMatrix(); }
};
window.addEventListener('resize', update);

const clock = new THREE.Clock();
let firstFrame = true;
const rotSpeed = 0.8;
renderer.setAnimationLoop(() => {
 const delta = clock.getDelta();
 cube.rotation.x += rotSpeed*delta;
 cube.rotation.y += rotSpeed*delta;
 renderer.render(scene, camera);
 if(firstFrame) { (window as any).__ready = true; firstFrame = false; }
});

```

Potential TS issue: `window.addEventListener` may need DOM types, okay. But in TS strict, event handler type? `window.addEventListener('resize', update);` where update signature `() => void` okay? DOM types may expect Function? In browser tsconfig maybe DOMWindow? But likely fine. Could avoid by using `window.addEventListener('resize', () => update())`; still type mismatch? Usually fine. `update` is `() => void`; DOM listener accepts `ListenerOptions`? In TS DOM, EventTarget.addEventListener signature: (type: string, fn: (e: Event) => void). If pass () => void maybe compatible? In TS, function with fewer params assignable. yes.

Could be issue: `new THREE.Clock()` no types? okay.

Need no errors under tsc strict if three types available.

Potential strict issue: `const material = new THREE.MeshStandardMaterial({ color: cubeColor, roughness:0.35, metalness:0.25 });` `color` type maybe `Color | number | string`. `THREE.Color` okay. Use number for color to avoid type? `0x00ccff` accepted number. Fine. Let's use numbers.

Need maybe use `renderer.setAnimationLoop(() => { ... });` In strict TypeScript, arrow callback return void? okay.

Potential issue: If renderer fails context, but not.

Need maybe include `if (typeof document === "object")` no.

Need answer only code block. The final should have code block no extra. Ensure valid. Need maybe no semicolon issues.

Let's consider compile with strict without DOM types? They said TypeScript file for browser. If no DOM types, `window` and `document` may error. But standard TS config with DOM. okay.

Potential concern: `window.devicePixelRatio` may be undefined if no DOM. no.

Could use `const resize` listener. Need handle resize from window resize. Fine.

Need ensure `(window as any).__ready = true` after render. Use `if (firstFrame)`. Good.

Now final code block.

Double-check: The prompt: "Create a scene with a single cube (BoxGeometry + MeshStandardMaterial) at the origin that rotates continuously around the X and Y axes." Could also use `requestAnimationFrame` but must setAnimationLoop. okay.

No need OrbitControls.

Maybe use `renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));` If devicePixelRatio undefined? no but safe. `Math.min(window.devicePixelRatio || 1, 2)` returns number. Use `const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);`. In strict, okay.

Potential issue: If width/height zero? Not in browser. Could guard:

```
function updateViewport(): void {
 const nextWidth = Math.max(1, window.innerWidth);
 const nextHeight = Math.max(1, window.innerHeight);
 ...
}
```
But `window.innerWidth` type number, Math.max returns number.

Use `let viewportWidth = window.innerWidth || 1;` but `||` on number could 0. Fine.

Need assign `camera.aspect = viewportWidth / viewportHeight;`.

Maybe `window.addEventListener('resize', updateViewport);` okay.

Could `renderer.domElement` is CanvasElement; append. Good.

Potential compile issue if `import * as THREE from 'three'` with no module extension? In TS, module paths can be 'three' if package? okay for browser. Hard rule explicitly says.

Let's craft final with code only.

Need maybe comment typo? Avoid.

Final:
```ts
import * as THREE from 'three';
...
```

Need ensure no hidden nonascii? fine.

Let's think if `renderer.setAnimationLoop` with callback type in three types is `(callback: () => void): void` maybe okay. But if using closure variable `firstFrame` let, okay.

Could there be issue: `const clock = new THREE.Clock();` if strict type, fine.

Potential issue: `new THREE.Color('#10131f')` string maybe not accepted? Types of Color constructor: `constructor(color?: Color | string | number)`, okay. Could use number to be safe: `0x10131f`. For material `color: 0x38bdf8` number. Use numbers.

Need avoid `MeshStandardMaterial` options type: `MeshStandardMaterial` type options is `MeshStandardMaterialParameters`. numeric color okay. roughness number. metalness number.

Need set `renderer.outputColorSpace`? no.

Potential issue: `renderer.setPixelRatio` before append? fine.

Maybe `window.innerWidth` not typed in `window`? With lib DOM, `window` has `innerWidth`. yes.

Need maybe include `declare const window: any`? No, conflicts. The hard rule likely expects using DOM. okay.

Let's decide if adding `if (!document.body)`? no.

Potential issue: `(window as any).__ready = true` after first rendered frame. But if `renderer.render` throws? not.

Now final.
