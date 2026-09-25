Let me break down the requirements:

1. Procedural terrain from hand-made BufferGeometry (no PlaneGeometry or built-in geometry for terrain)
2. Grid of 128x128 vertices
3. 20x20 units in the XZ plane, centered at origin
4. Height y = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
5. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
6. computeVertexNormals()
7. Vertex colors by height (green low, brown middle, white high)
8. MeshStandardMaterial with vertexColors: true
9. AmbientLight + DirectionalLight
10. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
11. Exposed as (window as any).__controls = controls
12. Camera above terrain at an angle, whole terrain visible

Let me think about the grid:
- 128x128 vertices means 127x127 cells
- 20x20 units in XZ plane, centered at origin
- So X goes from -10 to +10, Z goes from -10 to +10
- Spacing = 20 / 127

For the height function:
- 3 sine/cosine layers with different frequencies
- Amplitude about 2 total

For the index buffer:
- Two triangles per cell
- Winding so faces point UP (+Y)
- For a quad with vertices (i,j), (i+1,j), (i,j+1), (i+1,j+1)
- Triangle 1: (i,j), (i+1,j), (i+1,j+1)
- Triangle 2: (i,j), (i+1,j+1), (i,j+1)
- Wait, I need to think about the winding order for upward-facing normals.

Let me define the grid. Vertex at row `row` and column `col`:
- x = -10 + col * (20/127)
- z = -10 + row * (20/127)

For a cell at (row, col), the four corners are:
- (row, col) -> index = row * 128 + col
- (row, col+1) -> index = row * 128 + col + 1
- (row+1, col) -> index = (row+1) * 128 + col
- (row+1, col+1) -> index = (row+1) * 128 + col + 1

For upward-facing normals with counter-clockwise winding (Three.js uses CCW as front face by default):

Looking from above (+Y looking down at -Y direction), the vertices in XZ plane:
- (row, col) is at some (x, z) position
- (row, col+1) is to the right (+x)
- (row+1, col) is "forward" (+z)

For CCW winding when viewed from above:
- Triangle 1: (row, col), (row+1, col), (row+1, col+1) — or
- Triangle 1: (row, col), (row, col+1), (row+1, col+1)

Let me think more carefully. In Three.js, the front face is CCW when viewed from the front. For upward-facing (+Y), we're looking from above.

In the XZ plane, with X to the right and Z going "into the screen" (or toward the viewer depending on convention):

Actually, let me just think of it in terms of the right-hand rule. The normal points in the direction of (v1 - v0) × (v2 - v0).

Let's say:
- v0 = (row, col) at position (x0, y0, z0)
- v1 = (row, col+1) at position (x0+dx, y1, z0)
- v2 = (row+1, col) at position (x0, y2, z0+dz)

For triangle (v0, v1, v2):
- (v1 - v0) is approximately (dx, 0, 0)
- (v2 - v0) is approximately (0, 0, dz)
- Cross product: (dx, 0, 0) × (0, 0, dz) = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)

That points in -Y direction. So that's wrong.

Let me try (v0, v2, v1):
- (v2 - v0) is approximately (0, 0, dz)
- (v1 - v0) is approximately (dx, 0, 0)
- Cross product: (0, 0, dz) × (dx, 0, 0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0)

That points in +Y direction. 

So for each cell (row, col):
- Triangle 1: (row, col), (row+1, col), (row, col+1)
- Triangle 2: (row, col+1), (row+1, col), (row+1, col+1)

Let me verify triangle 2:
- v0 = (row, col+1) at (x0+dx, y, z0)
- v1 = (row+1, col) at (x0, y, z0+dz)
- v2 = (row+1, col+1) at (x0+dx, y, z0+dz)

(v1 - v0) ≈ (-dx, 0, dz)
(v2 - v0) ≈ (0, 0, dz)
Cross: (-dx, 0, dz) × (0, 0, dz) = (0*dz - dz*0, dz*0 - (-dx)*dz, (-dx)*0 - 0*0) = (0, dx*dz, 0)

Yes, +Y. Good.

Now for colors:
- Green low, brown middle, white high
- I'll normalize the height and interpolate between colors

Let me write the code:

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
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
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

// Height function: 3 layers of sine/cosine
function getHeight(x: number, z: number): number {
    const h1 = Math.sin(x * 0.8) * Math.cos(z * 0.6) * 0.8;
    const h2 = Math.sin(x * 1.5 + 1.0) * Math.cos(z * 1.2 + 0.5) * 0.6;
    const h3 = Math.sin(x * 3.0 + 2.0) * Math.cos(z * 2.5 + 1.5) * 0.4;
    return h1 + h2 + h3; // amplitude about 2
}

// Color interpolation
const colorLow = new THREE.Color(0x2d5a27);    // green
const colorMid = new THREE.Color(0x8b6914);    // brown
const colorHigh = new THREE.Color(0xffffff);   // white

function getColor(h: number, out: THREE.Color): void {
    // Normalize h to 0-1 range (h is roughly -2 to 2)
    const t = (h + 2) / 4;
    if (t < 0.5) {
        const f = t / 0.5;
        out.copy(colorLow).lerp(colorMid, f);
    } else {
        const f = (t - 0.5) / 0.5;
        out.copy(colorMid).lerp(colorHigh, f);
    }
}

const tmpColor = new THREE.Color();

for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
        const idx = row * GRID + col;
        const x = -HALF + col * STEP;
        const z = -HALF + row * STEP;
        const y = getHeight(x, z);
        
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        
        getColor(y, tmpColor);
        colors[idx * 3] = tmpColor.r;
        colors[idx * 3 + 1] = tmpColor.g;
        colors[idx * 3 + 2] = tmpColor.b;
    }
}

// Index buffer
const cellCount = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(cellCount * 6);
let i = 0;
for (let row = 0; row < GRID - 1; row++) {
    for (let col = 0; col < GRID - 1; col++) {
        const a = row * GRID + col;
        const b = row * GRID + col + 1;
        const c = (row + 1) * GRID + col;
        const d = (row + 1) * GRID + col + 1;
        
        // Triangle 1: a, c, b (upward facing)
        indices[i++] = a;
        indices[i++] = c;
        indices[i++] = b;
        
        // Triangle 2: b, c, d (upward facing)
        indices[i++] = b;
        indices[i++] = c;
        indices[i++] = d;
    }
}

// Geometry
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

// Render loop
let ready = false;
renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, let me double-check the winding. I defined:
- a = (row, col)
- b = (row, col+1)  -> right
- c = (row+1, col)  -> "down" in grid (toward +z)
- d = (row+1, col+1) -> diagonal

Triangle 1: a, c, b
- v0 = a at (x0, y0, z0)
- v1 = c at (x0, y1, z0+dz)
- v2 = b at (x0+dx, y2, z0)

(v1-v0) ≈ (0, 0, dz)
(v2-v0) ≈ (dx, 0, 0)
Cross: (0, 0, dz) × (dx, 0, 0) = (0*0 - dz*0, dz*dx - 0*0, 0*0 - 0*dx) = (0, dz*dx, 0) → +Y ✓

Triangle 2: b, c, d
- v0 = b at (x0+dx, y0, z0)
- v1 = c at (x0, y1, z0+dz)
- v2 = d at (x0+dx, y2, z0+dz)

(v1-v0) ≈ (-dx, 0, dz)
(v2-v0) ≈ (0, 0, dz)
Cross: (-dx, 0, dz) × (0, 0, dz) = (0*dz - dz*0, dz*0 - (-dx)*dz, (-dx)*0 - 0*0) = (0, dx*dz, 0) → +Y ✓

Great, the winding is correct.

Let me also make sure the code compiles with `tsc --strict`. I need to be careful about types. The `Float32Array` and `Uint32Array` should be fine. The `BufferAttribute` constructor should accept them.

Actually, I should double-check: `new THREE.BufferAttribute(indices, 1)` where indices is `Uint32Array` - this should work fine.

One thing I want to verify - `setIndex` accepts a `BufferAttribute` or an array. Let me use `new THREE.BufferAttribute(indices, 1)` which is a `BufferAttribute<number>` - actually it's `BufferAttribute` which takes `TypedArray`. That should be fine.

Let me also make sure I'm not using any implicit `any` or other strict mode issues. The `getColor` function takes a `THREE.Color` and writes to it, that's fine.

I think the code is complete and correct. Let me finalize it.
