Let me plan this out:

1. Create a 100x100 grid of small cubes using a single InstancedMesh (10,000 instances)
2. Animate a radial wave - each instance's Y position changes based on sin(distanceFromCenter * k - time * speed) * amplitude
3. Use setColorAt for per-instance colors (gradient by grid position)
4. Reuse a single Object3D or Matrix4 for matrix updates - no allocations in render loop
5. MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle so the whole grid is visible
7. Use renderer.setAnimationLoop
8. Handle resize
9. Expose __scene, __camera, __renderer, __ready
10. TypeScript strict mode compatible

Let me think about the implementation:

- InstancedMesh with 10,000 instances
- BoxGeometry for the cube (small, like 0.5 x 0.5 x 0.5)
- Grid spacing: maybe 1 unit apart, so total grid is 100x100 units
- Camera needs to see the whole 100x100 grid from an angle

For the wave animation:
- distanceFromCenter = sqrt(x^2 + z^2) where x and z are grid positions relative to center
- y = sin(distanceFromCenter * k - time * speed) * amplitude
- Set matrix for each instance using a pre-allocated Object3D

For colors:
- Gradient by grid position - I'll use a mix of colors based on (i, j) position

Let me write this carefully for TypeScript strict mode:

- Need to be careful with null checks
- Use `as const` or proper typing

Let me structure the code:

```typescript
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 80, 50);
scene.add(directionalLight);

// InstancedMesh
const gridSize = 100;
const count = gridSize * gridSize;
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.3 });
const mesh = new THREE.InstancedMesh(geometry, material, count);
scene.add(mesh);

// Pre-allocate Object3D
const dummy = new THREE.Object3D();

// Set initial positions and colors
const color = new THREE.Color();
for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const x = (col - gridSize / 2 + 0.5) * 1.0;
    const z = (row - gridSize / 2 + 0.5) * 1.0;
    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    
    // Color gradient
    const r = col / gridSize;
    const g = row / gridSize;
    color.setRGB(r, g, 0.5);
    mesh.setColorAt(i, color);
}
mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor!.needsUpdate = true;

// Camera position
camera.position.set(70, 60, 70);
camera.lookAt(0, 0, 0);

// Animation
const elapsed = { t: 0 };
let firstFrame = false;

renderer.setAnimationLoop((time) => {
    const dt = 0.016; // or track delta
    // Actually, I should track elapsed time properly
    ...
});
```

Wait, I need to track delta time properly. Let me use a variable to track the previous time.

Actually, `setAnimationLoop` gives us a timestamp in milliseconds. I'll track the previous timestamp to compute delta.

Let me also make sure I'm not allocating in the render loop. I'll pre-allocate the dummy Object3D and the Color.

For the wave:
- k = some frequency (like 0.3)
- speed = some speed (like 2)
- amplitude = some amplitude (like 2)

Let me finalize the code now.
