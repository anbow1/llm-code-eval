The user wants a single TypeScript file that renders a 100x100 grid of small cubes using InstancedMesh, with:
1. A radial wave animation on Y position
2. Per-instance colors (gradient by grid position)
3. No allocations in the render loop (reuse Matrix4/Object3D)
4. MeshStandardMaterial, AmbientLight + DirectionalLight
5. Camera at an angle
6. Expose __scene, __camera, __renderer, __ready
7. Use setAnimationLoop
8. Import THREE from 'three'

Let me think through the implementation:

- 100x100 = 10,000 instances
- Grid positions: x from -49 to 50, z from -49 to 50 (or similar, centered)
- Each instance: small cube, position at (gx, 0, gz)
- Wave: y = sin(distanceFromCenter * k - time * speed) * amplitude
- Color: gradient by grid position (e.g., based on x/z or radial distance)
- Reuse one Matrix4 for setMatrixAt
- Reuse one Color for setColorAt (or just set it once)

For the render loop:
- Use a clock or track elapsed time
- Each frame, compute the matrix for each instance using the reused Matrix4
- setMatrixAt(i, matrix)
- instanceMatrix.needsUpdate = true

Let me write this carefully:

```typescript
import * as THREE from 'three';

const GRID_SIZE = 100;
const CUBE_SIZE = 0.8;
const SPACING = 1.0;
const HALF = (GRID_SIZE - 1) * SPACING / 2;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// Camera - at an angle so whole grid visible
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(80, 70, 80);
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
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// InstancedMesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);
scene.add(instancedMesh);

// Set initial positions and colors
const tmpMatrix = new THREE.Matrix4();
const tmpColor = new THREE.Color();

for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const idx = i * GRID_SIZE + j;
        const x = i * SPACING - HALF;
        const z = j * SPACING - HALF;
        
        // Position
        tmpMatrix.makeTranslation(x, 0, z);
        instancedMesh.setMatrixAt(idx, tmpMatrix);
        
        // Color gradient by grid position
        const r = (i / GRID_SIZE);
        const g = (j / GRID_SIZE);
        tmpColor.setRGB(r, g, 0.5);
        instancedMesh.setColorAt(idx, tmpColor);
    }
}
instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

// Animation
const K = 0.3;
const SPEED = 3.0;
const AMPLITUDE = 2.0;

let elapsed = 0;
let lastTime = performance.now();

renderer.setAnimationLoop(() => {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    elapsed += delta;
    
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const idx = i * GRID_SIZE + j;
            const x = i * SPACING - HALF;
            const z = j * SPACING - HALF;
            const dist = Math.sqrt(x * x + z * z);
            const y = Math.sin(dist * K - elapsed * SPEED) * AMPLITUDE;
            
            tmpMatrix.makeTranslation(x, y, z);
            instancedMesh.setMatrixAt(idx, tmpMatrix);
        }
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    renderer.render(scene, camera);
    
    (window as any).__ready = true;
});

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure `__ready` is set only after the first frame. Since `setAnimationLoop` callback runs before the first render completes... actually it runs, then renders. So setting `__ready = true` after `renderer.render` in the loop should be fine. But it will be set every frame. That's fine, it just gets set to true each time.

Actually, let me think about whether setting it every frame is an issue. The requirement says "After the first frame is rendered, set (window as any).__ready = true." Setting it every frame is fine since it's already true after the first frame.

Let me also make sure I'm not allocating inside the render loop. I'm reusing `tmpMatrix` and computing `x`, `z`, `dist`, `y` as local variables (primitives, no allocation). The `Math.sqrt` and `Math.sin` don't allocate. `makeTranslation` writes into the existing matrix. `setMatrixAt` writes into the instanceMatrix buffer. Good.

One concern: `tmpMatrix.makeTranslation(x, y, z)` - does this allocate? No, it just sets elements of the matrix. Good.

Let me double-check the camera position. Grid is 100x100, spacing 1, so it spans from -49.5 to +49.5 in both x and z. Camera at (80, 70, 80) looking at origin with FOV 50 should be able to see the whole thing. Let me check: the diagonal of the grid is about 100*sqrt(2) ≈ 141. From (80,70,80) to origin is sqrt(80²+70²+80²) ≈ sqrt(6400+4900+6400) = sqrt(17700) ≈ 133. With FOV 50°, the half-angle is 25°, so the visible width at distance 133 is 2*133*tan(25°) ≈ 2*133*0.466 ≈ 124. Hmm, that might not be enough to see the entire 100-wide grid from that angle. Let me push the camera further out.

Let me use camera position (100, 80, 100). Distance to origin: sqrt(10000+6400+10000) = sqrt(26400) ≈ 162. Visible width: 2*162*tan(25°) ≈ 2*162*0.466 ≈ 151. That should cover the ~141 diagonal.

Actually, let me be more generous: camera at (120, 90, 120). Distance ≈ sqrt(14400+8100+14400) = sqrt(36900) ≈ 192. Visible width ≈ 2*192*0.466 ≈ 179. That should be plenty.

Let me go with (100, 80, 100) which should work well.

Also, I should make sure the `instanceColor` buffer is properly initialized. In Three.js, `setColorAt` creates the `instanceColor` InstancedBufferAttribute if it doesn't exist. So calling it in the init loop should work.

Let me finalize the code.
