Simple requirements. Write TypeScript file with strict compilation. Need to be careful: strict mode means no implicit any. Use standard three typings.

Note: in strict mode, `document.body` could be null? DOM typings aren't null-checked by tsc unless strictNullChecks — strict includes strictNullChecks. But document.body is typed as HTMLElement (not null) in lib.dom? Actually document.body returns HTMLElement | null. So need non-null assertion or check. Append canvas: `document.body.appendChild(renderer.domElement)`. In strict mode, document.body is HTMLElement | null, so appendChild on possibly null would error. Use `document.body!` — but that's a TS thing; with DOM lib, `document.body` is typed `HTMLElement` actually. Let me recall: `document.body: HTMLElement` — in lib.dom.d.ts, HTMLDocument has `readonly body: HTMLElement`. Yes, it's HTMLElement (not nullable) historically. So fine.

Also strictNullChecks on things like `scene` — fine.

Write code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // background

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ color: 0xff6600 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(5, 8, 6);
scene.add(directional);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;

renderer.setAnimationLoop((time) => {
  const delta = ...; // setAnimationLoop callback receives time (elapsed ms). Better use Clock.
});
```

Use THREE.Clock: `const clock = new THREE.Clock();` and in loop `const delta = clock.getDelta();` Then rotate cube: `cube.rotation.x += delta * 0.8; cube.rotation.y += delta * 1.2;` render. After render, set `__ready = true`.

setAnimationLoop callback param typed as... it's `AnimationFrameAction`? In newer types, callback receives `(time: DOMEvent...)`? Actually `Renderer.setAnimationLoop(callback: (time: number) => void)`. Fine; can ignore param.

Note rotation speed must be frame-rate independent — using delta works.

Also note AmbientLight intensity param — in newer three versions (r155+) lights use physically correct by default; intensity 0.4 ambient might be dim but fine. To be safe use intensity values that look decent: ambient 0.5, directional 2.0? Actually with useLegacyLights default false since r152? In recent three, DirectionalLight intensity 1 with WebGLRenderer default... default renderer.useLegacyLights = false in r155+, so intensity 1 gives decent. I'll use ambient 0.5, directional 1.5.

Strict compilation: `(window as any).__ready = true;` fine.

Ensure no unused vars (strict doesn't include noUnusedLocals unless configured — strict flag doesn't include noUnusedLocals; strict includes: strict, strictBindCallApply, strictFunctionTypes, strictNullChecks, strictImplicitAny... actually strict enables alwaysStrict, noImplicitAny, strictBindCallApply, strictFunctionTypes, strictNullChecks, strictPropertyInitialization, useUnknownInCatchVariables. Not noUnusedLocals. Fine either way, I'll use all variables anyway.

Write final code block.