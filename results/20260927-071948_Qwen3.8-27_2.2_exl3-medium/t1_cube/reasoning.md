The user wants a single TypeScript file that creates a Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Follow all the hard rules: import Three.js, create WebGLRenderer, append canvas to document.body, handle resize, use setAnimationLoop, expose testing variables, set __ready after first frame, no external assets.

Let me write this carefully:

- Import Three.js as `import * as THREE from 'three';`
- Create scene, camera, renderer
- Add BoxGeometry + MeshStandardMaterial cube
- Add AmbientLight and DirectionalLight
- Position camera so cube is visible (e.g., at (3, 3, 5) looking at origin)
- Background color different from cube (e.g., background is dark blue, cube is orange/red)
- Use renderer.setAnimationLoop with delta time for rotation
- Handle window resize
- Expose __scene, __camera, __renderer
- Set __ready after first frame
- Must compile with tsc --strict

Let me think about the rotation. I'll use `renderer.setAnimationLoop` which passes a timestamp. I need to track the previous timestamp to compute delta. Actually, `setAnimationLoop` passes a `time` parameter in milliseconds. I can track the previous time to get delta.

Let me structure:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0, 0);
scene.add(cube);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = 0;
let isReady = false;

renderer.setAnimationLoop((time: number) => {
    const delta = (time - lastTime) / 1000; // convert to seconds
    lastTime = time;

    cube.rotation.x += 0.5 * delta;
    cube.rotation.y += 0.7 * delta;

    renderer.render(scene, camera);

    if (!isReady) {
        isReady = true;
        (window as any).__ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, for tsc --strict, I need to make sure there are no type issues. Let me check:
- `renderer.setAnimationLoop((time: number) => {...})` - the callback signature is `(time: number) => void` which is fine.
- `(window as any)` is fine.
- All variables are properly typed.

Actually, I should be careful with the `lastTime` initialization. On the first frame, `time` will be some value and `lastTime` starts at 0, so the first delta will be large. That's fine for the first frame - the rotation will jump a bit. Alternatively, I could set `lastTime = time` on the first frame. Let me handle that to be clean.

Actually, let me just initialize `lastTime` to 0 and accept the first frame's delta. Or better, I can track it more carefully. Let me use a flag or just accept it - the first frame's delta will be `time / 1000` which could be a few hundred ms. That's a small jump. Let me just handle it properly:

```typescript
let lastTime: number | null = null;

renderer.setAnimationLoop((time: number) => {
    const delta = lastTime === null ? 0 : (time - lastTime) / 1000;
    lastTime = time;
    ...
});
```

This is cleaner. On the first frame, delta is 0 so no rotation jump.

Let me finalize the code.
