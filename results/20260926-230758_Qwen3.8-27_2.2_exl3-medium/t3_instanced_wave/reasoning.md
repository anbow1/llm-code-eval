The user wants a complete TypeScript file that renders a 100x100 grid of small cubes using a single InstancedMesh with 10,000 instances. Let me plan this out:

1. Import Three.js
2. Create a WebGLRenderer, append canvas to document.body
3. Create a scene, camera positioned at an angle
4. Create an InstancedMesh with 10,000 instances (100x100 grid)
5. Use MeshStandardMaterial
6. Add AmbientLight + DirectionalLight
7. Animate a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
8. Use setColorAt for gradient colors
9. Reuse one Object3D/Matrix4 for updates (no allocations in render loop)
10. Handle window resize
11. Use renderer.setAnimationLoop
12. Expose __scene, __camera, __renderer, __ready

Let me think about the details:

- Grid: 100x100 = 10,000 cubes
- Each cube is small, say 0.3 units
- Grid spacing: maybe 1 unit apart, so total grid is about 100 units wide
- Camera needs to see the whole grid at an angle
- Wave: distance from center, sin wave

For the Object3D reuse: I'll create one Object3D and reuse it to set each instance's matrix. I'll get the matrix from the Object3D's matrix property.

Actually, I should use a single Matrix4 and Object3D. Let me use one Object3D, set its position, then get its matrix via updateMatrix(), then use instanceMatrix.setMatrixAt(i, obj.matrix).

Wait, the Object3D's matrix is a Matrix4. I can use it directly. Let me think about this more carefully.

For each instance i:
- Compute x, z position from grid index
- Compute distance from center
- Compute y = sin(distance * k - time * speed) * amplitude
- Set the Object3D position to (x, y, z)
- Call updateMatrix()
- Set instanceMatrix.setMatrixAt(i, obj.matrix)

After all instances are updated, set instanceMatrix.needsUpdate = true.

For colors: I'll set them once at the beginning (gradient by grid position).

Let me think about the camera position. The grid is 100x100 units (if spacing is 1). Center is at (0, 0, 0). Camera could be at something like (60, 50, 60) looking at the center. Actually let me make the grid centered at origin with spacing of 1, so it goes from -50 to 50 in x and z.

Camera at (80, 60, 80) looking at (0, 0, 0) would give a nice angled view.

Let me also think about the cube size. If spacing is 1, cubes should be about 0.8 to leave gaps. Let's use 0.8.

For the wave parameters:
- k = 0.5 (frequency)
- speed = 2 (how fast the wave moves)
- amplitude = 2 (max Y displacement)

Let me write the code now.

```typescript
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 60, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 80, 30);
scene.add(directionalLight);

// InstancedMesh
const GRID = 100;
const COUNT = GRID * GRID;
const CUBE_SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
    roughness: 0.5,
    metalness: 0.1,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Pre-compute base positions
const basePositions: number[] = new Array(COUNT * 2); // x, z for each instance
let idx = 0;
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const x = (i - GRID / 2 + 0.5) * SPACING;
        const z = (j - GRID / 2 + 0.5) * SPACING;
        basePositions[idx] = x;
        basePositions[idx + 1] = z;
        idx += 2;
    }
}

// Set colors (gradient by grid position)
const color = new THREE.Color();
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const t = (i + j) / (2 * GRID);
        color.setHSL(0.6 * t, 0.8, 0.5 + 0.3 * t);
        mesh.setColorAt(i * GRID + j, color);
    }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable Object3D for matrix updates
const dummy = new THREE.Object3D();

// Wave parameters
const WAVE_K = 0.5;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 2.0;

// Animation
let elapsed = 0;
let firstFrame = false;

renderer.setAnimationLoop((time) => {
    // We need delta time - use a clock or track previous time
    // Actually, setAnimationLoop gives us a timestamp in ms
    // Let me use a THREE.Clock or track elapsed manually
    
    if (!firstFrame) {
        firstFrame = true;
        (window as any).__ready = true;
    }
    
    // Track elapsed time
    // I'll use a simple approach: store previous time
    ...
});
```

Wait, I need to be careful with the timing. `setAnimationLoop` gives a timestamp in milliseconds. I can use a THREE.Clock or just track the previous timestamp.

Let me use a simple approach: store the previous timestamp and compute delta.

Actually, I'll use THREE.Clock for cleanliness.

Let me also make sure I don't allocate anything in the render loop. The basePositions array is pre-allocated. The dummy Object3D is pre-allocated. The color is pre-allocated.

Let me finalize the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 60, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 80, 30);
scene.add(directionalLight);

const GRID = 100;
const COUNT = GRID * GRID;
const CUBE_SIZE = 0.8;
const SPACING = 1.0;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
    roughness: 0.5,
    metalness: 0.1,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Pre-compute base X and Z positions
const baseX: number[] = new Array(COUNT);
const baseZ: number[] = new Array(COUNT);
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        baseX[idx] = (i - GRID / 2 + 0.5) * SPACING;
        baseZ[idx] = (j - GRID / 2 + 0.5) * SPACING;
    }
}

// Set colors
const tmpColor = new THREE.Color();
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        const t = (i + j) / (2 * GRID);
        tmpColor.setHSL(0.6 * t, 0.8, 0.5 + 0.3 * t);
        mesh.setColorAt(idx, tmpColor);
    }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable dummy object
const dummy = new THREE.Object3D();

// Wave params
const WAVE_K = 0.5;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 2.0;

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }

    for (let idx = 0; idx < COUNT; idx++) {
        const x = baseX[idx];
        const z = baseZ[idx];
        const dist = Math.sqrt(x * x + z * z);
        const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;

        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
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

Wait, I need to double-check: `mesh.instanceColor` - in Three.js, when you call `setColorAt`, it creates the instanceColor buffer. So `mesh.instanceColor` should be non-null after the first `setColorAt` call. But TypeScript strict mode might complain. Let me use a non-null assertion or check.

Actually, `InstancedMesh.setColorAt` creates the `instanceColor` buffer if it doesn't exist. After calling it, `instanceColor` is an `InstancedBufferAttribute | null`. In strict mode, I need to handle this. Let me use `!` after the loop.

Actually, looking at the Three.js types: `instanceColor` is `InstancedBufferAttribute | null`. After calling `setColorAt`, it's not null. So I can do `mesh.instanceColor!.needsUpdate = true;`.

Let me also think about whether `dummy.updateMatrix()` allocates anything. It just updates the matrix from position/rotation/scale. No allocation. Good.

One concern: `Math.sqrt` is called 10,000 times per frame. That's fine performance-wise.

Let me also consider: should I use `instanceMatrix` directly? The property is `instanceMatrix` which is a `InstancedBufferAttribute`. Calling `mesh.setMatrixAt(idx, matrix)` is the correct API.

I think this is solid. Let me write the final version.

Actually, wait - I should double check the `Clock.getDelta()` behavior. The first call to `getDelta()` returns the time since the clock was started. After that, it returns the delta since the last call. This is fine for our purposes.

Also, `clock.elapsedTime` gives total elapsed time since the clock started. This is what I want for the wave animation.

Let me finalize.
