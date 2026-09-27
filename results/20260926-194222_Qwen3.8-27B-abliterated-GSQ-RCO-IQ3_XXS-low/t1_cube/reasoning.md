The user wants a single TypeScript file that:
1. Creates a Three.js scene with a rotating cube
2. Uses BoxGeometry + MeshStandardMaterial
3. Rotates around X and Y axes continuously
4. Has one AmbientLight and one DirectionalLight
5. PerspectiveCamera positioned to see the cube
6. Background color different from cube color
7. Frame-rate independent rotation using delta time
8. Imports THREE from 'three'
9. Creates renderer, appends to document.body
10. Handles resize
11. Uses renderer.setAnimationLoop
12. Exposes __scene, __camera, __renderer
13. Sets __ready = true after first frame
14. No external assets
15. Must compile with tsc --strict

Let me write this carefully:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5, metalness: 0.3 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    cube.rotation.x += delta * 1.0;
    cube.rotation.y += delta * 0.7;
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

This looks good. Let me verify all requirements are met:
- ✅ Single cube at origin with BoxGeometry + MeshStandardMaterial
- ✅ Rotates around X and Y axes
- ✅ One AmbientLight and one DirectionalLight
- ✅ PerspectiveCamera positioned to see the cube (at 3,3,3 looking at origin)
- ✅ Background (0x222222) different from cube color (0xff4444)
- ✅ Frame-rate independent (uses delta time)
- ✅ Imports THREE from 'three'
- ✅ Creates renderer, appends to document.body
- ✅ Handles resize
- ✅ Uses setAnimationLoop
- ✅ Exposes __scene, __camera, __renderer
- ✅ Sets __ready = true after first frame
- ✅ No external assets
- ✅ Should compile with tsc --strict

This is solid.
