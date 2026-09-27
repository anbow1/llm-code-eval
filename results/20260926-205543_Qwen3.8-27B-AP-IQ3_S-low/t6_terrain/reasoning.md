Let me plan this out:

1. Create a 128x128 vertex grid (so 129x129 vertices total? No wait - "Grid of 128x128 vertices" means 128 vertices along each axis, so 128*128 = 16384 vertices, and 127*127 cells with 2 triangles each = 32258 triangles)

Wait, let me re-read: "Grid of 128x128 vertices, 20x20 units in the XZ plane, centered at the origin."

So we have 128 vertices in X and 128 vertices in Z. That means:
- 128 * 128 = 16384 vertices
- 127 * 127 cells = 16129 cells
- 16129 * 2 = 32258 triangles
- Index count: 32258 * 3 = 96774

The XZ plane spans from -10 to +10 (20 units centered at origin).

For vertex positions:
- x goes from -10 to 10, step = 20/127
- z goes from -10 to 10, step = 20/127

Height function: sum of 3 sine/cosine layers with different frequencies, amplitude about 2.

Let me design:
- y = 1.0 * sin(x * 0.5) * cos(z * 0.5) + 0.5 * sin(x * 1.2 + 1.0) * cos(z * 0.8) + 0.25 * sin(x * 2.5) * cos(z * 2.5)
- Max amplitude ≈ 1.0 + 0.5 + 0.25 = 1.75, so amplitude about 2 (close enough, or I can scale slightly)

Actually let me make it closer to amplitude 2:
- y = 1.2 * sin(x * 0.5) * cos(z * 0.5) + 0.5 * sin(x * 1.2 + 1.0) * cos(z * 0.8) + 0.3 * sin(x * 2.5) * cos(z * 2.5)
- Max ≈ 2.0

For vertex colors by height:
- Green (low), Brown (middle), White (high)
- Need to normalize height to 0-1 range, then interpolate

For the index buffer, winding so faces point UP (+Y):
For a quad with vertices:
```
i, j+1
j,   j+1
```

Let me think about the indexing. For row i, column j:
- Vertex at (i, j) = i * 128 + j (if we iterate i for X and j for Z)

Wait, let me think about this more carefully. Let's say:
- For each row i (0..127) and column j (0..127):
  - x = -10 + i * (20/127)
  - z = -10 + j * (20/127)

Vertex index for (i, j) = i * 128 + j

For cell (i, j) where i < 127 and j < 127:
- TL = i * 128 + j
- TR = i * 128 + (j+1)
- BL = (i+1) * 128 + j
- BR = (i+1) * 128 + (j+1)

For faces pointing UP (+Y), using right-hand rule, we need counter-clockwise winding when viewed from above.

Looking from above (+Y looking down at -Y):
- X goes right, Z goes "into screen" (or let's say Z goes down on screen when looking from above)

Actually in Three.js, the default "up" for a plane looking from +Y down would be:
- Looking from +Y towards -Y
- X is to the right
- Z is... 

Let me think differently. The normal for a triangle with vertices A, B, C is (B-A) × (C-A). For this to point in +Y direction, we need the cross product to have positive Y component.

Let's say:
- A = (x1, y1, z1) - top-left (i, j)
- B = (x2, y2, z2) - bottom-left (i+1, j+1)... 

Hmm, let me just be concrete:

Row i increases X (left to right), column j increases Z (back to front, or rather from -10 to +10 in Z).

For a cell at (i, j):
- v0 = (i, j) → x = -10 + i*step, z = -10 + j*step
- v1 = (i, j+1) → x = -10 + i*step, z = -10 + (j+1)*step
- v2 = (i+1, j) → x = -10 + (i+1)*step, z = -10 + j*step
- v3 = (i+1, j+1) → x = -10 + (i+1)*step, z = -10 + (j+1)*step

For the normal to point +Y, we need counter-clockwise winding when viewed from above.

Viewed from above (looking down -Y):
- X increases to the right
- Z increases "downward" on screen (into the page if Y is up)

Wait, in Three.js coordinate system:
- X is right
- Y is up
- Z is towards the viewer (out of screen)

So looking from above (from +Y looking down):
- X is to the right
- Z is... towards the viewer, which means "down" on the 2D projection when looking from above

Actually, let me just use the cross product test.

If I have:
- A = (0, 0, 0)
- B = (1, 0, 0)  (along +X)
- C = (0, 0, 1)  (along +Z)

Normal = (B-A) × (C-A) = (1,0,0) × (0,0,1) = (0*1-0*0, 0*0-1*1, 1*0-0*0) = (0, -1, 0)

That points DOWN. So for UP, I need:
- A = (0, 0, 0)
- B = (0, 0, 1)
- C = (1, 0, 0)

Normal = (B-A) × (C-A) = (0,0,1) × (1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0, 1, 0) ✓

So the winding should be: for a cell where i increases X and j increases Z:
- Triangle 1: (i,j) → (i,j+1) → (i+1,j)  i.e., v0 → v1 → v2
- Triangle 2: (i+1,j) → (i,j+1) → (i+1,j+1)  i.e., v2 → v1 → v3

Let me verify:
- v0 = (x, y, z)
- v1 = (x, y, z+dz)  (increased Z)
- v2 = (x+dx, y, z)  (increased X)
- v3 = (x+dx, y, z+dz)

Triangle 1: v0, v1, v2
Normal = (v1-v0) × (v2-v0) = (0,0,dz) × (dx,0,0) = (0*0-dz*0, dz*dx-0*0, 0*0-0*dx) = (0, dz*dx, 0) → +Y ✓

Triangle 2: v2, v1, v3
v1-v2 = (-dx, 0, dz)
v3-v2 = (0, 0, dz)
Normal = (-dx, 0, dz) × (0, 0, dz) = (0*dz - dz*0, dz*0 - (-dx)*dz, (-dx)*0 - 0*0) = (0, dx*dz, 0) → +Y ✓

So indices for cell (i, j):
- idx0 = i * 128 + j
- idx1 = i * 128 + (j+1)
- idx2 = (i+1) * 128 + j
- idx3 = (i+1) * 128 + (j+1)

Triangle 1: idx0, idx1, idx2
Triangle 2: idx2, idx1, idx3

Now for vertex colors:
- Need to normalize height. The min height is approximately -2 and max is approximately +2.
- I'll compute min/max after generating all vertices, or just use a fixed range.

Let me use a fixed range: normalize h to [0, 1] using (h + 2) / 4, clamped to [0, 1].

Color gradient:
- t = 0 (low): green (0.2, 0.8, 0.2)
- t = 0.5 (middle): brown (0.6, 0.4, 0.2)
- t = 1 (high): white (1, 1, 1)

Linear interpolation:
- t < 0.5: lerp(green, brown, t * 2)
- t >= 0.5: lerp(brown, white, (t - 0.5) * 2)

Camera position: above the terrain at an angle. The terrain is 20x20 units, so camera at something like (0, 20, 20) looking at origin should work. Let me adjust: (15, 15, 15) or (0, 25, 25).

Let me go with camera at (15, 15, 15) looking at (0, 0, 0). That should show the whole terrain.

Actually, for a 20x20 terrain, let me use camera at (20, 20, 20) to make sure the whole thing is visible.

Now let me write the complete code:

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

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

// Terrain generation
const SIZE = 128;
const EXTENT = 20;
const HALF = EXTENT / 2;
const STEP = EXTENT / (SIZE - 1);

// Height function
function getHeight(x: number, z: number): number {
    const h1 = 1.2 * Math.sin(x * 0.5) * Math.cos(z * 0.5);
    const h2 = 0.5 * Math.sin(x * 1.2 + 1.0) * Math.cos(z * 0.8);
    const h3 = 0.3 * Math.sin(x * 2.5) * Math.cos(z * 2.5);
    return h1 + h2 + h3;
}

// Build positions, colors, indices
const positions = new Float32Array(SIZE * SIZE * 3);
const colors = new Float32Array(SIZE * SIZE * 3);
const totalCells = (SIZE - 1) * (SIZE - 1);
const indices = new Uint32Array(totalCells * 6);

const green = new THREE.Color(0.2, 0.8, 0.2);
const brown = new THREE.Color(0.6, 0.4, 0.2);
const white = new THREE.Color(1, 1, 1);
const tmpColor = new THREE.Color();

let idxPtr = 0;
for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
        const x = -HALF + i * STEP;
        const z = -HALF + j * STEP;
        const y = getHeight(x, z);
        
        const vi = i * SIZE + j;
        positions[vi * 3] = x;
        positions[vi * 3 + 1] = y;
        positions[vi * 3 + 2] = z;
        
        // Color by height
        const t = Math.max(0, Math.min(1, (y + 2.0) / 4.0));
        if (t < 0.5) {
            tmpColor.lerpColors(green, brown, t * 2);
        } else {
            tmpColor.lerpColors(brown, white, (t - 0.5) * 2);
        }
        colors[vi * 3] = tmpColor.r;
        colors[vi * 3 + 1] = tmpColor.g;
        colors[vi * 3 + 2] = tmpColor.b;
    }
}

// Build index buffer
let idx = 0;
for (let i = 0; i < SIZE - 1; i++) {
    for (let j = 0; j < SIZE - 1; j++) {
        const idx0 = i * SIZE + j;
        const idx1 = i * SIZE + (j + 1);
        const idx2 = (i + 1) * SIZE + j;
        const idx3 = (i + 1) * SIZE + (j + 1);
        
        // Triangle 1
        indices[idx++] = idx0;
        indices[idx++] = idx1;
        indices[idx++] = idx2;
        // Triangle 2
        indices[idx++] = idx2;
        indices[idx++] = idx1;
        indices[idx++] = idx3;
    }
}

// Create geometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

// Material and mesh
const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.1,
});
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;

// Render loop
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

Wait, I need to double-check the `lerpColors` method. In Three.js, `Color.lerpColors(color1, color2, alpha)` - this was added in later versions. Let me make sure it exists. Actually, in Three.js r152+, `lerpColors` is available. But to be safe, I could do manual lerp.

Actually, let me check - `THREE.Color.lerpColors(a, b, t)` is a static-like method that sets `this` to the lerp of a and b. It was introduced around r127 or so. It should be fine for modern Three.js.

Let me also double-check the `setIndex` with a BufferAttribute. Yes, `geometry.setIndex(new THREE.BufferAttribute(indices, 1))` is valid.

Let me also make sure I'm using `Uint32Array` for indices since we have more than 65535 vertices (128*128 = 16384, so actually Uint16Array would work too, but Uint32Array is safer and more general).

Actually 128*128 = 16384 vertices, which is less than 65536, so Uint16Array would work. But Uint32Array is fine too. Let me stick with Uint32Array for safety.

Wait, I should also check: does `setIndex` accept a `BufferAttribute` or just an array? Looking at Three.js docs, `setIndex` can accept either a `BufferAttribute` or an array. So `geometry.setIndex(new THREE.BufferAttribute(indices, 1))` should work.

Actually, let me double check - in strict TypeScript, I need to make sure all types are correct. The `setIndex` method signature is `setIndex(index: BufferAttribute | number[] | Uint16Array | Uint32Array): BufferGeometry`. So passing a `BufferAttribute` directly should be fine.

Hmm, actually I just realized - in newer Three.js versions, `setIndex` might accept the array directly. Let me just pass the array: `geometry.setIndex(indices as unknown as number[])` - no that's ugly. Let me use the BufferAttribute approach which is cleaner.

Actually, looking at the Three.js type definitions more carefully, `setIndex` accepts `BufferAttribute | number[] | Uint16Array | Uint32Array`. So I can just pass the Uint32Array directly: `geometry.setIndex(indices)`.

Let me finalize the code. I think it's solid. Let me also add `renderer.setPixelRatio(window.devicePixelRatio)` for crisp rendering.

One more thing - the `lerpColors` method. Let me verify: in Three.js, `Color.lerpColors(color1: Color, color2: Color, alpha: number): Color` - yes this exists and sets the color to the interpolation. Available since around r127.

I'm satisfied with the solution. Let me write it out cleanly.
