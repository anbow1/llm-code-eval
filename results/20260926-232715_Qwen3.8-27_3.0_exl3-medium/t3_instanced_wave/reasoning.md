The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh
2. Animates a radial wave using sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses one Object3D or Matrix4 for updates (no allocations in render loop)
5. MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle so the whole grid and wave are visible
7. Follows all the hard rules about Three.js imports, renderer setup, resize, animation loop, exposing scene/camera/renderer, __ready flag

Let me plan the implementation:

- 100x100 = 10,000 instances
- Small cubes (BoxGeometry)
- InstancedMesh with MeshStandardMaterial
- Pre-compute positions and distances from center
- In the render loop, use a single Matrix4 (or Object3D) to compute each instance's matrix
- Wave: y = sin(dist * k - time * speed) * amplitude
- Colors: gradient by grid position (e.g., based on x and y position)
- Camera positioned at an angle looking at the grid center

Let me write this carefully:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera - positioned at an angle
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 60, 80);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 80, 50);
scene.add(directionalLight);

// Grid setup
const GRID_SIZE = 100;
const SPACING = 1.2;
const CUBE_SIZE = 0.8;
const AMPLITUDE = 2.0;
const WAVE_K = 0.3;
const WAVE_SPEED = 2.0;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 });

const mesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);

// Pre-compute positions and distances
const positions: number[] = [];
const distances: number[] = [];
const center = (GRID_SIZE - 1) * SPACING * 0.5;

// Set initial matrices and colors
const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();

for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const x = i * SPACING - center;
        const z = j * SPACING - center;
        const dist = Math.sqrt(x * x + z * z);
        
        positions.push(x, z);
        distances.push(dist);
        
        const idx = i * GRID_SIZE + j;
        tempMatrix.makeTranslation(x, 0, z);
        mesh.setMatrixAt(idx, tempMatrix);
        
        // Gradient color based on grid position
        const r = i / (GRID_SIZE - 1);
        const g = j / (GRID_SIZE - 1);
        tempColor.setRGB(r, g, 0.5);
        mesh.setColorAt(idx, tempColor);
    }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
scene.add(mesh);

// Animation
const clock = new THREE.Clock();
let ready = false;

// Reusable objects - NO allocations in loop
const animMatrix = new THREE.Matrix4();

renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const idx = i * GRID_SIZE + j;
            const x = positions[idx * 2];
            const z = positions[idx * 2 + 1];
            const dist = distances[idx];
            
            const y = Math.sin(dist * WAVE_K - elapsed * WAVE_SPEED) * AMPLITUDE;
            
            animMatrix.makeTranslation(x, y, z);
            mesh.setMatrixAt(idx, animMatrix);
        }
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

Wait, I need to be careful about the positions array. I'm using `idx * 2` and `idx * 2 + 1` but idx is `i * GRID_SIZE + j`. Let me verify: for i=0, j=0: idx=0, positions[0]=x, positions[1]=z. For i=0, j=1: idx=1, positions[2]=x, positions[3]=z. Yes that works.

Actually, let me reconsider the positions storage. I'm pushing x, z for each cell. So positions[0] = x_00, positions[1] = z_00, positions[2] = x_01, positions[3] = z_01, etc. And distances[0] = dist_00, distances[1] = dist_01, etc.

In the animation loop, idx = i * GRID_SIZE + j. Then positions[idx * 2] gives x, positions[idx * 2 + 1] gives z. distances[idx] gives the distance. That's correct.

Let me also make sure the strict mode will compile. I need to make sure all types are correct. The `positions` and `distances` arrays are `number[]`. The `tempMatrix` and `animMatrix` are `THREE.Matrix4`. The `tempColor` is `THREE.Color`.

One concern: `mesh.instanceColor` might be null initially. After `setColorAt` is called, it should be non-null. Let me handle that.

Actually, looking at the Three.js source, `instanceColor` is typed as `InstancedBufferAttribute | null`. After calling `setColorAt`, it should be set. But in strict mode, I need to handle the possibility of null. Let me use a non-null assertion or check.

Let me finalize the code.
