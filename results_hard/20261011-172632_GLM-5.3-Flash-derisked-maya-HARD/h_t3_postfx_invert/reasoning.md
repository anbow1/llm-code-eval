Background 0x336699 in sRGB; renderer with outputColorSpace sRGB converts. With composer, the render pass renders into a linear target; OutputPass does linear->sRGB conversion. The shader pass runs on linear values; inverting in linear space then converting to sRGB won't give exact inverse of sRGB. So we need to convert to sRGB in the shader, invert, and mark... Actually simplest: in the shader, convert input linear color to sRGB (approx via pow 1/2.4? Three's sRGBTransferOETF uses 12.92/1.055/2.4). Then invert: 1 - srgb. Then output, and the OutputPass would convert again — double conversion. So better: invert in sRGB space and skip OutputPass conversion? But requirement says include OutputPass. Option: convert to sRGB in shader, invert, then convert back to linear (sRGBToLinear), so OutputPass converts to sRGB again giving exact sRGB inversion. That's clean: color = linearToSRGB(c); result = 1 - color; then linearize result: sRGBToLinear(1 - srgbColor). OutputPass OETF(sRGBToLinear(x)) = x for exact values? sRGBToLinear uses pow 2.4 with the same constants as OETF inverse; round-trip may not be exact but nearly. Actually Three's SRGBToLinear: if c <= 0.04045 c/12.92 else ((c+0.055)/1.055)^2.4; OETF: if c <= 0.0031308 c*12.92 else 1.055*c^(1/2.4)-0.055. Round trip: OETF(ToLinear(c)): for c=0.4, ToLinear = ((0.455)/1.055)^2.4 = (0.43128)^2.4. OETF of that = 1.055*x^(1/2.4)-0.055 = 1.055*0.43128 - 0.055 = 0.455 - 0.055 = 0.4. Exact (up to float precision). Good, round-trip is mathematically exact.

But there's a subtlety: background color 0x336699 — when set via scene.background = new THREE.Color(0x336699), with color management enabled, the hex is interpreted as sRGB and converted to linear-srgb working space. In render target (HalfFloatType, linear), it stays linear. Then shader: convert to sRGB gives 0x336699/255 exactly. Invert: 1 - 0.2 = 0.8, 1-0.4=0.6, 1-0.6=0.4 → 0.8,0.6,0.4 = 204,153,102 = 0xCC9966. 

Then convert back to linear via sRGBToLinear in shader, OutputPass converts back. Alternatively simpler: do the inversion and convert-to-sRGB in shader, then OutputPass would apply OETF again — no. Use the linearize approach.

Shader with THREE's includes: we can use `#include <ColorSpaceShader>` ... Actually there's `sRGBTransferEOTF` in colorspace_fragment? In shaders, we can include <colorspace_pars> ... Simpler: write GLSL functions manually.

Write fragment:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
vec3 sRGBToLinear(vec3 c){
  return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045, c));
}
vec3 LinearTosRGB(vec3 c){
  return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}
void main(){
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 srgb = LinearTosRGB(texel.rgb);
  vec3 inverted = 1.0 - srgb;
  gl_FragColor = vec4(sRGBToLinear(inverted), texel.a);
}
```

Note mix with step: for c=0, step(0.0031308, 0)=0, ok. mix(a,b,t) = a*(1-t)+b*t. Fine.

Renderer: outputColorSpace default is SRGBColorSpace. Composer's render targets: default HalfFloatType. Fine.

OutputPass converts from working color space (linear) to output (sRGB). Good.

Also need __ready after first frame: use a flag in the animation loop — after composer.render() first time set true. But "after the first frame is rendered" — set in the loop after first render call. That's fine.

Alpha in shader: background alpha... render target alpha may be 1. Keep texel.a.

Code:

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

Shader object with uniforms, vertexShader, fragmentShader.

Scene, camera, sphere, composer. Resize handler updates camera.aspect, renderer.setSize, composer.setSize.

Animation loop with delta/elapsed: use clock? Requirement: motion must use delta/elapsed time. There's no motion here, but still use renderer.setAnimationLoop with a callback; we can just call composer.render(). Maybe add slow rotation of sphere using delta to satisfy "motion must use delta time" — the sphere is white basic material; rotating is invisible. Could add subtle... keep it simple: rotate sphere with delta. Fine.

__ready: set after first composer.render().