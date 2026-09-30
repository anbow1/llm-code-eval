The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh
2. Animates a radial wave using sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses one Object3D or Matrix4 (no allocations in render loop)
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid

Let me think through the implementation:

- Grid: 100x100 = 10,000 instances
- Each cube: small BoxGeometry
- InstancedMesh with count = 10000
- For each instance, I need to store its base position (x, z) and distance from center
- In the render loop, compute y = sin(dist * k - time * speed) * amplitude
- Use a reusable Matrix4 (or Object3D) to set each instance's matrix
- setColorAt for gradient (e.g., based on x/z position)
- No allocations in the loop: pre-allocate the matrix, and store distances in a pre-allocated array

Let me think about the camera position. The grid is 100x100, so it spans from -50 to 50 (or 0 to 100). Let me center it at origin, so from -49.5 to 49.5 (if using spacing of 1). Camera should be elevated and angled.

Let me write this:

```typescript
import * as THREE from 'three';

const GRID_SIZE = 100;
const COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 1;
const HALF = (GRID_SIZE - 1) / 2;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 80, 100);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Geometry and material
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.3 });

// InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Pre-allocate reusable objects
const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Pre-compute distances and base positions
const distances = new Float32Array(COUNT);
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);

let index = 0;
for (let ix = 0; ix < GRID_SIZE; ix++) {
    for (let iz = 0; iz < GRID_SIZE; iz++) {
        const x = ix - HALF;
        const z = iz - HALF;
        baseX[index] = x;
        baseZ[index] = z;
        distances[index] = Math.sqrt(x * x + z * z);
        
        // Set color based on grid position (gradient)
        const t = (ix + iz) / (2 * (GRID_SIZE - 1));
        color.setHSL(t, 0.8, 0.5);
        mesh.setColorAt(index, color);
        
        // Initial matrix
        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        
        index++;
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// Animation
const clock = new THREE.Clock();
const K = 0.3;
const SPEED = 3.0;
const AMPLITUDE = 3.0;

let ready = false;

renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    
    for (let i = 0; i < COUNT; i++) {
        const y = Math.sin(distances[i] * K - elapsed * SPEED) * AMPLITUDE;
        dummy.position.set(baseX[i], y, baseZ[i]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    
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

Wait, I need to be careful about `dummy.updateMatrix()` - that's not an allocation, it just updates the existing matrix. The Object3D's matrix is pre-allocated. So this is fine.

Actually, let me reconsider. `dummy.updateMatrix()` calls `this.matrix.compose(this.position, this.quaternion, this.scale)` which doesn't allocate. Good.

Let me also make sure the camera angle is good. With a 100x100 grid centered at origin, spanning from -49.5 to 49.5, a camera at (0, 80, 100) looking at origin should give a nice angled view. Let me adjust to maybe (60, 60, 60) for a more dramatic angle, or keep it simple.

Actually let me think about this more carefully. The grid spans 99 units in each direction (from -49.5 to 49.5). A camera at (0, 80, 100) with FOV 50 should be able to see most of it. Let me go with something like (0, 70, 90) to get a nice angle.

Let me finalize the code.
