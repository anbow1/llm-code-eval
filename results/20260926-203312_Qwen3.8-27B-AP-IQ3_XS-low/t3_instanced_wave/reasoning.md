Let me break down the requirements:

1. 100x100 grid (10,000 cubes) using ONE InstancedMesh
2. Radial wave animation: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Use setMatrixAt for each instance, flag instanceMatrix.needsUpdate
4. setColorAt for gradient by grid position
5. Reuse one Matrix4/Object3D - no allocations in render loop
6. MeshStandardMaterial, AmbientLight + DirectionalLight
7. Camera at an angle to see the whole grid
8. Handle resize, use setAnimationLoop, expose scene/camera/renderer/ready
9. Single TypeScript file, import from 'three', no external assets

Let me think about the implementation:

- Grid: 100x100, so 10,000 instances
- Spacing: let's use 1 unit between cubes, so grid goes from -50 to 50 (or 0 to 100 centered)
- Actually, let me center it: positions from -49.5 to 49.5 with spacing 1 (or -50 to 50)
- Let me use spacing of 1, so positions are (i - 50, j - 50) for i, j in 0..99
- Cube size: 0.8 (slightly smaller than spacing so they don't overlap)
- Wave: sin(distance * k - time * speed) * amplitude
  - k could be 0.5, speed could be 2, amplitude could be 1
- Colors: gradient by grid position - maybe based on x and y position, using a color ramp
- Reuse: one Matrix4 and one Object3D (or just compose the matrix manually)

For the render loop:
- Pre-compute: positions (x, z), distances from center, colors
- In loop: for each instance, compute y = sin(dist * k - elapsed * speed) * amplitude, set matrix, setMatrixAt
- Flag instanceMatrix.needsUpdate = true

Let me write this carefully for strict TypeScript compliance.

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 80, 80);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Grid setup
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const COUNT = GRID_SIZE * GRID_SIZE;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Pre-compute positions and distances
const positions: number[] = new Array(COUNT * 2); // x, z pairs
const distances: number[] = new Array(COUNT);

let idx = 0;
const half = GRID_SIZE / 2;
for (let j = 0; j < GRID_SIZE; j++) {
  for (let i = 0; i < GRID_SIZE; i++) {
    const x = (i - half + 0.5) * SPACING;
    const z = (j - half + 0.5) * SPACING;
    positions[idx * 2] = x;
    positions[idx * 2 + 1] = z;
    distances[idx] = Math.sqrt(x * x + z * z);
    idx++;
  }
}

// Set colors (gradient by grid position)
const color = new THREE.Color();
for (let j = 0; j < GRID_SIZE; j++) {
  for (let i = 0; i < GRID_SIZE; i++) {
    const idx2 = j * GRID_SIZE + i;
    const rx = i / (GRID_SIZE - 1);
    const rz = j / (GRID_SIZE - 1);
    // Gradient: hue based on position
    color.setHSL((rx + rz) * 0.5, 0.8, 0.5);
    mesh.setColorAt(idx2, color);
  }
}

// Wave parameters
const WAVE_K = 0.5;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 1.5;

// Reusable matrix
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);

// Initial matrices
for (let i = 0; i < COUNT; i++) {
  const x = positions[i * 2];
  const z = positions[i * 2 + 1];
  position.set(x, 0, z);
  matrix.compose(position, quaternion, scale);
  mesh.setMatrixAt(i, matrix);
}

scene.add(mesh);

// Animation
let elapsed = 0;
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  for (let i = 0; i < COUNT; i++) {
    const x = positions[i * 2];
    const z = positions[i * 2 + 1];
    const y = Math.sin(distances[i] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
    position.set(x, y, z);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
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

Wait, I need to make sure `instanceColor` is also updated if I'm using setColorAt. Actually, setColorAt is called once at setup, so I don't need to flag it every frame. But I should make sure the instanceColor buffer exists. Let me check - when you call setColorAt, it creates the instanceColor attribute. Since I'm not changing colors in the loop, I just need to make sure it's set once.

Actually, I should also set `mesh.instanceColor.needsUpdate = true` after setting all colors, or it might not be reflected. Let me add that.

Wait, actually if I set them before the first render, it should be fine. But to be safe, I'll flag it.

Let me also think about whether `mesh.instanceColor` needs a needsUpdate flag. Since it's set before the first render call, the buffer should be uploaded on first render. But to be explicit, I can add `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;` after the color loop.

Let me finalize the code.
