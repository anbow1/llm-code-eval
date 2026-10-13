The user wants a static scene — no camera movement, no cube animation. That's fine; I still need the render loop via setAnimationLoop, but the scene is still. Wait — my taste says scenes should feel alive, but the user explicitly asks for no camera movement and no animation of cubes. I'll follow the user exactly.

Details:
- 5x5 grid in XY plane, facing camera (camera on +Z looking at origin).
- Each cube: own MeshStandardMaterial, color 0x4488ff.
- Raycaster click selection.
- Handle resize.
- __ready after first frame.

Compute camera distance so whole grid fits with margin. Grid spacing: cube size 1, gap 0.4 → spacing 1.4, total width 5*1.4 - 0.4 = 6.6. Use camera fov 45, distance such that height 6.6*margin fits. Compute via tan(fov/2).

Let me write code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111318);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// grid
const spacing = 1.4;
const gridSize = 4 * spacing; // extent from center to center of outermost
const halfSpan = gridSize / 2 + 0.5 + 0.8; // margin
// fit vertically: halfSpan = distance * tan(fov/2) ... also consider aspect for width
const fovRad = THREE.MathUtils.degToRad(camera.fov);
const distV = halfSpan / Math.tan(fovRad / 2);
const distH = halfSpan / (Math.tan(fovRad / 2) * camera.aspect);
const distance = Math.max(distV, distH);
camera.position.set(0, 0, distance);
camera.lookAt(0, 0, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(3, 5, 6);
scene.add(ambient, dir);

const cubes: THREE.Mesh[] = [];
const defaultColor = new THREE.Color(0x4488ff);
let selected: THREE.Mesh | null = null;

const geometry = new THREE.BoxGeometry(1, 1, 1);

for (let ix = 0; ix < 5; ix++) {
  for (let iy = 0; iy < 5; iy++) {
    const material = new THREE.MeshStandardMaterial({ color: defaultColor.clone() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((ix - 2) * spacing, (iy - 2) * spacing, 0);
    scene.add(mesh);
    cubes.push(mesh);
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function clearSelection() {
  if (selected) {
    (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
    selected = null;
  }
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(cubes, false);
  if (hits.length > 0) {
    const hit = hits[0].object as THREE.Mesh;
    if (selected !== hit) {
      clearSelection();
      selected = hit;
      (hit.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    }
  } else {
    clearSelection();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let rendered = false;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (!rendered) {
    rendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait — repositioning camera on resize? Grid fit depends on aspect; if aspect narrows, grid might overflow horizontally. Should update distance on resize too. Add a fitCamera function called on resize.

Type strictness: event listener types fine. `(window as any)` fine.

Also body margin: add style so canvas fills. Set document.body.style.margin = '0'.

Note pointerdown vs click — click is fine too. Use pointerdown or 'click'. Spec says clicking; use pointerdown, fine.

Strict mode: `hits[0].object as THREE.Mesh` — intersectObjects returns Intersection[]; object is Object3D. Cast fine.

material typed: mesh.material is Material | Material[]; with single material it's Material; cast to MeshStandardMaterial.

fitCamera:

```ts
function fitCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  const halfSpan = ...;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const distV = halfSpan / tanHalf;
  const distH = halfSpan / (tanHalf * camera.aspect);
  camera.position.z = Math.max(distV, distH);
}
```

Call on init and resize. Good.

Write final code with brief comments. The explanation should be brief. I'll add a short note after the code block? The instructions say "Reply with a single ```ts code block and nothing else." So only code block. But I generally include a brief explanation... the user explicitly says nothing else. Follow user.