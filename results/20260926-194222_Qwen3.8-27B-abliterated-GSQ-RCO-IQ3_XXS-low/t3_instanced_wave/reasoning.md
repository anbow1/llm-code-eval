The user wants a TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh
2. Animates a radial wave using sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses one Object3D/Matrix4 for updates (no allocations in render loop)
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid
7. Follows all the hard rules (imports, renderer setup, resize, setAnimationLoop, expose variables, __ready flag)

Let me write this carefully:

- 100x100 = 10,000 instances
- Grid spacing needs to be small enough that cubes are small but visible
- Camera needs to be positioned to see the whole grid at an angle
- For the wave animation: compute distance from center for each instance, then set Y = sin(dist * k - time * speed) * amplitude
- For colors: gradient based on grid position (e.g., x+y mapped to a color)
- Reuse a single Matrix4 (or Object3D) for setting matrices
- Must use setMatrixAt each frame and flag instanceMatrix.needsUpdate

Let me think about the setup:
- Grid is 100x100, centered at origin
- Spacing between cubes: let's say 1 unit apart, so grid spans from -49.5 to 49.5 (or -50 to 50)
- Cube size: maybe 0.7 or 0.8 so there's a small gap
- Camera: positioned at an angle, looking at origin. Maybe position (80, 80, 80) looking at (0,0,0)

For the wave:
- distanceFromCenter = sqrt((x-50)^2 + (z-50)^2) or since centered, sqrt(x^2 + z^2) where x,z go from -50 to 50... actually let's center the grid so positions are from -49.5 to 49.5 (for 100 cells with spacing 1, center would be at -49.5 + 0.5 = -49 to 49... let me just use i - 49.5 for i in 0..99, giving positions -49.5, -48.5, ..., 49.5)

Actually simpler: let's say grid positions go from -50 to 50 with step 1, so 101 positions... no, that's 101. Let me do: for i in 0..99, position = (i - 49.5) * spacing. With spacing = 1, positions are -49.5, -48.5, ..., 49.5. Center is at 0.

Distance from center: sqrt(px^2 + pz^2)

For colors: I'll use a gradient based on x and z position. Maybe hue based on angle or position.

Let me write the code:

```typescript
import * as THREE from 'three';

const GRID_SIZE = 100;
const SPACING = 1;
const CUBE_SIZE = 0.7;
const AMPLITUDE = 3;
const WAVE_K = 0.3;
const WAVE_SPEED = 3;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(70, 70, 70);
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

// InstancedMesh setup
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });

const totalInstances = GRID_SIZE * GRID_SIZE;
const instancedMesh = new THREE.InstancedMesh(geometry, material, totalInstances);
scene.add(instancedMesh);

// Precompute positions and distances
const positions: number[] = new Array(totalInstances);
const distances: number[] = new Array(totalInstances);

const dummyMatrix = new THREE.Matrix4();

// Set initial positions, colors, and store distances
for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
        const index = i * GRID_SIZE + j;
        const x = (i - GRID_SIZE / 2 + 0.5) * SPACING;
        const z = (j - GRID_SIZE / 2 + 0.5) * SPACING;
        
        positions[index] = x * SPACING; // wait, I already multiplied by SPACING
        // Let me redo: position = (i - (GRID_SIZE-1)/2) * SPACING
        const px = (i - (GRID_SIZE - 1) / 2) * SPACING;
        const pz = (j - (GRID_SIZE - 1) / 2) * SPACING;
        
        const dist = Math.sqrt(px * px + pz * pz);
        positions[index] = dist; // store distance for animation
        distances[index] = dist;
        
        // Set Y to 0 initially
        dummyMatrix.makeTranslation(px, 0, pz);
        instancedMesh.setMatrixAt(index, dummyMatrix);
        
        // Color gradient by grid position
        const color = new THREE.Color();
        const t = (px + GRID_SIZE / 2) / GRID_SIZE;
        const u = (pz + GRID_SIZE / 2) / GRID_SIZE;
        color.setHSL(t * 0.5 + 0.5, 0.8, 0.5 + u * 0.2);
        instancedMesh.setColorAt(index, color);
    }
}

if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
}

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let elapsed = 0;

renderer.setAnimationLoop((delta: number) => {
    elapsed += delta;
    
    const time = elapsed;
    
    for (let i = 0; i < totalInstances; i++) {
        const d = distances[i];
        const y = Math.sin(d * WAVE_K - time * WAVE_SPEED) * AMPLITUDE;
        
        // Need to get x and z from stored positions... 
        // Actually I should store x and z separately
    }
});
```

Wait, I need to store x and z separately. Let me restructure. I'll store x, z, and distance in arrays, then in the animation loop, compute y and set the matrix.

Let me also make sure I'm reusing the Matrix4 properly. I'll use `dummyMatrix.makeTranslation(x, y, z)` which is a single allocation-free operation (it just sets elements of the existing matrix).

Let me rewrite more carefully:
