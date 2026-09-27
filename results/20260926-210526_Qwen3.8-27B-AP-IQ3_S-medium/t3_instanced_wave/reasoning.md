The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using InstancedMesh (10,000 instances)
2. Animates a radial wave where Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setMatrixAt for each instance every frame
4. Sets instanceMatrix.needsUpdate = true
5. Uses setColorAt for per-instance colors (gradient by grid position)
6. Reuses one Object3D or Matrix4 for updates - no allocations in render loop
7. MeshStandardMaterial, AmbientLight + DirectionalLight
8. Camera at an angle so the whole grid is visible
9. Follows all the hard rules from the system prompt

Let me write this carefully:

- Import THREE from 'three'
- Create renderer, append canvas to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use renderer.setAnimationLoop
- Motion uses delta/elapsed time
- Expose __scene, __camera, __renderer
- Set __ready = true after first frame
- No external assets

For the wave:
- 100x100 grid = 10,000 instances
- distanceFromCenter = sqrt((x - 50)^2 + (z - 50)^2) or similar
- Y = sin(distance * k - time * speed) * amplitude
- Use a reusable Matrix4 or Object3D (dummy)

For colors:
- Gradient by grid position - maybe based on x/z position
- Use setColorAt

Let me think about the grid layout:
- 100 columns x 100 rows
- Spacing between cubes: let's say 1.0 units apart
- Total grid size: ~99 units (centered at origin, so -49.5 to 49.5)
- Cube size: maybe 0.8 units so there's small gap

Camera position: elevated and at an angle, looking at the center. Maybe (80, 80, 80) looking at (0, 0, 0) or similar.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 80, 80);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Grid
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });

const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Reusable matrix and dummy
const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Set initial positions and colors
const halfGrid = (GRID - 1) / 2;
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = i * GRID + j;
    const x = (i - halfGrid) * SPACING;
    const z = (j - halfGrid) * SPACING;
    
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(idx, dummy.matrix);
    
    // Color gradient by position
    const r = i / (GRID - 1);
    const g = j / (GRID - 1);
    color.setRGB(r, 0.2, 1.0 - r); // some gradient
    instancedMesh.setColorAt(idx, color);
  }
}

instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
scene.add(instancedMesh);

// Wave parameters
const WAVE_K = 0.3;
const WAVE_SPEED = 3.0;
const WAVE_AMPLITUDE = 3.0;

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const idx = i * GRID + j;
      const x = (i - halfGrid) * SPACING;
      const z = (j - halfGrid) * SPACING;
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
      
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);
    }
  }
  
  instancedMesh.instanceMatrix.needsUpdate = true;
  
  renderer.render(scene, camera);
  
  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});

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

Wait, I need to be careful about "no allocations inside the render loop". The `dummy.updateMatrix()` is fine since it reuses the same object. But I should make sure I'm not creating new vectors or matrices inside the loop.

Actually, looking more carefully - `dummy.updateMatrix()` internally composes from position/quaternion/scale into `dummy.matrix`, which is a pre-allocated Matrix4. So that's fine. No new allocations.

Let me also think about whether I should use `delta` or `elapsed`. The system prompt says "Motion must use delta/elapsed time, not frame counts." Using `clock.getElapsedTime()` is elapsed time, so that's fine.

Let me refine the color gradient to be more visually appealing - maybe a multi-stop gradient based on both x and z positions.

Let me also make sure the camera is positioned well. With a 99x99 grid (spacing 1, 100 cubes centered), the grid spans from about -49.5 to 49.5. Camera at (80, 80, 80) looking at origin should work well with a 60° FOV.

Let me finalize and make sure everything is clean and compiles under strict mode.
