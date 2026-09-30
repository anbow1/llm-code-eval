The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh
2. Animates a radial wave using sin(distanceFromCenter * k - time * speed) * amplitude
3. Gives every instance its own color using setColorAt
4. Reuses one Object3D or Matrix4 for updates - no allocations in render loop
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle so the whole grid and wave are visible
7. Must compile with tsc --strict, zero errors
8. Import Three.js as `import * as THREE from 'three'`
9. Create WebGLRenderer, append to document.body
10. Handle resize
11. Use setAnimationLoop
12. Expose __scene, __camera, __renderer, __ready

Let me write this carefully:

- Grid: 100x100 = 10000 instances
- Each cube is small (e.g., size 0.5 or so)
- Spacing between cubes
- The wave: for each instance, compute Y = sin(dist * k - time * speed) * amplitude
- Use a dummy Object3D to compose the matrix, then setMatrixAt
- For colors, use setColorAt with a gradient based on grid position (i or j)

Important: setColorAt requires an InstancedBufferAttribute for the color. In newer Three.js, InstancedMesh has a `setColorAt` method that creates the `instanceColor` attribute on first call.

For tsc --strict compliance:
- Need to be careful with types
- Use proper types everywhere

Let me structure the file:

```typescript
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(...);
const renderer = new THREE.WebGLRenderer(...);

// Grid parameters
const GRID = 100;
const SPACING = 1.0;
const CUBE_SIZE = 0.5;
const COUNT = GRID * GRID;

// Geometry and material
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial();

// InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);

// Set colors
for (let i = 0; i < COUNT; i++) {
    // gradient color
}

// Lights
scene.add(new THREE.AmbientLight(0x404040));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
// position it

// Camera at angle
camera.position.set(50, 40, 50);
camera.lookAt(0, 0, 0);

// Animation loop
const dummy = new THREE.Object3D();
const clock = new THREE.Clock();

function animate() {
    const elapsed = clock.getElapsedTime();
    
    for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
            const x = (i - GRID / 2) * SPACING;
            const z = (j - GRID / 2) * SPACING;
            const dist = Math.sqrt(x * x + z * z);
            const y = Math.sin(dist * k - elapsed * speed) * amplitude;
            
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            mesh.setMatrixAt(i * GRID + j, dummy.matrix);
        }
    }
    mesh.instanceMatrix.needsUpdate = true;
    
    renderer.render(scene, camera);
    
    if (!window.__ready) {
        (window as any).__ready = true;
    }
}

renderer.setAnimationLoop(animate);
```

Let me make sure I handle the `__ready` flag properly - it should be set after the first frame is rendered.

Also, for the colors to work with MeshStandardMaterial, I need to make sure the material has `vertexColors` or... actually no. `setColorAt` on InstancedMesh works differently - it uses `instanceColor` which is automatically multiplied with the material color. Let me check: in Three.js, when you use `setColorAt`, it creates an `instanceColor` InstancedBufferAttribute. The material needs to... actually no, it works automatically with any material that supports color. The instance color is multiplied with the material's color.

Wait, I need to be careful. With `MeshStandardMaterial`, the `color` property defaults to white (0xffffff), so the instance colors will show through. But I should NOT set `vertexColors: true` on the material - that's for per-vertex colors, not per-instance colors. The InstancedMesh's `instanceColor` attribute is handled automatically by the renderer.

Let me also make sure the clock is used properly. `getElapsedTime()` returns time since the clock started.

For the wave parameters:
- k: wave number (controls frequency) - maybe 0.5
- speed: controls how fast the wave travels - maybe 5
- amplitude: how tall the wave is - maybe 5

Let me finalize the code.
