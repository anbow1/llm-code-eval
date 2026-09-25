The user wants a single TypeScript file that:
- Imports Three.js as `import * as THREE from 'three';`
- Compiles with tsc --strict
- Creates WebGLRenderer, appends canvas to document.body
- Sizes from window dims, handles resize
- setAnimationLoop, delta-time-based motion
- Exposes __scene, __camera, __renderer on window
- Sets __ready = true after first frame rendered
- No external assets

Scene requirements:
- Single cube (BoxGeometry + MeshStandardMaterial) at origin
- Rotates continuously around X and Y axes
- One AmbientLight and one DirectionalLight
- PerspectiveCamera placed so cube is clearly visible
- Background color different from cube color
- Rotation frame-rate independent via delta

Let me write clean strict-mode TypeScript.

```ts
import * as THREE from 'three';

// --- Renderer ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene & background -----------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101820); // dark background, distinct from cube

// --- Camera ------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.5, 2.0, 4.0);
camera.lookAt(0, 0, 0);

// --- Lights ------------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(3, 4, 5);
scene.add(directional);

// --- Cube --------------------------------------------------------------------
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff5533 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
cube.position.set(0,0,0);

// --- Rotation speeds (radians per second) ------------------------------------
const ROTATION_SPEED_X = 0.7;
const ROTATION_SPEED_Y = 1.1;

const clock = new THREE.Clock();
let readyFlagged = false;

renderer.setAnimationLoop(() => {
  const delta = renderer.setAnimationLoop ? clock.getDelta() : 0;
  
  cube.rotation.x += ROTATION_SPEED_X * delta;
  cube.rotation.y += ROTATION_SPEED_Y * delta;

  renderer.render(scene, camera);

  if (!readyFlagged) {
    (window as any).__ready = true;
    readyFlagged = true;
  }
});

// --- Resize ------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Testing hooks -------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Hmm, the `const delta = renderer.setAnimationLoop ? clock.getDelta() : 0;` line is weird — just use `const delta = clock.getDelta();`.

Alternatively, use the time parameter from setAnimationLoop: `renderer.setAnimationLoop((time) => {...})` — time is a DOMHighResTimeStamp in ms. But using delta from that time requires tracking previous time. Using THREE.Clock() getDelta is cleaner and clearly delta-based. I'll use Clock.

Also, one subtlety: "After the first frame is rendered, set __ready = true." renderer.render is synchronous, so after the call, the frame has been rendered (well, it's been submitted to the GPU via the rendering path; commands are issued). It's standard to set ready after first render call. That's fine.

Strict mode considerations: `renderer.setAnimationLoop(() => {...})` — the callback receives (time: number, frame?: XRFrame). Passing a zero-arg function is fine in TS.

Also `document.body` — body exists since script runs... Actually with tsc compiled to module, script is deferred with type="module" typically, so DOM parsed. But to be safe under strict, document.body could be null typed: `document.body` is typed as HTMLElement (not null) in lib.dom, so no error. Fine.

Let me also ensure body has no margin — could add style, but the page has "no other HTML" — setting styles via JS is fine. I can set `document.body.style.margin = '0'` — optional but nice. That's not adding HTML. I'll include.

Cube color: 0xff5533 (red-orange), background: 0x0a0e14 dark navy — clearly different.

Camera position: (2.5, 2, 4) looking at origin — cube clearly visible. Good.

DirectionalLight intensity: newer three versions (r155+) use physically correct lighting by default; intensity 1.0 with ambient 0.4 on MeshStandardMaterial should look fine. Maybe bump directional to 2 to ensure good brightness. I'll go ambient 0.4, directional 1.5.

Add a subtle note: use useLegacyLights? No, leave defaults.

Final code — complete file. Should I expose __ready initially as false? Not required; just set true after first frame.

Let me write it out cleanly.

One more consideration: `renderer.setAnimationLoop(() => { const delta = clock.getDelta(); ... })` — clock starts on first getDelta call; before start, clock is running when Clock instantiated with autoStart true... getDelta calls getElapsedTime internally which starts clock. First delta might be ~0 which is fine.

Write final answer with just the ts code block.