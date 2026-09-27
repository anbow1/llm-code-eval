The user wants a single TypeScript file that:
1. Creates a Three.js scene with a cube (BoxGeometry + MeshStandardMaterial) at origin
2. Cube rotates continuously around X and Y axes
3. Lit with one AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is clearly visible
5. Background color different from cube color
6. Rotation speed is frame-rate independent (uses delta time)
7. Hard rules: import THREE from 'three', addons from 'three/addons/...', create WebGLRenderer, append canvas to document.body, size from window.innerWidth/innerHeight, handle resize, use setAnimationLoop, expose __scene, __camera, __renderer, set __ready after first frame, no external assets.

Let me write this carefully:

- Scene with a background color (e.g., dark blue or gray)
- Cube with a different color (e.g., red or orange)
- Camera at (3, 3, 3) looking at origin
- AmbientLight + DirectionalLight
- Animation loop using clock.getDelta() for rotation
- Resize handler
- setAnimationLoop
- First frame flag to set __ready

Let me make sure it compiles with tsc --strict. I need to be careful with types.

```typescript
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

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xe94560, roughness: 0.3, metalness: 0.1 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

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

  cube.rotation.x += delta * 0.8;
  cube.rotation.y += delta * 1.2;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```

This looks good. Let me verify strict mode compliance:
- All variables are typed implicitly (const lets Three.js types propagate)
- No implicit any
- No unused variables
- The `(window as any)` casts are fine
- `firstFrame` is a boolean
- `clock` is THREE.Clock
- `delta` is number from getDelta()

This should compile cleanly. Let me finalize.
