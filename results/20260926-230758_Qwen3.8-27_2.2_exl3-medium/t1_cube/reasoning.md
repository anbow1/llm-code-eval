The user wants a single TypeScript file that creates a Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. The cube rotates continuously around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Rotation speed must be frame-rate independent (use delta time)
7. Must follow all the hard rules: import THREE, addons, create renderer, append to body, handle resize, use setAnimationLoop, expose scene/camera/renderer on window, set __ready after first frame, no external assets.

Let me write this carefully:

- Import THREE from 'three'
- Create scene, camera, renderer
- Set background color (e.g., dark blue/gray)
- Create a cube with BoxGeometry and MeshStandardMaterial (e.g., orange/red)
- Add AmbientLight and DirectionalLight
- Position camera so cube is visible (e.g., z=5 looking at origin)
- Handle resize
- Use setAnimationLoop with delta time for rotation
- Expose window.__scene, __camera, __renderer
- Set __ready after first frame

Let me make sure the code compiles with tsc --strict. I need to be careful with types.

For the rotation: I'll track elapsed time or use delta. Actually, the simplest approach is to use the delta parameter from setAnimationLoop (which is in seconds) and multiply by a rotation speed constant.

Let me write the code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5, metalness: 0.3 });
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const rotationSpeedX = 0.8; // radians per second
const rotationSpeedY = 1.2; // radians per second

let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
    // We need delta - setAnimationLoop passes the timestamp in ms
    // Actually, let me use a reference to previous time
    ...
});
```

Wait, the setAnimationLoop callback receives a DOMHighResTimeStamp (milliseconds). I need to compute delta. Let me track the previous time.

Actually, looking at the Three.js docs, `setAnimationLoop` calls the callback with a timestamp. I'll track the previous timestamp to compute delta.

Let me refine:

```ts
let prevTime = 0;

renderer.setAnimationLoop((time: number) => {
    const delta = (time - prevTime) / 1000; // convert to seconds
    prevTime = time;
    
    cube.rotation.x += rotationSpeedX * delta;
    cube.rotation.y += rotationSpeedY * delta;
    
    renderer.render(scene, camera);
    
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});
```

Wait, on the very first call, prevTime is 0 and time might be something like 16ms, so delta would be 0.016 which is fine. Actually it's better to initialize prevTime to 0 and on the first frame the delta will be time/1000 which could be a small value. That's fine.

Actually, let me think about this more carefully. The first call to setAnimationLoop will have `time` as the timestamp from requestAnimationFrame. If I set prevTime = 0, then delta = time/1000 which could be like 0.016s. That's fine for the first frame.

Let me finalize the code. I need to make sure everything is properly typed for strict mode.

The `document.body.appendChild(renderer.domElement)` - in strict mode, `document.body` is `HTMLElement | null`. I should handle this or just assert it. Actually, in the browser, `document.body` is non-null after the document is loaded. But TypeScript strict mode might complain. Let me use `document.body!` or check.

Actually, `document.body` type is `HTMLElement | null`. In strict mode, I need to handle the null case. Let me do:

```ts
document.body.appendChild(renderer.domElement);
```

Hmm, `document.body` is typed as `HTMLElement | null` in the DOM lib. In strict mode, this would be an error because you can't pass a possibly-null value to `appendChild` which expects `Node`. Let me use:

```ts
document.body.appendChild(renderer.domElement);
```

Wait, actually in TypeScript's DOM lib, `document.body` is `HTMLElement | null`. So `document.body.appendChild(...)` would error in strict mode because the value could be null.

I should do:
```ts
const body = document.body;
if (body) {
    body.appendChild(renderer.domElement);
}
```

Or I could just use `document.body!.appendChild(renderer.domElement)` - but the non-null assertion might be fine.

Actually, let me just use:
```ts
document.body.appendChild(renderer.domElement);
```

In most TypeScript setups with `strict: true`, `document.body` is `HTMLElement | null`, so calling `.appendChild` on it would give an error. Let me handle it properly.

Let me write the final version:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 1, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const body = document.body;
if (body) {
    body.appendChild(renderer.domElement);
}

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    roughness: 0.5,
    metalness: 0.3,
});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Animation
const rotSpeedX = 0.8;
const rotSpeedY = 1.2;
let prevTime = 0;
let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
    const delta = (time - prevTime) / 1000;
    prevTime = time;

    cube.rotation.x += rotSpeedX * delta;
    cube.rotation.y += rotSpeedY * delta;

    renderer.render(scene, camera);

    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});
```

This looks good. Let me double-check:
- ✅ Import THREE as `import * as THREE from 'three'`
- ✅ No addons needed
- ✅ Creates WebGLRenderer, appends canvas to document.body
- ✅ Sizes from window.innerWidth/innerHeight, handles resize
- ✅ Uses setAnimationLoop
- ✅ Motion uses delta time
- ✅ Exposes __scene, __camera, __renderer
- ✅ Sets __ready after first frame
- ✅ No external assets
- ✅ Single cube with BoxGeometry + MeshStandardMaterial at origin
- ✅ Rotates around X and Y axes
- ✅ One AmbientLight, one DirectionalLight
- ✅ PerspectiveCamera positioned to see cube
- ✅ Background color (0x1a1a2e dark blue) different from cube color (0xff6600 orange)
- ✅ Frame-rate independent rotation

This should compile with tsc --strict. Let me verify there are no type issues:
- `document.body` → `HTMLElement | null`, handled with if check
- `window.addEventListener` → fine
- `renderer.setAnimationLoop((time: number) => ...)` → the callback type is `((time: DOMHighResTimeStamp) => void) | null`, and `DOMHighResTimeStamp` is `number`, so `(time: number)` is compatible
- All THREE constructors and properties are properly typed

Looks good. Let me write the final answer.
