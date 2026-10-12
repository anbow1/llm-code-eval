Setup: scene background 0x336699 (interpreted as sRGB by default in newer three versions? Actually `new THREE.Color(0x336699)` — with ColorManagement enabled, setHex converts from sRGB to linear by default). OutputPass does linear→sRGB conversion. So the pipeline: sRGB color → linear in render target (composer uses HalfFloat linear), inversion in shader happens in linear space, then OutputPass converts back to sRGB. Inverting in linear space does not give exact inverse of sRGB values: 1-sRGB in sRGB space ≠ sRGB of 1-linear.

Requirement: background 0x336699 appears as 0xcc9966 = exact per-channel inversion in sRGB. So the inversion must happen in sRGB space. Options:

1. Put ShaderPass after OutputPass: then the shader receives sRGB-encoded colors and inverts them. But then the final output is sRGB values written to the framebuffer — OutputPass already converted, so the final pass writes those values directly to screen without further conversion. That works: RenderPass (linear) → OutputPass (linear→sRGB) → ShaderPass (invert sRGB). Need ShaderPass render targets... EffectComposer handles the buffers; final pass renders to screen. Values in the buffer after OutputPass are sRGB-encoded numbers, invert them, output to canvas. Canvas is sRGB — correct.

But careful: OutputPass converts based on renderer.outputColorSpace. Since composer's buffers are HalfFloatType, OutputPass outputs sRGB values. Then ShaderPass inverts. Final values go to the default framebuffer directly. That gives exact inversion.

2. Alternatively do conversion inside shader: convert linear to sRGB in the shader, invert, then... but then OutputPass would convert again — wrong. So order: RenderPass, OutputPass, ShaderPass.

Shader: gl_FragColor = vec4(1.0 - color.rgb, color.a)? Background alpha is 1, fine. Use tDiffuse.

Note: with no postprocessing, screen would show OutputPass result. With our chain the final is inverted sRGB. Good.

ShaderPass import, Shader. Write GLSL with vUv varying.

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Camera, sphere, background. Renderer, composer with passes: RenderPass, OutputPass, InvertPass.

Invert shader:

```ts
const InvertShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `...`,
  fragmentShader: `...`
};
```

Fragment: 
```
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(1.0 - c.r, 1.0 - c.g, 1.0 - c.b, c.a);
}
```

Ready flag: use a variable firstFrame rendered; set __ready = true after composer.render in loop first time.

Resize: renderer.setSize, composer.setSize, camera aspect.

Full code.