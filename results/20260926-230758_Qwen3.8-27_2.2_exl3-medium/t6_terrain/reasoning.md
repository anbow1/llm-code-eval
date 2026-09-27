The user wants a complete TypeScript file that creates a procedural terrain using a hand-made BufferGeometry. Let me plan this out:

1. Grid of 128x128 vertices (so 128*128 = 16384 vertices)
2. 20x20 units in XZ plane, centered at origin (so -10 to 10 in X and Z)
3. Height = sum of 3 sine/cosine layers with different frequencies, amplitude about 2
4. Index buffer with two triangles per grid cell, winding so faces point UP (+Y)
5. computeVertexNormals()
6. Vertex colors by height (green low, brown middle, white high)
7. MeshStandardMaterial with vertexColors: true
8. AmbientLight + DirectionalLight
9. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
10. Camera above terrain at an angle, whole terrain visible
11. WebGLRenderer appended to document.body
12. Window resize handling
13. setAnimationLoop for render loop
14. Expose __scene, __camera, __renderer, __controls, __ready

Let me think about the geometry:
- 128x128 vertices
- XZ plane from -10 to 10 (20 units)
- Spacing: 20/127 ≈ 0.1575 (since we go from vertex 0 to vertex 127)
- Actually, let me think: 128 vertices spanning 20 units. The spacing is 20/127 ≈ 0.1575.
- Position: x = -10 + i * (20/127), z = -10 + j * (20/127)

For the height function:
- 3 sine/cosine layers with different frequencies
- Amplitude about 2 total
- e.g., sin(x * 0.5) * 0.8 + cos(z * 0.7) * 0.7 + sin((x+z) * 0.3) * 0.5
- Total max amplitude ≈ 2.0

For the index buffer:
- Each cell (i, j) has 4 vertices: (i,j), (i+1,j), (i,j+1), (i+1,j+1)
- Two triangles per cell
- For faces pointing UP (+Y), we need the vertices to be in counter-clockwise order when viewed from above
- Triangle 1: (i,j), (i+1,j), (i+1,j+1) - let me check winding
- Triangle 2: (i,j), (i+1,j+1), (i,j+1)

Wait, let me think about winding. In Three.js, the default front face is counter-clockwise (CCW) when viewed from the front. For a face pointing UP (+Y), we need the vertices to be CCW when viewed from above (looking down in -Y direction).

Let me set up coordinates:
- v0 = (i, j) = bottom-left
- v1 = (i+1, j) = bottom-right
- v2 = (i, j+1) = top-left
- v3 = (i+1, j+1) = top-right

Looking from above (down -Y), the X axis goes right, Z axis goes... wait, in Three.js, Z is "into the screen" by default. Let me think in terms of the actual positions.

Position: x goes from -10 to 10, z goes from -10 to 10.

If I'm looking from above (positive Y looking down), X goes to the right, Z goes... in standard Three.js, +Z is towards the viewer. So from above, +X is right, +Z is towards the viewer (which in a top-down view would be "down" on screen).

For CCW winding (front face), looking from above:
- Triangle 1: v0, v1, v3 (bottom-left, bottom-right, top-right) - this goes right, then up-right, which is CCW when viewed from above? Let me verify.

Actually, let me use the cross product test. For a face to point in +Y direction, the normal should be (0, 1, 0) or close to it.

For triangle (v0, v1, v3):
- v0 = (x0, y0, z0)
- v1 = (x1, y1, z1)
- v3 = (x2, y2, z2)

Edge1 = v1 - v0, Edge2 = v3 - v0
Normal = Edge1 × Edge2

If v0 = (0, 0, 0), v1 = (1, 0, 0), v3 = (1, 0, 1):
Edge1 = (1, 0, 0)
Edge2 = (1, 0, 1)
Cross = (0*1 - 0*0, 0*1 - 1*1, 1*0 - 0*1) = (0, -1, 0)

That points DOWN (-Y). So I need to swap the order.

For triangle (v0, v3, v1):
Edge1 = v3 - v0 = (1, 0, 1)
Edge2 = v1 - v0 = (1, 0, 0)
Cross = (0*0 - 1*0, 1*1 - 1*0, 0*0 - 1*1) = (0, 1, -1)

Hmm, that's not purely +Y but it has a +Y component. Actually for a flat grid it would be (0, 1, 0). Let me redo:

v0 = (0, 0, 0), v1 = (1, 0, 0), v3 = (1, 0, 1)

Triangle (v0, v3, v1):
Edge1 = v3 - v0 = (1, 0, 1)
Edge2 = v1 - v0 = (1, 0, 0)
Normal = Edge1 × Edge2 = (0*0 - 1*0, 1*1 - 1*0, 0*0 - 1*1) = (0, 1, -1)

Hmm, that's not quite right. Let me be more careful.

Cross product: a × b = (a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x)

a = (1, 0, 1), b = (1, 0, 0)
a × b = (0*0 - 1*0, 1*1 - 1*0, 1*0 - 0*1) = (0, 1, 0) ✓

So (v0, v3, v1) gives normal (0, 1, 0) pointing UP. 

For the second triangle: (v1, v3, v2)
v1 = (1, 0, 0), v3 = (1, 0, 1), v2 = (0, 0, 1)
a = v3 - v1 = (0, 0, 1)
b = v2 - v1 = (-1, 0, 1)
a × b = (0*1 - 1*0, 1*(-1) - 0*1, 0*0 - 0*(-1)) = (0, -1, 0)

That points DOWN. Let me try (v1, v2, v3):
a = v2 - v1 = (-1, 0, 1)
b = v3 - v1 = (0, 0, 1)
a × b = (0*1 - 1*0, 1*0 - (-1)*1, (-1)*0 - 0*0) = (0, 1, 0) ✓

So the two triangles per cell are:
- Triangle 1: v0, v3, v1 → indices: i*128+j, (i+1)*128+(j+1), (i+1)*128+j
- Triangle 2: v1, v2, v3 → indices: (i+1)*128+j, i*128+(j+1), (i+1)*128+(j+1)

Wait, let me re-index. Vertex (i, j) has index i * 128 + j (row-major, i is the X index, j is the Z index).

Actually, let me use: index = i * 128 + j where i is the X-direction index (0 to 127) and j is the Z-direction index (0 to 127).

v0 = vertex(i, j) = index i*128 + j
v1 = vertex(i+1, j) = index (i+1)*128 + j
v2 = vertex(i, j+1) = index i*128 + (j+1)
v3 = vertex(i+1, j+1) = index (i+1)*128 + (j+1)

Triangle 1: v0, v3, v1 → [i*128+j, (i+1)*128+(j+1), (i+1)*128+j]
Triangle 2: v1, v2, v3 → [(i+1)*128+j, i*128+(j+1), (i+1)*128+(j+1)]

Number of cells: 127 * 127 = 16129
Number of triangles: 16129 * 2 = 32258
Number of indices: 32258 * 3 = 96774

For vertex colors:
- Green at low heights
- Brown at middle heights
- White at high heights

I'll create a gradient. The height range is roughly -2 to +2 (sum of 3 sines with amplitudes summing to about 2).

Let me define:
- t = (height + 2) / 4 (normalizes to 0-1)
- Low (t=0): green (0, 0.5, 0)
- Middle (t=0.5): brown (0.5, 0.3, 0.1)
- High (t=1): white (1, 1, 1)

I'll interpolate:
- t < 0.5: lerp green to brown
- t >= 0.5: lerp brown to white

Camera position:
- Terrain is 20x20, height about ±2
- Camera should be above and at an angle
- Maybe position at (15, 15, 15) looking at origin
- Or (12, 10, 12)

Let me go with camera at (15, 12, 15) looking at (0, 0, 0). That should show the whole terrain.

Let me write the code now.

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Terrain geometry
const GRID = 128;
const SIZE = 20;
const SPACING = SIZE / (GRID - 1);
const VERT_COUNT = GRID * GRID;
const CELL_COUNT = (GRID - 1) * (GRID - 1);
const TRI_COUNT = CELL_COUNT * 2;
const INDEX_COUNT = TRI_COUNT * 3;

const positions = new Float32Array(VERT_COUNT * 3);
const colors = new Float32Array(VERT_COUNT * 3);
const indices = new Uint32Array(INDEX_COUNT);

// Height function: 3 sine/cosine layers
function height(x: number, z: number): number {
    const h1 = Math.sin(x * 0.5) * 0.8;
    const h2 = Math.cos(z * 0.7) * 0.7;
    const h3 = Math.sin((x + z) * 0.3) * 0.5;
    return h1 + h2 + h3;
}

// Build vertices
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        const x = -SIZE / 2 + i * SPACING;
        const z = -SIZE / 2 + j * SPACING;
        const y = height(x, z);
        
        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        
        // Color by height
        const t = (y + 2) / 4; // normalize to 0-1
        let r: number, g: number, b: number;
        if (t < 0.5) {
            const f = t / 0.5;
            r = 0.1 + f * 0.4;   // 0.1 -> 0.5
            g = 0.5 - f * 0.2;   // 0.5 -> 0.3
            b = 0.0 + f * 0.1;   // 0.0 -> 0.1
        } else {
            const f = (t - 0.5) / 0.5;
            r = 0.5 + f * 0.5;   // 0.5 -> 1.0
            g = 0.3 + f * 0.7;   // 0.3 -> 1.0
            b = 0.1 + f * 0.9;   // 0.1 -> 1.0
        }
        
        colors[idx * 3 + 0] = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;
    }
}

// Build indices
let indexPtr = 0;
for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID - 1; j++) {
        const v0 = i * GRID + j;
        const v1 = (i + 1) * GRID + j;
        const v2 = i * GRID + (j + 1);
        const v3 = (i + 1) * GRID + (j + 1);
        
        // Triangle 1: v0, v3, v1 (normal points UP)
        indices[indexPtr++] = v0;
        indices[indexPtr++] = v3;
        indices[indexPtr++] = v1;
        
        // Triangle 2: v1, v2, v3 (normal points UP)
        indices[indexPtr++] = v1;
        indices[indexPtr++] = v2;
        indices[indexPtr++] = v3;
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(indices);
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
controls.update();

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
renderer.setAnimationLoop((time: number) => {
    controls.update();
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All variables are typed
- No implicit any
- The `time` parameter in setAnimationLoop - it's a number, that's fine
- `window.addEventListener` - fine
- The `(window as any)` casts - fine

Let me also make sure the imports are correct. The user said:
- `import * as THREE from 'three';`
- Addons from `'three/addons/...'`

So: `import { OrbitControls } from 'three/addons/controls/OrbitControls.js';`

I think this looks good. Let me finalize it.
