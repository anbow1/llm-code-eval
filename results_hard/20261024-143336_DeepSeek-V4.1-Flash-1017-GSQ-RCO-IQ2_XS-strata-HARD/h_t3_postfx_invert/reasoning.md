We need answer single ts code block. Need think carefully about color space inversion correct. Need build scene, composer with RenderPass, custom ShaderPass inverts colors, OutputPass. Requirement final on screen exact inverse of what screen would show without effect: background 0x336699 -> 0xcc9966, white sphere -> black.

Three.js color management. Need understand pipeline. In recent three (r152+), renderer.outputColorSpace = SRGBColorSpace default. Color values interpreted as sRGB? scene.background = new THREE.Color(0x336699). Color constructor converts sRGB hex to linear working color space if ColorManagement enabled. Internally color components linear. MeshBasicMaterial color 0xffffff, linear 1.

RenderPass renders scene to composer render target. Default EffectComposer render target likely uses HalfFloatType and colorSpace? Renderer renders to render target with outputColorSpace? In three, WebGLRenderer output color space applied when rendering to screen; when rendering to render target, no output color space conversion? Let's recall. The WebGLRenderer uses `getOutputColorSpace` maybe: when rendering to render target, outputColorSpace = renderTarget.texture.colorSpace? Actually `WebGLRenderer.outputColorSpace` only applies when rendering to canvas? There is `renderer.outputColorSpace = SRGBColorSpace`; during render, if currentRenderTarget === null, outputColorSpace = this.outputColorSpace; else outputColorSpace = currentRenderTarget.texture.colorSpace? I need accurate.

Three source (r160-ish):
function WebGLRenderer(...) {
 this.outputColorSpace = SRGBColorSpace;
}
In render:
const currentRenderTarget = this.getRenderTarget();
...
if (currentRenderTarget === null) {
  _currentRenderTarget = ... // screen
  // output color space? 
}
Actually in `WebGLRenderer.render`, after scene render, `this.setRenderTarget` etc.

In WebGLProgram, shader defines `linearToOutputTexel` based on outputColorSpace. For materials, at end fragment: `gl_FragColor = linearToOutputTexel(gl_FragColor);` For render target, if render target texture colorSpace = NoColorSpace? Hmm.

When rendering to a WebGLRenderTarget, the output encoding is determined by render target texture's colorSpace? Let's search memory from three code. In WebGLProgram, `getTexelEncodingFunction( functionName, colorSpace )` uses `ColorManagement.getTransfer(colorSpace)`. In WebGLRenderer, `initGLContext` maybe. In `WebGLPrograms`, `outputColorSpace = currentRenderTarget === null ? renderer.outputColorSpace : (currentRenderTarget.isXRRenderTarget ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace?)`. Need exact.

I recall in three r152:
```
const outputColorSpace = renderer.outputColorSpace;
```
passed to program? In `WebGLRenderer` render:
```
if ( _currentRenderTarget === null ) {
  _currentRenderTarget = this.getRenderTarget();
  ...
}
...
```
There is property `currentRenderTarget` and `_currentRenderTarget`. Maybe `getRenderTarget` used in `WebGLProgram`.

Let's recall from three.js source I've seen. In WebGLRenderer.js:
```
function WebGLRenderer( parameters = {} ) {
  ...
  this.outputColorSpace = SRGBColorSpace;
  ...
}
```
In `WebGLProgram`:
```
const outputColorSpace = parameters.outputColorSpace;
...
function generateVertexShader...
```
Actually `WebGLProgramParametersWithUniforms` includes `outputColorSpace`? Yes.

In `WebGLRenderer.render`:
```
const currentRenderTarget = this.getRenderTarget();
...
if ( _currentRenderTarget === null ) {
  _currentRenderTarget = currentRenderTarget;
  ...
}
...
const programs = this.getProgramCache...
```
No.

I remember in WebGLRenderer, `render` calls `this.setRenderTarget( this._currentRenderTarget )`? And in `WebGLProgram`:
```
const outputColorSpace = renderer.outputColorSpace;
```
No, when rendering to render target, output color space is renderTarget.texture.colorSpace? There is a function:
```
getOutputColorSpace: function( renderTarget ) {
   if ( renderTarget === null ) return this.outputColorSpace;
   return renderTarget.texture.colorSpace;
}
```
Could be.

Let's think from practical knowledge: EffectComposer in recent three. With OutputPass, typical setup:
- RenderPass renders scene into render target. The render target is HalfFloatType and its texture colorSpace? EffectComposer creates WebGLRenderTarget with `type: HalfFloatType` (default) and maybe no colorSpace. `RenderPass` will render scene into linear render target, so values linear.
- ShaderPass applies shaders on linear values.
- OutputPass converts linear to output color space (sRGB) and applies tone mapping.
Thus to invert final sRGB, you need invert linear values? If final sRGB = linearToSRGB(L), and you want inverse(sRGB), i.e. S' = 1 - S = 1 - linearToSRGB(L). The shader in linear stage produces L' = ? OutputPass does linearToSRGB(L'). We need L' = sRGBToLinear(1 - linearToSRGB(L)). That's not simply 1 - L. If instead invert in sRGB space before OutputPass? But OutputPass would double convert. We can write custom shader that converts to sRGB, invert, then converts back to linear, so final OutputPass yields inverse sRGB. Or we can place inversion after OutputPass? Then no conversion. But passes order: RenderPass -> custom ShaderPass -> OutputPass required? The prompt: "Use EffectComposer ... with a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass." So likely order RenderPass, ShaderPass, OutputPass. Need custom shader with correct color space conversion. Requirement exact inverse on screen. For background 0x336699 hex, internal linear color maybe approx. RenderPass output linear. ShaderPass invert? If simply rgb=1-rgb in linear, OutputPass -> sRGB gives e.g. background linear of 0x336699: sRGB (0.2,0.4,0.6) -> linear (0.0331,0.1329,0.3185). Invert linear -> (0.9669, 0.8671,0.6815), OutputPass -> sRGB approx (0.986,0.938,0.846) = not cc9966. So wrong.

If custom shader converts linear to sRGB, invert, then convert back to linear: final OutputPass converts back to sRGB = inverse. This yields exact.

Alternative put OutputPass before ShaderPass and then ShaderPass invert sRGB? But requirement says with RenderPass, custom ShaderPass, OutputPass, likely order. Could order RenderPass -> OutputPass -> ShaderPass? Then ShaderPass after output does invert? However EffectComposer's final pass renders to screen maybe with output conversion if last pass renderToScreen=true; a ShaderPass after OutputPass would render to screen with outputColorSpace conversion? Hmm, ShaderPass material uniforms? Actually ShaderPass is full-screen shader and if renderToScreen=true, it renders to screen; WebGLRenderer may apply output color space encoding to shader? For full-screen quad with ShaderMaterial, renderer applies output color space at end? In Three, ShaderMaterial fragment shader doesn't automatically include output encoding unless you include `#include <colorspace_fragment>`? Wait for ShaderMaterial, the shader is custom; Three may prepend? It doesn't apply output conversion unless shader has `linearToOutputTexel`. The ShaderPass shader code typically ends with `gl_FragColor = texture2D(...)`; When rendering to screen, no automatic conversion for ShaderMaterial unless `tonemapping` etc. Hmm.

Let's inspect known three ShaderPass. It uses `ShaderMaterial` with vertex/fragment, no output encoding includes. It just copies texture. If renderToScreen=true, the renderer's outputColorSpace? For custom shader, the fragment shader may not apply conversion. Actually for ShaderMaterial, I think `WebGLProgram` includes output color space conversion only if material has `isShaderMaterial`? Let's recall generated fragment prefix includes `#include <colorspace_fragment>`? The `colorspace_fragment` chunk is appended to shader by built-in materials, but ShaderMaterial not automatically. In examples, when using EffectComposer with OutputPass, OutputPass is used to handle color space. If no OutputPass, final colors may be wrong. The OutputPass has shader that converts.

Thus correct approach: RenderPass -> custom ShaderPass that inverts in sRGB encoded space (convert linear to sRGB, invert, convert back to linear) -> OutputPass converts linear to sRGB. This yields final sRGB inverse. Need handle alpha? background and sphere opaque, but need output alpha maybe. Since background color solid. Inversion rgb -> 1-rgb. Use `vec3`.

Need write GLSL. Need be careful with `linearToSRGB` and `sRGBToLinear` functions matching Three's ColorManagement. Three's SRGB transfer function: For linear -> sRGB, uses standard:
```
vec3 LinearTosRGB(vec3 value) {
  return mix(1.055 * pow(value, vec3(1.0/2.4)) - 0.055, 12.92 * value, step(value, 0.0031308));
}
```
Actually Three's `SRGBToLinear`:
```
vec3 SRGBToLinear(vec3 value) {
  return mix(pow((value + 0.055) / 1.055, vec3(2.4)), value / 12.92, step(value, 0.04045));
}
```
Check exact threshold. Three's ColorManagement has functions `SRGBToLinear` and `LinearToSRGB`. In GLSL chunks:
`colorspace_fragment`? Let's recall Three's `getTexelEncodingFunction` uses:
```
vec4 sRGBTransferOETF( in vec4 value ) {
  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, lessThanEqual( value.rgb, vec3( 0.04045 ) ) ), value.a );
}
vec4 LinearTosRGB( in vec4 value ) {
  return vec4( mix( pow( value.rgb, vec3( 0.4166666667 ) ) * 1.055 - 0.055, value.rgb * 12.92, lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ), value.a );
}
```
Wait `SRGBTransferOETF`? Let's derive threshold: For sRGB -> linear, threshold 0.04045 (sRGB), linear value = v/12.92 for v <= 0.04045. For linear -> sRGB, threshold linear 0.0031308, result = 12.92*L for L<=0.0031308. Three's `LinearTosRGB` as above.

Need use functions robustly. In custom shader pass, input texture is linear values after RenderPass. Need convert to sRGB, invert, convert back.

But wait: RenderPass may render scene with output color space? If the render target texture colorSpace default `NoColorSpace` / LinearSRGB? Need ensure. If RenderPass writing to render target, values maybe linear because renderer outputs linear to render target. Let's verify with Three current. EffectComposer default:
```
const renderTarget = new WebGLRenderTarget(width, height, {
  type: HalfFloatType,
  depthBuffer: true,
  stencilBuffer: false
});
```
Maybe `colorSpace: NoColorSpace`? In recent version, WebGLRenderTarget texture.colorSpace = NoColorSpace? Let's recall default: `WebGLRenderTarget` texture default `colorSpace = NoColorSpace`. In older versions `LinearEncoding`. So RenderPass output is linear. Yes.

But potential issue: OutputPass itself applies tone mapping and color space conversion. If renderer.toneMapping default NoToneMapping, fine. OutputPass uses `toneMapping` and `outputColorSpace`. We need consider renderer.outputColorSpace default. In Three recent default is SRGBColorSpace. But if OutputPass renderToScreen, it converts linear->sRGB. The final exact inverse of screen without effect. Without effect, renderer renders scene directly to canvas. The background 0x336699 gets converted to screen: 0x336699 exact. White sphere exact white. With effect final background should 0xcc9966 and sphere black. Our pipeline: background linear L = SRGBToLinear(0x336699). Shader: S = LinearToSRGB(L) = 0.2,0.4,0.6. invert S=0.8,0.6,0.4 (0xcc9966? Actually 0.8*255=204=0xcc, 0.6*255=153=0x99, 0.4*255=102=0x66 yes). Convert back to linear L' = SRGBToLinear(S_inv). OutputPass: LinearToSRGB(L') = S_inv. Final screen exactly inverse. Good.

Need ensure the shader uses `1.0 - rgb` on encoded sRGB. If there are values over 1? Background and material within [0,1]. No issue. Could clamp? Not necessary.

Need implement TypeScript strict no errors. Need imports:
```
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```
Need maybe use outputColorSpace = SRGBColorSpace explicit? It is default, but we can set. Ensure composer size.

Need define custom shader:
```
const invertShader = {
  uniforms: {
    tDiffuse: { value: null }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;

    vec3 linearToSRGB(vec3 value) {
      vec3 high = 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055;
      vec3 low = 12.92 * value;
      return mix(high, low, step(value, vec3(0.0031308)));
    }

    vec3 sRGBToLinear(vec3 value) {
      vec3 high = pow((value + 0.055) / 1.055, vec3(2.4));
      vec3 low = value / 12.92;
      return mix(high, low, step(value, vec3(0.04045)));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 srgb = linearToSRGB(color.rgb);
      vec3 inverted = 1.0 - srgb;
      color.rgb = sRGBToLinear(inverted);
      gl_FragColor = color;
    }
  `
};
```
Need check `mix(high, low, step(value, vec3(0.0031308)))`. `step(edge, x)` returns 1 if x >= edge. We want low if value <= threshold. `step(value, threshold)`? Let's see GLSL `step(edge, x)` returns 0 if x < edge, 1 if x >= edge. If we call `step(value, vec3(0.0031308))` then for each component: step(edge=value, x=threshold). This returns 0 if threshold < value, 1 if threshold >= value. So mix(high, low, 1) when value <= threshold, correct. But vector edge? `step(value, vec3(0.0031308))` accepts vec? Yes step with vector edge and vector x returns vector. Good. Or use `lessThanEqual(value, vec3(0.0031308))` -> 1.0 for true, mix high low. `lessThanEqual` returns bvec, need vec? `mix` accepts bvec? In GLSL mix genType mix(genType x, genType y, genType a) doesn't accept bvec. `step` fine.

Alternative:
```
return mix(high, low, step(value, vec3(0.0031308)));
```
For value=0.5: step(0.5,0.0031308) = 0? step(edge=0.5, x=0.0031308) returns 0 since x<edge. mix(high,low,0)=high. Good.
For value=0.001: step(0.001,0.0031308)=1? x>=edge yes 0.0031308>=0.001 -> 1, mix low. Good.

For sRGBToLinear:
```
return mix(high, low, step(value, vec3(0.04045)));
```
value=0.5 -> step(0.5,0.04045)=0 -> high. value=0.02 -> step(0.02,0.04045)=1 -> low. good.

Potential precision: GLSL `pow` of negative? Values clamped? We might clamp color to [0,1] before convert? Input linear may be >1 for white? White sphere material 1 linear. Background linear <=1. No. But after inversion maybe values between [0,1]. Fine. But if HDR? Not.

Need set render target type? EffectComposer default HalfFloat. Good.

Need `composer.addPass(renderPass); composer.addPass(invertPass); composer.addPass(outputPass);` Invert ShaderPass `renderToScreen` default false. outputPass last renderToScreen? OutputPass sets renderToScreen? EffectComposer sets last pass renderToScreen = true? Let's recall EffectComposer.addPass? Actually EffectComposer render:
```
for (let i = 0; i < this.passes.length; i++) {
  const pass = this.passes[i];
  pass.renderToScreen = (i === this.passes.length - 1);
  pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);
  if (pass.needsSwap) { ... }
}
```
So last pass renderToScreen = true. OutputPass last. Good. Invert pass doesn't.

Need set `renderer.outputColorSpace = THREE.SRGBColorSpace;` explicit. Need possibly `renderer.toneMapping = THREE.NoToneMapping;` default. OutputPass might use renderer.toneMapping. Fine.

Need sphere at origin radius 1. Camera (0,0,4) looking at origin. Background color. White sphere.

Need first frame ready. Use animation loop. Need set __ready after first frame. Could use `let first = true;` in loop after composer.render(); if first then (window as any).__ready = true; first=false. Also expose scene camera renderer composer.

Need handle window resize. Update camera aspect, renderer setSize, composer setSize. Need `composer.setSize(window.innerWidth, window.innerHeight)` and perhaps `composer.setPixelRatio(renderer.getPixelRatio())`? EffectComposer has setPixelRatio? It does. On resize, if devicePixelRatio changes? Usually no. Could call setPixelRatio again. Strict. Need set renderer.setPixelRatio? Hard rules size from innerWidth/innerHeight. We can set `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`? They didn't require. But if using pixel ratio, composer setPixelRatio. However "Size renderer from window.innerWidth / window.innerHeight" may mean setSize. With pixel ratio okay? Keep simple: setPixelRatio(1) or device? Use devicePixelRatio maybe but then composer size uses actual CSS size times pixel ratio? EffectComposer setSize sets renderTargets at width*pixelRatio? Need if setPixelRatio. Could avoid pixel ratio complexity: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));` and composer.setPixelRatio(renderer.getPixelRatio()); Then composer.setSize(window.innerWidth, window.innerHeight). It handles. But tests may inspect renderer size? Usually okay. Simpler setPixelRatio(1) maybe. But default renderer.setPixelRatio(1). Not set. Use renderer.setSize(window.innerWidth, window.innerHeight). EffectComposer uses renderer.getPixelRatio? Let's recall EffectComposer constructor:
```
const pixelRatio = renderer.getPixelRatio();
this._width = renderTarget.width? 
this.setSize(width, height)
```
EffectComposer.setSize(width, height) sets `this._width = width; this._height = height; const effectiveWidth = this._pixelRatio * width;` if pixelRatio property. Actually EffectComposer has `this._pixelRatio = renderer.getPixelRatio();` and setSize uses it. Need update if renderer pixel ratio changes. If not set, no issue. We can just:
```
renderer.setSize(window.innerWidth, window.innerHeight);
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
composer.setSize(window.innerWidth, window.innerHeight);
```
If composer initialized after setSize, it uses renderer pixel ratio. Fine. On resize call composer.setSize. Good.

Need maybe set `renderer.setAnimationLoop(animate);` and animate receives time? `setAnimationLoop((time) => { const delta = clock.getDelta(); ... })` Actually signature callback(time, frame). Use `const elapsed = clock.getElapsedTime();` not needed because static.

Motion must use delta/elapsed time, not frame counts. Scene static, but animation loop can use delta for maybe subtle? Requirement says motion must use delta/elapsed. If no motion, okay? They may expect some motion? The scene is static. But maybe need use elapsed for something? We can rotate sphere? But sphere visually uniform; rotation invisible. Could not. The prompt: "Build a post-processing color-inversion effect..." no requirement motion. But hard rule says "Motion must use delta/elapsed time, not frame counts." If no motion, satisfies vacuously. But to be safe, animate slight camera? No, camera at exact (0,0,4). Need not.

Need ensure first frame rendered with composer. Good.

Need think about `OutputPass` import path. In current three, OutputPass exists. Use `three/addons/postprocessing/OutputPass.js`. Type definitions? Strict TypeScript with Three's types includes addons? Usually @types/three or three's types. The import from `three/addons/...` may need declarations. In browser TS? They said compile strict. Modern three package includes types for addons? Three.js npm includes `examples/jsm` with types? Actually `three/addons` alias. TypeScript module resolution might not find declaration for `three/addons/postprocessing/EffectComposer.js`. But common setup with three's types maybe yes? In three r160, package.json exports `./addons/*` with types? I think examples/jsm files have .d.ts? Since r166, addons have types? Let's recall. Three types are in `types/three`, but addons types maybe in `examples/jsm/*.d.ts`? The `three/addons/*` path is mapped to `examples/jsm/*`, and those JS files may have associated .d.ts? Actually three npm package includes `examples/jsm` JS and `examples/jsm` types? I think yes, TS declarations under `examples/jsm`? Hmm. In many TS projects, `import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';` compiles with `@types/three`? @types/three includes `examples/jsm`? The three package itself has types? Since r150, three ships its own types under `src` but addons? I recall `three/examples/jsm/postprocessing/EffectComposer.js` has no types in @types/three? Actually @types/three includes examples/jsm declarations? Maybe yes.

But prompt specifically says use addons from 'three/addons/...'. We follow. Need compile strict. Potential type errors with ShaderPass uniforms object. We need type inference. `const invertPass = new ShaderPass(invertShader);` ShaderPass constructor type `ShaderMaterialParameters` or custom object. Our object has uniforms and vertex/fragment. Should be fine. But TypeScript strict may complain `uniforms` value type? A plain object literal accepted. Need ensure `tDiffuse: { value: null }` value type null? Three types expect `{ value: any }`? `ShaderPass` constructor likely `shader: object`. In @types/three:
```
class ShaderPass extends Pass {
 constructor(shader: object, textureID?: string);
 uniforms: { [uniform: string]: IUniform };
 material: ShaderMaterial;
}
```
`object` accepts. Fine.

Need maybe access ShaderPass uniform? Not necessary.

Need use `THREE.Color` background. `scene.background = new THREE.Color(0x336699);`.

Need sphere geometry: `new THREE.SphereGeometry(1, 32, 16)`, material MeshBasicMaterial. Need maybe material color 0xffffff. MeshBasicMaterial color set via constructor `{color: 0xffffff}`. Good.

Need renderer append canvas. `const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(...); document.body.appendChild(renderer.domElement);` Maybe set `renderer.outputColorSpace = THREE.SRGBColorSpace;` if not default. Need set canvas style? Not required. The page has no other HTML; body may have margin default. Could set `renderer.domElement.style.display = 'block';` maybe. But strict. Not necessary.

Need maybe set scene background to color. Color gets converted internally. Good.

Need consider if `EffectComposer` uses `renderer.outputColorSpace`? When RenderPass renders, it calls `renderer.render(scene, camera)` while renderer target set to composer's write buffer. WebGLRenderer will use outputColorSpace? Need verify no double conversion. If render target's texture.colorSpace is NoColorSpace, renderer should output linear. If render target texture colorSpace is SRGBColorSpace inadvertently, RenderPass would convert linear->sRGB into target. Then our shader expects linear and would be wrong. Need ensure EffectComposer render target colorSpace. Let's recall `EffectComposer` constructor in recent three:
```
const renderTarget = new THREE.WebGLRenderTarget(
  this._width * this._pixelRatio,
  this._height * this._pixelRatio,
  { type: THREE.HalfFloatType }
);
this.renderTarget1 = renderTarget;
this.renderTarget2 = renderTarget.clone();
```
No colorSpace set. WebGLRenderTarget default texture colorSpace = NoColorSpace. So RenderPass output linear. Good.

OutputPass shader: Let's inspect from memory:
```
const outputPassVertexShader = `
varying vec2 vUv;
void main() {
 vUv = uv;
 gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const outputPassFragmentShader = `
uniform sampler2D tDiffuse;
uniform float toneMappingExposure;
uniform int toneMapping;
uniform int outputColorSpace;
varying vec2 vUv;
...
void main() {
 vec4 texel = texture2D(tDiffuse, vUv);
 texel.rgb = toneMapping(texel.rgb);
 texel = outputColorSpace(texel);
 gl_FragColor = texel;
}
`;
```
OutputPass constructor maybe:
```
this.uniforms = {
 tDiffuse: { value: null },
 toneMappingExposure: { value: renderer.toneMappingExposure },
 toneMapping: { value: renderer.toneMapping },
 outputColorSpace: { value: renderer.outputColorSpace }
}
```
Actually no renderer in constructor? It uses `THREE.NoToneMapping`, `SRGBColorSpace`? Let's not.

Need ensure final screen exact inverse. OutputPass uses LinearTosRGB with outputColorSpace = renderer.outputColorSpace = SRGBColorSpace. Good.

Potential issue: Color inversion in sRGB but what about alpha? Final background and sphere opaque. Alpha not relevant. If transparent areas? no. We invert rgb only.

Need maybe use `gl_FragColor = vec4(color.rgb, color.a);`. We can set color.rgb and gl_FragColor = color.

Need `precision`? no.

Need define `linearToSRGB` and `sRGBToLinear` with `mix` and `step`; ensure no type errors in GLSL? No.

Need maybe use `texture2D` valid WebGL1. Three uses `texture2D`. Good.

Need note in GLSL `step(value, vec3(0.0031308))` returns `vec3`, mix with `vec3 high`, `vec3 low`, `vec3` a. Good.

Need consider if input has values slightly >1 due to HalfFloat? White sphere linear 1. `linearToSRGB(1)`: high = 1.055*1 - 0.055 =1; low ignored. invert 0. `sRGBToLinear(0)`: high pow((0.055)/1.055,2.4) ~0.003? Wait sRGBToLinear for value 0 should be 0. But our `mix(high, low, step(value, vec3(0.04045)))` with value=0: step(0,0.04045)=1 -> low = 0/12.92=0. Good. For value=1: step(1,0.04045)=0 -> high = ((1+0.055)/1.055)^2.4 =1. Good.

Need maybe clamp negative? if value less 0? Inversion of sRGB [0,1] gives [0,1], no. Input linear maybe from background. Fine.

Need perhaps place OutputPass before custom pass? But custom has conversion so correct. Good.

Let's think about exact hex. Three's color conversion of 0x336699 to linear: It uses `SRGBToLinear` (not our shader) with threshold. Our shader's LinearToSRGB is inverse exactly. OutputPass's LinearToSRGB same, so final sRGB = inverse. Need ensure rounding yields exact 0xcc9966. For background sRGB components (0.2,0.4,0.6). Invert (0.8,0.6,0.4). Converting to linear and back should produce same within floating. HalfFloat intermediate maybe enough (10-bit mantissa) could cause tiny error ~0.001? Screen quantizes 8-bit. Likely exact. HalfFloat has 10 bits mantissa, at sRGB values, linear conversions and inverse could change by <1/255? Let's estimate. HalfFloat precision ~0.0005 at 1. linear for 0.8 = 0.6038; half float step ~0.0005. Convert back to sRGB derivative maybe 1/2.2 * p^-1.2, at p=0.6 ~0.5? Error 0.00025. less than 1/255. Fine. But maybe could round to adjacent? 0.8 exactly not possible? Screen quantizes 0.8*255=204.0. Tiny error okay. OutputPass to screen. Good.

Need maybe set composer render target type not HalfFloat? Default HalfFloat. Fine.

Need use delta/elapsed time. The loop:
```
const clock = new THREE.Clock();
function animate(): void {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime; // not used
  composer.render(delta);
  if (!ready) { ready = true; (window as any).__ready = true; }
}
renderer.setAnimationLoop(animate);
```
`composer.render(delta)` accepts deltaTime? EffectComposer render(deltaTime?). It can accept. We can pass delta. Good. Need avoid unused variables with noUnusedLocals? Strict `tsc --strict` includes noUnusedLocals? Strict does not include noUnusedLocals by default. It includes noImplicitAny, strictNullChecks, etc. But if noUnusedLocals enabled? They said `tsc --strict`, noUnusedLocals not part. But we can avoid unused. `const delta = clock.getDelta();` used in composer.render(delta). No elapsed. "Motion must use delta/elapsed" we use delta. Good.

Maybe make sphere rotate using delta? Not needed. But if we want motion, rotate sphere by delta; sphere uniform so invisible. Could add a second? No, requirement one sphere. Don't.

Need first frame rendered: Set __ready true after first composer.render. Good.

Need maybe tests call __ready right after script? Animation loop asynchronous. Fine.

Need append canvas. renderer.domElement appended to document.body. Good.

Need maybe ensure `document.body` exists; script runs after body. Browser. Fine.

Need maybe set `camera.lookAt(0,0,0)`. `PerspectiveCamera(45, aspect, 0.1, 100); camera.position.set(0,0,4); camera.lookAt(0,0,0);`.

Need sphere at origin. If radius 1 and camera z=4, visible. MeshBasic white. Background visible. Good.

Need if antialias true? okay.

Need maybe set `renderer.setClearColor`? Background uses scene background. no.

Need handle resize:
```
function onWindowResize(): void {
 const width = window.innerWidth;
 const height = window.innerHeight;
 camera.aspect = width / height;
 camera.updateProjectionMatrix();
 renderer.setSize(width, height);
 composer.setSize(width, height);
}
window.addEventListener('resize', onWindowResize);
```
At init maybe call? We already set. Need set composer after renderer. Fine. On resize, if pixel ratio, composer's _pixelRatio remains initial. If devicePixelRatio unchanged, okay. If renderer pixel ratio default 1. We didn't set. Fine.

Need include `THREE.SRGBColorSpace` for renderer.outputColorSpace. In strict, `renderer.outputColorSpace = THREE.SRGBColorSpace;` property exists. Good.

Potential issue: `THREE.Color` constructor with 0x336699 and `scene.background` typed `Color | Texture | null`. assigned. Good.

Potential issue: `ShaderPass` material uniforms. Good.

Potential issue: The custom shader's `step` usage with vector edge and scalar? We use vector.

Need maybe use `pow` on `value` for negative? no.

Let's craft final code. Need single code block nothing else. Ensure no extra text.

But let's think deeper about Three's ShaderPass and OutputPass order. EffectComposer automatically sets last pass renderToScreen true. OutputPass is last, so renderToScreen true. It will render to screen. Does OutputPass's own shader apply output color space? yes. Our custom pass writes to render target. Good.

However, could the RenderPass render to target with sRGB conversion because `renderer.outputColorSpace` is SRGB? Need check. If it did, our shader conversion would be wrong. Let's find actual behavior. I recall in three r152, when rendering to a WebGLRenderTarget, the output color space used is the render target texture's colorSpace. Default `NoColorSpace`. So linear. The renderer's `outputColorSpace` only when `currentRenderTarget === null`. In WebGLRenderer:
```
const currentRenderTarget = this.getRenderTarget();
const currentOutputColorSpace = currentRenderTarget === null ? this.outputColorSpace : currentRenderTarget.texture.colorSpace;
```
Maybe yes. If renderTarget texture.colorSpace NoColorSpace, then program's output color space is LinearSRGBColorSpace? `NoColorSpace` means no conversion? Let's recall ColorManagement.getTransfer(NoColorSpace) returns `LinearTransfer`? Hmm. In WebGLPrograms, if `outputColorSpace === NoColorSpace`, then no encoding? For render targets, output may be linear but no conversion. Either way linear. Good.

What about EffectComposer's renderTarget2 clone? `renderTarget2 = renderTarget1.clone()`; texture colorSpace same. Good.

Potential issue: OutputPass in recent three uses `renderer.outputColorSpace` at construction. If we set renderer.outputColorSpace before OutputPass constructor, okay. We'll order: renderer created, set outputColorSpace, composer created, passes created including OutputPass. Good.

Need maybe OutputPass takes renderer? Let’s recall constructor `new OutputPass()` no args. It reads? Actually I think it doesn't read renderer.outputColorSpace at construction; it imports `SRGBColorSpace`? Let's see. In three examples:
```
const outputPass = new OutputPass();
composer.addPass(outputPass);
```
OutputPass uses defaults from `WebGLRenderer`? It has uniforms:
```
toneMapping: { value: NoToneMapping },
toneMappingExposure: { value: 1 },
outputColorSpace: { value: SRGBColorSpace }
```
Maybe constructor sets `this.uniforms.toneMapping.value = renderer.toneMapping`? Hmm. In examples, OutputPass is used with renderer and works. It likely defaults to SRGBColorSpace. Fine. If renderer.outputColorSpace set, no issue. But if OutputPass defaults to SRGBColorSpace, good.

Need perhaps OutputPass shader expects input linear and output `SRGBColorSpace`. Good.

Need ensure our custom shader doesn't get affected by OutputPass tone mapping. No tone mapping.

Need final answer. But before final, let's consider if there are any TypeScript compile issues with `window as any`. Fine.

Need maybe declare `const invertShader = { ... };` TypeScript infers `uniforms.tDiffuse.value` as null. ShaderPass constructor expects `object`. Good.

Potential issue: `new ShaderPass(invertShader);` The type of `invertShader` has `uniforms: { tDiffuse: { value: null; }; }`, `vertexShader: string`, `fragmentShader: string`. If @types/three `ShaderPass` constructor `shader: object` accepts. Good.

Potential issue: `composer.render(delta);` EffectComposer.render(deltaTime?: number): void. Good.

Potential issue: `renderer.setAnimationLoop(animate);` callback type expects `(time: number, frame?: XRFrame) => void`? In types, `setAnimationLoop(callback: null | ((time: number) => void))` maybe. Our `animate(): void` accepts no args, assignable? A function with fewer params is assignable. Good.

Potential issue: `const clock = new THREE.Clock();` `clock.getDelta()` returns number. Good.

Need maybe include `renderer.domElement.style.width = '100%'`? no.

Need maybe `renderer.setSize(window.innerWidth, window.innerHeight);` before append. Good.

Let's maybe include `renderer.outputColorSpace = THREE.SRGBColorSpace;` and `renderer.toneMapping = THREE.NoToneMapping;` to ensure. Good.

Need maybe set `composer.setPixelRatio(renderer.getPixelRatio());`? EffectComposer has method setPixelRatio. In TS types yes. But not necessary. Could call to align. However, if we set renderer pixel ratio to default (1), no issue. If devicePixelRatio > 1 but renderer default 1? Default pixel ratio is 1? Actually WebGLRenderer default pixelRatio = 1? I think yes. `setPixelRatio` not called. So composer pixelRatio = renderer.getPixelRatio() = 1. Fine. On resize, no pixel ratio change. Good.

Need maybe call `onWindowResize()` at end? We already set. But if initial width/height and renderer set size same. No.

Let's write code.

Wait: The prompt says "Use EffectComposer ... with a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass." They might expect ShaderPass's shader literally does `rgb -> 1.0 - rgb` in linear? But requirement exact inverse demands convert. We'll include.

Need maybe use `vec3 inverted = 1.0 - srgb;` exact.

Need maybe use `tDiffuse` sampler. Good.

Let's final.