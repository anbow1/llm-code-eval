Requirements:
1. One cube (BoxGeometry + MeshStandardMaterial) placed at the origin, continuously rotating around the X and Y axes.
2. One AmbientLight and one DirectionalLight.
3. A PerspectiveCamera placed so that the cube is clearly visible.
4. A background color different from the cube's color.
5. Frame-rate-independent rotation (delta time).

Hard rules:
- import * as THREE from 'three';
- Compilable under tsc --strict with zero errors.
- Create the WebGLRenderer yourself and append the canvas to document.body.
- Size it to window.innerWidth / window.innerHeight, and handle resizing.
- Use renderer.setAnimationLoop for the render loop, and use delta time.
- Expose __scene, __camera, __renderer, and set __ready = true after the first frame.
- No external assets.
- Reply with only a single ```ts code block and nothing else.

I'll write clean, strict-safe TypeScript.

```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e2a38); // background color

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2.5, 4);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 8, 5);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
    color: 0xff5533,
    roughness: 0.35,
    metalness: 0.15,
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Rotation speed (radians per second) — frame-rate independent
const rotationSpeedX = 0.8;
const rotationSpeedY = 1.2;

const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    cube.rotation.x += rotationSpeedX * delta;
    cube.rotation.y += rotationSpeedY * delta;
    renderer.render(scene, camera);
    if (!firstFrameRendered) {
        firstFrameRendered = true;
        (window as any).__ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait — should __ready be set "after" the first frame is rendered? Yes — setting it after renderer.render inside the loop is correct (it's after the render call. The actual swap to the display happens asynchronously, but this is the standard interpretation. You could also use a requestAnimationFrame after render, but setting it immediately after the renderer.render call is common and sufficient).

Strict mode considerations:
- All variables are typed. `(window as any)` casts are fine.
- `renderer.setAnimationLoop(callback)` — the callback takes (time: number). No problem.
- No unused variables that would trigger noUnusedLocals (tsc --strict doesn't include noUnusedLocals, but keeping it clean just in case).
- Body style: the page has no other HTML. Should I handle the body's margin? I can set the body's margin in CSS. "The page has no other HTML" — I can set document.body.style. That's fine and helps with layout. I'll add a small cleanup: `document.body.style.margin = '0';` and `overflow: 'hidden'`. This is allowed (no external assets, just DOM style).

Also, to prevent the page from scrolling, the canvas display can be set to block.

DirectionalLight intensity: in newer three.js, physically correct lighting may be the default, and an intensity of 1 may look dark, but... it's fine. It's just a visual issue.

Should I use `THREE.Clock`'s getDelta? Yes, it's delta-time based. Alternative: `renderer.setAnimationLoop((time) => ...)` and compute delta manually from a lastTime variable. Clock is simpler.

Also, set `__ready` after the first frame — do it after renderer.render.

TypeScript strict: `window.addEventListener('resize', ...)` is fine.

Double-check that the imports don't trigger "unused" — I'm only importing THREE and using it extensively.

One nuance: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — devicePixelRatio is a number, so it's fine.

The reply must be a single ts code block and nothing else. So no explanations.
