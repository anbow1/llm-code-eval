Key challenge: with EffectComposer, the render pass renders into a linear render target (Three r152+ uses half-float render targets, no color space conversion). Then OutputPass does tone mapping + linear→sRGB conversion. If we put the ShaderPass inversion before OutputPass, we invert linear values, and after sRGB conversion the result isn't the exact inverse of the sRGB values.

Requirement: on-screen final sRGB color = 255 - original sRGB color (exact byte-level inverse? "0x336699 → 0xcc9966" — check: 0x33=51, 255-51=204=0xcc. 0x99=153, 255-153=102=0x66. 0x66=102, 255-102=153=0x99. Yes, exact byte inverse).

The "without the effect" screen would be: linear color from scene → OutputPass converts linear→sRGB (with tone mapping NoToneMapping default... actually renderer.toneMapping default is NoToneMapping, and OutputPass applies renderer's tone mapping and colorSpace conversion). So without effect, screen shows sRGB_encode(linear).

With effect we want screen = 1 - sRGB_encode(linear).

So the inversion must happen AFTER the linear→sRGB conversion. Options:
1. Put ShaderPass after OutputPass. But then shader operates in output color space; composer's final pass writes to screen... If ShaderPass is last, its output goes to screen. But OutputPass converts to sRGB and if a pass comes after, the "renderToScreen" handling — modern EffectComposer automatically sets the last pass to renderToScreen. The intermediate passes render to render targets. But render targets created by EffectComposer — their color space? In newer three versions, EffectComposer render targets use... Hmm, actually the OutputPass renders to a render target whose texture colorSpace should be sRGB? Actually OutputPass shader does the conversion manually: it applies tone mapping then linear→sRGB in the shader itself, writing sRGB-encoded values. When writing to a render target, three checks texture colorSpace... EffectComposer's default render targets are created with HalfFloatType; colorSpace of the render target textures defaults to NoColorSpace (linear). So OutputPass writing to a target: OutputPass's shader does the conversion itself regardless. Actually in three's OutputPass implementation, it checks `this.renderToScreen` — no wait, let me recall.

OutputPass source (r160ish):

```js
render( renderer, writeBuffer, readBuffer ) {
    this.uniforms['tDiffuse'].value = readBuffer.texture;
    this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;
    // rebuild defines if tone mapping / color space changed
    if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
        ...
        if ( this._toneMapping !== NoToneMapping ) ... defines
        if ( this._outputColorSpace !== NoColorSpace ) ... defines SRGB_TRANSFER
        ...
    }
    if ( this.renderToScreen ) {
        renderer.setRenderTarget( null );
        this._fsQuad.render( renderer );
    } else {
        renderer.setRenderTarget( writeBuffer );
        ...
    }
}
```

The OutputPass fragment shader includes colorspace conversion via `#include <colorspace_fragment>` which converts according to the target's... actually colorspace_fragment uses the shader chunk that converts to the output color space defined at compile time (linearToOutputTexel based on renderer.outputColorSpace at compile). Hmm, in the ShaderMaterial path it's different.

Anyway, simplest robust approach: put the inversion ShaderPass AFTER OutputPass. Then:
- RenderPass renders linear scene into linear RT.
- OutputPass applies tone mapping (none) + sRGB conversion, writing sRGB values into another RT (or screen).
- ShaderPass inverts: 1 - sRGB value.

But precision: sRGB conversion happens in HalfFloat RT, values like 51/255 → encoded value approx 0.0791... Then 1 - that → written to HalfFloat RT, then output to screen — final pass writes to canvas with no further conversion (colorspace_fragment for the final pass... ShaderPass uses ShaderMaterial; the standard fragment shader for ShaderPass copy doesn't include colorspace_fragment, so no double conversion). Then writing to the canvas (which is interpreted as sRGB bytes). The value written to the drawing buffer: gl_FragColor = vec4(1-c) where c is sRGB-encoded float. Canvas converts float → uint8 by rounding. 1 - 0.0791... hmm need to check rounding.

Actually there's a subtlety: does writing to canvas framebuffer apply any conversion? When renderer.outputColorSpace = SRGBColorSpace, three compiles materials' colorspace_fragment to convert linear→sRGB for the final draw. But ShaderPass material is a ShaderMaterial — those also get colorspace_fragment? No — ShaderMaterial user shaders don't include the chunk unless user adds it. The CopyShader doesn't include it. So no conversion — good.

But there's a known caveat: when a render target has colorSpace SRGB, texture sampling converts sRGB→linear automatically (EXT_sRGB). EffectComposer default RTs are linear NoColorSpace, so sampling gives raw stored values.

Wait — but does OutputPass writing sRGB-encoded values into a NoColorSpace RT work correctly? Yes, OutputPass explicitly performs the conversion in shader (`#include <colorspace_fragment>` with defines set... actually OutputPass shader ends with `gl_FragColor = linearToOutputTexel( gl_FragColor );`? Let me recall OutputPass shader:

```glsl
gl_FragColor = vec4( 1.0 );
...toneMapping...
#include <colorspace_fragment>
```

Hmm, actually OutputPass fragment:

```glsl
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

And it rebuilds the material when renderer.outputColorSpace or toneMapping changes, using WebGLProgram that sets those chunks based on... For ShaderMaterial, tonemapping_fragment and colorspace_fragment chunks: colorspace_fragment does `gl_FragColor = linearToOutputTexel( gl_FragColor );` and linearToOutputTexel is generated per-program based on renderer.outputColorSpace — but for ShaderMaterial rendered to a render target... Hmm, the program's output color space is determined by the current render target? In three, when rendering to a render target, the output color space used for program compilation is the render target texture's colorSpace (if set) else... Actually `_getProgramCacheKey` includes outputColorSpace, and getProgram computes `parameters.outputColorSpace = ( currentRenderTarget === null ) ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget ? ... : NoColorSpace )`? Hmm. In recent three: `const outputColorSpace = currentRenderTarget === null ? renderer.outputColorSpace : ( currentRenderTarget.texture.colorSpace === SRGBColorSpace ? ... )`. Let me not get lost in internals.

Actually the OutputPass in three explicitly handles this: it checks render target's texture colorSpace? Let me recall actual OutputPass.render code (r165):

```js
render( renderer, writeBuffer, readBuffer ) {
    this.uniforms['tDiffuse'].value = readBuffer.texture;
    this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;
    if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
        this._outputColorSpace = renderer.outputColorSpace;
        this._toneMapping = renderer.toneMapping;
        this.material.defines = {};
        if ( ColorManagement.getTransfer( this._outputColorSpace ) === SRGBTransfer ) this.material.defines.SRGB_TRANSFER = '';
        if ( this._toneMapping === ACESFilmicToneMapping ) ... etc
        this.material.needsUpdate = true;
    }
    ...
    renderer.setRenderTarget( this.renderToScreen ? null : writeBuffer );
    this._fsQuad.render( renderer );
}
```

Hmm wait, it uses renderer.outputColorSpace regardless of target — this could be a bug-ish behavior but it means OutputPass writes sRGB-encoded values into the RT. Actually I recall there was discussion; the OutputPass applies the output color space conversion unconditionally because the composer chain is expected to output to screen. Yes — OutputPass applies conversion based on renderer.outputColorSpace.

Hmm, actually wait. If the ShaderPass comes after OutputPass, and the RTs are HalfFloat with NoColorSpace... the ShaderPass writes 1-c to... hmm, but EffectComposer's writeBuffer after OutputPass — the ping pong. Fine.

Alternatively — simpler and cleaner: do the sRGB conversion inside the inversion shader itself, and place the ShaderPass BEFORE OutputPass... no wait, then OutputPass would convert again — double conversion. Unless we make our ShaderPass the last pass and skip OutputPass? But requirement says use OutputPass.

Option B: Order: RenderPass → OutputPass → ShaderPass(invert). This gives screen = 1 - sRGB(linear), which is exactly what's required. Precision concerns: HalfFloat RT has plenty of precision for 8-bit quantization? The sRGB-encoded value stored in HalfFloat is not exactly the 8-bit value; e.g., linear 0x33 → ColorManagement: color 0x336699 as scene.background — scene.background color 0x336699 is converted to linear via ColorManagement (working color space linear-sRGB): linear = sRGBToLinear(51/255) etc.

Without effect: screen shows: linear float → sRGB encode → quantize to 8 bits → should give exactly 0x336699? The sRGB encode then 8-bit quantization of sRGBToLinear followed by LinearToSRGB: sRGBToLinear(x) then linearToSRGB(x) = x exactly (up to float precision), so quantized gives 51 → 0x33. Yes round-trips.

With effect: screen = round(255 * (1 - sRGB_encode(linear))). sRGB_encode(sRGBToLinear(51/255)) ≈ 51/255 exactly? mathematically exact round trip; float error tiny. 1 - 51/255 = 204/255 = 0.8 exactly? 1 - 0.2 = 0.8; 51/255 = 0.2 exactly in decimal but in binary 0.2 not exact, 1-0.2 rounds to nearest double 0.8 (which is same as float nearest to 0.8). Then canvas conversion: renderer writes gl_FragColor to backbuffer — the framebuffer is UNPACK... the canvas is 8-bit; the value 0.8 → 0.8*255 = 204 → round to 204. Good. But precision through HalfFloat: HalfFloat has ~3 decimal digits; 0.8 in half float: nearest half to 0.8 is 0.80078125? Half float precision around 0.8: exponent -1, mantissa 10 bits → step 2^-11 ≈ 0.000488. 0.8 → 0.80078... then *255 = 204.2 → rounds to 204. OK.

But wait: careful about the chain: RenderPass renders scene to RT0 (linear, HalfFloat). Background color: clearing — the renderer converts clear color to the render target's color space / working space. scene.background color is used with `_background.setStyle` conversions... Background colors are converted to the working color space (linear) when rendering. Good.

Then OutputPass reads RT0, applies tonemapping (NoToneMapping → no op) and sRGB transfer, writes to RT1 (still NoColorSpace, so raw sRGB-encoded stored).

Then ShaderPass inverts, writes to screen (renderToScreen). ShaderPass's material — plain ShaderMaterial with our shader; when rendering to screen, does three apply colorspace conversion for ShaderMaterial? The colorspace_fragment chunk is only in shaders that include it. Our custom shader doesn't include it, so gl_FragColor written raw. But! There's another subtlety: when rendering to the default framebuffer, the drawing buffer is typically interpreted... no, WebGL just writes the float values and converts to 8-bit via rounding. Good.

However — potential issue: three might apply the "output color space" via the material's... no, only via chunk. OK.

But hmm — there's another wrinkle: does ShaderPass's output color space get handled because renderToScreen? No. Raw write. 

Alternative Option C: RenderPass → ShaderPass(invert in linear with proper conversion?) — harder to get exact byte inverse because sRGB encode is non-monotonic-linear. The requirement says "exact inverse" essentially: 0x336699→0xcc9966. Only inverting post-sRGB guarantees this. So Option B.

But one concern: OutputPass before the final pass — is OutputPass allowed mid-chain? It renders to writeBuffer; fine.

Also need composer to handle: EffectComposer sizes. Also `renderer.toneMapping` default NoToneMapping, outputColorSpace default SRGBColorSpace. Good.

Hmm, wait: but there's an issue with OutputPass when it's NOT renderToScreen: writes sRGB-encoded values into a HalfFloat RT with colorSpace NoColorSpace — no conversion on read. Then ShaderPass samples raw values. 

But actually — I want to double-check OutputPass behavior. Let me look at actual three.js OutputPass source (from r160):

```js
class OutputPass extends Pass {
	constructor() {
		const shader = OutputShader;
		...
	}
	render( renderer, writeBuffer, readBuffer ) {
		this.uniforms['tDiffuse'].value = readBuffer.texture;
		this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;
		// rebuild defines if required
		if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
			this._outputColorSpace = renderer.outputColorSpace;
			this._toneMapping = renderer.toneMapping;
			this.material.defines = {};
			if ( ColorManagement.getTransfer( this._outputColorSpace ) === SRGBTransfer ) this.material.defines.SRGB_TRANSFER = '';
			if ( this._toneMapping === ACESFilmicToneMapping ) this.material.defines.ACES_FILMIC_TRANSFER = '';
			...
			this.material.needsUpdate = true;
		}
		...
	}
}
```

And OutputShader fragment:

```glsl
uniform float toneMappingExposure;
...
vec4 LinearTosRGB( in vec4 value ) { ... }
void main() {
	gl_FragColor = vec4( 1.0 );
	gl_FragColor.rgb = toneMapping( texture2D( tDiffuse, vUv ).rgb );
	if ( SRGB_TRANSFER ) gl_FragColor = LinearTosRGB( gl_FragColor );
}
```

Approximately. Yes, it applies sRGB transfer regardless of target. So Option B works.

Hmm, but actually — hold on. Some versions of three's OutputPass check `this.renderToScreen` or the target color space? I believe since its introduction it just uses renderer.outputColorSpace. In newer versions (r15x+), there was a change: "OutputPass: respect renderer output color space only when rendering to screen"? I don't think so. Let me think about what test expects: The test presumably checks pixel colors of canvas center/edge via readPixels or screenshot. The safest widely-compatible approach that satisfies "0x336699 appears as 0xcc9966":

Option B relies on OutputPass applying sRGB conversion into the intermediate buffer. I'm fairly confident that's the behavior: OutputPass always converts (that's its purpose — it must convert since everything upstream is linear).

Actually wait, there's a real concern: in newer three (r155+?), EffectComposer's default render target... In r152+, EffectComposer creates its render target with `type: HalfFloatType`, colorSpace defaults... `new WebGLRenderTarget(w, h, { type: HalfFloatType })` — texture.colorSpace default is NoColorSpace. Fine.

Also, does rendering the ShaderPass (raw write of sRGB-encoded values) to the canvas cause three to think the canvas... The renderer's `outputColorSpace = SRGBColorSpace` matters for materials that include colorspace_fragment — our ShaderPass shader doesn't include it. Good.

But wait — another consideration: maybe simpler to avoid OutputPass-before-invert ordering issue: put invert shader last but perform inversion on linear values converted appropriately? We want screen = 1 - E(L) where E is sRGB encode. We could keep shader before OutputPass and invert as: output = E(1 - E⁻¹... no. If shader runs in linear space and then OutputPass encodes: screen = E(1 - L). We want 1 - E(L). These differ. Unless our shader does: read linear L, compute s = E(L) (encode in shader), invert: 1 - s, then decode back to linear: E⁻¹(1-s), then OutputPass encodes again: E(E⁻¹(1-s)) = 1-s = 1 - E(L). That also works and keeps OutputPass last! But it requires implementing sRGB encode/decode in GLSL with exact precision to round-trip... the round trip through float should be fine. But that's more fragile. Hmm.

Actually is it fragile? E⁻¹(E(x)) = x with float precision; then E again gives same result. The concern is the final quantization: screen value = round(255 * (1 - s)) where s computed in shader. Same as option B essentially. Both fine.

Option B ordering: RenderPass → OutputPass → InvertPass. It's clean and the comment explains it. But is putting OutputPass before other passes a common pattern? Actually yes — three docs say if you add passes after OutputPass... hmm, actually the recommended order is OutputPass last. But for exact-inversion semantics, invert after sRGB conversion.

Alternatively Option D: keep order RenderPass → Invert → Output, but make the invert shader invert in sRGB space after converting: shader reads linear L, computes s=LinearTosRGB(L), outputs E⁻¹(1-s) (linear), OutputPass then converts → 1-s. This keeps OutputPass last (recommended). I'll go with this? Both work. Which is more robust across three versions?

If OutputPass behavior varies (e.g., checks whether current render target has SRGB colorSpace and skips conversion), then:
- Option B could break (double or zero conversion).
- Option D: shader does encode+invert+decode explicitly; then OutputPass does its conversion. If OutputPass always converts: screen = 1-s. If OutputPass converts only when rendering to screen... in option D OutputPass is last so it renders to screen anyway. If OutputPass somehow skipped conversion (it won't — it defines SRGB_TRANSFER based on renderer.outputColorSpace), screen = E⁻¹(1-s) which would be wrong-ish but close? No, wrong.

Option B risk: if OutputPass converts only when rendering to screen... but it's not screen here → no conversion → invert linear → wrong. Does OutputPass ever behave that way? Checking my memory of the actual source... In r165 OutputPass:

```js
render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
    this.uniforms['tDiffuse'].value = readBuffer.texture;
    this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;

    if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
        ...defines...
    }

    if ( this.renderToScreen === true ) {
        renderer.setRenderTarget( null );
        this._fsQuad.render( renderer );
    } else {
        renderer.setRenderTarget( writeBuffer );
        this._fsQuad.render( renderer );
    }
}
```

Hmm, wait — actually I recall in some version there's special handling with `renderer.outputColorSpace` vs render target. In r167+ there was a change where passes rendering to render targets use NoColorSpace... Actually the WebGLRenderer sets `parameters.outputColorSpace` for programs: when rendering to a render target whose texture colorSpace is NoColorSpace (linear), colorspace_fragment converts to linear (no-op). BUT for ShaderMaterial/OutputPass, the chunk `colorspace_fragment`... OutputShader includes `#include <colorspace_fragment>`. When rendering OutputPass's ShaderMaterial to a NoColorSpace render target, the generated linearToOutputTexel would be identity! Hmm — is that right?

In three.js WebGLProgram, `getTexelEncodingFunction`/`getEncodingComponents( parameters.outputColorSpace )` — and parameters.outputColorSpace is determined in WebGLPrograms.getParameters: 

```js
const currentRenderTarget = renderer.getRenderTarget();
...
outputColorSpace: currentRenderTarget === null ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace ),
```

Hmm — in recent versions (r15x), when rendering to a non-XR render target, outputColorSpace for program compilation is LinearSRGBColorSpace (i.e., no conversion), because read/write buffers are linear and the final conversion happens... wait, then how does normal scene rendering to canvas get sRGB? currentRenderTarget === null → renderer.outputColorSpace. Yes.

So: OutputPass's ShaderMaterial with `#include <colorspace_fragment>` — when rendering to writeBuffer (a render target), the colorspace_fragment would compile to a no-op (linear). That would mean OutputPass does NOT convert when writing to a buffer?! But that contradicts the whole design of the OutputPass...

Let me actually recall OutputShader source precisely (three r160, examples/jsm/postprocessing/OutputPass.js):

```js
const OutputShader = {
	name: 'OutputShader',
	uniforms: { tDiffuse: {...}, toneMappingExposure: {...} },
	vertexShader: `...`,
	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform float toneMappingExposure;
		varying vec2 vUv;
		#ifdef ACES_FILMIC_TRANSFER ...
		...
		vec4 LinearTosRGB( in vec4 value ) {
			vec3 X = min(vec3( value.rgb * 12.92 ), vec3( 1.74179311 ));
			...
			return vec4( mix( X, Y, vec3( GREATER_THAN( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
		}
		void main() {
			gl_FragColor = texture2D( tDiffuse, vUv ).rgb;
			...
		`,
};
```

Hmm, and the render method:

```js
render( renderer, writeBuffer, readBuffer ) {
    this.uniforms['tDiffuse'].value = readBuffer.texture;
    this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;

    // rebuild defines if required
    if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
        this._outputColorSpace = renderer.outputColorSpace;
        this._toneMapping = renderer.toneMapping;
        this.material.defines = {};
        if ( ColorManagement.getTransfer( this._outputColorSpace ) === SRGBTransfer ) this.material.defines.SRGB_TRANSFER = '';
        if ( this._toneMapping === LinearToneMapping ) this.material.defines.LINEAR_TONE_MAPPING = '';
        else if ( this._toneMapping === ReinhardToneMapping ) this.material.defines.REINHARD_TONE_MAPPING = '';
        ...
        this.material.needsUpdate = true;
    }

    // rebuild shader if required
    ...

    if ( this.renderToScreen === true ) {
        renderer.setRenderTarget( null );
        this._fsQuad.render( renderer );
    } else {
        renderer.setRenderTarget( writeBuffer );
        this._fsQuad.render( renderer );
    }
}
```

And the fragment shader main:

```glsl
void main() {
    gl_FragColor = texture2D( tDiffuse, vUv );
    #ifdef LINEAR_TONE_MAPPING
        gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
    ...
    #endif
    #ifdef SRGB_TRANSFER
        gl_FragColor = LinearTosRGB( gl_FragColor );
    #endif
}
```

Hmm — I think that's roughly right: it doesn't rely on the colorspace_fragment chunk; it has its own explicit LinearTosRGB guarded by the SRGB_TRANSFER define. Yes! I'm fairly confident OutputPass has custom LinearTosRGB/LinearToACES functions and defines, not the built-in chunks. That means the conversion happens regardless of the render target color space. 

Actually wait, hmm. Let me reconsider — I remember the OutputShader containing functions like `LinearToneMapping`, `ReinhardToneMapping`, `OptimizedCineonToneMapping`, `ACESFilmicToneMapping` and sRGB functions, with the render method setting defines from renderer state. Yes, that's correct — from the PR that introduced OutputPass (r152), it does its own conversions via defines.

Hmm, but actually there's a subtlety: does the FullScreenQuad render use a ShaderMaterial that also gets the built-in chunks appended? ShaderMaterial doesn't get chunks unless included. And if the shader includes `#include <colorspace_fragment>`, then when rendering to a RT the program would use LinearSRGB → no-op, overriding. Let me just check: does OutputShader include `<tonemapping_fragment>` or `<colorspace_fragment>`? I believe NOT — it has custom code. Actually... I genuinely am torn. Let me think about the actual file content from GitHub (r160):

```js
const OutputShader = {
	name: 'OutputShader',
	uniforms: {
		'tDiffuse': { value: null },
		'toneMappingExposure': { value: 1 }
	},
	vertexShader: /* glsl */`
		uniform vec2 resolution... no
```

Hmm. Actually the vertex shader:

```glsl
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
```

fragmentShader:

```glsl
precision highp float;
uniform sampler2D tDiffuse;
uniform float toneMappingExposure;
varying vec2 vUv;
#ifdef LINEAR_TONE_MAPPING
vec3 LinearToneMapping( vec3 color ) { return color * toneMappingExposure; }
#endif
#ifdef REINHARD_TONE_MAPPING
vec3 ReinhardToneMapping( vec3 color ) { color *= toneMappingExposure; return saturate( color / ( vec3( 1.0 ) + color ) ); }
#endif
...
#ifdef ACES_FILMIC_TONE_MAPPING ...
#ifdef SRGB_TRANSFER
vec4 LinearTosRGB( in vec4 value ) { ... }
#endif
void main() {
	gl_FragColor = texture2D( tDiffuse, vUv );
	#ifdef LINEAR_TONE_MAPPING
	...
	#endif
	#ifdef SRGB_TRANSFER
		gl_FragColor = LinearTosRGB( gl_FragColor );
	#endif
}
```

Yes — I'm now fairly confident this is the actual structure. OutputPass does its own conversion via defines based on renderer.outputColorSpace, regardless of the current render target. 

So Option B (RenderPass → OutputPass → InvertPass) works: OutputPass writes sRGB-encoded values into the linear HalfFloat RT, then the invert pass inverts raw values and writes to screen without further conversion.

Hmm, but one more check on option B: when the InvertPass (last pass) renders to screen — it uses ShaderMaterial with our custom shader; no colorspace chunk → raw write. But the framebuffer! The WebGL canvas default framebuffer — three renders with `renderer.outputColorSpace = SRGBColorSpace`... no automatic conversion at the GL level (no sRGB framebuffer). Raw 8-bit write. Good.

But wait — what about ShaderMaterial outputColorSpace handling: in WebGLPrograms, `parameters.outputColorSpace` matters only for chunks. Our shader doesn't use them. However, there's one more: ShaderPass replaces material with material from shader clone; uses `tDiffuse` uniform. We'll write our custom shader with a `color` uniform? No — just simple invert.

Hmm, but actually hold on — in even newer three versions (r165+?), I recall a change: "OutputPass now respects the output color space of the current render target." Let me think... There WAS a change related to `WebGLRenderer.getRenderTarget().texture.colorSpace`. In r155-ish, EffectComposer... I remember discussions in issues about chains: "When using OutputPass in the middle of a chain, the output is sRGB-encoded values in a linear buffer." The three docs example "webgl_postprocessing_3dlut" etc.

Actually, there's another consideration for robustness: what about inverting in the shader BEFORE OutputPass with encode-invert-decode (Option D)? This approach's correctness depends only on OutputPass performing the encode at the end (its documented purpose). And precision: E⁻¹(1 - E(L)) then E again. Round trip E⁻¹(E(x)) — with the analytic formula in float, tiny error ~1e-6 relative; final quantization: value near 1-s; distance to byte boundary — the concern is when 255*(1-s) is very close to x.5. For our specific test colors: 0x33→0xcc etc. 1-s where s ≈ 51/255: 255*(1-s) = 204.something tiny error, far from .5 boundary? 255*(1 - 51/255) = 204 exactly (ideal), error ±0.01 → 204.00±0.02 → rounds to 204. Fine. And for the sphere: white s=1 → 1-1=0 → black. Linear white = 1, E(1)=1, 1-1=0, decode 0, encode 0 → black. Good.

Option B precision: E(L) stored in HalfFloat. Half float around 0.2: step ≈ 0.000122 (exponent -3: 0.125–0.25, step 2^-13 ≈ 0.000122). 51/255=0.2 → stored 0.2000122 or so; 1 - that = 0.7999878 → *255 = 204.0 ±0.03 → 204. Fine.

Actually hmm, wait — in option B, after inversion the value passes through... the InvertPass writes to screen directly (it's last). If it's last, EffectComposer sets renderToScreen=true and the pass renders to writeBuffer? No — EffectComposer calls pass.render(renderer, writeBuffer, readBuffer) and if pass.renderToScreen, renderer writes to null. ShaderPass.render:

```js
if ( this.renderToScreen ) {
    renderer.setRenderTarget( null );
    this.fsQuad.render( renderer );
} else {
    renderer.setRenderTarget( writeBuffer );
    if ( this.clear ) renderer.clear();
    this.fsQuad.render( renderer );
}
```

Good — direct to screen.

But note: in option B, when InvertPass renders to writeBuffer (if it weren't last)... it's last, fine.

Which option to choose? The prompt says "order the passes (or convert in the shader) so this holds." Either is acceptable. Option B is simpler to explain and implement, and I'm confident about OutputPass behavior with its own defines. But risk: if in some three version OutputPass compiles colorspace conversion per-target (linear no-op to RT), option B breaks badly while option D survives only if OutputPass converts to screen... wait no: option D has OutputPass last (renders to screen). If OutputPass converted per-target: rendering to screen → converts linear→sRGB: screen = E(E⁻¹(1-s)) = 1-s. Correct! If OutputPass always converts: same, correct. So Option D is robust under BOTH behaviors. Option B only correct under "always converts". Therefore Option D is strictly more robust.

Wait, double-check option D under "per-target" behavior: chain: RenderPass (linear RT) → InvertPass (linear RT, shader does E, invert, E⁻¹) → OutputPass renders to screen: if it uses built-in chunk colorspace_fragment with outputColorSpace SRGB → converts E⁻¹(1-s) → 1-s. ✓. Under "always converts via defines": same. ✓. Under weird case where OutputPass does nothing (very old three without OutputPass — but OutputPass exists only r152+): screen = E⁻¹(1-s), wrong, but then the whole composer pipeline pre-r152 didn't do color management anyway. Also in r152+, OutputPass always converts (I'm fairly sure). OK, but Option D requires implementing accurate sRGB encode/decode in GLSL.

GLSL sRGB functions (matching three's math):

Encode (linear→sRGB):
```glsl
vec3 linearToSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}
```
Careful: pow(c, 1/2.4) for c=0 → pow(0, x) undefined-ish (0)? pow(0.0, 0.4167) = 0 in GLSL spec? pow(0, y) is undefined if y≤0, otherwise... spec: pow(x,y) undefined for x<0, x=0 and y<=0. y>0 → 0. OK but mix with step handles it; still compute pow(0,...)=0 fine.

Decode (sRGB→linear):
```glsl
vec3 sRGBToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
```

Also clamping: colors could exceed [0,1]? No tone mapping, background 0x336699 and white sphere — linear values in [0,1]. But safe to clamp after encode.

Also, the test mentions "exact inverse" — with option D, compute: read linear L (float, HalfFloat precision!), E(L), 1-E(L), E⁻¹, OutputPass E → 1-E(L). The HalfFloat storage of L: L = sRGBToLinear(51/255) ≈ 0.0331048. HalfFloat precision near 0.033: exponent -5 (0.03125–0.0625), step 2^-15 ≈ 3.05e-5. So L stored with error up to ~1.5e-5 → relative ~5e-4. E(L) then differs from 51/255 by ~dE/dL * err = 12.92*1.5e-5 ≈ 2e-4 → 255*(1-E) error ≈ 0.05 → rounds fine (204, far from boundary 203.5/204.5... ideal is exactly 204; error 0.05 keeps it in [203.95, 204.05] → 204 ✓).

Hmm wait, but actually — hmm, one more consideration for option D: is 0x33 in — wait, does the render target store L at HalfFloat, and the "without effect" case would also store at HalfFloat then convert to screen — the test says "final colors on screen must be exact inverse of what the screen would show without the effect", presumably test just checks 0x336699→0xcc9966 and white→black. Both options deliver within rounding.

Hmm, actually wait — I realize I should double check whether the sphere would be pure black. Without effect, white sphere on screen = 0xffffff. With effect = 0x000000. White linear = (1,1,1), stored exactly in HalfFloat. E=1, 1-1=0, decode 0, encode 0 → 0. ✓.

Background: (51,102,153)/255 in sRGB → linear each, invert post-encode. Result (204,153,102)/255 = 0xcc9966. ✓.

Now decide. Also need to handle: THREE.ColorManagement — scene.background = new THREE.Color(0x336699) — by default, Color constructor with hex: `new Color(0x336699)` — does it apply ColorManagement? Color.setStyle/ setHex default colorSpace = SRGBColorSpace in r152+, converting to working (linear). Yes.

Now, an important detail in option D: The invert shader must read linear values. The RenderPass output RT is HalfFloat linear — sampling raw. ✓.

Also renderer.outputColorSpace default is SRGBColorSpace (r152+). Good.

Also should the shader clamp? gl_FragColor = vec4(E⁻¹(1-E(L)), 1). Fine.

Actually — wait. Let me reconsider whether there is any double-gamma issue with the InvertPass writing to an intermediate linear RT and OutputPass reading it. In option D, InvertPass writes linear values (decoded) into HalfFloat RT (NoColorSpace) — stored raw, sampled raw. OutputPass encodes. ✓.

Edge case: three versions where EffectComposer's RenderPass render target... r152+: HalfFloatType. Before r152 (but OutputPass added exactly r152). Fine, target recent.

One more consideration: tone mapping — renderer.toneMapping default is NoToneMapping. OutputPass with NoToneMapping: no define → no tone mapping op. ✓. If someone set ACES, inversion exactness would fail, but default is fine. To be safe I could set renderer.toneMapping = THREE.NoToneMapping explicitly.

Now write the code.

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Scene, camera, sphere.

Invert shader: name it something. ShaderPass takes a shader object {uniforms, vertexShader, fragmentShader}. It clones uniforms via UniformsUtils.clone.

Shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 sRGBToLinear(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
void main() {
  vec3 linear = texture2D(tDiffuse, vUv).rgb;
  vec3 srgb = linearToSRGB(linear);   // what the screen would show (before 8-bit quantization)
  vec3 inverted = 1.0 - srgb;          // exact inverse in the display space
  gl_FragColor = vec4(sRGBToLinear(inverted), 1.0); // back to linear; OutputPass re-encodes
}
```

Note mix with vec3 step: step(vec3, vec3) fine.

Hmm — precision concern about doing encode then decode in the shader then encode again in OutputPass: E⁻¹(E(L)) vs L: relative float error ~1e-6; then E(E⁻¹(1-E(L))) vs 1-E(L): also tiny. Quantization: fine as analyzed.

Actually wait, there's one subtle concern in Option D: pow precision on some GPUs (mediump)? WebGL2 fragment shaders default highp. Add `precision highp float;`? ShaderPass material — three prepends precision. Fine.

Vertex shader standard:

```glsl
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Composer:

```ts
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(invertPass);
composer.addPass(new OutputPass());
```

Animation loop: composer.render(). Delta: not strictly needed since static scene, but use clock maybe rotate sphere? Requirement says motion must use delta — we can add slight rotation for fun, using clock.getDelta(). Keep sphere MeshBasicMaterial white; rotation doesn't change appearance, but satisfies the loop pattern. Or just composer.render() with elapsed. I'll add subtle rotation using delta to satisfy "motion must use delta/elapsed time".

Resize: camera.aspect, updateProjectionMatrix, renderer.setSize, composer.setSize.

Expose __scene, __camera, __renderer, __composer, __ready after first frame: set in loop with a flag.

renderer settings: renderer.setPixelRatio(window.devicePixelRatio)? composer.setPixelRatio too. Careful: pixel ratio affects readPixels tests? Tests likely use canvas screenshot at CSS pixel scale... If I set pixel ratio, canvas width = innerWidth * dpr; screenshots would be scaled; color values unaffected. Setting pixel ratio is common. But to keep things simple and deterministic, maybe skip setPixelRatio? Either fine. I'll include composer.setPixelRatio(renderer.getPixelRatio()) if I set it. Actually EffectComposer constructor takes renderer and reads pixel ratio itself: `this._pixelRatio = renderer.getPixelRatio()`. So if I set renderer pixel ratio BEFORE creating composer, it's picked up. I'll set renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) before composer creation, and in resize update both? composer.setPixelRatio exists. Keep simple: set once; on resize just setSize both. EffectComposer.setSize accounts for pixel ratio internally.

Also antialias: renderer antialias true — irrelevant since composer render targets. Fine.

Full code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(60?, ...) 
```

Camera default fov 50; spec just says at (0,0,4) looking at origin. Use fov 50 default or 60 — fine.

Sphere: `new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }))`. MeshBasicMaterial color 0xffffff → converted to linear working space (1,1,1). Good.

Add to scene. Camera.lookAt(0,0,0).

Renderer:

```ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
```

TS strict: DOM fine.

Invert shader object typed as any? ShaderPass constructor param type: it accepts `object | ShaderMaterial`? Signature: `constructor( shader: object | ShaderMaterial, textureID?: string )`. Hmm, in recent three types (three has its own .d.ts? Actually three ships types? @types/three separately; but the prompt says compile with tsc --strict — presumably with @types/three). ShaderPass type: `constructor(shader: object | ShaderMaterial, textureID: string)`. To be safe, define shader object as a plain const; passing object literal is fine.

Uniforms: `{ tDiffuse: { value: null as THREE.Texture | null } }` — ShaderPass clones; uniform typing could complain: UniformsUtils.clone expects `{ [uniform: string]: IUniform }`. Provide explicit type:

```ts
const InvertShader = {
  uniforms: {
    tDiffuse: { value: null } as { value: THREE.Texture | null }
  },
  ...
};
```

Hmm, `{ value: null as THREE.Texture | null }` — the object literal's value property type inferred as THREE.Texture | null. Then InvertShader's type: uniforms: { tDiffuse: { value: THREE.Texture | null } }. ShaderPass param type in @types/three: `shader` is typed as... looking at @types/three ShaderPass: `constructor(shader: object | Material, textureID?: string)`. I believe it's loosely typed (object). So passing fine.

Actually @types/three examples/jsm types: ShaderPass constructor: `constructor(shader: object | ShaderMaterial, textureID?: string);`. OK.

Clock & loop:

```ts
const clock = new THREE.Clock();
let ready = false;
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  sphere.rotation.y += delta * 0.5;
  composer.render(delta);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

composer.render signature: `render(deltaTime?: number)`. Fine.

Resize:

```ts
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
```

Expose everything.

Comment explaining ordering: RenderPass → ShaderPass(invert-in-display-space, decoded back to linear) → OutputPass. Explain: composer buffers are linear; OutputPass converts to sRGB at the end; to invert exactly what the screen would show, invert in sRGB space inside the shader and hand linear values back to OutputPass.

Wait — hmm, actually now I second-guess: is the classic simpler solution intended by the prompt author: RenderPass → ShaderPass(invert) → OutputPass with a note "this inverts in linear space, which is NOT the exact screen inverse"? The prompt explicitly demands exactness: background must appear 0xcc9966. Linear inversion: screen = E(1-L). For L=sRGBToLinear(0.2): E(1-L) — 1-L = 0.9669; E(0.9669) = 1.055*0.9669^(1/2.4)-0.055 ≈ 0.9669^0.4167 = e^{0.4167*ln0.9669}=e^{0.4167*(-0.03365)}=e^{-0.014}=0.9861; *1.055=1.0403-0.055=0.9853 → *255 ≈ 251 → 0xfb, not 0xcc. So plain linear inversion fails; must do the display-space inversion. My option D handles it correctly. 

Alternatively simplest: ShaderPass LAST doing `gl_FragColor = vec4(1.0 - texture2D(tDiffuse,vUv).rgb, 1.0)` after OutputPass. That relies on OutputPass converting into buffer. As analyzed, OutputPass does convert regardless (custom defines). Hmm — but wait, actually now I really want to verify OutputPass source. Let me reconstruct from memory of the actual file (three/src or examples/jsm/postprocessing/OutputPass.js). 

From three.js repo (I've read this file): 

```js
import {
	ColorManagement,
	NoToneMapping,
	ACESFilmicToneMapping,
	...
	RawShaderMaterial,
	UniformsUtils,
	Vector2,
	WebGLRenderer
} from 'three';
import { Pass, FullScreenQuad } from './Pass.js';

const OutputShader = {
	uniforms: UniformsUtils.merge([...])? 
```

Hmm, actually:

```js
const OutputShader = {
	name: 'OutputShader',
	uniforms: {
		'tDiffuse': { value: null },
		'toneMappingExposure': { value: 1 }
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		precision highp float;
		uniform sampler2D tDiffuse;
		uniform float toneMappingExposure;
		varying vec2 vUv;
		#ifdef LINEAR_TONE_MAPPING
		vec3 LinearToneMapping( vec3 color ) {
			return color * toneMappingExposure;
		}
		#endif
		#ifdef REINHARD_TONE_MAPPING
		vec3 ReinhardToneMapping( vec3 color ) {
			color *= toneMappingExposure;
			return saturate( color / ( vec3( 1.0 ) + color ) );
		}
		#endif
		...
		#ifdef SRGB_TRANSFER
		vec4 LinearTosRGB( in vec4 value ) {
			vec3 X = min( vec3( value.rgb * 12.92 ), vec3( 1.74179311 ) );
			vec3 Y = vec3( 1.055 ) * pow( max( value.rgb, vec3( 0.0031308 ) ), vec3( 0.41666068 ) ) - vec3( 0.055 );
			return vec4( mix( X, Y, step( vec3( 0.0031308 ), value.rgb ) ), 1.0 );
		}
		#endif
		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			#ifdef LINEAR_TONE_MAPPING
			texel.rgb = LinearToneMapping( texel.rgb );
			#elif defined( REINHARD_TONE_MAPPING )
			...
			#endif
			#ifdef SRGB_TRANSFER
			texel = LinearTosRGB( texel );
			#endif
			gl_FragColor = texel;
		}`
};
```

Yes, this matches my memory. And the render method sets defines based on renderer.outputColorSpace / toneMapping. So OutputPass converts even when writing into a buffer. Therefore BOTH options work. But option D (OutputPass last) also works and is the canonical order. I'll go with option D — canonical pass order, conversion handled in shader. 

Hmm wait, but option D: after OutputPass... no, in option D order is RenderPass → Invert → Output. But then the exactness relies on E⁻¹∘E round-trip precision, analyzed fine.

Actually, hmm, let me reconsider which is truly "exact". Option B: screen = round8(255 * (1 - roundHF? no...)) — chain: L (half float) → OutputPass E(L) computed in shader float32 precision (highp), stored as half float (error 2^-12 relative ~1.2e-4... around 0.2: abs error up to 6.1e-5) → invert shader: 1 - s (float32) → screen quantization: round(255*(1-s)). s = 0.2 ± 6.1e-5 (half storage) → 255*(1-s) = 204 ± 0.0156 → 204 ✓. White: 1-1=0 exactly → 0 ✓.

Option D: L (half) → E(L) in invert shader float32 → s ≈ 0.2 ± 12.92*err(L). err(L) from half storage: L=0.0331, half step 2^-15? 0.0331 in [0.03125, 0.0625], exponent -5, mantissa step 2^-10 * 2^-5 = 2^-15 = 3.05e-5, rounding error ≤1.53e-5. dE/dL = 12.92 at L<0.0031308 — wait L=0.0331 > 0.0031308! sRGBToLinear(0.2) = ((0.2+0.055)/1.055)^2.4 = (0.24171)^2.4. ln0.24171 = -1.4200; *2.4 = -3.408; e^-3.408 = 0.03310. Yes L≈0.0331. dE/dL at L=0.0331: E(L) = 1.055 L^(1/2.4) - 0.055; dE/dL = 1.055/2.4 * L^(1/2.4-1) = 0.4396 * L^(-0.5833) = 0.4396 * 0.0331^(-0.5833). 0.0331^(-0.5833) = e^{0.5833*3.408} = e^{1.988} = 7.30. → dE/dL ≈ 3.21. Error in s ≈ 3.21 * 1.53e-5 ≈ 4.9e-5 → 255*s error ≈ 0.0125. Then invert, decode, encode again — errors add, maybe ~1e-4 total in final → 255*(1-s) within 0.03 of 204 → 204 ✓. Fine, robust.

Alternatively, to make it even more bulletproof: in the invert shader, clamp and everything. Fine.

Actually — wait, is there an even more exact approach? Do the inversion entirely in the display space as the last pass (option B) — mathematically exact given stored s values. Option D has extra round trip. Both pass byte-exact for the test colors. I'll go with option D since OutputPass-last is the documented order and robust to OutputPass implementation variations. Hmm — but actually option D is robust to *per-target* conversion behavior, while option B is robust to nothing... wait no: option B breaks if OutputPass uses per-target conversion (would compile colorspace_fragment to linear no-op for RT). Option D correct in both regimes. Option B correct only in "always convert" regime. And option D correct in "always convert" regime too. So D dominates. Going with D.

Hmm, one more check on D in "per-target" regime detail: OutputPass renders to screen; renderer.outputColorSpace = SRGB → chunk converts. But OutputShader uses custom defines (always-convert regime). Both same result. ✓.

Also: InvertPass writes decoded linear values into the composer's buffer — but wait, in option D the composer's write buffer after invert... InvertPass is middle pass → renders to writeBuffer (linear HalfFloat) storing sRGBToLinear(1 - E(L)). OutputPass reads it, encodes → writes to screen (renderToScreen). ✓.

Also ShaderMaterial and colorspace chunk: when InvertPass renders to a RT, no conversion applied to its output (its shader doesn't include chunk; also parameters.outputColorSpace for RT is linear anyway). ✓. But hold on — in very recent three (r168+?), does ShaderMaterial get automatic output color space handling? There was a feature: `material... "outputColorSpace" for ShaderMaterials? No. There's `renderer.outputColorSpace` affecting only built-in materials with colorspace_fragment. OK.

Another subtlety: EffectComposer's internal buffers and `renderer.outputColorSpace`... fine.

Now, also should I disable ColorManagement? No — keep default enabled; that's the point ("correct color space").

Write final code with comments explaining the color-space reasoning.

Also expose __composer.

Type strictness details:
- `(window as any).__scene = scene;` etc.
- `document.body` — with `tsc --strict` and default lib dom, document.body: HTMLElement, non-null. appendChild fine.
- ShaderPass uniforms typing: I'll type shader param loosely. `new ShaderPass(InvertShader)` — InvertShader type: `{ uniforms: { tDiffuse: { value: THREE.Texture | null } }, vertexShader: string, fragmentShader: string }`. @types/three ShaderPass constructor: `constructor(shader: object | ShaderMaterial, textureID?: string)`. Passing this object → assignable to object. OK.

Wait — @types/three for jsm postprocessing: I recall ShaderPass typed as `class ShaderPass extends Pass { constructor(shader: object | Material, textureID?: string); ... }`. Either way fine.

Uniform value null: UniformsUtils.clone — fine at runtime.

tDiffuse uniform: ShaderPass sets `this.uniforms[this.textureID].value = readBuffer.texture`.

Sphere rotation for delta usage — good.

Let me also make sure the first frame renders before __ready: setAnimationLoop callback runs each frame; after composer.render() of first frame set ready. Good.

Pixel ratio: set before constructing composer. `renderer.setPixelRatio(window.devicePixelRatio)` — maybe clamp to 2. EffectComposer constructor: `this._pixelRatio = this.renderer.getPixelRatio()`. Good.

Also handle resize with pixel ratio unchanged.

Compose final code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/*
 * Color-space reasoning:
 * ... (explain)
 */

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
sphere.position.set(0, 0, 0);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
if (document.body.style.margin !== '0') ... just set it:
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ---------- Post-processing ----------
const InvertShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;

    vec3 linearToSRGB( vec3 c ) {
      c = clamp( c, 0.0, 1.0 );
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow( max( c, vec3( 0.0031308 ) ), vec3( 1.0 / 2.4 ) ) - 0.055;
      return mix( lo, hi, step( vec3( 0.0031308 ), c ) );
    }

    vec3 sRGBToLinear( vec3 c ) {
      c = clamp( c, 0.0, 1.0 );
      vec3 lo = c / 12.92;
      vec3 hi = pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) );
      return mix( lo, hi, step( vec3( 0.04045 ), c ) );
    }

    void main() {
      vec3 linearColor = texture2D( tDiffuse, vUv ).rgb;
      vec3 displayColor = linearToSRGB( linearColor );
      vec3 invertedDisplay = 1.0 - displayColor;
      gl_FragColor = vec4( sRGBToLinear( invertedDisplay ), 1.0 );
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(InvertShader));
composer.addPass(new OutputPass());

// ---------- Loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  sphere.rotation.y += delta * 0.4;
  composer.render(delta);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Check GLSL details: step(vec3(0.0031308), c) → vec3. mix(lo, hi, vec3) fine. pow(max(c, vec3(0.0031308)), ...) — for c below threshold it computes hi anyway but mix selects lo; but pow of exactly 0.0031308 fine. In decode: pow((c+0.055)/1.055, 2.4) with c up to 1 fine, c=0 gives pow(0.05213, 2.4) fine; mix selects lo for c<0.04045. Good.

Hmm, one thing: `linearToSRGB` — three's OETF uses threshold 0.0031308 for encode; decode threshold 0.04045. Standard. ✓.

TS: `value: null as THREE.Texture | null` — inside object literal; type of uniforms: { tDiffuse: { value: THREE.Texture | null } }. ShaderPass param `object` — ok. But @types/three ShaderPass: looking at types (three examples jsm in @types/three: `postprocessing/ShaderPass.d.ts`): 

```ts
class ShaderPass extends Pass {
	constructor(shader: object | ShaderMaterial, textureID?: string);
	...
}
```

Hmm, I think it might be `shader: object`. Passing our object literal: fine.

Composer.render(delta) — EffectComposer.render(deltaTime?: number): ok.

Note: ShaderPass clones uniforms via UniformsUtils.clone — clones {value: null} fine.

One more consideration: `composer.render(delta)` — fine.

Also — do I need `renderer.setClearColor`? scene.background handles clear via RenderPass (RenderPass sets clearColor from scene.background). RenderPass renders scene with background → clear color = background converted appropriately. Yes, WebGLRenderer handles scene.background conversion to working space via `ColorManagement`? In webgl background module: `_background` Color — it does background conversion? Let me think: WebGLBackground.render: if background is Color → `renderer.setClearColor( background )`? It uses `_clearColor` and state.buffers.color.setClear with convertColorTo... Actually: `state.buffers.color.setClear( _clearColor.r, _clearColor.g, _clearColor.b, _clearAlpha, premultipliedAlpha )` and setClearColor does `color.getRGB( _clearColor, getUnlitUniformColorSpace( renderer ) )` — getUnlitUniformColorSpace returns working color space (linear) when rendering... hmm: getUnlitUniformColorSpace: if renderer outputColorSpace SRGB and target null... Actually:

```js
function getUnlitUniformColorSpace( renderer ) {
	if ( renderer.outputColorSpace === SRGBColorSpace && ... currentRenderTarget === null ... ) return SRGBColorSpace... 
```

Hmm — no wait. The clear color conversion: setClearColor( color ) → `color.getRGB( _clearColor, ColorManagement.workingColorSpace )`? I recall in WebGLBackground:

```js
if ( background && background.isColor ) {
	setClear( background, 1 );
}
...
function setClear( color, alpha ) {
	color.getRGB( _rgb, getUnlitUniformColorSpace( renderer ) );
	state.buffers.color.setClear( _rgb.r, _rgb.g, _rgb.b, alpha, premultipliedAlpha );
}
```

and getUnlitUniformColorSpace:

```js
function getUnlitUniformColorSpace( renderer ) {
	const currentRenderTarget = renderer.getRenderTarget();
	if ( currentRenderTarget === null ) {
		// No rendering target selected: use output color space
		return renderer.outputColorSpace === SRGBColorSpace && renderer.getCurrentViewport... 
```

Hmm, actually I recall: 

```js
function getUnlitUniformColorSpace( renderer ) {
	const currentRenderTarget = renderer.getRenderTarget();
	if ( currentRenderTarget === null ) {
		return renderer.outputColorSpace;  // hmm?
	}
	return currentRenderTarget.texture.colorSpace... 
```

No wait — that would encode clear color to sRGB when writing to... hmm. Actually I remember it being:

```js
function getUnlitUniformColorSpace( renderer ) {
	if ( renderer.outputColorSpace === SRGBColorSpace ) {
		// ColorManagement: unlit materials / clear color are specified in sRGB...
		const currentRenderTarget = renderer.getRenderTarget();
		if ( currentRenderTarget === null || currentRenderTarget.texture.colorSpace === SRGBColorSpace ... ) 
```

Hmm, honestly the details: In r152+, when rendering the scene directly to canvas, clear color 0x336699 → screen 0x336699 (obviously, matches normal behavior). When rendering to a linear HalfFloat RT (composer), the clear color is converted to linear working space so that it round-trips. I'm confident of the behavior (this is the whole point of color management — background appears the same with/without postprocessing). The known good behavior: with composer + OutputPass, scene.background appears same as direct rendering. Yes, that's established.

Good. Both with and without composer, screen shows 0x336699 background and white sphere; our inversion yields 0xcc9966 and black. ✓

One more: RenderPass clears with scene background? RenderPass: if this.clearColor set... it renders scene; renderer.autoClear etc. RenderPass.render sets renderer... It just calls renderer.render(scene, camera) into readBuffer; scene.background used. ✓.

Camera fov: pick 50? Doesn't matter. Use 60? Fine, but sphere radius 1 at distance 4 fits.

Double-check strict TS issues:
- `null as THREE.Texture | null` inside object — OK. Actually simpler: `tDiffuse: { value: null } as { value: THREE.Texture | null }`? The property-level assertion is fine.
- ShaderPass(InvertShader): if typed param is `object | ShaderMaterial`, our const type is an object type — assignable ✓.

Hmm, potential typing issue: @types/three may type ShaderPass constructor as `shader: object` — ✓. Some versions type as `Shader | ShaderMaterial` where Shader interface... older @types/three: `constructor(shader: object, textureID?: string)`. OK.

Also `composer.render(delta)` — deltaTime optional number ✓.

Edge: `document.body` could be null in strict? lib.dom types body as HTMLElement (non-nullable property `body: HTMLElement`). ✓.

GLSL: `vec3 hi = 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055;` with c clamped 0..1, c could be 0 → pow(0, 0.4167): GLSL pow undefined for x=0? Spec: "pow(x, y): Results are undefined if x < 0, if x = 0 and y <= 0." x=0, y=0.4167>0 → defined (=0). OK. But to be safe use max(c, vec3(1e-6)) or threshold trick. I used max with 0.0031308 in encode — safe. In decode, c≥... (c+0.055)/1.055 ≥ 0.0521 > 0 safe. In encode hi branch: use pow(max(c, vec3(0.0031308)), ...) as written ✓.

Wait in encode I wrote `pow( max( c, vec3( 0.0031308 ) ), ...)` — max componentwise with vec3 ✓.

Also note: mix with step gives discontinuity-consistent results since both branches equal at threshold? lo(0.0031308)=0.04045..., hi(0.0031308)=1.055*0.0031308^{0.41667}-0.055 = 1.055*0.04045? 0.0031308^{0.41667} = e^{0.41667*ln0.0031308} = e^{0.41667*(-5.7668)} = e^{-2.4028} = 0.0906; *1.055=0.0955-0.055=0.0405 ≈ 0.04045 ✓ continuous.

Everything good. Also add comments about why inversion happens in display space.

Also the requirement "(window as any).__ready = true after first frame rendered" — done in loop.

Let me also double check EffectComposer import path with three/addons — requires import map configured in the host page; that's the harness's job. Fine.

Final: also mention that we could alternatively place invert after OutputPass. Keep code single file, one block.