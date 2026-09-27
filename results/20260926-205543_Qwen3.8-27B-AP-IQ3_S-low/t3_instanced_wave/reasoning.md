The user wants a single TypeScript file that:

1. Creates a 100x100 grid of cubes using ONE InstancedMesh
2. Animates a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses a single Object3D or Matrix4 for updates (no allocations in render loop)
5. MeshStandardMaterial with AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid
7. Follows all the hard rules from the system prompt

Let me plan the implementation:

- Grid: 100x100 = 10,000 instances
- Spacing: maybe 1 unit between cubes, so the grid spans from -50 to +50 (or 0 to 100, centered)
- Let me center it: positions from -49.5 to +49.5 with spacing 1, or -49 to 49 with spacing 1
- Actually, let's use spacing that makes sense. Let's say spacing = 1, and positions go from -49.5 to 49.5 (100 points centered at 0)
- Wait, 100 points centered: from -49.5 to 49.5 with step 1. Or from -50 to 49 with step 1. Let me just use index-based: x = (i - 49.5) * spacing, z = (j - 49.5) * spacing

For the wave:
- distanceFromCenter = sqrt(x^2 + z^2)
- y = sin(distance * k - time * speed) * amplitude
- k could be something like 0.3 or 0.5
- speed could be 2 or 3
- amplitude could be 2 or 3

For colors:
- Gradient by grid position, maybe a hue based on position

For the render loop:
- Use a single Matrix4 (or Object3D) to compose each instance's matrix
- No allocations in the loop

Let me write this out:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 80, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(50, 100, 50);
scene.add(dirLight);

// Grid parameters
const GRID = 100;
const SPACING = 1;
const HALF = (GRID - 1) / 2;

// Geometry and material
const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.2 });

// InstancedMesh
const count = GRID * GRID;
const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, count);
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Set initial colors
const color = new THREE.Color();
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        const x = (i - HALF) * SPACING;
        const z = (j - HALF) * SPACING;
        // Hue gradient based on position
        const hue = (x + HALF) / (GRID - 1) * 0.6 + (z + HALF) / (GRID - 1) * 0.2;
        color.setHSL(hue, 0.8, 0.5);
        instancedMesh.setColorAt(idx, color);
    }
}
instancedMesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
scene.add(instancedMesh);

// Reusable objects (no allocations in loop)
const dummy = new THREE.Object3D();
const clock = new THREE.Clock();

// Wave parameters
const WAVE_K = 0.3;
const WAVE_SPEED = 2.5;
const WAVE_AMPLITUDE = 2.5;

// Store positions for distance calculation (pre-compute)
// Actually we can compute distance from center each frame since we know x and z
// But to avoid recomputing sqrt, let's pre-compute distances
const distances = new Float32Array(count);
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        const x = (i - HALF) * SPACING;
        const z = (j - HALF) * SPACING;
        distances[idx] = Math.sqrt(x * x + z * z);
    }
}

// Also pre-compute x and z positions
const positions = new Float32Array(count * 2);
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        positions[idx * 2] = (i - HALF) * SPACING;
        positions[idx * 2 + 1] = (j - HALF) * SPACING;
    }
}

let ready = false;

renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    
    for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
            const idx = i * GRID + j;
            const x = positions[idx * 2];
            const z = positions[idx * 2 + 1];
            const y = Math.sin(distances[idx] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
            
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(idx, dummy.matrix);
        }
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    renderer.render(scene, camera);
    
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Resize
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

Wait, I need to make sure there are no allocations in the render loop. The `dummy` Object3D is created outside. The `positions` and `distances` arrays are pre-allocated. The `Math.sin` doesn't allocate. Good.

Let me also make sure the camera angle is good. With a 100x100 grid and spacing 1, the grid spans about 99 units in each direction. Camera at (80, 80, 80) looking at origin should work, but let me adjust - maybe (70, 70, 70) or (80, 60, 80) for a better angle.

Actually let me think about the camera more carefully. The grid goes from about -49.5 to +49.5 in both X and Z. So it's about 99 units wide. A camera at (80, 80, 80) with FOV 60 should be able to see it. Let me use something like (75, 60, 75) looking at (0, 0, 0) for a nice angled view.

Let me also double-check: `dummy.updateMatrix()` does allocate? No, Object3D.updateMatrix() just computes the matrix from position/rotation/scale. It doesn't allocate - it writes into `this.matrix`. So that's fine.

Actually wait - I should double check. In Three.js, Object3D has a `matrix` property that's a Matrix4, and `updateMatrix()` just fills it in. No allocation. Good.

Let me finalize the code.
