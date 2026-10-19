The key: RenderPass renders to linear targets. The invert should happen in sRGB space (what the screen would show without effect). Without effect, renderer with outputColorSpace sRGB converts linear→sRGB at output. With composer + OutputPass, OutputPass does the tone mapping and color space conversion. So to invert the sRGB colors, we need to invert AFTER linear→sRGB conversion. So order: RenderPass → ShaderPass (invert) → OutputPass would invert in linear space — wrong. Correct: convert to sRGB in shader first, invert, then... but OutputPass will do linear→sRGB again. Better: do invert shader AFTER conversion, and skip OutputPass's conversion? The spec requires OutputPass though.

Option: ShaderPass converts linear→sRGB, inverts, then converts back sRGB→linear. Then OutputPass converts linear→sRGB at end. Net: screen shows inverse of sRGB. That works and satisfies ordering.

Actually simpler: ShaderPass after OutputPass? OutputPass outputs sRGB-encoded into the composer's output target... Composer's final pass renders to screen. If OutputPass is not last, its output goes to a render target. ShaderPass after OutputPass would invert the already-converted values, and write directly to screen. But ShaderPass renders to screen without further conversion — but does composer render final pass to screen with color space? The composer's render targets — when writing to screen (null target), the renderer's outputColorSpace affects... Actually when rendering to null target with renderer.outputColorSpace = SRGBColorSpace, Three.js r152+ handles color space conversion in shader via colorspace_fragment chunk only for built-in materials; ShaderMaterial output isn't automatically converted. Hmm, ShaderPass with ShaderMaterial: the fragment output goes through... ShaderMaterial doesn't include colorspace_fragment unless included. So writing after OutputPass: values already in sRGB, written raw to screen — that gives the inverse correctly. But wait, OutputPass expects to be last and renderToScreen. If ShaderPass comes after, ShaderPass is last and renders to screen.

But there's a subtlety: OutputPass reads from a linear buffer and writes sRGB values into the next render target (which composer might mark as sRGB?). Composer's render targets default to LinearSRGBColorSpace? In recent Three versions, EffectComposer creates HalfFloatType targets; the last pass renders to screen. When ShaderPass renders to screen, no conversion happens (ShaderMaterial). So values pass through as-is. So order RenderPass → OutputPass → InvertPass works.

Alternatively RenderPass → InvertPass(with linear→sRGB→invert→sRGB→linear) → OutputPass. Both fine. I'll go with the second approach as it keeps OutputPass last (canonical). Actually simpler and robust: invert in sRGB domain inside shader:

```
vec3 srgb = pow(color, vec3(1.0/2.2)) — but OutputPass uses proper sRGB transfer. Better to do exact: 
vec3 SRGBtoLinear exact and linear to sRGB exact functions.
color = LinearTosRGB(color);
color = 1.0 - color;
color = sRGBToLinear(color);
```

Then OutputPass converts back. Exactness: sRGB transfer function roundtrip is exact in float, then OutputPass converts again — deterministic. Result: 0x336699 → screen 0xCC9966? Let's check: without effect, screen shows sRGB( linear(0x336699) )... Actually scene.background color 0x336699: Color set from hex is interpreted as sRGB and converted to linear working space. RenderPass outputs linear. OutputPass converts back to sRGB → 0x336699 on screen. With our shader: convert to sRGB gives exactly 0x336699 values (as floats ~0.2,0.4,0.6), invert → 0xCC9966, convert to linear, OutputPass converts back → 0xCC9966. 

But rounding: 0.2 in float → invert 0.8 → 0xCC (204/255 = 0.8). 0x99 = 0.6 exactly? 153/255 = 0.6. 102/255 = 0.4. 51/255=0.2. These aren't exactly representable but the conversions: sRGB encoding of linear value then decoding... The background color: renderer converts 0x336699 hex sRGB to linear via SRGBToLinear, RenderPass stores linear, our shader converts back with LinearTosRGB — roundtrip gives back ~0.2/0.4/0.6 (float precision), invert, SRGBToLinear, OutputPass LinearTosRGB → back to ~0.8/0.6/0.4 → quantized to 204,153,102 = 0xCC9966. Good.

Sphere white → linear 1.0 → sRGB 1.0 → invert 0 → black. Good.

Use exact sRGB transfer functions. Also OutputPass uses tone mapping — set renderer.toneMapping = NoToneMapping (default) so OutputPass only does color space conversion.

Write code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Shader uniforms tDiffuse. Fragment:

```glsl
vec3 linearToSRGB(vec3 c){
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}
vec3 srgbToLinear(vec3 c){
  vec3 lo = c / 12.92;
  vec3 hi = pow(max((c + 0.055)/1.055, vec3(0.0)), vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), c));
}
void main(){
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 srgb = linearToSRGB(texel.rgb);
  vec3 inverted = 1.0 - srgb;
  gl_FragColor = vec4(srgbToLinear(inverted), texel.a);
}
```

Note ShaderPass fragment includes standard vertex shader from ShaderPass? ShaderPass requires full shader object with vertex/fragment; provide vertex with vUv.

Set composer size on resize: composer.setSize(w,h). Also maybe setPixelRatio; keep simple: renderer.setPixelRatio(Math.min(devicePixelRatio,2)) and composer.setPixelRatio same.

Ready flag after first frame: in animation loop, after composer.render(), set __ready=true once.

Strict typing fine.