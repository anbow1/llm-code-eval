Key issue: EffectComposer renders to a linear render target. With OutputPass at the end, the tone mapping/color space conversion happens in OutputPass. The RenderPass renders scene into the composer's render target — with `THREE.ColorManagement.enabled` (default true), the scene colors (background 0x336699, white) are converted to linear working space when rendered. The render target holds linear values. Then the shader pass inverts in linear space, then OutputPass converts linear→sRGB.

Inverting in linear space: screen value S = linearToSRGB(L). Inverse of S = 1 - S. If we invert linearly: output L' = 1 - L, then screen shows linearToSRGB(1-L) which is NOT 1 - linearToSRGB(L). So we need to convert linear→sRGB in the shader, invert there, and skip OutputPass? Or: invert in the shader but operate in sRGB space.

Options:
1. No OutputPass; ShaderPass does linear→sRGB conversion then inversion: `gl_FragColor = vec4(1.0 - LinearTosRGB(tDiffuse.rgb), 1.0)`. Then renderer.outputColorSpace... but EffectComposer writes to screen via a ShaderPass renderToScreen directly; the output would be raw values written to the canvas. If outputColorSpace is sRGB and we write directly... Actually with ShaderPass as last pass renderToScreen, values are written as-is to the framebuffer (no conversion since material's fragment shader output — renderer applies colorspace conversion only within built-in materials via encodings_fragment / OutputPass). ShaderPass material doesn't include colorspace conversion, so output is raw. So writing `1.0 - srgbDecode(linear)` gives exactly screen inverse.

But requirement says to include an OutputPass. Hmm: "with a RenderPass, a custom ShaderPass ... and an OutputPass." So we must include OutputPass.

So setup: RenderPass → ShaderPass (invert) → OutputPass. OutputPass does linear→sRGB (and tone mapping). For the screen to show the exact inverse, the inversion must happen in the sRGB-encoded domain AFTER the linear→sRGB conversion. But OutputPass comes last...

Alternative: do the encoding inside the shader pass, invert, then decode back? Since inversion commutes... Let's think: we want final screen = 1 - S where S = encode(L) (encode = linear→sRGB). Chain: input L (linear in buffer). We want OutputPass to output 1 - encode(L). OutputPass does encode(x). So we need OutputPass input L' such that encode(L') = 1 - encode(L), i.e., L' = decode(1 - encode(L)). So the ShaderPass should: take tDiffuse (linear), convert to sRGB: c = LinearTosRGB(rgb), invert: c = 1 - c, then convert back to linear: c = SRGBToLinear(c). Then OutputPass encodes it, yielding 1 - encode(L). 

But careful: is the value in the composer's render target actually linear scene color? With ColorManagement enabled, background color 0x336699 is converted to linear when set via scene.background = new THREE.Color(0x336699)? THREE.Color stores... ColorManagement converts hex to working color space (linear) on construction: `new THREE.Color(0x336699)` applies setHex with SRGBColorSpace → converts to working color space (linear-srgb). So the Color's rgb components are linear. When rendered into the composer's render target... The render target texture type is UnsignedByteType; EffectComposer's render targets — since r152ish, EffectComposer uses HalfFloatType by default? Actually EffectComposer default render target: `new WebGLRenderTarget(w, h, { type: HalfFloatType })` — yes, since r154 or so, HalfFloatType default. So linear values stored with full precision. Renderer outputColorSpace conversion happens only at the final output (canvas). Since intermediate render targets have colorSpace NoColorSpace/linear, RenderPass writes linear values.

So ShaderPass fragment: 
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 srgb = LinearTosRGB(texel.rgb); // or manual
  gl_FragColor = vec4(SRGBToLinear(1.0 - srgb), texel.a);
}
```
Then OutputPass converts linear→sRGB and writes to screen.

But wait — ShaderPass material (RawShaderMaterial? No, ShaderMaterial). ShaderChunk includes: ShaderMaterial doesn't automatically include tonemapping/colorspace chunks unless the shader includes them. We define our own GLSL with manual conversion functions. The sRGB transfer functions:

LinearToSRGB: if (c <= 0.0031308) c *= 12.92 else 1.055 * pow(c, 1/2.4) - 0.055.
SRGBToLinear: if (c <= 0.04045) c / 12.92 else pow((c+0.055)/1.055, 2.4).

Alternatively simpler approach: could I set renderer.outputColorSpace = THREE.LinearSRGBColorSpace and... but requirement demands exact math; the decode/encode approach with OutputPass is robust. Actually there's a subtlety with OutputPass in newer three versions: OutputPass includes `#include <colorspace_fragment>` which uses renderer.outputColorSpace. Fine.

Another subtlety: does three convert output of ShaderPass when rendering to screen? ShaderPass uses ShaderMaterial; rendering to the canvas — three applies output color space conversion only if the shader includes the colorspace_fragment chunk. Our ShaderMaterial does not include it, and OutputPass does the conversion itself. So the chain works.

Also note roundtripping through encode→invert→decode→encode introduces quantization? Half float buffers — precision fine. encode(decode(1-encode(L))) = 1 - encode(L) mathematically exact function composition. Good.

Background 0x336699 (sRGB values 0.2, 0.4, 0.6). RenderPass stores linear version. Shader: convert to sRGB → (0.2, 0.4, 0.6) → invert → (0.8, 0.6, 0.4) = 0xcc9966 → decode to linear → OutputPass encodes → (0.8, 0.6, 0.4) on screen = 0xcc9966. ✓ White sphere: linear 1.0 → encode 1.0 → invert 0 → decode 0 → screen 0. ✓

Wait: is `new THREE.Color(0x336699)` stored as linear? Yes with ColorManagement.enabled default true (r152+). setHex converts from sRGB to working (linear). And when rendered, since values already linear and target is linear, the fragment output... MeshBasicMaterial includes colorspace_fragment chunk which converts based on the output color space of the current render target. For a render target with texture.colorSpace = NoColorSpace, no conversion. EffectComposer render targets default colorSpace? WebGLRenderTarget default texture colorSpace is NoColorSpace. Good, so linear stays linear.

Now the ShaderPass inversion happens in linear→sRGB→invert→linear. Implement:

```glsl
vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}
vec3 sRGBToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
```

mix with step works componentwise. Note step(edge, x): returns 0 if x < edge. Good.

Animate a subtle motion so delta matters: rotate sphere? Sphere is uniform white; rotation invisible. Maybe scale pulse subtly — but the test may check colors at center. The sphere is at origin occupying screen center; camera at z=4, radius 1 → sphere visible. Background color check happens at corners. Keep sphere static; animate something harmless, e.g., camera slight orbit? That would change appearance — keep it simple: rotate the sphere (invisible) or just render with elapsed-based subtle... Actually motion must use delta; I can just have rotation using clock delta. Fine.

Expose __composer too.

Write the code.

Imports: THREE, EffectComposer, RenderPass, ShaderPass, OutputPass.

ShaderPass constructor: `new ShaderPass(shader)` where shader = { uniforms, vertexShader, fragmentShader }. Need uniforms: tDiffuse: { value: null }.

Resize: composer.setSize(window.innerWidth, window.innerHeight).

__ready after first frame: use a flag in the animation loop; set after composer.render() on first invocation... "After the first frame is rendered" — set after render call in first tick. Some checkers sample after ready. Set it after composer.render().

Full code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Scene, camera, sphere, background. Renderer: antialias true, append. Composer with RenderTarget default (HalfFloat). Actually to be safe specify? Default constructor fine.

Renderer: no toneMapping (NoToneMapping default) so OutputPass just does color space.

Write it.