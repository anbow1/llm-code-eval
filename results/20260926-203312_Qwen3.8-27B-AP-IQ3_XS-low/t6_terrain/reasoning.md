Let me break down the requirements:

1. Procedural terrain from hand-made BufferGeometry (NOT PlaneGeometry)
2. Grid of 128x128 vertices, 20x20 units in XZ plane, centered at origin
3. Height = sum of 3 sine/cosine layers with different frequencies, amplitude ~2
4. Index buffer via setIndex: two triangles per grid cell, winding so faces point UP (+Y)
5. computeVertexNormals()
6. Vertex colors by height (green low, brown middle, white high)
7. MeshStandardMaterial with vertexColors: true
8. AmbientLight + DirectionalLight
9. OrbitControls from 'three/addons/controls/OrbitControls.js', damping enabled, updated every frame
10. Camera above terrain at an angle, whole terrain visible
11. Standard requirements: WebGLRenderer, resize handling, setAnimationLoop, expose scene/camera/renderer/controls, __ready flag

Let me think about the grid:
- 128x128 vertices = 128 vertices along X and 128 along Z
- Span: 20 units, so spacing = 20 / 127 ≈ 0.1575 units
- X and Z range: -10 to 10

Vertices:
- For row i (0 to 127), col j (0 to 127):
  - x = -10 + i * (20 / 127)
  - z = -10 + j * (20 / 127)
  - y = height(x, z)

Height function: sum of 3 sine/cosine layers
- y = 2 * sin(x * 0.5) * cos(z * 0.3) + 1.5 * sin(x * 1.2 + z * 0.8) + 0.8 * cos(x * 2.5 - z * 1.7)
- This gives amplitude roughly 2 (the sum of amplitudes is about 4.3, but actual peaks vary)

Wait, "amplitude about 2" - let me interpret this as the total height range being about ±2 or the overall amplitude being about 2. Let me make the layers sum to give a reasonable terrain with peaks around 2 and valleys around -2.

Let me use:
- y = 2.0 * sin(x * 0.5) * cos(z * 0.3)
- y += 1.0 * sin(x * 1.2 + z * 0.8)
- y += 0.5 * cos(x * 2.5 - z * 1.7)

Max possible: 2 + 1 + 0.5 = 3.5, but typical range would be around ±2. That should work.

Index buffer:
- For each cell (i, j) where i goes 0 to 126, j goes 0 to 126:
  - v0 = i * 128 + j (bottom-left)
  - v1 = v0 + 1 (bottom-right)
  - v2 = v0 + 128 (top-left)
  - v3 = v2 + 1 (top-right)
  
Wait, I need to think about the indexing more carefully. Let me define:
- i is the row (X direction), j is the column (Z direction)
- vertex index = i * 128 + j

For cell (i, j) (i from 0 to 126, j from 0 to 126):
- v00 = i * 128 + j         (x_i, z_j)
- v10 = (i+1) * 128 + j   (x_{i+1}, z_j)
- v01 = i * 128 + (j+1)   (x_i, z_{j+1})
- v11 = (i+1) * 128 + (j+1) (x_{i+1}, z_{j+1})

For faces pointing UP (+Y), I need counter-clockwise winding when viewed from above.

Looking from above (positive Y looking down at XZ plane):
- X increases to the right
- Z increases... hmm, in Three.js, the coordinate system is right-handed. X right, Y up, Z towards viewer.

So from above looking down:
- X goes right
- Z goes "up" in the view (towards viewer when looking down)

For a quad with vertices:
- v00 (bottom-left when looking from above)
- v10 (bottom-right)
- v01 (top-left)
- v11 (top-right)

Wait, let me reconsider. In the XZ plane:
- v00 is at (x_i, z_j) - this is the "southwest" corner
- v10 is at (x_{i+1}, z_j) - "southeast"
- v01 is at (x_i, z_{j+1}) - "northwest"
- v11 is at (x_{i+1}, z_{j+1}) - "northeast"

For faces pointing UP (+Y), when viewed from above:
- Triangle 1: v00 -> v10 -> v11 (counter-clockwise from above? Let me check)
  - v00 is SW, v10 is SE, v11 is NE
  - From above: SW -> SE -> NE goes counter-clockwise? 
  - SW is bottom-left, SE is bottom-right, NE is top-right
  - Going SW -> SE -> NE: right, then up-left. That's counter-clockwise from above. Yes!
  
- Triangle 2: v00 -> v11 -> v01
  - SW -> NE -> NW: diagonal up-right, then left. That's counter-clockwise from above. Yes!

Let me verify with the right-hand rule:
- Triangle 1: v00 -> v10 -> v11
  - Edge 1: v10 - v00 = (+dx, 0, 0)
  - Edge 2: v11 - v10 = (0, 0, +dz)
  - Normal = Edge1 × Edge2 = (dx, 0, 0) × (0, 0, dz) = (0*dz - 0*0, 0*0 - dx*dz, dx*0 - 0*0) = (0, -dx*dz, 0)
  
Wait that gives a -Y normal. Let me recalculate.

Cross product: a × b where a = (1, 0, 0) and b = (0, 0, 1):
a × b = (0*1 - 0*0, 0*0 - 1*1, 1*0 - 0*0) = (0, -1, 0)

That's pointing DOWN. So I need to swap the winding.

Let me try: v00 -> v11 -> v10
- Edge 1: v11 - v00 = (dx, 0, dz)
- Edge 2: v10 - v11 = (-dx, 0, 0)
- Normal = Edge1 × Edge2... hmm, let me just think about this differently.

In Three.js, the front face uses counter-clockwise winding (default). For a face to point in +Y direction, I need the vertices to be counter-clockwise when viewed from the +Y direction (looking down).

Looking from +Y down at the XZ plane:
- X axis goes to the right
- Z axis goes... in right-handed coordinates, if X is right and Y is up, then Z comes out of the screen (towards viewer). So when looking down from above, Z goes "down" in the view (away from the top of the screen).

Wait no. Let me be more careful. In Three.js right-handed system:
- X: right
- Y: up  
- Z: towards viewer (out of screen)

Looking from above (camera at +Y looking down):
- X goes right (screen right)
- Z goes... towards the viewer, which in this top-down view would be "down" on the screen (towards the bottom of the screen).

Actually, let me just use the cross product method properly.

For the normal to point in +Y direction, I need:
(v1 - v0) × (v2 - v0) should point in +Y.

Let's say v00 = (0, 0, 0), v10 = (1, 0, 0), v01 = (0, 0, 1), v11 = (1, 0, 1)

Try order v00, v01, v11:
(v01 - v00) × (v11 - v00) = (0,0,1) × (1,0,1) = (0*1 - 1*0, 1*1 - 0*1, 0*0 - 0*1) = (0, 1, 0) ✓ +Y!

Try order v00, v10, v11:
(v10 - v00) × (v11 - v00) = (1,0,0) × (1,0,1) = (0*1 - 0*0, 0*1 - 1*1, 1*0 - 0*1) = (0, -1, 0) ✗ -Y

So for the first triangle of each cell, I should use: v00, v01, v11 (or equivalently v00, v11, v01 with the other diagonal)

Wait, let me recheck: v00, v01, v11:
(v01 - v00) × (v11 - v00) = (0,0,1) × (1,0,1)
= (0*1 - 1*0, 1*1 - 0*1, 0*0 - 0*1)
= (0, 1, 0) ✓

And for the second triangle: v00, v11, v10:
(v11 - v00) × (v10 - v00) = (1,0,1) × (1,0,0)
= (0*0 - 1*0, 1*1 - 1*0, 1*0 - 0*1)
= (0, 1, 0) ✓

So the two triangles per cell are:
- Triangle 1: v00, v01, v11
- Triangle 2: v00, v11, v10

Where:
- v00 = i * 128 + j
- v10 = (i+1) * 128 + j
- v01 = i * 128 + (j+1)
- v11 = (i+1) * 128 + (j+1)

Great!

Vertex colors:
- Green at low heights
- Brown at middle heights
- White at high heights

I'll normalize the height to [0, 1] and interpolate:
- t < 0.4: green to brown
- t >= 0.4: brown to white

Or I can use a smooth blend. Let me use:
- min height ≈ -3 (approximate)
- max height ≈ 3 (approximate)

Actually let me compute the exact min/max or just use a reasonable range. The height function:
y = 2.0 * sin(x * 0.5) * cos(z * 0.3) + 1.0 * sin(x * 1.2 + z * 0.8) + 0.5 * cos(x * 2.5 - z * 1.7)

Max possible: 2 + 1 + 0.5 = 3.5
Min possible: -3.5

I'll normalize based on the actual computed heights or just use a fixed range. Let me use a fixed range of [-3.5, 3.5] for normalization.

Color interpolation:
- t = 0 (lowest): green (0, 0.6, 0)
- t = 0.5 (middle): brown (0.5, 0.3, 0.1)
- t = 1 (highest): white (1, 1, 1)

For t in [0, 0.5]: lerp green to brown
For t in [0.5, 1]: lerp brown to white

Camera position: above the terrain at an angle. Terrain is 20x20, so camera should be at maybe (15, 15, 15) looking at origin.

Let me now write the complete code.

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

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

function height(x: number, z: number): number {
  return 2.0 * Math.sin(x * 0.5) * Math.cos(z * 0.3)
       + 1.0 * Math.sin(x * 1.2 + z * 0.8)
       + 0.5 * Math.cos(x * 2.5 - z * 1.7);
}

// Positions
const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

const MIN_H = -3.5;
const MAX_H = 3.5;

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const idx = (i * GRID + j) * 3;
    const x = -SIZE / 2 + i * SPACING;
    const z = -SIZE / 2 + j * SPACING;
    const y = height(x, z);
    
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    
    // Color
    const t = (y - MIN_H) / (MAX_H - MIN_H);
    const clampedT = Math.max(0, Math.min(1, t));
    
    let r: number, g: number, b: number;
    if (clampedT < 0.5) {
      const s = clampedT / 0.5;
      r = 0 * (1 - s) + 0.5 * s;
      g = 0.6 * (1 - s) + 0.3 * s;
      b = 0 * (1 - s) + 0.1 * s;
    } else {
      const s = (clampedT - 0.5) / 0.5;
      r = 0.5 * (1 - s) + 1.0 * s;
      g = 0.3 * (1 - s) + 1.0 * s;
      b = 0.1 * (1 - s) + 1.0 * s;
    }
    
    colors[idx] = r;
    colors[idx + 1] = g;
    colors[idx + 2] = b;
  }
}

// Indices
const numCells = (GRID - 1) * (GRID - 1);
const indices = new Uint32Array(numCells * 6);

let idx = 0;
for (let i = 0; i < GRID - 1; i++) {
  for (let j = 0; j < GRID - 1; j++) {
    const v00 = i * GRID + j;
    const v10 = (i + 1) * GRID + j;
    const v01 = i * GRID + (j + 1);
    const v11 = (i + 1) * GRID + (j + 1);
    
    // Triangle 1: v00, v01, v11
    indices[idx++] = v00;
    indices[idx++] = v01;
    indices[idx++] = v11;
    
    // Triangle 2: v00, v11, v10
    indices[idx++] = v00;
    indices[idx++] = v11;
    indices[idx++] = v10;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__controls = controls;
```

Wait, I should double-check the Uint32Array size. numCells = 127 * 127 = 16129 cells, each with 6 indices = 96774 indices. That's fine.

Also, I should make sure the material is reasonable. Maybe add some roughness/metalness for better look. Let me keep it simple with just vertexColors.

Let me also make sure I'm not using `side: THREE.DoubleSide` - actually it's fine to keep it since the terrain is flat-ish and we're looking from above. But for correctness, since normals point up, we only need front side. Let me remove DoubleSide.

Actually, let me keep it as FrontSide (default) since the normals point up and we're viewing from above.

Let me finalize the code.
