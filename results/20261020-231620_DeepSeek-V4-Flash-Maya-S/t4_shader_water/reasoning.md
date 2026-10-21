Let me write the file.

PlaneGeometry 10x10, 128x128 segments, rotate -PI/2 on X to lie in XZ plane. Custom ShaderMaterial with uTime.

Vertex shader: wave displacement using sin/cos of position.x and position.z with uTime. Since rotated, position in geometry local space is xy plane; displacement should be along local +z which after rotation becomes... Actually the rotation is applied to the mesh, so geometry local z is up after rotation by -PI/2 about X. Let's compute: rotation -PI/2 about X maps local y -> ... Rotation about X by angle θ: y' = y cosθ - z sinθ, z' = y sinθ + z cosθ. θ = -π/2: cos=0, sin=-1. y' = 0*y - (-1) z = z. z' = -y + 0 = -y. So local z maps to world y' = z. So displacement in local z gives world +y. Good. Local y maps to world z' = -y. So plane's local y axis becomes world -z.

Simpler: just displace position.z in vertex shader, and use position.x/position.y for the wave pattern.

Height varying = displacement. Fragment color mix from deep blue to white foam.

Let me write shaders as template strings.

Vertex:
```glsl
uniform float uTime;
varying float vHeight;

float wave(vec2 p, float t) {
  float d = 0.0;
  d += sin(p.x * 1.6 + t * 1.5) * 0.35;
  d += cos(p.y * 1.9 - t * 1.1) * 0.28;
  d += sin((p.x + p.y) * 2.7 + t * 2.2) * 0.12;
  d += sin(length(p) * 3.0 - t * 1.8) * 0.09;
  return d;
}

void main() {
  vec3 pos = position; // xy plane
  float h = wave(pos.xy, uTime);
  pos.z += h;
  vHeight = h;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Height range roughly ±0.84. Normalize in fragment: t = clamp((vHeight + 0.9) / 1.8, 0, 1).

Fragment:
```glsl
varying float vHeight;
void main() {
  float t = clamp((vHeight + 0.85) / 1.7, 0.0, 1.0);
  vec3 deep = vec3(0.02, 0.10, 0.35);
  vec3 mid = vec3(0.05, 0.45, 0.75);
  vec3 high = vec3(0.85, 0.96, 1.0);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.6, t));
  col = mix(col, high, smoothstep(0.6, 1.0, t));
  gl_FragColor = vec4(col, 1.0);
}
```

Note: ShaderMaterial with custom vertex shader — no need for GLSL3. Three injects #version? No, three's WebGL2 renders default GLSL1 with automatic conversion... Actually three's ShaderMaterial uses GLSL ES 1.00 by default with prefixes. `gl_FragColor` works. Fine.

Also I should consider double-sided? Not needed but fine — waves visible from above.

Camera at angle: position (7, 6, 9), lookAt(0,0,0).

Add uniform type: { uTime: { value: 0 } }.

Strict TS: PlaneGeometry, Mesh, ShaderMaterial. Fine.

Also the ready flag after first frame: set in animation loop once rendered.

Let me write:

```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070f);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(8, 7, 10);
camera.lookAt(0, 0, 0);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const uniforms = { uTime: { value: 0 } };
const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI/2;
scene.add(mesh);
```

Wait—rotation.x = -PI/2 makes plane lie in XZ plane with its front face pointing up? Default plane faces +z. Rotating -90° about X: local +z maps to world... compute: z component: world y' = z_local... for vector (0,0,1): y' = z = 1, z' = -y = 0. So normal points to +y. Good, faces up.

Also maybe scale the whole thing? 10x10 plane, camera at ~14 units distance. Fine.

Wave amplitude ~0.84; that's visible.

Time: use clock.getElapsedTime() or accumulate delta. Use `const elapsed = clock.getElapsedTime()`.

Strict mode: window.devicePixelRatio is a number, fine.

Write code with proper typing.

For the animation loop:

```ts
const clock = new THREE.Clock();
let first = true;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
  if (first) { first = false; (window as any).__ready = true; }
});
```

Hmm, __ready should be set after first frame rendered — yes, after render.

Also add a subtle grid? Not required.

Resize handler.

Everything compiles under strict. The uniform object type — `uniforms` is inferred as `{ uTime: { value: number } }` fine.

One thing: shader precision of vHeight, fine.

Let me finalize shaders as template literals with no ${} collisions — `\n` fine; use plain template strings.

I'll write it.