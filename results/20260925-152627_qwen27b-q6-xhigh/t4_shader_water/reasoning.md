The user is asking for a single TypeScript file that does the following:
1. Import Three.js as `import * as THREE from 'three';`
2. Compile under `tsc --strict` with zero errors
3. Create a WebGLRenderer and append its canvas to document.body
4. Set up sizing from window.innerWidth/innerHeight, and handle resize
5. Use renderer.setAnimationLoop for the render loop, with delta/elapsed time for motion
6. Expose `__scene`, `__camera`, `__renderer` on window
7. After the first frame has been rendered, set `(window as any).__ready = true`
8. No external assets
9. Create a 10x10, 128x128 segment plane, rotate it flat onto the XZ plane, and use a custom ShaderMaterial
10. Vertex shader: moving wave pattern based on position and a `uTime` uniform (seconds)
11. Fragment shader: color by height (low = deep blue, high = white foam), height passed via varying
12. Update uTime every frame from elapsed time
13. No lights needed
14. Camera positioned at an angle so the waves are clearly visible

Let's write this carefully.

Key points:
- PlaneGeometry(10, 10, 128, 128) — the plane lies flat on XY by default. Rotate it with `geometry.rotateX(-Math.PI / 2)` or `mesh.rotation.x = -Math.PI/2`. Better to rotate the geometry so the vertex shader's `position` is in local space… actually either works. If we rotate the mesh, the vertex shader's `position` attribute is still XY and we displace in Z (local normal). The varying height goes from the displacement. This works.

But the prompt says "rotate to lie flat on the XZ plane". Either approach satisfies this. If I rotate the geometry with `geometry.rotateX(-Math.PI/2)`, then the local `position` is on XZ, and I can displace `position.y` in the vertex shader. That's clean: waves move in world space, `position.x` and `position.z` used for the wave pattern.

Let's do that: `const geometry = new THREE.PlaneGeometry(10, 10, 128, 128); geometry.rotateX(-Math.PI / 2);`

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  // Sum of traveling waves
  float wave1 = sin(modelPosition.x * 1.4 + uTime * 2.0) * 0.35;
  float wave2 = cos(modelPosition.z * 1.7 + uTime * 1.6) * 0.3;
  float wave3 = sin((modelPosition.x + modelPosition.z) * 1.1 + uTime * 2.6) * 0.18;
  float wave4 = cos(length(modelPosition.xz) * 2.2 - uTime * 2.0) * 0.15;

  float h = wave1 + wave2 + wave3 + wave4;
  modelPosition.y += h;
  vHeight = h;

  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
```

Note: since the geometry is pre-rotated, the model matrix is basically identity (mesh at origin, no rotation). Using modelPosition for the wave pattern is fine, and it also handles mesh movement/rotation correctly.

Fragment shader:
```glsl
varying float vHeight;

void main() {
  float t = smoothstep(-1.0, 1.0, vHeight); // normalize
  vec3 deep = vec3(0.0, 0.05, 0.2);
  vec3 foam = vec3(1.0);
  vec3 color = mix(deep, foam, pow(t, 1.5));
  gl_FragColor = vec4(color, 1.0);
}
```

Range of h: max ~0.35+0.3+0.18+0.15 = 1.0, min -1.0. So smoothstep(-1,1) works.

Could also add a subtle gradient — the requirement is "low = deep blue, high = white foam". Maybe add a slight cyan in the middle. Keep it simple but nice.

Renderer setup:
```ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
```

Might also be nice to set the body margin to 0: `document.body.style.margin = '0'` — since the page has no other HTML, this avoids scrollbars. A reasonable finishing touch.

Scene background: dark sky color. `scene.background = new THREE.Color(0x0a1428);` Maybe add fog? Not needed.

Camera: perspective, positioned at an angle. E.g., `camera.position.set(0, 7, 11); camera.lookAt(0, 0, 0);` This gives a tilted-down view where the waves are clearly visible.

Animation loop:
```ts
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  material.uniforms.uTime.value = elapsed;
  // maybe a subtle camera bob? Motion must use delta/elapsed — the waves already do.
  renderer.render(scene, camera);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Actually, per the spec, uTime is set from elapsed time ("Update uTime every frame from elapsed time"). So `elapsed` is correct, not delta.

Resize:
```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Types for uniforms: `material.uniforms.uTime.value` — if I create the ShaderMaterial with `uniforms: { uTime: { value: 0 } }`, TypeScript types it correctly. To be strict-safe, I could also cast: `material.uniforms.uTime.value = elapsed;` — `uniforms` is `Record<string, IUniform>`… actually ShaderMaterial's type: `uniforms: { [uniform: string]: IUniform; }`. `IUniform` has `value: any`. So it's fine under strict mode.

Strict mode considerations:
- All variables must be used or have definite assignments.
- No implicit any.
- `window as any` is fine.

Also, the `delta` variable: the instructions say "motion must use delta/elapsed time, not frame count". I use elapsed for uTime. Should I use delta somewhere? Not strictly necessary; elapsed is enough. But I could also make a slow camera orbit with elapsed. Actually, a subtle camera drift might be nice, but the requirement is to place the camera at an angle so the waves are clearly visible. A slow orbit could make waves harder to see? It's fine, but it's simpler to keep the camera stationary. I'll keep the camera stationary to satisfy "camera at an angle". I could add a small camera sway using elapsed, but I'll keep it stationary to clearly meet the requirement.

Actually, I'll declare `const delta = clock.getDelta();` and… if I don't use delta, tsc with noUnusedLocals might complain — but the requirement is only `--strict`, which does not include noUnusedLocals. Still, to be safe and clean, I'll either not declare an unused delta or use it. Hmm, "motion must use delta/elapsed time" — elapsed time qualifies. I'll just use `clock.getElapsedTime()`, or `clock.elapsedTime` after getDelta. Simplest:

```ts
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  material.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  ...
});
```

`getElapsedTime()` also updates oldTime so it's fine.

Wait — but the tests might check whether delta is used? The rule is "motion must use delta/elapsed time, not frame count". Elapsed time satisfies that. Fine.

I could also add a slow camera bob: `camera.position.y = 7 + Math.sin(elapsed * 0.5) * 0.15;` This adds life using elapsed. And keep lookAt(0,0,0). Nice but optional. I'll add a subtle vertical bob — still keeps the angle view. Actually, let me keep it simple and stationary. Hmm, a bit of motion adds polish. I'll add a very subtle orbit… no — "camera at an angle so waves are clearly visible" — a gentle fixed angle is safest. I'll keep it stationary.

Also add a second element? The spec asks for only a plane. I'll stay focused. Maybe add stars or a grid? No external assets, but a simple background color suffices. Could add fog for depth: `scene.fog = new THREE.Fog(...)` — but does fog work with ShaderMaterial? Only if I include fog chunks in the shader. Skip.

Side: since we're viewing the plane from an angle above, front side is enough, but for safety I'll use `side: THREE.DoubleSide` (waves might get viewed from a low angle). Cheap insurance.

Coloring details: "low = deep blue, high = white foam". Map vHeight with a normalized factor. Maybe add slight noise variation in the foam using position? Could add a second varying for world position for subtle sparkle. But keep it simple, and just do a nice gradient:

```glsl
varying float vHeight;

void main() {
  // vHeight range is roughly [-1.0, 1.0]
  float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);

  vec3 deepBlue = vec3(0.01, 0.09, 0.25);
  vec3 midBlue  = vec3(0.05, 0.35, 0.60);
  vec3 foamWhite = vec3(0.95, 0.97, 1.0);

  vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.55, t));
  color = mix(color, foamWhite, smoothstep(0.75, 1.0, t));

  gl_FragColor = vec4(color, 1.0);
}
```

That gives deep blue at the bottom, blue in the middle, white foam at peaks.

I should make sure the wave amplitudes actually reach near 1.0 for the foam. Sum of maxes = 1.04, but the waves don't all peak simultaneously, so the white foam will be sparse — which looks natural.

Actually let me tune the waves:

```glsl
float h = 0.0;
h += sin(pos.x * 1.5 + uTime * 1.8) * 0.32;
h += cos(pos.z * 1.2 + uTime * 1.4) * 0.28;
h += sin((pos.x + pos.z) * 0.9 + uTime * 2.2) * 0.22;
h += sin(pos.x * 2.3 - pos.z * 1.7 + uTime * 2.8) * 0.12;
```

Max sum 0.94, min -0.94. Normalize with t = h * 0.5 + 0.5 clamped.

GLSL notes: `pos.x`, `pos.z` where `pos` is a vec4 modelPosition. Fine.

Now let's write the full file:

```ts
import * as THREE from 'three';

// ---------- Shaders ----------

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float h = 0.0;
    h += sin(modelPosition.x * 1.5 + uTime * 1.8) * 0.32;
    h += cos(modelPosition.z * 1.2 + uTime * 1.4) * 0.28;
    h += sin((modelPosition.x + modelPosition.z) * 0.9 + uTime * 2.2) * 0.22;
    h += sin(modelPosition.x * 2.3 - modelPosition.z * 1.7 + uTime * 2.8) * 0.12;

    modelPosition.y += h;
    vHeight = h;

    gl_Position = projectionMatrix * viewMatrix * modelPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);

    vec3 deepBlue  = vec3(0.01, 0.08, 0.22);
    vec3 midBlue   = vec3(0.04, 0.32, 0.58);
    vec3 foamWhite = vec3(0.96, 0.98, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.05, 0.55, t));
    color = mix(color, foamWhite, smoothstep(0.72, 0.98, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;
```

Setup code:

```ts
// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070d1a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 6.5, 10.5);
camera.lookAt(0, 0, 0);

// ---------- Wavy plane ----------
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2); // lay flat in XZ

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
  },
  side: THREE.DoubleSide,
});

const waves = new THREE.Mesh(geometry, material);
waves.name = 'waves';
scene.add(waves);

// ---------- Animation ----------
const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime(); // seconds
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Checking strict mode issues:
- `material.uniforms.uTime.value = elapsed;` — `material.uniforms` type is `IUniforms`, with an index signature `[uniform: string]: IUniform`. `IUniform.value: any`. OK.
- All good. `/* glsl */` comment before template literals is fine.
- Unused variables: none. `waves` is used (added to scene). Fine.
- `document.body.style.margin = '0';` — body is `HTMLElement`, `style` exists. OK.

One consideration: `tsc --strict` — the file will presumably be compiled in a context where `three` is available. `three/addons/...` is not needed.

Edge case: `renderer.setAnimationLoop(() => {...})` — callback type is `XRFrameRequestCallback | null`. A `() => void` lambda is assignable. Fine.

Should I use `performance.now()` for time? Clock is fine.

Also, the requirement: "after the first frame has been rendered, set (window as any).__ready = true". I set it right after `renderer.render` inside the first loop iteration. `renderer.render` is synchronous in WebGL, so after that line, the frame has been rendered (well, the commands have been issued; the actual compositing happens later, but this is a standard interpretation). Good.

Camera angle: position (0, 6.5, 10.5), looking at origin — tilted down ~30°, waves clearly visible. FOV 50.

Maybe I'll add a subtle camera motion using elapsed time for a sense of life — but the "camera at an angle" requirement is satisfied by the static placement. Should I add a very subtle drift? Risk: nothing. But simplicity wins. I'll keep the camera static. Actually — one more thought: some graders check whether motion uses delta/elapsed — the waves do via uTime. Fine.

I'll also confirm that the shader compiles: in the vertex shader, `modelPosition.x` etc. — `modelPosition` is vec4, so `.x`, `.z` are fine. `vHeight` is declared in both. Good.

GLSL: `smoothstep(0.05, 0.55, t)` is fine. `clamp(vHeight * 0.5 + 0.5, 0.0, 1.0)` is fine.

One nit: `side: THREE.DoubleSide` with no lighting — fine, unlit.

Also consider `powerPreference` — not needed.

I think the code is complete. Let me also double-check the order: expose `__scene`, `__camera`, `__renderer` — the exact properties are set.

Formatting the final answer: a single ```ts code block, nothing else.

One more: "page has no other HTML" — so no existing `<div>`. We append the canvas to body. To avoid scrollbars, I set body margin to 0. Good.

Also, `import * as THREE from 'three';` exactly as required.

Let me write the final version.
