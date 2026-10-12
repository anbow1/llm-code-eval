The key: with OutputPass doing linear->sRGB, the inversion must happen in linear space before sRGB conversion. Background 0x336699 set as scene.background is interpreted as sRGB color, converted to linear internally (color management on). Render pass renders in linear. ShaderPass inverts linear values. OutputPass converts linear->sRGB. Result: sRGB(1 - linear(c)) which is NOT the same as 1 - sRGB(c) in general. For exact inverse on screen: 0xcc9966 for background.

Let's compute: 0x33 = 51/255 = 0.2 sRGB -> linear = ((0.2+0.055)/1.055)^2.4 ≈ (0.24171)^2.4. ln(0.24171)≈-1.4200; ×2.4 = -3.408; e^-3.408 ≈ 0.03310. 1 - 0.0331 = 0.9669 -> sRGB = 1.055*0.9669^(1/2.4) - 0.055. 0.9669^(0.41667): ln= -0.03362*0.41667 = -0.014009, exp ≈ 0.98609. 1.055*0.98609-0.055 = 1.04032-0.055 = 0.98532 → 251/255 ≈ 0xFB, not 0xCC.

So inverting in linear does NOT give exact inverse of sRGB. To get exact inverse: invert after sRGB conversion. Options: do linear->sRGB conversion inside shader pass, then invert, and skip OutputPass? But requirement says use OutputPass. Alternatively: put inversion shader AFTER OutputPass. Then OutputPass converts to sRGB, shader inverts sRGB values, but the render target is linear (composer targets default to linear unless...). Actually the final pass renders to screen; if the pass is after OutputPass, its output is written directly to canvas. The renderer's output color space handling: when rendering to screen via composer, the final pass output — EffectComposer's final pass renders to null (screen). With WebGLRenderer outputColorSpace = SRGBColorSpace, does the renderer apply conversion on the final pass render? ShaderPass material output — renderer would apply output color space conversion only if the material's shader includes colorspace_fragment... Actually ShaderPass materials are ShaderMaterials; the renderer's output color space encoding happens in the shader via #include <colorspace_fragment>. ShaderMaterial without that include won't convert. But wait — three.js r152+ colorspace_fragment chunk is included in built-in materials; ShaderMaterial users write their own fragment shader, so no automatic conversion. So pass after OutputPass: input is sRGB-encoded values (as stored in buffer... wait OutputPass renders to screen or buffer?).

Composer: RenderPass -> ShaderPass(invert) -> OutputPass -> ShaderPass(invert again)? Hmm.

Simpler approach: order RenderPass -> ShaderPass -> OutputPass, but in the ShaderPass shader convert linear->sRGB first, then invert. Then OutputPass would... OutputPass does tone mapping + linear->sRGB conversion. If we've already converted to sRGB in our shader, OutputPass converting again would double-convert. Unless we disable conversion in OutputPass. OutputPass uses renderer.toneMapping and outputColorSpace. Hmm.

Alternative: use OutputPass but make our invert shader do the sRGB conversion and then set renderer outputColorSpace... Actually OutputPass's fragment shader includes colorspace_fragment which converts from linear working space to renderer.outputColorSpace. If renderer.outputColorSpace is SRGBColorSpace, it converts linear->sRGB. If we already did that conversion in our invert pass, the buffer content is sRGB-encoded but treated as linear → double conversion.

Better approach: put invert pass AFTER OutputPass. Composer: RenderPass -> OutputPass -> ShaderPass(invert). Then OutputPass converts linear->sRGB and writes to a render target (since it's not last). Then invert pass reads sRGB values, inverts, renders to screen. Final pass renders to null target — will renderer apply any conversion? The ShaderPass material doesn't include colorspace_fragment, and rendering to screen with ShaderMaterial: the renderer does NOT auto-convert; conversion is shader-based (outputColorSpace affects only materials that include the chunk... actually in newer three versions, when rendering to canvas, three sets the appropriate encoding via shader chunks; ShaderMaterial without include outputs raw values). So values written to canvas are raw = exact sRGB inverse. 

But wait: does the invert pass reading sRGB-encoded values from buffer treat them correctly? We just read raw values, invert, output raw. Canvas displays raw sRGB values. 

Check: background linear value: Color(0x336699) with color management: setHex converts sRGB->linear working space. RenderPass writes linear. OutputPass converts linear->sRGB → back to 0x336699 values (0.2, 0.4, 0.6). Invert pass: 1-0.2=0.8=204=0xCC, 1-0.4=0.6=0x99, 1-0.6=0.4=0x66 → 0xCC9966. ✓ White sphere → black ✓.

But there's a subtlety: RenderPass renders into composer's render target. Composer render targets: default type is HalfFloatType (r15x). Working color space is linear. Fine. OutputPass reads linear, converts to sRGB, writes to next target. Values stored: since target is HalfFloat, sRGB values stored raw (no encoding applied when writing to non-screen targets in three — writing to render targets doesn't apply output color space conversion; colorspace_fragment only converts when rendering to screen? Actually colorspace_fragment converts based on the current render target's texture colorSpace... In three r15x+, the conversion happens in shader: when rendering to a render target whose texture colorSpace is SRGB, it converts. Composer's internal targets are LinearSRGB, so colorspace_fragment does nothing... Hmm wait, then how does OutputPass convert?

OutputPass shader explicitly does: it applies tone mapping and then linear->sRGB conversion? Let me recall OutputPass implementation: it has uniforms toneMappingExposure, and its fragment shader:

```
gl_FragColor = vColor... 
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

colorspace_fragment chunk: `gl_FragColor = linearToOutputTexel( gl_FragColor );` which converts to the output color space of the current render target. When rendering to screen, outputColorSpace of renderer. When rendering to composer target with LinearSRGB texture, linearToOutputTexel is identity? Hmm, actually the getTexelEncodingFunction... The chunk converts from working (linear) color space to the color space of the render target being written. If OutputPass writes to a LinearSRGB target, conversion would be identity — then final pass to screen with no conversion... that would fail.

Hmm. But actually there's the "renderToScreen" mechanism: the last pass in composer renders to screen. If OutputPass is not last, it writes to buffer.

Let me think about how three.js handles this. In colorspace_fragment: `gl_FragColor = linearToOutputTexel( gl_FragColor );`. linearToOutputTexel is generated per renderer based on renderer.outputColorSpace? Or per render target? In WebGLProgram, the output color space encoding is determined by: if rendering to a render target, use target texture colorSpace; else renderer.outputColorSpace. So when OutputPass writes to composer buffer (LinearSRGB texture), conversion is identity! Then our invert pass writes to screen: ShaderMaterial has no conversion chunk, but when rendering to screen... the program is compiled with the output encoding for materials... ShaderMaterial doesn't include the chunk so nothing happens.

Hmm, that breaks it. Wait — but does three r15x treat things differently? Actually, I recall: WebGLRenderer outputColorSpace applies "when rendering to the default framebuffer (canvas)". For render targets, the texture's colorSpace property determines. Composer's RenderTarget textures: EffectComposer creates targets with... In recent three, EffectComposer's renderTarget defaults: `{ type: HalfFloatType }`, colorSpace default for render targets is NoColorSpace/LinearSRGB — treated as linear working space, no conversion on write.

So the pipeline: RenderPass writes linear (no conversion, correct). OutputPass to buffer: colorspace_fragment → identity (target linear). Hmm, then no conversion happens at OutputPass-to-buffer. Then invert pass to screen: no conversion in ShaderMaterial. Result: linear values inverted directly → wrong result.

Hmm wait, actually is that true? Let me reconsider. Actually I think colorspace_fragment's linearToOutputTexel is based on renderer.outputColorSpace regardless, OR based on currentRenderTarget. Let me recall WebGLRenderer: `getTexelEncodingFunction`... In WebGLPrograms.getParameters: 

```
const currentRenderTarget = renderer.getRenderTarget();
...
outputColorSpace: currentRenderTarget === null ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : ColorManagement.workingColorSpace ),
```

Hmm, I recall something like: when rendering to a render target, output color space is the target's texture colorSpace (or working space). So writing to linear target → no conversion. Yes, that's the r152+ behavior: "Renderer no longer applies color space conversion when rendering to render targets unless the target texture colorSpace is set".

So the chain RenderPass → OutputPass → invert(screen) would give: OutputPass no-op conversion (linear stays linear into buffer), invert pass inverts linear and writes raw to canvas → screen shows linear values interpreted as sRGB → wrong.

Unless... EffectComposer's readBuffer for the last pass: hmm.

Alternative known-good solution: keep order RenderPass → ShaderPass(invert, with sRGB conversion in shader) → OutputPass, and... but OutputPass conversion to buffer identity then final... no, OutputPass is last, renders to screen: conversion linear→sRGB applied. But our buffer already had sRGB applied in shader... then double conversion.

Hmm. Let's think again: what does OutputPass do exactly when it's the last pass rendering to screen? Its fragment includes tonemapping_fragment and colorspace_fragment; rendering to screen, outputColorSpace = SRGB → converts linear→sRGB. Good.

So: if our invert shader converts linear→sRGB itself and inverts, then OutputPass converting again would double-convert. To avoid, we could set renderer.outputColorSpace... but OutputPass reads renderer's state each render? OutputPass render(): it sets uniform and defines based on `this._outputColorSpace = renderer.outputColorSpace` — yes it tracks renderer outputColorSpace. If we set renderer.outputColorSpace = LinearSRGBColorSpace, OutputPass would output linear values to screen → screen canvas treats raw values... but then when we manually converted to sRGB in shader, output raw sRGB → correct! But changing renderer.outputColorSpace to Linear is hacky but valid: "the final colors ON SCREEN must be exact inverse". Hmm, but is setting outputColorSpace = LinearSRGB acceptable? It's a legitimate technique.

Alternatively simplest robust approach: do the conversion in the invert shader, and have invert pass be the LAST pass (after OutputPass), i.e., order: RenderPass → OutputPass → ShaderPass. But as analyzed, OutputPass to linear buffer does no conversion... Hmm wait — actually is that right? Let me double-check OutputPass behavior in buffer.

Hmm, actually wait. Let me reconsider: maybe three.js still applies output color space conversion when rendering to screen only, and render targets keep working space. Then in the ordering RenderPass → OutputPass → ShaderPass, OutputPass writes sRGB? No — writes linear (identity conversion because target is linear).

Hmm, but there's a well-known trick: set the final render target's texture colorSpace to SRGBColorSpace. Actually, alternative: in the invert ShaderPass shader, do the linear→sRGB conversion manually before inverting, and place it AFTER OutputPass. Then OutputPass → buffer (linear, identity conversion... no wait, then buffer has linear values; our shader converts linear→sRGB then inverts → correct!). Wait no — OutputPass writes to buffer with identity conversion (since buffer is linear), so buffer contains linear values. Our invert shader reads linear, converts to sRGB manually, inverts, writes raw to screen. Screen shows sRGB inverse. ✓

But then OutputPass's tonemapping/colorspace did essentially nothing except tone mapping (NoToneMapping default → identity). So OutputPass is a no-op pass — but requirement says include it. Fine.

Actually simpler and cleaner: place invert pass after OutputPass, shader: `gl_FragColor = vec3(1.0) - linearToSRGB(tDiffuse.rgb)`. Where linearToSRGB is manual math. But wait — when the invert pass renders to screen, does three apply any conversion to ShaderMaterial output? ShaderMaterial fragment shader we write fully; no colorspace_fragment include unless we add it. But three injects defines... no, output happens only via the chunk. However! WebGLPrograms determines outputColorSpace for programs and... for ShaderMaterial, the shader is user-provided; conversion chunk absent → raw output. Yes raw.

Hmm, but actually there might be subtlety: when rendering the final pass to screen, three sets `_currentRenderTarget = null`, and the material's program outputColorSpace = renderer.outputColorSpace = SRGB. That only matters if shader includes colorspace_fragment. We won't include it. Raw output. 

Also alternative: include colorspace_fragment? No — that would convert linear→sRGB; if we already did conversion manually, double. Keep raw.

Wait, but there's another consideration: reading tDiffuse — the buffer texture colorSpace is linear, no decode. Values are linear working space values. Good.

So plan:
- scene.background = new THREE.Color(0x336699) (converted to linear working space automatically via ColorManagement).
- sphere MeshBasicMaterial white.
- Composer with RenderPass, OutputPass, ShaderPass(invert with manual sRGB conversion).
- Actually order: composer.addPass(renderPass); composer.addPass(outputPass); composer.addPass(invertPass). The last pass renders to screen (composer sets renderToScreen on last added? EffectComposer: in render(), the last enabled pass renders to screen if this.renderToScreen... Actually EffectComposer sets `pass.renderToScreen` manually by user? No — EffectComposer.render iterates and `if (i === passes.length - 1 && this.renderToScreen)` hmm. Let me recall: EffectComposer has property renderToScreen = true? In three's EffectComposer, `render(renderer, deltaTime)`: it iterates passes; `pass.renderToScreen` is determined by... Actually in newer versions, EffectComposer automatically renders the last pass to screen: `const renderToScreen = ( i === il - 1 ) && this.renderToScreen;` Hmm. Let me recall the source:

```js
render( deltaTime ) {
  ...
  const il = this.passes.length;
  for ( let i = 0; i < il; i ++ ) {
    const pass = this.passes[ i ];
    if ( pass.enabled === false ) continue;
    pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
    pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );
    ...
  }
}
```

Yes, EffectComposer automatically sets renderToScreen for the last enabled pass (renderToScreen defaults true). Good.

- Composer render targets: default HalfFloatType. Values linear, precision fine.

Invert shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, pow(c, vec3(1.0/2.4)) * 1.055 - 0.055, step(0.0031308, c));
  // careful: mix with vec step
}
void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  color = clamp(color, 0.0, 1.0); // avoid negative pow issues
  vec3 srgb = mix(vec3(12.92) * color, 1.055 * pow(max(color, vec3(0.0)), vec3(1.0/2.4)) - 0.055, vec3(greaterThanEqual(color, vec3(0.0031308))));
  gl_FragColor = vec4(1.0 - srgb, 1.0);
}
```

Hmm — but wait: does three r15x ShaderPass's shader get processed? ShaderPass creates ShaderMaterial with the given shader. The material with GLSL1 default? ShaderMaterial default glslVersion null → GLSL1 (ES2 style) with three's preprocessor. texture2D works. Fine.

Alternatively, simpler: could set renderer.outputColorSpace normally, put invert pass between RenderPass and OutputPass, but invert must operate on sRGB. Since buffer is linear, we need sRGB conversion — we could do sRGB conversion in shader, invert, then OutputPass would re-convert linear→sRGB (double). Unless we make OutputPass's conversion no-op... can't easily.

The after-OutputPass approach with manual conversion is clean. But hmm, is there an even cleaner recognized solution? Another approach: keep order RenderPass → ShaderPass → OutputPass and in the ShaderPass do: convert linear→sRGB, invert, then convert sRGB→linear back (so OutputPass re-converts to sRGB). Net: screen shows 1 - sRGB(linear(c)). Equivalent mathematically. That works too and keeps OutputPass meaningful. But it's convoluted. The after-OutputPass approach is cleaner.

Hmm, wait, but one issue with after-OutputPass approach: OutputPass applies tone mapping based on renderer.toneMapping — default NoToneMapping, fine. And OutputPass conversion to linear buffer: identity. So OutputPass effectively copies. Fine.

Actually, wait — maybe I should double check the identity claim. WebGLPrograms.getParameters (r160-ish):

```js
const currentRenderTarget = renderer.getRenderTarget();
const outputColorSpace = currentRenderTarget === null ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : ColorManagement.workingColorSpace );
```

Yes — render targets that are not XR get workingColorSpace (linear), so colorspace_fragment is identity. Confirmed.

And for the final ShaderPass to screen: its ShaderMaterial program gets outputColorSpace = SRGB parameter, but since our fragment shader doesn't include colorspace_fragment, no conversion. Correct raw sRGB values hit the canvas. 

One more check: the composer read/write buffers — ShaderPass reads tDiffuse from readBuffer texture (linear HalfFloat). Good.

Precision: HalfFloat linear values like 0.0331 stored fine. Manual conversion gives ~0.2 → 1-0.2 = 0.8 → 0xCC. But floating point: linear value of 0x33: exact computation: ((51/255 + 0.055)/1.055)^2.4. Then our shader's pow-based conversion may give 0.1999999 or 0.2000001; times 255 = 51.0000x → rounds to 51 or could give 50.99 → 50 (0xCC needs 204 for 0.8). 1 - 0.2000001 = 0.7999999 → *255 = 203.99997 → floor gives 203? Canvas/quantization: GPU writes 0.7999999 to 8-bit framebuffer → rounds to nearest → 204. Rounding should be nearest, giving 204 = 0xCC. Typically fine. To be safer, I could instead avoid manual conversion by... hmm.

Alternative more robust: don't rely on manual linearToSRGB matching; instead read the buffer... Actually, there's a neat trick: put the invert pass after OutputPass but instead of converting manually, we can rely on three's SRGB decode: no.

Another approach entirely: set composer's final... Actually another clean approach: make the invert shader operate in sRGB by having RenderPass output already... no.

Alternatively: use the ordering RenderPass → ShaderPass(invert linear) → OutputPass, but ALSO the requirement is exact inverse — linear inversion doesn't give exact sRGB inverse. So we must invert in sRGB space. Our approach is correct.

To maximize numeric accuracy, I could use the same formula three uses: ColorManagement's SRGBToLinear / its inverse:

three's linearToSRGB:
```js
function SRGBToLinear... 
LinearToSRGB: v <= 0.0031308 ? v * 12.92 : 1.055 * pow(v, 1/2.4) - 0.055
```
Same as mine. And the linear value comes from sRGBToLinear(0.2) = pow((0.2+0.055)/1.055, 2.4). Round-trip through float32 and half-float buffers might introduce tiny error but rounding to 8-bit should be fine. HalfFloat has ~11 bits mantissa — for value near 0.2, error ~1e-4? HalfFloat precision: relative 2^-11 ≈ 0.00049. 0.2 * 0.0005 = 0.0001 absolute error near 0.2; near the threshold crossing at 0.19999999... hmm, the danger is if srgb value computed as 0.19995 → 1-0.19995 = 0.80005 → *255 = 204.01 → rounds to 204. Fine. If srgb computed as 0.2001 → 0.7999*255 = 203.97 → rounds 204. OK — nearest rounding absorbs errors up to ~0.002 in the 0-1 range. Half precision error near 0.8: 0.8*0.00049 = 0.0004. Fine. Also the write to screen framebuffer is HalfFloat→ no, final pass writes to canvas directly (8-bit UNLESS canvas... default canvas is 8-bit). Rounding nearest. Should be safe.

Actually hmm, also: does three convert when reading? tDiffuse texture colorSpace linear → no decode.

Edge: scene.background — RenderPass clears with background color. Background color: scene.background Color is rendered via clear using color in linear? WebGLBackground: `setClear` clears with the color converted appropriately: it uses `_clearColor` and when clearing to a render target with linear space, clears with linear values. Background Color(0x336699): setHex with SRGBColorSpace converts to working (linear). Then clear writes linear values into buffer. Then OutputPass → buffer linear identity. Then invert: linear→sRGB gives back 0x33/0x66/0x99 values, invert → 0xCC/0x99/0x66. ✓ Sphere white: linear 1 → sRGB 1 → 0. ✓

Now write the file. Include resize handling: camera.aspect, renderer.setSize, composer.setSize.

Animation loop: use composer.render() — but delta time requirement: "Motion must use delta/elapsed time". There's no motion strictly needed but maybe rotate sphere slightly using clock delta to satisfy. Requirement says composer.render() in loop. I'll add gentle rotation of the sphere using delta (sphere is basic material white; rotation invisible but fine—maybe scale pulse? Keep rotation of a wireframe? Keep simple: rotate sphere; harmless). Actually to show motion maybe not needed. I'll rotate the sphere using delta.

Expose __scene, __camera, __renderer, __composer. __ready after first frame.

TS strict: ShaderPass constructor accepts shader object of type object; fine. Types for uniforms: `{ tDiffuse: { value: null as THREE.Texture | null }, ... }` — ShaderPass shader param type: `ShaderPass(shader: object, textureID?: string)`. It's typed loosely, ok.

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

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const InvertShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `...`,
  fragmentShader: `...`
};
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);
```

Fragment shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 v) {
  vec3 lo = v * 12.92;
  vec3 hi = 1.055 * pow(max(v, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), v));
}

void main() {
  vec3 color = clamp(texture2D(tDiffuse, vUv).rgb, 0.0, 1.0);
  gl_FragColor = vec4(1.0 - linearToSRGB(color), 1.0);
}
```

Wait — ShaderPass's vertex shader is provided in the default copy; we define our own with vUv.

Note ShaderPass clones uniforms; fine.

Loop:

```ts
const clock = new THREE.Clock();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  sphere.rotation.y = elapsed * 0.4; // motion uses time
  composer.render(delta);
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

Hmm — set __ready after first frame rendered; composer.render is sync so setting after call is fine.

Resize:

```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
```

Note: composer.setSize handles pixel ratio? EffectComposer.setSize(width, height) multiplies by renderer pixel ratio internally: `const effectiveWidth = this.renderer.getPixelRatio() * width`? Actually EffectComposer.setSize does `this.renderTarget1.setSize(width, height)` after applying pixelRatio: yes it uses `this._pixelRatio`. Fine, pass CSS size.

Exports:

```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

TS strict details: ShaderPass constructor param type in three's typings: `constructor(shader: object, textureID?: string)` — In recent @types/three / three's own types: `ShaderPass(shader?: object, textureID?: string)`. Our shader object with uniforms containing `{ value: null }` — fine as object. Maybe need uniforms typed: `{ tDiffuse: { value: null as unknown } }`. Plain object literal works with `object` type param? Yes, any object literal assignable to `object`.

Sphere rotation: MeshBasicMaterial white — rotation invisible; maybe add slight movement via position? Requirement says "Motion must use delta/elapsed time, not frame counts" — I'll do rotation with elapsed time and it's fine even if visually subtle. Could scale pulse: sphere.scale... keep rotation only, or move sphere slightly. I'll do rotation + a gentle bob using elapsed. Fine.

Comment explaining ordering rationale. Also comment on renderer.outputColorSpace left as default sRGB — final ShaderPass outputs raw values (no colorspace_fragment), so no double conversion.

One concern: OutputPass in three versions — exists since r152ish. Assume fine.

Also body margin: set document.body.style.margin = '0' maybe. Fine.

Write final answer.