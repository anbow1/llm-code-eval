Let me build a procedural terrain using a hand-made BufferGeometry. Let me plan this out:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
   - So each vertex is spaced 20/127 apart in X and Z
   - X ranges from -10 to 10, Z ranges from -10 to 10

2. Height function: sum of 3 sine/cosine layers with different frequencies, amplitude about 2
   - Layer 1: sin(x * 0.5) * cos(z * 0.5) * 1.0
   - Layer 2: sin(x * 1.2) * cos(z * 0.8) * 0.5
   - Layer 3: sin(x * 2.5) * cos(z * 2.0) * 0.25
   - Total amplitude ≈ 1.75, close to 2

3. Index buffer: two triangles per grid cell (127x127 cells = 127*127*2 triangles)
   - For cell (i, j), vertices are:
     - v0 = i * 128 + j (top-left)
     - v1 = (i+1) * 128 + j (top-right)
     - v2 = i * 128 + (j+1) (bottom-left)
     - v3 = (i+1) * 128 + (j+1) (bottom-right)
   
   Wait, let me think about the indexing. If we have a grid of 128x128 vertices:
   - Vertex index for row i, column j: i * 128 + j
   - For cell (i, j) where i is row, j is column:
     - v0 = i * 128 + j
     - v1 = (i+1) * 128 + j
     - v2 = i * 128 + (j+1)
     - v3 = (i+1) * 128 + (j+1)
   
   For faces pointing UP (+Y), we need CCW winding when viewed from above.
   
   Let me think about this more carefully. The vertices are laid out as:
   - Row 0: vertices 0, 1, 2, ..., 127 (z = -10 to 10)
   - Row 1: vertices 128, 129, ..., 255
   - ...
   - Row 127: vertices 127*128, ..., 127*128+127

   Actually, let me reconsider the layout. Let's say:
   - x goes from -10 to 10 (128 values)
   - z goes from -10 to 10 (128 values)
   - Vertex at (col, row) where col is x-index, row is z-index
   - Index = row * 128 + col

   For a cell (col, row):
   - v0 = row * 128 + col (bottom-left, z smaller)
   - v1 = row * 128 + (col+1) (bottom-right, x larger)
   - v2 = (row+1) * 128 + col (top-left, z larger)
   - v3 = (row+1) * 128 + (col+1) (top-right)

   For the face to point UP (+Y), we need the normal to point in +Y direction.
   
   For a triangle with vertices A, B, C, the normal is (B-A) × (C-A).
   
   Let's say A is bottom-left, B is bottom-right, C is top-left:
   - A = (x0, y0, z0)
   - B = (x1, y1, z0)
   - C = (x0, y2, z1)
   
   (B-A) = (dx, dy1, 0)
   (C-A) = (0, dy2, dz)
   
   Cross product: (dx * dz - 0*dy2, 0*dx - dy1*dz, dx*dy2 - 0)
   = (dx*dz, -dy1*dz, dx*dy2)
   
   Hmm, this doesn't necessarily point up. Let me think differently.

   For a flat terrain (all y=0), let's use:
   - A = (x0, 0, z0)
   - B = (x1, 0, z0)
   - C = (x0, 0, z1)
   
   (B-A) = (dx, 0, 0)
   (C-A) = (0, 0, dz)
   
   Cross: (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)
   
   Since dx > 0 and dz > 0, this gives (0, -something, 0) which points DOWN. So I need to reverse the winding.

   Let me try A, C, B:
   - A = (x0, 0, z0)
   - C = (x0, 0, z1)
   - B = (x1, 0, z0)
   
   (C-A) = (0, 0, dz)
   (B-A) = (dx, 0, 0)
   
   Cross: (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0)
   
   This points UP! Good.

   So for each cell (col, row):
   - v0 = row * 128 + col
   - v1 = (row+1) * 128 + col
   - v2 = row * 128 + (col+1)
   - v3 = (row+1) * 128 + (col+1)
   
   Triangle 1: v0, v1, v2 (bottom-left, top-left, bottom-right)
   Triangle 2: v1, v3, v2 (top-left, top-right, bottom-right)

   Let me verify triangle 1:
   - v0 = (x0, y0, z0)
   - v1 = (x0, y1, z1)
   - v2 = (x1, y2, z0)
   
   (v1-v0) = (0, dy1, dz)
   (v2-v0) = (dx, dy2, 0)
   
   Cross: (dy1*0 - dz*dy2, dz*dx - 0*0, 0*dy2 - dy1*dx)
   = (-dz*dy2, dz*dx, -dy1*dx)
   
   The Y component is dz*dx > 0, so it points up. 

   Triangle 2: v1, v3, v2
   - v1 = (x0, y1, z1)
   - v3 = (x1, y3, z1)
   - v2 = (x1, y2, z0)
   
   (v3-v1) = (dx, dy3-y1, 0)
   (v2-v1) = (dx, dy2-y1, -dz)
   
   Cross: ((dy3-y1)*(-dz) - 0*(dy2-y1), 0*dx - (dx)(-dz), (dx)(dy2-y1) - (dx)(dy3-y1))
   = (-(dy3-y1)*dz, dx*dz, dx*(dy2-y1-dy3+y1))
   = (-(dy3-y1)*dz, dx*dz, dx*(dy2-dy3))
   
   Y component is dx*dz > 0. Points up. 

   So the indices for cell (col, row):
   - idx = (row * 128 + col)
   - tri1: idx, idx + 128, idx + 1
   - tri2: idx + 128, idx + 129, idx + 1

   Wait, let me re-index:
   - v0 = row * 128 + col
   - v1 = (row+1) * 128 + col = v0 + 128
   - v2 = row * 128 + (col+1) = v0 + 1
   - v3 = (row+1) * 128 + (col+1) = v0 + 129

   Tri1: v0, v1, v2 → v0, v0+128, v0+1
   Tri2: v1, v3, v2 → v0+128, v0+129, v0+1

   Total indices: 127 * 127 * 6 = 97338

4. Vertex colors by height:
   - Green (low) → Brown (middle) → White (high)
   - Height range is roughly -2 to +2
   - Normalize height to 0-1
   - Low: green (0, 0.5, 0)
   - Middle: brown (0.5, 0.3, 0.1)
   - High: white (1, 1, 1)
   - Interpolate: for h in [0, 0.5]: lerp green to brown; for h in [0.5, 1]: lerp brown to white

5. MeshStandardMaterial with vertexColors: true

6. Lighting: AmbientLight + DirectionalLight

7. OrbitControls with damping, updated every frame

8. Camera positioned above terrain at an angle

Let me write the code now.

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 10, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Terrain
const N = 128;
const SIZE = 20;
const step = SIZE / (N - 1);

const positions: number[] = [];
const colors: number[] = [];

for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
        const x = -SIZE / 2 + col * step;
        const z = -SIZE / 2 + row * step;
        
        // Height function: 3 sine/cosine layers
        const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
        const h2 = Math.sin(x * 1.2) * Math.cos(z * 0.8) * 0.5;
        const h3 = Math.sin(x * 2.5) * Math.cos(z * 2.0) * 0.25;
        const y = h1 + h2 + h3;
        
        positions.push(x, y, z);
        
        // Color by height (normalized to 0-1)
        const t = (y + 2) / 4; // map [-2, 2] to [0, 1]
        let r: number, g: number, b: number;
        if (t < 0.5) {
            // green to brown
            const s = t / 0.5;
            r = 0.0 + s * 0.5;
            g = 0.5 + s * (-0.2);
            b = 0.0 + s * 0.1;
        } else {
            // brown to white
            const s = (t - 0.5) / 0.5;
            r = 0.5 + s * 0.5;
            g = 0.3 + s * 0.7;
            b = 0.1 + s * 0.9;
        }
        colors.push(r, g, b);
    }
}

const indices: number[] = [];
for (let row = 0; row < N - 1; row++) {
    for (let col = 0; col < N - 1; col++) {
        const v0 = row * N + col;
        const v1 = v0 + N;
        const v2 = v0 + 1;
        const v3 = v0 + N + 1;
        
        indices.push(v0, v1, v2);
        indices.push(v1, v3, v2);
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.1
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Resize
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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All variables are typed
- No implicit any
- The `time` parameter in setAnimationLoop - it's a number, that's fine
- The `window.addEventListener` callback - the event parameter needs typing

Actually, `window.addEventListener('resize', () => {...})` - the callback parameter is `Event`, which is fine in strict mode since we don't use it.

Let me also make sure the `setAnimationLoop` callback signature is correct. It takes `(time: number) => void`.

I think this looks good. Let me finalize it.
