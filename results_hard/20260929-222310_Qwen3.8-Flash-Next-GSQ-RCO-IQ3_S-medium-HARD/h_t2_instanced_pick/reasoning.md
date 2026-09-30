The user wants a single TypeScript file that:
1. Creates a 30x30 grid of boxes using one InstancedMesh
2. Grid in XY plane, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking straight at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show exactly
7. Clicking an instance toggles its color: gray ↔ red
8. Clicking empty background changes nothing
9. Use THREE.Raycaster with NDC from canvas bounding rect and intersection.instanceId
10. Flag instance colors for upload after changing
11. Expose (window as any).__mesh = mesh

Let me think about the grid setup:
- 30x30 grid = 900 instances
- Box size 0.8, spacing 1.0
- Grid in XY plane, centered on origin
- Positions: from -14.5 to +14.5 (since 30 items, centered: indices 0..29, offset = (29)/2 = 14.5)
- So x ranges from -14.5 to 14.5, y ranges from -14.5 to 14.5

Camera setup:
- The grid spans from -14.5 to 14.5 in both X and Y, so 29 units wide
- With box size 0.8, the visual extent is about -14.9 to 14.9, so ~30 units
- PerspectiveCamera looking straight at the grid (along -Z or +Z)
- Need margin, so maybe camera at z = 30 or so

Let me calculate: for a 30x30 grid with spacing 1.0 and box 0.8:
- Total width: 29 * 1.0 + 0.8 = 29.8 (from left edge of first box to right edge of last box)
- Actually, centers go from -14.5 to 14.5, edges go from -14.9 to 14.9
- So about 29.8 units wide

For a perspective camera with FOV 60°:
- At distance d, visible height = 2 * d * tan(30°) = 2 * d * 0.577 = 1.155 * d
- We need at least 30 units of height (plus margin), so 30 / 1.155 ≈ 26
- Let's use d = 30 for some margin

Actually, let me use FOV 60 and place camera at z = 35 for comfortable margin.

For the click handling:
- Listen for 'click' event on the renderer's canvas
- Convert to NDC using bounding rect
- Use Raycaster to find intersections with the InstancedMesh
- Get instanceId from intersection
- Toggle color for that instance
- Flag instanceColor.needsUpdate = true

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create InstancedMesh
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, 900);

const dummy = new THREE.Object3D();
const gray = new THREE.Color(0x808080);

let index = 0;
for (let i = 0; i < 30; i++) {
  for (let j = 0; j < 30; j++) {
    dummy.position.set(j - 14.5, i - 14.5, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, gray);
    index++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

scene.add(mesh);

(window as any).__mesh = mesh;

// Raycaster for click
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(mesh);
  
  if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
    const id = intersects[0].instanceId;
    const currentColor = new THREE.Color();
    mesh.getColorAt(id, currentColor);
    
    if (currentColor.r < 0.5) { // gray (0.5)
      mesh.setColorAt(id, new THREE.Color(0xff0000));
    } else { // red (1.0)
      mesh.setColorAt(id, new THREE.Color(0x808080));
    }
    
    mesh.instanceColor!.needsUpdate = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
renderer.setAnimationLoop((time) => {
  if ((window as any).__ready === undefined) {
    (window as any).__ready = true;
  }
  renderer.render(scene, camera);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to think about the color check more carefully. Gray is 0x808080 which is (0.5, 0.5, 0.5). Red is 0xff0000 which is (1, 0, 0). So checking currentColor.r: gray has r=0.5, red has r=1.0. I can check if r > 0.75 for red, or r < 0.75 for gray. Or I could check if r === 1.0 (approximately). Let me use a simple comparison: if the color is approximately gray (r ≈ 0.5, g ≈ 0.5, b ≈ 0.5), set to red. Otherwise set to gray.

Actually a cleaner approach: compare with the gray color directly.

Let me also double-check: the grid is in the XY plane. The boxes have depth (Z dimension) of 0.8. The camera is along the Z axis looking at the grid. This should work fine for raycasting.

For the camera distance: 30 units wide grid, with FOV 60:
- Half-height at distance d = d * tan(30°) = d * 0.577
- Need half-height ≥ 15 (to cover from -15 to 15) with margin
- d * 0.577 ≥ 16 → d ≥ 27.7

Let me use d = 30 for a bit of margin. Actually let me use 35 to be safe.

Hmm, actually let me recalculate. The grid centers go from -14.5 to 14.5. Box size is 0.8, so edges go from -14.9 to 14.9. That's about 29.8 units. With FOV 60:
- visible height at distance d = 2 * d * tan(30°) = 1.1547 * d
- Need 2 * d * tan(30°) ≥ 32 (29.8 + some margin)
- d ≥ 32 / 1.1547 ≈ 27.7

So d = 30 should be fine with a small margin. Let me use 30.

Actually, the aspect ratio might be wider than tall, so the limiting factor is height. Let's use 30.

Let me finalize the code.
