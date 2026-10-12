The user wants a simple Three.js scene with:
- A cube (BoxGeometry + MeshStandardMaterial) at origin, rotating on X and Y axes
- AmbientLight + DirectionalLight
- PerspectiveCamera positioned to see the cube
- Background color different from cube color
- Frame-rate independent rotation using delta time
- Must be a single TypeScript file that compiles with tsc --strict
- Import from 'three' and 'three/addons/...'
- Create WebGLRenderer, append to document.body
- Handle resize
- Use setAnimationLoop
- Expose __scene, __camera, __renderer on window
- Set __ready = true after first frame
- No external assets

Let me write this carefully.

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // dark navy background

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 2, 5);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Cube
const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Clock for delta time
const clock = new THREE.Clock();
let firstFrame = true;

// Animation loop
function animate() {
  const delta = clock.getDelta();
  
  // Frame-rate independent rotation
  cube.rotation.x += 1.0 * delta;
  cube.rotation.y += 1.5 * delta;
  
  renderer.render(scene, camera);
  
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

This looks good. Let me check:
- BoxGeometry + MeshStandardMaterial ✓
- Rotates on X and Y axes ✓
- AmbientLight + DirectionalLight ✓
- PerspectiveCamera visible ✓
- Background different from cube color ✓
- Delta time for rotation ✓
- tsc --strict compatible ✓
- setAnimationLoop ✓
- Resize handler ✓
- __scene, __camera, __renderer exposed ✓
- __ready after first frame ✓
- No external assets ✓
