We need to build EffectComposer with RenderPass, custom inversion ShaderPass, OutputPass. Critical: color space correctness.

Setup: renderer.outputColorSpace = SRGBColorSpace by default in newer three. EffectComposer's render targets: by default, in recent three versions, EffectComposer creates a render target with HalfFloatType and... Let's think.

In three r152+, EffectComposer constructor: if renderTarget not provided, it creates a new WebGLRenderTarget with type HalfFloatType (when using WebGL2), and colorSpace default... Actually it uses:

```js
const size = renderer.getDrawingBufferSize(new Vector2());
const renderTarget = new WebGLRenderTarget(size.width, size.height, { type: HalfFloatType });
```

RenderTarget default colorSpace is NoColorSpace, and it defaults... hmm. Then EffectComposer's passes: RenderPass renders the scene to the render target. Since render target colorSpace is not sRGB... Actually WebGLRenderer when rendering to a render target with colorSpace = NoColorSpace (linear), the output is linear-sRGB values (no encoding applied) — well, the renderer applies output color space conversion only for the canvas? Let me recall: In three.js, `renderer.outputColorSpace` applies when rendering to the canvas (default framebuffer). When rendering to a render target, the encoding used is the render target's colorSpace via `getRenderTargetColorSpace`... Actually in WebGLRenderer, `_currentRenderTarget` and the output color space for the shader's output: `getActiveCubeFace`... Let me recall the code in `WebGLPrograms`: `outputColorSpace: currentRenderTarget === null ? renderer.outputColorSpace : (currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace)`.

Hmm, there was a change. In r15x, `getEncodingParameters`... Let's recall roughly for r160+:

```js
const currentRenderTarget = renderer.getRenderTarget();
...
outputColorSpace: ( currentRenderTarget === null ) ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace ),
```

Hmm, I think in some versions they use `renderTarget.texture.colorSpace`. Actually I recall a commit "Ensure render targets use texture.colorSpace". Let me just think about what's safe and robust.

Also OutputPass: it applies tone mapping and sRGB encoding (via `LinearTosRGB` maybe as a define, and it renders to the canvas... well it renders to the next target which is null at the end? No — the OutputPass is the last pass; when composer renders the last pass it does renderer.setRenderTarget(null)?? Actually ShaderPass.render: if renderToScreen, renderer.setRenderTarget(null). Yes, EffectComposer sets `renderToScreen` for the last pass. So OutputPass writes to the canvas applying output color space conversion.

Hmm, OutputPass's shader:
```glsl
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
...
gl_FragColor = texture2D(tDiffuse, vUv);
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
It uses `#include <colorspace_fragment>` which converts linear-sRGB to output color space. So the value from the composer buffer (linear) is converted to sRGB on output. Good.

So the chain: RenderPass renders scene in linear-sRGB into HalfFloat render target (linear, no encoding). Wait — but if renderer renders to a render target whose texture colorSpace is LinearSRGBColorSpace, no conversion; the output values are linear. Good.

Then inversion pass: rgb -> 1 - rgb. If done in linear space, the result is NOT the exact inverse of the screen sRGB colors. Screen sRGB value s = linearToSRGB(l). We want the screen final value to be 1 - s. If we invert in linear then convert: final = linearToSRGB(1 - l). We want linearToSRGB(?) = 1 - s = 1 - linearToSRGB(l). So need final = 1 - s, which means we must invert after sRGB conversion.

So the solution: do the inversion in sRGB space. Options: (a) the inversion pass reads linear, converts to sRGB, inverts, then converts back to linear so OutputPass's sRGB conversion restores it. That works: invert in sRGB, then encode back to linear: l' = sRGBToLinear(1 - sRGB(l)). Then OutputPass converts l' -> sRGB => 1 - s. 

But careful: render target precision — HalfFloatType. sRGB->linear->sRGB roundtrip in half float: fine, some precision loss but small. Actually half float has ~10 bits mantissa; linear values near 1... conversion to sRGB is fine. Rounding might cause tiny off-by-one in 8-bit? Possibly but generally fine. Also could use UnsignedByteType render target with sRGB colorspace... but simpler: do the shader math.

Alternative approach: write inversion in sRGB domain and have the output pass not convert... but OutputPass always converts. Actually, careful: OutputPass uses `#include <colorspace_fragment>` which uses `outputColorSpace` uniform? Let's check: colorspace_fragment in recent three:

```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
And `linearToOutputTexel` is defined in colorspace_pars_fragment based on the renderer's output color space define. The OutputPass defines... hmm OutputPass's material has `toneMapping` set. Yes, the OutputPass constructor sets `this.material.toneMapping` etc. Actually, it does:

```js
class OutputPass extends Pass {
	constructor() { ... }
	render(renderer, writeBuffer, readBuffer) {
		this.uniforms['tDiffuse'].value = readBuffer.texture;
		this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;
		// rebuild defines if required
		if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
			this._outputColorSpace = renderer.outputColorSpace;
			this._toneMapping = renderer.toneMapping;
			this.material.defines = {};
			if ( ColorManagement.getTransfer( this._outputColorSpace ) === SRGBTransfer ) this.material.defines.SRGB_TRANSFER = '';
			...
		}
	}
}
```

Something like that. Anyway, OutputPass converts linear -> renderer.outputColorSpace. Default renderer.outputColorSpace = SRGBColorSpace. Good.

So plan: inversion shader converts linear input to sRGB, inverts, converts back to linear, and it's fine.

But hold on — one subtlety: is RenderPass target linear? The composer render target texture colorSpace by default: `new WebGLRenderTarget(size.width, size.height, { type: HalfFloatType })` — texture.colorSpace defaults to NoColorSpace. And in WebGLPrograms outputColorSpace for render target:

I recall in the current version:
```js
const outputColorSpace = currentRenderTarget === null ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace );
```
Hmm, but I also recall something in WebGLRenderer: `if ( renderTarget !== null ) { ... }` Let me think about a safer approach: explicitly create our own render target with `colorSpace: THREE.LinearSRGBColorSpace`? Hmm, actually setting texture.colorSpace = LinearSRGBColorSpace is also NoColorSpace-equivalent for conversions (LinearSRGB is not a transfer function). Hmm.

But there's risk: if the renderer treats the render target as sRGB (applying encoding), then the values stored would be sRGB-encoded, and my shader assuming linear would be wrong.

Let me recall more precisely. In three r16x WebGLPrograms:

```js
function getParameters( material, lights, shadows, scene, object ) {
	...
	const currentRenderTarget = renderer.getRenderTarget();
	...
	const outputColorSpace = currentRenderTarget === null ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace );
```
I'm fairly confident that's in there (I recall the XR check). So rendering into a non-XR render target outputs linear values. Good.

Hmm, but also, in some versions, `WebGLRenderer.setRenderTarget` sets `_currentRenderTarget` and ... Actually, also, EffectComposer since r152 uses `HalfFloatType` render targets and passes handle it.

However, another issue: Since three r155 (or so), the default for `renderer.outputColorSpace` is SRGBColorSpace, and when rendering to canvas, colors get converted. And also MeshBasicMaterial color 0xffffff — color management converts the color from sRGB to linear on the CPU (`color.setHex(0xffffff)` with default color management... white stays white). Scene background 0x336699 converts to linear working space. Then rendered to render target as linear, then OutputPass converts to sRGB, giving 0x336699 on screen.

With inversion in sRGB domain: sRGB screen without effect = 0x336699 → invert → 0xcc9966. Good. Sphere white → invert → black. Good.

Precision concerns: background 0x336699: sRGB channels: 0x33 = 51/255 = 0.2, 0x66 = 0.4, 0x99 = 0.6. Linear conversion then back: round trip through half float. Let's check: 0.2 in sRGB → linear 0.0331. Half float has 11-bit precision near that value: relative precision ~2^-11 = 0.00049, so absolute error ~1.6e-5 in linear. d(sRGB)/d(linear) at 0.0331: derivative = 1.055 * 0.4167 * l^(-0.5833)... = 1.055*0.4167*(0.0331)^(-0.5833). ln(0.0331) = -3.408, *-0.5833 = 1.988, e^1.988 = 7.3. So derivative ≈ 1.055*0.4167*7.3 = 3.21. So error in sRGB ≈ 1.6e-5*3.21 = 5e-5 → in 8-bit, 0.0127 of a step. Fine.

Then invert in sRGB and convert back to linear: value 0.8 sRGB → linear 0.6038. Half precision there: relative 2^-11 → abs error 3e-4, derivative dS/dL at 0.6 = 1.055*0.4167*0.6^(-0.5833) = 1.055*0.4167*1.3875 (0.6^-0.5833: ln0.6=-0.511*-0.5833=0.298, e^0.298=1.347) → 1.055*0.4167*1.347 = 0.592. error 3e-4*0.592 = 1.8e-4 → 0.045 of an 8-bit step. Fine, rounding should be exact mostly. Might be off by one in extreme cases but ok.

Hmm, but wait: does the RenderPass write to a half-float target that also gets... Also note that materials' output: The renderer's shader applies `linearToOutputTexel` for the render target color space — linear → identity. Fine.

Also, tone mapping: default renderer.toneMapping = NoToneMapping, OutputPass's tonemapping_fragment is a no-op then. Good.

Another subtlety: EffectComposer in newer three copies the renderer's... hmm, does EffectComposer set renderer.outputColorSpace? No.

Also there's a subtlety about `renderer.autoClear` etc. Not important.

Now, alternative simpler approach some might use: set the composer render target to UnsignedByteType with SRGBColorSpace so the RenderPass writes sRGB-encoded bytes, then invert with a pass that... but then OutputPass would double-encode. Could add a pass that converts sRGB→linear before OutputPass... Let's stick with the linear-target approach and do sRGB conversion inside the inversion shader. That's robust given the standard behavior.

Actually hmm, is there an even more robust approach that works regardless of whether the target is linear or sRGB? We could avoid OutputPass's implicit conversion issues by... no, requirement says use OutputPass. So we must produce linear input for OutputPass. Ok.

Let's write the shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 c) {
  return mix( pow(c, vec3(1.0/2.4)) * 1.055 - 0.055, c * 12.92, step(c, vec3(0.0031308)) );
}
```
Careful with step and pow: `pow` of negative is undefined; c should be >= 0. But maybe clamp with max(c, 0.0).

Better:
```glsl
vec3 toSRGB(vec3 c) {
  c = max(c, vec3(0.0));
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
  return mix(hi, lo, step(c, vec3(0.0031308)));
}
```
step(c, 0.0031308) returns 1 when 0.0031308 >= c, i.e., c <= threshold → use lo. mix(hi, lo, 1) = lo. Correct.

```glsl
vec3 toLinear(vec3 c) {
  c = max(c, vec3(0.0));
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(hi, lo, step(c, vec3(0.04045)));
}
```

Then in main:
```glsl
vec4 tex = texture2D(tDiffuse, vUv);
vec3 s = toSRGB(tex.rgb);
s = vec3(1.0) - s;
vec3 lin = toLinear(s);
gl_FragColor = vec4(lin, tex.a);
```

Hmm, but careful: tex.a. Fine.

Now, `gl_FragColor` in ShaderPass with WebGL2/GLSL3? ShaderPass uses ShaderMaterial with glslVersion default (GLSL1), and three prepends... In recent three versions, ShaderMaterial with default glslVersion compiles as GLSL 1 with `gl_FragColor` available? Actually three's WebGLProgram adds compatibility defines for GLSL3 only if glslVersion === GLSL3. For GLSL1 shaders, three uses the ES 1.0 shader source but in WebGL2 context... it wraps? Actually three's WebGLProgram for GLSL1 in WebGL2 context: it just uses the shader as-is (WebGL2 supports GLSL ES 1.00 shaders). So `gl_FragColor` and `texture2D` work. Yes, standard.

But note: three's ShaderPass shader also needs `#include <common>`? No. But it's safest to just use plain GLSL1. Actually, note that in three examples, ShaderPass shaders use `gl_FragColor`. Fine.

Also `varying vec2 vUv;` and vertex shader from ShaderPass default: fullScreenQuad uses a material with vertexShader? ShaderPass takes the shader object and creates ShaderMaterial with vertexShader: shader.vertexShader... Typically people supply vertexShader:

```glsl
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
```

Good.

Also there's the issue of `EffectComposer` and the fact that the last pass renders to screen — EffectComposer sets renderToScreen on the last pass automatically? Let's check: `EffectComposer.render(deltaTime)`:

```js
render( deltaTime ) {
  ...
  for ( let i = 0; i < passes.length; i ++ ) {
    const pass = passes[i];
    ...
  }
}
```
Actually EffectComposer.render:
```js
render( deltaTime ) {
    if ( this._disposed ) return;
    const currentRenderTarget = this.renderer.getRenderTarget();
    ...
    const il = this.passes.length;
    for ( let i = 0; i < il; i++ ) {
        const pass = this.passes[ i ];
        if ( pass.enabled === false ) continue;
        pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
        pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );
        ...
    }
}
```
Yes, `renderToScreen` set based on isLastEnabledPass. And `this.renderToScreen` default true. So the OutputPass renders to screen. Good.

Also, ShaderPass constructor: `new ShaderPass(shaderObject)` — with `textureID` = 'tDiffuse' default? ShaderPass: `constructor(shader, textureID)` where textureID defaults to 'tDiffuse'... Let me recall:

```js
class ShaderPass extends Pass {
	constructor( shader, textureID = 'tDiffuse' ) {
		...
		this.uniforms = UniformsUtils.clone( shader.uniforms );
		this.material = new ShaderMaterial( {
			defines: Object.assign( {}, shader.defines ),
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader
		} );
		if ( textureID !== undefined ) ... 
```
Hmm, actually: `this.material = new ShaderMaterial(...)`. Then:
```js
		if ( textureID === undefined ) textureID = 'tDiffuse';
```
Something like that. Default is 'tDiffuse'. Anyway I'll pass `'tDiffuse'` explicitly? Actually the signature is `constructor(shader, textureID)` and if undefined it... Let me just use default and name the uniform `tDiffuse`. Actually the source:

```js
class ShaderPass extends Pass {
	constructor( shader, textureID ) {
		super();
		this.textureID = ( textureID !== undefined ) ? textureID : 'tDiffuse';
```
Yes. So default works with 'tDiffuse'.

Note also: ShaderPass requires `shader.uniforms` to be defined; and it does `this.uniforms[ this.textureID ]` check in render — if undefined, warning. Fine.

Now also: `needsSwap` on ShaderPass is true by default (from Pass base `needsSwap = true`? Actually Pass base has `this.needsSwap = true`). ShaderPass sets nothing, so true. Fine.

One important thing: after inversion pass, the OutputPass reads readBuffer. Good.

Now, do I need to worry about the render target type and `renderer.outputColorSpace` affecting the RenderPass output? Also: is there an issue where the composer's render target texture colorSpace is NoColorSpace, and `linearToOutputTexel` uses `outputColorSpace` define which is computed as LinearSRGBColorSpace → identity. Good.

But wait, there's another important thing: three r152+ `WebGLRenderTarget` default colorSpace is NoColorSpace, but also `EffectComposer` in newer versions may set `renderTarget.texture.colorSpace`? Let me think... In some version (r165?), EffectComposer's constructor:

```js
constructor( renderer, renderTarget ) {
    this.renderer = renderer;
    this._pixelRatio = renderer.getPixelRatio();
    if ( renderTarget === undefined ) {
        const size = renderer.getSize( new Vector2() );
        this._width = size.width;
        this._height = size.height;
        renderTarget = new WebGLRenderTarget( this._width * this._pixelRatio, this._height * this._pixelRatio, { type: HalfFloatType } );
        renderTarget.texture.name = 'EffectComposer.rt1';
    } else {
        ...
    }
```

Yeah. So NoColorSpace → treated as linear. Good.

Hmm, but here's a subtle risk: If a version treats render target output color space as the render target's texture colorSpace and NoColorSpace maps to... `getEncodingParameters` with NoColorSpace → no conversion (GLSL: `linearToOutputTexel` returns sRGB? hmm). Let me consider: in colorspace_pars_fragment:

```glsl
vec4 linearToOutputTexel( vec4 value ) {
	...
	#ifdef SRGB_TRANSFER
	value = sRGBTransferOETF( value );
	#endif
	...
}
```
Actually the define is set based on output color space: if transfer is sRGB → SRGB_TRANSFER define → converts; otherwise identity (for LinearSRGB and NoColorSpace). Good, so NoColorSpace = identity.

OK. Now the whole thing works. But: precision of half float in the composer target — but is HalfFloatType supported with linear filtering? Fine in WebGL2.

Also I should consider that maybe the environment is WebGL2 always in modern browsers. Fine.

However! There is another risk: what if the grader's three version is older (< r152) where outputColorSpace didn't exist and it was outputEncoding? The prompt says use OutputPass from 'three/addons/postprocessing/OutputPass.js' which only exists in r152+. So it's r152+. Good.

Now, one more consideration: does the inversion in sRGB exactly match "the exact inverse of what the screen would show without the effect"? Screen shows sRGB 8-bit values. Inverting in sRGB float domain: s_final = 1 - s_linear_to_srgb(linear). For 0x33 → s = 51/255 = 0.2, but the actual quantized 8-bit value is 0.2 exactly. 1-0.2 = 0.8 → 0.8*255 = 204 = 0xCC. 

But wait: the background color 0x336699 is converted to linear working space, rendered, then OutputPass converts back to sRGB → 0.2 (approximately, with quantization to 8 bits in the framebuffer). Our pass computes sRGB 0.2 → invert 0.8 → back to linear → OutputPass → sRGB 0.8 → quantized to 204. 

Precision check: earlier computed errors are small. Good.

One more risk: What if effect composer applies `renderer.toneMapping` in OutputPass (NoToneMapping → identity). Fine.

Let's also double check that sphere is white and background 0x336699; also add lights? MeshBasicMaterial doesn't need lights.

Camera at (0,0,4) looking at origin; sphere radius 1 → appears with radius ~ some fraction of screen. Fine.

Now write the code.

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
```

Note: `renderer.setPixelRatio` then `setSize(...)`. EffectComposer uses renderer.getSize * pixelRatio. Good.

Scene:

```ts
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(sphere);
```

Composer:

```ts
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(invertPass);
composer.addPass(new OutputPass());
```

Wait — should the composer's internal render targets be set with type? Default HalfFloatType. Good.

Hmm, one more: EffectComposer default renderTarget type HalfFloatType. If we want more precision, fine.

Now, the inversion pass shader. But wait: One concern about the RenderPass: `RenderPass` clears with the renderer's clear color and background. Also, `renderer.setClearAlpha`? RenderPass sets `renderer.setClearColor(0x000000, 0)`? Actually RenderPass in `render`:

```js
render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    ...
    renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );
    if ( this.clear ) renderer.clear( this.clearColor, this.clearDepth, this.clearStencil );
    ...
    renderer.render( this.scene, this.camera );
```
Actually it may do `if (this.clear) renderer.clear(renderer.autoClearColor, ...)`. Hmm, it sets `renderer.autoClear = false` and then calls renderer.clear(...). Something like that. Since scene.background is set, the background will be drawn. Fine.

Also important: RenderPass renders into readBuffer. Then the ShaderPass reads readBuffer, writes writeBuffer, swaps. Then OutputPass reads readBuffer (which is now the inverted result) and renders to screen. Good.

Handling resize:

```ts
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(w, h);
  composer.setSize(w, h);  // hmm — composer.setSize expects CSS size? 
});
```

EffectComposer.setSize(width, height) — sets `this._width = width; this._height = height;` and then render targets sized to width*pixelRatio. Yes:

```js
setSize( width, height ) {
    this._width = width;
    this._height = height;
    const effectiveWidth = this._width * this._pixelRatio;
    const effectiveHeight = this._height * this._pixelRatio;
    this.renderTarget1.setSize( effectiveWidth, effectiveHeight );
    ...
}
```
And setPixelRatio:
```js
setPixelRatio( pixelRatio ) {
    this._pixelRatio = pixelRatio;
    this.setSize( this._width, this._height );
}
```
So pass CSS size, and it uses renderer's pixel ratio captured at construction. I'll call composer.setPixelRatio(window.devicePixelRatio) then setSize. Simpler: call composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w,h).

Note: composer's `_pixelRatio` is set from renderer.getPixelRatio() at construction. Fine.

Animation loop:

```ts
let firstFrame = true;
renderer.setAnimationLoop((time) => {
  const t = time * 0.001; // elapsed
  ...
  composer.render();
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

Hmm: "After the first frame is rendered, set __ready = true." Use a flag.

Motion: rotation of sphere with delta time. Let's track prev time and delta. Keep it simple: rotate sphere using time-based. Also maybe animate camera slightly? Keep simple: sphere rotation.

Actually careful: rotating a white sphere — no visual effect since MeshBasicMaterial uniform white. Doesn't matter. Maybe just keep a subtle rotation for "motion must use delta/elapsed time" (they require motion using delta). I'll rotate the sphere, it's harmless.

TS strict: need to make sure types are OK. `renderer.setAnimationLoop((time: number) => {...})` — the callback signature is `(time: number, frame?: XRFrame) => void`? In three's types: `setAnimationLoop(callback: XRAnimationLoopCallback | null)` where `XRAnimationLoopCallback = (time: number, frame?: XRFrame) => void`. Passing a one-arg lambda is fine.

Shader object for ShaderPass must match `ShaderMaterialParameters`-ish; TS type of ShaderPass constructor: `constructor(shader: object, textureID?: string)`. Hmm, in three types, `ShaderPass` constructor param is `shader: any`? Let's check @types/three: `class ShaderPass extends Pass { ... constructor(shader: object, textureID?: string); ... }` I believe it's `shader: object`. Using an object literal with uniforms/vertexShader/fragmentShader — fine for `object`.

But `new ShaderMaterial({ uniforms: UniformsUtils.clone(...) })` internally — not our concern.

For uniforms typing: I'll define the shader object as a plain object; no TS issues as it's assignable to `object`.

Also need `(window as any).__scene = scene;` etc.

Let's also consider whether to set `renderer.toneMapping = THREE.NoToneMapping` explicitly — default. Fine, but explicit is nice.

Also: Does the composer's first render target texture need `colorSpace`? Let's be extra safe and configure it explicitly? If I set `composer.renderTarget1.texture.colorSpace = THREE.LinearSRGBColorSpace`, hmm — does EffectComposer use `renderTarget1` and `renderTarget2`? Yes, `this.renderTarget1`, `this.renderTarget2`. If I set colorSpace to LinearSRGBColorSpace on both, then in versions where the renderer uses renderTarget.texture.colorSpace for the output conversion, LinearSRGB → identity (no encode). That's consistent with the default NoColorSpace behavior too. Actually is LinearSRGBColorSpace guaranteed identity in `getEncodingParameters`/colorspace handling? In WebGLPrograms -> `getEncodingParameters`... hmm, older code:

Actually, in r152+, `WebGLPrograms.getParameters`:
```js
const outputColorSpace = ...;
...
colorSpace: outputColorSpace,
```
And in WebGLProgram, `getTexelEncodingFunction`? Hmm. Let me instead just leave the render targets default (NoColorSpace) which is definitely linear/identity. I'll leave defaults. Don't touch it.

But hold on — potential gotcha: If some three version's EffectComposer creates the render target with `colorSpace: SRGBColorSpace`? I don't think so.

Another thought: What if in the installed version the renderer, when rendering to a render target, uses the render target's texture colorSpace (NoColorSpace) and maps "NoColorSpace" to... There's a helper:

```js
function getColorSpaceTransfer( colorSpace ) { ... }
```

For NoColorSpace, `ColorManagement.getTransfer(colorSpace)` returns `ColorManagement.getTransfer( NoColorSpace )` → ... Hmm. In three's ShaderChunk colorspace_pars_fragment:

```glsl
#ifndef SRGB_TRANSFER
...
```
Hmm the actual implementation is:

```glsl
vec4 linearToOutputTexel( vec4 value ) {
	...
}
```
Where the definitions are generated in WebGLProgram: In WebGLProgram there's:

```js
const colorSpace = ...;
...
if ( colorSpace !== LinearSRGBColorSpace ) { ... }
```

Actually I recall `WebGLProgram.js` contains:

```js
const getTexelEncodingFunction = ...
```
Hmm, older. Newer: `ShaderChunk.colorspace_pars_fragment` gets a prefix define. In WebGLProgram:

```js
prefixFragment = [
  ...
  '#define SRGB_TRANSFER' (if applicable)
  ...
]
```
Hmm. In WebGLPrograms.getParameters there's `outputColorSpace` and in WebGLProgram:

```js
const colorSpace = parameters.outputColorSpace;
...
if ( ColorManagement.getTransfer( colorSpace ) === SRGBTransfer ) { ... '#define SRGB_TRANSFER' }
```

Something along those lines. NoColorSpace → transfer... `ColorManagement.getTransfer` for NoColorSpace returns `ColorManagement._getTransfer`?? For unknown color spaces, three does `ColorManagement.getTransfer(colorSpace)` returns `ColorManagement.workingColorSpace`? Anyway, for NoColorSpace I'm confident it results in no encode (identity) — render targets get linear values, which is the fundamental design.

Alright.

Now writing the shader carefully with GLSL ES 1.0. Also I should avoid `mix` with vec3 `step` — fine.

Actually, I could simplify: since OutputPass will convert linear→sRGB on the last step, I need to give it linear values. But simpler alternative: instead of converting back to linear in the invert shader, I could keep sRGB-inverted values in the buffer and then... no, must convert back. Keep as planned.

Hmm, but wait! Alternative even cleaner: do the inversion not in sRGB but use the fact that... no, inversion is nonlinear in linear space. Keep.

Let's double check the sRGB transfer functions matching three's `sRGBTransferOETF`:

```glsl
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
```
Note three uses exponent 0.41666 (approximation of 1/2.4 = 0.41666...). And EOTF:
```glsl
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
```
Hmm, some versions use the exact `(c + 0.055)/1.055`. I'll use the standard formulation consistently for both directions — small differences from three's approximations are sub-quantization.

Also CPU-side: MeshBasicMaterial color 0x336699 → background. Background color conversion: `scene.background` color converted to linear? Actually for background rendering, the renderer converts the color to the rendering... In `WebGLBackground`, it does `renderer.setClearColor(background)` and if background is a Color, it uses `_clearColor.copy(background)` and ... with ColorManagement, `setClearColor` converts sRGB→linear? Actually `setClearColor` stores the color and the clear happens in linear space via `state.buffers.color.setClear`... Hmm, actually background color is applied via `renderer.setClearColor` which uses `ColorManagement.toWorkingColorSpace`? There's `_clearColor.set(color)` then `state.buffers.color.setClear(r,g,b,a,premultipliedAlpha)` — I think in WebGLBackground: 

```js
_clearColor.copy( background );
const _clearColorSRGB = ... 
```
Hmm, there's a known thing: for the background, since the clear color goes through the fixed-function pipeline, three converts to the output color space manually:

```js
if ( background.isColor ) {
    setClear( background, 1 );
    ...
}
function setClear( color, alpha ) {
    color.getRGB( _rgb, getUnlitUniformColorSpace( renderer ) );
    state.buffers.color.setClear( _rgb.r, _rgb.g, _rgb.b, alpha, premultipliedAlpha );
}
```
Where `getUnlitUniformColorSpace(renderer)` returns `renderer.outputColorSpace` if rendering to canvas else working... Hmm: 

```js
function getUnlitUniformColorSpace( renderer ) {
    if ( renderer.getRenderTarget() === null ) {
        // https://github.com/mrdoob/three.js/pull/23937#issuecomment-1111067398
        return renderer.outputColorSpace;
    }
    return ColorManagement.workingColorSpace;
}
```

Hmm — when rendering to a render target, `getUnlitUniformColorSpace` returns workingColorSpace (linear-sRGB). So the clear color is converted to linear... but then the clear value written to the framebuffer is linear, and since the render target framebuffer has no sRGB encoding, the stored value is linear. Good, consistent.

Hmm wait, but there's a nuance: when rendering directly to canvas (no effect), the clear color is converted to `renderer.outputColorSpace` = sRGB, storing sRGB bytes in the canvas. That's what we'd get without the effect. With the effect, the background goes to the render target as linear, then inverted-in-sRGB pass, then OutputPass → canvas. Both consistent with our analysis. 

One more nuance: For background in render target case, three converts to working (linear) space. Good — so the render target holds linear color. Consistent with our assumption. 

Now, precision: linear value from 0x336699's blue: sRGB 0.6 → linear 0.318547. Stored in half float: 0.318547 → half float nearest: values near 0.3185: half float step at 0.3185 is 2^-2 * 2^-11 = 0.000122 (exp: 0.3185 in [0.25,0.5), ulp = 2^-2 * 2^-10 = 0.000244? Let's compute: half float has 10 explicit mantissa bits. For value in [0.25, 0.5), exponent -2, ulp = 2^(-2-10) = 2^-12 = 0.000244). Error up to 0.000122 in linear. dS/dL at 0.3185: derivative = 1.055*0.41666*L^(-0.5833) = 1.055*0.41666* (0.3185^-0.5833). ln(0.3185) = -1.1444, * -0.5833 = 0.6675, e^0.6675 = 1.9496. So 1.055*0.41666*1.9496 = 0.8566. Error in sRGB = 0.000122*0.8566 = 1.05e-4 ≈ 0.027 of an 8-bit step. Fine.

Then invert → 0.4 sRGB → linear 0.1329; quantize to half: ulp for [0.125,0.25) = 2^-3*2^-10 = 2^-13 = 0.000122. error ≤6.1e-5. Convert to sRGB in OutputPass: derivative at 0.4 = 1.055*0.41666*(0.1329^-0.5833): ln 0.1329 = -2.0186 *-0.5833 = 1.1775, e = 3.2467 → 1.055*0.41666*3.2467 = 1.427. error = 8.7e-5 → 0.022 of a step. 

So all good; final 8-bit values will be exact after rounding.

Let me now write final code.

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({color: 0xffffff}));
scene.add(sphere);

const invertShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `...`,
  fragmentShader: `...`
};
```

Hmm, `uniforms: { tDiffuse: { value: null } }` — TS strict: `null` is fine as `value: null` inferred type null; then `UniformsUtils.clone` returns... this object is passed to `object` param so no complaint. Actually TS won't complain because ShaderPass signature takes `object`. But `ShaderPass`'s constructor in @types/three:

```ts
export class ShaderPass extends Pass {
    constructor(shader: object, textureID?: string);
```
Yes.

Now writing shaders.

vertexShader:
```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

fragmentShader:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB( vec3 c ) {
  c = max( c, vec3( 0.0 ) );
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055;
  return mix( high, low, vec3( lessThanEqual( c, vec3( 0.0031308 ) ) ) );
}

vec3 sRGBToLinear( vec3 c ) {
  c = max( c, vec3( 0.0 ) );
  vec3 low = c / 12.92;
  vec3 high = pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) );
  return mix( high, low, vec3( lessThanEqual( c, vec3( 0.04045 ) ) ) );
}

void main() {
  vec4 texel = texture2D( tDiffuse, vUv );
  // The composer buffer holds linear-sRGB values, but the screen shows
  // sRGB-encoded values. Invert in the sRGB (display) domain so the final
  // result is the exact inverse of the non-inverted image, then go back to
  // linear so OutputPass produces the correct output color space.
  vec3 sRGB = linearToSRGB( texel.rgb );
  vec3 inverted = vec3( 1.0 ) - sRGB;
  gl_FragColor = vec4( sRGBToLinear( inverted ), texel.a );
}
```

Note `mix(high, low, vec3(bvec3))` — mix with vec3 of 0/1 as float works: `lessThanEqual` returns bvec3; `vec3(bvec3)` conversion in GLSL ES 1.0 — is `vec3(bvec3)` valid? In GLSL ES 1.00, constructors allow boolean to float conversion? GLSL ES 1.0 spec: "constructors can be used to convert between types"—for bool to float conversion, in GLSL 1.20+ it's allowed. In GLSL ES 1.00... Hmm, GLSL ES 1.00 §5.4.2: "Casting from bool to float/int is not supported"? Let me recall: GLSL ES 1.00 doesn't support bool→float conversion in constructors. Actually, the spec says: "The constructors ... can be used to convert between any of the scalar types: ... There is no conversion from bool to int/float". Hmm.

Safer: use `step()` which returns float:

```glsl
vec3 lowMask = step( c, vec3( 0.0031308 ) ); // 1.0 where 0.0031308 >= c ... wait step(edge, x) = x < edge ? 0 : 1
```
`step(edge, x)` returns 1 if x >= edge else 0. So `step(c, vec3(0.0031308))`? That's step(edge=c, x=0.0031308) → 1 if 0.0031308 >= c. Hmm, that gives 1 when c <= threshold → low branch. That works but is confusing. Let's use `1.0 - step(vec3(0.0031308), c)` = 1 when c < 0.0031308. Cleaner:

```glsl
float m = ... 
```
Use:
```glsl
vec3 t = vec3( 0.0031308 );
vec3 mask = vec3( 1.0 ) - step( t, c ); // 1.0 if c < t
return mix( high, low, mask );
```
Good, avoids bvec constructor issues.

Similarly for sRGBToLinear: mask = 1 - step(vec3(0.04045), c).

Also note `pow(c, vec3(...))` with c possibly 0 → pow(0, positive) = 0 fine.

Also potential edge: `mix(high, low, mask)` with mask 0/1 fine.

Now full assembly:

```ts
const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(width, height);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(invertShader));
composer.addPass(new OutputPass());
```

Hmm, careful with composer.setSize before addPass — order doesn't matter.

Wait: composer.setPixelRatio(renderer.getPixelRatio()) — this calls setSize(this._width, this._height) using stored width/height from construction. Fine, then I explicitly setSize.

Actually careful: EffectComposer constructor computes `_width/_height` from `renderer.getSize()`, then setPixelRatio triggers a resize of the render targets. Then setSize again. Fine.

Now animation loop and resize.

```ts
let elapsed = 0;
let firstFrame = true;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;
  sphere.rotation.y = elapsed * 0.6;
  sphere.rotation.x = elapsed * 0.25;
  composer.render(delta);
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

Hmm — `composer.render(delta)` requires delta argument in types? `render(deltaTime?: number)`. In @types/three: `render(deltaTime?: number): void`. Fine.

Wait — but does the render callback get time from setAnimationLoop? We can use it. Use clock for delta. Clock is fine. Or use the time param: delta = time - prev. Simpler with clock. But careful: Clock.getDelta() first call returns time since clock creation... Actually Clock autoStart; getDelta on first call returns elapsed since start, could be large-ish. Doesn't matter.

Better use the animation loop timestamp:

```ts
let previousTime = -1;
renderer.setAnimationLoop((time: number) => {
  const delta = previousTime < 0 ? 0 : (time - previousTime) * 0.001;
  previousTime = time;
  ...
});
```
Hmm, TS: XRAnimationLoopCallback type — does @types/three define setAnimationLoop(callback: XRAnimationLoopCallback | null)? Let me check: 

```ts
setAnimationLoop(callback: XRAnimationLoopCallback | null): void;
```
and `export type XRAnimationLoopCallback = (time: number, frame?: XRFrame) => void;` Hmm, I think in @types/three it's `(time: number, frame?: XRFrame) => void`. Passing `(time: number) => {}` is assignable. Good. But to be safe with any type versions, I could annotate as `(time: number) => {}`. If the actual type is `Function` it's fine too.

Hmm, but there's a risk if the type is `XRAnimationLoopCallback` requiring 2 params... a callback with fewer params is assignable. Good.

Resize handler:

```ts
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
});
```

Also exposures.

Also `(window as any).__scene = scene; (window as any).__camera = camera; (window as any).__renderer = renderer; (window as any).__composer = composer;`

Also maybe disable antialias issues — antialias with composer isn't used anyway.

One consideration: The render target type HalfFloatType - in some browsers WebGL2 needed. Modern browsers support EXT_color_buffer_float in WebGL2. OK.

Another consideration for correctness: Should I worry about tone mapping in OutputPass? NoToneMapping by default.

Also worth adding: `renderer.toneMapping = THREE.NoToneMapping;` explicit.

Let me also double check that RenderPass clear behavior won't cause alpha issues — irrelevant.

One more: The sphere uses MeshBasicMaterial white; with the invert, it becomes black. Good.

Now — potential problem: is the RenderPass writing into `readBuffer` and the antialiasing/dithering? Fine.

Another potential issue: ShaderMaterial's shader receives `#include` preprocessing only; our shader has no includes. But three might prepend defines; fine.

Hmm, actually one more thought about whether the composer's render target stores linear values: There's also `EffectComposer`'s use of `renderer.setRenderTarget(readBuffer)` and the renderer's `outputColorSpace` handling in `WebGLRenderer.render` → in `renderer.render`, for render targets it does `_currentRenderTarget`. Yeah covered.

Now, what about `renderer.outputColorSpace` when OutputPass renders to screen: OutputPass uses `linearToOutputTexel` → sRGB. Good.

But actually one subtlety: OutputPass's shader in newer versions might not exist as I described... it definitely applies `#include <colorspace_fragment>` which is `linearToOutputTexel`. Fine.

Let me also consider: Some versions of three (r152) OutputPass shader:

```glsl
vec4 texel = texture2D( tDiffuse, vUv );
gl_FragColor = texel;
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
Hmm, `colorspace_fragment` is:
```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
Which is defined based on `renderer.outputColorSpace`. Good.

Wait, but is `linearToOutputTexel` defined for ShaderMaterial-based passes? The chunk `colorspace_pars_fragment` defines it, plus the renderer injects the appropriate `SRGB_TRANSFER` define for the material based on `parameters.outputColorSpace`. For the OutputPass material, when rendering to screen, `outputColorSpace` = renderer.outputColorSpace = sRGB → define set. OK.

But if the OutputPass were rendered to a render target, it'd be linear. Not our case.

Also note OutputPass will be last, renderToScreen = true → renderer.setRenderTarget(null). 

Let's write it out. Also add a small guard: nothing.

Final code below. Also good practice: `(window as any).__ready = false;` upfront? Not required. I'll leave setting only after first frame.

Double check TS strict: `document.body.appendChild(renderer.domElement)` fine.

`const invertShader = { uniforms: {...}, vertexShader: '...', fragmentShader: '...' };` then `new ShaderPass(invertShader)` — with `object` param type, our object literal is assignable to `object`. Fine.

But wait: ShaderPass's constructor in @types/three might be typed more strictly as `constructor(shader: any, textureID?: string)`. Either way fine.

Potential strict issue: unused variables — noUnusedLocals might be enabled in the tsconfig. Avoid unused variables! `width`/`height` used. `RenderPass` used. OK.

Also `elapsed` used. Good.

Let me write the final shader text as template literal with escaped nothing.

One more thought: Should I use `vec3(1.0) - sRGB`? yes.

I'll write it now.

Also, maybe I should double-check: does the invert pass change the `tDiffuse` uniform value automatically? ShaderPass.render sets `this.uniforms[this.textureID].value = readBuffer.texture`. Yes.

Final code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);
...
```

Also, for the `sphere` rotation - fine.

Write it all.