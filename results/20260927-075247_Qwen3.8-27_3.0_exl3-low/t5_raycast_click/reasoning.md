Let me think through this step by step:

1. Create a 5x5 grid of cubes (25 Mesh objects) in the XY plane
2. Each cube has its own MeshStandardMaterial with color 0x4488ff
3. Visible gaps between cubes
4. Clicking a cube selects it (color changes to 0xff0000)
5. Only one selected at a time
6. Clicking empty background clears selection
7. Use THREE.Raycaster with NDC from canvas bounding rect
8. PerspectiveCamera looking straight at the grid, whole grid visible with margin
9. No camera movement, no animation of cubes
10. AmbientLight + DirectionalLight
11. No other meshes

Let me plan the geometry:
- 5x5 grid of cubes
- Let's say each cube is 1 unit, with gaps of 0.5 units between them
- So the grid spans: 5 * 1 + 4 * 0.5 = 7 units wide
- Position each cube at: x = (col - 2) * 1.5, y = (row - 2) * 1.5
- The grid center is at origin
- The grid extends from -3 to +3 in both x and y

Camera positioning:
- Looking straight at the grid from the positive Z axis
- Need to see the whole grid with margin
- Grid is 7 units wide/tall
- Let's use a perspective camera with FOV 45 degrees
- Distance needed: half the grid is 3.5 units, plus margin
- With FOV 45, tan(22.5°) ≈ 0.414
- To see 3.5 + margin (say 1 unit) = 4.5 units vertically
- distance = 4.5 / tan(22.5°) ≈ 4.5 / 0.414 ≈ 10.86
- Let's place camera at z = 12 to be safe
- Camera at (0, 0, 12), looking at (0, 0, 0)

For the raycaster:
- Use canvas.getBoundingClientRect() to compute NDC
- x = ((event.clientX - rect.left) / rect.width) * 2 - 1
- y = -((event.clientY - rect.top) / rect.height) * 2 + 1

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
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

// Create 5x5 grid of cubes
const cubeSize = 1;
const gap = 0.5;
const spacing = cubeSize + gap; // 1.5
const cubes: THREE.Mesh[] = [];
const baseColor = 0x4488ff;
const selectedColor = 0xff0000;

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: baseColor });
    const mesh = new THREE.Mesh(geometry, material);
    const x = (col - 2) * spacing;
    const y = (row - 2) * spacing;
    mesh.position.set(x, y, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Raycaster and click handling
const raycaster = new THREE.Raycaster();
let selectedCube: THREE.Mesh | null = null;

function onClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersects = raycaster.intersectObjects(cubes);
  
  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object as THREE.Mesh;
    if (selectedCube && selectedCube !== clickedMesh) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
    }
    selectedCube = clickedMesh;
    (clickedMesh.material as THREE.MeshStandardMaterial).color.setHex(selectedColor);
  } else {
    if (selectedCube) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(baseColor);
      selectedCube = null;
    }
  }
}

renderer.domElement.addEventListener('click', onClick);

// Resize handling
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All variables are typed
- No implicit any
- The `intersects[0].object` is typed as `Object3D`, so I need to cast it
- The material on the mesh - since I'm pushing to `cubes: THREE.Mesh[]`, the material should be `Material`, so I need to cast to `MeshStandardMaterial`

Actually, `THREE.Mesh` has `material: Material | Material[]`. So I need to handle that. Let me cast properly.

Let me also double-check: the cubes array is `THREE.Mesh[]`, so `intersects[0].object` is `Object3D`. I need to cast it to `THREE.Mesh`.

The material type: `mesh.material` is `Material | Material[]`. I'll cast to `THREE.MeshStandardMaterial`.

This looks good. Let me finalize.
