Single file, InstancedMesh of 900 boxes, raycaster picking with instanceId, toggle colors, needsUpdate flag.

Grid 30x30, spacing 1.0, so extent 29 units. Centered. Camera positioned at z so whole grid visible with margin. FOV 50, distance: half-height 15, margin → need vertical fit: tan(fov/2)*d >= 15*margin. Use fov 50, d = 16/tan(25°) ≈ 16/0.4663 ≈ 34.3. But aspect matters — assume wider than tall; use distance 36 to be safe.

Raycaster with MeshBasicMaterial and instanceId: raycaster.intersectObject(mesh) returns intersection with instanceId. Note: raycasting instanced mesh works.

Colors array: use mesh.setColorAt in loop initially. Track state in Uint8 array or check color.

Click handler: compute NDC from canvas rect.

instanceColor needsUpdate after change: mesh.instanceColor!.needsUpdate = true.

Also mark matrix? No, static.

Set mesh.instanceMatrix.needsUpdate not needed initially but fine.

Code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 36);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const SIZE = 30, SPACING = 1.0;
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, SIZE * SIZE);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);
const red = new THREE.Color(0xff0000);
const isRed = new Uint8Array(SIZE * SIZE);

let i = 0;
for (let row = 0; row < SIZE; row++) {
  for (let col = 0; col < SIZE; col++, i++) {
    dummy.position.set((col - (SIZE - 1) / 2) * SPACING, ((SIZE - 1) / 2 - row) * SPACING, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, gray);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (ev) => {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh);
  if (hits.length > 0) {
    const hit = hits[0];
    if (hit.instanceId !== undefined) {
      const id = hit.instanceId;
      isRed[id] = isRed[id] ? 0 : 1;
      mesh.setColorAt(id, isRed[id] ? red : gray);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
});
```

Wait: raycaster intersects boxes in XY plane at z=0, camera at +z. Fine. But raycaster might hit front faces only — box front face faces camera, fine.

Render loop: since no animation, still need setAnimationLoop; set __ready after first frame.

Note: setColorAt requires instanceColor allocated — first call allocates it. Good.

Expose globals.