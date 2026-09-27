The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh (10,000 instances)
2. Animates a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setColorAt for per-instance colors (gradient by grid position)
4. Reuses one Object3D or Matrix4 for updates (no allocations in render loop)
5. MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid and wave
7. Follows all the hard rules about imports, renderer setup, resize, animation loop, exposing scene/camera/renderer, __ready flag

Let me write this carefully:

- Import THREE from 'three'
- Create scene, camera, renderer
- Create InstancedMesh with BoxGeometry and MeshStandardMaterial
- Set up 100x100 grid positions
- Pre-compute distances from center for each instance
- In the render loop, use a reusable Matrix4 (or Object3D) to set each instance's matrix
- Use setColorAt for gradient colors
- Handle resize
- Use setAnimationLoop
- Expose window.__scene, __camera, __renderer
- Set __ready after first frame

Let me think about the grid layout:
- 100x100 grid
- Spacing between cubes: let's say 1 unit apart
- Grid spans from -50 to +50 in X and Z (or -49.5 to +49.5)
- Small cubes: maybe 0.9 size so there's a tiny gap

For the wave:
- distanceFromCenter = sqrt(x^2 + z^2) for each instance
- Y = sin(distance * k - time * speed) * amplitude
- k controls spatial frequency, speed controls temporal frequency, amplitude controls height

For colors:
- Gradient by grid position: e.g., hue based on position (x+z) normalized

For the matrix updates:
- Pre-compute an array of distances (Float32Array)
- In the loop, use a single Matrix4, compose it with position (x, y, z) and default rotation/scale
- Actually, since the cubes don't rotate, I can just set the translation in the matrix
- I'll use a reusable Matrix4 and set its elements directly

Let me be careful about TypeScript strict mode:
- All variables must be typed
- No implicit any
- Proper null checks

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera - positioned at an angle to see the whole grid
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
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

// Grid parameters
const GRID_SIZE = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;
const HALF = (GRID_SIZE - 1) * SPACING * 0.5;

// Geometry and Material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3 });

// InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);
scene.add(mesh);

// Pre-compute distances and base positions
const total = GRID_SIZE * GRID_SIZE;
const baseX = new Float32Array(total);
const baseZ = new Float32Array(total);
const distances = new Float32Array(total);

// Colors
const color = new THREE.Color();
for (let iz = 0; iz < GRID_SIZE; iz++) {
    for (let ix = 0; ix < GRID_SIZE; ix++) {
        const idx = iz * GRID_SIZE + ix;
        const x = ix * SPACING - HALF;
        const z = iz * SPACING - HALF;
        baseX[idx] = x;
        baseZ[idx] = z;
        distances[idx] = Math.sqrt(x * x + z * z);
        
        // Gradient color based on position
        const hue = (ix / GRID_SIZE + iz / GRID_SIZE) * 0.5;
        color.setHSL(hue, 0.8, 0.5);
        mesh.setColorAt(idx, color);
    }
}
mesh.instanceColor!.needsUpdate = true;

// Reusable matrix - no allocations in loop
const matrix = new THREE.Matrix4();

// Wave parameters
const WAVE_K = 0.15;
const WAVE_SPEED = 2.0;
const WAVE_AMPLITUDE = 3.0;

// Time tracking
let elapsed = 0;
let firstFrame = true;

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    elapsed += delta;

    for (let i = 0; i < total; i++) {
        const y = Math.sin(distances[i] * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;
        matrix.makeTranslation(baseX[i], y, baseZ[i]);
        mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    if (firstFrame) {
        firstFrame = false;
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

Wait, I need to double-check the strict mode compliance. Let me review:
- `mesh.instanceColor!` - using non-null assertion, that's fine
- All variables are typed
- No implicit any
- The `clock.getDelta()` returns number
- Everything looks good

Actually, let me reconsider the camera position. The grid spans from -49.5 to +49.5 in both X and Z. That's about 99 units wide. With the wave amplitude of 3, the height varies. A camera at (80, 60, 80) looking at origin should give a nice angled view. Let me verify the FOV covers it... 50 degrees FOV at distance ~120 from center should cover about 100 units. That should work.

Let me also make sure I'm not allocating anything in the render loop. The `matrix.makeTranslation` modifies in place. Good.

One thing: `mesh.instanceColor!` - in strict mode, `instanceColor` is `BufferAttribute | null`, so I need the non-null assertion. That's fine.

Actually, I realize I should double-check: does `setColorAt` exist on InstancedMesh? Yes, it does. And `instanceColor` is the property that gets created when you first call `setColorAt`.

Let me finalize the code.
