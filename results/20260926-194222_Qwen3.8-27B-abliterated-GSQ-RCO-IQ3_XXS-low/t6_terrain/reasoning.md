Let me break down the requirements:

1. Procedural terrain from a hand-made BufferGeometry (no PlaneGeometry)
2. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
3. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
4. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
5. computeVertexNormals()
6. Vertex colors by height (green low, brown middle, white high); MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls with damping enabled, updated every frame, exposed as (window as any).__controls = controls
9. Camera above terrain at an angle, whole terrain visible
10. Standard boilerplate: renderer, resize, setAnimationLoop, __ready flag

Let me think about the terrain generation:

- 128x128 vertices means 127x127 cells
- XZ plane: 20x20 units, centered at origin → x goes from -10 to 10, z goes from -10 to 10
- Step: 20 / 127 for both x and z

Height function: sum of 3 sine/cosine layers with different frequencies, amplitude about 2.
- h(x, z) = A1 * sin(f1_x * x + f1_z * z) + A2 * cos(f2_x * x + f2_z * z) + A3 * sin(f3_x * x + f3_z * z)
- Total amplitude ≈ 2, so I'll use amplitudes like 0.8, 0.7, 0.5 summing to 2.0

For winding (faces pointing UP +Y):
- Triangle 1: v0, v1, v2 where v0 = top-left, v1 = top-right, v2 = bottom-left (or similar)
- Triangle 2: v1, v2, v3 (or v1, v3, v2)

Let me think about the grid layout:
- Row i, column j: vertex (i, j) is at position (x_j, y, z_i) where x_j and z_i span from -10 to 10.
- Actually, let me think of it as: for i in 0..127, j in 0..127, vertex index = i * 128 + j
- x = -10 + j * (20/127)
- z = -10 + i * (20/127)
- y = height(x, z)

For a quad (i, j), (i, j+1), (i+1, j+1), (i+1, j), the vertices are:
- v00 = i * 128 + j
- v10 = i * 128 + (j+1)
- v01 = (i+1) * 128 + j
- v11 = (i+1) * 128 + (j+1)

For faces pointing UP (+Y), using the right-hand rule:
- Triangle 1: v00, v01, v10 → (bottom-left, bottom-right, top-left) ... wait let me think more carefully.

Actually, let me think of it in terms of the XZ plane. Looking from above (+Y down):
- j increases in +X direction
- i increases in +Z direction

For a face to point UP (+Y normal), using the right-hand rule (counterclockwise when viewed from +Y):
- If we look from +Y down, counterclockwise means: going from +Z to +X to -Z to -X... 

Actually, let me just use the standard approach:

For a quad with corners:
- BL (bottom-left in XZ, i.e., lower x, lower z): v00
- BR (bottom-right, higher x, lower z): v10  
- TL (top-left, lower x, higher z): v01
- TR (top-right, higher x, higher z): v11

For normal pointing +Y, the winding should be counterclockwise when viewed from above.

Looking from above (+Y looking down):
- +X is to the right
- +Z is "into the screen" (or "up" on screen)

Counterclockwise from above: BL → BR → TR → TL... no wait.

Let me use the cross product method. For a triangle with vertices A, B, C, the normal is (B-A) × (C-A). For this to point +Y:

If A = (0,0,0), B = (1,0,0), C = (0,0,1):
(B-A) × (C-A) = (1,0,0) × (0,0,1) = (0*1-0*0, 0*0-1*1, 1*0-0*0) = (0, -1, 0)

That's -Y, so that's clockwise from above. We need the opposite: A = (0,0,0), B = (0,0,1), C = (1,0,0):
(B-A) × (C-A) = (0,0,1) × (1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0, 1, 0)

So the order should be: for a triangle, if we go from a vertex at lower z to higher z, then to higher x, that gives +Y normal.

So for our quad:
- v00 = (x_j, y, z_i) — lower x, lower z
- v10 = (x_{j+1}, y, z_i) — higher x, lower z
- v01 = (x_j, y, z_{i+1}) — lower x, higher z
- v11 = (x_{j+1}, y, z_{i+1}) — higher x, higher z

Triangle 1: v00, v01, v11 → let's check:
A = v00, B = v01, C = v11
B-A = (0, 0, dz) approximately
C-A = (dx, 0, dz)
(B-A) × (C-A) = (0*dz - dz*0, dz*dx - 0*dz, 0*0 - 0*dx) = (0, dz*dx, 0)

Since dz > 0 and dx > 0, the y component is positive. So normal points +Y. 

Triangle 2: v00, v11, v10 → let's check:
A = v00, B = v11, C = v10
B-A = (dx, 0, dz)
C-A = (dx, 0, 0)
(B-A) × (C-A) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0)

Wait, let me redo:
(B-A) × (C-A) where B-A = (dx, 0, dz) and C-A = (dx, 0, 0)
= (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0)

Yes, also +Y. 

So:
- Triangle 1: v00, v01, v11
- Triangle 2: v00, v11, v10

For vertex colors based on height:
- I need to normalize heights to [0, 1] or some range
- Green (low) → Brown (middle) → White (high)

Let me write the code now.

For the camera: terrain is 20x20 units, height amplitude ~2. So camera at maybe (15, 15, 15) looking at origin, or something similar.

Let me write the complete file:

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.canvas);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Terrain
const SIZE = 128;
const EXTENT = 20;
const STEP = EXTENT / (SIZE - 1);

// Height function
function height(x: number, z: number): number {
    const a1 = 0.8, f1 = 0.5;
    const a2 = 0.7, f2 = 1.3;
    const a3 = 0.5, f3 = 2.7;
    return a1 * Math.sin(f1 * x + f1 * z) + a2 * Math.cos(f2 * x - f2 * 0.7 * z) + a3 * Math.sin(f3 * z + f3 * 0.3 * x);
}

// Build geometry
const positions: number[] = [];
const colors: number[] = [];

// First pass: compute all vertex positions to find min/max height
let minY = Infinity, maxY = -Infinity;
const yValues: number[] = new Array(SIZE * SIZE);

for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
        const x = -EXTENT / 2 + j * STEP;
        const z = -EXTENT / 2 + i * STEP;
        const y = height(x, z);
        yValues[i * SIZE + j] = y;
        positions.push(x, y, z);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
}

// Second pass: vertex colors
const range = maxY - minY;
for (let k = 0; k < SIZE * SIZE; k++) {
    const t = (yValues[k] - minY) / range; // 0 to 1
    let r: number, g: number, b: number;
    if (t < 0.5) {
        // green to brown
        const s = t / 0.5;
        r = 0.2 + s * 0.4;   // 0.2 → 0.6
        g = 0.6 - s * 0.3;   // 0.6 → 0.3
        b = 0.1;
    } else {
        // brown to white
        const s = (t - 0.5) / 0.5;
        r = 0.6 + s * 0.4;   // 0.6 → 1.0
        g = 0.3 + s * 0.7;   // 0.3 → 1.0
        b = 0.1 + s * 0.9;   // 0.1 → 1.0
    }
    colors.push(r, g, b);
}

// Index buffer
const indices: number[] = [];
for (let i = 0; i < SIZE - 1; i++) {
    for (let j = 0; j < SIZE - 1; j++) {
        const v00 = i * SIZE + j;
        const v10 = i * SIZE + (j + 1);
        const v01 = (i + 1) * SIZE + j;
        const v11 = (i + 1) * SIZE + (j + 1);
        // Triangle 1: v00, v01, v11 (CCW from above → +Y normal)
        indices.push(v00, v01, v11);
        // Triangle 2: v00, v11, v10 (CCW from above → +Y normal)
        indices.push(v00, v11, v10);
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({ vertexColors: true });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
renderer.setAnimationLoop((time) => {
    controls.update();
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, I need to check: `setAnimationLoop` callback receives `time` in milliseconds (DOMHighResTimeStamp). I should use delta time for motion if needed, but since the motion here is just OrbitControls damping (which handles its own timing), this should be fine. The requirement says "Motion must use delta/elapsed time, not frame counts" — OrbitControls internally uses delta time, so this is satisfied.

Let me double-check the winding. The requirement says "winding so the faces point UP (+Y)". Let me verify once more:

For triangle (v00, v01, v11):
- v00 = (x_j, y_i, z_i)
- v01 = (x_j, y_{i+1}, z_{i+1}) — same x, higher z (and possibly different y)
- v11 = (x_{j+1}, y_{i+1}, z_{i+1}) — higher x, higher z

The normal direction is determined by (v01 - v00) × (v11 - v00):
- v01 - v00 = (0, dy1, dz) where dz = STEP > 0
- v11 - v00 = (dx, dy2, dz) where dx = STEP > 0

Cross product:
(0, dy1, dz) × (dx, dy2, dz) = (dy1*dz - dz*dy2, dz*dx - 0*dz, 0*dy2 - dx*dy1)
= (dz*(dy1 - dy2), dz*dx, -dx*dy1)

The y component is dz*dx > 0 (since both dz and dx are positive), so the normal has a positive Y component. The face points generally upward. 

For triangle (v00, v11, v10):
- v11 - v00 = (dx, dy2, dz)
- v10 - v00 = (dx, dy3, 0)

Cross product:
(dx, dy2, dz) × (dx, dy3, 0) = (dy2*0 - dz*dy3, dz*dx - dx*0, dx*dy3 - dy2*dx)
= (-dz*dy3, dz*dx, dx*(dy3 - dy2))

The y component is dz*dx > 0. Also points upward. 

Everything looks correct. Let me finalize the code.
