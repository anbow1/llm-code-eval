The user wants a post-processing color-inversion effect that produces exact inverse colors on screen. Let me think carefully about the color space pipeline.

**The color space challenge:**

1. `scene.background = new THREE.Color(0x336699)` - In Three.js r152+, colors are in sRGB by default. When `renderer.outputColorSpace = THREE.SRGBColorSpace` (default), the renderer converts linear->sRGB for the final output.

2. When using EffectComposer, the render target by default uses `THREE.HalfFloatType` or `THREE.UnsignedByteType`. The key issue is:
   - RenderPass renders the scene into the composer's render target
   - The composer's render target is typically in LINEAR color space
   - The RenderPass applies the scene's color conversion (linear->sRGB) when writing to the screen, but when rendering to a render target, the behavior depends on the target's color space settings.

Wait, let me reconsider. In modern Three.js (r152+):

- `scene.background = new THREE.Color(0x336699)` - this is an sRGB color
- The renderer's `outputColorSpace` controls the final conversion to screen
- When rendering to the default framebuffer (screen), if `outputColorSpace = SRGBColorSpace`, the renderer applies linear->sRGB conversion
- When rendering to a render target (like in EffectComposer), the renderer does NOT apply the sRGB conversion to the target - the target receives LINEAR values

Actually, let me think more carefully:

In Three.js r152+:
- Colors specified via `new THREE.Color(0x336699)` are treated as sRGB by default (due to `ColorManagement.enabled = true`)
- Internally, Three.js stores colors in linear working space
- When rendering to screen with `outputColorSpace = SRGBColorSpace`, the linear->sRGB conversion happens in the final shader
- When rendering to a render target in EffectComposer, the target should be in linear space

So the pipeline with EffectComposer:
1. RenderPass: renders scene to render target (linear space values)
2. Custom ShaderPass: operates on linear values
3. OutputPass: converts linear -> sRGB for final screen output

**Without the effect:** 
- Background 0x336699 (sRGB) -> internally linear -> OutputPass converts back to sRGB -> screen shows 0x336699
- Sphere 0xffffff (sRGB) -> internally linear -> OutputPass converts back to sRGB -> screen shows 0xffffff

**With the effect (what we want):**
- Background 0x336699 should appear as 0xcc9966 on screen
- Sphere 0xffffff should appear as 0x000000 on screen

The inversion should happen in sRGB space! Because `1.0 - 0x33 = 0xCC`, `1.0 - 0x66 = 0x99`, `1.0 - 0x99 = 0x66`. And `1.0 - 0xFF = 0x00`.

So the inversion must be done AFTER the linear->sRGB conversion, or we need to:
- Convert linear to sRGB, invert, then... but then OutputPass would convert again.

Let me think about the correct ordering:

**Option 1: Invert in sRGB space**
- RenderPass renders to linear render target
- We need to: convert linear->sRGB, invert, then... but OutputPass will also do linear->sRGB
- So if we convert to sRGB in our shader and invert, then OutputPass converts linear->sRGB again - that's wrong.

**Option 2: Skip OutputPass's conversion**
- RenderPass renders to linear
- Our shader: convert linear->sRGB, invert, output as-is
- Don't use OutputPass, just use a final ShaderPass

But the requirement says to use OutputPass.

**Option 3: Invert in linear space such that the final sRGB result is the sRGB inverse**

We want: `sRGB_output = 1.0 - sRGB_original`

The pipeline is: linear_value -> (linear->sRGB by OutputPass) -> screen

We want screen to show `1.0 - sRGB_original`.

So we need: `linear_to_sRGB(x) = 1.0 - sRGB_original`

Which means: `x = sRGB_to_linear(1.0 - sRGB_original)`

And `sRGB_original = linear_to_sRGB(linear_original)`

So: `x = sRGB_to_linear(1.0 - linear_to_sRGB(linear_original))`

Our shader needs to:
1. Convert input (linear) to sRGB: `srgb = linearToSRGB(linear)`
2. Invert: `inverted_srgb = 1.0 - srgb`
3. Convert back to linear: `linear_out = sRGBToLinear(inverted_srgb)`

Then OutputPass converts `linear_out` -> sRGB, giving `inverted_srgb`. 

Let me verify with the background:
- 0x33 = 51/255 = 0.2 in sRGB
- linear: sRGB 0.2 -> linear ≈ 0.0331 (approximately, since 0.2/12.92 = 0.01548... wait, 0.2 <= 0.04045? No, 0.2 > 0.04045)
- Actually: linear = ((0.2 + 0.055)/1.055)^2.4 = (0.255/1.055)^2.4 = (0.2417)^2.4 ≈ 0.0451
- inverted sRGB: 1.0 - 0.2 = 0.8 -> 0xCC ✓
- We need linear_out such that linear_to_sRGB(linear_out) = 0.8
- linear_out = sRGB_to_linear(0.8) = ((0.8 + 0.055)/1.055)^2.4 = (0.855/1.055)^2.4 = (0.8104)^2.4 ≈ 0.6038

So the shader does: linear_in -> sRGB -> invert -> linear_out. Then OutputPass does linear_out -> sRGB -> screen shows inverted value. ✓

**Option 4: Alternative - set the render target to sRGB and handle differently**

Actually, wait. Let me reconsider the EffectComposer setup.

In modern Three.js EffectComposer:
- The default render target type might use `THREE.HalfFloatType`
- RenderPass renders the scene. If `renderer.outputColorSpace = THREE.SRGBColorSpace`, when rendering to a render target, does it apply the conversion?

Actually, in Three.js r152+, when you render to a render target (not the screen), the renderer does NOT apply the output color space conversion. The output color space conversion is only applied when rendering to the default framebuffer (screen).

Wait, but EffectComposer's last pass renders to the screen (null render target). The OutputPass specifically handles the linear->sRGB conversion for the screen.

So the pipeline is:
1. RenderPass: scene -> render target (LINEAR colors, no sRGB conversion applied since it's a target)
2. ShaderPass (our custom one): render target -> render target
3. OutputPass: render target -> screen (applies linear->sRGB conversion)

For the inversion to work correctly in sRGB space:
- Our shader receives LINEAR values
- Converts to sRGB
- Inverts
- Converts back to linear
- Passes to OutputPass which converts linear->sRGB for the screen

This gives the correct result.

Actually, wait. Let me reconsider whether the render target in EffectComposer uses sRGB or linear.

Looking at EffectComposer source: by default it creates render targets with `type: THREE.HalfFloatType` (or UnsignedByteType). The `colorSpace` of the render target... 

In newer Three.js, `WebGLRenderTarget` has a `texture.colorSpace` property. If it's `THREE.LinearSRGBColorSpace` (the default), then reading/writing to it is in linear space.

Hmm, but actually there might be a subtlety. Let me just go with the approach where our shader does linear->sRGB->invert->linear, and OutputPass does the final linear->sRGB.

Let me also consider: does RenderPass apply the scene background color correctly? Yes, the background is stored in linear space internally, and RenderPass writes it to the render target in linear space.

Now for the GLSL shaders in ShaderPass:

```glsl
// Vertex shader (standard)
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```glsl
// Fragment shader
varying vec2 vUv;
uniform sampler2D tDiffuse;

vec3 sRGBToLinear(vec3 srgb) {
    return mix(srgb / 12.92, pow((srgb + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), srgb));
}

vec3 linearToSRGB(vec3 linear) {
    return mix(linear * 12.92, 1.055 * pow(linear, vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), linear));
}

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    // Convert from linear to sRGB
    vec3 srgb = linearToSRGB(color.rgb);
    // Invert in sRGB space
    vec3 inverted = 1.0 - srgb;
    // Convert back to linear for OutputPass to handle
    vec3 linear_out = sRGBToLinear(inverted);
    gl_FragColor = vec4(linear_out, color.a);
}
```

Wait, I need to double-check: does OutputPass actually do linear->sRGB? Let me think...

OutputPass in Three.js applies:
- Tone mapping (if configured)
- Linear to sRGB encoding (if renderer.outputColorSpace is sRGB)

Yes, it does. So the flow is correct.

Let me verify:
- Background sRGB = (0.2, 0.4, 0.6) [i.e., 0x33/255, 0x66/255, 0x99/255]
- In linear space (what RenderPass writes): approximately (0.0331, 0.1329, 0.3250)
- Our shader: linear->sRGB gives back (0.2, 0.4, 0.6), invert gives (0.8, 0.6, 0.4)
- Convert back to linear: sRGBToLinear(0.8, 0.6, 0.4) ≈ (0.6038, 0.3185, 0.1329)
- OutputPass: linear->sRGB gives (0.8, 0.6, 0.4) = (0xCC, 0x99, 0x66) ✓

- Sphere sRGB = (1.0, 1.0, 1.0)
- In linear: (1.0, 1.0, 1.0)
- Our shader: linear->sRGB gives (1.0, 1.0, 1.0), invert gives (0.0, 0.0, 0.0)
- Convert back to linear: (0.0, 0.0, 0.0)
- OutputPass: linear->sRGB gives (0.0, 0.0, 0.0) = black ✓

Now let me write the complete TypeScript file.

One more consideration: `renderer.outputColorSpace`. By default in r152+ it's `THREE.SRGBColorSpace`. I should make sure I don't accidentally disable it. Actually, since we're using OutputPass, we need the renderer to NOT do its own conversion when rendering to screen via the composer's final pass. 

Hmm, actually OutputPass explicitly handles the color space conversion in its shader. It reads `renderer.outputColorSpace` and applies the appropriate conversion. So the renderer's `outputColorSpace` setting is what OutputPass reads to determine what conversion to apply.

Let me make sure I'm not causing double-conversion. The composer renders the final pass to the screen (null framebuffer). Does the renderer apply sRGB encoding when writing to the null framebuffer AND OutputPass also does it?

Looking at the Three.js source: `WebGLRenderer` applies `outputColorSpace` conversion in the final fragment shader of materials. But when EffectComposer uses ShaderPass/OutputPass, those are custom shaders that write directly to the framebuffer. The renderer's automatic conversion is part of the material shader compilation, not a post-render step. So when the composer renders a ShaderPass to the screen, the renderer doesn't add any additional conversion - the ShaderPass shader IS the final output.

OutputPass's shader explicitly applies the linear->sRGB conversion. So there's no double conversion. Good.

Let me write the file now.
