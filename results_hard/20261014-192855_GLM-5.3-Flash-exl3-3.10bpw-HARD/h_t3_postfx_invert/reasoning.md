The classic pitfall: EffectComposer renders targets in linear-sRGB... Actually in recent Three.js, RenderPass renders to an internal render target; if the target type is HalfFloat with linear color space, and the render target is set... With OutputPass, tone mapping and color space conversion happens at the end. If the ShaderPass inverts in linear space, then inverting in linear then converting does NOT equal converting then inverting. Requirement: final on-screen colors must be exact inverse of what screen would show without effect.

Scene shows: background 0x336699 which in linear is srgbToLinear(0x33,0x66,0x99). On screen normally = 0x336699. Inverse desired = 0xcc9966. The inverse must happen in sRGB space, i.e., after linear→sRGB conversion.

Approach: do the inversion in the shader after converting to sRGB? Or set the shader pass to operate after conversion... Simplest: in the custom ShaderPass, perform linear→sRGB conversion on tDiffuse, invert, output sRGB values as... but then OutputPass would convert again? Actually OutputPass converts from working color space (linear) to sRGB — it applies conversion only if renderTarget colorSpace != SRGB? OutputPass always applies tone mapping and sRGB conversion via shader (it uses linearToOutputTexel? Actually OutputPass sets material with colorspace conversion). Hmm.

Simplest robust approach: skip OutputPass? Requirement says include OutputPass. So order: RenderPass → ShaderPass (invert) → OutputPass. But then inversion happens in linear space — wrong.

Alternative: ShaderPass converts input from linear to sRGB, inverts, then converts back sRGB→linear, outputs linear. Then OutputPass does linear→sRGB, giving exact sRGB inverse. That achieves: final = sRGB(linear) where sRGB(linear) = 1 - linearToSRGB(linear)... wait let's check.

Without effect: composer chain: RenderPass produces linear values; OutputPass converts linear→sRGB for display. Screen shows S(linear) — the sRGB-encoded value of the linear color. For background, linear = srgbToLinear(0x336699... as SRGBColorSpace input). Actually scene.background Color(0x336699): in Three r152+, colors set via hex are converted from sRGB to linear working space. So linear = L = srgbToLinear(0.2, 0.4, 0.6). Screen without effect would show S(L) = 0x336699. Desired with effect: 1 - 0x336699 = 0xcc9966, i.e., screen shows 1 - S(L) channel-wise.

So we want the pipeline output (the value fed into the final sRGB encode) B such that S(B) = 1 - S(L). Since S is monotonic and invertible per channel, B = S⁻¹(1 - S(L)). So in the shader pass: compute sRGB value of input linear, invert: c = 1 - LinearToSRGB(tDiffuse.rgb); then convert back sRGB→linear: output = SRGBToLinear(c). Then OutputPass converts linear→sRGB giving exactly 1 - S(L). 

But note OutputPass's outputColorSpace transform: In three's OutputPass shader, it applies linearToOutputTexel using the render target's... it uses `#include <colorspace_fragment>` which converts from LinearSRGB to renderer.outputColorSpace (sRGB). Fine.

One subtlety: LinearToSRGB conversion in shader for values — three's color space conversion functions: `LinearSRGBToLinear`? There are GLSL functions `LinearTransferOETF` etc. Simpler to write my own pow-based functions in the shader. Use accurate sRGB transfer: piecewise or pow(c, 1/2.4) adjustments. Three.js built-in chunk 'colorspace_pars_fragment' provides LinearTosRGB and sRGBToLinear? In recent versions there are functions `LRToRGB`? Let me recall: three r150+ has in ShaderLib? In core shaders, `#include <colorspace_pars_fragment>` defines `linearToOutputTexel`. Hmm, in recent three (r155+), there are functions like `sRGBToLinear`, `LinearTosRGB`? Actually the chunk defines `vec4 LinearToLinear(vec4 value)`, `vec4 LinearTosRGB(vec4 value)` etc. But to be safe with tsc-only constraints (no compile issues since GLSL is a string), I'll write my own helper functions with pow and mix piecewise:

```glsl
vec3 linearToSRGB(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}
vec3 sRGBToLinear(vec3 c) {
  vec3 lo = c / 12.92;
  vec3 hi = pow(max(c, vec3(0.0)), vec3(2.4)) * 1.055 - 0.055... 
```

Actually sRGBToLinear hi: pow((c+0.055)/1.055, 2.4).

Also clamp c to [0,1] before pow for the inverse direction? For hi branch of sRGB→linear: pow((c + 0.055)/1.055, 2.4) — negative c invalid, clamp.

Alternatively simpler: check three version — the user just wants a working code. Also note: the ShaderPass's input — with render targets of type HalfFloat and colorSpace linear... The RenderPass output in composer's readBuffer: composer render targets default type HalfFloatType, colorSpace NoColorSpace/LinearSRGB. So values are linear-encoded. Good.

Alternatively set the ShaderPass AFTER converting... could also put ShaderPass after OutputPass? OutputPass must be last per typical usage but technically ShaderPass renders to screen if renderToScreen... EffectComposer automatically renders the LAST pass to screen. If order is RenderPass, OutputPass, ShaderPass(invert only), then OutputPass converts to sRGB and writes to a buffer (no tonemap issues), then ShaderPass inverts in sRGB space and renders to screen. But when output goes to screen canvas, the shader output is written raw — since ShaderPass renders to screen with no color conversion, values pass through as-is (they're already sRGB-encoded numbers), framebuffer treats them as sRGB. That works too, and inversion in sRGB space gives exact result. Does OutputPass render correctly to a render target? OutputPass just converts; writing sRGB values into a linear... wait the intermediate buffer after OutputPass would hold sRGB-encoded values, then ShaderPass inverts numerically → output = 1 - sRGB value, displayed on canvas directly. But does the canvas treat shader output as sRGB? The default framebuffer: WebGL renderer with outputColorSpace SRGB uses... For ShaderMaterial full-screen quads, no conversion applied (outputColorSpace conversion only happens via colorspace_fragment include; ShaderPass material doesn't include it). So raw values written. And since values are already in sRGB encoding... but hold on: after OutputPass, are the values sRGB-encoded or double-converted? OutputPass converts linear to outputColorSpace SRGB → values become sRGB-encoded. Then invert → displayed. Screen shows 1 - S(linear). Correct!

But there's a subtlety: EffectComposer determines renderToScreen by pass being last; both approaches fine. I'll go with approach: RenderPass → ShaderPass (invert with sRGB conversion inside: linear→sRGB→invert) → OutputPass? No — then OutputPass would re-convert. If the shader outputs linear-inverted-of... Let me redo: ShaderPass does: v = S⁻¹(1 - S(L)) = inverse in sRGB then back to linear. Output linear. OutputPass: S(B) = 1 - S(L). Correct. That's the "convert in shader" approach mentioned in the prompt. The prompt says: "order the passes (or convert in the shader) so this holds." Either is fine.

Simplest to reason: my custom shader converts input linear → sRGB, inverts, then sRGB → linear back, so OutputPass's final conversion restores exact complement. I'll do that. Include clamp: values should be within [0,1] mostly (background 0.2/0.4/0.6 linear, white sphere = 1.0). S of 1.0 = 1.0, inverse 0.0, S⁻¹(0)=0. Sphere appears black. 

Write GLSL:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linear2srgb(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, greaterThanEqual(c, vec3(0.0031308)));
}
```

mix with bvec needs vec3 selection: `mix(a, b, vec3(greaterThanEqual(...)))` — but mix doesn't take vec3 bvec directly; use `step` returning vec3: mix(lo, hi, step(0.0031308, c)) — step(edge, x) returns 0 when x < edge, 1 else. vec3 works with mix. Good, but pow of small c fine since clamped ≥ 0.

srgb2linear:
```glsl
vec3 srgb2linear(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    vec3 lo = c / 12.92;
    vec3 hi = pow((c + 0.055)/1.055, vec3(2.4));
    return mix(lo, hi, step(vec3(0.0031308), c));
}
```

main: vec4 texel = texture2D(tDiffuse, vUv); vec3 s = linear2srgb(texel.rgb); vec3 inv = 1.0 - s; gl_FragColor = vec4(srgb2linear(inv), texel.a);

Vertex shader standard.

Imports:
- THREE
- EffectComposer, RenderPass, ShaderPass, OutputPass from addons.

Composer with OutputPass: need to make sure composer's buffers don't already apply sRGB. Default fine.

Resize: composer.setSize.

Animation loop: composer.render(delta)? composer.render(dt). Keep simple: composer.render(delta) — delta optional. Use elapsed to slightly rotate? Motion must use delta time — maybe add subtle sphere scale pulsation using clock. Not required to move; but "Motion must use delta/elapsed time" applies if there's motion. I could keep static scene; but harmless to add subtle rotation with delta. I'll add slight rotation of sphere using clock.getDelta(). Actually delta in setAnimationLoop: renderer provides time parameter. Use clock.

__ready: set after first frame: use a flag in the loop.

OutputPass import path: 'three/addons/postprocessing/OutputPass.js'.

Write code.

TypeScript strict: ShaderPass accepts ShaderMaterial-ish object: `{ uniforms: {...}, vertexShader, fragmentShader }`. Fine.

renderer.setAnimationLoop((time) => { ... }). time param type number. Use clock delta for rotation.

composer.render() — can pass delta: composer.render(delta) where delta number | undefined. Fine.

Set renderer.outputColorSpace default SRGB; toneMapping none by default. OutputPass uses renderer's toneMapping — default NoToneMapping, fine.

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

sphere geometry, MeshBasicMaterial 0xffffff, add.

composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const InvertShader = {...};
composer.addPass(new ShaderPass(InvertShader));
composer.addPass(new OutputPass());

resize handler: camera.aspect, updateProjectionMatrix, renderer.setSize, composer.setSize.

clock = new THREE.Clock();

let firstFrame = false;
renderer.setAnimationLoop((time) => {
  const dt = clock.getDelta();
  const t = time * 0.001;
  mesh.rotation.y = t * 0.3; // delta-independent (elapsed)
  composer.render(dt);
  if (!firstFrame) { firstFrame = true; (window as any).__ready = true; }
});
```

Wait: rotation of the sphere — basic material white sphere, rotation invisible. Fine, keep or drop. Motion via elapsed time so compliant.

Expose __scene, __camera, __renderer, __composer.

Note the ShaderPass with uniform tDiffuse null: `{ value: null }`.

Comment about color space reasoning.