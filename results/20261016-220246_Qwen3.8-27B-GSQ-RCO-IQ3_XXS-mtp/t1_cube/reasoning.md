The user wants a single TypeScript file that:
1. Creates a Three.js scene with a rotating cube
2. Uses BoxGeometry + MeshStandardMaterial
3. Cube at origin, rotates around X and Y axes
4. Lit with AmbientLight and DirectionalLight
5. PerspectiveCamera positioned so cube is visible
6. Background color different from cube color
7. Frame-rate independent rotation using delta time
8. Import Three.js properly
9. Create WebGLRenderer, append to document.body
10. Size from window.innerWidth/innerHeight, handle resize
11. Use renderer.setAnimationLoop
12. Expose __scene, __camera, __renderer
13. Set __ready = true after first frame
14. No external assets
15. Must compile with tsc --strict

Let me write this carefully:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // dark blue background

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, roughness: 0.4, metalness: 0.3 });
const cube = new THREE.Mesh(geometry, material);
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
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }

    cube.rotation.x += 1.5 * delta;
    cube.rotation.y += 1.0 * delta;

    renderer.render(scene, camera);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I should set __ready after the first frame is rendered. Let me think about this more carefully. The setAnimationLoop callback runs, then renders. So I should set __ready after the render call on the first frame. Let me restructure:

Actually, looking at it again, the first frame logic should be:
- On first call, render, then set __ready = true.

Let me restructure to set __ready after the first render completes.

Let me also make sure the code is strictly typed. The `(window as any)` casts are fine for the strict mode since we're explicitly casting.

Let me also make sure document.body exists - in a browser it should. But for strict mode, I might need to handle potential null. Actually, document.body is of type HTMLElement (not nullable in lib.dom), so it should be fine.

Wait, actually in TypeScript's lib.dom.d.ts, document.body is of type HTMLElement (not HTMLElement | null). So it's fine.

Let me finalize the code.
