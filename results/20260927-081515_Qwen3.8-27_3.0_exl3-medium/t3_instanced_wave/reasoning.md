The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh (10,000 instances)
2. Animates a radial wave using sin(distanceFromCenter * k - time * speed) * amplitude
3. Each instance has its own color via setColorAt (gradient by grid position)
4. Reuses one Object3D or Matrix4 for updates (no allocations in render loop)
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle so the whole grid and wave are visible
7. Handles resize
8. Uses setAnimationLoop
9. Exposes __scene, __camera, __renderer, __ready
10. No external assets

Let me plan the implementation:

- Grid: 100x100 = 10,000 instances
- Each cube is small, spaced evenly
- Grid size: let's say spacing of 1 unit, so grid spans from -50 to +50 in X and Z
- Cube size: small, like 0.8 units
- Wave: sin(distance * k - time * speed) * amplitude
  - distance from center (0,0) in XZ plane
  - k: frequency, maybe 0.3
  - speed: how fast the wave moves, maybe 2
  - amplitude: how high the wave goes, maybe 3

For the InstancedMesh:
- Geometry: BoxGeometry(0.8, 0.8, 0.8)
- Material: MeshStandardMaterial
- Count: 10000

For colors: gradient by grid position - I'll use a combination of X and Z normalized to 0-1 for hue, or just a simple gradient from one color to another.

For the animation loop:
- Pre-compute distances from center for each instance (store in a Float32Array)
- Pre-compute X and Z positions (store in arrays)
- Use a single Matrix4 (or Object3D) to compose each instance's matrix
- setMatrixAt(i, matrix)
- Flag instanceMatrix.needsUpdate = true

Let me write this:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera - angled view
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 60, 80);
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

// Grid parameters
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 3.0;
const WAVE_K = 0.3;
const WAVE_SPEED = 2.0;

const COUNT = GRID_SIZE * GRID_SIZE;

// Pre-compute positions and distances
const positionsX = new Float32Array(COUNT);
const positionsZ = new Float32Array(COUNT);
const distances = new Float32Array(COUNT);

let idx = 0;
for (let iz = 0; iz < GRID_SIZE; iz++) {
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    const x = (ix - (GRID_SIZE - 1) / 2) * SPACING;
    const z = (iz - (GRID_SIZE - 1) / 2) * SPACING;
    positionsX[idx] = x;
    positionsZ[idx] = z;
    distances[idx] = Math.sqrt(x * x + z * z);
    idx++;
  }
}

// Create InstancedMesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Set colors
const color = new THREE.Color();
for (let i = 0; i < COUNT; i++) {
  const ix = i % GRID_SIZE;
  const iz = Math.floor(i / GRID_SIZE);
  const hue = (ix / GRID_SIZE) * 0.6 + (iz / GRID_SIZE) * 0.4;
  color.setHSL(hue, 0.8, 0.5);
  instancedMesh.setColorAt(i, color);
}
instancedMesh.instanceColor!.needsUpdate = true;

scene.add(instancedMesh);

// Reusable matrix
const dummy = new THREE.Object3D();

// Animation
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  
  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(distances[i] * WAVE_K - elapsed * WAVE_SPEED) * AMPLITUDE;
    dummy.position.set(positionsX[i], y, positionsZ[i]);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  
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

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- `instancedMesh.instanceColor!` - the `!` should handle the possibly-null case
- All variables are properly typed
- No implicit any

Let me also make sure the camera is positioned well to see the whole grid. The grid spans from -49.5 to +49.5 in X and Z (100 * 1.0 spacing, centered). So the grid is about 99 units wide. Camera at (0, 60, 80) looking at origin should give a good angled view.

Actually let me reconsider the camera. With a 50 degree FOV and the grid being ~99 units wide, at position (0, 60, 80) the distance to center is sqrt(60^2 + 80^2) = sqrt(3600+6400) = sqrt(10000) = 100. The horizontal FOV at 50 degrees vertical... the grid should be visible. Let me adjust to maybe (0, 70, 90) to be safe, or keep (0, 60, 80).

Actually, let me think about this more carefully. The grid is 99 units wide (from -49.5 to 49.5). The camera is at (0, 60, 80) looking at origin. The distance from camera to the far edge of the grid would be about sqrt(49.5^2 + 60^2 + 80^2) ≈ sqrt(2450 + 3600 + 6400) ≈ sqrt(12450) ≈ 111. With a 50 degree FOV, the visible width at distance 100 is 2 * 100 * tan(25°) ≈ 2 * 100 * 0.466 ≈ 93. That's a bit tight for a 99-unit grid. Let me increase the FOV to 60 or move the camera further back.

Let me use FOV 60 and camera at (0, 70, 90). Distance to center: sqrt(70^2 + 90^2) = sqrt(4900+8100) = sqrt(13000) ≈ 114. Visible width: 2 * 114 * tan(30°) ≈ 2 * 114 * 0.577 ≈ 131. That should be enough.

Or I could just use FOV 55 and camera at (0, 65, 85). Let me go with something that looks good.

Let me finalize the code.
