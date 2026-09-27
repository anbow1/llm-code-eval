Let me write a complete TypeScript file that:

1. Creates a 100x100 grid of small cubes using one InstancedMesh (10,000 instances)
2. Animates a radial wave where each instance's Y position = sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses one Matrix4 (or Object3D) for updates - no allocations in render loop
5. MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid
7. Handles resize, uses setAnimationLoop
8. Exposes __scene, __camera, __renderer, __ready

Let me think about the structure:

- Grid: 100x100 = 10,000 instances
- Cube geometry: BoxGeometry(1, 1, 1) or smaller, say BoxGeometry(0.5, 0.5, 0.5)
- Spacing between cubes: maybe 1.0 so the grid spans from -50 to +50
- Distance from center: sqrt((x-centerX)^2 + (z-centerZ)^2) where centerX and centerZ are the middle of the grid
- Wave: y = sin(dist * k - time * speed) * amplitude
- Color gradient: based on grid position, maybe a linear gradient from one corner to another, or radial

Let me plan the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera - angled view
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// Position camera so we can see the whole 100x100 grid
// Grid spans -50 to 50 (if centered), so camera should be above and at an angle
camera.position.set(0, 80, 100);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 80, 50);
scene.add(directionalLight);

// Grid setup
const GRID_SIZE = 100;
const CUBE_SIZE = 0.5;
const SPACING = 1.0;
const HALF = (GRID_SIZE - 1) * SPACING * 0.5; // 49.5

// Geometry and material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.3,
});

// InstancedMesh
const count = GRID_SIZE * GRID_SIZE;
const mesh = new THREE.InstancedMesh(geometry, material, count);
scene.add(mesh);

// Precompute positions and distances
const positions: Float32Array = new Float32Array(count * 3); // x, z, dist
let idx = 0;
for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
        const x = col * SPACING - HALF;
        const z = row * SPACING - HALF;
        const dist = Math.sqrt(x * x + z * z);
        positions[idx] = x;
        positions[idx + 1] = z;
        positions[idx + 2] = dist;
        idx++;
    }
}

// Set initial matrices and colors
const tempMatrix = new THREE.Matrix4();
const color = new THREE.Color();

for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const z = positions[i * 3 + 1];
    tempMatrix.makeTranslation(x, 0, z);
    mesh.setMatrixAt(i, tempMatrix);
    
    // Gradient color based on position (e.g., from corner to corner)
    const u = (col / (GRID_SIZE - 1)); // 0 to 1
    const v = (row / (GRID_SIZE - 1)); // 0 to 1
    // Let me use a radial gradient
    const dist = positions[i * 3 + 2];
    const maxDist = HALF * Math.sqrt(2);
    const t = dist / maxDist;
    color.setHSL(t, 0.8, 0.5);
    mesh.setColorAt(i, color);
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
```

Wait, I need to be careful about the row/col indexing for colors. Let me restructure.

Actually, let me re-index. I'll store x, z, dist per instance in arrays, and also store the gradient values.

For the color gradient, I'll use a nice gradient based on grid position - maybe HSL based on the angle from center or based on x/z position.

Let me use a gradient where hue goes from blue at one corner to red at the opposite corner, based on normalized x and z.

Actually, let me use: hue = (u + v) / 2 * 0.6 where u = col/(GRID_SIZE-1), v = row/(GRID_SIZE-1). That gives a nice diagonal gradient.

For the animation:
- k = some spatial frequency, like 0.15
- speed = some angular frequency, like 2.0
- amplitude = some height, like 3.0

The wave: y = sin(dist * k - elapsed * speed) * amplitude

I need to use a single Matrix4 and set it via makeTranslation each frame. No allocations.

Let me also make sure I handle the `__ready` flag properly - set it after the first frame.

Let me write the complete file now.
