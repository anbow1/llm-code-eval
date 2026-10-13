Need to invert in sRGB space. Chain: RenderPass renders scene into render target (linear). To invert correctly in screen space, we need to convert linear→sRGB, invert, then back to linear→sRGB at output. Options: use OutputPass at end which does linear→sRGB conversion. So ShaderPass should work in linear space: invert linearly? No — inverse of sRGB-encoded color equals sRGB-encode of inverse linear only if conversion commutes with inversion, which it doesn't for gamma curves.

Requirement: on-screen final = inverse of what screen shows without effect. Without effect, screen shows sRGB(linear_color). With effect: must show 1 - sRGB(linear). So invert after sRGB encoding. Approach: RenderPass (linear) → ShaderPass: convert linear→sRGB, invert, convert back to linear (so OutputPass re-encodes to sRGB giving inverted sRGB value). Or simpler: ShaderPass does sRGB conversion + invert, and skip OutputPass's conversion... but OutputPass also does tone mapping and color space conversion. If we set outputColorSpace handling ourselves: use ShaderPass that outputs sRGB-encoded inverted color, then OutputPass would double-encode. Better: ShaderPass: color = LinearToSRGB(color); color = 1 - color; then SRGBToLinear(color) → OutputPass encodes again → screen shows 1 - sRGB(linear). That works.

Alternatively set renderer.outputColorSpace = SRGBColorSpace (default) and use OutputPass. In three.js r150+, RenderPass renders to composer's render target with colorSpace linear (render targets are linear). OutputPass converts to sRGB.

Write GLSL with sRGBTransfer functions. Use built-in chunks? Simpler to write approximate sRGB transfer function:

vec3 linearToSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - .055, step(0.0031308, c)); }
vec3 sRGBToLinear inverse.

Shader pass uniforms tDiffuse.

Code:

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

Check 0x336699 → inverse 0xcc9966: 0x33=51 →204=0xcc ✓, 0x66=102→153=0x99 ✓, 0x99=153→102=0x66 ✓.

Shader:

uniforms: { tDiffuse: { value: null } }
vertex: standard.
fragment:
vec4 texel = texture2D(tDiffuse, vUv);
vec3 srgb = linearToSRGB(texel.rgb);
vec3 inverted = 1.0 - srgb;
gl_FragColor = vec4(sRGBToLinear(inverted), texel.a);

Composer sizes on resize.

Ready flag: set after first frame in animation loop, first render then set true.