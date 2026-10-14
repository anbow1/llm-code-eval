The user wants a single TypeScript file that:

1. Creates a 30x30 grid of boxes (900 instances) using ONE InstancedMesh
2. Grid in XY plane, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. All instances start with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show exactly
7. Clicking an instance toggles color between gray (0x808080) and red (0xff0000)
8. Each instance toggles independently
9. Clicking empty background does nothing
10. Use THREE.Raycaster with NDC from canvas bounding rect, use intersection.instanceId
11. Flag instance colors for upload after changing
12. Expose (window as any).__mesh = mesh
13. Also expose __scene, __camera, __renderer, __ready

Let me think about the grid positioning:
- 30x30 grid, spacing 1.0, box size 0.8
- Centered on origin
- Indices go from 0 to 29 for x and y
- Position for instance (i, j): x = (i - 14.5) * 1.0, y = (j - 14.5) * 1.0, z = 0
- Box size 0.8 means BoxGeometry(0.8, 0.8, 0.8)

Camera positioning:
- Grid spans from -14.5 to 14.5 in both x and y (about 30 units wide with gaps)
- Actually the grid goes from -14.5 to 14.5 in terms of instance centers, but with box size 0.8, the visual extent is -14.9 to 14.9
- Need a margin, so let's target about 16-17 units visible
- For a PerspectiveCamera with FOV 45°, the visible height at distance d is: 2 * d * tan(FOV/2)
- 2 * d * tan(22.5°) = 2 * d * 0.4142 = 0.8284 * d
- We want visible height >= 17 (to cover 29.8 + margin)
- d >= 17 / 0.8284 ≈ 20.5
- Let's use d = 25 for a nice margin.

For the raycaster:
- Get mouse position in NDC from canvas bounding rect
- Use raycaster.setFromCamera(ndc, camera)
- intersectObject(instancedMesh)
- Check intersection.instanceId (or intersection.instanceId in newer three.js it's `instanceId`)

Wait, in Three.js, for InstancedMesh raycasting, the intersection object has `instanceId` property. Let me check - actually it's `instanceId` in newer versions. Let me use that.

For colors:
- Use instanceColor via setColorAt
- After modifying, set instanceColor.needsUpdate = true

Let me also make sure the material is MeshBasicMaterial with color white (0xffffff) so that the instance colors multiply correctly. Actually, MeshBasicMaterial with color white and instance colors should show the instance colors directly since white * color = color.

Let me write the complete file:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 25);
camera.lookAt(0, 0, 0);

// InstancedMesh
const boxSize = 0.8;
const spacing = 1.0;
const count = 30 * 30;
const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

const gray = new THREE.Color(0x808080);
const dummy = new THREE.Object3D();

for (let i = 0; i < 30; i++) {
  for (let j = 0; j < 30; j++) {
    const idx = i * 30 + j;
    dummy.position.set((i - 14.5) * spacing, (j - 14.5) * spacing, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    mesh.setColorAt(idx, gray);
  }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Raycasting
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const red = new THREE.Color(0xff0000);

renderer.domElement.addEventListener('click', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);
  
  if (intersects.length > 0) {
    const id = intersects[0].instanceId!;
    const currentColor = new THREE.Color();
    mesh.getColorAt(id, currentColor);
    
    if (currentColor.equals(red)) {
      mesh.setColorAt(id, gray);
    } else {
      mesh.setColorAt(id, red);
    }
    
    mesh.instanceColor!.needsUpdate = true;
  }
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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

This should be correct. Let me double-check:
- `mesh.getColorAt` exists in Three.js - yes it does.
- `instanceId` is available on intersection objects for InstancedMesh - yes.
- The grid is in the XY plane facing the camera - yes, boxes are at z=0, camera at z=25.
- No other meshes - correct, only the InstancedMesh.
- MeshBasicMaterial is unlit, so instance colors will show directly.

Wait, I need to check if `instanceId` is the correct property name. In Three.js r150+, it's `instanceId` on the intersection. Let me use that.

Actually, looking at Three.js source, the property is `instanceId` (lowercase 'i'). Yes, that's correct.

One concern: `mesh.getColorAt` - does this exist? Let me think... In Three.js, `InstancedMesh` has `getColorAt(index, color)` method. Yes it does.

The `equals` method on Color compares RGB values. Since we're setting exact colors, this should work.

Let me also make sure I handle the `instanceColor!` properly - after calling `setColorAt`, `instanceColor` is created. So after the initial loop, it should exist. The `!` non-null assertion is fine for strict mode.

I think this is complete and correct.
