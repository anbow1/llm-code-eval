The user wants a complete TypeScript file that creates a procedural terrain using a hand-made BufferGeometry. Let me plan this out:

1. Create a 128x128 grid of vertices in the XZ plane, 20x20 units centered at origin
2. Height function: sum of 3 sine/cosine layers with different frequencies, amplitude ~2
3. Index buffer: two triangles per grid cell, winding so faces point UP (+Y)
4. computeVertexNormals()
5. Vertex colors by height: green low, brown middle, white high
6. MeshStandardMaterial with vertexColors: true
7. AmbientLight + DirectionalLight
8. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
9. Camera above terrain at an angle, whole terrain visible
10. Standard setup: renderer, resize handling, setAnimationLoop, expose __scene, __camera, __renderer, __controls, __ready

Let me think about the winding for faces pointing UP (+Y):
- For a quad with vertices at (i,j), (i+1,j), (i+1,j+1), (i,j+1)
- Triangle 1: (i,j), (i+1,j), (i+1,j+1) - but I need to check winding
- Triangle 2: (i,j), (i+1,j+1), (i,j+1)

For faces pointing UP (+Y), the normal should point in +Y direction. Using the right-hand rule, if we look from above (+Y), the vertices should go counter-clockwise.

Let me think about the vertex positions:
- x goes from -10 to 10 (20 units)
- z goes from -10 to 10 (20 units)
- 128 vertices per axis
- Spacing: 20/127 between vertices (since we have 128 vertices covering 20 units)

Actually, let me reconsider. 128 vertices means 127 intervals. So spacing = 20/127.

Vertex positions:
- x = -10 + i * (20/127) for i = 0..127
- z = -10 + j * (20/127) for j = 0..127

Height function: sum of 3 sine/cosine layers
- h1 = sin(x * 0.5) * cos(z * 0.3) * 1.0
- h2 = sin(x * 1.2 + z * 0.8) * 0.7
- h3 = cos(x * 2.0) * sin(z * 1.5) * 0.3
- Total amplitude ~2, so maybe scale it

Let me make it so the total amplitude is about 2:
- h1 = sin(x * 0.8) * cos(z * 0.6) * 1.0
- h2 = sin(x * 1.5 + z * 1.2) * 0.7
- h3 = cos(x * 2.5) * sin(z * 2.0) * 0.3
- Max possible: 1.0 + 0.7 + 0.3 = 2.0

For the index buffer:
- Vertex index for row j, column i: j * 128 + i
- For cell (i, j):
  - v0 = j * 128 + i
  - v1 = j * 128 + (i+1)
  - v2 = (j+1) * 128 + (i+1)
  - v3 = (j+1) * 128 + i

For faces pointing UP (+Y), I need the normal to point up. Using the cross product:
- For triangle (v0, v1, v2): (v1-v0) × (v2-v0) should point up
- v0 is at (x_i, y_j, z_j), v1 is at (x_{i+1}, y_j, z_j), v2 is at (x_{i+1}, y_{j+1}, z_{j+1})
- (v1-v0) = (dx, 0, 0) approximately
- (v2-v0) = (dx, dy, dz) approximately
- Cross product: (0*dz - 0*dy, 0*dx - dx*dz, dx*dy - 0*dx) = (0, -dx*dz, dx*dy)

Hmm, that's not quite right. Let me think more carefully.

Actually, for a flat terrain at y=0:
- v0 = (x_i, 0, z_j)
- v1 = (x_{i+1}, 0, z_j)
- v2 = (x_{i+1}, 0, z_{j+1})
- v3 = (x_i, 0, z_{j+1})

Triangle 1: v0, v1, v2
- (v1-v0) = (dx, 0, 0)
- (v2-v0) = (dx, 0, dz)
- Cross: (0*dz - 0*0, 0*dx - dx*dz, dx*0 - 0*dx) = (0, -dx*dz, 0)

That points DOWN (negative Y). So I need to reverse the winding.

Triangle 1: v0, v2, v1 (reverse)
- (v2-v0) = (dx, 0, dz)
- (v1-v0) = (dx, 0, 0)
- Cross: (0*0 - dz*dx, dz*dx - 0*0, dx*0 - 0*dx) = (-dx*dz, dx*dz, 0)

Hmm, that's not clean. Let me try:
Triangle 1: v0, v2, v1
- edge1 = v2 - v0 = (dx, 0, dz)
- edge2 = v1 - v0 = (dx, 0, 0)
- normal = edge1 × edge2 = (0*0 - dz*dx, dz*dx - 0*0, dx*0 - 0*dx) = (-dx*dz, dx*dz, 0)

That's not purely +Y. Let me reconsider.

Actually wait, for a flat plane:
- v0 = (0, 0, 0)
- v1 = (1, 0, 0)
- v2 = (1, 0, 1)
- v3 = (0, 0, 1)

Triangle (v0, v1, v2):
- edge1 = v1 - v0 = (1, 0, 0)
- edge2 = v2 - v0 = (1, 0, 1)
- normal = edge1 × edge2 = (0*1 - 0*0, 0*1 - 1*1, 1*0 - 0*1) = (0, -1, 0) → points DOWN

Triangle (v0, v2, v1):
- edge1 = v2 - v0 = (1, 0, 1)
- edge2 = v1 - v0 = (1, 0, 0)
- normal = edge1 × edge2 = (0*0 - 1*1, 1*1 - 1*0, 1*0 - 0*1) = (-1, 1, 0)

Hmm, that's not right either. Let me be more careful.

Cross product of a × b where a = (ax, ay, az), b = (bx, by, bz):
(a × b) = (ay*bz - az*by, az*bx - ax*bz, ax*by - ay*bx)

Triangle (v0, v1, v2) with v0=(0,0,0), v1=(1,0,0), v2=(1,0,1):
- a = v1-v0 = (1,0,0)
- b = v2-v0 = (1,0,1)
- a×b = (0*1 - 0*0, 0*1 - 1*1, 1*0 - 0*1) = (0, -1, 0) → DOWN

Triangle (v0, v2, v1):
- a = v2-v0 = (1,0,1)
- b = v1-v0 = (1,0,0)
- a×b = (0*0 - 1*0, 1*1 - 1*0, 1*0 - 0*1) = (0, 1, 0) → UP ✓

So for each cell:
- Triangle 1: v0, v2, v1 (i.e., j*128+i, (j+1)*128+(i+1), j*128+(i+1))
- Triangle 2: v0, v3, v2 (i.e., j*128+i, (j+1)*128+i, (j+1)*128+(i+1))

Let me verify Triangle 2:
- v0=(0,0,0), v3=(0,0,1), v2=(1,0,1)
- a = v3-v0 = (0,0,1)
- b = v2-v0 = (1,0,1)
- a×b = (0*1 - 1*0, 1*1 - 0*1, 0*0 - 0*1) = (0, 1, 0) → UP ✓

So the indices for cell (i, j):
- v0 = j * 128 + i
- v1 = j * 128 + (i+1)
- v2 = (j+1) * 128 + (i+1)
- v3 = (j+1) * 128 + i

Triangle 1: v0, v2, v1
Triangle 2: v0, v3, v2

Number of triangles: 127 * 127 * 2 = 32258
Number of indices: 32258 * 3 = 96774

Now for vertex colors by height:
- Low (y near -2): green
- Middle (y near 0): brown
- High (y near +2): white

I'll interpolate. Let me define:
- y < 0: lerp from green to brown based on y/2
- y >= 0: lerp from brown to white based on y/2

Actually, let me think about the range. The height is sum of 3 sine/cosine terms with max amplitude 2. So y ranges from -2 to +2.

Color mapping:
- y = -2: green (0, 0.4, 0)
- y = 0: brown (0.5, 0.3, 0.1)
- y = +2: white (1, 1, 1)

I'll do:
- t = (y + 2) / 4 (0 to 1)
- If t < 0.5: lerp green to brown
- If t >= 0.5: lerp brown to white

Camera position: above the terrain at an angle. Terrain is 20x20, height ±2.
- Camera at (15, 12, 15) looking at origin should work well.

Let me write the code now.

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Terrain
const GRID = 128;
const SIZE = 20;
const SPACING = SIZE / (GRID - 1);

const vertexCount = GRID * GRID;
const triangleCount = (GRID - 1) * (GRID - 1) * 2;
const positions = new Float32Array(vertexCount * 3);
const colors = new Float32Array(vertexCount * 3);
const indices = new Uint32Array(triangleCount * 3);

// Height function
function height(x: number, z: number): number {
    const h1 = Math.sin(x * 0.8) * Math.cos(z * 0.6) * 1.0;
    const h2 = Math.sin(x * 1.5 + z * 1.2) * 0.7;
    const h3 = Math.cos(x * 2.5) * Math.sin(z * 2.0) * 0.3;
    return h1 + h2 + h3;
}

// Fill positions and colors
for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
        const idx = j * GRID + i;
        const x = -SIZE / 2 + i * SPACING;
        const z = -SIZE / 2 + j * SPACING;
        const y = height(x, z);

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Color by height
        const t = (y + 2) / 4; // 0 to 1
        let r: number, g: number, b: number;
        if (t < 0.5) {
            const s = t / 0.5;
            r = 0.0 + s * 0.5;
            g = 0.4 + s * (-0.1);
            b = 0.0 + s * 0.1;
        } else {
            const s = (t - 0.5) / 0.5;
            r = 0.5 + s * 0.5;
            g = 0.3 + s * 0.7;
            b = 0.1 + s * 0.9;
        }
        colors[idx * 3] = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;
    }
}

// Fill indices
let idxPtr = 0;
for (let j = 0; j < GRID - 1; j++) {
    for (let i = 0; i < GRID - 1; i++) {
        const v0 = j * GRID + i;
        const v1 = j * GRID + (i + 1);
        const v2 = (j + 1) * GRID + (i + 1);
        const v3 = (j + 1) * GRID + i;

        // Triangle 1: v0, v2, v1 (winding for +Y normal)
        indices[idxPtr] = v0;
        indices[idxPtr + 1] = v2;
        indices[idxPtr + 2] = v1;
        idxPtr += 3;

        // Triangle 2: v0, v3, v2
        indices[idxPtr] = v0;
        indices[idxPtr + 1] = v3;
        indices[idxPtr + 2] = v2;
        idxPtr += 3;
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
- The `time` parameter in setAnimationLoop - it's a number, so that's fine
- `document.body.appendChild` - fine
- The Float32Array and Uint32Array are fine

Actually, let me double-check the winding. Let me re-verify with a concrete example:

Cell (0,0): v0=(0,0,0), v1=(1,0,0), v2=(1,0,1), v3=(0,0,1) (assuming flat)

Triangle 1: v0, v2, v1
- a = v2 - v0 = (1, 0, 1)
- b = v1 - v0 = (1, 0, 0)
- a × b = (0*0 - 1*0, 1*1 - 1*0, 1*0 - 0*1) = (0, 1, 0) ✓ UP

Triangle 2: v0, v3, v2
- a = v3 - v0 = (0, 0, 1)
- b = v2 - v0 = (1, 0, 1)
- a × b = (0*1 - 1*0, 1*1 - 0*1, 0*0 - 0*1) = (0, 1, 0) ✓ UP

Great, the winding is correct.

Let me also make sure the camera can see the whole terrain. The terrain spans from -10 to 10 in X and Z, and -2 to +2 in Y. Camera at (15, 12, 15) looking at origin with 50° FOV should work fine.

One more thing - I should make sure the `time` parameter is used or at least not causing issues. In `setAnimationLoop`, the callback receives a DOMHighResTimeStamp (number). I'm not using it for motion (the user said "Motion must use delta/elapsed time, not frame counts" but there's no actual motion in this scene - it's static terrain with orbit controls). The controls.update() handles the animation. That should be fine.

Actually, re-reading the requirement: "Motion must use delta/elapsed time, not frame counts." Since there's no motion per se (just orbit controls which handle their own timing), this is fine. The render loop just renders and updates controls.

Let me finalize the code.
