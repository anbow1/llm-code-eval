Let me break down the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera, with visible gaps between them.
2. Each cube has its OWN MeshStandardMaterial with color 0x4488ff.
3. Clicking a cube selects it: its material color becomes 0xff0000. Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff.
4. Clicking empty background clears the selection (all cubes 0x4488ff).
5. Use THREE.Raycaster with normalized device coordinates computed from the canvas bounding rect.
6. PerspectiveCamera looking straight at the grid, the whole grid visible with margin. No camera movement, no animation of the cubes.
7. AmbientLight + DirectionalLight.

Let me think about the layout:
- 5x5 grid in XY plane means cubes are arranged in a grid on the X and Y axes, all at Z=0 (facing camera at positive Z).
- Each cube is a BoxGeometry (or CubeGeometry).
- Gaps between them: if cube size is 1, gap could be 0.3 or so, so spacing is 1.3.

For the camera:
- Looking straight at the grid means camera is at (0, 0, z) looking at (0, 0, 0).
- Need to make sure the whole grid is visible with margin.
- Grid extent: 5 cubes with gaps. If cube size = 1, gap = 0.3, spacing = 1.3.
- Total width/height = 5 * 1 + 4 * 0.3 = 5 + 1.2 = 6.2
- Half extent = 3.1
- With margin, say we want the grid to occupy about 70% of the view, so we need a z distance that gives a vertical extent of about 3.1 / 0.35 ≈ 8.86 half-height.
- For a perspective camera with FOV, the visible height at distance z is 2 * z * tan(fov/2).
- Let's use FOV = 45 degrees, so tan(22.5°) ≈ 0.4142.
- Visible height at distance z = 2 * z * 0.4142 = 0.8284 * z
- We want visible height >= 6.2 * 1.3 (margin) ≈ 8.06, so z >= 8.06 / 0.8284 ≈ 9.73
- Let's use z = 12 to be safe with good margin.

Actually, let me recalculate. The grid spans from -3.1 to 3.1 in both X and Y. With some margin, let's say we want to see from -4 to 4 in Y (8 units total). 
- Visible height at distance z = 2 * z * tan(fov/2)
- With fov = 45: visible height = 2 * z * tan(22.5°) = 2 * z * 0.41421 = 0.82843 * z
- We need 0.82843 * z >= 8, so z >= 9.66
- Let's use z = 12 for comfortable margin.

For the raycaster:
- On click, compute NDC coordinates from the canvas bounding rect.
- Use raycaster to intersect with the cubes array.
- If hit, select that cube (red), deselect previous (blue).
- If no hit, deselect all (blue).

Let me write the code:

```ts
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Create 5x5 grid of cubes
const cubeSize = 1;
const gap = 0.3;
const spacing = cubeSize + gap; // 1.3
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const cube = new THREE.Mesh(geometry, material);
    const x = (col - 2) * spacing;
    const y = (row - 2) * spacing;
    cube.position.set(x, y, 0);
    scene.add(cube);
    cubes.push(cube);
  }
}

// Raycaster for click handling
const raycaster = new THREE.Raycaster();
const selectedColor = new THREE.Color(0xff0000);
const normalColor = new THREE.Color(0x4488ff);
let selectedCube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

function onMouseClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersections = raycaster.intersectObjects(cubes);
  
  if (intersections.length > 0) {
    const hit = intersections[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (selectedCube === hit) {
      // Already selected, clear selection
      hit.material.color.copy(normalColor);
      selectedCube = null;
    } else {
      // Deselect previous
      if (selectedCube !== null) {
        selectedCube.material.color.copy(normalColor);
      }
      // Select new
      hit.material.color.copy(selectedColor);
      selectedCube = hit;
    }
  } else {
    // Clicked background, clear selection
    if (selectedCube !== null) {
      selectedCube.material.color.copy(normalColor);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('click', onMouseClick);

// Resize handling
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Render loop
let ready = false;
renderer.setAnimationLoop(() => {
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
```

Wait, the requirement says "Clicking a cube selects it" - it doesn't say clicking the same cube again deselects it. Let me re-read:

"Clicking a cube selects it: its material color becomes 0xff0000. Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff."
"Clicking empty background clears the selection (all cubes 0x4488ff)."

So clicking a cube always selects it (even if already selected). Clicking background clears. Let me adjust - if you click the already selected cube, it stays selected (or re-selects it, which is the same). I'll keep it simple: clicking a cube selects it, clicking background deselects.

Actually, re-reading more carefully, it just says clicking a cube selects it. It doesn't mention toggling. So if you click the already selected cube, it stays red. That's fine.

Let me also make sure I'm using `const` where appropriate and the code compiles with `tsc --strict`.

One issue: the geometry is shared among all cubes. That's fine for raycasting. But each cube has its own material, which is required.

Let me also think about whether I need to handle the case where clicking an already-selected cube should keep it selected. Yes, per the spec, clicking a cube selects it. If it's already selected, it stays selected. The key behavior is: only one at a time, previous goes back to blue.

Let me finalize the code.
