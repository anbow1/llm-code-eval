The user wants a single TypeScript file that renders a 100x100 grid of small cubes using a single InstancedMesh with an animated radial wave. Let me plan this carefully:

1. Import Three.js
2. Create scene, camera, renderer
3. Create InstancedMesh with 10000 instances (100x100)
4. Set up MeshStandardMaterial, AmbientLight, DirectionalLight
5. Give each instance a color based on grid position using setColorAt
6. In the render loop, animate Y position using sin wave based on distance from center
7. Reuse Object3D/Matrix4 - no allocations in loop
8. Handle resize
9. Expose window.__scene, __camera, __renderer, __ready

Key considerations:
- No allocations in the render loop (reuse a dummy Object3D and Matrix4)
- setMatrixAt + instanceMatrix.needsUpdate = true each frame
- setColorAt for per-instance colors
- Camera at an angle to see the whole grid
- The wave: sin(distance * k - time * speed) * amplitude

Let me write this carefully to ensure it compiles with tsc --strict.

For strict mode, I need to be careful about:
- No unused variables
- Proper types
- Non-null assertions where needed

The grid is 100x100 = 10000 instances. Each cube is small (say 0.5 size). Spacing of 1 unit between them.

Center of the grid is at (49.5, 49.5) in grid coordinates, or I'll center it at (0,0) by offsetting.

Let me structure the code:

```ts
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 70, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(50, 100, 50);
scene.add(dirLight);

// Grid setup
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.4;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial();

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Pre-compute positions and colors
const dummy = new THREE.Object3D();
const half = (GRID - 1) / 2;

const color = new THREE.Color();

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = (j - half) * SPACING;
    const z = (i - half) * SPACING;
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    
    // Color gradient
    color.setHSL(j / GRID, 0.8, 0.5);
    mesh.setColorAt(idx, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;
scene.add(mesh);

// Animation
const clock = new THREE.Clock();

// Pre-compute distances to avoid sqrt in loop? Actually sqrt is fine, but let me pre-compute them
// to be extra safe about "no allocations" - actually the constraint is no allocations, sqrt is fine.

// Wave params
const k = 0.3;
const speed = 2.0;
const amplitude = 2.0;

function animate() {
  const time = clock.getElapsedTime();
  
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const idx = i * GRID + j;
      const x = (j - half) * SPACING;
      const z = (i - half) * SPACING;
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * k - time * speed) * amplitude;
      
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
  }
  
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Ready flag - set after first render
// I'll use a frame counter
let firstFrame = true;

// Actually, let me restructure to set __ready after first frame

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to set `__ready = true` after the first frame is rendered. Let me use a flag inside the animate function.

Also, I should pre-compute the x and z values to avoid recomputing them each frame. Actually, the constraint says "no allocations" - recomputing simple arithmetic is fine, no new objects are created. But to be cleaner, I could store the x,z and distance in arrays.

Let me also make sure the `dummy.position.set()` and `dummy.updateMatrix()` don't allocate - they don't, they just modify existing properties.

Actually, `mesh.setColorAt` internally might allocate if it hasn't been initialized. Let me call it before the loop. Actually, InstancedMesh creates the instanceColor buffer lazily. The first call to setColorAt initializes it. That's fine - it's before the render loop.

Let me also pre-compute distances to make the loop faster (10000 sqrt calls per frame is fine actually, but pre-computing is cleaner).

Let me finalize the code.
