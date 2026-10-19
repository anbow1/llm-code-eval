The key: RenderPass renders to linear-sRGB buffers (renderer.outputColorSpace default sRGB but when rendering to render target, no conversion happens — render targets are linear). OutputPass does tone mapping + linear->sRGB conversion. To invert "screen colors" exactly, we should invert in sRGB space, i.e., after the linear->sRGB conversion. Options: put ShaderPass after OutputPass? OutputPass is meant to be last but we can add a ShaderPass after it. EffectComposer's final pass renders to screen; ShaderPass after OutputPass works. Alternatively, convert in shader: do sRGB decode? Simpler: order RenderPass -> ShaderPass? No — ShaderPass before OutputPass would invert linear values; inverting linear then converting to sRGB does not give exact inverse of sRGB. So place ShaderPass AFTER OutputPass: RenderPass, OutputPass, ShaderPass (invert). OutputPass converts to sRGB; then invert in shader gives 1 - sRGB value exactly.

But OutputPass renders... OutputPass's material; when it's not last pass, composer renders to write buffer which is HalfFloatType, fine. Then ShaderPass renders to screen. That works.

Alternatively invert in shader with linear->sRGB conversion then invert: 1 - sRGB(linear). Same result. I'll do RenderPass -> OutputPass -> InvertPass.

0x336699: sRGB values (0.2, 0.4, 0.6). Inverse 0.8, 0.6, 0.4 = 0xcc9966. Good. White sphere -> black. Good.

Write GLSL invert shader:

uniforms tDiffuse; fragColor = vec4(1.0 - texture(tDiffuse, vUv).rgb, texture alpha). Keep alpha 1.

Compile-safe TypeScript: everything typed. ShaderPass constructor accepts object shader. Fine.

Code:

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

Renderer: set size, append canvas. scene, camera, sphere. Composer: RenderPass, OutputPass, InvertShaderPass.

Resize: camera.aspect, updateProjectionMatrix, renderer.setSize, composer.setSize.

Animation loop: use clock delta; maybe rotate sphere slightly. composer.render(). Set __ready after first frame.

Full code.