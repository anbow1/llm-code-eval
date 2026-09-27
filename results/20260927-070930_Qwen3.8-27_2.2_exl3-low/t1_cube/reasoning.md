The user wants a single TypeScript file that creates a Three.js scene with:
1. A cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned so the cube is clearly visible
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Renderer created manually, appended to document.body
8. Window resize handling
9. setAnimationLoop for render loop
10. Expose __scene, __camera, __renderer on window
11. Set __ready = true after first frame
12. No external assets
13. Must compile with tsc --strict

Let me write this carefully.

For the rotation: I'll use `clock.getDelta()` to get delta time, then multiply by a speed constant.

Camera: Place it at a reasonable distance, looking at origin. Something like (3, 2, 5) looking at (0,0,0).

Background: scene.background = new THREE.Color(0x222244) or similar. Cube color: 0xff5500 or something different.

Let me make sure the types are strict-compliant. No implicit any, no unused variables, etc.

For the delta time approach:
- Use THREE.Clock
- In the animation loop, get delta
- cube.rotation.x += speed * delta
- cube.rotation.y += speed * delta

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff5500 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const clock = new THREE.Clock();
let ready = false;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop((time) => {
    const delta = clock.getDelta();
    cube.rotation.x += 0.5 * delta;
    cube.rotation.y += 0.8 * delta;
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure this compiles with `tsc --strict`. Let me check:
- `window.addEventListener('resize', () => { ... })` - fine
- `renderer.setAnimationLoop((time) => { ... })` - the callback parameter is `number | undefined` in newer three.js types. Actually in three.js types, `setAnimationLoop` takes `(time: number) => void`. Let me check... In three.js, the callback signature is `(time: number) => void`. So the parameter `time` is of type `number`. That's fine.

Actually, looking at the three.js types more carefully, `setAnimationLoop` expects a callback with signature `(time: number) => void`. The `time` parameter is typed as `number`. So I don't need to use it if I'm using `clock.getDelta()`.

But wait - I'm not using `time` in the callback. Will `tsc --strict` complain about unused parameters? No, `--strict` doesn't flag unused parameters by default. Actually, `noUnusedParameters` is not part of `--strict`. So it's fine.

Actually, let me reconsider. The `--strict` flag enables:
- strictNullChecks
- noImplicitAny
- strictBindCallApply
- strictPropertyInitialization
- noImplicitThis
- alwaysStrict
- useUnknownInCatchVariables
- forceConsistentCasingInFileNames
- noUnusedLocals (wait, no, this is separate)

Actually `noUnusedLocals` and `noUnusedParameters` are NOT part of `--strict`. So unused parameters are fine.

Let me also make sure the `document.body.appendChild` works - `document.body` is `HTMLElement | null` in strict mode. I need to handle that.

```typescript
document.body.appendChild(renderer.domElement);
```

In strict mode, `document.body` is `HTMLElement | null`. So I need:
```typescript
const body = document.body;
if (body) {
    body.appendChild(renderer.domElement);
}
```

Or I could use `document.body!.appendChild(...)` but that's a non-null assertion. Let me use the if check to be safe.

Actually, in practice, `document.body` is typed as `HTMLElement | null` in lib.dom.d.ts. So with strict mode, I need to handle the null case. Let me use:

```typescript
document.body.appendChild(renderer.domElement);
```

Hmm, actually let me check. In TypeScript's DOM lib, `document.body` is typed as `HTMLElement | null`. So with `strictNullChecks`, this would error. I should use:

```typescript
const body = document.body;
if (body) {
    body.appendChild(renderer.domElement);
}
```

Or simpler: `document.body!.appendChild(renderer.domElement)` - but that uses a non-null assertion which is fine for strict mode.

Actually, let me just use the if check to be clean.

Let me finalize the code.
