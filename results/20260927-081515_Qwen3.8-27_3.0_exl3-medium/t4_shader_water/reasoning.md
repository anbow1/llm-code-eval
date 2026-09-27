The user wants a complete TypeScript file that:
1. Creates a plane (PlaneGeometry 10x10, 128x128 segments) rotated to lie flat in XZ plane
2. Uses a custom THREE.ShaderMaterial with GLSL vertex and fragment shaders
3. Vertex shader: displaces vertices up/down with moving wave pattern based on position and uTime uniform
4. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
5. Updates uTime every frame from elapsed time
6. No lights needed
7. Camera at an angle so waves are clearly visible
8. Must compile with tsc --strict
9. Must expose __scene, __camera, __renderer, __ready
10. Handle window resize
11. Use renderer.setAnimationLoop
12. Use delta/elapsed time for motion
13. No external assets

Let me write this carefully:

- PlaneGeometry(10, 10, 128, 128)
- Rotate the plane to lie flat: rotateX(-Math.PI / 2)
- ShaderMaterial with:
  - Uniforms: uTime (float)
  - Vertex shader: displace Y (which after rotation becomes the "up" direction... wait, actually if we rotate the plane, the geometry's local Y becomes world Z. Let me think about this more carefully.

Actually, let me think about the coordinate system:
- PlaneGeometry creates a plane in the XY plane (facing +Z)
- If I rotate it by -PI/2 around X, it lies flat in the XZ plane (facing +Y, i.e., up)
- In the vertex shader, the position is in local space before the model matrix is applied
- So in local space, the plane is in XY, and I displace along local Z (which becomes world Y after rotation)

Wait, actually with ShaderMaterial, the vertex shader receives `position` which is the local vertex position. The model matrix (including rotation) is applied after. So if I displace `position.z` in the vertex shader, after the -PI/2 X rotation, that local Z displacement becomes world Y displacement. That's what I want.

Actually, let me reconsider. The default PlaneGeometry has vertices in the XY plane with Z=0. If I rotate the mesh by -PI/2 around X, then:
- Local X → World X
- Local Y → World -Z (or World Z depending on direction)
- Local Z → World Y

So displacing local Z in the vertex shader will make the plane wave up and down in world Y. 

Let me write the vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
  // position is in local space (XY plane, Z=0)
  // Displace along local Z (which becomes world Y after rotation)
  float wave = sin(position.x * 1.5 + uTime) * 0.3
             + cos(position.y * 1.2 + uTime * 0.8) * 0.25
             + sin((position.x + position.y) * 0.8 + uTime * 1.2) * 0.2;
  
  vec3 newPos = position;
  newPos.z += wave;
  vHeight = wave;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
  // Map height to color: low = deep blue, high = white foam
  // Height range roughly -0.75 to 0.75
  float t = clamp((vHeight + 0.75) / 1.5, 0.0, 1.0);
  
  vec3 deepBlue = vec3(0.0, 0.05, 0.2);
  vec3 midBlue = vec3(0.0, 0.3, 0.6);
  vec3 white = vec3(1.0, 1.0, 1.0);
  
  vec3 color;
  if (t < 0.5) {
    color = mix(deepBlue, midBlue, t * 2.0);
  } else {
    color = mix(midBlue, white, (t - 0.5) * 2.0);
  }
  
  gl_FragColor = vec4(color, 1.0);
}
```

Now for the TypeScript file:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Geometry
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Shader material
const vertexShader = `...`;
const fragmentShader = `...`;

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 }
  },
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  
  (material.uniforms.uTime as { value: number }).value = elapsed;
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to be careful with strict mode. Let me make sure all types are correct.

Actually, for the `uTime` uniform access, I should type it properly. Let me use a const reference to the uniform object.

Let me also make sure the clock usage is correct. `THREE.Clock` - `getDelta()` returns seconds since last call, `getElapsedTime()` returns total elapsed time.

For strict mode, I need to be careful with the uniform access. Let me store a reference:

```typescript
const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0.0 }
};
```

Then `uniforms.uTime.value = elapsed;`

This should work cleanly with strict mode.

Let me finalize the code.
