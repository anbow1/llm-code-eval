The user wants a single TypeScript file that:

1. Imports Three.js
2. Creates a WebGLRenderer, appends to document.body
3. Creates a PlaneGeometry 10x10 with 128x128 segments
4. Rotates it to lie flat in XZ plane
5. Uses a custom THREE.ShaderMaterial with GLSL vertex and fragment shaders
6. Vertex shader: displaces vertices with a moving wave pattern based on position and uTime uniform
7. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
8. Updates uTime every frame from elapsed time
9. No lights (ShaderMaterial is unlit)
10. Camera at an angle so waves are visible
11. Handles window resize
12. Uses renderer.setAnimationLoop
13. Motion uses delta/elapsed time
14. Exposes __scene, __camera, __renderer on window
15. After first frame rendered, sets __ready = true
16. No external assets
17. Must compile with tsc --strict

Let me write this carefully.

For the wave pattern in the vertex shader, I'll use something like sin/cos combinations of position and time. The position in the vertex shader for a PlaneGeometry - when rotated to XZ plane, the local coordinates are still in XY (the geometry is in XY by default). I'll rotate the mesh so it lies flat.

Actually, let me think about this. PlaneGeometry creates a plane in the XY plane by default. I can either:
- Rotate the mesh by -PI/2 around X to make it lie flat
- Or just use the geometry as-is and rotate the mesh

I'll rotate the mesh by -Math.PI/2 on the X axis to lay it flat.

For the vertex shader, the position attribute is in local space (XY plane for PlaneGeometry). After rotation, in world space it'll be XZ. But in the vertex shader, I work with local position. So I'll use position.x and position.y as the horizontal coordinates for the wave.

Wave pattern: something like:
```
float wave1 = sin(position.x * 2.0 + uTime * 1.5) * 0.3;
float wave2 = cos(position.y * 3.0 + uTime * 1.0) * 0.2;
float wave3 = sin((position.x + position.y) * 1.5 + uTime * 2.0) * 0.15;
float displacement = wave1 + wave2 + wave3;
```

Then displace along the normal (which is Z in local space, but after rotation becomes Y in world space). Since the mesh is rotated, I can just add to position.z in local space.

For the varying, I'll pass the displacement (height) to the fragment shader.

Fragment shader: mix from deep blue to white based on height.

Let me write the complete file:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Geometry
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Shaders
const vertexShader = `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;
    
    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.3;
    float wave2 = cos(pos.y * 3.0 + uTime * 1.0) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.5 + uTime * 2.0) * 0.15;
    
    float displacement = wave1 + wave2 + wave3;
    pos.z += displacement;
    
    vHeight = displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying float vHeight;

  void main() {
    // Map height from roughly -0.65 to 0.65 range
    float t = clamp((vHeight + 0.65) / 1.3, 0.0, 1.0);
    
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
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
  side: THREE.DoubleSide,
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop((timestamp: number) => {
  // Hmm, setAnimationLoop doesn't give delta directly. I need to track time.
  // Actually, let me use performance.now() or track manually.
});
```

Wait, `renderer.setAnimationLoop` - the callback receives a timestamp (DOMHighResTimeStamp). I need to compute delta from that. Let me track the previous timestamp.

Actually, looking at the Three.js API, `setAnimationLoop` can take a callback that receives the timestamp. Let me use that properly.

Let me also make sure the strict TypeScript compiles. The `setAnimationLoop` callback parameter type is `(time?: number | null) => void` in newer versions. Let me be careful.

Actually in Three.js types, `setAnimationLoop` takes `((time: number) => void) | null`. So the parameter is `number`.

Let me finalize:

```typescript
let lastTime = 0;
renderer.setAnimationLoop((time: number) => {
  if (lastTime === 0) lastTime = time;
  const delta = (time - lastTime) / 1000;
  lastTime = time;
  elapsed += delta;
  
  material.uniforms.uTime.value = elapsed;
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, but the rule says "Motion must use delta/elapsed time, not frame counts." Using elapsed time is fine.

Let me also double-check: the PlaneGeometry in Three.js is in the XY plane with the normal pointing in +Z. When I rotate by -PI/2 around X, it becomes XZ plane with normal pointing in +Y (up). Good.

In the vertex shader, `position` is the local position (in XY for the plane). The z component is 0 initially. I displace along z in local space, which after the -PI/2 X rotation becomes the Y (up) direction in world space. Perfect.

Let me make sure everything is strict-compatible. The `uniforms` object needs proper typing. `THREE.ShaderMaterial` uniforms are typed as `{ [uniform: string]: IUniform }`. I can just use the object literal and it should be fine.

Let me write the final clean version.
