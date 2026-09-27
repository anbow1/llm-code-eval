Let me break down the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between them
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it: color becomes 0xff0000. Only one selected at a time.
5. Clicking empty background clears selection (all cubes back to 0x4488ff)
6. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
7. PerspectiveCamera looking straight at the grid, whole grid visible with margin
8. No camera movement, no animation of cubes
9. AmbientLight + DirectionalLight
10. No other meshes

Let me think about the layout:
- 5x5 grid in XY plane, facing camera (so Z axis is towards camera)
- Let's say each cube is 1 unit, with a gap of 0.5 units between them
- So spacing is 1.5 units
- Grid positions: from -2*1.5 to +2*1.5 = -3 to +3 in both X and Y
- Total grid size: 6 units wide and tall (from -3 to +3, plus cube size 1, so -3.5 to +3.5)
- Actually let me recalculate: 5 cubes with spacing 1.5: positions at -3, -1.5, 0, 1.5, 3
- Total extent: from -3-0.5 to 3+0.5 = -3.5 to 3.5, so 7 units wide

Camera:
- Looking straight at the grid from Z axis
- Need to see the whole grid with margin
- If grid is 7 units wide/tall, camera at z=10 or so
- FOV 45 degrees, at z=10, visible height = 2 * 10 * tan(22.5°) ≈ 2 * 10 * 0.4142 ≈ 8.28
- That should be enough with margin for a 7-unit grid
- Let me use z=12 for more margin: visible height ≈ 2 * 12 * 0.4142 ≈ 9.94
- Or z=10 with FOV 50: visible height = 2 * 10 * tan(25°) ≈ 2 * 10 * 0.4663 ≈ 9.33
- Let me use FOV 45, z=12: visible height ≈ 9.94, that gives about 1.5 units margin on each side. Good.

Raycaster:
- Get canvas bounding rect
- Compute NDC: x = ((event.clientX - rect.left) / rect.width) * 2 - 1
- y = -((event.clientY - rect.top) / rect.height) * 2 + 1

Selection logic:
- Keep track of selectedMesh (or null)
- On click, raycast against all cubes
- If hit a cube:
  - If it's the same as currently selected, maybe deselect? Or keep selected? The spec says "clicking a cube selects it" - I'll assume clicking the same cube again keeps it selected (or could deselect). Let me re-read: "Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff." I'll just always select the clicked one and deselect the previous.
  - Deselect previous (set to 0x4488ff)
  - Select new (set to 0xff0000)
- If no cube hit:
  - Deselect current (set to 0x4488ff)
  - selectedMesh = null

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 10);
scene.add(directionalLight);

// Grid of cubes
const cubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap; // 1.5
const gridSize = 5;
const offset = ((gridSize - 1) * spacing) / 2; // 3

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      i * spacing - offset,
      j * spacing - offset,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Selection
let selectedMesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (selectedMesh === hitMesh) {
      // Already selected, keep it (or could deselect, but spec says "clicking a cube selects it")
      // I'll keep it selected
      return;
    }
    if (selectedMesh) {
      selectedMesh.material.color.setHex(0x4488ff);
    }
    selectedMesh = hitMesh;
    selectedMesh.material.color.setHex(0xff0000);
  } else {
    if (selectedMesh) {
      selectedMesh.material.color.setHex(0x4488ff);
      selectedMesh = null;
    }
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
let ready = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All types are properly annotated
- No implicit any
- The intersects[0].object is typed as THREE.Object3D, so I need to cast it

Let me also think about whether I need to use delta/elapsed time. The spec says "Motion must use delta/elapsed time, not frame counts." But there's no motion in this scene - no animation of cubes, no camera movement. So I just need the render loop to exist but it doesn't need to do anything time-based. The setAnimationLoop is still required though.

Actually, re-reading: "Use renderer.setAnimationLoop for the render loop. Motion must use delta/elapsed time, not frame counts." Since there's no motion, I just need the loop to render. But to be safe, I could include a clock and delta even if unused... Actually no, that would cause unused variable warnings in strict mode. Let me just have the render loop without any time-based computation since there's no motion.

Let me also make sure the geometry is shared or not. The spec says "25 separate Mesh objects" - they need to be separate meshes but can share geometry. Each has its OWN material though.

Let me finalize the code.
