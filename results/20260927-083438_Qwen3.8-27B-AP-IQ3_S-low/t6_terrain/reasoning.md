Let me break down the requirements:

1. Procedural terrain from hand-made BufferGeometry (NOT PlaneGeometry)
2. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
3. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
4. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
5. Call computeVertexNormals()
6. Vertex colors by height (green low, brown middle, white high); MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
9. Expose as (window as any).__controls = controls
10. Camera above terrain at an angle, whole terrain visible

Let me think about the geometry:
- 128x128 vertices means 128 columns and 128 rows
- Spacing: 20 / (128 - 1) units between vertices
- X ranges from -10 to 10, Z ranges from -10 to 10
- Y is computed from sine/cosine layers

For the index buffer:
- Each cell (i, j) has 4 vertices:
  - v0 = i * 128 + j (let's say row-major: row i, col j)
  - Actually let me think about this more carefully.
  
Let me use: vertex index = row * 128 + col, where row is 0..127 (Z direction) and col is 0..127 (X direction).

For each cell (row, col) where row < 127 and col < 127:
- v00 = row * 128 + col (bottom-left)
- v10 = (row+1) * 128 + col (top-left)
- v01 = row * 128 + (col+1) (bottom-right)
- v11 = (row+1) * 128 + (col+1) (top-right)

For faces pointing UP (+Y), we need counter-clockwise winding when viewed from above.

Looking from above (+Y looking down), X goes right, Z goes up (in screen space when looking down).

Actually, let me think about this differently. In Three.js, the normal is computed from the cross product of edges in the order of the indices. For a face to point up (+Y), we need the vertices in counter-clockwise order when viewed from above.

Let me define:
- Row 0 is at Z = -10 (negative Z)
- Row 127 is at Z = +10 (positive Z)
- Col 0 is at X = -10 (negative X)
- Col 127 is at X = +10 (positive X)

So vertex (row, col) is at:
- x = -10 + col * (20/127)
- z = -10 + row * (20/127)

For a cell at (row, col):
- Bottom-left (BL): (row, col) → x is left, z is bottom (more negative)
- Bottom-right (BR): (row, col+1) → x is right, z is bottom
- Top-left (TL): (row+1, col) → x is left, z is top (more positive)
- Top-right (TR): (row+1, col+1) → x is right, z is top

Viewed from above (+Y looking down at -Y):
- X axis goes to the right
- Z axis goes... hmm, in Three.js, when looking down from +Y, the Z axis points "up" in screen space (towards the viewer's "up" when they're looking down).

Actually, let me just use the right-hand rule. For a face with normal pointing +Y:
- If we have vertices in order A, B, C, then (B-A) × (C-A) should point in +Y direction.

Let's say:
- A = (row, col) at position (x0, y, z0)
- B = (row, col+1) at position (x1, y, z0)  → B-A is in +X direction
- C = (row+1, col) at position (x0, y, z1)  → C-A is in +Z direction

(B-A) × (C-A) = (+X) × (+Z) = -Y (by right-hand rule, X cross Z = -Y in right-handed system)

That's wrong! We need +Y. So let's swap:
- A = (row, col)
- B = (row+1, col) → +Z direction
- C = (row, col+1) → +X direction

(B-A) × (C-A) = (+Z) × (+X) = +Y ✓

So the two triangles for cell (row, col):
- Triangle 1: (row*128+col), ((row+1)*128+col), (row*128+col+1)
- Triangle 2: ((row+1)*128+col), ((row+1)*128+col+1), (row*128+col+1)

Let me verify triangle 2:
- A = ((row+1)*128+col) → position (x0, y, z1)
- B = ((row+1)*128+col+1) → position (x1, y, z1)
- C = (row*128+col+1) → position (x1, y, z0)

B-A = +X, C-A = -Z
(+X) × (-Z) = -(X × Z) = -(-Y) = +Y ✓

Great, both triangles have +Y normals.

For the height function, I'll use 3 layers of sine/cosine:
- Layer 1: sin(x * 0.5) * cos(z * 0.5) * 1.0
- Layer 2: sin(x * 1.5 + z * 0.8) * 0.5
- Layer 3: cos(x * 3.0 - z * 2.0) * 0.25

Total amplitude roughly 1 + 0.5 + 0.25 = 1.75, close to 2.

For vertex colors by height:
- I need to normalize the height to [0, 1] range
- Low: green (0, 0.8, 0)
- Middle: brown (0.5, 0.3, 0.1)
- High: white (1, 1, 1)

I'll use a simple lerp between these based on normalized height.

Let me write the complete file now.

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
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Terrain
const SIZE = 128;
const SPAN = 20;
const STEP = SPAN / (SIZE - 1);

// Height function
function height(x: number, z: number): number {
    const h1 = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
    const h2 = Math.sin(x * 1.5 + z * 0.8) * 0.5;
    const h3 = Math.cos(x * 3.0 - z * 2.0) * 0.25;
    return h1 + h2 + h3;
}

// Build geometry
const positions = new Float32Array(SIZE * SIZE * 3);
const colors = new Float32Array(SIZE * SIZE * 3);

let minH = Infinity;
let maxH = -Infinity;

// First pass: compute positions and track min/max height
for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
        const idx = (row * SIZE + col) * 3;
        const x = -SPAN / 2 + col * STEP;
        const z = -SPAN / 2 + row * STEP;
        const y = height(x, z);
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
        if (y < minH) minH = y;
        if (y > maxH) maxH = y;
    }
}

// Color function
const colorLow = new THREE.Color(0x2d8a2d);    // green
const colorMid = new THREE.Color(0x8b5a2b);    // brown
const colorHigh = new THREE.Color(0xffffff);   // white

for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
        const idx = (row * SIZE + col) * 3;
        const y = positions[idx + 1];
        const t = (y - minH) / (maxH - minH);
        
        let r: number, g: number, b: number;
        if (t < 0.5) {
            const s = t / 0.5;
            r = colorLow.r + (colorMid.r - colorLow.r) * s;
            g = colorLow.g + (colorMid.g - colorLow.g) * s;
            b = colorLow.b + (colorMid.b - colorLow.b) * s;
        } else {
            const s = (t - 0.5) / 0.5;
            r = colorMid.r + (colorHigh.r - colorMid.r) * s;
            g = colorMid.g + (colorHigh.g - colorMid.g) * s;
            b = colorMid.b + (colorHigh.b - colorMid.b) * s;
        }
        colors[idx] = r;
        colors[idx + 1] = g;
        colors[idx + 2] = b;
    }
}

// Index buffer
const indices: number[] = [];
for (let row = 0; row < SIZE - 1; row++) {
    for (let col = 0; col < SIZE - 1; col++) {
        const a = row * SIZE + col;
        const b = (row + 1) * SIZE + col;
        const c = row * SIZE + (col + 1);
        const d = (row + 1) * SIZE + (col + 1);
        indices.push(a, b, c);
        indices.push(b, d, c);
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 });
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

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

// Animation
let ready = false;
renderer.setAnimationLoop((time: number) => {
    controls.update();
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, I need to double-check the `setAnimationLoop` callback signature. In Three.js, `setAnimationLoop` takes a callback that receives `(time: DOMHighResTimeStamp)`. But for strict TypeScript, I should make sure the types work.

Actually, looking at the Three.js types, `setAnimationLoop` accepts `((time: number, frame?: XRFrame) => void) | null`. So passing `(time: number) => void` should work fine.

Let me also make sure the camera is positioned to see the whole terrain. The terrain is 20x20 units, centered at origin, with heights up to about ±2. A camera at (15, 15, 15) looking at origin should show it well.

Let me also verify the index buffer count: (127 * 127) * 6 = 96534 indices. That's correct for 127x127 cells with 2 triangles each.

I think this is complete. Let me clean it up and make sure it compiles with strict mode. One thing to watch: the `indices` array - I could use `Uint32Array` but a regular number[] passed to `setIndex` works fine since Three.js handles it.

Actually, for strict mode, I should make sure there are no implicit any issues. Let me review...

The `setAnimationLoop` callback parameter - in strict mode, if I don't type it, it might be inferred. Let me explicitly type it.

Actually, `renderer.setAnimationLoop` in Three.js types is:
```
setAnimationLoop(callback: ((time: number, frame?: XRFrame) => void) | null): void;
```

So my callback `(time: number) => { ... }` should be fine.

I think the code is good. Let me finalize it.
