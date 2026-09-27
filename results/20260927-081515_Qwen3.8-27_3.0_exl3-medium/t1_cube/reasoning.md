The user wants a complete TypeScript file that:
1. Creates a Three.js scene with a single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Cube rotates continuously around X and Y axes
3. Lit with one AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Rotation speed is frame-rate independent (uses delta time)
7. Follows all the hard rules about imports, renderer setup, resize handling, animation loop, exposing globals, and __ready flag

Let me write this carefully:

- Import THREE from 'three'
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth / window.innerHeight
- Handle window resize
- Use renderer.setAnimationLoop
- Motion uses delta/elapsed time
- Expose __scene, __camera, __renderer
- After first frame, set __ready = true
- No external assets

Let me write the code:

```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // dark blue background

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);

// Renderer
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
const material = new THREE.MeshStandardMaterial({ color: 0xe94560, roughness: 0.4, metalness: 0.3 });
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, 0);
scene.add(cube);

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

  // Rotate around X and Y axes - frame-rate independent
  cube.rotation.x += 0.5 * delta;
  cube.rotation.y += 0.8 * delta;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure the __ready is set after the first frame is rendered. The setAnimationLoop callback runs, renders, and then I check if it's the first frame. That should work.

Let me also make sure the background color is clearly different from the cube color. Background: dark blue (0x1a1a2e), Cube: red-ish (0xe94560). Good contrast.

Let me also make sure the code compiles with tsc --strict. I need to be careful about types. The `clock.getDelta()` returns a number. The rotations are numbers. Everything looks fine.

One thing - I should make sure I'm not using any undefined variables. Let me double-check everything is properly typed.

The code looks good. Let me finalize it.
