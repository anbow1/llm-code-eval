We need to think carefully about color space here. The key issue: Three.js default renderer output color space is sRGB (THREE.SRGBColorSpace). With EffectComposer + RenderPass, the render target is typically... Let's reason.

In modern Three.js (r152+), `renderer.outputColorSpace = SRGBColorSpace` by default. When rendering to a render target (not the canvas), the output color space conversion is NOT applied (render targets use their own colorSpace, default linear-srgb). Actually, three's WebGLRenderer applies output color space conversion when rendering to the canvas (null render target) using `outputColorSpace`, and when rendering to a render target it uses the render target's `texture.colorSpace`. Default for new WebGLRenderTarget: texture.colorSpace = NoColorSpace? Let's recall. `RenderTarget` constructor: `this.texture = new Texture(...)` — Texture default colorSpace is NoColorSpace. Hmm, in three r152+, RenderTarget's texture colorSpace defaults to... Let me recall: In `WebGLRenderer`, `getRenderTargetColorSpace`? Actually in WebGLRenderer, `this.outputColorSpace` applies when renderTarget === null; otherwise uses renderTarget.texture.colorSpace for the "output" encoding. In practice, EffectComposer creates render targets with `new THREE.WebGLRenderTarget(w, h, {type: HalfFloatType, ...})`. Actually EffectComposer's default is `new WebGLRenderTarget(width, height, { type: HalfFloatType })` in recent versions. Then in `EffectComposer.setSize` it uses that. Hmm.

So RenderPass renders scene into a half-float render target with linear values (no sRGB encoding since texture.colorSpace is NoColorSpace... which means "no conversion" i.e. values stored as-is, linear). Then the ShaderPass reads that texture (as a normal sampler2D, no automatic decode since colorSpace is NoColorSpace), inverts, and writes into the next target. Then OutputPass does the linear→sRGB conversion (and tone mapping) and outputs to canvas. So with the effect, the final screen color = sRGB(1 - linear_original). Without the effect... screen = sRGB(linear_original) directly.

Hmm, "the exact inverse of what the screen would show without the effect". Without the effect: screen sRGB value = sRGB_encode(linear). With effect, if we invert in linear space, output = sRGB_encode(1 - linear). Is sRGB_encode(1 - linear) == 1 - sRGB_encode(linear)? No! sRGB encoding is nonlinear. E.g., background 0x336699: convert 0x33 = 51/255 = 0.2 in sRGB → linear ≈ 0.0331. 1-0.0331 = 0.9669 → sRGB encode ≈ 0.9846 → 251 ≈ 0xfb. Not 0xcc.

But the requirement says background 0x336699 must appear as 0xcc9966. 0xcc = 204/255 = 0.8 = 1 - 0.2. So the inversion must happen in sRGB space (i.e., on the displayed sRGB values). So we must invert after linear→sRGB conversion.

Note: 0x336699 set via `new THREE.Color(0x336699)`. Important: `THREE.Color(hex)` — with color management enabled (default `THREE.ColorManagement.enabled = true`), the hex is interpreted as sRGB and converted to linear-srgb working space. So scene.background linear = sRGB_to_linear(0x33..). Then rendered into linear target, then OutputPass converts back to sRGB → 0x336699 on screen without effect. Good.

So to get 0xcc9966 we need: take the sRGB-encoded value (0x33/255 = 0.2), invert → 0.8, output directly as sRGB. So the shader must operate on sRGB-decoded... wait: we need to compute sRGB_encode(linear) first, then invert, then write to output as-is (no further conversion).

Options:
1. Do the inversion in the custom ShaderPass in "sRGB space": convert linear input to sRGB (`linearToSRGB`), invert, then convert back to linear (`sRGBToLinear`) before writing to the render target so that OutputPass's linear→sRGB re-encodes it back to 1-sRGB. Let's check: linear_in = L. s = lin2srgb(L). inv_s = 1 - s. Then write linear value = srgb2lin(inv_s). Then OutputPass encodes: srgb2lin→ ... wait OutputPass does linear→sRGB: output = lin2srgb(srgb2lin(inv_s)) = inv_s. Yes! Exactly 1 - s. 

And the alpha channel — fine.

But careful: does OutputPass apply tone mapping? Default toneMapping is NoToneMapping for renderer, and OutputPass uses `renderer.toneMapping`. Fine.

Also, EffectComposer's render targets: with HalfFloatType, values stored fine (no banding). The final OutputPass writes to canvas with sRGB encoding.

Alternatively simpler: since 1-x in sRGB space composed: we invert in the shader treating the input texel as sRGB directly. But the input texel is linear (stored in linear target). So we need the conversion as described.

Actually, wait. There's a subtlety about whether the RenderPass's output render target values are linear. Yes—renderer renders with `renderer.outputColorSpace` conversion applied only for the canvas. For render targets, `WebGLRenderer` applies conversion based on `renderTarget.texture.colorSpace`. Let me double check in r160+ code: In `WebGLProgram`/`getEncodingComponents`... In modern versions, there's `outputColorSpace` handling in `WebGLRenderer.getRenderTarget`... The shader chunk `colorspace_fragment` uses `linearToOutputTexel(gl_FragColor)` where the function is generated by `getTexelEncodingFunction` based on `renderer.outputColorSpace` if rendering to canvas... Hmm, actually in three r152+:

```js
// WebGLProgram.js
const outputColorSpace = renderer.outputColorSpace; // ...
```
Hmm, there's a function `getTexelEncodingFunction( functionName, colorSpace )`. And in WebGLPrograms.getParameters:
```js
outputColorSpace: ( currentRenderTarget === null ) ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace ),
```
Yes — I recall something like: rendering to a render target uses LinearSRGBColorSpace unless it's an XR target. So render targets get linear output regardless of their texture.colorSpace. Good, that confirms: RenderPass → linear.

Actually in more recent versions (r165+?), I recall it uses `currentRenderTarget.texture.colorSpace` maybe. Let me think. In r167's WebGLPrograms:

```js
const currentRenderTarget = renderer.getRenderTarget();
...
outputColorSpace: ( currentRenderTarget === null ) ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace ),
```
Yes, I'm fairly confident that's the code. So render targets are always linear.

EffectComposer in newer versions constructs `new WebGLRenderTarget(width, height, { type: HalfFloatType })` — with default colorSpace NoColorSpace. Fine.

Now OutputPass: Let's recall its shader:

```glsl
uniform float toneMappingExposure;
uniform int toneMappingMode; // hmm
...
void main() {
  vec4 texel = texture2D( tDiffuse, vUv );
  // tone mapping
  #ifdef LINEAR_TONE_MAPPING ... 
  gl_FragColor = texel;
  // color space
  #if defined( SRGB_TRANSFER )
    gl_FragColor = sRGBTransferOETF( gl_FragColor );
  #endif
}
```
Something like:
```js
fragmentShader: `
  #include <tonemapping_pars_fragment>
  #include <colorspace_pars_fragment>
  uniform float toneMappingExposure;
  uniform int toneMappingMode;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  void main() {
    vec4 texel = texture2D( tDiffuse, vUv );
    vec4 color = texel;
    #if defined( LINEAR_TONE_MAPPING ) ...
    ...
    gl_FragColor = sRGBTransferOETF( color );
  }
`
```
It includes `colorspace_pars_fragment` which defines `sRGBTransferOETF( vec4 value )`. And OutputPass sets `this.material.defines = { SRGB_TRANSFER: ... }`? Actually I recall:

```js
class OutputPass extends Pass {
  constructor() {
    super();
    ...
    this.material = new ShaderMaterial( {
      name: 'OutputShader',
      uniforms: { tDiffuse: { value: null }, toneMappingExposure: { value: 1 } },
      vertexShader: ...,
      fragmentShader: ...
    });
  }
  render(...) {
    this.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
    // rebuild defines if tone mapping changed
    ...
  }
}
```
And the fragment shader ends with `#include <colorspace_fragment>`? Hmm. Let me recall three's OutputPass actual code (r160):

```js
const fragmentShader = /* glsl */`
	#include <common>
	#include <tonemapping_pars_fragment>
	#include <colorspace_pars_fragment>
	uniform float toneMappingExposure;
	uniform int toneMappingMode;
	varying vec2 vUv;
	...
	void main() {
		gl_FragColor = texture2D( tDiffuse, vUv );
		#ifdef LINEAR_TONE_MAPPING
			gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
		#elif defined( REINHARD_TONE_MAPPING )
		...
		#endif
		#ifdef SRGB_TRANSFER
			gl_FragColor = sRGBTransferOETF( gl_FragColor );
		#endif
	}
`;
```
Something like that. Regardless, the OutputPass output to canvas is sRGB-encoded. Good.

Hmm, but there's a risk: Recent versions of OutputPass might convert to the renderer's outputColorSpace via `#include <colorspace_fragment>` which uses `linearToOutputTexel`. Since OutputPass renders to canvas (null target), outputColorSpace is sRGB → sRGB encode. Either way, result: sRGB encoding applied.

So plan works. But rather than relying on precise internals, maybe do something more robust: Do the inversion such that final = 1 - displayed. The safest way: render the RenderPass into a target, then in our shader, decode the texel as linear? Hmm, actually the safest approach that doesn't depend on OutputPass internals is to just not worry — but we must produce one specific implementation.

Alternative approach that is robust: Do the inversion in the shader in sRGB space and convert back to linear, letting OutputPass do the final linear→sRGB. That's exactly the plan. If, hypothetically, the RenderPass target held sRGB-encoded values (older three with different behavior), our shader would double-encode. But we assume modern three (r16x/r17x) which uses LinearSRGBColorSpace for render targets. Fine.

But hmm—one nuance: `THREE.Color(0x336699)` with ColorManagement enabled: the background is stored linear. RenderPass writes linear into target. Then our ShaderPass: we sample the linear value, convert to sRGB, invert, convert back to linear, write to next target (linear, half float). OutputPass: linear → sRGB encode → canvas. Output sRGB value = 1 - original sRGB value = 0xcc9966. 

Now, is the resulting screen pixel exactly 0xcc9966? Round-trip floating point precision with half floats... The render target is HalfFloatType by default in EffectComposer. Linear value 0.0331 stored in half float: half float has ~10 bits mantissa for that range (value 0.0331, exponent ~ -5, so relative precision ~2^-11 ≈ 0.0005 → absolute ~1.6e-5). Round trip: lin2srgb ~ 0.2 exactly? Small error ~1e-4 in sRGB, i.e., ~0.03 of a 255 step. Fine, within rounding. Test tolerance presumably ±1 or so.

Also, the sphere: white 0xffffff → linear 1.0 → invert → 0.0 → black. Good.

Hmm, but careful: the sphere is MeshBasicMaterial with color 0xffffff. That's fine.

Also anti-aliasing edges — but tests likely sample center.

Now also we should consider: EffectComposer's default render target type is HalfFloatType (in recent versions yes: `new WebGLRenderTarget( width, height, { type: HalfFloatType } )` with `...` maybe). Actually let's check EffectComposer constructor:

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
        this._width = renderTarget.width;
        this._height = renderTarget.height;
    }
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();
    ...
}
```
Yes.

Now the shader. Use ShaderPass with uniforms `{ tDiffuse: { value: null } }` and standard vertex shader. ShaderPass's constructor if fragmentShader given, it builds ShaderMaterial with `uniforms: UniformsUtils.clone(shader.uniforms)` etc. Actually ShaderPass:

```js
constructor( shader, textureID = 'tDiffuse' ) {
   ...
   if ( shader instanceof ShaderMaterial ) { ... } else if ( shader ) {
       this.uniforms = UniformsUtils.clone( shader.uniforms );
       this.material = new ShaderMaterial( { name: shader.name ?? '', defines: Object.assign({}, shader.defines), uniforms: this.uniforms, vertexShader: shader.vertexShader, fragmentShader: shader.fragmentShader } );
       this.fragmentShader = shader.fragmentShader; ...
   }
}
```
So I'll pass `{ uniforms: { tDiffuse: { value: null } }, vertexShader, fragmentShader }`. Then also set `pass.textureID` automatically = 'tDiffuse'. Good.

I'll write the GLSL with sRGB transfer functions myself.

sRGB → linear: 
```
float srgbToLinear( float c ) {
  return c <= 0.04045 ? c * 0.0773993808 : pow( c * 0.9478672986 + 0.0521327014, 2.4 );
}
```
Hmm, standard: if c <= 0.04045: c/12.92, else pow((c+0.055)/1.055, 2.4).

linear → sRGB:
```
float linearToSrgb( float c ) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow( c, 0.41666 ) - 0.055;
}
```
Using 1/2.4 = 0.41666666.

Shader main:
```glsl
void main() {
  vec4 texel = texture2D( tDiffuse, vUv );
  vec3 srgb = vec3( linearToSrgb(texel.r), ... );
  vec3 inv = vec3(1.0) - srgb;
  vec3 lin = vec3( srgbToLinear(inv.r), ... );
  gl_FragColor = vec4( lin, texel.a );
}
```

Precision: use highp float (default in fragment shader for WebGL2 is highp? default precision in three's ShaderMaterial: `precision highp float;` is prepended by three? Three prepends `precision highp float;` based on `renderer.capabilities.precision` which defaults to 'highp'). Yes, three's WebGLProgram prepends `precision ${precision} float;` — good.

Now, another consideration: HalfFloat render target stores linear values; 0.9334 (linear for 0xcc?) wait let's check: inv sRGB 0.8 → srgbToLinear(0.8) = ((0.8+0.055)/1.055)^2.4 = (0.8104)^2.4. ln0.8104 = -0.2100; *2.4 = -0.5041; e^-0.5041 = 0.6042. Then OutputPass: linearToSrgb(0.6042) = 1.055*0.6042^0.41667 - 0.055. 0.6042^0.41667: ln = -0.5037*0.41667 = -0.2099 → e^-0.2099 = 0.8108. *1.055 = 0.8554 - 0.055 = 0.8004. → 204.1 → 0xcc. Good enough.

Half float precision for 0.6042: fine.

Now, possible issue: tone mapping. renderer.toneMapping default is NoToneMapping, OutputPass with NoToneMapping does nothing. Good.

Another thing: does OutputPass exist in 'three/addons/postprocessing/OutputPass.js'? Yes.

Now let's also handle: the sphere at origin radius 1, camera at (0,0,4) looking at origin. PerspectiveCamera default fov 50? Let's use 75 or 50 with aspect. Use `new THREE.PerspectiveCamera(75, w/h, 0.1, 100)`. Sphere radius 1 at distance 4 → appears covering decent portion. Fine.

Note the sphere with MeshBasicMaterial color white. Background 0x336699.

One consideration: does the composer need `renderer.setPixelRatio`? Not needed but handle resize with composer.setSize.

Also: EffectComposer's setSize with pixel ratio — composer.setSize(width, height) multiplies internally by pixel ratio. Fine.

Also on resize set renderer size, camera aspect, composer size.

Now, the `__ready` after first frame. In animation loop, after `composer.render()`, if not set, set `(window as any).__ready = true`. But requirement says "After the first frame is rendered, set __ready = true". Do it inside the loop after the first composer.render().

Let me double-check `ShaderPass` usage with `texture2D` and `vUv` — ShaderPass provides vertexShader with `vUv` varying, so I must declare `varying vec2 vUv;` in my fragment shader. Yes.

Write the file:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(sphere);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const inversionShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `...`,
  fragmentShader: `...`,
};
```

Hmm, careful with TS: ShaderPass typings: `constructor(shader: object, textureID?: string)`. In three's types, ShaderPass constructor takes `shader: ShaderMaterial | Object`? Let's check three types for ShaderPass:

```ts
export class ShaderPass extends Pass {
    constructor(shader: object, textureID?: string);
    textureID: string;
    uniforms: { [name: string]: IUniform };
    material: ShaderMaterial;
    fsQuad: FullScreenQuad;
}
```
Hmm, does it have `render`? Yes. OK.

Actually let me check the actual type declaration in three's types (r160+ `examples/jsm/postprocessing/ShaderPass.d.ts`):

```ts
import { ShaderMaterial, Uniform } from 'three';
import { Pass, FullScreenQuad } from './Pass.js';

export class ShaderPass extends Pass {
    constructor(shader: object, textureID?: string);
    textureID: string;
    uniforms: { [name: string]: Uniform };
    material: ShaderMaterial;
    fsQuad: FullScreenQuad;
}
```
Something like that. Fine either way; I'll just pass an object with uniforms/vertexShader/fragmentShader.

TS strict: `uniforms: { tDiffuse: { value: null as THREE.Texture | null } }` — that's fine as object.

Note: does ShaderPass render to `renderToScreen` when it's the last pass? Yes, Pass sets renderToScreen true for last pass in composer render loop.

Now, `EffectComposer` also sets `renderToScreen` automatically? In EffectComposer.render:

```js
render( deltaTime ) {
    ...
    const isLastPass = ...;
    for ( let i = 0; i < il; i++ ) {
        const pass = this.passes[i];
        ...
        const isLastEnabledPass = ...
        pass.renderToScreen = ( this.renderToScreen && ... );
        pass.render( ... );
    }
}
```
Yes, EffectComposer handles renderToScreen for the last enabled pass. Good — no manual setting needed. But three's EffectComposer: `this.renderToScreen = true` by default; each pass's `renderToScreen` set... Actually in older versions you needed OutputPass as last; in newer versions the composer sets `pass.renderToScreen` automatically. Yes: EffectComposer.render() sets:

```js
const isLastEnabledPass = ...
pass.renderToScreen = ( this.renderToScreen === true && isLastEnabledPass === true )
```
Hmm, in some version it's `pass.renderToScreen = (this.renderToScreen && isLastEnabledPass)` — anyway handled.

But wait: RenderPass's renderToScreen default false. And ShaderPass renders fsQuad to screen when renderToScreen is true. Since the inversion pass isn't last, fine.

Now the resize handler.

Also antialias: EffectComposer with antialias renderer — the composer's render targets don't have MSAA unless samples set. Not required.

Let me write the shaders.

Vertex shader (standard):
```glsl
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
```

Fragment:
```glsl
precision highp float;

uniform sampler2D tDiffuse;
varying vec2 vUv;

float srgbToLinear( float c ) {
  return c <= 0.04045 ? ( c / 12.92 ) : pow( ( c + 0.055 ) / 1.055, 2.4 );
}

float linearToSrgb( float c ) {
  return c <= 0.0031308 ? ( c * 12.92 ) : ( 1.055 * pow( c, 1.0 / 2.4 ) - 0.055 );
}

void main() {
  vec4 texel = texture2D( tDiffuse, vUv );

  // The incoming texel is linear-sRGB (RenderPass writes linear values into the
  // composer render target). Convert to the display (sRGB) encoding to invert in
  // the very same space the user sees, ...
  vec3 displayed = vec3( linearToSrgb( texel.r ), linearToSrgb( texel.g ), linearToSrgb( texel.b ) );
  vec3 inverted = vec3( 1.0 ) - displayed;
  vec3 linearOut = vec3( srgbToLinear( inverted.r ), srgbToLinear( inverted.g ), srgbToLinear( inverted.b ) );

  gl_FragColor = vec4( linearOut, texel.a );
}
```

Note `precision highp float;` is added by three; adding it ourselves could be a duplicate declaration but that's legal GLSL? Redeclaring precision is fine (it just overrides). Actually it's allowed to have multiple precision statements. But safer to omit it. I'll omit.

Wait — one risk: `linearToSrgb(0.0)` returns 0 → inverted 1 → srgbToLinear(1.0) = pow((1.055)/1.055, 2.4) = 1. Good.

Also note clamps.

Edge case: the ShaderPass `tDiffuse` value type — three's Uniform object. Fine.

Now let's double-check the OutputPass behavior more concretely for a recent three version, since exactness matters. OutputPass in r160:

```js
const _material = new ShaderMaterial( {
    name: 'OutputShader',
    uniforms: {
        'tDiffuse': { value: null },
        'toneMappingExposure': { value: 1 }
    },
    vertexShader: ..., 
    fragmentShader: `...`
} );
```

Let me recall the actual fragment shader source:

```glsl
#include <common>
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>

uniform float toneMappingExposure;
uniform int toneMappingMode;   // maybe not in older versions

varying vec2 vUv;

uniform sampler2D tDiffuse;

void main() {

    gl_FragColor = texture2D( tDiffuse, vUv );

    // tone mapping
    #ifdef LINEAR_TONE_MAPPING
        gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
    #elif defined( REINHARD_TONE_MAPPING )
        ...
    #endif

    // color space
    #ifdef SRGB_TRANSFER
        gl_FragColor = sRGBTransferOETF( gl_FragColor );
    #endif
}
```

Hmm, in r155-ish there were defines like `SRGB_TRANSFER` set based on renderer.outputColorSpace. In newer versions (r165+), OutputPass:

```js
render( renderer, writeBuffer, readBuffer ) {
    this.uniforms['tDiffuse'].value = readBuffer.texture;
    this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;
    // rebuild defines if toneMapping changed
    if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
        this._outputColorSpace = renderer.outputColorSpace;
        this._toneMapping = renderer.toneMapping;
        this.material.defines = {};
        if ( ColorManagement.getTransfer( this._outputColorSpace ) === SRGBTransfer ) this.material.defines.SRGB_TRANSFER = '';
        ...
        this.material.needsUpdate = true;
    }
    ...
}
```
Yes, that's it. And sRGBTransferOETF from colorspace_pars_fragment:

```glsl
vec4 sRGBTransferOETF( in vec4 value ) {
    return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
```
Good — matches my linearToSrgb.

Wait, actually `sRGBTransferOETF` in `colorspace_pars_fragment` — in newer versions that chunk is `#include <colorspace_pars_fragment>` and defines `sRGBTransferOETF`. In older versions the function was `linearToOutputTexel` from `encodings_pars_fragment`. Whatever. It's the standard sRGB OETF. Good.

So result confirmed.

One more thing to double check: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — must be before composer creation? Composer reads `renderer.getPixelRatio()` at construction. Then on resize, `composer.setSize(w, h)` sets `this._width = width; ... renderTarget1.setSize(width*pixelRatio, ...)`. But if pixel ratio changes... not needed.

Hmm, careful: In resize, `composer.setSize(window.innerWidth, window.innerHeight)` — inside setSize it uses `this._pixelRatio` which was captured at construction. If window.devicePixelRatio changes, it won't update. Fine. Actually let me also call `composer.setPixelRatio(renderer.getPixelRatio())`? Eh, on resize just do setSize. Keep it simple but safe: also call `renderer.setPixelRatio(...)` on resize? That would desync composer's pixel ratio. I'll keep pixelRatio fixed at construction.

Hmm, but there's a subtlety: `EffectComposer.setSize(width, height)`:

```js
setSize( width, height ) {
    this._width = width;
    this._height = height;
    const effectiveWidth = this._width * this._pixelRatio;
    const effectiveHeight = this._height * this._pixelRatio;
    this.renderTarget1.setSize( effectiveWidth, effectiveHeight );
    ...
    for pass: if pass.setSize -> pass.setSize(effectiveWidth, effectiveHeight);
}
```
Fine.

Also `renderer.setSize` sets canvas CSS size to innerWidth/innerHeight. Good.

Now, `(window as any).__ready = true` after first frame.

Also maybe expose `__scene`, `__camera`, `__renderer`, `__composer`.

TS strict compile: need to be careful about types. `scene.background = new THREE.Color(0x336699)` fine.

Let me write final code.

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const colorInversionPass = new ShaderPass({
  name: 'ColorInversionShader',
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `...`,
  fragmentShader: `...`
});
composer.addPass(colorInversionPass);
composer.addPass(new OutputPass());
```

Hmm, `uniforms: { tDiffuse: { value: null } }` — TS type for ShaderPass expects `shader: object`, so fine. But `UniformsUtils.clone` on `{ value: null }` fine.

Then animation loop:

```ts
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  sphere.rotation.y += delta * 0.5; // optional motion
  composer.render(delta);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Motion: sphere rotation is fine but not required. Maybe keep small rotation for visible motion. Doesn't hurt. Actually rotation of a white sphere doesn't change appearance. Fine.

Hmm, one thought: should I avoid `renderer.render` entirely — yes, composer.render() only.

Note: `composer.render(delta)` — the signature takes deltaTime optional. Fine.

Resize handler:

```ts
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
```

Type: since `window.addEventListener('resize', ...)` fine.

Now potential TS strict issue: `document.body.appendChild` fine. `window.devicePixelRatio` fine.

One thing: in strict TS, `new ShaderPass({...})` with object literal — types might require `ShaderMaterial | object`. Fine.

If ShaderPass's d.ts types `uniforms` as `{ [name: string]: Uniform }`, then passing object literal is fine since constructor takes `object`.

Let me also consider: does TS strict complain about unused variables? `noUnusedLocals` might be set in strict? No — `strict` does not include noUnusedLocals. Fine, but avoid unused anyway.

Let's double check the geometry: sphere radius 1 at (0,0,0), camera at z=4 with fov 50 → visible height at distance 4 = 2*4*tan(25°) = 8*0.4663 = 3.73. Sphere diameter 2 → occupies 54% of height. Good.

Edge: `scene.background` colors — when rendering scene into a linear render target, the background color is drawn as its linear value (background rendered via clear color: `renderer.setClearColor` uses the color... in three, `background` is a Color which is converted; the clear color is set with `getRGB` in working color space then... hmm. For a Color background, three does `_clearColor.copy(background)` and sets clear color, applying conversion to output color space? Let's think: WebGLRenderer.setClearColor( color ) stores in "working" (linear) space, and in `setClearColor` -> `background` handling: `this.setClearColor( background, backgroundAlpha )` where setClearColor does `_clearColor.set(color); ... state.buffers.color.setClear(_clearColor.r, _clearColor.g, _clearColor.b, ...)`. And the renderer's clear color state may apply `this.outputColorSpace`? Hmm.

There's `WebGLBackground` class: for a Color background, `setClear(background, 1)`:
```js
function setClear( color, alpha ) {
    color.getRGB( _rgb, getUnlitUniformColorSpace( renderer ) );
    state.buffers.color.setClear( _rgb.r, _rgb.g, _rgb.b, alpha, premultipliedAlpha );
}
```
where `getUnlitUniformColorSpace( renderer )` returns `renderer.outputColorSpace` if renderTarget is null, else LinearSRGBColorSpace? Let me recall:

```js
export function getUnlitUniformColorSpace( renderer ) {
	if ( renderer.getRenderTarget() === null ) {
		// https://github.com/mrdoob/three.js/pull/23937#issuecomment-1111067398
		return renderer.outputColorSpace;
	}
	return NoColorSpace;  // or LinearSRGBColorSpace
}
```
Hmm, in some version it's `return ColorManagement.workingColorSpace` for non-null target. Either way: when rendering into the linear render target, the clear color is written as the linear working-space RGB. Good — so the target contains the linear value of 0x336699 = (0.0331, 0.1329, 0.3185) roughly. Let's compute: 0x33=51/255=0.2 → linear = ((0.2+0.055)/1.055)^2.4 = (0.2417)^2.4. ln(0.2417) = -1.4204, *2.4 = -3.409 → e^-3.409 = 0.0331. Yes.

Great, matches the plan.

Now also note: does the clear color get written with alpha 1 into a half float target? Yes.

One more consideration: the RenderPass renders with `renderer.setRenderTarget(readBuffer)` — since target isn't null, outputColorSpace for the shaders = LinearSRGBColorSpace, so the sphere's white color (linear 1,1,1) is written as 1,1,1. Good.

Now the exact expected display: white → 1.0 linear → linearToSrgb(1) = 1.0 → invert → 0 → srgbToLinear(0) = 0 → OutputPass → 0 → black 0x000000. 

Background: linear 0.0331 → linearToSrgb ≈ 0.19997 (float precision) → invert 0.80003 → srgbToLinear = 0.6039 → OutputPass linearToSrgb → 0.80003 → *255 = 204.0 → 0xcc. 

Note: There's some floating error but the final value should round to 204 in an 8-bit framebuffer. The canvas drawing buffer has 8-bit per channel by default. Values quantize to nearest. 0.80003*255 = 204.007 → 204. Good.

Let me also double check the '0x99' case: 0x99 = 153/255 = 0.6 → linear = ((0.655)/1.055)^2.4? (0.6+0.055)/1.055 = 0.6209. ln = -0.4765, *2.4 = -1.1436 → 0.3186. linearToSrgb(0.3186) = 1.055*0.3186^0.416667 - 0.055. ln0.3186 = -1.1436*0.416667 = -0.4765 → 0.6209. *1.055 = 0.6551 - 0.055 = 0.6001 → 153.0. Good. Invert → 0.3999 → srgbToLinear: (0.4549/1.055)^2.4 = (0.4312)^2.4: ln=-0.8414*2.4=-2.019 → 0.1328. Then OutputPass → 0.39995 → 101.99 → 102 = 0x66. Good.

Great, the math checks out.

Now write it all out. Also add `renderer.toneMapping = THREE.NoToneMapping;` explicitly? Default is NoToneMapping. Could set for safety, but OutputPass reads from renderer at render time. Set explicitly for determinism.

Also `renderer.outputColorSpace = THREE.SRGBColorSpace;` default; set explicitly.

Also note that with `THREE.ColorManagement.enabled` default true. Fine.

Write the code.

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);
```

Note: `renderer.toneMapping = THREE.NoToneMapping;` — fine.

Then camera etc.

The pass shader:

Full fragment shader string with template literal. Careful with `${}` — none needed.

Let me finalize the fragment shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

const float SRGB_ALPHA = 1.055;
const float SRGB_LINEAR_THRESHOLD = 0.0031308;

float toDisplayEncoding( float linearValue ) {
    float c = max( linearValue, 0.0 );
    return c <= 0.0031308 ? c * 12.92 : 1.055 * pow( c, 1.0 / 2.4 ) - 0.055;
}

float toLinear( float displayValue ) {
    float c = clamp( displayValue, 0.0, 1.0 );
    return c <= 0.04045 ? c / 12.92 : pow( ( c + 0.055 ) / 1.055, 2.4 );
}

void main() {
    vec4 texel = texture2D( tDiffuse, vUv );

    // Everything arriving here is *linear* light: RenderPass renders into the
    // composer's half-float render target, which is always linear-sRGB (no
    // display encoding is applied when rendering into a render target).
    vec3 displayRGB = vec3(
        toDisplayEncoding( texel.r ),
        toDisplayEncoding( texel.g ),
        toDisplayEncoding( texel.b )
    );

    // Invert in display (sRGB) space, so the result is the exact inverse of
    // what the canvas would show if the effect were disabled.
    vec3 inverted = vec3( 1.0 ) - displayRGB;

    // Back to linear so the OutputPass can apply the linear -> sRGB OETF once.
    vec3 linearRGB = vec3(
        toLinear( inverted.r ),
        toLinear( inverted.g ),
        toLinear( inverted.b )
    );

    gl_FragColor = vec4( linearRGB, texel.a );
}
```

Good.

Now write the whole file. Also `sphere.rotation` motion — optional; I'll add slight rotation for animated motion using delta.

Also `clock` for elapsed.

Final answer.