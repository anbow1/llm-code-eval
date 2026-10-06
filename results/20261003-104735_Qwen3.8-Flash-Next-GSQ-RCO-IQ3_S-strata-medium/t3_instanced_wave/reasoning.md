The user wants a single TypeScript file that renders a 100x100 grid of cubes using a single InstancedMesh with a radial wave animation. Let me carefully construct this:

1. Create a 100x100 grid of small cubes using InstancedMesh (10,000 instances)
2. Animate a radial wave: y = sin(distance * k - time * speed) * amplitude
3. Use setColorAt for per-instance colors (gradient by position)
4. Reuse one Object3D/Matrix4 for updates - no allocations in the loop
5. MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid and wave
7. Must compile with tsc --strict
8. Import Three.js as 'three'
9. Use renderer.setAnimationLoop
10. Expose __scene, __camera, __renderer, __ready

Let me think about the implementation:

- Grid: 100x100, spacing say 1 unit, cube size 0.8x0.8x0.8
- Center of grid: (50, 0, 50) in world coords, or I can center it at origin
- Radial wave: for each instance at (x, z), compute distance from center, set y = sin(dist * k - time * speed) * amplitude
- Colors: gradient based on grid position (e.g., hue based on x/z position)
- Use a reusable THREE.Object3D to set position/rotation/scale, then getMatrix() into the instance matrix
- For colors, use setColorAt once during setup (colors don't change per frame in this animation)

Wait, the wave only affects Y position, so colors are set once and never change. But I still need to call setColorAt to assign colors initially.

Let me make sure no allocations happen in the render loop. I'll pre-create:
- A THREE.Object3D for positioning
- A THREE.Matrix4 for reuse (actually Object3D.matrix can be used via updateMatrix())

For the wave animation, I need to update every instance's matrix each frame. With 10,000 instances, this should still be fast enough.

Let me write the code:

```ts
import * as THREE from 'three';

// Setup renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(120, 80, 120);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(50, 100, 50);
scene.add(dirLight);

// Grid setup
const GRID_SIZE = 100;
const COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.7 });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Set colors (gradient by position)
const color = new THREE.Color();
for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const idx = i * GRID_SIZE + j;
        const hue = (i / GRID_SIZE + j / GRID_SIZE) * 0.5;
        color.setHSL(hue, 0.8, 0.5);
        mesh.setColorAt(idx, color);
    }
}
mesh.instanceColor!.needsUpdate = true;

// Initial positions
const dummy = new THREE.Object3D();

// Wave parameters
const WAVE_K = 0.3;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 3.0;

// Store positions to avoid recomputing
const positions: number[][] = []; // [x, z, distance]
for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const x = (i - GRID_SIZE / 2) * SPACING;
        const z = (j - GRID_SIZE / 2) * SPACING;
        const dist = Math.sqrt(x * x + z * z);
        positions.push([x, z, dist]);
    }
}

// Set initial matrices
for (let idx = 0; idx < COUNT; idx++) {
    dummy.position.set(positions[idx][0], 0, positions[idx][1]);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;

// Animation
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const time = clock.getElapsedTime();
    
    for (let idx = 0; idx < COUNT; idx++) {
        const x = positions[idx][0];
        const z = positions[idx][1];
        const dist = positions[idx][2];
        const y = Math.sin(dist * WAVE_K - time * WAVE_SPEED) * WAVE_AMPLITUDE;
        
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    
    renderer.render(scene, camera);
});

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Set ready after first frame
renderer.setAnimationLoop(() => { ... }); // wait, I need to set __ready after first frame

// Actually let me restructure to set __ready after first frame render.
```

Wait, I need to set `__ready = true` after the first frame. Let me restructure using a flag.

Also, for the positions array, I'm using `number[][]` which allocates. But that's outside the render loop, so it's fine. The key constraint is "no allocations inside the render loop."

Let me also make sure I don't allocate anything in the render loop. The `positions` array is pre-allocated. The `dummy` Object3D is pre-allocated. `updateMatrix()` doesn't allocate. Good.

Let me also store x, z, dist as flat arrays for better performance and to avoid array-of-array indirection:

Actually for tsc --strict, I need to make sure all types are correct. Let me use Float64Array or just number arrays typed properly.

Let me finalize the code.
