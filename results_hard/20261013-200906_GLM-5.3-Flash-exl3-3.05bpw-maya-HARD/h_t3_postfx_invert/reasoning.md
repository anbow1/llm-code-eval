We need to invert colors in linear space correctly. Without the effect, screen shows sRGB(0x336699). With inversion, screen should show 0xcc9966 = 255 - component. So the inversion should happen in sRGB space after the linear→sRGB conversion.

Order: RenderPass renders in linear (renderer.outputColorSpace = SRGBColorSpace but composer render targets are linear... Actually with EffectComposer, the render target is typically HalfFloatType and colors remain linear until OutputPass converts to sRGB). So to invert in sRGB space: ShaderPass after OutputPass? But ShaderPass writes to a render target, then another pass would need to output. Options:

Option 1: RenderPass → OutputPass (converts linear→sRGB, writes to buffer... actually OutputPass when not last in chain still writes to write buffer in linear? No—OutputPass applies tone mapping and color space conversion via shader). If ShaderPass is after OutputPass, the ShaderPass input is sRGB-encoded values; invert there (1.0 - x), then since it's the last pass, the ShaderPass renders to screen. But then the renderer would apply output color space conversion again? No—passes render to screen with the renderToScreen flag, and the material output goes directly; the renderer doesn't re-encode because ShaderMaterial's fragment output... Actually with WebGLRenderer, when rendering to canvas with outputColorSpace = SRGBColorSpace, built-in materials include colorspace_fragment chunk that converts linear→sRGB. ShaderMaterial (raw ShaderMaterial used by ShaderPass) — ShaderPass uses ShaderMaterial which does NOT include the colorspace conversion chunk by default. Actually ShaderPass's material is a ShaderMaterial; the final fragment shader... ShaderPass shaders are user-provided GLSL wrapped? ShaderPass uses THREE.ShaderMaterial with user's shader. The colorspace conversion is only applied if the shader includes `#include <colorspace_fragment>`. So ShaderMaterial output goes to screen as-is (raw values). Hmm, but actually in newer three.js, ShaderMaterial output IS not converted. So:

Approach: RenderPass (linear buffer) → OutputPass (tone map + linear→sRGB conversion, writes to writeBuffer... wait OutputPass checks if it's the last pass? No, OutputPass always applies conversion; EffectComposer handles renderToScreen). Actually EffectComposer: each pass renders into readBuffer/writeBuffer swap; the last pass renders to screen if renderToScreen is true (composer sets this automatically via `pass.renderToScreen` handled by composer? EffectComposer sets `pass.renderToScreen = (i === last)`. Yes, EffectComposer manages this: in render(), it iterates and the last enabled pass renders to screen.

So chain: RenderPass → OutputPass → ShaderPass(invert). OutputPass converts to sRGB (writing sRGB-encoded values into the buffer, which is fine numerically since buffers are just floats). Then ShaderPass reads sRGB values, outputs 1-x directly to screen without further conversion (ShaderMaterial has no colorspace chunk). That gives exact inverse. 

Wait: but ShaderPass fragment output — in three.js r150+, ShaderMaterial fragment shaders get `#include <colorspace_fragment>`? No, only if you include it. The ShaderPass copyShader etc. Actually there's a subtlety: ShaderMaterial does not automatically append color space conversion. Correct.

But also need to check: does OutputPass convert based on renderer.outputColorSpace? Yes, OutputPass uses `LinearToSRGB` in shader based on renderer's outputColorSpace. When OutputPass is not the last pass, it still renders into a render target — the conversion still happens in shader. Good.

Alternatively simpler: do inversion inside shader with sRGB conversion manually: invert in linear? To get exact inverse we need: screen = sRGB(linear_inverted)? The requirement: background appears as 0xcc9966. Without effect screen shows sRGB(c_linear). With effect we want screen = 1 - sRGB(c_linear) = 0xcc9966. So we need inversion after conversion, i.e., shader does: c = texture; c_srgb = LinearToSRGB(c); out = 1 - c_srgb; and skip OutputPass. But requirement says use OutputPass. So chain RenderPass → ShaderPass → OutputPass won't work because inversion in linear then OutputPass converts: screen = sRGB(1 - c_linear) ≠ 1 - sRGB(c_linear).

So order: RenderPass → OutputPass → ShaderPass. The OutputPass is not last; that's fine.

Wait — does OutputPass behave correctly when not rendering to screen? OutputPass shader: applies tone mapping then color space conversion based on renderer state. It always does the conversion regardless of renderToScreen. Yes.

Then ShaderPass invert: gl_FragColor = vec4(1.0 - color.rgb, color.a). Since ShaderMaterial doesn't include colorspace_fragment, values go to screen raw. 

Hmm, but there's a catch: in recent three.js versions (r152+), when rendering to the default framebuffer with outputColorSpace = SRGBColorSpace, does the renderer convert ShaderMaterial output? The conversion happens in shader via colorspace_fragment include, which ShaderMaterial shaders don't have unless included. So raw output. But wait, WebGLRenderer might set the drawing buffer... no, canvas is not sRGB-textured by default; conversion is shader-side. So fine.

Also the background color: scene.background = new THREE.Color(0x336699). With ColorManagement enabled, Color(0x336699) is converted sRGB→linear automatically. RenderPass renders linear values. OutputPass converts back to sRGB → 0x336699 values on screen normally. ShaderPass inverts → 0xcc9966. 

One more subtlety: EffectComposer render target type — default is HalfFloatType in recent versions, fine.

Also OutputPass when writing to intermediate buffer: it uses `#include <colorspace_fragment>` style? OutputPass defines its own shader with tonemapping and colorspace functions; it reads renderer.toneMapping and outputColorSpace via defines updated in render(). Yes.

Resize: composer.setSize.

Animation loop: composer.render(deltaTime). Use clock delta.

Also set renderer.setPixelRatio? Fine, composer.setPixelRatio too optionally. I'll set pixel ratio and setSize accordingly.

Write the code.

Shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(1.0 - color.rgb, color.a);
}
```

ShaderPass needs vertexShader too:

```glsl
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
```

TypeScript strict: fine.

Set __ready after first frame: use a flag in loop.

Also maybe set renderer.toneMapping = NoToneMapping (default) — fine.

Check OutputPass import path: 'three/addons/postprocessing/OutputPass.js'.

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Build scene, camera, sphere, composer with passes in order: renderPass, outputPass, invertPass.

Loop: const delta = clock.getDelta(); composer.render(delta); if (!ready) { set __ready = true; }

Resize handler: camera.aspect, updateProjectionMatrix, renderer.setSize, composer.setSize.

Done.