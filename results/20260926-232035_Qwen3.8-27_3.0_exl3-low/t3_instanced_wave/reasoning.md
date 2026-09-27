The user wants a complete TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh
2. Animates a radial wave using sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for gradient colors
4. Reuses one Object3D or Matrix4 (no allocations in render loop)
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid and wave
7. Follows all the hard rules (imports, renderer setup, resize, setAnimationLoop, expose scene/camera/renderer, __ready flag)

Let me plan:
- 100x100 = 10,000 instances
- Small cubes (BoxGeometry with small size)
- Grid spacing should be appropriate so the whole grid fits in view
- For the wave: distance from center of grid, then sin(dist * k - time * speed) * amplitude
- Colors: gradient by grid position (e.g., based on x and y position)
- Reuse a single Matrix4 (or Object3D) for matrix composition
- No allocations in the render loop

Let me think about the grid layout:
- Grid from -50 to +50 (or 0 to 99, centered)
- Spacing: let's say 1 unit apart, so grid spans from -49.5 to +49.5 (or similar)
- Actually, let's center it: positions from -49.5 to +49.5 with step 1, or from -50 to +50 with step 1 (100 values)
- Let's use: for i in 0..99, x = (i - 49.5) * spacing, y = (j - 49.5) * spacing
- Cube size: maybe 0.7 with spacing 1.0

Camera: positioned at an angle, looking at the center. Something like (60, 60, 60) looking at (0, 0, 0).

For the matrix updates:
- Create a reusable Matrix4
- Each frame, for each instance, compute the Y offset, set the matrix translation, and call setMatrixAt
- After all instances, set instanceMatrix.needsUpdate = true

For colors:
- Set once at initialization using setColorAt
- Gradient based on grid position (e.g., HSL based on normalized x and y)

Let me write this out:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(70, 70, 70);
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
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// InstancedMesh
const GRID_SIZE = 100;
const CUBE_SIZE = 0.7;
const SPACING = 1.0;
const TOTAL = GRID_SIZE * GRID_SIZE;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });
const mesh = new THREE.InstancedMesh(geometry, material, TOTAL);

// Reusable objects (no allocation in loop)
const matrix = new THREE.Matrix4();
const color = new THREE.Color();

// Initialize positions and colors
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const index = i * GRID_SIZE + j;
    const x = (i - (GRID_SIZE - 1) / 2) * SPACING;
    const z = (j - (GRID_SIZE - 1) / 2) * SPACING;
    
    matrix.makeTranslation(x, 0, z);
    mesh.setMatrixAt(index, matrix);
    
    // Gradient color based on position
    const hue = (i / GRID_SIZE + j / GRID_SIZE) / 2;
    color.setHSL(hue, 0.8, 0.5);
    mesh.setColorAt(index, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

// Animation
const clock = new THREE.Clock();
const WAVE_K = 0.3;
const WAVE_SPEED = 3.0;
const WAVE_AMPLITUDE = 3.0;

let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  
  const half = (GRID_SIZE - 1) / 2;
  
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const index = i * GRID_SIZE + j;
      const x = (i - half) * SPACING;
      const z = (j - half) * SPACING;
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
      
      matrix.makeTranslation(x, y, z);
      mesh.setMatrixAt(index, matrix);
    }
  }
  
  mesh.instanceMatrix.needsUpdate = true;
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize
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

Wait, I need to double-check: `matrix.makeTranslation(x, y, z)` - does this allocate? No, it just sets the elements of the existing matrix. Good.

Also, I should make sure the `instanceColor` is properly initialized. When you call `setColorAt` for the first time, Three.js creates the `instanceColor` buffer. So after the initialization loop, I should flag it for update.

Let me also consider: the `mesh.instanceColor` might be null initially. After calling `setColorAt`, it should be created. Let me add a null check or just trust that it's created after the first `setColorAt` call.

Actually, looking at Three.js source, `setColorAt` creates the `instanceColor` InstancedBufferAttribute if it doesn't exist. So after the loop, `mesh.instanceColor` should be defined. I'll use a non-null assertion or check.

Let me refine the code to be cleaner and ensure strict mode compliance.
