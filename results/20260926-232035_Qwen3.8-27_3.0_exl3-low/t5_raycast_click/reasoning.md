Let me break down the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between them
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it: color becomes 0xff0000
5. Only one cube selected at a time; previously selected goes back to 0x4488ff
6. Clicking empty background clears selection (all cubes 0x4488ff)
7. Use THREE.Raycaster with normalized device coordinates from canvas bounding rect
8. PerspectiveCamera looking straight at the grid, whole grid visible with margin
9. No camera movement, no animation of cubes
10. AmbientLight + DirectionalLight
11. No other meshes
12. All the standard requirements (renderer, resize, animation loop, expose scene/camera/renderer, __ready flag)

Let me think about the layout:
- 5x5 grid in XY plane
- Cubes are BoxGeometry
- Let's say each cube is size 1, with a gap of 0.3 between them
- So spacing = 1 + 0.3 = 1.3
- Grid spans from -2*1.3 to +2*1.3 = -2.6 to +2.6, total width/height = 5.2
- Camera should be at z = some distance, looking at origin

For the camera:
- PerspectiveCamera with some FOV (e.g., 50)
- Position at (0, 0, z) where z is far enough to see the whole grid with margin
- Grid size is about 5.2 units wide/tall
- With FOV 50, at distance d, the visible height is 2 * d * tan(FOV/2)
- We need visible height > 5.2 + margin (say 7)
- 2 * d * tan(25°) > 7
- d > 7 / (2 * 0.4663) ≈ 7.5
- Let's use d = 10 for comfortable margin

Actually let me recalculate. tan(25°) ≈ 0.4663. 2 * 10 * 0.4663 = 9.326. That's plenty of margin for a 5.2 grid.

For the raycaster:
- On click, compute NDC from canvas bounding rect
- Raycast against the 25 cubes
- If hit, select that cube (deselect previous)
- If no hit, deselect all

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
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
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      -offset + i * spacing,
      -offset + j * spacing,
      0
    );
    scene.add(cube);
    cubes.push(cube);
  }
}

// Selection logic
let selectedCube: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();

function onClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const intersects = raycaster.intersectObjects(cubes);
  
  if (intersects.length > 0) {
    const hit = intersects[0].object as THREE.Mesh;
    if (selectedCube === hit) {
      // Clicking already selected cube - deselect? Or keep selected?
      // The spec says "clicking a cube selects it" - I'll keep it selected
      // Actually, let me re-read: "Clicking a cube selects it: its material color becomes 0xff0000. Only one cube is selected at a time; the previously selected cube goes back to 0x4488ff."
      // I'll just re-select it (no change)
    } else {
      if (selectedCube) {
        (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      }
      selectedCube = hit;
      (hit.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    }
  } else {
    if (selectedCube) {
      (selectedCube.material as THREE.MeshStandardMaterial).color.setHex(0x4488ff);
      selectedCube = null;
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

// Animation loop
let ready = false;
renderer.setAnimationLoop(() => {
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
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- All variables are typed
- No implicit any
- The `event` parameter in onClick is typed as MouseEvent
- The material casts are explicit

I think this looks good. Let me also make sure the body has no margin/padding issues - actually the requirement says "The page has no other HTML" so I just append the canvas.

One thing - I should set the body margin to 0 to avoid scrollbars. But the requirement says no other HTML. I can set it via JavaScript though.

Actually, let me add `document.body.style.margin = '0'` to avoid scrollbars.

Let me finalize the code.
