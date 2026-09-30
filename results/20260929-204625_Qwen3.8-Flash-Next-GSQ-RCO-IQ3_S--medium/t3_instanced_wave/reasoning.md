The user wants a single TypeScript file that renders a 100x100 grid of cubes using InstancedMesh with a radial wave animation. Let me plan this carefully:

1. Import Three.js
2. Create scene, camera, renderer
3. Create 100x100 grid = 10,000 instances using InstancedMesh
4. Animate radial wave using setMatrixAt with a reused Matrix4/Object3D
5. Color each instance with setColorAt based on grid position
6. Use MeshStandardMaterial, AmbientLight, DirectionalLight
7. Handle resize
8. Use setAnimationLoop with delta time
9. Expose __scene, __camera, __renderer, __ready
10. No allocations in the render loop

Key considerations:
- Reuse one Object3D (dummy) for matrix calculations
- Reuse one Matrix4 for updates
- Distance from center is precomputed per instance
- Color is set once (or can be animated too, but the prompt says "e.g. a gradient by grid position")
- Wave formula: sin(distance * k - time * speed) * amplitude
- Small cubes: BoxGeometry with small size
- Camera at an angle

Let me write this carefully to ensure it compiles with tsc --strict.

For the instanced color attribute, I need to use setColorAt which adds an instanceColor attribute. The material needs to have vertexColors... actually no, InstancedMesh.setColorAt works with MeshStandardMaterial automatically - it uses the instance color. Actually, I need to check: in Three.js, setColorAt creates an InstancedBufferAttribute on the geometry. The material should work with it automatically without needing vertexColors = true. Let me recall... Actually in recent Three.js versions, setColorAt just sets the instanceColor attribute and the shader handles it. The material doesn't need vertexColors for instance colors.

Wait, actually I think for instance colors to work, the material doesn't need vertexColors. The instanceColor is handled separately in the shader. Let me just set it and it should work.

For strict TypeScript:
- Need to be careful with types
- window as any for the exposed globals
- Proper null checks

Let me structure the code:

```ts
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// Position camera at angle
camera.position.set(150, 120, 150);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(50, 100, 50);
scene.add(dir);

// Instanced mesh
const gridSize = 100;
const count = gridSize * gridSize;
const geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

// Precompute distances and colors
const half = gridSize / 2;
const dummy = new THREE.Object3D();
const color = new THREE.Color();

const distances: number[] = new Array(count);

let idx = 0;
for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const x = (i - half) * 2;
    const z = (j - half) * 2;
    const dist = Math.sqrt(x * x + z * z);
    distances[idx] = dist;
    
    // Set initial position
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    
    // Color gradient by position
    color.setHSL((i / gridSize) * 0.7 + 0.1, 0.8, 0.5);
    mesh.setColorAt(idx, color);
    
    idx++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Animation parameters
const k = 0.15;
const speed = 2.0;
const amplitude = 4.0;

let firstFrame = true;

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const time = clock.getElapsedTime();
  
  idx = 0;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = (i - half) * 2;
      const z = (j - half) * 2;
      const y = Math.sin(distances[idx] * k - time * speed) * amplitude;
      
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      
      idx++;
    }
  }
  
  mesh.instanceMatrix.needsUpdate = true;
  
  renderer.render(scene, camera);
  
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
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

This looks good. Let me check for strict TypeScript issues:
- `clock.getElapsedTime()` returns number - fine
- `mesh.instanceColor` could be null, so I need the null check - I have that with `if (mesh.instanceColor)`
- Array indexing with `number[]` - should be fine
- The `for` loop variables are typed correctly

Actually, let me reconsider the grid spacing. With 100x100 and spacing of 2, the grid spans from -100 to 98 in each axis. Camera at (150, 120, 150) should see it all. Let me adjust to make sure the whole grid is visible. With 100 elements spaced 2 apart, the total span is 198 units. Camera at 150,120,150 with FOV 60... that should work but let me use a slightly larger distance or adjust.

Actually let me recalculate: camera at (200, 150, 200), looking at origin. Distance from camera to origin is sqrt(200² + 150² + 200²) ≈ 312. With FOV 60, the visible width at distance 312 is 2 * 312 * tan(30°) ≈ 360. The grid is 200x200 units. So it fits.

Let me also make sure the cube size is appropriate. With spacing 2, cubes of size 1 will have gaps between them. That's fine, they look like individual cubes in a grid.

One more thing - I should make sure no allocations happen in the render loop. The dummy.position.set() doesn't allocate. dummy.updateMatrix() doesn't allocate (it writes to dummy.matrix in place). mesh.setMatrixAt() copies the matrix values. Good.

Let me finalize the code.
