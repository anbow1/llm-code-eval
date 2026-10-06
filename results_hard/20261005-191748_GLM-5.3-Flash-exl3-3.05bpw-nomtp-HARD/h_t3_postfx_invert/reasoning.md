Key idea: the composer renders in linear space. The RenderPass renders the scene into a render target (linear). The ShaderPass gets the linear color. If we invert the sRGB-encoded color, we get wrong result. We need: output = linearToSRGB(1 - sRGB(linear))? Let's think.

Without effect: renderer.outputColorSpace = SRGB (default). Pipeline: scene color 0x336699 (interpreted as sRGB, converted to linear via ColorManagement), then linear->sRGB conversion at output. Screen shows sRGB value 0x336699.

We want screen to show 0xcc9966 = inverse in sRGB space: for each channel, s_out = 1 - s_in where s_in is the sRGB-encoded value that would have been displayed.

The composer's render target... In recent three.js, EffectComposer with OutputPass: the render targets are linear (HalfFloat), and OutputPass does tone mapping and sRGB conversion. RenderPass renders scene into target — when rendering to a render target, no sRGB conversion happens (outputColorSpace applies only to canvas default framebuffer... actually in newer versions, renderer.outputColorSpace only affects default framebuffer). So the ShaderPass receives linear values. Then OutputPass converts linear->sRGB.

We want final screen value s_out = 1 - sRGB(linear_in). Since OutputPass does sRGB(linear_out), we need linear_out such that sRGB(linear_out) = 1 - sRGB(linear_in). So linear_out = sRGBToLinear(1 - sRGB(linear_in)).

Alternatively, simpler: do the inversion in the fragment on linear values with inverse conversion functions... The trick commonly used: in the shader, invert then also the OutputPass conversion will apply. To get exact inverse, we need to convert the inverted sRGB value back to linear.

Implementation: in shader, first convert incoming linear color to sRGB (using the approximate or exact transfer function), invert, then convert back to linear, then OutputPass converts to sRGB. But exactness: sRGB encoding in three uses exact sRGB transfer function? THREE.SRGBTransfer uses the piecewise function. ColorManagement defines SRGBToLinear exactly. So we can implement GLSL versions of LinearTosRGB and sRGBToLinear (three's built-in colorspace_fragment uses LinearTosRGB). If shader pass 1 does: c = LinearTosRGB(c); c = 1-c; c = sRGBToLinear(c); output linear. Then OutputPass does LinearTosRGB again giving exact 1 - sRGB_in? sRGBToLinear(1 - sRGB(x)) then linearToSRGB gives back 1 - sRGB(x) exactly? Floating point: linearToSRGB(sRGBToLinear(s)) = s up to float precision. 1 - s computed in float: fine for 8-bit output. Should be exact enough (values like 0x33 = 51/255 = 0.2; 1-0.2=0.8 = 204/255 exact in float). Good.

Alternatively simpler: skip OutputPass? But requirement says use OutputPass. So include it and do double conversion in shader.

Actually maybe simpler approach: set the ShaderPass between RenderPass and OutputPass, and in shader do exactly:

vec3 srgb = linearToSrgb(tDiffuse.rgb);
gl_FragColor = vec4(1.0 - srgb, 1.0);
then convert back: srgbToLinear. Then output linear, OutputPass converts back. Fine.

Alternatively, we could have the ShaderPass not convert, and instead the final inversion happens... but OutputPass always converts linear->sRGB when outputColorSpace is SRGB. Hmm, another approach: put inversion shader such that it works directly: if renderer's output conversion happens in OutputPass, we could just invert in shader operating on linear? That gives screen inverse of linear values, which is not the same (gamma). So must do conversions.

Three's GLSL functions: three includes in ShaderChunk "colorspace_fragment" uses LinearTosRGB etc. In ShaderPass custom shader, those functions aren't automatically included unless we include <colorspace_pars_fragment>? There's no such include; functions like LinearTosRGB are defined in common? Actually three has colorspace functions in the "encodings_pars_fragment" chunk historically, now "colorspace_pars_fragment"? Let me recall: three r152+ has `three/src/renderers/shaders/ShaderChunk/colorspace_fragment.glsl.js` which calls `LinearTosRGB(...)` etc. The definitions are in `colorspace_pars_fragment`? I believe there is ShaderChunk 'colorspace_pars_fragment' containing the transfer function definitions (sRGBTransferEOTF etc. in newer versions r165?). To be safe, just define the math inline in my GLSL — no includes needed.

GLSL sRGB encode (three's LinearTosRGB):
vec3 sRGBEncode(vec3 c) {
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, vec3(c)));
}
Actually three's version: `mix( vec3( c * 12.92 ), vec3( 1.055 ) * pow( c, vec3( 0.41666 ) ) - vec3( 0.055 ), vec3( greaterThanEqual( c, vec3(0.0031308) ) ) );` with 0.41666 approximating 1/2.4. Hmm, three uses 12.92... let me recall the actual code in ColorManagement? Actually three uses exact functions in JS (SRGBToLinear in ColorManagement): linear = c <= 0.04045 ? c/12.92 : pow((c+0.055)/1.055, 2.4); decode uses 2.4 exponent. The GLSL LinearTosRGB in ShaderChunk uses pow(c, 0.41666) ≈ 1/2.4? Let me check: three's `sRGBTransferOETF`: 

```
vec3 sRGBTransferOETF( in vec3 value ) {
	return mix( 12.92 * value, 1.055 * pow( value, vec3( 0.0031308 / 2.4?...
```

Hmm. The actual chunk (r150+):

```glsl
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value * 12.92, vec3( lessThanEqual( value, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( ( value + vec3(0.055)) / 1.055, vec3(2.4) ), value / 12.92, vec3( greaterThanEqual( value, vec3(0.04045) ) ) ), value.a );
}
```

Hmm those use 0.41666 ≈ 1/2.4 for encode but 2.4 for decode — asymmetric, so encode(decode(x)) may not be exactly x. The encode uses pow(c, 0.41666) not pow(c, 1/2.4)=0.416666... 0.41666 vs 0.4166667 — slight difference. Roundtrip could deviate by ~1e-4 in sRGB value, which *255 ~ 0.03 — negligible, rounds to correct byte. But to be safer, I'll write my own exact encode with vec3(1.0/2.4), and decode with 2.4 and thresholds 0.0031308/0.04045 consistent. Roundtrip with exact inverse functions: encode(decode(s)) exactly? Threshold mismatch: encode threshold 0.0031308 linear, decode threshold 0.04045 sRGB. The exact sRGB standard: encode: s = 1.055 l^(1/2.4) - 0.055 for l > 0.0031308; decode inverse. These are exact inverses piecewise, thresholds correspond. So exact-ish in float. Good.

Then screen value: OutputPass applies its LinearTosRGB (approximate with 0.41666...?) Actually in r155+, OutputPass uses shader with `#include <colorspace_fragment>` which calls LinearTosRGB with pow(value, vec3(0.41666)) — slight difference from 1/2.4. Result 1-s computed... Let's compute worst-case: our shader computes L' = decode(1 - s_in). OutputPass encodes L' using slightly different exponent → s_out ≈ 1 - s_in with error. The encode difference: using exponent 0.41666 vs 0.41666667: relative error in s value... pow difference causes error ~ derivative. d s/d exponent: s = 1.055 * l^e - 0.055, ∂s/∂e = 1.055 * l^e * ln(l). ln(l) ≤ ln(1)=0, magnitude up to... for l in [0.0031308, 1], |ln l|max ~ 5.77. Error in e: 1/2.4 - 0.41666 = 0.4166667 - 0.41666 = 0.0000067. s error ≈ 1.055 * s-ish * 5.77 * 6.7e-6 ≈ 4e-5 for s=1. Times 255 ≈ 0.01 — negligible. Fine either way.

But wait — does OutputPass actually do the sRGB conversion, or does the renderer do it when OutputPass renders? OutputPass renders to screen with a material that includes colorspace_fragment based on renderer.outputColorSpace. Yes.

Also, RenderPass renders scene (with ColorManagement enabled) — the color 0x336699 set as background: Color constructor with ColorManagement converts sRGB hex to linear-sRGB working space. Yes, scene.background = new THREE.Color(0x336699) — in the composer's linear render target it will be linear values. Then our shader: c (linear) → encode → sRGB value = 0.2,0.4,0.6 → invert → 0.8,0.6,0.4 → decode → linear → OutputPass encode → 0.8,0.6,0.4 → bytes 204,153,102 = 0xcc9966. ✓. Sphere white: linear (1,1,1) → encode → 1 → invert → 0 → black ✓.

One subtlety: WebGLRenderer outputColorSpace default SRGBColorSpace; when rendering scene into composer's render target, no conversion (correct). ShaderPass render targets linear. Good.

Also renderer tone mapping: OutputPass applies tone mapping; default NoToneMapping, identity. Good.

Composer render targets: EffectComposer by default creates HalfFloatType targets in recent versions. Fine.

Now write the shader:

```ts
const InvertShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `...`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
      return mix(lo, hi, step(0.0031308, c));
    }
    vec3 sRGBToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow(max((c + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
      return mix(lo, hi, step(0.04045, c));
    }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec3 srgb = linearToSRGB(col.rgb);
      vec3 inverted = 1.0 - srgb;
      gl_FragColor = vec4(sRGBToLinear(inverted), col.a);
    }`
};
```

Note: mix with step gives per-component selection — step returns 0 or 1, mix(lo, hi, s) — with s=0 gives lo, s=1 gives hi. Good.

Note: gl_FragColor is deprecated; ShaderPass in modern three still uses gl_FragColor with ShaderMaterial (which defines it for WebGL2? ShaderMaterial compiles with GLSL1 by default, so gl_FragColor works). Yes, ShaderMaterial default glslVersion null → GLSL1 compatible. Fine.

Also OutputPass requires... it's fine.

Composer size on resize: composer.setSize(w, h). Also camera aspect.

__ready after first frame: use a flag; renderer.setAnimationLoop(() => { ... composer.render(); if (!ready) { ready = true; (window as any).__ready = true; } });

Testing hints say after first frame. Fine.

Imports: import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'; import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'; import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'; import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

Camera lookAt origin; sphere MeshBasicMaterial white.

Write code.