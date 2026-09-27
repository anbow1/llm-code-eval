The user wants a single TypeScript file that:
1. Creates a Three.js scene with a rotating cube
2. Uses BoxGeometry + MeshStandardMaterial
3. Rotates around X and Y axes continuously
4. Has one AmbientLight and one DirectionalLight
5. PerspectiveCamera positioned to see the cube
6. Background color different from cube color
7. Frame-rate independent rotation using delta time
8. Follows all the hard rules from the system prompt

Let me write this carefully:

- Import THREE from 'three'
- Create renderer, append to document.body
- Size from window.innerWidth/innerHeight
- Handle resize
- Use renderer.setAnimationLoop
- Use clock delta for rotation
- Expose __scene, __camera, __renderer
- Set __ready after first frame
- No external assets

Let me write the complete file:

```ts
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a3e); // dark blue-purple background

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 2, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 8, 5);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xe74c3c }); // red cube
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Clock for delta time
const clock = new THREE.Clock();

// Rotation speeds (radians per second)
const rotSpeedX = 1.2;
const rotSpeedY = 0.8;

// Track if first frame has been rendered
let firstFrame = false;

// Resize handler
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

// Animation loop
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    cube.rotation.x += rotSpeedX * delta;
    cube.rotation.y += rotSpeedY * delta;

    renderer.render(scene, camera);

    if (!firstFrame) {
        firstFrame = true;
        (window as any).__ready = true;
    }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

This looks good. Let me verify all requirements:
- ✅ Single cube with BoxGeometry + MeshStandardMaterial at origin
- ✅ Rotates around X and Y axes
- ✅ One AmbientLight and one DirectionalLight
- ✅ PerspectiveCamera placed so cube is visible (position at 3,2,4 looking at origin)
- ✅ Background (0x2a2a3e) different from cube (0xe74c3c)
- ✅ Frame-rate independent using delta time
- ✅ Import THREE from 'three'
- ✅ Creates WebGLRenderer, appends to document.body
- ✅ Sizing from window.innerWidth/innerHeight
- ✅ Handles resize
- ✅ Uses renderer.setAnimationLoop
- ✅ Exposes __scene, __camera, __renderer
- ✅ Sets __ready after first frame
- ✅ No external assets
- ✅ Will compile with tsc --strict

Let me double-check for strict mode issues. All types should be fine. The `clock.getDelta()` returns number. Everything is properly typed.

One thing - I should make sure there's no `let` without type annotation issues. In strict mode, `let firstFrame = false;` is fine since it's inferred as `boolean`.

I think this is complete and correct.
