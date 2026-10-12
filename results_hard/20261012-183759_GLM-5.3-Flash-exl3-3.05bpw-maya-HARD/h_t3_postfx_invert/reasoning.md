We need to invert colors in a way that the final sRGB output is exact inverse of the sRGB colors. Without post-processing, renderer with outputColorSpace sRGB converts linear background color to sRGB. Scene.background color 0x336699 — when set as THREE.Color, with color management enabled, it's converted from sRGB to linear. RenderPass renders to composer's render target (linear). Then invert in shader: 1 - linear. Then OutputPass converts linear to sRGB. That yields inverse in linear space, which is NOT the same as inverse in sRGB space. sRGB inverse: 0x336699 -> 0xcc9966 requires inverting in sRGB space.

Solution: in the shader, convert the linear color to sRGB first, invert, then... OutputPass will do linear->sRGB conversion at the end, which would convert our sRGB value again incorrectly. Options:

1. Shader pass: convert linear to sRGB, invert (1 - srgb). Then OutputPass would convert linear->sRGB assuming input is linear — wrong. So instead we could make the shader output sRGB-inverted value and skip OutputPass... but requirement says use OutputPass. Alternative: in shader, do: linear -> sRGB, invert, then sRGB -> linear back? That would then OutputPass converts linear->sRGB producing inverse? Let's check: we want screen value S' = 1 - S where S is the sRGB-encoded value. If shader converts linear L to sRGB S = encode(L), invert to 1-S, then to make OutputPass's encode produce 1-S, we need input L' = decode(1-S). So shader: output = decode(1 - encode(L)). Then OutputPass encodes: encode(decode(1-encode(L))) = 1-encode(L) = 1-S. 

But wait — the render target: EffectComposer by default uses HalfFloatType render targets. ShaderPass reads the texture; values are linear. Fine.

Alternatively simpler: use OutputPass at the end but the shader does the decode trick. Or: put OutputPass first? No, OutputPass is meant last.

Actually another approach: order RenderPass, ShaderPass (invert in sRGB space: input is linear, so encode, invert, output as sRGB-encoded values... then OutputPass would double-encode). The decode trick works.

GLSL: three.js ShaderPass provides tDiffuse. We can use functions: THREE includes color space conversion functions in shaders? There's `#include <colorspace_fragment>` but that works on gl_FragColor. We can write manual functions. sRGB decode/encode:

vec3 sRGBToLinear(vec3 c) { return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045, c)); }
vec3 LinearTosRGB(vec3 c) { return mix(c*12.92, 1.055*pow(c, vec3(1./2.4))-0.055, step(0.0031308, c)); }

Fragment: vec4 texel = texture2D(tDiffuse, vUv); vec3 srgb = LinearTosRGB(texel.rgb); vec3 inv = 1.0 - srgb; gl_FragColor = vec4(sRGBToLinear(inv), texel.a);

But careful: HalfFloat render targets — encode produces values in [0,1], fine. Precision: HalfFloatType has ~10-bit mantissa; sRGB values like 0x33/255 = 0.2 need precision to round to 0xcc. Half float precision: for value 0.2, mantissa precision ~ 0.0001, fine. encode(0.2...) — background 0x336699: linear value stored: color management converts 0x336699 to linear. Render pass writes linear float. Encode back gives approx sRGB 0.2±0.0005, then 1-that = 0.8±0.0005, decode, encode back gives ~0.8 which rounds to 0xcc (0.8 = 204/255 = 0.8 exactly). Precision fine? 0xcc/255 = 0.8000. The value would be like 0.7998, quantized to 8-bit: 0.7998*255 = 203.95 → rounds to 204 = 0xcc. Should be fine.

Actually, is there a simpler alternative: renderer.outputColorSpace... EffectComposer with OutputPass handles the final conversion. Alternatively, we could avoid the double conversion by having OutputPass but setting... no, decode trick is standard.

Wait — check: does the ShaderPass input actually linear? Composer render targets: default HalfFloatType, and RenderPass renders scene into it. Renderer's outputColorSpace applies only to canvas output; when rendering to render target, output is linear (working color space). Yes.

Also, does scene.background get converted? scene.background = new THREE.Color(0x336699) — THREE.Color constructor with hex converts to working color space (linear) when color management enabled (default). Yes, since r152 ColorManagement.enabled default true.

MeshBasicMaterial color 0xffffff — white in linear = 1, encode → 1, invert → 0 → black. Good.

Vertex shader: standard from CopyShader style.

ShaderPass definition:

const InvertShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `...`,
  fragmentShader: `...`
};

Note: THREE.ShaderPass expects GLSL1-style? EffectComposer passes use texture2D and gl_FragColor; three converts via ShaderMaterial (glslVersion default null → WebGL1 style compiled with GLSL3? Actually ShaderMaterial default uses GLSL1 which three converts). Using texture2D and gl_FragColor is fine.

Write code:

imports: THREE, EffectComposer, RenderPass, ShaderPass, OutputPass.

Setup: renderer with antialias maybe; set size; append canvas.

Camera: PerspectiveCamera(75?, aspect, 0.1, 100), position (0,0,4), lookAt origin. Aspect update.

Sphere: SphereGeometry(1, 32, 32), MeshBasicMaterial({color: 0xffffff}).

Composer: RenderPass(scene, camera), ShaderPass(InvertShader), OutputPass.

Animation loop: use clock delta maybe just composer.render(); set __ready after first frame.

Resize: camera.aspect, renderer.setSize, composer.setSize.

Also expose __scene, __camera, __renderer, __composer.

Set renderer.setPixelRatio? Fine to set min(devicePixelRatio,2). composer handles via renderer? EffectComposer uses renderer size * pixelRatio automatically when constructed; setSize handles it.

Ready flag after first render: use a boolean; in animation callback, render then if !ready set true.

Edge: strict TS — all good.

Write final code.