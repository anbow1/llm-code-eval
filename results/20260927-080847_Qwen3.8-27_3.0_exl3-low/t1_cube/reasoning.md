The user wants a complete TypeScript file that:
1. Creates a Three.js scene with a single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. The cube rotates continuously around X and Y axes
3. Lit with one AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Rotation speed is frame-rate independent (uses delta time)
7. Follows all the hard rules from the system prompt

Let me write this carefully:

- Import THREE from 'three'
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth / window.innerHeight, handle resize
- Use renderer.setAnimationLoop
- Expose __scene, __camera, __renderer
- Set __ready = true after first frame
- No external assets
- Must compile with tsc --strict

Let me think about the structure:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // dark blue background

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x4ecdc4 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

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
  
  cube.rotation.x += delta * 0.5;
  cube.rotation.y += delta * 0.8;
  
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

Wait, I need to make sure the document.body doesn't have margins. Let me add a style reset. Actually, the rules say "The page has no other HTML" so I should handle the body styling. Let me add document.body.style to remove margins.

Let me also make sure the code is strictly typed. The `delta` from `clock.getDelta()` returns a number, so that's fine.

Let me finalize this.
