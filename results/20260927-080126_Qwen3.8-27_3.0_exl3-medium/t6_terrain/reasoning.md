The user wants a complete TypeScript file that creates a procedural terrain using a hand-made BufferGeometry. Let me break down the requirements:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
2. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
3. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
4. Call computeVertexNormals()
5. Vertex colors by height (green low, brown middle, white high); MeshStandardMaterial with vertexColors: true
6. AmbientLight + DirectionalLight
7. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame, exposed as (window as any).__controls = controls
8. Camera above terrain at an angle, whole terrain visible
9. Standard requirements: Three.js import, renderer setup, resize handling, setAnimationLoop, expose scene/camera/renderer, __ready flag

Let me think about the geometry:
- 128x128 vertices means 127x127 cells
- XZ plane: 20x20 units centered at origin, so x ranges from -10 to 10, z ranges from -10 to 10
- Spacing: 20 / 127 for each step

For the height function, I'll use 3 sine/cosine layers:
- Layer 1: sin(x * freq1) * cos(z * freq1) * amp1
- Layer 2: sin(x * freq2 + offset) * cos(z * freq2 + offset) * amp2
- Layer 3: sin(x * freq3 + offset) * cos(z * freq3 + offset) * amp3
- Total amplitude about 2

For the index buffer with upward-facing normals:
- For a grid, if we index rows going from row 0 (z = -10) to row 127 (z = 10), and columns from col 0 (x = -10) to col 127 (x = 10)
- Vertex index = row * 128 + col
- For cell (row, col), the four vertices are:
  - TL = row * 128 + col
  - TR = row * 128 + col + 1
  - BL = (row+1) * 128 + col
  - BR = (row+1) * 128 + col + 1

For faces pointing UP (+Y), using right-hand rule, we need counter-clockwise winding when viewed from above.

Looking from above (looking down -Y):
- TL is at (x, z) where x is left, z is "top" (negative z in world)
- TR is at (x+1, z)
- BL is at (x, z+1)
- BR is at (x+1, z+1)

Wait, let me think about this more carefully. In Three.js, the normal direction is determined by the cross product of (v1-v0) × (v2-v0) for the triangle v0, v1, v2.

For a face pointing UP (+Y), I need the cross product to point in +Y direction.

Let's say row increases in +Z direction, col increases in +X direction.
- TL = (x, 0, z) → (col, 0, row)
- TR = (x+dx, 0, z) → (col+1, 0, row)
- BL = (x, 0, z+dz) → (col, 0, row+1)
- BR = (x+dx, 0, z+dz) → (col+1, 0, row+1)

Triangle 1: TL, TR, BR
- v0 = TL, v1 = TR, v2 = BR
- edge1 = TR - TL = (dx, 0, 0)
- edge2 = BR - TL = (dx, 0, dz)
- cross = edge1 × edge2 = (0*dz - 0*0, 0*dx - dx*dz, dx*0 - 0*dx) = (0, -dx*dz, 0)

That points DOWN. So I need to reverse.

Triangle 1: TL, BR, TR
- v0 = TL, v1 = BR, v2 = TR
- edge1 = BR - TL = (dx, 0, dz)
- edge2 = TR - TL = (dx, 0, 0)
- cross = edge1 × edge2 = (0*0 - dz*0, dz*dx - dx*0, dx*0 - 0*dx) = (0, dx*dz, 0)

That points UP! Good.

Triangle 2: TL, BL, BR
- v0 = TL, v1 = BL, v2 = BR
- edge1 = BL - TL = (0, 0, dz)
- edge2 = BR - TL = (dx, 0, dz)
- cross = edge1 × edge2 = (0*dz - dz*0, dz*dx - 0*dz, 0*0 - 0*dx) = (0, dx*dz, 0)

That points UP! Good.

So the indices for cell (row, col):
- TL = row * 128 + col
- TR = row * 128 + col + 1
- BL = (row+1) * 128 + col
- BR = (row+1) * 128 + col + 1

Triangle 1: TL, BR, TR
Triangle 2: TL, BL, BR

Let me verify with Three.js convention. In Three.js, front face is counter-clockwise by default. Let me re-check.

Actually, let me re-verify. Three.js uses right-hand rule for front faces. The normal is computed as (v1 - v0) × (v2 - v0). For the normal to point in +Y:

Triangle 1: TL(0,0,0), BR(1,0,1), TR(1,0,0)
- v1 - v0 = (1,0,1)
- v2 - v0 = (1,0,0)
- cross = (0*0 - 1*0, 1*1 - 1*0, 1*0 - 0*1) = (0, 1, 0) ✓

Triangle 2: TL(0,0,0), BL(0,0,1), BR(1,0,1)
- v1 - v0 = (0,0,1)
- v2 - v0 = (1,0,1)
- cross = (0*1 - 1*0, 1*1 - 0*1, 0*0 - 0*1) = (0, 1, 0) ✓

Great, both point up.

Now for colors:
- Low height (near -2): green
- Middle height (near 0): brown
- High height (near +2): white

I'll use a simple interpolation. Let me normalize height to [0, 1] range and interpolate between colors.

Height range is approximately [-2, 2], so normalize: (h + 2) / 4 gives [0, 1].

- 0.0 → green (0, 0.5, 0)
- 0.5 → brown (0.5, 0.3, 0.1)
- 1.0 → white (1, 1, 1)

I'll do piecewise linear interpolation.

Camera position: terrain is 20x20, so camera should be at maybe (15, 15, 15) looking at origin, or something that shows the whole terrain.

Let me write the code now.

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 15, 15);
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
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Terrain geometry
const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

// Positions
const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

function getHeight(x: number, z: number): number {
  const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.8;
  const h2 = Math.sin(x * 1.2 + 1.0) * Math.cos(z * 1.2 + 0.5) * 0.6;
  const h3 = Math.sin(x * 2.5 + 2.0) * Math.cos(z * 2.5 + 1.5) * 0.4;
  return h1 + h2 + h3;
}

for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    const x = -HALF + col * STEP;
    const z = -HALF + row * STEP;
    const y = getHeight(x, z);
    
    const idx = row * GRID + col;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    
    // Color by height
    const t = (y + 2) / 4; // normalize to [0, 1]
    let r: number, g: number, b: number;
    if (t < 0.5) {
      const f = t / 0.5;
      r = 0.0 + f * (0.5 - 0.0);
      g = 0.5 + f * (0.3 - 0.5);
      b = 0.0 + f * (0.1 - 0.0);
    } else {
      const f = (t - 0.5) / 0.5;
      r = 0.5 + f * (1.0 - 0.5);
      g = 0.3 + f * (1.0 - 0.3);
      b = 0.1 + f * (1.0 - 0.1);
    }
    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }
}

// Index buffer
const numCells = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(numCells * 6);
let idx = 0;
for (let row = 0; row < GRID - 1; row++) {
  for (let col = 0; col < GRID - 1; col++) {
    const tl = row * GRID + col;
    const tr = row * GRID + col + 1;
    const bl = (row + 1) * GRID + col;
    const br = (row + 1) * GRID + col + 1;
    
    // Triangle 1: TL, BR, TR
    indices[idx++] = tl;
    indices[idx++] = br;
    indices[idx++] = tr;
    
    // Triangle 2: TL, BL, BR
    indices[idx++] = tl;
    indices[idx++] = bl;
    indices[idx++] = br;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.1,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to make sure the `delta` variable is actually used or at least the timing is based on elapsed time. The requirement says "Motion must use delta/elapsed time, not frame counts." Since OrbitControls with damping uses its own internal timing, and I'm not doing any explicit animation that needs delta, I think this is fine. But let me make sure I'm not violating the spirit of the rule. The controls.update() handles its own timing internally. I think this is acceptable since there's no per-frame animation that needs delta.

Actually, let me re-read: "Motion must use delta/elapsed time, not frame counts." This seems to be a general rule about how to handle motion. Since the only "motion" here is the OrbitControls damping (which handles its own timing), I think we're fine. But to be safe, I'll keep the clock and delta variable even if not explicitly used for anything other than being available.

Let me also double-check the Uint32Array for indices. With 128*128 = 16384 vertices, the max index is 16383, which fits in a Uint16Array (max 65535). But Uint32Array is safer and works fine. Actually, for BufferGeometry.setIndex, we can use either. Let me use Uint32Array to be safe.

Wait, actually THREE.BufferAttribute accepts both. Let me use `new THREE.BufferAttribute(indices, 1)` where indices is a Uint32Array. That should work fine.

Let me also make sure the terrain is visible. Camera at (15, 15, 15) looking at origin, terrain is 20x20. The distance from camera to origin is sqrt(15² + 15² + 15²) ≈ 26. With a 60° FOV, the visible width at that distance is about 2 * 26 * tan(30°) ≈ 30 units. So the 20-unit terrain should be visible. Good.

I think the code is complete. Let me finalize it.
