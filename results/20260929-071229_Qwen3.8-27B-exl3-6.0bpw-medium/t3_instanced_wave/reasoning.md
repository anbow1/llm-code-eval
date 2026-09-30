The user wants a complete TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh (10,000 instances)
2. Animates a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses one Object3D or Matrix4 for updates (no allocations in render loop)
5. MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid and wave
7. Follows all the hard rules from the system prompt

Let me write this carefully:

- Import THREE from 'three'
- Create renderer, append to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use setAnimationLoop
- Expose __scene, __camera, __renderer
- Set __ready after first frame
- No external assets

For the grid:
- 100x100 = 10,000 instances
- Use InstancedMesh with a BoxGeometry
- Pre-compute distances from center for each instance
- In the render loop, use a reused Matrix4 (or Object3D) to set each instance's matrix
- Use setColorAt for gradient colors

Let me think about the layout:
- Grid spacing: let's say 1 unit apart
- Grid goes from -49.5 to 49.5 (centered)
- Or from -50 to 50 with spacing 1
- Center is at (0, 0, 0)

For the wave:
- distanceFromCenter = sqrt(x^2 + z^2)
- Y = sin(distance * k - time * speed) * amplitude
- k = some spatial frequency, speed = temporal frequency, amplitude = wave height

For colors:
- Gradient by grid position - maybe a diagonal gradient or radial gradient
- I'll do a gradient based on position (e.g., hue based on angle, or a linear gradient from one corner to another)

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 60, 80);
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

// Grid
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.2;
const CUBE_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 });

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
scene.add(mesh);

// Pre-compute distances
const distances = new Float32Array(COUNT);
const positions = new Float32Array(COUNT * 2); // x, z for each instance

let idx = 0;
for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const x = (i - GRID / 2 + 0.5) * SPACING;
        const z = (j - GRID / 2 + 0.5) * SPACING;
        distances[idx] = Math.sqrt(x * x + z * z);
        positions[idx * 2] = x;
        positions[idx * 2 + 1] = z;
        
        // Set color - gradient by position
        const color = new THREE.Color();
        const hue = (i / GRID + j / GRID) / 2; // diagonal gradient
        color.setHSL(hue, 0.8, 0.5);
        mesh.setColorAt(idx, color);
        
        idx++;
    }
}

// Pre-set initial matrices
const dummy = new THREE.Object3D();
for (let i = 0; i < COUNT; i++) {
    dummy.position.set(positions[i * 2], 0, positions[i * 2 + 1]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

// Animation
const clock = new THREE.Clock();
let ready = false;

const K = 0.3;
const SPEED = 3.0;
const AMPLITUDE = 3.0;

renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    
    for (let i = 0; i < COUNT; i++) {
        const x = positions[i * 2];
        const z = positions[i * 2 + 1];
        const y = Math.sin(distances[i] * K - elapsed * SPEED) * AMPLITUDE;
        
        dummy.position.set(x, y, z);
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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful about `tsc --strict`. Let me check:
- All variables are properly typed
- No implicit any
- The `dummy` Object3D is reused (no allocation in loop)
- `distances` and `positions` are pre-allocated Float32Arrays

Actually, I should use a Matrix4 instead of Object3D to avoid the overhead of updateMatrix() which involves computing the full matrix. But actually using Object3D is fine and the requirement says "Reuse one Object3D or Matrix4". Let me stick with Object3D since it's cleaner.

Wait, but `dummy.updateMatrix()` does involve some computation. The requirement says "no allocations inside the render loop" - updateMatrix doesn't allocate, it just modifies the existing matrix. So that's fine.

Let me also make sure the color assignment doesn't allocate in the loop. I create the Color outside the loop and reuse it. Actually I'm creating it inside the initial setup loop, not the render loop, so that's fine.

Let me also double-check: the `new THREE.Color()` in the setup loop - that's fine since it's not in the render loop.

One concern: with `tsc --strict`, I need to make sure everything is properly typed. Let me review...

The code looks good. Let me finalize it.
