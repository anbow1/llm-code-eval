The key: RenderPass renders into composer's render target. EffectComposer render targets are in... With WebGLRenderer outputColorSpace SRGB, EffectComposer's render target is typically HalfFloatType, linear. RenderPass renders scene linearly. Then my custom ShaderPass runs on linear values. Inversion in linear space: inverting linear value then converting to sRGB gives different result than inverting sRGB values. Requirement: on-screen colors must be exact inverse of what screen would show without effect. Without effect: linear -> sRGB conversion in OutputPass (or renderer). Screen shows sRGB(0x336699 as linear color). Wait, THREE.Color with hex converts to linear working color space. Without effect, screen shows sRGB encode of linear color = original hex. With effect, we want inverse: 0xcc9966.

To get exact inverse of sRGB, we must invert in sRGB space. So approach: do the sRGB conversion first (OutputPass), then invert? But OutputPass should be last... Actually we can reorder: RenderPass -> ShaderPass that converts linear to sRGB (or just OutputPass before?) — simpler: ShaderPass that does sRGB encoding then inversion, then... but OutputPass would then re-encode? No: OutputPass converts from linear to output color space; if our pass already outputs sRGB values, and then OutputPass applies encoding again, double conversion.

Simplest correct approach: RenderPass -> ShaderPass (invert in linear space? no) ...

Let's compute: We want final screen color C_out such that C_out = 1 - sRGB_display(linear_color). The OutputPass at the end does linear->sRGB encoding on the buffer. So if we want screen = 1 - sRGB(L), we need buffer before OutputPass to satisfy sRGB(buffer) = 1 - sRGB(L), i.e. buffer = sRGB_decode(1 - sRGB(L)). That's awkward in shader but doable: in the shader, convert input linear L to sRGB, invert, then decode back to linear, pass to OutputPass which re-encodes. Round trip sRGB encode then decode introduces slight quantization? In float render target (HalfFloatType), decode/encode are math functions; decode(encode(x)) ≈ x exactly mathematically if using same formulas? sRGB decode is the exact inverse of encode mathematically (piecewise). Yes, decode(encode(x)) = x exactly (up to float precision). So encode, invert, decode, then OutputPass encode gives 1 - sRGB(L) up to float precision. Hmm, but 1-sRGB(L) in half float... then OutputPass encode gives back approximately. Might not be bit-exact 0xcc9966.

Alternative cleaner: put OutputPass BEFORE the inversion pass? OutputPass is a ShaderPass with sRGB conversion. Order: RenderPass -> OutputPass (converts linear to sRGB in buffer) -> InvertPass (1-x). Final screen shows buffer values directly? But then the renderer will apply output color space conversion at final? With EffectComposer, the final pass renders to screen (renderToScreen). The final quad render — does renderer apply outputColorSpace conversion? No, ShaderMaterial without color space handling writes raw values; renderer's output conversion applies only when rendering to canvas... Actually the conversion happens in shaders (colorspace_fragment chunk) included in materials; ShaderPass materials don't include it. So final pass writes raw fragment values to canvas. So chain: RenderPass (linear) -> OutputPass (sRGB encode) -> InvertPass (1 - x) -> screen. That gives exact 1 - sRGB(L). But is that valid ordering? OutputPass expects to be last, but functionally it's just a shader pass. However, colors: after OutputPass, buffer holds sRGB values; InvertPass output written raw to canvas — correct.

But wait: does OutputPass also handle tone mapping? Yes, OutputPass applies tone mapping + color space. With default NoToneMapping, it just does sRGB conversion. Fine.

Alternative: skip OutputPass ordering issue: RenderPass -> InvertPass in sRGB... hmm.

Actually simplest robust: RenderPass -> InvertPass that operates: sample linear, convert to sRGB via shader (include sRGB encode functions or use Three's colorspace functions), invert, output — and mark that as final, with renderToScreen, no OutputPass. But spec requires OutputPass in the chain. Hmm, "a RenderPass, a custom ShaderPass ..., and an OutputPass". So include all three.

Option: RenderPass -> OutputPass -> InvertPass (last, renderToScreen). Composer determines renderToScreen automatically for the last pass? EffectComposer renders the last enabled pass to screen by default (this.renderToScreen determined... actually passes have renderToScreen flag; composer sets... In newer versions, EffectComposer.render: it iterates, and pass.renderToScreen is controlled by user? Let me recall: EffectComposer.render() — `const renderToScreen = (i === il - 1) && this.renderToScreen`? No. In current three, each pass has renderToScreen property, and composer.render does: pass.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) with pass.renderToScreen. EffectComposer used to auto-set: "pass.renderToScreen = (i === passes.length-1)"? Actually in current implementation: 

```
render(deltaTime) {
  ...
  for (let i = 0, il = passes.length; i < il; i++) {
    const pass = passes[i];
    if (pass.enabled === false) continue;
    pass.renderToScreen = (this.renderToScreen && this.isLastEnabledPass(i));
    pass.render(...)
```

Yes, newer EffectComposer has isLastEnabledPass and sets renderToScreen automatically. So last pass renders to screen. Good.

But careful: OutputPass before last — it renders to a buffer with colorSpace? The composer's render targets: EffectComposer creates render target with type HalfFloatType; render targets' texture colorSpace default is NoColorSpace (linear). OutputPass shader uses `#include <colorspace_fragment>`? OutputPass fragment shader: it has uniforms for tone mapping and manually does sRGBTransferOETF etc. It converts based on renderer's outputColorSpace. So output becomes sRGB-encoded values stored in a linear-tagged buffer — fine since final pass writes raw.

Also need to worry: when InvertPass renders to screen with raw output, does renderer apply any conversion? ShaderPass uses ShaderMaterial with explicit fragment shader; no colorspace_fragment include, so raw. Canvas: renderer.outputColorSpace SRGB — the drawing buffer is treated as sRGB values written directly (conversion happens in shader stage only). Good.

One more subtlety: RenderPass renders scene into composer render target. Materials include colorspace_fragment which converts based on the render target's color space. Render target texture colorSpace: EffectComposer's internal target — created with `new WebGLRenderTarget(w, h, {type: HalfFloatType})`. colorSpace defaults to NoColorSpace, so colorspace_fragment does nothing (linear). Good.

So chain: RenderPass -> OutputPass -> InvertPass. Screen: 1 - sRGB(L). Background 0x336699: THREE.Color(0x336699) with ColorManagement enabled converts hex sRGB to linear. Without effect, screen shows sRGB encode = 0x336699 exactly? Linear stored as float, encode gives back 0x336699 (approximately, float precision fine, rounding at 8-bit output gives exact). With effect: 1 - sRGB(L) = 1 - (0x33/255, 0x66/255, 0x99/255) = (0xcc, 0x99, 0x66)/255 = 0xcc9966. 

But wait — order spec says "an OutputPass" — typical convention OutputPass last, but requirement says exact inverse; putting OutputPass last would need shader doing encode-invert-decode. The prompt hints "order the passes (or convert in the shader) so this holds". So either approach acceptable. I'll do the encode-invert-decode approach in the shader with OutputPass last? That's mathematically decode(1-encode(L)) — exact inverse? decode is exact inverse of encode, so decode(1 - encode(L)) then OutputPass encode → 1 - encode(L). Same result. But half float precision: encode(L) for background linear values — encode then invert then decode: float precision ~1e-7 relative, then encode back — result within 0.5/255 easily. Fine either way.

Which is cleaner? Option A: RenderPass -> InvertPass(shader does: convert to sRGB, invert, convert back to linear) -> OutputPass. This keeps OutputPass last (conventional) and satisfies requirement. I'll do that, writing sRGB encode/decode GLSL myself.

Shader:

uniforms: tDiffuse.

frag:
```
vec3 x = texture2D(tDiffuse, vUv).rgb;
// linear -> sRGB
vec3 s = sRGBEncode(x);
vec3 inv = 1.0 - s;
gl_FragColor = vec4(sRGBDecode(inv), 1.0);
```
Implement:
```
vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}
vec3 sRGBToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055)/1.055, vec3(2.4)), step(0.04045, c));
}
```
step with vec3 works component-wise. mix with vec3 condition fine.

Then OutputPass does encode again → screen shows 1 - sRGB(L). But note OutputPass reads from writeBuffer/readBuffer which are HalfFloatType, no conversion issues.

Precision: encode then decode round trip: pow operations introduce tiny error, then encode again — error ~ pow( decode(encode), 2.4 )... decode(encode(x))≈x with relative error ~1e-6, encode again error negligible. Final 8-bit rounding: exact. Good.

Alternatively simpler and even more exact: put OutputPass before invert pass. But spec-listing order isn't mandated. I'll go with the shader-convert approach with OutputPass last — safer conventionally and satisfies "convert in the shader".

Actually wait — one concern: ShaderPass renders to buffer with renderToScreen false; the fragment writes gl_FragColor; fine.

Also need renderer setup: 
```
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace (default).
```
Composer sized to renderer size: `new EffectComposer(renderer)` auto-sizes using renderer size and pixel ratio. On resize: composer.setSize(w, h).

Animation loop: composer.render() — with delta optional. Use clock.

__ready after first frame: track flag in loop.

Write code.

ShaderPass import from 'three/addons/postprocessing/ShaderPass.js'; OutputPass from 'three/addons/postprocessing/OutputPass.js'; RenderPass.

Full code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const InvertShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `...`,
  fragmentShader: `...`
};
```

ShaderPass constructor typing: `new ShaderPass(shader, textureID?)` shader type: object. Fine with plain object literal; ShaderPass parameter type is object — passing our literal works.

Note uniform value typing: ShaderPass's shader param type is `object` so no strict issue. But uniforms value null fine.

Loop:

```
const clock = new THREE.Clock();
let ready = false;
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  sphere.rotation.y += delta * 0.5; // optional motion using delta
  composer.render(delta);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Resize:
```
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
```

Expose __scene, __camera, __renderer, __composer.

Fragment shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 color) {
  vec3 lo = color * 12.92;
  vec3 hi = 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), color));
}

vec3 sRGBToLinear(vec3 color) {
  vec3 lo = color / 12.92;
  vec3 hi = pow((color + 0.055) / 1.055, vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), color));
}

void main() {
  vec3 linearColor = texture2D(tDiffuse, vUv).rgb;
  vec3 srgb = linearToSRGB(linearColor);
  vec3 invertedSRGB = 1.0 - srgb;
  gl_FragColor = vec4(sRGBToLinear(invertedSRGB), 1.0);
}
```

Vertex shader:
```glsl
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

One subtlety: pow(color, ...) with negative? colors clamped >=0. Fine.

Explain reasoning in comments about color space ordering.

Also note: ShaderPass shader object type — in three types, ShaderPass constructor: `constructor(shader: object, textureID?: string)`. Uniform value null ok.

Edge: composer.render(delta) — fine.

Also maybe set renderer.setPixelRatio — composer uses renderer's pixel ratio via setSize? EffectComposer constructor uses renderer.getDrawingBufferSize. composer.setSize(width, height) sets internal targets to size*pixelRatio. OK.

Double-check EffectComposer auto renderToScreen for last enabled pass: yes, `pass.renderToScreen = (this.renderToScreen && this.isLastEnabledPass(i))`. OutputPass last → renders to screen, writes sRGB-encoded raw values (its shader does the conversion; it reads renderer.outputColorSpace... OutputPass sets its material defines based on renderer's output color space in render()). Good.

Write final answer.