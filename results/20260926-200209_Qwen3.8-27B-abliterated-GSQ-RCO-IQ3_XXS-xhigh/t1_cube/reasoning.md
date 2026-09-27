The user wants a single TypeScript file that:
1. Imports Three.js as `import * as THREE from 'three';`
2. Creates a WebGLRenderer, appends canvas to document.body
3. Sizes from window.innerWidth/innerHeight, handles resize
4. Uses renderer.setAnimationLoop
5. Exposes __scene, __camera, __renderer
6. Sets __ready = true after first frame
7. No external assets
8. A single cube at origin with BoxGeometry + MeshStandardMaterial
9. Rotates around X and Y axes continuously
10. AmbientLight + DirectionalLight
11. PerspectiveCamera positioned so cube is visible
12. Background color different from cube color
13. Rotation speed frame-rate independent (delta time)

Let me write this carefully.

For the animation loop with setAnimationLoop, the callback receives (time, deltaTime) — actually in newer three versions, setAnimationLoop callback is `(time: DOMHighResTimeStamp, frame?: number)`... let me check. The signature is `setAnimationLoop(callback: (time: DOMHighResTimeStamp, frame?: number) => void | undefined)`. The second argument is delta in seconds (added in r150 or so). To be safe across versions, I'll compute delta myself using performance.now() or the time parameter, with a clock-like approach. Actually, let me just use THREE.Clock — it's the standard approach and works regardless. But the requirement says "use delta/elapsed time, not frame counts". THREE.Clock gives delta. However, with setAnimationLoop, using Clock.getDelta() works fine.

Actually, to be robust: I'll use `renderer.setAnimationLoop(() => { ... })` and compute delta from a stored previous timestamp using the `time` parameter provided:

```ts
let lastTime: number | null = null;
renderer.setAnimationLoop((time: number) => {
    if (lastTime === null) lastTime = time;
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    ...
});
```

Hmm, but the `time` parameter is a DOMHighResTimeStamp (milliseconds). This works. Alternatively, use THREE.Clock. Clock is simpler and definitely compiles. Let me use the time parameter approach since it's tied to the animation loop directly. Actually either is fine. Let me use the callback's time parameter — it's clean and avoids extra state... well, I still need lastTime state.

Let me write it:

```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2332);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 2, 5);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 8, 6);
scene.add(directionalLight);

// Cube
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x4fc3f7, metalness: 0.1, roughness: 0.6 })
);
scene.add(cube);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let lastTime: number | null = null;
let ready = false;
const rotationSpeed = Math.PI; // radians per second

renderer.setAnimationLoop((time: number) => {
  if (lastTime === null) lastTime = time;
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  cube.rotation.x += rotationSpeed * 0.3 * delta;
  cube.rotation.y += rotationSpeed * 0.5 * delta;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait — the requirement: "After the first frame is rendered, set (window as any).__ready = true." Setting it after renderer.render completes inside the loop is correct — the frame has been rendered at that point.

Strict mode considerations:
- `time: number` — the setAnimationLoop callback type in three's types is `(time: number, frame: number) => void`? Let me check. In @types/three / three's own types (three now ships its own types), the signature is:

```ts
setAnimationLoop(callback: XRFrameRequestCallback | null): void;
```

Hmm, actually in three's src, `setAnimationLoop` is typed as:
```ts
setAnimationLoop(callback: (time: DOMHighResTimeStamp, frame: number) => void | undefined | null): void;
```

Let me recall. In three.js source (WebGLRenderer.ts):
```ts
setAnimationLoop(callback: XRFrameRequestCallback | null): void {
```

where `XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame | null) => void`. Hmm, that's the XR-style callback. Actually:

```ts
export type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame | null) => void;
```

Hmm, but the delta... In three r155+, the callback is `(time, frame)` where frame is a number (delta in seconds) for non-XR? Let me think. Looking at WebGLRenderer.setAnimationLoop implementation:

```js
function onAnimationFrame(time) {
    ...
    callback(time, frame);
}
```

Hmm, actually the signature in the .d.ts of three:

```ts
setAnimationLoop(callback: (time: DOMHighResTimeStamp, frame: number) => void | undefined): void;
```

I believe in recent versions it's `(time: number, frame: number) => void`. If my callback only takes `(time: number)`, that's fine in TypeScript since a function with fewer parameters is assignable to a function type with more parameters.

To be safe with strict compilation, I'll write:

```ts
renderer.setAnimationLoop((time: number) => { ... });
```

The `time` param: if three's types say `DOMHighResTimeStamp`, that's an alias for `number`, so `number` works. Good.

Edge case: first call has time being some value, delta 0 — fine.

Also, I should consider that `time` could be a large timestamp from performance origin. Using the provided `time` param and computing delta between consecutive calls is correct.

Alternatively, use THREE.Clock:

```ts
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1); // clamp to avoid huge jumps
  ...
});
```

Clamping delta is good practice (tab switching). Let me include a small clamp.

Also, I should handle the page having no other HTML: set body margin to 0? "The page has no other HTML" — I can style via JS: `document.body.style.margin = '0'` and maybe display block on canvas, overflow hidden. That's a nice touch but optional. I'll add minimal body style to make it look right (margin 0, overflow hidden, canvas display block). This doesn't violate anything.

Also pixel ratio: setPixelRatio(Math.min(window.devicePixelRatio, 2)). On resize, also update pixel ratio? devicePixelRatio rarely changes on resize; fine.

TypeScript strictness: everything typed, no implicit any. `window as any` casts are allowed.

Also, I should make sure no unused variables. I'll keep it clean.

Let me also think about whether tests might check `__ready` — it must be set after first frame render. My placement after `renderer.render` in the loop is correct.

One more consideration: should I set `__ready` before or after render? "After the first frame is rendered" — after renderer.render returns, the frame has been submitted to GPU (render command issued). That's a reasonable interpretation and standard.

Let me also make sure the cube is "clearly visible": camera at (3, 2, 5) looking at origin, cube size 1 (or maybe 1.5). 60° FOV. Distance ~6.4, cube half-extent 0.5 — plenty visible. Maybe cube size 1.5 for presence. Let me do BoxGeometry(1.5, 1.5, 1.5). Fine.

Rotation around X and Y: increment both rotation.x and rotation.y each frame scaled by delta. E.g.:

```ts
cube.rotation.x += X_SPEED * delta;
cube.rotation.y += Y_SPEED * delta;
```

With X_SPEED = 0.6 rad/s, Y_SPEED = 1.0 rad/s or so.

Final code:

```ts
import * as THREE from 'three';

// --- Scene -------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202830);

// --- Camera -------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(4, 2.5, 6);
camera.lookAt(scene.position);

// --- Renderer -----------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// --- Lights -------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 8, 6);
scene.add(directionalLight);

// --- Cube -----------------------------------------------------------------
const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const cubeMaterial = new THREE.MeshStandardMaterial({
  color: 0xff8c42,
  roughness: 0.4,
  metalness: 0.1,
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0, 0);
scene.add(cube);

// --- Resize ----------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation --------------------------------------------------------------
const ROTATION_X_PER_SECOND = 0.7;
const ROTATION_Y_PER_SECOND = 1.1;
const MAX_DELTA = 0.1;

let lastTime: number | null = null;
let firstFrameDone = false;

renderer.setAnimationLoop((time: number) => {
  if (lastTime === null) lastTime = time;
  const delta = Math.min((time - lastTime) / 1000, MAX_DELTA);
  lastTime = time;

  cube.rotation.x += ROTATION_X_PER_SECOND * delta;
  cube.rotation.y += ROTATION_Y_PER_SECOND * delta;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait: one subtlety with `setAnimationLoop`'s callback signature in three's d.ts. Let me recall exactly. In three's `src/Three.d.ts` (they generate types from source):

```ts
class WebGLRenderer {
    ...
    setAnimationLoop(callback: (time: DOMHighResTimeStamp, frame: number) => void | undefined): void;
}
```

Actually in the three source (r160):

```ts
setAnimationLoop(callback: XRFrameRequestCallback | null): void {
```

Hmm no. Let me check the actual current source. From three.js src/renderers/WebGLRenderer.js:

```js
setAnimationLoop(callback) {
    if (callback === null) {
        if (animation !== null) {
            if (isXR) xrSessionRequest?.cancel();
            else cancelAnimationFrame(animation);
            animation = null;
        }
    } else {
        if (animation !== null) {
            if (isXR) xrSessionRequest?.cancel();
            else cancelAnimationFrame(animation);
            animation = null;
        }

        if (isXR) {
            ...
        } else {
            animation = requestAnimationFrame(onAnimationFrame);
        }
    }
}
```

And onAnimationFrame:

```js
function onAnimationFrame(time) {
    ...
    if (callback !== null) callback(time, frame);
    ...
}
```

Hmm, what's `frame` there? I recall in newer versions they added a delta parameter: `callback(time, frame)` where `frame` is delta in seconds. Actually I recall the type definition:

```ts
setAnimationLoop(callback: (time: DOMHighResTimeStamp, frame: number) => void | undefined): void;
```

Whatever the exact signature, passing a function `(time: number) => void` is assignable in TS: a function accepting fewer parameters is compatible. And `DOMHighResTimeStamp` = `number` (DOMHighResTimeStamp is a type alias for number in lib.dom.d.ts). So my callback type is compatible.

One risk: if three's type expects `(time: number, frame: number) => void | undefined` and I pass `(time: number) => void` — assignable. Good.

Another risk: `renderer.setAnimationLoop` in older versions types callback as `XRFrameRequestCallback | null` = `(time: DOMHighResTimeStamp, frame: XRFrame | null) => void`. Passing `(time: number) => void` is still assignable (fewer params, and DOMHighResTimeStamp is number). Good.

`time - lastTime` — time is number, lastTime is number after null check. But note: inside the loop, `lastTime` is `number | null`; after `if (lastTime === null) lastTime = time;`, TS narrows `lastTime` to number for the rest of that block? Carefully: `lastTime` is a module-level `let` with type `number | null`. Inside callback: `if (lastTime === null) lastTime = time;` — after assignment, `lastTime` is number. Then `time - lastTime` — TS: after the if block, lastTime is `number` (assigned in both branches: in if branch assigned, in else branch it wasn't null so already number). TS control flow: after `if (lastTime === null) { lastTime = time; }`, in the join point, lastTime is number (from if branch: number; from implicit else: number since null was excluded). Yes, narrows correctly.

But wait — TS narrows `lastTime` at module level only within the function scope since it's a closure variable; narrowing across closures works within a single function body. Yes, fine.

Alternatively use a local:
```ts
const now = time;
const previous = lastTime === null ? now : lastTime;
const delta = ...
```
Current approach is fine.

Hmm, actually one more subtlety: TS control-flow narrowing of `let` variables captured in closures — inside the callback function body, `lastTime` is a captured variable. TS does narrow it within the function body. After `if (lastTime === null) lastTime = time;`, `lastTime` is `number`. Correct.

Now, `document.body` could be null in strict? `document.body` is `HTMLBodyElement` (not nullable in lib.dom). Actually in lib.dom.d.ts, `body: HTMLBodyElement;` — not nullable. Good.

`window.devicePixelRatio` — number. Good.

Everything should compile under strict.

Let me also double check: no external assets — only BoxGeometry, lights, colors. Good.

Should I add subtle motion to the camera or cube bobbing? Not required. Keep it minimal per spec.

Add `powerPreference: 'high-performance'`? Optional, harmless. Keep simple.

One more: the instructions say "Reply with a single ```ts code block and nothing else." So the final answer is just the code block. No comments before or after.

Let me finalize the code with some light comments (comments inside code are fine).

Also, I need to make sure that in some versions of three, the second arg of `setAnimationLoop`'s callback is `number` for delta — but I'm not using it, so irrelevant.

Final check on strict errors:
- `import * as THREE from 'three';` — used.
- All consts used.
- `(window as any)` — fine.
- No implicit any: event listeners: `window.addEventListener('resize', () => {...})` — arrow, no param needed; typed fine.

I think it's solid. Let me write it out.
