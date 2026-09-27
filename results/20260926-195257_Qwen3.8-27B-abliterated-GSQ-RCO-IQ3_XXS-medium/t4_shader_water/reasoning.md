User wants a single TypeScript file with a custom ShaderMaterial plane. Let me write it carefully.

Key requirements:
- PlaneGeometry 10x10, 128x128 segments
- Rotated flat in XZ plane (rotation.x = -Math.PI/2)
- Custom ShaderMaterial with vertex/fragment GLSL
- Vertex: displacement using uTime uniform, sine wave
- Fragment: color by height via varying (low=deep blue, high=white)
- uTime updated each frame with delta/elapsed time
- No lights needed
- Camera at an angle
- Resize handling
- setAnimationLoop
- Expose scene, camera, renderer on window
- __ready after first frame
- Import THREE from 'three'

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
  vec3 pos = position;
  float wave1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.3;
  float wave2 = cos(pos.y * 1.0 + uTime * 1.5) * 0.2;
  float wave3 = sin((pos.x + pos.y) * 0.8 + uTime * 3.0) * 0.15;
  float displacement = wave1 + wave2 + wave3;
  pos.z += displacement;
  vHeight = displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Since the plane is in XY by default, and we rotate it to XZ, the displacement along local Z becomes world Y. That's fine.

Fragment shader:
```glsl
varying float vHeight;

void main() {
  // Normalize height roughly to 0..1
  float h = vHeight * 0.5 + 0.5; // range roughly -0.65..0.65 -> 0..1
  vec3 deepBlue = vec3(0.0, 0.1, 0.4);
  vec3 foam = vec3(1.0);
  vec3 color = mix(deepBlue, foam, clamp(h, 0.0, 1.0));
  gl_FragColor = vec4(color, 1.0);
}
```

For TypeScript strictness:
- Use proper types
- No implicit any
- All variables typed

Let me be careful with tsc --strict. The main pitfalls:
- `document.body` could be null → use `document.body!` or check
- Actually in strict mode, `document.body` is `HTMLElement | null`, so I need to handle it. I'll use `const body = document.body; if (body) body.appendChild(...)`.
- Actually simpler: `document.body.appendChild(renderer.domElement)` — but document.body is `HTMLElement | null`. Let me use `!` or a guard.

Let me write it cleanly:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 6, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body!.appendChild(renderer.domElement);

// Shaders
const vertexShader = `
  uniform float uTime;
  varying float vHeight;
  void main() {
    vec3 pos = position;
    float w1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.3;
    float w2 = cos(pos.y * 1.0 + uTime * 1.5) * 0.2;
    float w3 = sin((pos.x + pos.y) * 0.8 + uTime * 3.0) * 0.15;
    float displacement = w1 + w2 + w3;
    pos.z += displacement;
    vHeight = displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying float vHeight;
  void main() {
    float h = vHeight * 0.5 + 0.5;
    vec3 deepBlue = vec3(0.0, 0.1, 0.4);
    vec3 foam = vec3(1.0);
    vec3 color = mix(deepBlue, foam, clamp(h, 0.0, 1.0));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader,
  fragmentShader,
});

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let elapsed = 0;
let ready = false;
const clock = new THREE.Clock();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;
  (material.uniforms.uTime as { value: number }).value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, `material.uniforms` is typed as `{ [uniform: string]: IUniform }`. So `material.uniforms.uTime` is `IUniform`, which has `value: any`. So casting: `(material.uniforms.uTime as { value: number }).value = elapsed;` — actually IUniform has value as any, so I can just do `material.uniforms.uTime.value = elapsed;` directly. But in strict mode, `value` is `any`, so it's fine.

Actually, let me check: THREE.IUniform is `{ value: any }`. So `material.uniforms.uTime.value = elapsed` works fine in strict mode since value is any.

Let me also make sure `document.body!` is fine. In strict mode, `document.body` is `HTMLElement | null`. Using `!` is fine for non-null assertion.

Let me double-check the shader material uniforms typing. In Three.js types:
- `ShaderMaterial` has `uniforms: { [uniform: string]: IUniform }`
- `IUniform` has `value: any`

So `material.uniforms.uTime.value = elapsed` — accessing `material.uniforms.uTime` gives `IUniform` (since it's an index signature, it's not `IUniform | undefined`... wait, with `noUncheckedIndexedAccess` it could be, but `--strict` doesn't include that. So it's fine).

Actually wait, does `--strict` include `noUncheckedIndexedAccess`? No, it doesn't. `--strict` includes: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, `strictPropertyInitialization`. It does NOT include `noUncheckedIndexedAccess`.

So `material.uniforms.uTime` is `IUniform`, and `.value` is `any`. Assigning a number is fine.

I think this is solid. Let me finalize.
