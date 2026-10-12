The key: with OutputPass doing linear->sRGB conversion at the end, the inversion in linear space won't produce the exact sRGB inverse. To get exact inverse of the on-screen sRGB color, invert after sRGB conversion. Options: invert in the shader but convert linear->sRGB in shader and skip OutputPass... Requirement says use OutputPass. Approach: RenderPass renders in linear space (render target). ShaderPass inverts linear values, then OutputPass converts to sRGB — result: sRGB(sRGB_to_linear_inverse...) Actually on-screen without effect: OutputPass converts linear to sRGB: c_screen = sRGB(c_lin). With inversion: we want 1 - sRGB(c_lin). If shader does invert then OutputPass: sRGB(1 - c_lin) ≠ 1 - sRGB(c_lin).

Better: ShaderPass converts linear→sRGB in shader, then inverts: color = 1 - sRGB(c_lin). Then OutputPass would convert again — wrong. So instead: do linear→sRGB in shader and invert, then make OutputPass not double-convert... OutputPass always applies tone mapping + sRGB conversion. Hmm.

Alternative: renderer.outputColorSpace = SRGBColorSpace is default; OutputPass does linearToOutputTexel. If we set the shader to output already-inverted sRGB values, OutputPass would convert again from linear? OutputPass just applies the encoding conversion assuming input is linear. So if shader outputs sRGB values treated as linear, OutputPass would linearToSRGB again — double.

Cleanest: skip OutputPass? Requirement says include an OutputPass. Alternative: put the inversion AFTER OutputPass — i.e., ShaderPass last with sRGB conversion done inside... But ShaderPass after OutputPass reads from a render target. OutputPass renders to screen if last. If ShaderPass is after OutputPass, OutputPass writes to a target (linear values already converted to sRGB in the target since OutputPass applies conversion writing to target). Then ShaderPass inverts: 1 - sRGB(c) — exact. Then ShaderPass last renders to screen; but ShaderPass output to screen — will renderer apply any conversion? ShaderPass's final quad renders with renderToScreen; no additional color conversion applied by ShaderMaterial (no colorspace fragment includes). The value written goes raw. So final screen value = 1 - sRGB(c_lin) = exact inverse.

But wait: OutputPass's conversion depends on renderer.outputColorSpace. When rendering to a render target, the conversion still applies? OutputPass shader does linearToOutputTexel based on renderer's output color space regardless of target. Yes.

So order: RenderPass → OutputPass → ShaderPass(invert). Hmm but the requirement hints "order the passes (or convert in the shader) so this holds". So order OutputPass before ShaderPass is acceptable.

Actually simpler alternative: ShaderPass does linear→sRGB conversion itself then inverts, and skip OutputPass—but OutputPass required. I'll go with RenderPass, ShaderPass... wait, ShaderPass must come with invert. Order: RenderPass → OutputPass → inversion ShaderPass (last, renderToScreen). But composer automatically sets renderToScreen for last pass. Fine.

Hmm, but is it weird? The prompt allows "order the passes". Good.

Shader code:

vertex: standard passthrough with uv.
fragment: uniform tDiffuse; vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(1.0 - c.rgb, c.a);

Since after OutputPass the buffer contains sRGB-encoded values (as raw values in the target — target is likely RGBA8 or HalfFloat; EffectComposer default uses HalfFloatType... OutputPass writing sRGB-encoded values into HalfFloat target, values are sRGB numbers stored raw). Then ShaderPass reads raw values, inverts, writes to screen raw. Screen canvas is sRGB (default), so value displayed = the raw value.

Check background: linear color of 0x336699. Color(0x336699) — when set as scene.background with renderer color management, the color is converted from sRGB to linear internally. RenderPass output linear. OutputPass converts back to sRGB → 0x336699 values (0.2, 0.4, 0.6). Invert → (0.8, 0.6, 0.4) = 0xcc9966. Sphere white → black. ✓

Write the code. EffectComposer with default render targets. Need ShaderPass import, RenderPass, OutputPass.

ShaderPass last: composer will render it to screen. OutputPass before it renders to composer's write buffer? EffectComposer handles buffers.

Note: ShaderPass constructor: new ShaderPass(shaderObject) with uniforms, vertexShader, fragmentShader.

Resize: composer.setSize(w,h), renderer.setSize, camera aspect.

Delta time not really needed but use clock for loop; motion not required. Just render composer.

Code:

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

Setup scene, camera, sphere, renderer, composer with passes: renderPass, outputPass, invertPass.

Animation loop: composer.render(); after first frame set __ready = true.

Write it.