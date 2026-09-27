The user wants a single TypeScript file that:
1. Creates a PlaneGeometry 10x10 with 128x128 segments
2. Rotates it to lie flat in the XZ plane (rotate around X axis by -PI/2)
3. Uses a custom ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
6. Updates uTime every frame from elapsed time
7. No lights needed (ShaderMaterial is unlit)
8. Camera at an angle so waves are clearly visible
9. Must compile with tsc --strict
10. Standard Three.js setup with renderer, resize handling, setAnimationLoop
11. Expose __scene, __camera, __renderer, __ready
12. No external assets

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128)
- Rotate: the plane is in XY by default. To make it lie flat in XZ, I need to rotate it -PI/2 around X axis. Actually, I can either rotate the geometry or the mesh. Let me rotate the mesh: mesh.rotation.x = -Math.PI / 2. This makes the plane lie in the XZ plane.

- ShaderMaterial with:
  - uniforms: uTime (float)
  - vertex shader: displace along the local Y axis (which after rotation becomes world Y). Actually, since the plane is rotated, the local Y is the "up" direction. So I displace the local Y coordinate.
  
  Wait, let me think about this more carefully. The PlaneGeometry is in the XY plane by default (vertices have z=0). If I rotate the mesh by -PI/2 around X, the plane goes to XZ. The local Y axis becomes the world Y (up). So in the vertex shader, I should displace the local Y coordinate.

  Actually, the vertex shader operates in local/object space. The plane's vertices are in XY (x from -5 to 5, y from -5 to 5, z = 0). When I rotate the mesh, the vertex positions in local space are still in XY. So I should displace the local Y component (which becomes world Y after the rotation).

  Let me write the vertex shader:
  - Use position.x and position.y (local coords) to create a wave pattern
  - Displace position.y by some function of position and uTime
  
  Wave pattern: something like sin(position.x * 0.5 + uTime) * cos(position.y * 0.5 + uTime * 0.7) * amplitude
  
  Let me make it more interesting with multiple waves.

- Fragment shader:
  - varying float vHeight (the displaced Y value)
  - Color: low (negative or near 0) = deep blue, high = white
  - Use a smoothstep or mix based on height

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 }
  },
  vertexShader: `
    uniform float uTime;
    varying float vHeight;
    void main() {
      float wave1 = sin(position.x * 0.8 + uTime * 1.2) * 0.4;
      float wave2 = cos(position.y * 0.6 + uTime * 0.8) * 0.3;
      float wave3 = sin((position.x + position.y) * 0.5 + uTime * 1.5) * 0.2;
      float height = wave1 + wave2 + wave3;
      vHeight = height;
      vec3 pos = position;
      pos.y += height;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vHeight;
    void main() {
      float t = smoothstep(-0.5, 0.5, vHeight);
      vec3 deepBlue = vec3(0.0, 0.05, 0.2);
      vec3 white = vec3(1.0, 1.0, 1.0);
      vec3 color = mix(deepBlue, white, t);
      gl_FragColor = vec4(color, 1.0);
    }
  `
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let elapsed = 0;
const clock = new THREE.Clock();

renderer.setAnimationLoop((time) => {
  const delta = clock.getDelta();
  elapsed += delta;
  material.uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
  (window as any).__ready = true;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Wait, I need to be careful with `tsc --strict`. Let me check:
- `renderer.setAnimationLoop((time) => { ... })` - the callback parameter is `number | undefined`. Actually in Three.js, the callback for setAnimationLoop takes a `number` (DOMHighResPerformance.now() value). Let me check the type... In Three.js types, `setAnimationLoop(callback: ((time: number) => void) | null)`. So the parameter is `number`. That's fine.

- `clock.getDelta()` returns `number`. Fine.

- `material.uniforms.uTime.value` - the uniforms type is `{ [key: string]: IUniform }`. Accessing `.value` on it should be fine since IUniform has `value: any`.

Actually wait, in strict mode, let me double-check the uniform access. `ShaderMaterial.uniforms` is typed as `{ [key: string]: IUniform }`. `IUniform` has `value: any`. So `material.uniforms.uTime.value` should work.

Hmm, but with strict mode, the index signature might be an issue. Let me think... `material.uniforms` is typed as `{ [key: string]: IUniform }`. So `material.uniforms.uTime` returns `IUniform` (not `IUniform | undefined` unless noUncheckedIndexedAccess is on). With `--strict`, `noUncheckedIndexedAccess` is NOT included (it's a separate flag). So `material.uniforms.uTime` is `IUniform`, and `.value` is `any`. That should be fine.

Actually wait, I should double-check. `--strict` enables:
- noImplicitAny
- strictNullChecks
- strictFunctionTypes
- strictBindCallApply
- strictPropertyInitialization
- noImplicitThis
- alwaysStrict
- useUnknownInCatchVariables

It does NOT include `noUncheckedIndexedAccess`. So index access on `{ [key: string]: IUniform }` returns `IUniform`, not `IUniform | undefined`. Good.

Let me also make sure the camera position gives a good view. Camera at (0, 5, 10) looking at origin should give a nice angled view of the plane.

Let me also add a background color to the scene so it's not just black. Actually, the user didn't specify, so I'll leave it as is or set a nice background.

I think this is solid. Let me finalize it.
