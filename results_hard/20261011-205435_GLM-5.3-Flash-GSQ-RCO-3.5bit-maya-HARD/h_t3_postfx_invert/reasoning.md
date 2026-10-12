We need to invert colors in a way that the final sRGB output is exact inverse. Scene background 0x336699 is interpreted as sRGB color, converted to linear internally. Without effect, screen shows 0x336699 (sRGB). With effect, we want screen to show 0xcc9966.

Approach: RenderPass renders scene to composer's render target. If composer render targets are in linear space (default HalfFloatType, no color space conversion), the buffer holds linear values. To invert sRGB-wise: we need to convert linear -> sRGB, invert (1 - srgb), then feed that value to OutputPass which converts linear -> sRGB... that would double-convert.

Options:
1. ShaderPass after RenderPass: convert linear to sRGB in shader, invert, then convert back to linear (so OutputPass converts to sRGB again). Mathematically: final = sRGB_to_linear(1 - linear_to_srgb(c)). This gives exact inverse in sRGB space.

2. Alternative: ShaderPass just does 1.0 - color in linear space? That would invert in linear space, not sRGB — 0x336699 inverted linearly is not 0xcc9966 on screen.

3. Or: do the inversion in shader working on sRGB values, and skip OutputPass... but OutputPass is required. Actually could set shader to output sRGB-encoded value and OutputPass would re-encode... no.

Cleanest: ShaderPass with:
```glsl
vec3 srgb = LinearTosRGB(tDiffuse.rgb); // approximate? Need exact inverse.
vec3 inverted = 1.0 - srgb;
gl_FragColor = vec4(SRGBToLinear(inverted), tDiffuse.a);
```

But exactness: three's LinearToSRGB uses the piecewise sRGB transfer function. The exact inverse: sRGB_to_linear(1 - linear_to_srgb(c)) applied then OutputPass does linear_to_srgb → 1 - linear_to_srgb(c) in sRGB space. Since sRGB encoding/decoding via the piecewise function is exact inverse of each other (with float precision), final on-screen = 1 - linear_to_srgb(c). Background: scene.background Color(0x336699) — with renderer.outputColorSpace = SRGBColorSpace and color management, THREE.Color converts hex to linear working space. RenderPass renders in linear to composer RT. So linear_to_srgb gives back 0x336699, inverted = 0xcc9966. 

But does the render target preserve exact 8-bit values? Composer default render target is HalfFloatType, so linear values stored with float precision; linear_to_srgb then quantizes to screen 8-bit. The value 0x336699/255 in sRGB → linear → back to sRGB: rounding could be off by 1 LSB due to float precision. In practice this generally round-trips correctly within half float precision? Half float has ~3 decimal digits precision; sRGB to linear values can be small... For 0x33 = 51/255 ≈ 0.2, linear ≈ 0.0331; half float precision at 0.033 is about 0.0000153 * ... half floats have 10 mantissa bits, relative precision ~0.05% (2^-11 ≈ 0.0005). Converting back: 0.0331 * (1±0.0005) → sRGB ≈ 0.2 * (1±0.00005)... sRGB derivative near 0.2: srgb ≈ 1.055*l^(1/2.4)-0.055, dsrgb/dl ≈ 1.055/2.4 * l^(1/2.4-1) ≈ 0.44 * 0.2^(-0.583) ≈ 0.44*2.56 ≈ 1.13. So error in sRGB ≈ 1.13 * dl = 1.13 * 0.0331*0.0005 ≈ 0.0000187, i.e. ~0.005 LSB of 8-bit. Fine — rounds correctly.

However, three's ColorManagement converts hex with proper sRGB decode using Math.pow-based exact function? THREE.SRGBToLinear uses the piecewise: if c <= 0.04045 then c/12.92 else pow((c+0.055)/1.055, 2.4). And LinearToSRGB inverse piecewise. Round trip in double precision is exact within floating error; then quantization to 8-bit should give back 0x33. Then 1-0x33... wait, the inversion happens on the float sRGB value 0.2 → 0.8 → on screen quantized: 0.8*255 = 204 = 0xCC. Good. White sphere: sRGB 1.0 → 0.0 → black. 

Now shader details. I'll write GLSL:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055)/1.055, vec3(2.4)), step(vec3(0.04045), c));
}
void main() {
  vec3 srgb = linearToSRGB(texture2D(tDiffuse, vUv).rgb);
  gl_FragColor = vec4(srgbToLinear(1.0 - srgb), 1.0);
}
```

step(vec3, c): step(edge, x) returns x >= edge. mix with vec3 selector works.

Note: ShaderPass by default sets `material` with the shader; tDiffuse auto-uniform handled by ShaderPass (it defines tDiffuse uniform automatically? ShaderPass creates UniformsUtils.clone(shader.uniforms) and ShaderMaterial; the texture uniform "tDiffuse" is set by fullscreen quad material? Actually ShaderPass: if shader.uniforms doesn't have tDiffuse... In three's ShaderPass, the fullscreen quad uses the material; ReadBuffer is bound via `this.uniforms[this.textureID].value = readBuffer.texture` where textureID defaults 'tDiffuse'. But the uniform must exist in shader.uniforms for UniformsUtils clone. Standard practice: include `tDiffuse: { value: null }` in uniforms. Yes.

OutputPass handles tone mapping + sRGB conversion. Composer render targets: default type. When using OutputPass, three docs say renderer should be... OutputPass converts working color space (linear) to output sRGB. Fine.

Also need renderer.outputColorSpace default is SRGB. Composer with OutputPass: fine.

One nuance: when rendering to composer's render target, the scene colors stay linear (RenderPass renders with renderer.outputColorSpace... actually renderer when rendering to a render target doesn't apply output color space conversion unless renderTarget.texture.colorSpace is set to sRGB). Composer RT colorSpace default is NoColorSpace/linear-ish (three sets to LinearSRGBColorSpace by default? EffectComposer creates render target with default which is... in recent three, EffectComposer render target colorSpace defaults based on renderer? Let me recall: EffectComposer constructor creates WebGLRenderTarget with type HalfFloatType; colorSpace left default = NoColorSpace, meaning no conversion — linear values kept. OutputPass at end converts to sRGB. That's standard.

Also there's a subtlety: ShaderPass operates after RenderPass — buffer values are linear. Good.

Also, could instead simply do the shader inversion with output already in sRGB and skip... no, OutputPass required and it re-encodes. My approach is correct.

Actually wait — there's another consideration: does OutputPass do tone mapping (NoToneMapping default) and linear→sRGB. Yes.

Alternative simpler approach achieving exactness: set composer's render target... no, keep as is.

Also need to expose __scene, __camera, __renderer, __composer, __ready after first frame.

Render loop: composer.render() — composer.render() accepts delta but not required. Use setAnimationLoop; time-based motion: maybe slowly rotate sphere? Not required, but "Motion must use delta/elapsed time" — we can add subtle rotation or none. Add gentle rotation using clock delta for compliance.

Resize: camera.aspect, updateProjectionMatrix, renderer.setSize, composer.setSize.

TypeScript strict: everything typed. Import ShaderPass, RenderPass, OutputPass, EffectComposer.

Write code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({color: 0xffffff}));
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const InvertShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `...`,
  fragmentShader: `...`,
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);
composer.addPass(new OutputPass());

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  sphere.rotation.y += delta * 0.5;
  composer.render();
  if (!ready) { ready = true; (window as any).__ready = true; }
});

window.addEventListener('resize', () => { ... });

(window as any).__scene = scene;
...
```

Uniform typing: ShaderPass expects shader object with uniforms, vertexShader, fragmentShader. The uniforms type: `{ [uniform: string]: { value: any } }`. To satisfy strict TS without IUniform issues, cast: define shader as plain object; ShaderPass constructor param type is `Shader` object? ShaderPass constructor signature: `constructor(shader: object | ShaderMaterial?, textureID?: string)`. Actually it's `shader: object`. So any object works. Let me check three's ShaderPass TS types: `constructor(shader: object | Material, textureID?: string)`. I think it's fine passing a plain object literal. But uniforms value null — fine.

Actually in three types (three.js ships types since r157+ in "three/addons"?). Addons have .d.ts files. ShaderPass: `constructor(shader: object | ShaderMaterial, textureID?: string)`. Hmm, I recall `shader: object`. Either way an object literal typed as `{ uniforms: {...}, vertexShader: string, fragmentShader: string }` is assignable to object. But `{ value: null as ... }` — fine.

To be safe against strict typing of uniforms value, I could write `tDiffuse: { value: null }` — plain object, ok since ShaderPass param is `object`.

Wait — does ShaderPass clone uniforms and require uniforms entries shape? UniformsUtils.clone works on any object. Fine.

One issue: `composer.render()` in the loop — composer.render(delta) optional. Fine.

GLSL: use texture2D — three's ShaderPass uses ShaderMaterial with GLSL1 by default? Three WebGLRenderer with ShaderMaterial defaults GLSL1 (glslVersion null → GLSL1 unless WebGL2... actually three compiles GLSL1 shaders with compatibility defines; texture2D works). Yes, standard ShaderPass examples use texture2D.

Edge case: negative or >1 colors? Not here.

Also mix with step: `mix(a, b, step(...))` — step returns float per component with vec3 args: step(vec3 edge, vec3 x) returns vec3. mix(vec3, vec3, vec3) fine.

Also should I handle colors above the threshold boundaries: exact constants: srgb decode threshold 0.04045, encode threshold 0.0031308. Standard.

Also note: OutputPass does linear→sRGB using the same piecewise — so double application: our shader does linear→sRGB then sRGB→linear; OutputPass does sRGB decode? No—OutputPass converts working (linear) to output sRGB. Net final = encode( decode( encode( c_linear ) inverted ) )... wait: final sRGB = encode( srgbToLinear(1 - encode(c_linear)) ) = 1 - encode(c_linear) (since encode∘decode = identity within precision). Good.

Precision check for exactness at 0xCC: 1 - 0.2 = 0.8 exactly? encode(51/255): 51/255 = 0.2. encode: 1.055*0.2^(1/2.4)-0.055. 0.2^(1/2.4) = e^(ln0.2/2.4) = e^(-1.6094/2.4)=e^-0.6706=0.5114. *1.055 = 0.53953 -0.055 = 0.48453. Then 1-0.48453 = 0.51547. decode: (0.51547+0.055)/1.055 = 0.54073; ^2.4 = e^(2.4*ln0.54073)= ln0.54073=-0.6146; *2.4=-1.475; e^-1.475=0.2288. encode again: 1.055*0.2288^(1/2.4)... 0.2288^(0.41667)=e^(-1.475/2.4)=e^-0.6146=0.5407. *1.055=0.5704-0.055=0.5154. *255=131.4 → hmm, expected 0xCC = 204 = 0.8*255 = 204. Wait, 1 - 0.2 should be 0.8 → 204. But I computed encode(0.2)=0.4845, then 1-0.4845 = 0.5155, then decode→0.2288, encode→0.5155 → 131? That contradicts. Let me recheck: the identity should be encode(decode(x)) = x. I did encode(0.2)=0.4845. Then decode(0.4845) should = 0.2: decode(0.4845) = ((0.4845+0.055)/1.055)^2.4 = (0.5395/1.055)^2.4 = (0.5114)^2.4 = e^(2.4*ln0.5114) = ln0.5114 = -0.6706, *2.4 = -1.6094, e^-1.6094 = 0.2. ✓. So final on screen = 1 - encode(c_linear) = 1 - 0.4845 = 0.5155 → 131.5?? But we want 1 - 0.2 = 0.8 → 204!

Hold on. 0x336699: red channel 0x33 = 51. Inverse 0xCC = 204. 204/255 = 0.8. 1 - 51/255 = 204/255 = 0.8. So on-screen sRGB value should be 0.8. But my pipeline gives 0.5155? That means encode(c_linear) ≠ c_sRGB_original. c_linear here is the linear-space value of color 0x33: decode(51/255) = decode(0.2) = ((0.2+0.055)/1.055)^2.4 = (0.2417)^2.4 = e^(2.4 * ln 0.2417) = ln0.2417=-1.4200, *2.4 = -3.408, e^-3.408 = 0.0331. encode(0.0331): 1.055*0.0331^(1/2.4) - 0.055. 0.0331^(0.41667) = e^(0.41667 * ln 0.0331) = ln0.0331 = -3.408, *0.41667 = -1.4200, e^-1.42 = 0.2417. *1.055 = 0.2550 - 0.055 = 0.2000. ✓ = 0.2. Then 1 - 0.2 = 0.8. I made arithmetic error before: I used encode(0.2) where c_linear = 0.0331 not 0.2. Correct: encode(c_linear=0.0331) = 0.2. Invert → 0.8. On screen 204 = 0xCC ✓. Great, pipeline correct.

Green: 0x66 = 102/255 = 0.4 → inverse 0x99 = 153/255 = 0.6 ✓ trivially. Blue 0x99→0x66 ✓.

Now check round-trip precision through half-float buffer: c_linear = 0.03310... stored in half float: relative error ≤ 2^-11 ≈ 4.9e-4. Our shader encode: error in sRGB ≈ 1.13 (dsRGB/dlinear at 0.0331 linear? compute: s = 1.055 l^(1/2.4) - 0.055, ds/dl = 1.055/2.4 * l^(1/2.4 - 1) = 0.4396 * l^(-0.5833). At l=0.0331: l^(-0.5833) = e^(0.5833*3.408)=e^1.9878=7.297. ds/dl ≈ 3.21. So error in sRGB ≈ 3.21 * 0.0331*4.9e-4 ≈ 5.2e-5 → 0.0133 LSB. Then inversion 1-s, decode, encode again: error stays ~1e-4 relative — fine, well under 0.5 LSB. So exact 8-bit output. 

But wait: also the composer's internal intermediate target between ShaderPass and OutputPass — also half float, another rounding, negligible.

Also devicePixelRatio with composer: composer.setSize handles pixel ratio? EffectComposer.setSize(width, height) multiplies by pixelRatio internally using renderer's pixel ratio? EffectComposer constructor: `const size = renderer.getSize(new Vector2()); this._width = size.width; this._height = size.height; renderTarget size uses effective size (width*pixelRatio)`. setSize sets `this._width = width; ... effectiveWidth = this._width * this._pixelRatio`. And _pixelRatio is set from renderer at construction. If we setPixelRatio before creating composer, fine.

Also set renderer.setPixelRatio(window.devicePixelRatio) — fine.

Also antialias: true on renderer doesn't affect composer passes (render targets). Could enable composer render target samples? Not needed for basic material. But edges of sphere will be aliased since composer bypasses canvas MSAA. Could set composer's render target with samples. EffectComposer default render target — in newer three, WebGLRenderTarget with samples: 0. Could pass custom render target with samples: 4? EffectComposer(renderer, renderTarget?). To be safe about strict typing and simplicity, maybe create render target with samples:

```ts
const size = new THREE.Vector2();
renderer.getSize(size); // or just use window sizes * pixelRatio
const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio(),
  { type: THREE.HalfFloatType, samples: 8 }
);
const composer = new EffectComposer(renderer, renderTarget);
```

Hmm, EffectComposer with provided renderTarget: it uses it, clones for write/read buffers? Composer creates this.renderTarget1 = renderTarget, renderTarget2 = renderTarget.clone(). Fine. MSAA samples on WebGL2 gives resolved texture. That works. But is it necessary? The task doesn't require AA. Simpler to keep default composer; sphere edges slightly jagged but acceptable. I'll include samples for quality — but risk: HalfFloatType + samples requires EXT_color_buffer_float renderability with multisample — supported broadly. I'll include it but it's optional; maybe keep default to minimize risk. I'll keep it simple: default EffectComposer. Actually aliasing on a plain white sphere against blue bg is quite visible. I'll add samples via custom render target — safe enough. Hmm, but then OutputPass reading from MSAA resolve — composer handles via copyPass? In three, passes render to multisampled RTs fine (WebGLRenderer resolves automatically when texture is read). Yes, WebGL2 multisampled render targets auto-resolve on texture access. Fine.

Actually, simpler robust route: create RT with samples and let composer clone. I'll do it.

Type strictness: `new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 })` — options typed as WebGLRenderTargetOptions; fine.

Note also colorSpace of RT default: THREE.NoColorSpace — linear values preserved. Good.

Resize handler: renderer.setSize, composer.setSize(w,h), camera aspect.

Also expose __composer.

GLSL shaders as strings:

vertex:
```
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

fragment as discussed.

ShaderPass typing: In three's type definitions, ShaderPass constructor: `constructor(shader: object | ShaderMaterial, textureID?: string)`. Hmm, actually I believe it's:

```ts
class ShaderPass extends Pass {
  constructor(shader: object | ShaderMaterial, textureID?: string);
}
```

Passing my object literal fine. But uniforms `{ value: null }` — object literal, fine.

Also `let` uniforms typing: define shader as const object. `tDiffuse: { value: null }` — TS infers `{ value: null }` which is fine as part of object passed as `object`.

OutputPass import path 'three/addons/postprocessing/OutputPass.js'.

Motion requirement: "Motion must use delta/elapsed time, not frame counts." Rotate sphere with delta. Sphere is MeshBasicMaterial white — rotation invisible but satisfies requirement. Fine.

__ready after first frame: set after composer.render() in first loop iteration.

Final code. Also note `camera.lookAt` after position set — lookAt origin default (0,0,0) anyway.

Double-check mix step edge usage: `mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c))` — pow with c=0 fine (pow(0, y) = 0 for y>0). Negative c impossible.

Write it.