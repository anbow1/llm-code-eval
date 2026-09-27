The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using ONE InstancedMesh (10,000 instances)
2. Animates a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
3. Uses setMatrixAt for each instance, flags instanceMatrix for update
4. Uses setColorAt for per-instance colors (gradient by grid position)
5. Reuses one Object3D or Matrix4 for updates (no allocations in render loop)
6. MeshStandardMaterial, AmbientLight + DirectionalLight
7. Camera at an angle so the whole grid and wave are visible
8. WebGLRenderer created manually, appended to document.body
9. Handle window resize
10. Use renderer.setAnimationLoop
11. Expose __scene, __camera, __renderer, __ready
12. No external assets
13. Must compile with tsc --strict

Let me write this carefully:

- Create a BoxGeometry for the small cube
- Create an InstancedMesh with 10000 instances
- Store positions in a Float32Array or just compute them each frame
- Use a single Matrix4 (or Object3D) to compose the matrix for each instance
- Set colors using setColorAt
- Animate the Y position based on distance from center

For the camera, I'll position it at an angle - maybe elevated and offset so the whole 100x100 grid is visible.

Let me think about the structure:
- Grid: 100x100, spacing between cubes (let's say 1 unit apart, so the grid spans 99 units from -49.5 to 49.5, or I can center it)
- Small cubes: maybe 0.8 x 0.8 x 0.8
- Wave: sin(distance * k - time * speed) * amplitude
- Colors: gradient by grid position (e.g., HSL based on x/y position)

For no allocations in the render loop:
- Pre-allocate a Matrix4 (or Object3D) outside the loop
- Use it to set each instance's matrix

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
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
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// InstancedMesh
const gridSize = 100;
const count = gridSize * gridSize;
const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({
    roughness: 0.5,
    metalness: 0.3,
});
const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, count);
scene.add(instancedMesh);

// Set colors
const color = new THREE.Color();
for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const x = col / gridSize;
    const y = row / gridSize;
    color.setHSL(x, 0.7, 0.5 + y * 0.3);
    instancedMesh.setColorAt(i, color);
}
instancedMesh.instanceColor!.needsUpdate = true;

// Pre-allocate Matrix4 for updates
const dummy = new THREE.Object3D();

// Animation parameters
const k = 0.15;
const speed = 2.0;
const amplitude = 3.0;
const spacing = 1.0;
const halfSize = (gridSize - 1) / 2;

// Pre-compute base positions (X, Z) and distances
const baseX = new Float32Array(count);
const baseZ = new Float32Array(count);
const dist = new Float32Array(count);

for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    baseX[i] = (col - halfSize) * spacing;
    baseZ[i] = (row - halfSize) * spacing;
    dist[i] = Math.sqrt(baseX[i] * baseX[i] + baseZ[i] * baseZ[i]);
}

let elapsed = 0;

// Render loop
renderer.setAnimationLoop((time) => {
    // time is in milliseconds
    elapsed = time / 1000;

    for (let i = 0; i < count; i++) {
        const y = Math.sin(dist[i] * k - elapsed * speed) * amplitude;
        dummy.position.set(baseX[i], y, baseZ[i]);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    (window as any).__ready = true;
});

// Resize handler
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

Wait, I need to be careful about the `__ready` flag. It should be set after the first frame is rendered. Using `setAnimationLoop`, the callback is called after the first frame. So setting `__ready = true` inside the callback should work. But I should make sure it's only set once (or it's fine to set it every frame since it's just a boolean).

Actually, let me reconsider - the instruction says "After the first frame is rendered, set (window as any).__ready = true." So I can set it inside the animation loop callback, which is called after the first render.

Let me also make sure the `instanceColor` is properly handled. In Three.js, `setColorAt` creates the `instanceColor` buffer. I need to make sure it's initialized.

Actually, looking at the Three.js source, `setColorAt` will create the `instanceColor` InstancedBufferAttribute if it doesn't exist. So calling it in a loop should work fine.

Let me also make sure I'm not using `Object3D.updateMatrix()` which does some computation - that's fine, it's just updating the matrix, no allocation.

One more thing - I should use `dummy.matrix` which is a Matrix4. The `setMatrixAt` takes a Matrix4. Since `dummy` is an Object3D, its `.matrix` property is a Matrix4. This is reused across iterations - no allocation.

Let me finalize the code. I think this is solid. Let me also add a slight rotation or make the camera angle more interesting.

Actually, let me reconsider the camera position. The grid is 100x100 with spacing 1, so it spans from -49.5 to 49.5 in both X and Z. A camera at (80, 60, 80) looking at origin should show the whole grid. Let me verify - the diagonal of the grid is about 140 units. With a 50 degree FOV and camera at distance ~117 (sqrt(80²+60²+80²)), the view width at that distance would be about 2 * 117 * tan(25°) ≈ 109. That might be a bit tight. Let me move the camera a bit further: (100, 70, 100) or increase FOV.

Actually let me use FOV 60 and position (90, 60, 90). Distance from origin: sqrt(8100+3600+8100) = sqrt(19800) ≈ 140. View width at that distance: 2 * 140 * tan(30°) ≈ 163. That should be enough.

Let me finalize.
