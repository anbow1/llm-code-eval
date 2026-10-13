We need to write a TypeScript file that creates a Three.js scene with a PlaneGeometry 10x10 with 128x128 segments, rotated to lie flat in the XZ plane (i.e., rotate.x = -PI/2), using a custom ShaderMaterial with custom vertex and fragment shaders.

Requirements:
- Vertex shader: displace vertices up/down with a moving wave pattern based on position and a float uniform named `uTime` (seconds).
- Fragment shader: color by height (low = deep blue, high = white foam). Pass the height with a varying.
- Update uTime every frame from elapsed time.
- Camera at an angle so waves clearly visible.
- No lights needed.
- No external assets.
- Renderer created manually, canvas appended to body, sized from window, handle resize, setAnimationLoop, expose __scene/__camera/__renderer, and __ready after first frame.
- Must compile with tsc --strict zero errors.

Key subtleties:
1. The plane is rotated -PI/2 around X, so the geometry's local "up" (z-axis of the plane before rotation) becomes world Y after rotation. In the vertex shader, displacement along the plane's local z-axis will appear vertical in world space. To make height available to fragment shader, we can compute the displaced height in the vertex shader and pass it as a varying. Since the geometry is a plane in XY local space (with z as normal), we displace along z (local) — after rotation, that's world +Y.

Actually, PlaneGeometry is in XY plane facing +Z. When rotated -90° about X, the plane's local +Z becomes world +Y. So displacing local z gives vertical waves.

In vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
  vec3 pos = position;
  // waves
  float wave = sin(pos.x * 1.5 + uTime * 2.0) * 0.5
             + sin(pos.y * 1.2 + uTime * 1.5) * 0.3
             + sin((pos.x + pos.y) * 2.0 + uTime * 3.0) * 0.2;
  pos.z += wave;
  vHeight = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

But wait — the plane is rotated via mesh.rotation, and the shader uses modelViewMatrix which includes rotation, so displacing local z works.

For fragment shader: color by height. But the local z displacement range depends on wave amplitude. We should normalize. Let's set amplitude such that height range is roughly [-1, 1]. Map: t = (vHeight + 1.0) / 2.0 clamped, then mix deep blue to white with some foam threshold.

Better: compute wave sum with known max amplitude, e.g., waves amplitude total max = 0.5 + 0.3 + 0.2 = 1.0 (but sin sums might not reach exactly 1). Normalize: h = wave / 1.0; t = clamp(h * 0.5 + 0.5, 0, 1).

Fragment:
```glsl
varying float vHeight;
void main() {
  float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
  vec3 deepBlue = vec3(0.0, 0.05, 0.35);
  vec3 midBlue = vec3(0.0, 0.35, 0.7);
  vec3 foam = vec3(1.0);
  vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.6, t));
  color = mix(color, foam, smoothstep(0.65, 0.9, t));
  gl_FragColor = vec4(color, 1.0);
}
```

Note: three.js ShaderMaterial — we should include proper attributes/uniforms. ShaderMaterial automatically provides `position` attribute, and built-in uniforms like modelViewMatrix, projectionMatrix. So the vertex shader above works. However, with three.js newer versions using WebGL2, ShaderMaterial shaders get prefixed with the standard three shader chunks; `gl_FragColor` still works because three injects `#define gl_FragColor` compatibility? Actually in three.js, when using ShaderMaterial with GLSL1-style code, three prepends `#version 300 es` and defines like `#define gl_FragColor pc_fragColor` etc. via the glslVersion handling. By default (glslVersion null), three compiles as GLSL1 with WebGL2 context using... Actually three converts GLSL1 to GLSL3 automatically? Let me recall: In WebGL2, three.js prepends for fragment shaders:

```
#define varying in
out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define gl_FragDepthEXT gl_FragDepth
#define texture2D texture
...
```
when the shader doesn't specify glslVersion — yes, three.js handles that in WebGLProgram. So GLSL1-style ShaderMaterial code works fine.

2. TypeScript strictness: everything must be typed. Use `const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);` etc.

3. __ready after first frame: use a flag; in animation loop, after renderer.render, if !readyShown set readyShown = true and (window as any).__ready = true. Since setAnimationLoop callback runs each frame, first render happens on first call, so set __ready after the first render call.

4. Resize handler: update camera.aspect, camera.updateProjectionMatrix, renderer.setSize.

5. Clock: use THREE.Clock for elapsed time. Update uniform uTime each frame: material.uniforms.uTime.value = clock.getElapsedTime(). Requirement: "Motion must use delta/elapsed time, not frame counts." Using elapsed time is fine. We could also use delta but elapsed is fine for wave phase.

Let me write the full code:

```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------
const vertexShader = /* glsl */ `
  uniform float uTime;

  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Sum of a few sine waves travelling in different directions.
    float wave = 0.0;
    wave += 0.50 * sin(pos.x * 1.6 + uTime * 1.9);
    wave += 0.30 * sin(pos.y * 2.3 + uTime * 2.7);
    wave += 0.20 * sin((pos.x + pos.y) * 3.1 - uTime * 3.4);

    // Displace along the plane's local +Z (which is world +Y after the
    // mesh is rotated flat onto the XZ plane).
    pos.z += wave;

    vHeight = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height (roughly -1..1) into 0..1.
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.01, 0.05, 0.30);
    vec3 midBlue  = vec3(0.05, 0.35, 0.65);
    vec3 foam     = vec3(0.98, 0.99, 1.00);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.55, t));
    color = mix(color, foam, smoothstep(0.62, 0.90, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;
```

Then scene setup:

```ts
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1e);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(4.5, 5.0, 8.0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
});

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

const clock = new THREE.Clock();

let ready = false;

(renderer as any)... 

function animate(): void {
  material.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Strictness: `(window as any).__scene = scene;` is fine.

One issue: the material uniform type. `material.uniforms.uTime.value = ...` — uniforms typing: `{ [uniform: string]: IUniform }`, IUniform has `value: any`. Fine under strict.

Clock: `clock.getElapsedTime()` returns number. Fine.

Also, since the requirement mentions using delta time potentially — elapsed is what they asked for uTime (seconds). Good.

Also consider adding fog or a second element? Not needed. Maybe add subtle background. Keep it minimal but polished: maybe add a slight camera sway? Not required; keep static camera. Actually the prompt says "Camera at an angle so the waves are clearly visible" — done.

Double-check the shader compiles under three's WebGL2 auto-conversion: yes, GLSL1 style works.

Edge case: `tsc --strict` with `noEmit`... the code has no type errors. `renderer.setAnimationLoop(animate)` — animate returns void, callback type `(time: number) => void` — our function takes no args, assignable. Fine.

Also, `document.body.appendChild(renderer.domElement);` — body exists at script run if module deferred; typically fine.

Also set `renderer.domElement.style.display = 'block'` maybe; optional. Keep it simple but I could add margin reset via CSS in a style element? The page has no other HTML; we could inject minimal CSS to remove margin. That's allowed (not an external asset). Add a small style tag:

```ts
const style = document.createElement('style');
style.textContent = 'html, body { margin: 0; overflow: hidden; }';
document.head.appendChild(style);
```

That's safe and optional; head should exist. It's fine.

Final code assembled.