The user wants a single TypeScript file that creates a 5x5 grid of cubes in the XY plane facing the camera. Let me break down the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in XY plane
2. Visible gaps between them
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it (color becomes 0xff0000), only one selected at a time
5. Clicking empty background clears selection
6. THREE.Raycaster with NDC from canvas bounding rect
7. PerspectiveCamera looking straight at grid, whole grid visible with margin
8. No camera movement, no animation of cubes
9. AmbientLight + DirectionalLight
10. WebGLRenderer appended to document.body
11. Handle resize
12. Use setAnimationLoop with delta/elapsed time
13. Expose __scene, __camera, __renderer, __ready

Let me design the grid:
- 5x5 grid in XY plane
- Cube size: let's say 1 unit
- Gap: let's say 0.3 units (so spacing is 1.3)
- Total width: 5 * 1 + 4 * 0.3 = 6.2 units
- Total height: same = 6.2 units
- Center the grid at origin

Camera:
- Looking straight at origin (0,0,0) from some Z distance
- Need to fit 6.2 units with margin, so maybe 8 units visible
- FOV 60, aspect ~16/9, distance = (8/2) / tan(30°) ≈ 6.93, let's use 10 for margin

For the raycaster:
- On click, compute NDC from canvas bounding rect
- Raycast against the 25 cubes
- If hit, select that cube
- If no hit, clear selection

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const cubeSize = 1;
const gap = 0.3;
const spacing = cubeSize + gap;
const gridSize = 5;
const offset = (gridSize - 1) * spacing / 2;

const cubes: THREE.Mesh[] = [];
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(i * spacing - offset, j * spacing - offset, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Raycaster and selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedCube: THREE.Mesh | null = null;

function onClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cubes);
  
  // Deselect previous
  if (selectedCube) {
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
    selectedCube = null;
  }
  
  if (intersects.length > 0) {
    selectedCube = intersects[0].object as THREE.Mesh;
    (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
  }
}

renderer.domElement.addEventListener('click', onClick);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, the requirement says "Motion must use delta/elapsed time, not frame counts." But there's no animation of cubes. The render loop just renders. I think using setAnimationLoop is sufficient here since there's no motion. But I should still structure it properly. Actually, since there's no animation, just rendering each frame is fine. The setAnimationLoop requirement is met.

Let me also make sure the geometry sharing is fine - all cubes share the same BoxGeometry but each has its own material. That's correct per the requirements.

Let me also double-check: "Do not add any other meshes" - I'm only adding 25 cube meshes, lights are not meshes. Good.

The code looks good. Let me finalize it.
