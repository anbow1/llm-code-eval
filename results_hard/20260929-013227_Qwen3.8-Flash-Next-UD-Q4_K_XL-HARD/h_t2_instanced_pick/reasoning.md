The user wants a single TypeScript file that:

1. Creates a 30x30 grid of boxes using a single InstancedMesh
2. Box size 0.8, spacing 1.0, centered on origin, in XY plane
3. MeshBasicMaterial with white color so instance colors show exactly
4. All instances start gray (0x808080) via setColorAt
5. PerspectiveCamera looking straight at the grid, whole grid visible with margin
6. No animation, no camera movement
7. Click toggles instance color between gray and red
8. Uses Raycaster with NDC from canvas bounding rect
9. Flags instance colors for upload after change
10. Exposes __scene, __camera, __renderer, __mesh, __ready

Let me think about the grid positioning:
- 30x30 grid, spacing 1.0
- Centered on origin means positions from -14.5 to +14.5 in both X and Y
- Box size 0.8 (so gaps of 0.2 between boxes)

Camera: PerspectiveCamera looking at origin (0,0,0) along -Z axis. Grid is in XY plane. Need to ensure whole grid is visible with margin.

Grid extent: from -14.5 to +14.5, so about 29 units wide. With margin, let's say we need to see about 32-34 units. With a FOV of 60 degrees, the distance needed: half_width / tan(fov/2) = 17 / tan(30°) ≈ 17 / 0.577 ≈ 29.4. Let's use distance ~35 to have a good margin.

For the click handler:
- Use pointerdown or click event on the renderer's canvas
- Compute NDC from canvas bounding rect
- Raycast against the InstancedMesh
- If hit, toggle color at instanceId

For setColorAt to work with MeshBasicMaterial, I need to make sure the material has vertexColors... wait, no. Actually for InstancedMesh instance colors, the material needs `vertexColors` set to true? Let me think...

Actually, looking at Three.js docs: For instance colors to work, you use `setColorAt` and the material should have... Actually, in recent Three.js versions, when you use `setColorAt`, it automatically handles the vertex color attribute. But the material needs to be set up to use them. For MeshBasicMaterial, setting the color to white (0xffffff) and using instance colors should work - the instance color multiplies with the material color.

Wait, actually I recall that for instance colors to be picked up by the shader, the material might need `vertexColors: true`. Let me check... No, actually for InstancedMesh, the instance color is handled differently from vertex colors. The `setColorAt` method sets up an `InstancedBufferAttribute` named `instanceColor`. The shader should pick this up automatically when the mesh is an InstancedMesh.

Hmm, but to be safe and ensure colors show exactly, I'll set the material color to white (0xffffff) and use MeshBasicMaterial. The instance color multiplies with the material color.

Let me also make sure I call `mesh.instanceColor.needsUpdate = true` after changes.

For the raycaster with InstancedMesh: `intersectObject` returns intersections with `instanceId` property.

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Grid setup
const size = 30;
const boxSize = 0.8;
const spacing = 1.0;
const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, size * size);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);

for (let i = 0; i < size; i++) {
  for (let j = 0; j < size; j++) {
    const idx = i * size + j;
    const x = (j - (size - 1) / 2) * spacing;
    const y = (i - (size - 1) / 2) * spacing;
    dummy.position.set(x, y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, gray);
  }
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Raycaster for clicking
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);
  
  if (intersects.length > 0) {
    const id = intersects[0].instanceId;
    if (id !== undefined) {
      const color = new THREE.Color();
      mesh.getColorAt(id, color);
      if (color.equals(new THREE.Color(0xff0000))) {
        mesh.setColorAt(id, new THREE.Color(0x808080));
      } else {
        mesh.setColorAt(id, new THREE.Color(0xff0000));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
});

// Resize handler
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
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

This looks good. Let me verify:
- Single InstancedMesh, no other meshes ✓
- 30x30 = 900 instances ✓
- XY plane, box size 0.8, spacing 1.0, centered ✓
- PerspectiveCamera looking straight at grid ✓
- MeshBasicMaterial white ✓
- setColorAt with gray ✓
- Click toggles color ✓
- Raycaster with NDC from canvas bounding rect ✓
- instanceId used ✓
- instanceColor.needsUpdate flagged ✓
- __mesh exposed ✓
- __ready set after first frame ✓
- No animation ✓
- Resize handler ✓

One thing to check: does `mesh.getColorAt` exist? Yes, it does in recent Three.js versions.

Also I should check: does `new THREE.Color(0x808080).equals(new THREE.Color(0x808080))` work correctly? Yes, it does.

The code looks correct and should compile with tsc --strict. Let me make sure all types are correct. The `intersects[0].instanceId` could be `number | undefined` in strict mode, which I handle with the undefined check.

I think this is solid.
