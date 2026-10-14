Let me think carefully about the color space issue here.

The user wants color inversion such that:
- Background `0x336699` (sRGB) must appear as `0xcc9966` on screen
- White sphere `0xffffff` (sRGB) must appear as `0x000000` (black) on screen

The key insight is about color spaces:
- `scene.background = new THREE.Color(0x336699)` - In Three.js r152+, colors are in linear working space by default, but `new THREE.Color(0x336699)` actually stores the sRGB value as-is (it's a hex value, not color-managed through setHex with a color space argument).

Wait, let me reconsider. In modern Three.js (r152+):
- `new THREE.Color(0x336699)` stores the values in linear space by default (the Color constructor treats hex values as sRGB and converts to linear internally when `ColorManagement.enabled = true` which is the default).

Actually, let me reconsider again. In Three.js r152+:
- `THREE.ColorManagement.enabled` is `true` by default
- `new THREE.Color(0x336699)` - the constructor takes sRGB hex values and converts them to linear working color space internally
- When rendering, the renderer converts from linear to sRGB output (via `OutputPass` or the renderer's `outputColorSpace`)

So the pipeline without post-processing would be:
1. `new THREE.Color(0x336699)` → stored in linear space
2. Rendered with sRGB output encoding → back to sRGB `0x336699` on screen

Now with the post-processing pipeline:
- `RenderPass` renders to a linear-space framebuffer (no sRGB encoding applied by the renderer when rendering to a render target)
- Custom `ShaderPass` does `1.0 - rgb` → this operates in LINEAR space
- `OutputPass` converts from linear to sRGB for display

So if I invert in linear space:
- Linear value of `0x336699`: Let me calculate. sRGB 0x33 = 51/255 = 0.2, 0x66 = 102/255 = 0.4, 0x99 = 153/255 = 0.6
  - Linear of 0.2 sRGB ≈ 0.0331
  - Linear of 0.4 sRGB ≈ 0.1329
  - Linear of 0.6 sRGB ≈ 0.3283
- Inverted linear: (1-0.0331, 1-0.1329, 1-0.3283) = (0.9669, 0.8671, 0.6717)
- Convert back to sRGB: that would NOT give 0xcc9966

So doing `1.0 - rgb` in linear space and then converting to sRGB does NOT produce the expected result.

What the user wants:
- sRGB `0x336699` → `0xcc9966` (simple per-channel inversion in sRGB space: 0xff - 0x33 = 0xcc, 0xff - 0x66 = 0x99, 0xff - 0x99 = 0x66) ✓
- sRGB `0xffffff` → `0x000000` ✓

So the inversion must happen in sRGB space, not linear space.

How to achieve this:
Option A: Do the inversion AFTER the linear→sRGB conversion. That means: RenderPass → OutputPass → InvertPass. But the user specifically says "a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass."

Option B: Do the inversion in the shader but account for the color space. In the ShaderPass, convert from linear to sRGB first, then invert, then convert back to linear. Then OutputPass converts to sRGB for display.

Wait, let me think about this differently:

Pipeline: RenderPass (outputs linear) → ShaderPass (my shader) → OutputPass (linear → sRGB display)

What I want on screen: sRGB_invert(original_sRGB)

Screen output = OutputPass(linear_value_after_shader)
I want: screen_output_sRGB = 1.0 - original_sRGB

So: OutputPass(linear_after_shader) = 1.0 - original_sRGB
OutputPass does linear→sRGB, so:
linear_after_shader = sRGB→linear(1.0 - original_sRGB)

The ShaderPass receives linear_original and must output:
linear_result = sRGB→linear(1.0 - sRGB→linear⁻¹(linear_original))

Wait, let me denote:
- original_sRGB = the sRGB color (e.g., 0x336699)
- linear_original = sRGB→linear(original_sRGB) - this is what RenderPass outputs

I want on screen: inverted_sRGB = 1.0 - original_sRGB

OutputPass converts linear→sRGB, so the input to OutputPass must be:
linear_input_to_OutputPass = sRGB→linear(inverted_sRGB) = sRGB→linear(1.0 - original_sRGB)

So my ShaderPass must:
1. Receive linear_original (linear space)
2. Convert to sRGB: sRGB_original = linear→sRGB(linear_original)
3. Invert: inverted_sRGB = 1.0 - sRGB_original
4. Convert back to linear: linear_result = sRGB→linear(inverted_sRGB)
5. Output linear_result

Then OutputPass does linear→sRGB(linear_result) = inverted_sRGB ✓

So in my shader, I need to:
1. Convert input (linear) to sRGB
2. Invert
3. Convert back to linear

The sRGB transfer functions:
- linear→sRGB: if linear <= 0.0031308: sRGB = linear * 12.92; else: sRGB = 1.055 * linear^(1/2.4) - 0.055
- sRGB→linear: if sRGB <= 0.04045: linear = sRGB / 12.92; else: linear = ((sRGB + 0.055) / 1.055)^2.4

Let me write the shader with these conversions.

Actually wait - let me double check. The user says "the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect." Without the effect, the screen shows `0x336699` (because the full pipeline would be: Color(hex) stores as linear → renderer applies sRGB output → shows original hex). With the effect, we want the exact per-channel inverse in sRGB space.

So yes, my approach is correct. The shader must:
1. Take linear input
2. Apply linear→sRGB (inverse tone mapping essentially)
3. Invert in sRGB
4. Apply sRGB→linear
5. Output (OutputPass will then convert to sRGB for display)

Let me verify with the white sphere:
- MeshBasicMaterial color 0xffffff → linear (1,1,1)
- Shader: linear→sRGB(1,1,1) = (1,1,1); invert = (0,0,0); sRGB→linear(0,0,0) = (0,0,0)
- OutputPass: linear→sRGB(0,0,0) = (0,0,0) → black ✓

For the background:
- Color(0x336699) stored as linear: let's call it L
- Shader: linear→sRGB(L) = (0x33/255, 0x66/255, 0x99/255) = original sRGB; invert = (0xcc/255, 0x99/255, 0x66/255); sRGB→linear of that = some linear value M
- OutputPass: linear→sRGB(M) = (0xcc/255, 0x99/255, 0x66/255) = 0xcc9966 ✓

Now let me write the TypeScript code.

For the shader uniforms, I'll use tDiffuse which is the standard for ShaderPass.

Let me also make sure about the ShaderPass setup - I need to define a shader object with `uniforms`, `vertexShader`, and `fragmentShader`.

Let me write the complete file now.

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

The shader code:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

float sRGBToLinear(float c) {
    if (c <= 0.04045) return c / 12.92;
    return pow((c + 0.055) / 1.055, 2.4);
}

float linearToSRGB(float c) {
    if (c <= 0.0031308) return c * 12.92;
    return 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    // Convert from linear to sRGB
    vec3 srgb = vec3(linearToSRGB(color.r), linearToSRGB(color.g), linearToSRGB(color.b));
    // Invert in sRGB space
    vec3 inverted = 1.0 - srgb;
    // Convert back to linear
    vec3 result = vec3(sRGBToLinear(inverted.r), sRGBToLinear(inverted.g), sRGBToLinear(inverted.b));
    gl_FragColor = vec4(result, color.a);
}
```

This should work correctly. Let me put together the full file.

For strict TypeScript, I need to be careful with types. The ShaderPass expects a shader object. Let me check the type signature...

In Three.js types, `ShaderPass` constructor takes:
```typescript
constructor(shader: { uniforms: Record<string, IUniform>; vertexShader: string; fragmentShader: string; defines?: Record<string, string> }, textureID?: string)
```

I'll type the shader object properly.

Let me also handle the `window as any` casts carefully for strict mode.

Let me write the final complete file.
