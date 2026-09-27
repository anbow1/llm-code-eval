The user wants a single TypeScript file that:
1. Creates a Three.js scene with a rotating cube
2. BoxGeometry + MeshStandardMaterial at origin
3. Rotates around X and Y axes continuously
4. Lit with one AmbientLight and one DirectionalLight
5. PerspectiveCamera positioned so cube is clearly visible
6. Background color different from cube color
7. Frame-rate independent rotation using delta time
8. Follows all the hard rules: import THREE, create renderer, append to body, handle resize, use setAnimationLoop, expose __scene/__camera/__renderer, set __ready after first frame, no external assets

Let me write this carefully:

- Import THREE from 'three'
- Create scene, camera, renderer
- Add a cube with BoxGeometry and MeshStandardMaterial
- Add AmbientLight and DirectionalLight
- Position camera so cube is visible (e.g., at z=3 or so)
- Set background color different from cube
- Use renderer.setAnimationLoop with delta time for rotation
- Handle resize
- Expose window properties
- Set __ready after first frame

For delta time in setAnimationLoop, the callback receives (timestamp, frame) where frame is the delta in seconds (actually it's the performance.now() timestamp in ms for the first param, and the second is... let me check).

Actually, looking at Three.js docs, `renderer.setAnimationLoop(callback)` calls the callback with `(timestamp: number)` where timestamp is in milliseconds. It doesn't automatically provide delta. I need to compute delta myself using the timestamp.

Wait, let me reconsider. The setAnimationLoop callback signature is `(time: number) => void` where time is the DOMHighResTimeStamp. I'll need to track the previous timestamp to compute delta.

Let me write this out:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xe94560 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let lastTime = 0;
let ready = false;

const rotationSpeed = Math.PI / 2; // radians per second

renderer.setAnimationLoop((time: number) => {
  if (lastTime === 0) lastTime = time;
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  cube.rotation.x += rotationSpeed * delta;
  cube.rotation.y += rotationSpeed * delta;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

This looks good. Let me double-check:
- ✅ Import THREE from 'three'
- ✅ Create WebGLRenderer, append to document.body
- ✅ Size from window.innerWidth/innerHeight
- ✅ Handle resize (camera aspect + renderer size)
- ✅ Use renderer.setAnimationLoop
- ✅ Motion uses delta time
- ✅ Expose __scene, __camera, __renderer
- ✅ Set __ready after first frame
- ✅ No external assets
- ✅ BoxGeometry + MeshStandardMaterial
- ✅ Rotates around X and Y
- ✅ AmbientLight + DirectionalLight
- ✅ Background different from cube color (dark blue vs red)
- ✅ Frame-rate independent rotation

This should compile with tsc --strict without issues. Let me make sure there are no implicit any issues. The `time` parameter in setAnimationLoop callback - in strict mode, TypeScript should infer it from the type definition. The setAnimationLoop expects `(time: number) => void` so the parameter will be typed correctly.

One thing to be careful about - `renderer.setPixelRatio` is fine. All looks good.
