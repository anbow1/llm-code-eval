The user wants a TypeScript file that:
1. Creates a 100x100 grid of small cubes using one InstancedMesh
2. Animates a radial wave using sin(distance * k - time * speed) * amplitude
3. Uses setColorAt for gradient colors
4. Reuses a single Object3D/Matrix4 for updates (no allocations in render loop)
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera positioned at an angle to see the whole grid

Let me write this carefully:

- 100x100 = 10,000 instances
- Grid spacing needs to be larger than cube size so they don't overlap
- I'll use a size of about 0.5 for cubes and spacing of 1.0
- Camera needs to be high and angled to see the whole grid
- For the wave: distance from center, sin(dist * k - time * speed) * amplitude
- Reuse one THREE.Object3D (dummy) for matrix updates
- Set colors once (gradient by grid position) - no need to update colors every frame
- Use renderer.setAnimationLoop with delta time

Let me structure this:

```ts
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Grid setup
const GRID_SIZE = 100;
const CUBE_SIZE = 0.4;
const SPACING = 1.0;
const COUNT = GRID_SIZE * GRID_SIZE;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial();
const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Set up instances and colors
const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const idx = i * GRID_SIZE + j;
        const x = (i - GRID_SIZE / 2) * SPACING;
        const z = (j - GRID_SIZE / 2) * SPACING;
        
        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(idx, dummy.matrix);
        
        // Gradient color
        color.setHSL(i / GRID_SIZE, 0.8, 0.5);
        instancedMesh.setColorAt(idx, color);
    }
}

instancedMesh.instanceMatrix.needsUpdate = true;
instancedMesh.instanceColor!.needsUpdate = true;
scene.add(instancedMesh);

// Camera position - angled to see the whole grid
const half = (GRID_SIZE / 2) * SPACING;
camera.position.set(half * 0.8, half * 0.8, half * 0.8);
camera.lookAt(0, 0, 0);

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const time = clock.getElapsedTime();
    
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const idx = i * GRID_SIZE + j;
            const x = (i - GRID_SIZE / 2) * SPACING;
            const z = (j - GRID_SIZE / 2) * SPACING;
            
            const dist = Math.sqrt(x * x + z * z);
            const y = Math.sin(dist * 0.5 - time * 2.0) * 1.0;
            
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

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful about the "no allocations inside the render loop" rule. The `dummy` Object3D is reused, and `dummy.updateMatrix()` doesn't allocate. The `Math.sqrt` and `Math.sin` are fine. The color is set once outside the loop. Good.

Let me also make sure the `instanceColor` might be null initially - I should handle that. Actually, `setColorAt` creates the `instanceColor` buffer on first call, so after the setup loop it will exist. I'll use a non-null assertion or check.

Let me refine the code to be clean and complete.
