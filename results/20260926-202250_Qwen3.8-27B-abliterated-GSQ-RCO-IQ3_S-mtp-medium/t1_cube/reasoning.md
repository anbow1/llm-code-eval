The user wants a single TypeScript file that creates a Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at origin
2. Rotates around X and Y axes continuously
3. Lit with AmbientLight + DirectionalLight
4. PerspectiveCamera positioned so cube is visible
5. Background color different from cube color
6. Frame-rate independent rotation (delta time)
7. Must compile with tsc --strict
8. Import Three.js as `import * as THREE from 'three'`
9. Create renderer, append to document.body
10. Handle window resize
11. Use renderer.setAnimationLoop
12. Expose __scene, __camera, __renderer, __ready
13. No external assets
14. Reply with single ts code block

Let me write this carefully for strict mode. I need to be careful about types.

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x4ecdc4 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  cube.rotation.x += delta * 0.8;
  cube.rotation.y += delta * 0.6;
  
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

This looks good. Let me make sure it's strict-safe. The `ready` variable is a `boolean` - fine. The clock is properly typed. All good.

Let me double-check: no external assets, single code block, proper imports, all requirements met.
