Let me carefully implement this:

1. Create a 30x30 grid of boxes (900 total)
2. Use ONE InstancedMesh with BoxGeometry(0.8, 0.8, 0.8)
3. MeshBasicMaterial white so instance colors show
4. Grid in XY plane, spacing 1.0, centered on origin
5. PerspectiveCamera looking straight at the grid (from +Z looking at -Z)
6. Camera positioned to see the whole grid with margin
7. No animation/camera movement
8. All instances start gray (0x808080)
9. Click toggles: gray -> red, red -> gray
10. Raycaster with NDC from canvas bounding rect
11. Flag instance colors for upload
12. Expose __scene, __camera, __renderer, __mesh, __ready

Let me think about the grid layout:
- 30x30 grid
- Spacing 1.0, box size 0.8
- Centered on origin
- In XY plane (facing camera on Z axis)

For a 30x30 grid centered on origin:
- Index i goes from 0 to 29
- Position x = (i - 14.5) * 1.0  => ranges from -14.5 to 14.5
- Same for y

Grid extent: -14.5 to 14.5 in both X and Y, so total span is 29 units (from -14.5 to 14.5).
With box size 0.8, the outer edge extends to 14.5 + 0.4 = 14.9 in each direction.

For the camera, I need to see the whole grid with margin. Let me calculate:
- Grid spans roughly 29.8 units in both X and Y (from -14.9 to 14.9)
- I'll place the camera at z = some distance
- Need the vertical FOV to cover at least 29.8 + margin

Let me use FOV = 60 degrees (vertical). 
- half height visible = tan(30°) * z_distance
- I need half height >= 14.9 + margin (say 1 unit) = 15.9
- tan(30°) = 0.577
- z_distance = 15.9 / 0.577 ≈ 27.5

Let me use z = 30 for some margin. At z=30, half height = tan(30°) * 30 = 17.32. Total height visible = 34.64. Grid is 29.8 tall, so margin is about 2.4 on each side. That's good.

Now for the width: aspect ratio will affect horizontal visibility. The grid is square (29.8 x 29.8), so as long as the window isn't extremely narrow, it should be fine. But to be safe, I could use a slightly wider FOV or adjust. Actually, the spec says "whole grid visible with a margin" - let me just make sure z=30 with FOV 60 works. If the window is very wide, horizontal will be even more visible. If very narrow... but that's an edge case. Let me stick with FOV 60, z=30.

Actually, let me reconsider. The spec says "whole grid visible with a margin." I should make sure this works for reasonable aspect ratios. With FOV 60 (vertical) and z=30:
- Vertical visible: 2 * 30 * tan(30°) = 2 * 30 * 0.577 = 34.64
- Grid height: 29.8
- Margin: (34.64 - 29.8) / 2 = 2.42 units each side - good

For horizontal, at 16:9 aspect:
- Horizontal visible: 34.64 * (16/9) = 61.7 - way more than enough

Even at a 1:1 aspect, horizontal = 34.64 which is still fine.

Let me code this up:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const gridSize = 30;
const boxSize = 0.8;
const spacing = 1.0;
const count = gridSize * gridSize;

const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, count);

const color = new THREE.Color();
const matrix = new THREE.Matrix4();

for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    const idx = row * gridSize + col;
    const x = (col - (gridSize - 1) / 2) * spacing;
    const y = (row - (gridSize - 1) / 2) * spacing;
    
    matrix.makeTranslation(x, y, 0);
    mesh.setMatrixAt(idx, matrix);
    
    color.setHex(0x808080);
    mesh.setColorAt(idx, color);
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Raycaster
const raycaster = new THREE.Raycaster();
const colors: number[] = new Array(count).fill(0x808080);

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  
  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObject(mesh);
  
  if (intersections.length > 0) {
    const instanceId = intersections[0].instanceId;
    if (instanceId !== undefined) {
      if (colors[instanceId] === 0x808080) {
        colors[instanceId] = 0xff0000;
        color.setHex(0xff0000);
      } else {
        colors[instanceId] = 0x808080;
        color.setHex(0x808080);
      }
      mesh.setColorAt(instanceId, color);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
});

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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;
```

Wait, I need to think about the `needsUpdate` for instanceColor. When we call `mesh.setColorAt`, it creates the instanceColor buffer if it doesn't exist. So after the first `setColorAt` call in the loop, `mesh.instanceColor` should exist. Let me add `mesh.instanceColor.needsUpdate = true` after the loop.

Actually, looking at Three.js source, `setColorAt` creates `this.instanceColor` if it's null. So after the loop, it should be set. Let me add the needsUpdate flag.

Let me also make sure the material approach is correct. MeshBasicMaterial with white color - the instance colors will multiply with the material color. Since material color is white (1,1,1), the instance colors show exactly as set. Good.

One thing: I should make sure the `colors` array properly tracks state. Let me use a proper approach.

Let me also double-check: the spec says "No camera movement, no animation." So I just render a static scene. The animation loop is just for rendering (needed for the click interaction to be visible).

I think the code is solid. Let me finalize it.
