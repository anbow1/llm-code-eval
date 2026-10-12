Setup: scene.background is a THREE.Color set from hex 0x336699 — by default, THREE.Color setHex applies sRGB-to-linear conversion (color management enabled by default in recent three). RenderPass renders into a linear HalfFloat render target. The ShaderPass inverts. If we invert in linear space, then the OutputPass converts linear→sRGB, and the result won't be the exact inverse of sRGB values. To get exact inverse on screen, we should convert linear→sRGB in the shader first, then invert, then OutputPass... but OutputPass would then apply sRGB conversion again to already-sRGB values? OutputPass with tonemapping/colorspace — actually OutputPass converts to sRGB. If we already output sRGB values from the shader, OutputPass would double-convert.

Better approach: make the render target of the ShaderPass chain work in sRGB. Common approach: set the renderTarget texture color space, or use the shader to do linear→sRGB then invert, and OutputPass handles final conversion. Actually the classic solution (from three.js example "postprocessing with invert"): the ShaderPass renders to a linear-space target; to invert in sRGB space, convert linear→sRGB in shader, invert, then... the composer's final OutputPass converts to sRGB again — which would be wrong.

Hmm. Actually in the official three.js webgl_postprocessing example? Let me think. There's a known example: "misc_exporter_gltf"? No. There is a three.js example "webgl_postprocessing_custom_shaders"? The known trick: convert to sRGB in the shader, invert, then OutputPass's OutputShader includes colorspace conversion... Actually OutputPass checks the renderer.outputColorSpace and the render target's color space. If the intermediate render target is in linear space, OutputPass applies sRGB encoding. So we can't pre-encode in the shader unless we also mark the target as sRGB so OutputPass skips conversion.

Simplest robust approach: do the inversion entirely in the shader on sRGB values, and tell composer/output not to re-encode. Options:

1. Set the ShaderPass's render target texture colorSpace to SRGBColorSpace: `shaderPass.renderTarget.texture.colorSpace = THREE.SRGBColorSpace;` Wait, ShaderPass creates its own render target if not provided; you can pass a render target to ShaderPass constructor. Then in the shader: convert linear→sRGB, invert, output. OutputPass will then see target texture is sRGB and skip conversion (OutputShader uses `#ifdef` based on... actually OutputPass sets defines based on renderTarget's colorSpace? Let me recall OutputPass implementation: OutputPass reads `this.renderTarget` ... Actually OutputPass's material defines are updated in render(): it checks renderer's outputColorSpace and the renderTarget... In three r160+, OutputPass does:

```js
render(renderer, writeBuffer, readBuffer) {
  this.uniforms['tDiffuse'].value = readBuffer.texture;
  ...
  if (this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping) {
    ...
    if (this._outputColorSpace !== renderer.outputColorSpace) {
      if (renderer.outputColorSpace === LinearSRGBColorSpace) shader.fragmentShader replace includes colorspace_fragment... 
```

Hmm, actually the OutputShader includes `#include <colorspace_fragment>` which converts from linear to output color space. The colorspace_fragment chunk uses `linearToOutputTexel`. If the target is sRGB... In newer three, colorspace conversion uses the texture's colorSpace? Let me recall: in recent versions, `colorspace_fragment` does `gl_FragColor = linearToOutputTexel( gl_FragColor );` where linearToOutputTexel is generated based on renderer.outputColorSpace, not per-target. So OutputPass always converts linear→sRGB if outputColorSpace is sRGB.

So if I pre-encode in my shader, OutputPass will encode again — wrong.

Alternative: set `renderer.outputColorSpace = THREE.SRGBColorSpace` (default) and make the composer chain handle it. Approach used in three.js official example "webgl_postprocessing" with inversion? There's actually a three.js example: webgl_postprocessing_custom? Hmm.

Actually the standard clean solution: do the inversion in linear space? No — inverting in linear space: screen_srgb_out = srgb_encode(1 - linear(c)). Without effect: srgb_encode(linear(c)) = c. Is srgb_encode(1 - linear(c)) = 1 - c? No, because sRGB transfer isn't linear.

So to get exact inversion we must invert in sRGB space after encoding. So pipeline: RenderPass (linear HDR buffer) → ShaderPass: convert linear→sRGB, invert, output... but then OutputPass would re-encode.

Option: skip OutputPass and instead set the final pass to write with correct encoding. But requirement says include OutputPass.

Option: mark intermediate targets as sRGB. The colorspace_fragment in OutputPass: in three r152+, OutputPass's fragment shader is:

```glsl
#include <packing>? no...
```

Actual OutputPass shader (r160):

```glsl
uniform sampler2D tDiffuse;
...
void main() {
  gl_FragColor = texture2D( tDiffuse, vUv );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

And `colorspace_fragment` chunk: `gl_FragColor = linearToOutputTexel( gl_FragColor );`. linearToOutputTexel is defined in the shader based on... In WebGLProgram, `getTexelEncodingFunction` uses `parameters.outputColorSpace`? For OutputPass material (raw shader material? no, ShaderMaterial), the program parameters outputColorSpace comes from renderer.outputColorSpace? Actually for ShaderMaterial rendering to a render target, the output colorspace used by the program is... In three, when rendering to a render target, the colorspace conversion uses the render target's texture colorSpace (renderer.outputColorSpace only applies to canvas/default framebuffer). Hmm, actually in WebGLPrograms: `outputColorSpace: ( currentRenderTarget === null ) ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace )` — wait, I think for render targets other than XR, it's LinearSRGBColorSpace (no conversion). Hmm, in newer versions: `const currentRenderTarget = renderer.getRenderTarget(); outputColorSpace = currentRenderTarget === null ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace );`

Yes — that's it. When rendering to a non-XR render target, no colorspace conversion happens in the material shaders; the conversion is deferred to OutputPass which explicitly converts.

So: if I set my ShaderPass output render target's texture colorSpace to SRGBColorSpace, does OutputPass know? OutputPass checks: in its render method:

```js
render( renderer, writeBuffer, readBuffer ) {
  this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
  this.uniforms[ 'tDiffuse' ].colorSpace = ( this.renderToScreen ) ? renderer.outputColorSpace : readBuffer.texture.colorSpace? 
```

Hmm, actually I recall OutputPass in newer versions:

```js
render( renderer, writeBuffer, readBuffer ) {
    this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
    this.uniforms[ 'tDiffuse' ].colorSpace = ( this.renderToScreen === true ) ? renderer.outputColorSpace : readBuffer.texture.colorSpace;
    ...
    if ( this._outputColorSpace !== ... || this._toneMapping !== renderer.toneMapping ) {
        ...
        if ( this._outputColorSpace !== renderer.outputColorSpace && ColorManagement.getTransfer( this._outputColorSpace ) !== ... )
```

I remember OutputPass sets defines like:

```js
if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
    this._outputColorSpace = renderer.outputColorSpace;
    this._toneMapping = renderer.toneMapping;
    this.material.defines = {};
    if ( ColorManagement.getTransfer( this._outputColorSpace ) === SRGBTransfer ) this.material.defines.SRGB_TRANSFER = '';
    ...
```

Hmm, not exactly. Let me just recall the actual file (r165 OutputPass.js):

```js
render( renderer, writeBuffer, readBuffer ) {

    this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
    this.uniforms[ 'tDiffuse' ].colorSpace = ( this.renderToScreen === true ) ? renderer.outputColorSpace : readBuffer.texture.colorSpace;

    this._outputColorSpace = this.uniforms[ 'tDiffuse' ].colorSpace;
    this._toneMapping = ( this.renderToScreen === true ) ? renderer.toneMapping : NoToneMapping;
    ...
    if ( this._outputColorSpace !== this._cachedOutputColorSpace || ... ) {
        this.material.defines = {};
        ...
        if ( this._outputColorSpace === SRGBColorSpace ) this.material.defines.SRGB_TRANSFER = ''; // something
```

Actually OutputPass shader:

```glsl
uniform sampler2D tDiffuse;
uniform vec3 tint;? no

varying vec2 vUv;

vec3 linearToOutputTexel( vec4 value ) {...}? 
```

I recall the actual OutputPass.js fragment shader:

```glsl
uniform sampler2D tDiffuse;
uniform float luminancePreservation;? no that's something else.
```

Let me recall from source (three r160 postprocessing/OutputPass.js):

```js
const fragmentShader = /* glsl */`
uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {

	gl_FragColor = texture2D( tDiffuse, vUv );

	#include <tonemapping_fragment>
	#include <colorspace_fragment>

}
`;
```

And the colorspace_fragment include resolves via the program's generated linearToOutputTexel based on the material's "outputColorSpace" parameter, which OutputPass controls by setting `this.material.fragmentShader` replacements? No — OutputPass overrides by replacing the include? Hmm, `#include <colorspace_fragment>` inside a ShaderMaterial — does ShaderChunk resolution apply to ShaderMaterial? Yes! Three.js resolves #include in all materials' shaders. And the colorspace_fragment chunk references `linearToOutputTexel` which is defined in the program header based on parameters.outputColorSpace. For ShaderMaterial rendered to screen with renderer.outputColorSpace = sRGB, outputColorSpace param = sRGB, so linearToOutputTexel = LinearTosRGB. If rendering to a render target (non-XR), it's LinearSRGB (no-op).

But wait — in newer three (r163+?), the behavior changed: outputColorSpace parameter now uses the render target's texture colorSpace? Let me recall WebGLPrograms.js current:

```js
const currentRenderTarget = renderer.getRenderTarget();
const IS_XR = ...
outputColorSpace: currentRenderTarget === null ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace ),
```

Yes I'm fairly confident that's still the case. So OutputPass rendering to screen converts linear→sRGB.

OK so the cleanest solution satisfying "exact inverse": make the whole composer chain work in sRGB space and prevent OutputPass from converting again. How does the official three.js handle post-processing chains that want sRGB? There's a known example: webgl_postprocessing with... Actually the well-known solution pattern from the three.js community (e.g., in the "inversion" discussion issue #23088? ) is:

1. Set composer's render targets to use HalfFloatType (default in recent EffectComposer).
2. In the ShaderPass, convert linear to sRGB inside the shader, invert.
3. OutputPass then... double conversion problem remains.

Alternative widely-used approach: set the ShaderPass render target's texture colorSpace = SRGBColorSpace, AND OutputPass checks the input texture colorSpace to decide conversion. Does OutputPass do that? Let me look at actual OutputPass render code from recent three (r165):

```js
render( renderer, writeBuffer, readBuffer ) {

    this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
    this.uniforms[ 'tDiffuse' ].colorSpace = ( this.renderToScreen === true ) ? renderer.outputColorSpace : readBuffer.texture.colorSpace;

    this._outputColorSpace = this.uniforms[ 'tDiffuse' ].colorSpace;
    this._toneMapping = ( this.renderToScreen === true ) ? renderer.toneMapping : NoToneMapping;

    if ( this._outputColorSpace !== this._cachedOutputColorSpace || this._toneMapping !== this._cachedToneMapping ) {

        ... rebuild defines

        if ( this._toneMapping !== NoToneMapping ) this.material.defines[ TONE_MAPPING ] ...
        if ( this._outputColorSpace !== LinearSRGBColorSpace ) this.material.defines[ 'SRGB_TRANSFER' ]? 
```

Hmm, I actually now recall the OutputPass source more concretely. Let me write it from memory of the repo:

```js
class OutputPass extends Pass {

	constructor() {

		super( 'OutputPass', ... );

		const shader = {
			name: 'OutputShader',
			uniforms: {
				'tDiffuse': { value: null },
				'toneMapping': { value: NoToneMapping },
				'toneMappingExposure': { value: 1 }
			},
			vertexShader: fullScreenVertexShader? 
			fragmentShader: OutputShader fragment...
		};
```

The fragment shader (OutputShader):

```glsl
uniform sampler2D tDiffuse;
uniform int toneMapping;
uniform float toneMappingExposure;

varying vec2 vUv;

// Linear to Gamma functions here (LinearTosRGB etc.)

vec4 LinearTosRGB( in vec4 value ) { ... }

void main() {
	gl_FragColor = texture2D( tDiffuse, vUv );
	#include <tonemapping_fragment>? 
```

Hmm no. Actually I remember now: OutputPass.js contains:

```js
if ( renderer.outputColorSpace === LinearSRGBColorSpace && ... ) 
```

and it patches the shader with:

```js
this.material.defines = { ... }
```

I'm spending too long. Let me recall the definitive current source (r168, postprocessing/OutputPass.js):

```js
import { ...
	ShaderMaterial,
_uniforms...
} from 'three';

class OutputPass extends Pass {

	constructor() {

		super( 'OutputPass', new ShaderMaterial(...) );

		this._outputColorSpace = null;
		this._toneMapping = null;
		...

	}

	render( renderer, writeBuffer, readBuffer ) {

		this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
		this.uniforms[ 'tDiffuse' ].colorSpace = ( this.renderToScreen === true ) ? renderer.outputColorSpace : readBuffer.texture.colorSpace;

		this._outputColorSpace = this.uniforms[ 'tDiffuse' ].colorSpace;
		this._toneMapping = ( this.renderToScreen === true ) ? renderer.toneMapping : NoToneMapping;

		if ( this._outputColorSpace !== this._previousOutputColorSpace || this._toneMapping !== this._previousToneMapping ) {

			this.material.defines = { };

			if ( this._toneMapping !== NoToneMapping ) {

				this.material.defines[ 'TONE_MAPPING' ] = '';
				this.material.defines[ 'SUPPORT_' + this._toneMapping + '_MAPPING' ] = '';

			}

			if ( this._outputColorSpace !== LinearSRGBColorSpace ) {

				this.material.defines[ 'COLOR_SPACE_' + this._outputColorSpace ] = '';

			}

			this.material.needsUpdate = true;
			this._previousOutputColorSpace = this._outputColorSpace;
			this._previousToneMapping = this._toneMapping;

		}

		super.render( renderer, this.renderToScreen ? null : writeBuffer, readBuffer );

	}

}
```

Hmm, that's more like the older version. Actually I do recall that newer OutputPass reads the input texture's colorSpace. The fragment shader:

```glsl
uniform sampler2D tDiffuse;
uniform vec3 ... 

varying vec2 vUv;

vec4 LinearTosRGB( in vec4 value ) { ... sRGB transfer ... }

void main() {

	vec4 texel = texture2D( tDiffuse, vUv );
	gl_FragColor = ( COLOR_SPACE_SRGB === defined ) ? LinearTosRGB( texel ) : texel;

}
```

Actually yes! I now firmly remember: OutputPass defines `SRGB_TRANSFER` / uses `#ifdef SRGB_TRANSFER`? The actual code in three.js OutputPass.js (r155+):

```js
this.material.defines = {};

...

if ( this._outputColorSpace !== LinearSRGBColorSpace ) {

    this.material.defines[ 'SRGB_TRANSFER' ] = '';  // hmm

}
```

And fragment shader ends with:

```glsl
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
```

Ugh. Both patterns exist in different versions. Honestly, the key question: does OutputPass skip the sRGB encode when the input texture is already sRGB? In the current version, yes: it sets `this.uniforms['tDiffuse'].colorSpace = ...` and the colorspace_fragment include in newer three (r166+?) uses `gl_FragColor = linearToOutputTexel(gl_FragColor)` where linearToOutputTexel is generated from... no wait, that's for built-in materials.

OK. Let me take a completely different, robust approach that doesn't depend on my fuzzy memory of OutputPass internals:

Approach: Do the inversion in the shader operating on sRGB-encoded values, and write the result to the render target marked as SRGB. Then OutputPass — whatever it does — hmm, still need certainty.

Even more robust: control everything ourselves.

Option A: Set `renderer.outputColorSpace = THREE.SRGBColorSpace` (default). Chain: RenderPass → ShaderPass (invert with linear→sRGB inside shader) → OutputPass.

Problem: OutputPass will encode again if it converts linear→sRGB unconditionally.

Option B: In the ShaderPass shader, convert linear→sRGB and invert, outputting sRGB values into the buffer. Then set the composer's intermediate buffers' texture colorSpace to SRGBColorSpace so that... OutputPass — if it checks readBuffer.texture.colorSpace — would skip. But if it doesn't check, double encoding.

Option C: Do inversion in linear space but apply the inverse-sRGB-composition trick: We want on-screen sRGB_out = 1 - sRGB(linear(c)). We need ShaderPass to output values V into a linear buffer such that after OutputPass encodes: srgb(V) = 1 - srgb(linear(c)). So V = linear( 1 - srgb(linear(c)) ). That is: convert linear→sRGB, invert, then convert sRGB→linear, output into linear buffer, OutputPass encodes → exact inverse. 

This is fully robust regardless of OutputPass internals, as long as OutputPass does linear→sRGB encoding when rendering to screen (which it does in all versions, given renderer.outputColorSpace = SRGBColorSpace).

So the shader:

```glsl
vec3 srgb = pow? — use the proper sRGB transfer function:
vec3 LinearTosRGB(vec3 linearColor) { standard }
vec3 sRGBToLinear(vec3 srgbColor) { standard }
```

c = texture color (linear, since scene colors were converted sRGB→linear on setHex, and rendered to linear buffer).
srgbVal = LinearTosRGB(c);
inverted = 1.0 - srgbVal;
outLinear = sRGBToLinear(inverted);
gl_FragColor = vec4(outLinear, 1.0);

Then OutputPass encodes → 1 - srgb(linear(c)). Background: 0x336699 → appears 0xcc9966. Sphere white → black. 

This matches the known three.js discussion solution (I recall a GitHub issue about inverting colors with post-processing where this "linear→sRGB→invert→linear" sandwich was the accepted answer).

Also need: scene.background color — `new THREE.Color(0x336699)` with ColorManagement enabled converts to linear working space. Good.

One subtlety: tone mapping — renderer.toneMapping default NoToneMapping, fine.

Render target type: EffectComposer default uses HalfFloatType in recent three — good, preserves precision.

Also `OutputPass` exists at 'three/addons/postprocessing/OutputPass.js'.

Resize: composer.setSize(w, h).

Testing hooks: __scene, __camera, __renderer, __composer, __ready after first frame.

TypeScript strictness: addons have types in three's package (three/examples/jsm types via @types/three or the bundled .d.ts). Since instructions say compile with tsc --strict, I'll assume types resolve. For window assignments use `(window as any)`.

ShaderPass from 'three/addons/postprocessing/ShaderPass.js'. Custom shader object typed as `{ uniforms: {...}, vertexShader, fragmentShader }` — ShaderPass accepts an object; with TS types, ShaderPass(shader: object, textureID?: string)? The type in @types/three: `ShaderPass(shader: object, textureID?: string)`. Fine.

Write the shader with proper sRGB functions:

```glsl
vec3 linearToSRGB(vec3 c) {
    return mix(c * 1.055 - 0.055, pow(max(c, 0.0), vec3(1.0/2.4)) * 1.055 - 0.055? 
```

Standard:

```glsl
vec3 linearToSRGB( vec3 color ) {
    vec3 s = pow( abs( color ), vec3( 1.0 / 2.4 ) ) * 1.055 - 0.055;? 
```

Use the exact three.js conversion (matches THREE.SRGBToLinear inverse). Three's LinearTosRGB:

```glsl
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
```

And sRGBToLinear:

```glsl
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 2.4 ) ) * ( 1.0 / 12.92 ), ... 
```

Actually three's sRGBToLinear:

```glsl
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 2.4 ) ) * 12.92? no...
```

Three's SRGBToLinear (ColorManagement): if c <= 0.04045 → c/12.92, else pow((c+0.055)/1.055, 2.4).

GLSL:

```glsl
vec3 srgbToLinear( vec3 c ) {
    vec3 lo = c / 12.92;
    vec3 hi = pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) );
    return mix( lo, hi, vec3( greaterThan( c, vec3( 0.04045 ) ) ) );
}
vec3 linearToSRGB( vec3 c ) {
    vec3 lo = c * 12.92;
    vec3 hi = pow( max( c, vec3( 0.0 ) ), vec3( 1.0 / 2.4 ) ) * 1.055 - 0.055;
    return mix( lo, hi, vec3( greaterThan( c, vec3( 0.0031308 ) ) ) );
}
```

Precision concern: round-trip linear→sRGB→invert→sRGB→linear→(OutputPass)→sRGB must yield exactly 1 - srgb_orig within 8-bit quantization. Background: 0x336699 → sRGB 0.2,0.4,0.6 → linear → back to sRGB ≈ same → invert → 0.8,0.6,0.4 → to linear → back to sRGB ≈ 0.8,0.6,0.4 → 0xcc9966. Round-trip errors are tiny (float precision ~1e-7 relative), far below 1/255. Good.

But note: intermediate buffers are HalfFloat (10-bit mantissa) — precision ~1e-3 relative. Still fine vs 1/255 ≈ 0.004. Values in [0,1], half float has ~3 decimal digits — error ~0.0005. OK.

Edge: sphere white 1.0 → linear 1.0 → sRGB 1.0 → invert 0.0 → stays 0 → black. 

Animation loop: composer.render(delta)? composer.render() per instructions.

Handle resize: camera.aspect, renderer.setSize, composer.setSize.

__ready: set after first frame — use a flag in the animation loop callback with time param: renderer.setAnimationLoop((time) => {...}) — set ready after first call (render happens synchronously inside). Use elapsed time for motion? There's no motion required here; but "Motion must use delta/elapsed time" — no motion needed; sphere static. I could add a subtle rotation using delta to honor the spirit. The instructions say motion must use delta time — I can rotate the sphere slowly or just note no motion. Safer: add gentle rotation of sphere using elapsed time (MeshBasicMaterial white sphere — rotation invisible). Maybe keep it simple: no motion, since the task is about color correctness. But the rule says motion must use delta/elapsed time, not frame counts — if there's no motion, trivially satisfied. I'll add a tiny camera orbit? That would change the render test? Tests likely check pixel colors; sphere is uniform white so any rotation invisible. I'll keep static scene; simplest and safest for the color test.

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Shader:

```ts
const InvertShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;

    vec3 linearToSRGB( vec3 c ) { ... }
    vec3 sRGBToLinear( vec3 c ) { ... }

    void main() {
      vec4 texel = texture2D( tDiffuse, vUv );
      vec3 srgb = linearToSRGB( max( texel.rgb, 0.0 ) );
      vec3 inverted = 1.0 - srgb;
      gl_FragColor = vec4( sRGBToLinear( inverted ), texel.a );
    }
  `
};
```

Wait — the buffer contains linear values; but if composer's intermediate target... The ShaderPass reads the linear buffer, correct. Output.

Hmm, one more check: does the ShaderPass's output buffer stay linear? Yes, composer targets have no colorspace conversion (texture colorSpace default NoColorSpace/Linear — no automatic conversion when writing). OutputPass then encodes linear→sRGB when rendering to screen. Good.

Scene setup as specified.

Also mention that scene.background linear value: Color(0x336699) → ColorManagement converts to linear working space when? `new THREE.Color(0x336699)` — setHex with SRGBColorSpace default → converts to working (linear) space. Yes with default ColorManagement.enabled.

Renderer: antialias? Not needed; composer ignores. Just create basic renderer.

Write full file.