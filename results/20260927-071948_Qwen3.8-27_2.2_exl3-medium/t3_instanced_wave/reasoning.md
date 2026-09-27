The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh (10,000 instances)
2. Animates a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setMatrixAt for each instance, flags instanceMatrix.needsUpdate
4. Gives each instance its own color via setColorAt (gradient by grid position)
5. Reuses one Object3D or Matrix4 for updates - no allocations in render loop
6. MeshStandardMaterial, AmbientLight + DirectionalLight
7. Camera at an angle so the whole grid and wave are visible
8. Follows all the hard rules: import THREE, create renderer, append to body, handle resize, setAnimationLoop, expose __scene/__camera/__renderer/__ready, no external assets

Let me write this carefully:

- 100x100 grid, centered at origin, so positions go from -50 to +49 (or -49.5 to +49.5 for cube centers)
- Actually, let's space them with some gap. Let's say spacing = 1.0, so positions go from -49.5 to +49.5 (for 100 items centered).
- Cube size: small, say 0.8
- InstancedMesh with 10000 instances
- For the wave: distance from center, sin(dist * k - time * speed) * amplitude
- For colors: gradient by grid position (e.g., HSL based on position)
- Reuse a single Object3D (or Matrix4) for setting matrices
- No allocations in render loop

Let me structure:

```typescript
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(60, 50, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Grid
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 2.0;
const K = 0.3;
const SPEED = 2.0;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.3,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Pre-compute positions and colors
const positions: number[] = []; // x, z for each instance
for (let iz = 0; iz < GRID; iz++) {
    for (let ix = 0; ix < GRID; ix++) {
        const x = (ix - GRID / 2 + 0.5) * SPACING;
        const z = (iz - GRID / 2 + 0.5) * SPACING;
        positions.push(x, z);
        
        // Color gradient
        const t = (ix + iz) / (2 * GRID);
        const color = new THREE.Color().setHSL(t, 0.8, 0.6);
        mesh.setColorAt(iz * GRID + ix, color);
    }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable Object3D
const dummy = new THREE.Object3D();

// Pre-compute distances
const distances: number[] = [];
for (let i = 0; i < COUNT; i++) {
    const x = positions[i * 2];
    const z = positions[i * 2 + 1];
    distances.push(Math.sqrt(x * x + z * z));
}

// Animation
let elapsed = 0;

renderer.setAnimationLoop((time) => {
    // time is in ms
    const t = time / 1000;
    
    for (let i = 0; i < COUNT; i++) {
        const y = Math.sin(distances[i] * K - t * SPEED) * AMPLITUDE;
        dummy.position.set(positions[i * 2], y, positions[i * 2 + 1]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    
    renderer.render(scene, camera);
    
    if ((window as any).__ready === undefined) {
        (window as any).__ready = true;
    }
});

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful about strict mode. Let me check:
- `positions` is `number[]` - fine
- `distances` is `number[]` - fine
- The `mesh.instanceColor!` - in strict mode, `instanceColor` is `InstancedBufferAttribute | null`, so I need the non-null assertion or check.

Actually, `setColorAt` requires the `instanceColor` to exist. Let me check the Three.js types. `InstancedMesh.setColorAt(index, color)` - this should work and auto-create the buffer. Actually looking at the source, `setColorAt` does:
```
setColorAt(index, color) {
    if (!this.instanceColor) {
        this.instanceColor = new InstancedBufferAttribute(new Float32Array(this.count * 3), 3);
    }
    ...
}
```

So after calling setColorAt, `instanceColor` will be non-null. But in strict mode, TypeScript might complain about accessing `.needsUpdate` on a potentially null value. Let me use a non-null assertion.

Actually, let me re-check. The type is `instanceColor: InstancedBufferAttribute | null`. After calling setColorAt, it's guaranteed non-null. But TypeScript won't know that. So I'll use `mesh.instanceColor!.needsUpdate = true;` or just do `if (mesh.instanceColor) { mesh.instanceColor.needsUpdate = true; }`.

Let me also make sure the camera angle is good. With a 100x100 grid at spacing 1, the grid spans from about -49.5 to +49.5 in both x and z. The camera at (60, 50, 60) looking at origin should show the whole grid nicely.

Let me also add a slight rotation or make sure the view is good. Actually (60, 50, 60) with lookAt(0,0,0) should work well - it's elevated and at an angle.

Let me finalize the code. I need to make sure there are no allocations in the render loop. The `dummy` Object3D is reused. The `positions` and `distances` arrays are pre-computed. No new objects created per frame.

One thing: `dummy.updateMatrix()` - does this allocate? No, it just updates the matrix in place. Good.

Let me write the final version.
