The key: with OutputPass doing linear->sRGB conversion at the end, the inversion in linear space won't produce the exact sRGB inverse. To get exact inverse of screen colors, we need to invert after the sRGB conversion, or invert in sRGB space.

Approach: RenderPass renders in linear space into composer's HalfFloat buffer. Then custom ShaderPass converts linear->sRGB, inverts (1 - sRGB), then converts back sRGB->linear so OutputPass's conversion restores the inverted sRGB value exactly. Or simpler: disable OutputPass conversion... but OutputPass always converts based on renderer.outputColorSpace? Actually OutputPass applies sRGB conversion when renderer.outputColorSpace is SRGB (default). Alternative: do the whole thing in shader: convert linear to sRGB, invert, then linearize back, then OutputPass converts again — round-trip is exact if we implement conversion precisely (matching the same polynomial used in OutputPass). Three.js sRGB conversion uses exact piecewise formulas (LinearToSRGB uses pow(1/2.2)? No — three.js uses the exact piecewise for both directions in ColorManagement / output shader chunk: colorspace_fragment uses LinearToSRGB with pow(2.2)? Let me recall.

In three.js ShaderChunk `colorspace_fragment`: gl_FragColor = linearToOutputTexel( gl_FragColor ); where linearToOutputTexel for sRGB uses the piecewise: mix with pow... Actually it uses:

vec4 LinearTosRGB( in vec4 value ) {
  vec3 s = mix(value.rgb * 12.92, pow(value.rgb, vec3(0.41666)) * 1.055 - 0.055, step(0.0031308, value.rgb));
  return vec4(s, value.a);
}

Wait, three.js currently uses exact piecewise in the output shader (generated). Yes, modern three.js uses the exact transfer functions in the generated shader (getTexelEncodingFunction uses LinearToSRGB with the piecewise). Let me just implement the exact piecewise myself in the shader:

sRGB encode: c <= 0.0031308 ? 12.92*c : 1.055*pow(c, 1/2.4) - 0.055
sRGB decode: c <= 0.04045 ? c/12.92 : pow((c+0.055)/1.055, 2.4)

So shader pass: sample linear color, encode to sRGB, invert, decode back to linear, output. OutputPass then encodes again -> exact inverse. 0x336699 -> sRGB values (0.2, 0.4, 0.6) since 0x33=51/255=0.2, 0x66=0.4, 0x99=0.6. Inverse: (0.8, 0.6, 0.4) = 0xcc, 0x99, 0x66.

One subtlety: background color 0x336699 set via scene.background = new THREE.Color(0x336699). With color management enabled (default), Color constructor converts from sRGB to linear working space. Then render outputs linear, OutputPass converts back to sRGB giving 0.2,0.4,0.6. Good.

But there's precision: HalfFloat buffer round-trip — encode to sRGB then decode back introduces small error, then encode again... error should be tiny; values like 0.2 exact-ish. Fine.

Alternative simpler approach: set composer render target... Actually simpler: put inversion pass AFTER OutputPass. Order: RenderPass, OutputPass (converts to sRGB), then ShaderPass invert with renderToScreen... but OutputPass rendered to buffer then shader pass to screen — the intermediate buffer would clamp to 8-bit? Composer's buffers are HalfFloat, fine. But OutputPass tone mapping + colorspace conversion into a HalfFloat buffer keeps sRGB values. Then invert in sRGB space and render to screen directly. That gives exact inversion. But ShaderPass after OutputPass: does ShaderPass render to screen if it's last? EffectComposer sets renderToScreen for the last enabled pass automatically. Yes, composer handles that.

Hmm, but OutputPass in a buffer then another pass — OutputPass's shader outputs whatever, fine. That's simpler and exact. But "OutputPass" last is conventional; requirement just says use RenderPass, custom ShaderPass, and an OutputPass. Order: RenderPass, OutputPass, InvertPass (last, renders to screen). That yields exact inverse: screen shows sRGB value inverted. Actually wait — after OutputPass writes sRGB-encoded values into the HalfFloat buffer, is there any further conversion? No, writes raw values. Then invert pass outputs 1-c, rendered to screen with outputColorSpace... The final pass renders directly to canvas (renderToScreen), and renderer does NOT apply conversion for direct-to-screen material shaders? Actually when rendering to screen, three.js materials get the colorspace_fragment chunk which converts based on renderer.outputColorSpace — ShaderPass's shader material is a ShaderMaterial; three.js injects colorspace_fragment into ShaderMaterial? For ShaderMaterial, the output color space encoding chunk is included only if... Actually WebGLProgram includes `colorspace_fragment` replacement only when the shader contains `#include <colorspace_fragment>`. ShaderPass shaders don't include it, so no conversion. But wait — there's also renderer.outputColorSpace affecting render target textures only, not direct drawing. So final pass writes raw values to canvas. Good — exact inversion.

But subtle: does WebGLRenderer apply dithering or sRGB to canvas? The drawing buffer receives values as-is. Fine.

However, there's a nuance: EffectComposer with renderToScreen on last pass — the last pass renders to null render target. But ShaderPass fragment shader outputs gl_FragColor directly. Good.

Alternatively keep conventional order with encode/invert/decode. Either works. I'll go with the conventional order (RenderPass, ShaderPass invert with linear->sRGB->invert->sRGB->linear... wait that's double work) — hmm, actually simplest correct conventional: RenderPass, ShaderPass (invert in sRGB domain after converting linear to sRGB, then convert back to linear), OutputPass. Round-trip error minimal.

I'll choose: RenderPass → OutputPass → ShaderPass(invert, renderToScreen last). Cleaner and exact. But is it "correct color space" thinking? Yes.

Hmm, but one concern: OutputPass applies tone mapping (renderer.toneMapping = NoToneMapping default) and color space conversion. Fine.

Actually, wait — there might be an issue: OutputPass reads renderer.outputColorSpace via... OutputPass shader uses defines set from renderer in its render() method: it checks renderer.outputColorSpace. If outputColorSpace is SRGBColorSpace, it applies conversion. Default is SRGBColorSpace. Good.

Let me also double check: does composer.setSize need to be called, and also handles pixel ratio. I'll call composer.setSize(w,h) and renderer.setPixelRatio maybe. Keep pixel ratio default (or set devicePixelRatio). I'll set renderer.setPixelRatio(Math.min(devicePixelRatio,2)) and composer.setPixelRatio same.

Code:

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

Scene, camera, sphere.

Invert shader:

const InvertShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = vec4(1.0 - texture2D(tDiffuse, vUv).rgb, 1.0); }`
};

const invertPass = new ShaderPass(InvertShader);

composer.addPass(renderPass); composer.addPass(outputPass); composer.addPass(invertPass);

Animation loop with clock delta (requirement: motion must use delta — there's no motion required, but keep a slow rotation using delta to satisfy). Rotate sphere with delta.

Resize: camera.aspect, updateProjectionMatrix, renderer.setSize, composer.setSize.

__ready after first frame: use a flag, set in animation loop after composer.render().

Type strictness: fine.

Write code.