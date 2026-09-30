The user wants a single TypeScript file that:
1. Creates a 30x30 grid (900 instances) of boxes using ONE InstancedMesh
2. Grid in XY plane facing camera, box size 0.8, spacing 1.0, centered on origin
3. PerspectiveCamera looking at the grid, whole grid visible with margin
4. No camera movement, no animation
5. Every instance starts with color 0x808080 via setColorAt
6. MeshBasicMaterial (white) so instance colors show exactly
7. Clicking toggles color: gray→red, red→gray independently
8. Use THREE.Raycaster with NDC from canvas bounding rect, use intersection.instanceId
9. Flag instance colors for upload after changing
10. Expose mesh as window.__mesh, scene, camera, renderer, __ready

Let me think about the math:
- 30x30 grid, spacing 1.0, centered on origin
- Grid spans from -14.5 to 14.5 in both X and Y (centered)
- So x ranges from -14.5 to 14.5, y ranges from -14.5 to 14.5
- Box size 0.8, so visible gaps of 0.2 between boxes

Camera positioning:
- Grid extent: 29 units wide (from -14.5 to 14.5)
- Need to see 29 units with margin, so maybe 32-33 units
- With perspective camera, fov=50, aspect=window.innerWidth/window.innerHeight
- To see 32 units in height: tan(fov/2) = 16 / distance → distance = 16 / tan(25°) ≈ 34.3
- Actually let me compute: half-height visible = distance * tan(fov/2)
- Need half-height >= 16 (14.5 + margin ~1.5)
- distance >= 16 / tan(25°) ≈ 16 / 0.4663 ≈ 34.3
- Let's use distance ~40 to have comfortable margin

For the raycaster:
- Get bounding rect of canvas
- NDC x = ((event.clientX - rect.left) / rect.width) * 2 - 1
- NDC y = -((event.clientY - rect.top) / rect.height) * 2 + 1

For instanced mesh:
- Geometry: BoxGeometry(0.8, 0.8, 0.8)
- Material: MeshBasicMaterial({ color: 0xffffff })
- Count: 900
- Set positions using matrix, set colors using setColorAt

Let me write the code:

```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);
camera.lookAt(0, 0, 0);

// InstancedMesh
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const count = 900;
const mesh = new THREE.InstancedMesh(geometry, material, count);

// Set instance colors to gray
const grayColor = new THREE.Color(0x808080);
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();

for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 30);
    const col = i % 30;
    const x = (col - 14.5) * 1.0;
    const y = (row - 14.5) * 1.0;
    position.set(x, y, 0);
    matrix.setPosition(position);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, grayColor);
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

scene.add(mesh);

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__mesh = mesh;

// Raycaster for clicking
const raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersects = raycaster.intersectObject(mesh);
    
    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const id = intersects[0].instanceId;
        const color = new THREE.Color();
        mesh.getColorAt(id, color);
        
        if (color.r > 0.5) {
            // Red → Gray
            color.setHex(0x808080);
        } else {
            // Gray → Red
            color.setHex(0xff0000);
        }
        
        mesh.setColorAt(id, color);
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
        (window as any).__ready = true;
        firstFrame = false;
    }
});
```

Wait, I need to be careful with the color comparison. 0x808080 in linear space... Actually with MeshBasicMaterial and setColorAt, the color is set directly. Let me think about this.

When I do `color.setHex(0x808080)`, r = 128/255 ≈ 0.502. When I do `color.setHex(0xff0000)`, r = 1.0.

So checking `color.r > 0.5` would work: gray has r ≈ 0.502, red has r = 1.0. But that's a bit tight. Let me use `color.r > 0.9` instead to be safe, or check if r is close to 1.

Actually, 0x80 = 128, 128/255 = 0.50196... So `color.r > 0.5` would classify gray as "red" since 0.502 > 0.5. That's a bug!

Let me use a different check: check if r > 0.9 (red) or r < 0.6 (gray). Or better, check `color.g` - gray has g ≈ 0.5, red has g = 0.

Actually the simplest: check if `color.r > 0.9` → it's red, toggle to gray. Otherwise → gray, toggle to red.

Or I could track state differently. Let me just check `color.r > 0.9`:
- 0x808080: r = 0.502, not > 0.9, so → set to red ✓
- 0xff0000: r = 1.0, > 0.9, so → set to gray ✓

That works. Let me also make sure the body has no margin/padding so the canvas fills the screen properly.

Actually, I should set body margin to 0 and overflow hidden. Let me add that.
