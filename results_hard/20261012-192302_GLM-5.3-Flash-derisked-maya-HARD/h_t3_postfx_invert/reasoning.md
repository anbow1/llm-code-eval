Setup: scene background 0x336699 in sRGB. By default, with WebGLRenderer, outputColorSpace is sRGB. EffectComposer's render targets are linear unless configured. With OutputPass, the conversion to sRGB happens in OutputPass. So the pipeline: RenderPass renders scene in linear space into composer's linear target. ShaderPass inverts in linear space. OutputPass converts linear->sRGB.

If we invert in linear space: background 0x336699 sRGB -> linear: (0.2,0.4,0.6) sRGB values; linear ≈ (0.0331, 0.1333, 0.3185). Invert linear: (0.9669, 0.8667, 0.6815) -> convert to sRGB ≈ (0.9847, 0.9462, 0.8538) -> 251,241,218 ≈ 0xfbflda... not 0xcc9966.

To get exact inversion of screen colors, invert after sRGB conversion. Options: invert in the shader after converting to sRGB, and disable OutputPass's conversion... Actually OutputPass includes tone mapping + color space conversion. Simplest: keep RenderPass -> ShaderPass -> OutputPass, but do the sRGB conversion in the shader then invert, then... OutputPass would convert again. Alternative: make composer's render target sRGB? Easier approach: use ShaderPass after OutputPass? Passes must end... EffectComposer supports passes after OutputPass; the final pass writes to screen. But a ShaderPass renders to a target then copies to screen if it's the last pass (renderToScreen). The last pass renders to screen with its material; the output would be treated... actually the final pass output goes directly to canvas without further conversion. So order: RenderPass -> OutputPass (converts to sRGB) -> ShaderPass (invert sRGB values) with renderToScreen. But ShaderPass output texture read is in sRGB values stored in a target... The OutputPass writes sRGB-encoded values into the composer's write buffer. Then ShaderPass inverts: 1 - value. Then renders to screen. Canvas is 8-bit sRGB; writing values directly gives exact inversion.

But careful: composer's internal render targets — after OutputPass, values are sRGB-encoded stored in an UnsignedByteType target? Default composer target type is HalfFloatType in recent versions. Values stored would be the sRGB-encoded floats. Then ShaderPass reads them, inverts, outputs to screen. Since the target texture is not marked sRGB colorspace... ShaderPass's readTexture: when sampling a texture with colorSpace = SRGBColorSpace, three decodes. The composer's targets have colorSpace = NoColorSpace typically (linear working). OutputPass writes sRGB values into a target whose texture colorSpace is NoColorSpace/LinearSRGBColorSpace — sampled raw. Good, inversion works.

Actually wait: does OutputPass as a non-final pass in EffectComposer work? Yes, passes render to writeBuffer normally; only the last pass renders to screen. But OutputPass sets material to convert; it works either way.

Alternative simpler: single ShaderPass that does everything: sample linear color, convert to sRGB, invert, output — and use renderer without OutputPass but with... but the requirement says include an OutputPass. Hmm, requirement: "with a RenderPass, a custom ShaderPass ... and an OutputPass". So include OutputPass.

Option: order RenderPass -> ShaderPass -> OutputPass, with shader inverting after converting to sRGB itself, then OutputPass converts again — no, that would double-convert. Unless... hmm.

Cleanest: RenderPass -> OutputPass -> ShaderPass(invert) as final pass. ShaderPass final pass: EffectComposer marks the last pass renderToScreen automatically (renderToScreen is determined by pass === lastEnabledPass? Actually in newer versions composer checks `pass.renderToScreen` — no, it's: in render, `const isLastEnabledPass = i === lastEnabledPassIndex... pass.renderToScreen = isLastEnabledPass`? Let me recall: EffectComposer.render: `pass.renderToScreen = ( i === il - 1 )`? In recent three: `const isLastEnabledPass = pass.enabled...` Actually code: 

```
for ( let i = 0, il = passes.length; i < il; i ++ ) {
  const pass = passes[ i ];
  if ( pass.enabled === false ) continue;
  pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
  pass.render(...)
```

Yes, modern EffectComposer sets renderToScreen automatically for last enabled pass. Good.

But there's a subtlety: ShaderPass as final pass samples tDiffuse which contains sRGB-encoded values from OutputPass written into composer buffer. The composer buffer texture colorSpace — default NoColorSpace, sampled raw. Invert gives 1-v. Output to canvas: renderer.outputColorSpace = SRGBColorSpace but the final pass writes directly; no conversion applied on shader output to canvas. Actually when rendering to the canvas, the renderer does apply output color space conversion to built-in materials... For RawShaderMaterial/ShaderMaterial, three injects colorspace_fragment chunk? ShaderMaterial does include encodings? ShaderMaterial fragment shaders don't automatically get colorspace conversion unless the shader includes #include <colorspace_fragment>. Custom GLSL without that include: no conversion. So output is exact.

Wait, but OutputPass itself when it's not the final pass: it renders into the write buffer, values sRGB-encoded. Fine.

Hmm, one more subtlety: OutputPass applies tone mapping too (renderer.toneMapping, default NoToneMapping). Fine.

Also: does OutputPass convert based on renderer.outputColorSpace? Yes, it uses SRGBTransfer... it converts from linear working to output color space. Good.

So final on screen: bg sRGB 0x336699 (0.2,0.4,0.6) → RenderPass renders into linear target: converts 0.2→linear 0.0331 etc. OutputPass converts back to 0.2,0.4,0.6 stored. ShaderPass inverts → 0.8,0.6,0.4 = 204,153,102 = 0xcc9966. White sphere: 1.0 stays 1.0 through linear round trip (1→1), invert → 0. Black. 

But wait: will the round trip be exact? sRGB→linear uses SRGBToLinear: pow approximation via exponent 2.4, then linear→sRGB back. 0.2: linear = ((0.2+0.05)/1.05)^2.4 = (0.238095)^2.4 ≈ 0.0331046. Back: 1.05*0.0331046^(1/2.4)-0.05. Should return ~0.2 exactly (or within 1/255). Stored in HalfFloat target, fine. Then inversion and writing to 8-bit canvas: 1 - 0.2 = 0.8 → 204.5? 0.8*255 = 204.0. Rounding: 0.8*255=204 exactly. Fine — and even if there's a tiny error it rounds to nearest, likely exact. Actually potential off-by-one due to float error: 0.2 might round-trip to 0.19999998 or 0.20000005 → 1-v = 0.80000005 → *255 = 204.00001 → rounds to 204. Good. Edge case if v slightly above 0.2: 0.19999994 → inverse 0.80000006 → 204.000015 → floor/round → 204. If rounding is done via truncation... renderer writes via gl, GPU rounds to nearest. Should be fine.

Alternatively invert in the shader with sRGB conversion inside and skip double conversion by ordering RenderPass -> ShaderPass -> OutputPass and having the shader do: convert input linear to sRGB, invert... then OutputPass would re-convert from "linear" — wrong. So my ordering (OutputPass before invert ShaderPass) is right.

Hmm, but is it conventional? The prompt says "order the passes (or convert in the shader) so this holds." So either order.

Alternatively: convert in shader: ShaderPass after RenderPass does: color = sRGBEncode(color) then invert... then OutputPass converts linear→sRGB again — wrong. Unless the shader outputs linear-inverted-of-sRGB... Let me just go with OutputPass -> ShaderPass ordering. But ShaderPass after OutputPass: the ShaderPass needs `tDiffuse` uniform — standard.

Also need composer render targets: default HalfFloatType in newer three — fine.

Resize: composer.setSize.

__ready: set true after first frame — set in animation loop after first composer.render(), using a flag.

Renderer: new THREE.WebGLRenderer({ antialias: true }). setPixelRatio maybe.

Write code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const InvertShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `...`,
  fragmentShader: `...`
};
```

Fragment: `vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(1.0 - c.rgb, c.a);`

Scene: background color. Note: setting scene.background = new THREE.Color(0x336699) — when rendered with renderer, the color is converted correctly (three converts background color per outputColorSpace? Background color is converted using... in recent three, scene.background color is treated in working color space when colorManagement enabled). Yes, THREE.ColorManagement enabled by default; Color(0x336699) setHex converts sRGB to linear working space. Good.

Animation loop:

```
let ready = false;
renderer.setAnimationLoop(() => {
  composer.render();
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Expose __scene, __camera, __renderer, __composer.

Camera: PerspectiveCamera(75, aspect, 0.1, 100), position (0,0,4), lookAt origin.

Resize handler.

ShaderPass constructor takes shader object with uniforms/vertexShader/fragmentShader. Type: ShaderPass expects ShaderParameter-ish; with strict tsc, the shader object type: ShaderPass constructor accepts `Shader` (object with uniforms, vertexShader, fragmentShader). Passing a plain object literal with uniforms: { tDiffuse: { value: null } } — type is `{ value: null }` — uniform expects `{ [uniform: string]: { value: any } }`? IUniform value: any, so `{ value: null }` is fine (IUniform<any>). Should typecheck.

Write final code.