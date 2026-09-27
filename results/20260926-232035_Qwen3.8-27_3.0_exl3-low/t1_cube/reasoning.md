The user wants a complete TypeScript file that:
1. Creates a Three.js scene with a single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. The cube rotates continuously around X and Y axes
3. Lit with one AmbientLight and one DirectionalLight
4. PerspectiveCamera placed so the cube is clearly visible
5. Background color different from the cube color
6. Rotation speed must be frame-rate independent (use delta time)
7. Must compile with `tsc --strict`
8. Must expose __scene, __camera, __renderer, and __ready
9. Use renderer.setAnimationLoop
10. Handle window resize
11. No external assets

Let me write this carefully with strict TypeScript compliance.

Key considerations:
- `tsc --strict` means I need to be careful with types
- I need to use a clock for delta time
- The rotation should use `delta * speed` pattern
- I need to handle the first frame detection for `__ready`

Let me write the code:

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
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xe94560 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const clock = new THREE.Clock();
let ready = false;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
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

This looks good. Let me double-check for strict mode issues:
- All variables are typed implicitly through their constructors
- No `any` types except the `window as any` casts which are fine
- No unused variables
- No implicit any

This should compile cleanly with `tsc --strict`.
