The key challenge here is the color space handling. Let me think carefully about how Three.js post-processing works with color spaces.

In modern Three.js (r152+), the renderer outputs to a framebuffer in linear color space. The `OutputPass` handles the linear-to-sRGB conversion (and tone mapping). So the pipeline is:

1. RenderPass: renders the scene into a framebuffer (linear color space)
2. ShaderPass: operates on the framebuffer (linear color space values)
3. OutputPass: converts linear to sRGB for display

The problem: the user wants the FINAL ON-SCREEN colors to be the exact sRGB inverse. That is:
- Background sRGB 0x336699 → on screen should be 0xcc9966 (which is 1.0 - 0x33/255, 1.0 - 0x66/255, 1.0 - 0x99/255)
- White sphere sRGB 0xffffff → on screen should be 0x000000

Now, the tricky part: the color space conversion happens at different stages.

In Three.js's color management system (introduced around r152):
- `THREE.ColorManagement.enabled` is true by default in newer versions
- Colors set with `setHex(0x336699)` in sRGB space are converted to linear working space
- The render pass outputs in linear space
- OutputPass converts from linear to sRGB for the final display

So the flow is:
1. Scene has background color 0x336699 (sRGB). With ColorManagement, this gets converted to linear internally. The RenderPass writes linear values to the framebuffer.
2. My ShaderPass sees linear values.
3. OutputPass converts linear → sRGB for display.

If I just do `rgb -> 1.0 - rgb` on the linear values, then after OutputPass converts to sRGB, the result won't be the exact sRGB inverse.

For example:
- sRGB 0x33 = 51/255 ≈ 0.2 → linear ≈ 0.0331
- Inverting in linear: 1.0 - 0.0331 = 0.9669
- Converting to sRGB: ≈ 0.993 → 0xFE... not 0xCC

So we need to invert in sRGB space, not linear space.

The solution: In my custom shader pass, I need to:
1. Convert from linear to sRGB
2. Invert in sRGB space
3. Convert back to linear

This way, after OutputPass does linear→sRGB, the final displayed color will be the sRGB inverse.

OR, alternatively, I could put my shader pass AFTER OutputPass and do the inversion in sRGB space directly (since after OutputPass the values are already sRGB). But wait, if I put a pass after OutputPass, the output buffer would be in sRGB, and the final blit to screen would... hmm, actually let me think about this more carefully.

Actually, let me reconsider. In Three.js's EffectComposer:
- RenderPass renders to a WebGLRenderTarget (which is in linear space by default with `colorSpace = LinearSRGBColorSpace` or actually it depends on the setup)
- Intermediate passes operate on the render targets
- OutputPass handles the final conversion (tone mapping + linear to sRGB) and outputs to the screen

Wait, actually in newer Three.js versions, the render targets used by EffectComposer have their colorSpace set appropriately. Let me think about what actually happens:

In Three.js r152+:
- `WebGLRenderer` uses `outputColorSpace = THREE.SRGBColorSpace` by default
- When rendering to a render target (as in EffectComposer), the render target's `texture.colorSpace` determines how colors are handled
- The default render targets created by EffectComposer use `LinearSRGBColorSpace`
- OutputPass converts from linear to sRGB and applies tone mapping before writing to the screen

So the pipeline with EffectComposer:
1. RenderPass → renders scene with color management, writes linear values to render target
2. ShaderPass → operates on linear values
3. OutputPass → converts linear to sRGB, writes to screen

For the inversion to be correct in sRGB space, my shader needs to:
1. Take linear input
2. Convert to sRGB
3. Invert
4. Convert back to linear

Then OutputPass will convert back to sRGB, giving the correct inverted sRGB values.

Let me write the linear↔sRGB conversion in GLSL:

sRGB to linear:
```glsl
vec3 sRGBToLinear(vec3 rgb) {
    return mix(rgb / 12.92, pow((rgb + 0.055) / 1.055, vec3(2.4)), step(0.04045, rgb));
}
```

Linear to sRGB:
```glsl
vec3 linearToSRGB(vec3 rgb) {
    return mix(rgb * 12.92, 1.055 * pow(rgb, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, rgb));
}
```

So my shader pass should:
```glsl
vec3 color = texture2D(tDiffuse, vUv).rgb;
// Convert from linear to sRGB
vec3 srgb = linearToSRGB(color);
// Invert in sRGB space
vec3 inverted = 1.0 - srgb;
// Convert back to linear
vec3 linearInverted = sRGBToLinear(inverted);
gl_FragColor = vec4(linearInverted, 1.0);
```

Then OutputPass converts back to sRGB, and we get the correct visual inversion.

Let me verify:
- Background: sRGB 0x336699
- sRGB values: 51/255, 102/255, 153/255 = 0.2, 0.4, 0.6
- Linear (what RenderPass outputs): sRGBToLinear(0.2) ≈ 0.0331, sRGBToLinear(0.4) ≈ 0.1329, sRGBToLinear(0.6) ≈ 0.3274
- My shader: linearToSRGB(0.0331) = 0.2, invert → 0.8, sRGBToLinear(0.8) ≈ 0.6116
- OutputPass: linearToSRGB(0.6116) ≈ 0.8 → 0xCC ✓
- Similarly for G: sRGB 0.4 → invert → 0.6 → 0x99 ✓
- For B: sRGB 0.6 → invert → 0.4 → 0x66 ✓
- Result: 0xCC9966 ✓

- White sphere: sRGB 1.0 → linear 1.0 → my shader: sRGB 1.0, invert → 0.0, sRGBToLinear(0) = 0 → OutputPass: sRGB(0) = 0 → black ✓

This approach works.

Now let me write the complete TypeScript file.

For the ShaderPass, I need to write a custom shader that uses `tDiffuse` (the input texture from the previous pass). The ShaderPass expects a shader object with `uniforms`, `vertexShader`, and `fragmentShader`.

Let me write the complete file:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Wait, I need to be careful about the strict TypeScript. The ShaderPass shader object - let me make sure the types work.

The ShaderPass constructor accepts an object with `uniforms`, `vertexShader`, `fragmentShader`, and optionally `defines`. The types should be fine.

Let me also make sure I handle the `renderer.outputColorSpace` correctly. By default it's `THREE.SRGBColorSpace`. This is what we want because OutputPass handles the conversion.

Actually wait - I need to double-check: when `outputColorSpace` is SRGBColorSpace and we're rendering through a composer, does the renderer still apply the sRGB encoding when rendering to a render target? 

In modern Three.js, when rendering to a render target (not the screen), the renderer does NOT apply the sRGB encoding - it writes linear values. The `outputColorSpace` setting only affects the final write to the canvas. This is why OutputPass exists - it manually applies the conversion when we're using a composer.

So my understanding is correct: the RenderPass outputs linear values, and OutputPass handles the linear→sRGB conversion.

Let me also consider: do I need to set `renderer.outputColorSpace = THREE.LinearSRGBColorSpace`? Actually, when using a composer, the final pass (OutputPass) handles the conversion, so the renderer's outputColorSpace doesn't matter for the intermediate passes. But for the final screen write... hmm.

Actually, I think the standard setup is:
- Keep `renderer.outputColorSpace = THREE.SRGBColorSpace` (default)
- Use OutputPass which handles the conversion internally
- The final framebuffer write from OutputPass goes to screen

Wait, but if `outputColorSpace = SRGBColorSpace`, does the renderer's final blit also apply sRGB encoding? That could cause double-encoding. Let me think...

In the EffectComposer, the last pass renders directly to the screen (null render target). If the renderer's `outputColorSpace` is SRGBColorSpace, the shader of the last pass might have the sRGB encoding built in by the renderer. But OutputPass already handles it explicitly...

Actually, I recall that in newer Three.js, the `outputColorSpace` is handled through a `#include <colorspace_fragment>` in the built-in materials. For ShaderPass, the shader is custom, so it doesn't include that. But OutputPass does handle it.

I think the correct approach is:
- Set `renderer.outputColorSpace = THREE.SRGBColorSpace` (default, don't change it)
- The OutputPass handles the final linear→sRGB conversion in its own shader
- The screen framebuffer is just a regular framebuffer, no automatic sRGB encoding (since we're not using sRGB textures for the backbuffer)

Actually, I think in WebGL, the default framebuffer doesn't have sRGB encoding applied automatically. The sRGB encoding is done in the shader code (via the `colorspace_fragment` include). So there's no double-encoding issue.

Let me just go with the standard setup and trust that it works. The key insight for my problem is the linear→sRGB→invert→sRGB→linear conversion in my shader pass.

Actually, wait. Let me reconsider. Maybe there's a simpler approach: put my inversion shader AFTER OutputPass. Then the values going into my shader are already sRGB, and I just invert them. But then there's no conversion after my shader, and the screen displays sRGB values directly.

Hmm, but the problem is: if I put a pass after OutputPass, the OutputPass writes to an intermediate render target (with sRGB encoded values), and then my pass reads those sRGB values, inverts them, and writes to screen. The screen would display the inverted sRGB values directly.

But wait - the intermediate render targets in the composer might have `colorSpace = LinearSRGBColorSpace` set, which means when the shader samples from them, the GPU might apply a linear→sRGB conversion... no, that's not how it works. The colorSpace on the texture is just metadata for Three.js; it doesn't affect GPU sampling.

Actually, I think the simpler approach might work:
1. RenderPass → linear values in RT
2. OutputPass → sRGB values in RT
3. My ShaderPass → reads sRGB values, inverts, writes to screen

But there might be issues with how Three.js handles the color space metadata on render targets. Let me stick with my original approach (invert in sRGB space within the shader, keeping values linear for OutputPass) since it's more robust.

Let me write the code now.

One more thing: for TypeScript strict mode, I need to make sure all types are correct. The ShaderPass shader object should be typed properly.

Let me write the shader carefully:

```glsl
// Vertex shader (standard fullscreen quad)
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```glsl
// Fragment shader
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 sRGBToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 linearToSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    // The input is in linear space (from RenderPass)
    // Convert to sRGB, invert, convert back to linear
    vec3 srgb = linearToSRGB(texel.rgb);
    vec3 inverted = 1.0 - srgb;
    vec3 result = sRGBToLinear(inverted);
    gl_FragColor = vec4(result, 1.0);
}
```

This should work correctly.

Now for the TypeScript strict mode - I need to handle the uniforms properly. The ShaderPass expects a `Shader` type which has `uniforms`, `vertexShader`, `fragmentShader`. Let me make sure this compiles.

Actually, for the `ShaderPass`, the type it accepts is basically `{ uniforms: { [key: string]: IUniform }, vertexShader: string, fragmentShader: string }`. In strict TypeScript, I might need to cast or type things carefully.

Let me write the full file now.
