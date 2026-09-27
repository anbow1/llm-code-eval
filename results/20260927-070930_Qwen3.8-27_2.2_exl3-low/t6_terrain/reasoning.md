Let me build a procedural terrain using a hand-made BufferGeometry. Let me plan this out:

1. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
   - So vertices go from -10 to 10 in X and Z
   - Spacing: 20 / 127 ≈ 0.15748...
   - Actually, let me think: 128 vertices spanning 20 units. The spacing is 20/127 if we go from -10 to 10, or 20/128 if we go from 0 to 20. Since centered at origin, it's -10 to 10, so spacing = 20/127.

2. Height function: sum of 3 sine/cosine layers with different frequencies, amplitude about 2
   - y = sin(x * f1) * a1 + cos(z * f2) * a2 + sin((x+z) * f3) * a3
   - Let me pick frequencies and amplitudes that sum to about 2 total amplitude
   - a1 = 0.8, a2 = 0.7, a3 = 0.5 → total max ~2.0

3. Index buffer: two triangles per grid cell
   - For cell (i, j) where i is 0..126, j is 0..126:
     - vertex indices: 
       - v0 = j * 128 + i
       - v1 = j * 128 + (i+1)
       - v2 = (j+1) * 128 + i
       - v3 = (j+1) * 128 + (i+1)
     - Two triangles: (v0, v1, v2) and (v1, v3, v2)
     - Wait, let me think about winding for faces pointing UP (+Y).
     - If we look from above (looking down -Y direction), the vertices should be in counter-clockwise order for the front face.
     - Actually, in Three.js, the front face is defined by counter-clockwise winding when viewed from the front.
     - For a face pointing up (+Y), viewed from above (looking in -Y direction), the vertices should be counter-clockwise.
     - Let me think: if X goes right, Z goes toward viewer (or away). Let's say X is right, Z is away from viewer.
     - Looking from above: X is right, Z is "into the screen" (away).
     - For counter-clockwise from above: v0 (bottom-left), v1 (bottom-right), v2 (top-left)
     - Wait, let me reconsider. In Three.js, front face is CCW when viewed from the front.
     - If the normal points +Y, the front is viewed from above.
     - From above, X is to the right, Z is away (into the screen).
     - CCW from above: v0 (bottom-left, small X, small Z), v1 (bottom-right, large X, small Z), v2 (top-left, small X, large Z)
     - So triangle 1: (v0, v1, v2) = (bottom-left, bottom-right, top-left)
     - Triangle 2: (v1, v3, v2) = (bottom-right, top-right, top-left)
     - Let me verify: v0=(x0,z0), v1=(x1,z0), v2=(x0,z1), v3=(x1,z1)
     - Triangle 1: v0, v1, v2 → (x0,z0), (x1,z0), (x0,z1)
     - Triangle 2: v1, v3, v2 → (x1,z0), (x1,z1), (x0,z1)
     - Normal for triangle 1: (v1-v0) × (v2-v0) = (dx, 0, 0) × (0, 0, dz) = (0, dx*dz, 0) → +Y ✓
     - Normal for triangle 2: (v3-v1) × (v2-v1) = (0, 0, dz) × (-dx, 0, dz) = (0, dx*dz, 0) → +Y ✓
     - Great, both normals point up.

4. Vertex colors by height:
   - Green (low), Brown (middle), White (high)
   - I'll interpolate based on normalized height.

5. MeshStandardMaterial with vertexColors: true

6. AmbientLight + DirectionalLight

7. OrbitControls with damping, updated every frame

8. Camera positioned above terrain at an angle, whole terrain visible

Let me write the code:

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create scene
const scene = new THREE.Scene();

// Create camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Build terrain
const SIZE = 128;
const WORLD_SIZE = 20;
const SPACING = WORLD_SIZE / (SIZE - 1);
const HALF = WORLD_SIZE / 2;

const positions: number[] = [];
const colors: number[] = [];

// Height function
function height(x: number, z: number): number {
    const h1 = Math.sin(x * 1.2) * 0.8;
    const h2 = Math.cos(z * 1.5) * 0.7;
    const h3 = Math.sin((x + z) * 0.8) * 0.5;
    return h1 + h2 + h3;
}

for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
        const x = -HALF + i * SPACING;
        const z = -HALF + j * SPACING;
        const y = height(x, z);
        positions.push(x, y, z);

        // Color by height: green low, brown middle, white high
        // Height range is roughly -2 to +2
        const t = (y + 2) / 4; // normalize to 0..1
        if (t < 0.5) {
            // green to brown
            const f = t / 0.5;
            const r = 0.2 + f * 0.5;
            const g = 0.6 - f * 0.3;
            const b = 0.1;
            colors.push(r, g, b);
        } else {
            // brown to white
            const f = (t - 0.5) / 0.5;
            const r = 0.7 + f * 0.3;
            const g = 0.3 + f * 0.7;
            const b = 0.1 + f * 0.9;
            colors.push(r, g, b);
        }
    }
}

// Index buffer
const indices: number[] = [];
for (let j = 0; j < SIZE - 1; j++) {
    for (let i = 0; i < SIZE - 1; i++) {
        const v0 = j * SIZE + i;
        const v1 = j * SIZE + (i + 1);
        const v2 = (j + 1) * SIZE + i;
        const v3 = (j + 1) * SIZE + (i + 1);
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All variables are typed
- No implicit any
- The `time` parameter in setAnimationLoop is typed as `number | undefined` by Three.js types... actually let me check. The callback for setAnimationLoop is `(time: number) => void` in most versions. Let me just use it as-is.

Actually, in strict mode, I need to be careful. Let me check if `renderer.setAnimationLoop` callback parameter is properly typed. In Three.js types, it's `SetAnimationLoopCallback` which is `(time: number) => void`. So `time` is `number`. Good.

Let me also make sure the `document.body.appendChild` works - `document.body` is `HTMLElement | null` in strict mode. I should handle that or just assert it.

Actually, in strict mode, `document.body` is `HTMLElement | null`. I can use `document.body.appendChild(renderer.domElement)` - but wait, `appendChild` on a nullable would be an error. Let me use a non-null assertion or just do it directly since in a browser `document.body` is always available.

Actually, in TypeScript strict mode, `document.body` is typed as `HTMLElement | null`. So I need to handle it. Let me use:
```typescript
document.body.appendChild(renderer.domElement);
```

Hmm, this would give an error in strict mode because `document.body` could be null. Let me use:
```typescript
document.body!.appendChild(renderer.domElement);
```

Or better:
```typescript
const body = document.body;
if (body) {
    body.appendChild(renderer.domElement);
}
```

Actually, for a browser-only file, using `!` is fine. Let me use `document.body.appendChild(renderer.domElement)` - wait, that's still an error. Let me just do:

```typescript
document.body.appendChild(renderer.domElement);
```

In strict mode, `document.body` is `HTMLElement | null`, and calling `.appendChild` on a potentially null value is an error. So I need `document.body!.appendChild(renderer.domElement)` or a guard.

Let me use the guard approach to be safe.

Actually, re-reading the TypeScript DOM lib: `document.body` is `HTMLElement | null`. So yes, I need to handle it.

Let me finalize the code. I'll use a simple approach.

One more thing - the `setAnimationLoop` callback: in Three.js, the type is:
```typescript
setAnimationLoop(callback: ((time: number) => void) | null): void
```

So the parameter is `number`, which is fine.

Let me write the final version.
