The user wants a single TypeScript file for the browser using Three.js. Let me write:

- Import Three.js as `import * as THREE from 'three';`
- Create scene, camera, renderer
- PlaneGeometry 10x10 with 128x128 segments, rotated to lie flat in XZ plane (rotation.x = -Math.PI/2)
- Custom ShaderMaterial with vertex + fragment shaders
- Vertex shader: displace vertices along z (which becomes up after rotation — careful: if we rotate the plane with rotation.x = -PI/2, the plane's local z axis points up in world space. Displacing along the normal (vec3(0,0,1) in local) will become world up). The instructions say "displace vertices up/down" — I'll displace along normal, which is the local z. Actually the wave pattern should be based on position and uTime.

Let me write the vertex shader:

```glsl
uniform float uTime;
varying float vHeight;

void main() {
  vec3 pos = position;
  float wave = sin(pos.x * 1.5 + uTime) * 0.3
             + sin(pos.y * 2.0 + uTime * 1.3) * 0.2
             + sin((pos.x + pos.y) * 1.0 + uTime * 0.7) * 0.15;
  pos.z += wave; // plane is in XY locally; z is up after rotation
  vHeight = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Wait — PlaneGeometry lies in the XY plane with normal +Z. When we rotate the mesh by -PI/2 about X, local +Z becomes world +Y (up). So displacing pos.z lifts vertices up. Using `position` (local coords) for wave pattern is fine.

Fragment shader:

```glsl
varying float vHeight;

void main() {
  float t = smoothstep(-0.5, 0.65, vHeight);
  vec3 deepBlue = vec3(0.02, 0.12, 0.38);
  vec3 midBlue = vec3(0.05, 0.35, 0.62);
  vec3 foam = vec3(0.95, 0.98, 1.0);
  vec3 col = mix(deepBlue, midBlue, smoothstep(0.0, 0.6, t));
  col = mix(col, foam, smoothstep(0.55, 1.0, t));
  gl_FragColor = vec4(col, 1.0);
}
```

Hmm, could use a vec3 mix chain. Fine.

Note: THREE ShaderMaterial with WebGL2 — three.js injects `#version 300 es` only when using RawShaderMaterial with glsl3? Actually three.js automatically converts gl_FragColor? No — three.js ShaderMaterial uses GLSL1 by default and it handles the conversion internally? Let me recall: three.js WebGLRenderer prepends shaders with defines and for WebGL2 contexts it converts GLSL1 code... Actually, three.js supports GLSL3 via `glslVersion: THREE.GLSL3`. For default (GLSL1), three.js compiles with the GLSL ES 1.00 shaders, but WebGL2 supports GLSL ES 1.00 shaders too. Yes, WebGL2 contexts accept both `#version 100` (default) and `#version 300 es` shaders. So gl_FragColor and varying work fine.

Also need `attribute vec3 position;`? No — ShaderMaterial (not RawShaderMaterial) automatically prepends built-in attributes (position, normal, uv) and uniforms (modelViewMatrix, projectionMatrix, etc.) via the shader prefix. So I shouldn't declare them. Just declare `uniform float uTime;` and `varying float vHeight;`.

Renderer: `new THREE.WebGLRenderer({ antialias: true })`; set pixel ratio maybe; setSize(innerWidth, innerHeight); append canvas to document.body; handle resize.

Camera: PerspectiveCamera at angle, e.g. position (6, 5, 7), lookAt (0,0,0).

Animation loop: renderer.setAnimationLoop((time) => ...) using time in ms; compute elapsed = time / 1000; update uniform. Alternatively use THREE.Clock. The requirement: "Motion must use delta/elapsed time, not frame counts." Use clock.getElapsedTime() or the time param. I'll use clock.

Testing hooks: set window.__scene, __camera, __renderer; after first frame rendered set __ready = true. So track rendered flag in the loop callback — set it after renderer.render completes.

Need type-safe: `(window as any).__ready = true;` fine.

Also handle resize: window.addEventListener('resize', ...). Update camera aspect and renderer size.

Full code:

```ts
import * as THREE from 'three';

// -------- Renderer --------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// -------- Scene & camera --------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a7c8); // hmm maybe sky-ish

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5.5, 4.2, 7.0);
camera.lookAt(0, 0, 0);

// -------- Shaders --------
const vertexShader = /* glsl */`
uniform float uTime;

varying float vHeight;

void main() {
  vec3 pos = position;

  float w1 = sin(pos.x * 1.6 + uTime * 1.0);
  float w2 = sin(pos.y * 2.3 + uTime * 1.4);
  float w3 = sin((pos.x + pos.y) * 1.1 + uTime * 0.6);

  float height = w1 * 0.28 + w2 * 0.18 + w3 * 0.12;

  pos.z += height;
  vHeight = height;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */`
varying float vHeight;

void main() {
  vec3 deepBlue = vec3(0.016, 0.110, 0.365);
  vec3 midBlue  = vec3(0.050, 0.350, 0.610);
  vec3 foam     = vec3(0.960, 0.980, 1.000);

  float t = smoothstep(-0.45, 0.55, vHeight);

  vec3 color = mix(deepBlue, midBlue, t);
  color = mix(color, foam, smoothstep(0.6, 0.95, t));

  gl_FragColor = vec4(color, 1.0);
}
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 }
  }
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// -------- Resize --------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------- Animation --------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});

// -------- Expose for testing --------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Also could remove the background color — no external assets, background color is fine. Maybe a darker background? The instruction says "No lights needed". A background color is acceptable. Alternatively keep default black. I'll set a subtle dark blue-gray or leave default. Let's set scene.background to a color for aesthetics — allowed (no texture loading). I'll pick something like 0x1b2b44.

TypeScript strict: clock, etc. all fine. `uniforms: { uTime: { value: 0 } }` typed as `{ [uniform: string]: IUniform }` — fine.

The setAnimationLoop callback receives a `time` param (DOMHighResTimeStamp | undefined?). Actually in three.js types, `setAnimationLoop(callback: FrameRequestCallback | null)`. FrameRequestCallback is `(time: number) => void`. If we don't use it, no issue. I use `clock.getElapsedTime()`. Alternatively, I could use the time argument: `(time: number) => { material.uniforms.uTime.value = time * 0.001; }`. That would be elapsed time based. But clock is cleaner. Both satisfy "seconds elapsed". Actually, "Update uTime every frame from elapsed time." Clock elapsed time is exactly that. Good.

One consideration: `ready` should be set after first frame is rendered — done in loop after render.

Also should declare shader code via template strings. Also note varying name conflicts none.

Check strictness: all variables used. `(window as any)` fine.

Edge: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));` — devicePixelRatio exists. Fine.

Add camera lookAt. Done.

I'll produce the final single ts code block. Only the code block, no extra text.