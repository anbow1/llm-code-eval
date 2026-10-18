Need to invert in sRGB space. Renderer output color space default is SRGB. EffectComposer with OutputPass handles tone mapping + sRGB conversion. The RenderPass renders scene into linear render target. ShaderPass after RenderPass works in linear space; inverting linear doesn't invert sRGB. Correct approach: invert after sRGB conversion, i.e., place ShaderPass after OutputPass? But OutputPass is meant to be last. Alternative: do the sRGB conversion in the shader then invert, with OutputPass... Hmm.

Options: Use ShaderPass with a shader that converts linear to sRGB, inverts, and output. Then no OutputPass — but composer would output... Actually if renderer.outputColorSpace = SRGBColorSpace and we render to screen via composer, the composer's final pass writes to screen without conversion (renderToScreen shader just copies). So we need our ShaderPass to do LinearTosRGB conversion and invert. Then set renderer.outputColorSpace = THREE.LinearSRGBColorSpace? No — the final pass renderToScreen doesn't apply conversion anyway in EffectComposer (it uses RawShaderMaterial copy shader without colorspace conversion; actually OutputPass does the conversion). So: RenderPass -> ShaderPass (sRGBEncode + invert) -> OutputPass? No, then OutputPass would convert again.

Simplest correct: RenderPass -> ShaderPass that does sRGB conversion then inverts -> OutputPass? OutputPass does tone mapping and sRGB conversion. If we skip OutputPass and our ShaderPass is last, colors stay as computed. But requirement says to include an OutputPass. So order: RenderPass, ShaderPass(invert in linear?)... 

Alternative: OutputPass last, and ShaderPass before it inverts in sRGB domain: convert linear->sRGB in shader, invert, then OutputPass converts sRGB->linear? No, OutputPass does linear->sRGB conversion, not reverse.

Hmm. Actually OutputPass shader: applies tone mapping then LinearTosRGB via colorspace_fragment include. So input must be linear.

Best: ShaderPass that converts to sRGB, inverts, then converts back to linear? That's identity in linear: invert(linearToSRGB(c)) then sRGBToLinear... that just equals invert of sRGB in linear space — mathematically invert(linearToSRGB(c)) in linear = sRGBToLinear(1 - linearToSRGB(c)). Then OutputPass converts back to sRGB giving 1 - linearToSRGB(c). That works and keeps OutputPass meaningful. Slightly convoluted but valid.

Simpler: put ShaderPass AFTER OutputPass. Composer doesn't enforce OutputPass last. ShaderPass input would be sRGB-encoded, invert directly, output to screen. The final pass renders to screen; since our shader outputs already-sRGB values, and the copy to screen framebuffer doesn't convert, that's exact. So order: RenderPass, OutputPass, ShaderPass(invert). That's clean and correct. renderer.outputColorSpace default is SRGB, but EffectComposer ignores outputColorSpace for the render targets (they're linear-ish, HalfFloat, and colorspace conversion done by OutputPass). Yes, this works.

GLSL for invert pass:

uniform sampler2D tDiffuse; varying vec2 vUv;
void main(){ vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(1.0 - c.rgb, c.a); }

Check background: 0x336699. scene.background Color is interpreted as sRGB, converted to linear working space. RenderPass outputs linear. OutputPass converts to sRGB -> 0x336699 on intermediate. Invert -> 0xcc9966. Good. White sphere -> black. 

Renderer: set outputColorSpace? Default is SRGBColorSpace; when rendering to screen through composer, the final shader pass writes directly — three.js r15x: ShaderPass material gl_FragColor with colorspace_fragment? ShaderPass's CopyShader-like includes... ShaderPass uses the provided shader directly, no colorspace conversion include. Good.

Need WebGLRenderer with antialias maybe. Composer render targets default type UnsignedByte now? In recent versions EffectComposer default is HalfFloatType. Fine.

Write code.

ShaderPass constructor: new ShaderPass(shader) where shader = {uniforms, vertexShader, fragmentShader}. Need THREE.UniformsUtils? Can just pass object; ShaderPass clones uniforms.

Resize: composer.setSize(w,h).

__ready after first frame: use flag in animate, set after composer.render() first call.

tsc strict: fine.

Code:

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

Shader uniforms: { tDiffuse: { value: null } }.

Write full file.