The user wants a single TypeScript file that:
1. Creates a 30x30 grid (900 boxes) using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show
7. Clicking toggles color: gray→red, red→gray
8. Uses Raycaster with NDC from canvas bounding rect, intersection.instanceId
9. Flags instance colors for upload after changing
10. Exposes: __scene, __camera, __renderer, __mesh, __ready
11. No external assets
12. Uses renderer.setAnimationLoop
13. Motion uses delta/elapsed time (but there's no animation, so just render)
14. Handle window resize
15. Create WebGLRenderer, append canvas to document.body

Let me think about the grid layout:
- 30x30 grid, spacing 1.0, box size 0.8
- Centered on origin
- Positions: for i in 0..29, j in 0..29: x = (i - 14.5) * 1.0, y = (j - 14.5) * 1.0
- So positions range from -14.5 to 14.5

Camera:
- Looking straight at the grid (along -Z direction, so camera at z = some positive value)
- Need to see the whole grid with margin
- Grid spans from -14.5 - 0.4 = -14.9 to 14.5 + 0.4 = 14.9 (half-width ~14.9)
- Let's use a perspective camera with FOV 60 degrees
- Distance needed: tan(FOV/2) * distance >= halfHeight + margin
- halfHeight = 14.9, let's add margin of ~2, so need tan(30°) * d >= 16.9
- tan(30°) ≈ 0.577, so d >= 16.9 / 0.577 ≈ 29.3
- Let's use z = 35 to be safe
- Camera at (0, 0, 35), looking at origin

For the click handling:
- Get mouse position relative to canvas
- Convert to NDC: x = ((clientX - rect.left) / rect.width) * 2 - 1, y = -((clientY - rect.top) / rect.height) * 2 + 1
- Raycaster from camera
- Check intersection with the instanced mesh
- Use intersection.instanceId to identify which instance
- Toggle color

For tracking colors, I'll keep an array of booleans (isRed) for each instance.

Let me write this:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Create InstancedMesh
const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const count = 30 * 30;
const mesh = new THREE.InstancedMesh(boxGeometry, material, count);

const dummy = new THREE.Object3D();
const color = new THREE.Color();
const isRed: boolean[] = new Array(count).fill(false);

for (let i = 0; i < 30; i++) {
  for (let j = 0; j < 30; j++) {
    const idx = i * 30 + j;
    const x = (i - 14.5) * 1.0;
    const y = (j - 14.5) * 1.0;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    color.setHex(0x808080);
    mesh.setColorAt(idx, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) {
  mesh.instanceColor.needsUpdate = true;
}

scene.add(mesh);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersections = raycaster.intersectObject(mesh);
  
  if (intersections.length > 0) {
    const instanceId = intersections[0].instanceId;
    if (instanceId !== undefined) {
      isRed[instanceId] = !isRed[instanceId];
      color.setHex(isRed[instanceId] ? 0xff0000 : 0x808080);
      mesh.setColorAt(instanceId, color);
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Render loop
let ready = false;
renderer.setAnimationLoop((time: number) => {
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to be careful with `instanceId` - in TypeScript strict mode, `intersections[0].instanceId` could be `number | undefined`. Let me check the Three.js types.

In Three.js, `Intersection` has `instanceId?: number`. So I need to handle the case where it's undefined.

Actually, looking at the types more carefully, in newer versions of Three.js, `instanceId` is `number | undefined`. I should check for it.

Let me also make sure the code compiles with `tsc --strict`. The main concerns:
- All variables are typed
- No implicit any
- Null checks where needed

Let me also think about whether `mesh.instanceColor` could be null. In Three.js, `instanceColor` is `BufferAttribute | null`. So I need to check it.

Actually, after calling `setColorAt`, `instanceColor` should be non-null. But TypeScript might still say it could be null. Let me handle it properly.

Let me refine the code to ensure strict TypeScript compliance.
