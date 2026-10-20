Let me think carefully about color spaces in Three.js post-processing.

The key challenge: When Three.js renders a scene, the pipeline is:
1. Scene objects are defined with colors in sRGB space (e.g., `new THREE.Color(0x336699)` is stored as-is in the Color object, but when rendered, Three.js converts from sRGB to linear working space internally if the color management is enabled).

Wait, let me think more carefully about Three.js color management (introduced in r152+):

- `THREE.ColorManagement.enabled` is true by default in modern Three.js.
- When you create `new THREE.Color(0x336699)`, the hex value is treated as sRGB and converted to linear working space internally.
- When rendering to the screen, the renderer converts from linear working space to sRGB output (via `renderer.outputColorSpace = THREE.SRGBColorSpace` which is the default).

Now with EffectComposer:
- RenderPass renders the scene into a render target (framebuffer). The render target by default is in linear color space (no sRGB encoding applied).
- ShaderPass processes in linear space.
- OutputPass (from Three.js addons) converts from linear working space to the output color space (sRGB) for display.

So the pipeline is:
1. RenderPass: Scene → linear framebuffer (colors are in linear space)
2. Custom ShaderPass: operates on linear-space colors
3. OutputPass: linear → sRGB → screen

The problem: We want the final screen output to be the exact inverse of what would be shown without the effect.

Without the effect:
- Background 0x336699 (sRGB) → stored as linear in scene → rendered to framebuffer as linear → OutputPass converts to sRGB → screen shows 0x336699

With the effect, we want screen to show the inverse: 0xcc9966 (which is 1 - 0x33, 1 - 0x66, 1 - 0x99 = 0xcc, 0x99, 0x66).

The white sphere (0xffffff in sRGB) → linear 1.0,1.0,1.0 → rendered → without effect shows as white (1,1,1 sRGB). With effect, we want black (0,0,0).

Now, where does the inversion need to happen?

If we invert in linear space:
- Linear 1.0 → 1-1 = 0 → sRGB of 0 is 0 → black ✓
- Linear value of sRGB(0x33) = (0x33/255)^2.2 ≈ 0.2^2.2 ≈ 0.0331 → inverted: 1-0.0331 = 0.9669 → sRGB: 0.9669^(1/2.2) ≈ 0.985 → 0xF9 ≈ 249... That's NOT 0xcc!

So inverting in linear space does NOT give us the sRGB inverse.

The correct approach: We need to invert in sRGB space. The inversion should happen AFTER the linear→sRGB conversion, not before.

So the correct order is:
1. RenderPass (scene → linear framebuffer)
2. OutputPass (linear → sRGB) — but wait, OutputPass typically goes last...

Actually, let me reconsider. OutputPass converts linear to sRGB and outputs to screen. If I put my inversion after OutputPass, that won't work because OutputPass outputs to the default framebuffer (screen).

Alternative approach: Do the inversion in the shader but account for the color space.

Option A: Invert in sRGB space within the custom shader:
1. RenderPass → linear framebuffer
2. Custom ShaderPass: convert linear→sRGB, invert, convert sRGB→linear (so the output is still in linear space for the next pass)
3. OutputPass: linear→sRGB

Let's verify with background:
- sRGB 0x33 = 51/255 = 0.2
- Linear: sRGBToLinear(0.2) = 0.2^2.2... actually the exact formula is: if c <= 0.04045, c/12.92, else ((c+0.055)/1.055)^2.4
  0.2 > 0.04045, so ((0.2+0.055)/1.055)^2.4 = (0.255/1.055)^2.4 = 0.2417^2.4 ≈ 0.0331
- Shader: convert to sRGB: linearToSRGB(0.0331) = 0.0331^(1/2.4) * 1.055 - 0.055 ≈ 0.2 (back to 0.2)
- Invert: 1 - 0.2 = 0.8 → sRGB 0x33 inverse is 0.8 = 204/255 = 0xcc ✓
- Convert back to linear: sRGBToLinear(0.8) = ((0.8+0.055)/1.055)^2.4 = (0.855/1.055)^2.4 = 0.8104^2.4 ≈ 0.6038
- OutputPass: linearToSRGB(0.6038) ≈ 0.8 → screen shows 0.8 = 0xcc ✓

White sphere:
- sRGB 1.0 → linear 1.0
- Shader: to sRGB: 1.0, invert: 0.0, to linear: 0.0
- OutputPass: linearToSRGB(0) = 0 → black ✓

This approach works!

Option B: Put the inversion after OutputPass but before writing to screen. But OutputPass typically writes to the default framebuffer...

Actually, looking at how EffectComposer works, each pass reads from the previous render target and writes to the next (or to screen if it's the last pass). OutputPass, when it's the last pass, writes to screen with sRGB encoding.

If I put my pass AFTER OutputPass:
1. RenderPass → linear RT
2. OutputPass → sRGB RT (this is the second render target)
3. My InversionPass → screen

But OutputPass might render to screen (default framebuffer) when it's the last pass... Let me think about how EffectComposer handles this.

In EffectComposer, the last pass (where `pass.renderToScreen = true`) renders to the default framebuffer. OutputPass checks `this.renderToScreen` and if true, renders to screen with sRGB output encoding.

Actually, let me reconsider. In the EffectComposer pipeline:
- Each pass has a `writeBuffer` and `readBuffer` (ping-ponging render targets)
- The last pass has `renderToScreen = true` and writes to null (default framebuffer)

If OutputPass is second-to-last and my inversion is last:
- OutputPass would convert linear→sRGB and write to a render target (not screen)
- My inversion pass reads sRGB values and writes inverted sRGB to screen

But wait - render targets don't automatically do sRGB encoding. The OutputPass shader itself does the conversion in its fragment shader. So if OutputPass writes to a render target, the values in that RT are already in sRGB space (0-1 range as sRGB). Then my inversion pass inverts those values directly. The final output to screen would then be in sRGB already... but the screen framebuffer doesn't do another conversion.

Hmm, this gets tricky. Let me go with Option A which is cleaner:

1. RenderPass → linear framebuffer
2. Custom ShaderPass: linearToSRGB → invert → sRGBToLinear (output stays in linear)
3. OutputPass → linearToSRGB → screen

This way, the math works out to: sRGBToLinear(linearToSRGB(linearValue)) = linearValue (round trip), then OutputPass does linearToSRGB again.

Wait, let me redo:
- Framebuffer has linear value L
- My shader: S = linearToSRGB(L), I = 1 - S, out = sRGBToLinear(I)
- OutputPass: output = linearToSRGB(out) = linearToSRGB(sRGBToLinear(I)) = I = 1-S = 1 - linearToSRGB(L)

Without the effect: output = linearToSRGB(L) = S

So with effect: output = 1 - S = 1 - linearToSRGB(L)

The screen shows: 1 - (what would normally be shown) ✓

Let me code the GLSL shaders for sRGB↔linear conversion:

```glsl
vec3 sRGBToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 linearToSRGB(vec3 c) {
    return mix(c * 12.92, pow(c, vec3(1.0/2.4)) * 1.055 - 0.055, step(0.0031308, c));
}
```

Wait, I need to double-check the linearToSRGB formula:
- If c <= 0.0031308: return 12.92 * c
- Else: return 1.055 * pow(c, 1/2.4) - 0.055

And sRGBToLinear:
- If c <= 0.04045: return c / 12.92
- Else: return ((c + 0.055) / 1.055)^2.4

These are the exact sRGB transfer functions.

Now let me write the complete TypeScript file.

For the ShaderPass custom shader, I need to define a ShaderMaterial-compatible object with uniforms, vertexShader, and fragmentShader.

```typescript
const InvertShader = {
    uniforms: {
        tDiffuse: { value: null },
    },
    vertexShader: `...`,
    fragmentShader: `...`,
};
```

The ShaderPass expects a shader object with `uniforms`, `vertexShader`, and `fragmentShader` properties.

Let me also make sure about the OutputPass import. It should be from 'three/addons/postprocessing/OutputPass.js'.

Let me write the complete file now.

One more consideration: the `renderer.outputColorSpace` default is `THREE.SRGBColorSpace` in modern Three.js. The RenderPass renders the scene into a render target. Since the RT doesn't have sRGB encoding by default, the values in the RT are in linear working space. Good.

Actually wait - I need to check: does RenderPass apply any color space conversion? Looking at the Three.js source, RenderPass just calls `renderer.render(scene, camera)` targeting the write buffer. The renderer, when rendering to a render target, doesn't apply output color space conversion (that only happens when rendering to the default framebuffer/screen). So the RT contains linear values. ✓

Let me finalize my solution.
