Need to create a 5x5 grid of cubes in XY plane facing camera. Camera looks straight at grid. Let's set grid in XY plane, z=0, camera at z=10 looking at origin. Cube size with gap: cube size 1, spacing 1.5, so positions from -3 to 3.

Grid extent: 5 cubes, spacing 1.5, total span 3. Cube size 1, so grid from -3.5 to 3.5 (7 units). Camera fov 45, at z=10, visible height at z=0: 2*10*tan(22.5°) ≈ 8.28. Need margin. So width 7, height 8.28 with margin. Good.

Each cube own MeshStandardMaterial color 0x4488ff.

Click: raycast, NDC from canvas bounding rect.

Selection: one at a time.

Expose window.__scene, __camera, __renderer, __ready after first frame.

Use setAnimationLoop with delta time (clock). No animation of cubes but can still pass delta.

Lights: AmbientLight + DirectionalLight.

No other meshes. Only 25 cubes.

Let's write the code.

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 5, 10);
scene.add(dir);

// Cubes
const cubes: THREE.Mesh[] = [];
const cubeSize = 1;
const spacing = 1.5;
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const selectedColor = new THREE.Color(0xff0000);
const defaultColor = new THREE.Color(0x4488ff);
let selected: THREE.Mesh | null = null;

for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (i - 2) * spacing,
      (j - 2) * spacing,
      0
    );
    scene.add(mesh);
    cubes.push(mesh);
  }
}

// Raycaster
const raycaster = new THREE.Raycaster();

function handlePointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const hits = raycaster.intersectObjects(cubes, false);
  if (hits.length > 0) {
    const hit = hits[0].object as THREE.Mesh;
    if (selected === hit) {
      // toggle? spec: clicking a cube selects it. If already selected stays selected? 
      // "Only one cube is selected at a time" - clicking same one keeps it selected.
      hit.material.color.copy(selectedColor);
    } else {
      if (selected) selected.material.color.copy(defaultColor);
      selected = hit;
      hit.material.color.copy(selectedColor);
    }
  } else {
    if (selected) {
      selected.material.color.copy(defaultColor);
      selected = null;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', handlePointerDown);
```

Wait spec: "Clicking a cube selects it: its material color becomes 0xff0000." Doesn't say toggle. Let's keep selected on click of same cube (still selected). That's fine.

Resize:
```
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Animation loop:
```
const clock = new THREE.Clock();
let ready = false;
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  void delta;
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Strict: material color is Color type. hits[0].object is Object3D, cast to Mesh. Need ensure material is MeshStandardMaterial. Fine.

TypeScript strict: ensure no unused vars. `delta` used via void.

Expose window assignments.

Done. Let's write final.
