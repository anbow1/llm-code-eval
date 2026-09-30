The user wants a single TypeScript file that:
1. Creates a Three.js scene with a PlaneGeometry (10x10, 128x128 segments)
2. Rotates it to lie flat in XZ plane
3. Uses a custom ShaderMaterial with GLSL shaders
4. Vertex shader: displaces vertices based on position and uTime uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam)
6. Updates uTime every frame
7. Camera at an angle for good visibility
8. Proper setup: renderer, resize handling, animation loop, __scene, __camera, __renderer, __ready

Let me write this carefully to ensure it compiles with `tsc --strict`.

Key considerations:
- ShaderMaterial needs `uniforms` object with proper typing
- GLSL shaders as template strings
- The plane needs to be rotated -90 degrees around X to lie in XZ plane
- The varying should pass the displaced height to the fragment shader
- I need to use `renderer.setAnimationLoop` with delta time
- Need to handle the `__ready` flag after first frame

Let me write the shaders:

Vertex shader:
- Take position, displace Y (which after rotation becomes the up direction... wait, no. If I rotate the plane by -90 degrees on X, the plane's local Y becomes the world Y? No - rotating a plane that's in XY to lie in XZ means the plane's normal goes from Z to Y. The local Y axis becomes... let me think.

Actually, PlaneGeometry creates a plane in the XY plane (normal along Z). If I rotate it by -PI/2 around X, then:
- X stays X
- Y goes to -Z (or Z, depending on direction)
- Z goes to Y

So the plane lies in XZ, and the "up" direction in the vertex shader should be along the local Y axis (which maps to world Z... no wait).

Let me reconsider. If I rotate by -PI/2 around X:
- A point (x, y, 0) on the plane goes to (x, 0, -y) in world space
- The normal (0, 0, 1) goes to (0, 1, 0) - pointing up

So in the vertex shader, if I displace along local Y (position.y), that would map to world -Z. I should displace along the normal direction, which in local space is Z. Wait no - if I rotate the mesh, the vertex shader operates in local space before the model matrix is applied.

Actually, in the vertex shader, `position` is in local/object space. The plane's local space has it in XY with normal along Z. If I rotate the mesh object, the vertex shader still sees local positions. So I should displace along the local Z axis (the normal of the unrotated plane).

Wait, but the user said "displace vertices up/down". Since the plane is rotated to lie flat in XZ, "up" is world Y. In local space (before rotation), the normal is along local Z. So displacing along local Z in the vertex shader, when combined with the -PI/2 X rotation, would result in world Y displacement. Yes, that's correct.

Actually, let me reconsider. In the vertex shader, `position` is in local space. If the plane is in XY locally with normal along Z, and I want to displace "up" in world space, I should displace along local Z (since after -PI/2 rotation around X, local Z maps to world Y).

So in the vertex shader:
- Take `position.xy` as the base grid position (these map to world XZ after rotation)
- Displace along `position.z` (local normal) based on wave function of position.xy and time

For the varying, I'll pass the displacement height.

Fragment shader:
- Use the varying height to mix between deep blue and white foam

Let me write the code now.

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 6, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const uniforms = {
  uTime: { value: 0.0 }
};

const vertexShader = `
  uniform float uTime;
  varying float vHeight;
  
  void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 2.0 + uTime) * 0.3 + cos(pos.y * 3.0 + uTime * 1.5) * 0.2;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying float vHeight;
  
  void main() {
    float t = smoothstep(-0.5, 0.5, vHeight);
    vec3 deepBlue = vec3(0.0, 0.05, 0.3);
    vec3 foam = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, foam, t);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

This should work. Let me double-check for strict mode issues:
- All variables are typed implicitly (const)
- No unused variables
- The `uniforms` object - ShaderMaterial accepts `Record<string, IUniform>` in strict mode... Let me check. In newer Three.js typings, `uniforms` is `Record<string, IUniform>`. `{ value: number }` should satisfy `IUniform` which has `value: any`. Should be fine.

Actually, with `--strict`, TypeScript might complain about implicit `any` in some places. Let me make sure the uniforms object is properly typed. Actually `{ value: 0.0 }` should be fine since `IUniform` interface has `value: any`.

Let me also make sure there are no issues with the shader strings - they're just strings passed to ShaderMaterial, so no compilation issues there.

I think this is solid. Let me finalize.
