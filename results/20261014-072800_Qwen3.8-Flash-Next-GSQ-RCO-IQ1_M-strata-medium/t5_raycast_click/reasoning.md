The user wants a 5x5 grid of cubes in the XY plane, facing the camera, with visible gaps between them. Let me think through the requirements:

1. 5x5 grid of cubes (25 separate Mesh objects) in the XY plane, facing the camera
2. Visible gaps between them
3. Each cube has its OWN MeshStandardMaterial with color 0x4488ff
4. Clicking a cube selects it: material color becomes 0xff0000
5. Only one cube selected at a time; previously selected goes back to 0x4488ff
6. Clicking empty background clears selection
7. Use THREE.Raycaster with NDC computed from canvas bounding rect
8. PerspectiveCamera looking straight at the grid, whole grid visible with margin
9. No camera movement, no animation of cubes
10. AmbientLight + DirectionalLight

Let me plan the layout:
- 5x5 grid in XY plane (so cubes are arranged along X and Y axes)
- Camera looks down Z axis toward the grid
- Spacing: cube size 1, gap 0.3 → spacing 1.3
- Grid center at origin, so positions from -2*1.3 to 2*1.3

Camera positioning:
- Grid spans from -2*1.3 - 0.5 to 2*1.3 + 0.5 = -3.1 to 3.1 (width/height)
- With margin, let's make FOV such that the grid is visible with margin
- Use PerspectiveCamera with fov ~50, position at z = some distance
- At fov 50, half-height at distance d = tan(25°) * d. For d=10: tan(25°)*10 = 4.66. Grid height is ~6.2. Hmm, that's not enough.
- Let me use fov 60: tan(30°) * d. For d=12: 0.577*12 = 6.9. Grid needs ~6.2 + margin. That works.
- Actually let me compute more carefully. Grid is 5*1.3 - 1.3 + 1 = 5.2 units wide (from -2.6 to 2.6). Plus cube size 1, so from -3.1 to 3.1, total 6.2.
- With fov 60 and aspect ratio of window, horizontal FOV is larger. Let me use a safe distance.
- tan(30°) * dist > 3.1 + margin. 0.577 * dist > 4.0 → dist > 6.93. Use dist = 10.
- For horizontal: need to account for aspect ratio. If window is wide, vertical is limiting factor. If window is tall (portrait), horizontal might be limiting. Let's use fov 60 and distance 10. tan(30°)*10 = 5.77. That gives 5.77 units vertically. Grid is 6.2 units... not enough.
- Let me use fov 70: tan(35°)*10 = 0.7*10 = 7.0. That works.
- Or use distance 12 with fov 60: 0.577*12 = 6.93. Still tight.
- Let me use distance 15 with fov 50: tan(25°)*15 = 0.466*15 = 6.99. OK.
- Actually let me just use fov 50 and compute distance based on the viewport aspect ratio to ensure the grid fits.

Better approach: compute distance based on aspect ratio:
- halfHeight = 3.1 + margin (say 1.0) = 4.1
- halfWidth = 3.1 + margin = 4.1
- fov = 50 degrees, fovRad = 50 * PI / 180
- dist_v = halfHeight / tan(fovRad/2)
- dist_h = halfWidth / (tan(fovRad/2) * aspect)
- dist = max(dist_v, dist_h)

Let me just set a fixed camera that works. Grid spans 5.2 units + cube size. Center to edge is 2*1.3 + 0.5 = 3.1. With margin 1.5, half-extent is 4.6.

Using fov = 50: tan(25°) = 0.4663. dist = 4.6 / 0.4663 = 9.86. Round to 10.

For wide screens, horizontal is wider so vertical is limiting. For very narrow screens (portrait), horizontal might be limiting but aspect < 1 means tan(hFov/2) < tan(vFov/2)... actually for portrait, horizontal FOV is smaller, so we'd need more distance. Let me handle this dynamically.

Actually, to keep it simple and robust, let me compute distance dynamically in the resize handler:
- fovV = 50 * DEG2RAD
- hFov = 2 * atan(tan(fovV/2) * aspect)
- halfExtents: 3.1 + 1.5 = 4.6
- distV = 4.6 / tan(fovV/2)
- distH = 4.6 / tan(hFov/2)
- dist = max(distV, distH)

Let me implement this. I'll put the camera at (0, 0, dist) looking at origin.

For the click handling:
- On click, compute NDC from canvas bounding rect
- Raycast
- If hit a cube, set that cube's material color to 0xff0000, reset previous
- If no hit, reset all

Let me write the code now.

```ts
import * as THREE from 'three';

// Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const fov = 50;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);

function computeDistance(): number {
    const halfExtent = 4.6; // grid half-size + margin
    const fovRad = fov * Math.PI / 180;
    const distV = halfExtent / Math.tan(fovRad / 2);
    const hFov = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
    const distH = halfExtent / Math.tan(hFov / 2);
    return Math.max(distV, distH);
}

function updateCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.fov = fov;
    camera.updateProjectionMatrix();
    const dist = computeDistance();
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
}
// Hmm, computeDistance uses the closure aspect which changes. Let me refactor.

Actually let me just inline the computation in the resize handler.

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(2, 3, 5);
scene.add(dirLight);

// Cubes
const cubeSize = 1;
const gap = 0.3;
const spacing = cubeSize + gap; // 1.3
const half = 2; // indices -2 to 2

const cubes: THREE.Mesh[] = [];
const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(i * spacing, j * spacing, 0);
        scene.add(mesh);
        cubes.push(mesh);
    }
}

// Selection state
let selected: THREE.Mesh | null = null;

// Raycaster
const raycaster = new THREE.Raycaster();

// Click handler
renderer.canvas.addEventListener('click', () => {
    const rect = renderer.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const hits = raycaster.intersectObjects(cubes);
    if (hits.length > 0) {
        const hit = hits[0].object;
        if (selected && selected !== hit) {
            (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
        }
        (hit.material as THREE.MeshStandardMaterial).color.set(0xff0000);
        selected = hit;
    } else {
        if (selected) {
            (selected.material as THREE.MeshStandardMaterial).color.set(0x4488ff);
            selected = null;
        }
    }
});
```

Wait, the click event - I need to access the event properly. Let me use `addEventListener('click', (e) => { ... })`.

Let me also make sure the cubes face the camera. Since they're BoxGeometry and the camera looks along -Z toward the grid in XY plane, the front faces of cubes face the camera naturally. The "facing the camera" just means the grid is in XY plane and camera looks along Z. That's what I have.

Let me finalize the code. I need to handle resize properly - update camera aspect and recompute distance.

Actually, for the distance computation, I should do it on resize too. Let me structure it properly.

Let me also double check: `renderer.setAnimationLoop` - I need to use this. I'll just render the scene. No animation needed but I still need setAnimationLoop.

Let me write the complete file.
