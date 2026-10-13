We need to invert colors in a way that the final sRGB output is exact inverse of what the scene would show without the effect.

Without effect: renderer outputs sRGB conversion of linear colors. Background 0x336699 — when set as scene.background color, three.js converts it... Actually scene.background color: with output color space sRGB, the color 0x336699 is treated as sRGB, converted to linear, rendered, then converted back to sRGB → displayed as 0x336699. We want screen to show 0xcc9966 = 0x100 - 0x33, etc. 0xcc9966 is the sRGB-space inverse of 0x336699.

If we invert in linear space, then sRGB conversion won't give exact complement. To get exact complement in sRGB: invert after sRGB conversion, i.e., after OutputPass. But we can put invert shader after OutputPass? EffectComposer: passes order RenderPass → ShaderPass → OutputPass. Alternatively, in the shader, convert input linear to sRGB, invert, then convert back to linear so OutputPass converts back to sRGB. That yields exact complement (with slight precision issues, but round trip linear↔sRGB of an sRGB value returns approximately exact value; with 8-bit render targets there may be rounding error of ±1). Hmm.

Actually simpler: order passes RenderPass → OutputPass → ShaderPass(invert). OutputPass converts to sRGB, then invert in sRGB space. But composer's final pass... OutputPass not last is fine? OutputPass applies tone mapping and color space conversion to working space (sRGB). Then ShaderPass invert in sRGB values. The final ShaderPass renders to screen. That works: displayed = 1 - sRGB(linear value) exactly (modulo quantization to 8-bit render target: OutputPass writes sRGB values into render target — but render targets are UnsignedByteType, so sRGB values quantized to 8 bits — then inverted exactly → 0xcc9966 exactly? The value 0x336699 → linear → back to sRGB gives exactly 0x336699 (since conversion is exact-ish, three.js uses approximations; may be off by 1 LSB). Risk of off-by-one. But requirement says exact.

Alternative: do everything in shader with render target in linear space (HalfFloatType default in EffectComposer? EffectComposer default render target type: since r152ish, EffectComposer uses HalfFloatType by default). Yes, EffectComposer defaults to HalfFloatType RGBA. So RenderPass writes linear values with high precision. Then custom shader: convert linear→sRGB, invert, output. Then OutputPass would convert sRGB→linear→? No—OutputPass converts working color space (linear) to sRGB output. If our shader outputs sRGB values, OutputPass would treat them as linear and convert again → wrong.

Better: order RenderPass → ShaderPass → OutputPass, where shader does: c = LinearTosRGB(input); invert: result_srgb = 1 - c; then convert back sRGBToLinear(result) and output that. Then OutputPass converts linear→sRGB with same approximation function, giving back 1 - c (approx). Since three's sRGBToLinear and LinearTosRGB are approximations (power 2.4 with piecewise), round-trip may not be exact to 8 bits... LinearTosRGB(x) then SRGBToLinear then LinearTosRGB: is round trip exact? f(g(f(x))) ≈ f(x) with error; with HalfFloat precision, error tiny, after 8-bit quantization of final output likely exact or off by ≤1. Hmm.

Safest approach avoiding double conversion: RenderPass → OutputPass → ShaderPass(invert, no conversion). With HalfFloat render target, OutputPass writes sRGB-encoded values with high precision (no 8-bit quantization). Then shader inverts: 1 - value, writes to screen (renderToScreen). ShaderPass final pass outputs directly to canvas — no further conversion since it's a ShaderPass (no colorspace handling). Output values written to drawing buffer... when rendering directly to screen, three.js doesn't apply output color space conversion in ShaderMaterial? The renderer applies output color space conversion only via material's fragment shader chunks (colorspace_fragment) included in built-in materials; custom ShaderMaterial doesn't include it unless we add it. ShaderPass uses raw ShaderMaterial — no conversion. So final value = 1 - sRGB(linear scene color). 

But does OutputPass in that position behave correctly? OutputPass converts tone mapping + sRGB conversion to output color space. It reads linear HDR from readBuffer, writes to writeBuffer (render target) — fine. Then ShaderPass inverts and renders to screen. That should satisfy exactly: background linear value of 0x336699: THREE.Color with ColorManagement enabled converts hex sRGB→linear. Rendered → linear. OutputPass → sRGB ≈ 0x336699/255 values. Then 1 - that = 0xcc9966. Quantization: final render to canvas is 8-bit; value in buffer is half-float ≈ exact sRGB value like 51/255 = 0.2. 1-0.2 = 0.8 → 204. 

But is half-float precision enough that sRGB(51/255 linear roundtrip) is exactly 0.2? The scene.background color: 0x336699 → Color stores linear values computed from sRGB. RenderPass outputs those linear values. OutputPass applies LinearTosRGB approximation: the standard formula: if x ≤ 0.0031308: 12.92x else 1.055*pow(x, 1/2.4) - 0.055. The linear value for sRGB 0.2: inverse: ((0.2+0.055)/1.055)^2.4. Then forward again gives ~0.2 within float precision, essentially exact to half-float precision (~3 decimal digits). Half float has ~10 bits mantissa → error up to ~0.0005 → after inversion and 8-bit quantization could be off by ≤1 in 255? 0.0005*255 ≈ 0.13, so likely exact. Good enough.

Alternatively, simpler and cleaner: invert in sRGB space directly within shader between RenderPass and OutputPass, converting back to linear. I'll go with RenderPass → OutputPass → ShaderPass order? Wait — OutputPass is designed as the last pass, but functionally it works as a middle pass. Actually there could be an issue: OutputPass renderToScreen false, writes to buffer, fine.

Hmm, but one subtlety: EffectComposer's renderTarget — final ShaderPass renders to screen with no color conversion, correct.

Actually there's another consideration: does ShaderPass material output raw values without sRGB conversion when rendering to screen? ShaderMaterial fragment shader compiled by three: three adds colorspace_fragment only for built-in materials via #include; ShaderMaterial user shader doesn't include those chunks, so raw values. Yes.

Alternatively do it in one pass with conversion both ways in GLSL. I'll implement approach: passes = RenderPass, OutputPass, invert ShaderPass. But wait — is it more "expected" to have custom ShaderPass then OutputPass? The prompt says "a RenderPass, a custom ShaderPass ... and an OutputPass" — order suggested. And "Think about where the linear -> sRGB conversion happens and order the passes (or convert in the shader) so this holds." So either approach acceptable. I'll do: RenderPass → ShaderPass (convert linear→sRGB, invert, convert back sRGB→linear) → OutputPass. This keeps OutputPass last (conventional). Use accurate sRGB transfer functions in GLSL.

sRGBToLinear: if c ≤ 0.04045: c/12.92 else pow((c+0.055)/1.055, 2.4).
LinearTosRGB: if c ≤ 0.0031308: 12.92c else 1.055*pow(c, 1/2.4) - 0.055.

Shader:
```
vec3 srgb = linearToSRGB(vColor...);
vec3 inverted = 1.0 - srgb;
gl_FragColor = vec4(srgbToLinear(inverted), 1.0);
```
Then OutputPass converts linear→sRGB giving inverted sRGB → screen shows 1 - original sRGB. Round-trip precision with HalfFloat targets should be fine.

Actually wait — does OutputPass use the same approximation formula? OutputPass uses colorspace_fragment which calls LinearTosRGB (the three.js approximations in color space conversion functions). Three's LinearTosRGB in shaders (encodings_pars / colorspace functions): they use the exact same piecewise formulas. And three's SRGBToLinear (CPU, for Color) uses pow 2.4 piecewise too. So scene linear value for 0.2 sRGB = ((0.255)/1.055)^2.4 computed on CPU; shader forward conversion gives back ≈0.2 to within half-float precision (~1e-3 relative... half float: 10-bit mantissa, for values ~0.2, absolute error ~ 0.2 * 2^-11 ≈ 1e-4). Then inverted ≈0.8, back to linear, OutputPass converts to ≈0.8, error ~1e-4 → 8-bit quantization of 204±0.03 → exact 204. Good.

Hmm, but does ShaderPass's intermediate render target use HalfFloat? EffectComposer creates render targets with HalfFloatType by default (since r154-ish). Assume modern three. Also ShaderPass writes into render target via composer swap. Fine.

Let me write the code.

Structure:
- imports: THREE, EffectComposer, RenderPass, ShaderPass, OutputPass.
- renderer: WebGLRenderer({antialias:true}); outputColorSpace default sRGB; append canvas.
- scene.background = new THREE.Color(0x336699).
- sphere: SphereGeometry(1, 32, 32), MeshBasicMaterial white.
- camera PerspectiveCamera(60?, aspect, 0.1, 100) at (0,0,4), lookAt origin.
- composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene,camera)); shaderPass with invert shader; composer.addPass(outputPass).

Shader uniforms: tDiffuse.

GLSL:

vertex:
```
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
```

fragment:
```
uniform sampler2D tDiffuse;
varying vec2 vUv;
vec3 linearToSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
vec3 srgbToLinear(vec3 c){ return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045, c)); }
void main(){
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 srgb = linearToSRGB(max(texel.rgb, vec3(0.0)));
  vec3 inverted = 1.0 - srgb;
  gl_FragColor = vec4(srgbToLinear(inverted), texel.a);
}
```

mix with step: step(edge,x) returns 0 if x<edge. linearToSRGB: want branch c<=0.0031308 → 12.92c, else pow. step(0.0031308, c) is 1 when c >= edge. mix(a,b,t) = a*(1-t)+b*t. Good. srgbToLinear: branch c<=0.04045 → c/12.92. Good.

Animation loop: use clock, maybe rotate sphere slightly using delta. Requirement: motion uses delta time. Add subtle rotation of sphere based on elapsed time. But sphere is basic material white — rotation invisible. Fine, still rotate. Or scale pulse? Keep rotation.

Set __ready after first frame: track flag; in loop, render, then if !ready set true.

Resize: camera.aspect, renderer.setSize, composer.setSize.

Expose __scene, __camera, __renderer, __composer.

Write it.