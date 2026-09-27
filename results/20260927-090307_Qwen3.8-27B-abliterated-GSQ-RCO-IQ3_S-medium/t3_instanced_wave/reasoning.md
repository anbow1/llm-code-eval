The user wants a single TypeScript file that:
1. Creates a WebGLRenderer, appends canvas to document.body
2. Handles window resize
3. Creates a 100x100 grid of small cubes using ONE InstancedMesh (10,000 instances)
4. Animates a radial wave: sin(distanceFromCenter * k - time * speed) * amplitude
5. Uses setMatrixAt for each instance's Y position
6. Uses setColorAt for gradient by grid position
7. Reuses one Object3D or Matrix4 for updates (no allocations in render loop)
8. MeshStandardMaterial, AmbientLight + DirectionalLight
9. Camera at an angle to see the whole grid and wave
10. Exposes __scene, __camera, __renderer, __ready
11. Uses renderer.setAnimationLoop
12. Motion uses delta/elapsed time
13. Import THREE from 'three'
14. Compiles with tsc --strict

Let me write this carefully.

Key considerations:
- No allocations in render loop: I'll pre-allocate a Matrix4 and use it to compose the matrix each frame
- 100x100 = 10,000 instances
- Grid spacing: let's say 0.5 units apart, so the grid is 50x50 units
- Cube size: small, maybe 0.3
- Camera positioned at an angle above to see the whole thing
- Time-based animation using clock or elapsed time

Let me structure this:

```typescript
import * as THREE from 'three';

const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 0.5;
const CUBE_SIZE = 0.3;
const WAVE_K = 1.0;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 1.0;

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(30, 25, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(10, 20, 10);
scene.add(directional);

// Geometry and material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial();
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Pre-compute instance positions (x, z) and distances
// Use a reusable matrix for updates
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const scale = new THREE.Vector3(1, 1, 1);
const quaternion = new THREE.Quaternion();

// Store x, z positions and distances
const positions: number[] = []; // [x0, z0, x1, z1, ...]
const distances: number[] = [];

let idx = 0;
for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
        const x = (gx - GRID / 2 + 0.5) * SPACING;
        const z = (gz - GRID / 2 + 0.5) * SPACING;
        positions.push(x, z);
        const dist = Math.sqrt(x * x + z * z);
        distances.push(dist);
        
        // Set initial matrix
        matrix.compose(position.set(x, 0, z), quaternion, scale);
        mesh.setMatrixAt(idx, matrix);
        
        // Color gradient by grid position
        const color = new THREE.Color();
        color.setHSL((gx + gz) / (2 * GRID), 0.8, 0.5);
        mesh.setColorAt(idx, color);
        
        idx++;
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let elapsed = 0;
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    elapsed += delta;
    
    for (let i = 0; i < COUNT; i++) {
        const x = positions[i * 2];
        const z = positions[i * 2 + 1];
        const dist = distances[i];
        const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
        
        position.set(x, y, z);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    
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
```

Wait, I need to be careful about allocations. The `position` Vector3 and `matrix` Matrix4 are pre-allocated outside the loop. Good. The `Color` is created inside the initialization loop, not the render loop, so that's fine.

Let me also make sure the camera is positioned well to see the whole 100x100 grid. The grid spans from -25 to +25 in both x and z (100 * 0.5 / 2 = 25). So camera at (30, 25, 30) looking at origin should work, but let me adjust - maybe (35, 30, 35) to get a better view.

Actually let me recalculate: (gx - 50 + 0.5) * 0.5, so gx=0 gives (0-50+0.5)*0.5 = -24.75, gx=99 gives (99-50+0.5)*0.5 = 24.75. So the grid spans about -25 to +25. Camera at (35, 25, 35) should be fine.

Let me finalize and make sure it's strict TypeScript compatible.
