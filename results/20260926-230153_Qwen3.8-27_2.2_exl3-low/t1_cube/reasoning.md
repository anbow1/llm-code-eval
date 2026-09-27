The user wants a single TypeScript file that creates a Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Must compile with tsc --strict
8. Must expose __scene, __camera, __renderer, __ready
9. No external assets
10. Handle window resize
11. Use setAnimationLoop

Let me write this carefully with strict TypeScript compliance.

Key considerations:
- `import * as THREE from 'three'`
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth/innerHeight
- Handle resize
- setAnimationLoop with delta time
- Expose objects on window
- Set __ready after first frame
- No external assets

Let me write this out:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b2b2b);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x44aaff });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 0, 0);
scene.add(cube);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(2, 3, 1);
scene.add(directionalLight);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop((time: number) => {
    const delta = clock.getDelta();
    cube.rotation.x += delta * 0.8;
    cube.rotation.y += delta * 1.2;
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

This should work. Let me make sure it's strict-compliant. The `clock.getDelta()` returns a number, so that's fine. The `setAnimationLoop` callback receives a number (DOMHighResTimeStamp), which I don't actually use since I'm using Clock. That's fine.

Actually, let me double-check: `renderer.setAnimationLoop((time: number) => { ... })` - the callback signature is `(time: number) => void`. That's correct.

Let me finalize.
