The user wants a single TypeScript file that creates a Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at origin
2. Rotates continuously around X and Y axes (frame-rate independent using delta time)
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so cube is visible
5. Background color different from cube color
6. All the hard rules from the system prompt

Let me write this carefully:

- Import THREE from 'three'
- Create WebGLRenderer, append to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use renderer.setAnimationLoop
- Expose __scene, __camera, __renderer
- Set __ready = true after first frame
- No external assets
- Must compile with tsc --strict

Let me think about the structure:

1. Imports
2. Create scene, camera, renderer
3. Create cube with BoxGeometry and MeshStandardMaterial
4. Add lights (AmbientLight + DirectionalLight)
5. Set background color different from cube
6. Resize handler
7. Animation loop with clock for delta time
8. Expose window properties
9. Set __ready after first frame

For tsc --strict compliance:
- All variables need types
- No implicit any
- Proper null checks where needed

Let me write this out:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // dark blue background

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 3, 5);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Cube
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ color: 0x4ecdc4 }); // teal cube
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
let firstFrame = true;
const rotationSpeed = Math.PI / 2; // radians per second

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
    
    cube.rotation.x += rotationSpeed * delta;
    cube.rotation.y += rotationSpeed * delta;
    
    renderer.render(scene, camera);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I should set __ready after the first frame is actually rendered. Using the flag approach in the animation loop is correct - on the first iteration of setAnimationLoop, we render and then set __ready. Actually, let me set it after the render call to be precise:

```typescript
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    
    cube.rotation.x += rotationSpeed * delta;
    cube.rotation.y += rotationSpeed * delta;
    
    renderer.render(scene, camera);
    
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});
```

This ensures __ready is set after the first frame has been rendered.

Let me double-check strict mode compliance:
- All variables are typed (const with inference)
- No implicit any
- The `window as any` casts handle the window properties
- clock.getDelta() returns number
- All good

This looks complete and correct.
