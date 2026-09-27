The user wants a complete TypeScript file that creates a Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Rotates continuously around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. WebGLRenderer created manually, canvas appended to document.body
8. Window resize handling
9. setAnimationLoop for render loop
10. Expose __scene, __camera, __renderer, __ready
11. No external assets
12. Import as `import * as THREE from 'three';`
13. Must compile with tsc --strict

Let me write this carefully with strict TypeScript in mind.

For the animation loop with setAnimationLoop, the callback receives (time: DOMHighResTimeStamp) but I need delta time. I can track previous time and compute delta.

Let me write the complete file:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, metalness: 0.3, roughness: 0.4 });
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const ROTATION_SPEED_X = 0.8; // radians per second
const ROTATION_SPEED_Y = 0.6; // radians per second
let prevTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
    if (prevTime === 0) {
        prevTime = time;
    }
    const delta = (time - prevTime) / 1000; // seconds
    prevTime = time;

    cube.rotation.x += ROTATION_SPEED_X * delta;
    cube.rotation.y += ROTATION_SPEED_Y * delta;

    renderer.render(scene, camera);

    if (!ready) {
        (window as any).__ready = true;
        ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, let me check strict mode concerns:
- `time` in setAnimationLoop is a number (DOMHighResTimeStamp). Actually looking at the Three.js types, `setAnimationLoop` callback signature is `(time: number) => void` in newer versions. Let me make sure I handle it correctly.

Actually, looking at Three.js type definitions, `setAnimationLoop` expects `XRFrameRequestCallback` which is `(time: number, frame: XRFrame | null) => void`. But it also accepts simpler callbacks. Let me just use `(time: number) => void` which should work.

Actually in stricter versions, the callback might be typed as `((time: number, frame: XRFrame) => void) | null`. Let me just use a function that takes time as number.

Let me also make sure `prevTime` starts at 0 and the first frame handles correctly. I'll initialize prevTime to 0 and on first frame, delta will be time/1000 which could be large. Better to set prevTime to time on first frame.

Actually my code handles that: if prevTime === 0, set prevTime = time, so delta = 0 on first frame. Good.

Let me also make sure the body has no default margin. I'll add `document.body.style.margin = '0'` and maybe `overflow: 'hidden'`.

Let me finalize.
