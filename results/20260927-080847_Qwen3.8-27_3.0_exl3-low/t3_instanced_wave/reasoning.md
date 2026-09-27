The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using one InstancedMesh (10,000 instances)
2. Animates a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses one Object3D or Matrix4 for updates (no allocations in render loop)
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid and wave
7. Follows all the hard rules from the system prompt

Let me plan:
- 100x100 grid = 10,000 instances
- Small cubes: BoxGeometry with small size
- Position each cube in a grid layout
- Store base positions (x, z) for each instance
- In the render loop, compute Y = sin(dist * k - time * speed) * amplitude
- Use a single Matrix4 (or Object3D) to compose matrices
- Set colors based on grid position (e.g., a gradient from blue to red based on x+z position)
- Camera positioned at an angle looking down at the grid

Let me write this carefully:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera - angled view
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(50, 60, 50);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(30, 50, 30);
scene.add(directionalLight);

// Grid setup
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const TOTAL = GRID_SIZE * GRID_SIZE;

// Geometry and material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });

// InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, TOTAL);
scene.add(mesh);

// Pre-compute base positions and distances
const basePositions: Float32Array = new Float32Array(TOTAL * 2); // x, z
const distances: Float32Array = new Float32Array(TOTAL);

const halfGrid = (GRID_SIZE - 1) * SPACING * 0.5;

let idx = 0;
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const x = i * SPACING - halfGrid;
    const z = j * SPACING - halfGrid;
    basePositions[idx * 2] = x;
    basePositions[idx * 2 + 1] = z;
    distances[idx] = Math.sqrt(x * x + z * z);
    
    // Color gradient
    const t = (i + j) / (2 * (GRID_SIZE - 1));
    const color = new THREE.Color().setHSL(t * 0.6, 0.8, 0.5);
    mesh.setColorAt(idx, color);
    
    idx++;
  }
}

// Reusable objects (no allocation in loop)
const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();

// Wave parameters
const WAVE_K = 0.3;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 2.0;

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  
  for (let i = 0; i < TOTAL; i++) {
    const x = basePositions[i * 2];
    const z = basePositions[i * 2 + 1];
    const y = Math.sin(distances[i] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    
    tempMatrix.makeTranslation(x, y, z);
    mesh.setMatrixAt(i, tempMatrix);
  }
  
  mesh.instanceMatrix.needsUpdate = true;
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

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

Wait, I need to check: `setColorAt` requires that `instanceColor` exists. The first call to `setColorAt` should create it. Let me verify - yes, in Three.js, calling `setColorAt` for the first time creates the `instanceColor` buffer.

Also, I should make sure the color buffer is marked as needing update after setting all colors. Actually, since we set them before the first render, it should be fine. But let me add `mesh.instanceColor.needsUpdate = true` after the setup loop just to be safe.

Let me also think about whether `makeTranslation` is the right approach. Yes, since we only need translation (position), no rotation or scale needed. `makeTranslation(x, y, z)` creates a translation matrix without allocating.

Let me also consider: the `setColorAt` call in the setup loop creates a new Color each time. That's fine since it's in setup, not in the render loop. But I should make sure I'm not doing allocations in the render loop. The render loop only uses `tempMatrix` which is pre-allocated. Good.

Let me finalize the code.
