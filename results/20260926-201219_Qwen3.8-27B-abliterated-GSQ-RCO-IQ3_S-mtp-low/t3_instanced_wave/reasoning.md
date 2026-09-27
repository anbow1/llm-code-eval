The user wants a complete TypeScript file that:
1. Creates a 100x100 grid of small cubes using InstancedMesh
2. Animates a radial wave using sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses a single Object3D or Matrix4 for updates (no allocations in render loop)
5. MeshStandardMaterial with AmbientLight + DirectionalLight
6. Camera positioned to see the whole grid
7. Follows all the hard rules from the system prompt

Let me write this carefully:

- 100x100 = 10,000 instances
- Use a dummy Object3D for matrix composition
- Store positions (x, z) for each instance so we can compute distance from center
- In the animation loop, iterate over all instances, compute y from the wave formula, update matrix
- Set colors once at setup (gradient based on grid position)
- Camera at an angle - something like position (50, 50, 50) looking at origin, or maybe (60, 40, 60)

Let me think about the grid layout:
- Grid is 100x100, centered at origin
- Each cell is 1 unit apart (so x goes from -50 to 49, or we can center it)
- Let's do: for i in 0..99, for j in 0..99: x = i - 50, z = j - 50 (or i - 49.5 to center better)
- Actually, let's do x = i - 49.5, z = j - 49.5 so it's centered at 0

For the wave:
- distanceFromCenter = sqrt(x*x + z*z)
- y = sin(distance * k - time * speed) * amplitude
- k = 0.5, speed = 2, amplitude = 2 or so

For colors:
- Gradient by grid position - maybe based on (i + j) / 200 for a diagonal gradient
- Or radial gradient from center

Let me use a radial gradient based on distance from center for a nice look.

For the cube size: since grid is 100x100 with 1 unit spacing, cubes should be smaller than 1 unit. Let's use 0.8 or 0.9.

Let me write the code:

```typescript
import * as THREE from 'three';

const GRID = 100;
const COUNT = GRID * GRID;
const CUBE_SIZE = 0.8;
const SPACING = 1.0;
const K = 0.5;
const SPEED = 2.0;
const AMPLITUDE = 2.0;

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(60, 50, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(30, 50, 30);
scene.add(directionalLight);

// InstancedMesh
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial();
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Store grid positions
const positions: number[] = [];
const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const x = (i - (GRID - 1) / 2) * SPACING;
        const z = (j - (GRID - 1) / 2) * SPACING;
        const idx = i * GRID + j;
        positions.push(x, z);
        
        // Set initial matrix
        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        
        // Set color - gradient by distance from center
        const dist = Math.sqrt(x * x + z * z);
        const maxDist = Math.sqrt(2) * (GRID / 2);
        const t = dist / maxDist;
        color.setHSL(t * 0.6, 0.8, 0.5);
        mesh.setColorAt(idx, color);
    }
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;
scene.add(mesh);

// Animation
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    
    for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
            const idx = i * GRID + j;
            const x = positions[idx * 2];
            const z = positions[idx * 2 + 1];
            const dist = Math.sqrt(x * x + z * z);
            const y = Math.sin(dist * K - elapsed * SPEED) * AMPLITUDE;
            
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx, dummy.matrix);
        }
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    
    (window as any).__ready = true;
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

Wait, I need to be careful about `mesh.instanceColor!` - in strict mode, instanceColor could be null. Let me use a non-null assertion or handle it differently. Actually, after calling `setColorAt`, instanceColor should be set. But TypeScript might complain. Let me use `if (mesh.instanceColor)` or the non-null assertion.

Actually, `setColorAt` returns void and sets `this.instanceColor` internally. After the first `setColorAt` call, `instanceColor` will be a `THREE.InstancedBufferAttribute`. So after the loop, it will be non-null. I'll use the non-null assertion `!`.

Let me also make sure I'm not allocating anything in the render loop. The `dummy` Object3D is reused, `color` is reused (though only used in setup). The `positions` array is pre-allocated. Good.

Let me also consider: should I use a `THREE.Matrix4` instead of `Object3D`? The Object3D approach calls `updateMatrix()` which composes position, rotation, and scale into a Matrix4. That's fine and reuses the internal matrix. No allocation happens.

Actually, looking more carefully - `dummy.updateMatrix()` does create/compose the matrix internally but it reuses the existing matrix, so no new allocation. That's fine.

Let me finalize the code.
