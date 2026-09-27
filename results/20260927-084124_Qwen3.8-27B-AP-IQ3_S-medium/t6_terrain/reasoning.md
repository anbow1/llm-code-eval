The user wants a complete TypeScript file for a Three.js procedural terrain scene. Let me plan this carefully:

1. Import THREE and OrbitControls
2. Create renderer, scene, camera
3. Build terrain as hand-made BufferGeometry:
   - 128x128 vertices (so 128 columns × 128 rows = 16384 vertices)
   - 20x20 units in XZ plane, centered at origin
   - So spacing = 20/127 between vertices
   - Height = sum of 3 sine/cosine layers, amplitude about 2
   - Index buffer: two triangles per cell, winding for +Y facing (counterclockwise when viewed from above)
   - computeVertexNormals()
   - Vertex colors by height: green low, brown middle, white high
4. MeshStandardMaterial with vertexColors: true
5. AmbientLight + DirectionalLight
6. OrbitControls with damping
7. Camera above terrain at angle
8. Window resize handling
9. setAnimationLoop
10. Expose __scene, __camera, __renderer, __controls, __ready

Let me think about the index winding. For a grid in the XZ plane:
- Vertices are indexed row by row: vertex(i, j) where i is column (0..127), j is row (0..127)
- Position: x = -10 + i * (20/127), z = -10 + j * (20/127)
- For cell (i, j): vertices are v00, v01, v10, v11
  - v00 = j * 128 + i
  - v01 = j * 128 + (i+1)
  - v10 = (j+1) * 128 + i
  - v11 = (j+1) * 128 + (i+1)

For +Y facing (counterclockwise when viewed from above, i.e., looking down -Y):
- Triangle 1: v00, v10, v01 (bottom-left, bottom-right... wait let me think more carefully)

Actually, let me reconsider. Looking from above (+Y looking down):
- x increases to the right, z increases downward (or upward depending on convention)

Let me use standard convention: x goes right, z goes "into" the screen (away from camera when looking from above).

Vertices in a cell (i, j):
- A = (i, j) → bottom-left when viewed from above
- B = (i+1, j) → bottom-right
- C = (i, j+1) → top-left
- D = (i+1, j+1) → top-right

For +Y normal (facing up), triangles should be counterclockwise when viewed from above:
- Triangle 1: A, C, B → (0,0), (0,1), (1,0)
- Triangle 2: C, D, B → (0,1), (1,1), (1,0)

Wait, let me verify. Looking down from +Y:
- A is at (x_min, z_min) - let's say bottom-left
- B is at (x_max, z_min) - bottom-right
- C is at (x_min, z_max) - top-left
- D is at (x_max, z_max) - top-right

For counterclockwise from above:
- A → B → D (bottom-left → bottom-right → top-right) - this is CCW from above? 
  A=(0,0), B=(1,0), D=(1,1): going right then up - that's CCW
- A → D → C (bottom-left → top-right → top-left) - hmm

Let me use the cross product to verify. For +Y normal:
- Triangle (A, B, C) where A=(0,0,0), B=(1,0,0), C=(0,1,0):
  - AB = (1,0,0), AC = (0,1,0)
  - AB × AC = (0*0-0*1, 0*0-1*0, 1*1-0*0) = (0,0,1) → that's +Z, not +Y

Hmm, I need to be more careful. The vertices are in 3D with x, y, z components. The terrain is in the XZ plane.

Let me define:
- A = (x0, y, z0) - corner (i, j)
- B = (x0+dx, y, z0) - corner (i+1, j)
- C = (x0, y, z0+dz) - corner (i, j+1)
- D = (x0+dx, y, z0+dz) - corner (i+1, j+1)

For +Y facing, I need the normal to point up. Using right-hand rule:
- Triangle (A, B, C): AB = (dx, 0, 0), AC = (0, 0, dz)
  - AB × AC = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)
  - That's -Y, so this winding gives downward normal.

- Triangle (A, C, B): AC = (0, 0, dz), AB = (dx, 0, 0)
  - AC × AB = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dx*dz, 0)
  - That's +Y! Good.

So for +Y facing:
- Triangle 1: A, C, B → indices: v(i,j), v(i,j+1), v(i+1,j)
- Triangle 2: C, D, B → indices: v(i,j+1), v(i+1,j+1), v(i+1,j)

Wait let me double-check triangle 2:
- C = (x0, y, z0+dz), D = (x0+dx, y, z0+dz), B = (x0+dx, y, z0)
- CD = (dx, 0, 0), CB = (dx, 0, -dz)
- CD × CB = (0*(-dz) - 0*0, 0*dx - dx*(-dz), dx*0 - 0*dx) = (0, dx*dz, 0)
- That's +Y! Good.

So the indices are:
For cell (i, j) where i in [0, 127) and j in [0, 127):
- idx = j * 128 + i
- Triangle 1: idx, idx + 128, idx + 1
- Triangle 2: idx + 128, idx + 129, idx + 1

Where:
- idx = j * 128 + i (vertex at column i, row j)
- idx + 1 = j * 128 + (i+1) (vertex at column i+1, row j)
- idx + 128 = (j+1) * 128 + i (vertex at column i, row j+1)
- idx + 129 = (j+1) * 128 + (i+1) (vertex at column i+1, row j+1)

Great.

For height function, I'll use 3 sine/cosine layers:
y = sin(x * 0.5) * cos(z * 0.3) * 1.0 + sin(x * 1.2 + z * 0.8) * 0.5 + cos(x * 2.5) * sin(z * 2.0) * 0.3
Total amplitude roughly 1.0 + 0.5 + 0.3 = 1.8, close to 2. Let me adjust to get closer to 2.

Actually let me make it:
y = sin(x * 0.8) * cos(z * 0.6) * 1.0 + sin(x * 1.5 + z * 1.0) * 0.6 + cos(x * 3.0) * sin(z * 2.5) * 0.4
Max amplitude: 1.0 + 0.6 + 0.4 = 2.0

For vertex colors by height:
- Low (y near -2): green
- Middle (y near 0): brown
- High (y near +2): white

I'll normalize height to 0..1 range and lerp colors.

Camera position: above terrain, at an angle. Maybe (15, 15, 15) looking at origin. The terrain is 20x20, so camera should be far enough to see it all. Let's say (12, 12, 12) or (15, 10, 15).

Let me write the code now. I need to make sure it compiles with tsc --strict.

Let me be careful with types. In strict mode, I need to handle potential undefined values.

Let me write the complete file:

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Terrain
const GRID = 128;
const SIZE = 20;
const STEP = SIZE / (GRID - 1);

const vertexCount = GRID * GRID;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);

function heightAt(x: number, z: number): number {
    return (
        Math.sin(x * 0.8) * Math.cos(z * 0.6) * 1.0 +
        Math.sin(x * 1.5 + z * 1.0) * 0.6 +
        Math.cos(x * 3.0) * Math.sin(z * 2.5) * 0.4
    );
}

// Color helpers
const lowColor = new THREE.Color(0x228B22);   // green
const midColor = new THREE.Color(0x8B4513);   // brown
const highColor = new THREE.Color(0xffffff);  // white

function colorForHeight(y: number, out: THREE.Color): void {
    // Normalize y to 0..1 range (approximately -2 to +2)
    const t = Math.max(0, Math.min(1, (y + 2) / 4));
    if (t < 0.5) {
        out.copy(lowColor).lerp(midColor, t * 2);
    } else {
        out.copy(midColor).lerp(highColor, (t - 0.5) * 2);
    }
}

const tmpColor = new THREE.Color();

for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
        const idx = j * GRID + i;
        const x = -SIZE / 2 + i * STEP;
        const z = -SIZE / 2 + j * STEP;
        const y = heightAt(x, z);

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        colorForHeight(y, tmpColor);
        colors[idx * 3] = tmpColor.r;
        colors[idx * 3 + 1] = tmpColor.g;
        colors[idx * 3 + 2] = tmpColor.b;
    }
}

// Index buffer
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let idxOffset = 0;
for (let j = 0; j < GRID - 1; j++) {
    for (let i = 0; i < GRID - 1; i++) {
        const a = j * GRID + i;
        const b = a + 1;
        const c = a + GRID;
        const d = c + 1;

        // Two triangles per cell, +Y facing
        indices[idxOffset++] = a;
        indices[idxOffset++] = c;
        indices[idxOffset++] = b;

        indices[idxOffset++] = c;
        indices[idxOffset++] = d;
        indices[idxOffset++] = b;
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

const terrainMesh = new THREE.Mesh(geometry, material);
scene.add(terrainMesh);

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
(window as any).__controls = controls;

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

Wait, I need to double-check the winding order. Let me re-verify:

Vertex layout:
- a = (x_i, z_j) → position (x, y, z_j)
- b = (x_{i+1}, z_j) → position (x+dx, y, z_j)
- c = (x_i, z_{j+1}) → position (x, y, z_j+dz)
- d = (x_{i+1}, z_{j+1}) → position (x+dx, y, z_j+dz)

Triangle 1: a → c → b
- a = (x, y_a, z)
- c = (x, y_c, z+dz)
- b = (x+dx, y_b, z)

Edge1 = c - a = (0, y_c-y_a, dz)
Edge2 = b - a = (dx, y_b-y_a, 0)

Normal = Edge1 × Edge2 = (y_c-y_a)*0 - dz*(y_b-y_a), dz*dx - 0*0, 0*(y_b-y_a) - (y_c-y_a)*dx
= (-dz*(y_b-y_a), dx*dz, -dx*(y_c-y_a))

The Y component is dx*dz which is positive (since dx > 0 and dz > 0). So the normal points in +Y direction (at least has a positive Y component). 

Triangle 2: c → d → b
- c = (x, y_c, z+dz)
- d = (x+dx, y_d, z+dz)
- b = (x+dx, y_b, z)

Edge1 = d - c = (dx, y_d-y_c, 0)
Edge2 = b - c = (dx, y_b-y_c, -dz)

Normal = Edge1 × Edge2 = (y_d-y_c)*(-dz) - 0*(y_b-y_c), 0*dx - dx*(-dz), dx*(y_b-y_c) - (y_d-y_c)*dx
= (-dz*(y_d-y_c), dx*dz, dx*(y_b-y_c) - dx*(y_d-y_c))

Y component is dx*dz > 0. Good, +Y facing.

The code looks correct. Let me also make sure I handle the `delta` variable properly - the instructions say "Motion must use delta/elapsed time, not frame counts." In this case, there's no actual motion (the terrain is static), but I should still use the clock to get delta (even if I don't use it for anything specific). Actually, I could add a subtle animation, like slowly rotating the directional light or something. But the requirement just says motion must use delta time if there is motion. Since the terrain is static and we just have OrbitControls, I think it's fine to just call controls.update() which handles its own timing internally.

Actually, re-reading the requirement: "Motion must use delta/elapsed time, not frame counts." This is a general rule. Since there's no explicit animation on the terrain itself (it's static), and OrbitControls handles its own delta internally, I think we're fine. But to be safe, I'll keep the clock and delta variable.

Let me finalize the code and make sure everything is type-safe for strict mode.

One thing: `renderer.setAnimationLoop` callback - in strict mode, I need to make sure the callback parameter is typed. Actually `setAnimationLoop` takes `(callback: ((time: DOMHighResTimeStamp) => void) | null)`. So I don't need a parameter if I use the clock.

Let me finalize.
