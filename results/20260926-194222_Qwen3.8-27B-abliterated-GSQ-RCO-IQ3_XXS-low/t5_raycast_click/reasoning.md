The user wants a complete TypeScript file that:
1. Creates a 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Clicking a cube selects it (color becomes 0xff0000), only one at a time
4. Clicking empty background clears selection
5. Uses THREE.Raycaster with NDC from canvas bounding rect
6. PerspectiveCamera looking straight at grid, whole grid visible with margin
7. No camera movement, no animation
8. AmbientLight + DirectionalLight
9. No other meshes

Let me think about the setup:
- 5x5 grid of cubes in XY plane
- "Facing the camera" means the cubes are in the XY plane, camera looks along -Z
- Gaps between them
- Let's say each cube is size 1, with gap of 0.5, so spacing is 1.5
- Grid from -3 to +3 in X and Y (positions: -3, -1.5, 0, 1.5, 3)

Camera:
- Looking straight at the grid (along -Z)
- Whole grid visible with margin
- Grid extent: from -3.5 to 3.5 (cube size 1, so edges at ±0.5 from center positions ±3)
- So grid is 7 units wide and 7 units tall
- With margin, let's say camera at z=15 with FOV that shows at least 10 units vertically
- Actually, let me calculate: if grid is 7 units tall, with margin let's say 10 units total visible height
- With FOV 50 degrees: visible height = 2 * z * tan(fov/2) = 2 * 15 * tan(25°) = 2 * 15 * 0.4663 = 14 units. That's plenty of margin.
- Or simpler: camera at z=10, FOV=45: 2*10*tan(22.5°) = 2*10*0.4142 = 8.28 units. Grid is 7 units, so about 0.64 margin on each side. That's decent.
- Let me use z=12, FOV=45: 2*12*tan(22.5°) = 2*12*0.4142 = 9.94. Grid is 7 units, so about 1.47 margin each side. Good.

For the click handling:
- Use Raycaster
- Compute NDC from canvas bounding rect
- Check if intersection with any cube
- If yes, select that cube (set its material color to 0xff0000, reset previous)
- If no, clear selection

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Cubes
const cubeSize = 1.0;
const spacing = 1.5; // gap of 0.5 between cubes
const gridSize = 5;
const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    const x = (i - 2) * spacing;
    const y = (j - 2) * spacing;
    cube.position.set(x, y, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

// Selection
let selectedCube: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();

function onSelect(event: MouseEvent): void {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  const mouseNDC = new THREE.Vector2(x, y);
  raycaster.setFromCamera(mouseNDC, camera);
  
  const intersects = raycaster.intersectObjects(cubes, false);
  
  if (intersects.length > 0) {
    const clickedCube = intersects[0].object as THREE.Mesh;
    if (selectedCube !== null) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    }
    if (selectedCube === clickedCube) {
      // Already selected, keep it selected? Or toggle? The spec says "clicking a cube selects it"
      // I'll keep it selected (set it to red)
      selectedCube = clickedCube;
    } else {
      selectedCube = clickedCube;
    }
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
  } else {
    if (selectedCube !== null) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      selectedCube = null;
    }
  }
}

canvas.addEventListener... wait, I need to use renderer.domElement.addEventListener

Actually let me re-read: "Clicking a cube selects it: its material color becomes 0xff0000. Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff."

So clicking an already selected cube keeps it selected (or maybe re-selects it). I'll just set it to red.

Let me also handle resize.

For the animation loop, I just need to render. No cube animation, no camera movement.

Let me also make sure `__ready` is set after first frame.

Let me refine:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

const cubeSize = 1.0;
const spacing = 1.5;
const gridSize = 5;
const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set((i - 2) * spacing, (j - 2) * spacing, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

let selectedCube: THREE.Mesh | null = null;
const raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const hits = raycaster.intersectObjects(cubes, false);
  
  if (selectedCube !== null) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
  }
  
  if (hits.length > 0) {
    selectedCube = hits[0].object as THREE.Mesh;
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
  } else {
    selectedCube = null;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // No animation of cubes, just render
  renderer.render(scene, camera);
  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All variables are typed
- The event listener parameter is typed
- No implicit any

The `event: MouseEvent` in the addEventListener callback - that should be fine since `addEventListener('click', ...)` on an HTMLCanvasElement will infer the parameter type. Actually, in strict mode, the callback parameter should be properly typed. Let me use `(event: MouseEvent)` explicitly.

Actually, `renderer.domElement.addEventListener('click', (event: MouseEvent) => { ... })` - this should work fine in strict mode because the type of the callback parameter is already defined by the DOM API.

Let me also make sure I'm not using `delta` since there's no animation. Actually the rule says "Motion must use delta/elapsed time, not frame counts." But there's no motion. I'll still get delta for completeness but it's fine if I don't use it, or I can just not use it. Actually, let me just not create the clock at all since there's no animation. But the rule says to use delta/elapsed time for motion - since there's no motion, I don't need it. But to be safe, I'll include it.

Actually wait, re-reading: "Motion must use delta/elapsed time, not frame counts." This is a rule about how to handle motion if there is any. Since there's no motion, I can just render. But I'll include the clock for good measure.

Let me finalize.
