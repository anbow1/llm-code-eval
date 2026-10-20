The user wants a post-processing color inversion effect with correct color space handling.

Let me think carefully about the color space issue:

1. Three.js renders in linear color space internally. The `scene.background = new THREE.Color(0x336699)` is interpreted as a linear color value (the hex value is used as-is in linear space).

2. When rendering normally (without post-processing), the renderer applies linear -> sRGB conversion at the end (when `outputColorSpace = THREE.SRGBColorSpace`).

3. With EffectComposer, the pipeline is:
   - RenderPass renders the scene (linear) into a render target
   - ShaderPass processes it
   - OutputPass does the final linear -> sRGB conversion and outputs to screen

The key insight: The EffectComposer's internal render targets are in linear space. The OutputPass converts from linear to sRGB at the end.

So the flow is:
- Scene background 0x336699 is stored as linear color (the RGB values in the hex are used directly as linear values)
- RenderPass writes linear values to the render target
- Our inversion shader operates on these linear values
- OutputPass converts linear -> sRGB for display

Wait, but the requirement says: "The background 0x336699 must appear on screen as 0xcc9966 and the white sphere as black."

Let me think about this more carefully:

- `new THREE.Color(0x336699)` - In Three.js with color management, when you set `scene.background`, the color is treated as sRGB and converted to linear internally. Actually, let me reconsider.

Actually, in Three.js r152+, `THREE.ColorManagement.enabled` is true by default. When you do `new THREE.Color(0x336699)`, the color values are stored as-is (0.2, 0.4, 0.6 in this case). But when used as a scene background, it gets treated... hmm.

Wait, let me reconsider. In Three.js with color management:
- `new THREE.Color(0x336699)` creates a color with RGB values (0x33/255, 0x66/255, 0x99/255) = approximately (0.2, 0.4, 0.6)
- These are stored as-is in the Color object
- When rendering, the scene background color is output in linear space to the render target
- The OutputPass then converts linear -> sRGB for display

But wait - if `ColorManagement.enabled = true`, does `new THREE.Color(0x336699)` interpret the hex as sRGB and convert to linear? Let me think...

Actually, in Three.js r152+:
- `new THREE.Color(hex)` - the hex is interpreted as sRGB values and stored in linear if ColorManagement is enabled. Wait no, I think `new THREE.Color(hex)` just sets the raw values. The color management happens at render time.

Let me reconsider the actual behavior:
- `scene.background = new THREE.Color(0x336699)` - the color is (0.2, 0.4, 0.6) in the Color object
- When rendered to a render target (which is linear), this color is written directly (it's treated as a linear value)
- Actually no - in newer Three.js, scene.background colors go through the color management pipeline

Hmm, I need to think about what actually happens on screen:

Without post-processing:
- Background color 0x336699 -> the hex values (0x33, 0x66, 0x99) = (51, 102, 153) in sRGB
- On screen, it appears as 0x336699 (the renderer handles the conversion so what you see is what you set)

With post-processing (RenderPass -> InvertPass -> OutputPass):
- RenderPass renders to a linear render target
- The background color 0x336699: In the render target, what value does it have?
  - If ColorManagement is enabled, the background color is converted to linear before writing to the render target
  - sRGB 0x336699 -> linear: (0.0895, 0.1623, 0.3185) approximately
  
Wait, actually I need to check. `scene.background = new THREE.Color(0x336699)` - in Three.js with color management, does the Color constructor interpret the hex as sRGB and convert to linear?

Looking at Three.js source: `Color.setHex(hex, colorSpace = SRGBColorSpace)` - yes! By default, `setHex` treats the hex as sRGB and converts to linear when ColorManagement is enabled.

So `new THREE.Color(0x336699)` with ColorManagement enabled:
- Interprets (0x33/255, 0x66/255, 0x99/255) as sRGB
- Converts to linear: approximately (0.0895, 0.1623, 0.3185)
- Stores linear values in the Color

When rendered to the linear render target by RenderPass:
- The background writes (0.0895, 0.1623, 0.3185) (linear values)
- The white sphere (0xffffff) -> also stored as linear (1, 1, 1)

Our inversion shader inverts in linear space:
- Background: 1 - 0.0895 = 0.9105, 1 - 0.1623 = 0.8377, 1 - 0.3185 = 0.6815 (linear)
- White sphere: 1 - 1 = 0 (linear) -> black

Then OutputPass converts linear -> sRGB:
- Background linear (0.9105, 0.8377, 0.6815) -> sRGB approximately (0.957, 0.925, 0.857) -> hex approximately (0xF4, 0xEC, 0xDB)

That's NOT 0xcc9966!

So the naive approach of inverting in linear space doesn't give us the expected sRGB inversion.

The requirement says: "the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect"

Without the effect:
- Background appears as 0x336699 on screen (sRGB)
- White sphere appears as 0xffffff on screen (sRGB)

Expected with the effect:
- Background: 1.0 - (0x33/255), 1.0 - (0x66/255), 1.0 - (0x99/255) = (0xCC, 0x99, 0x66) = 0xcc9966 ✓
- White sphere: 1.0 - 1.0 = 0 -> 0x000000 ✓

So the inversion needs to happen in sRGB space, not linear space.

The solution: We need to invert in sRGB space. There are two approaches:

1. Convert to sRGB before inverting, then convert back to linear (so OutputPass can do the final conversion):
   - In the shader: convert linear -> sRGB, invert, convert sRGB -> linear
   - Then OutputPass converts linear -> sRGB for display
   - Result: sRGB output = invert(linear->sRGB(linear_value)) which is what we want

   Wait, let me trace this:
   - RenderPass outputs linear value L
   - Our shader: s = linearToSRGB(L), inverted_s = 1 - s, output = sRGBToLinear(inverted_s)
   - OutputPass: final_sRGB = linearToSRGB(sRGBToLinear(inverted_s)) = inverted_s = 1 - s = 1 - linearToSRGB(L)
   
   For background: L = linear(0x336699) = linear values of sRGB 0x336699
   - s = linearToSRGB(L) = original sRGB values (0.2, 0.4, 0.6)
   - inverted_s = (0.8, 0.6, 0.4) = 0xcc9966 in sRGB ✓
   - OutputPass converts this linear value back to sRGB: linearToSRGB(sRGBToLinear(inverted_s)) = inverted_s ✓

   For white sphere: L = 1.0
   - s = linearToSRGB(1.0) = 1.0
   - inverted_s = 0.0
   - Output: 0.0 -> black ✓

2. Alternative: Invert in sRGB space directly in the shader, then don't use OutputPass but write directly. But this is more complex and the user wants OutputPass.

Actually wait, let me reconsider approach 1. The OutputPass converts from linear to sRGB. If I do:
- shader output = sRGBToLinear(1.0 - linearToSRGB(input))

Then OutputPass does: linearToSRGB(shader_output) = linearToSRGB(sRGBToLinear(1.0 - linearToSRGB(input))) = 1.0 - linearToSRGB(input)

For the background (sRGB 0x336699 stored as linear):
- linearToSRGB(input) recovers the sRGB value (0.2, 0.4, 0.6)
- 1.0 - that = (0.8, 0.6, 0.4) which is 0xcc9966 ✓

For white sphere:
- linearToSRGB(1.0) = 1.0
- 1.0 - 1.0 = 0.0 ✓



Now let me write the GLSL for linear<->sRGB conversion:

linearToSRGB:
```
vec3 linearToSRGB(vec3 color) {
    return mix(
        pow((color + 0.055) / 1.055, vec3(2.4)),
        color * 12.92,
        step(color, vec3(0.04045))
    );
}
```

Wait, I need to be more careful. The standard formula:
- If linear <= 0.04045: sRGB = linear * 12.92
- If linear > 0.04045: sRGB = ((linear + 0.055) / 1.055) ^ 2.4

sRGBToLinear:
- If sRGB <= 0.04045: linear = sRGB / 12.92
- If sRGB > 0.04045: linear = ((sRGB + 0.055) / 1.055) ^ 2.4

Wait no, the inverse is:
- If sRGB <= 0.04045: linear = sRGB / 12.92
- If sRGB > 0.04045: linear = ((sRGB + 0.055) / 1.055) ^ 2.4

Actually let me double-check:
- sRGB -> Linear: if srgb <= 0.04045, linear = srgb / 12.92; else linear = pow((srgb + 0.055) / 1.055, 2.4)
- Linear -> sRGB: if linear <= 0.0031308, srgb = linear * 12.92; else srgb = 1.055 * pow(linear, 1.0/2.4) - 0.055

Let me use these exact formulas.

Now for the shader pass:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 color) {
    vec3 result;
    for (int i = 0; i < 3; i++) {
        if (color[i] <= 0.0031308) {
            result[i] = color[i] * 12.92;
        } else {
            result[i] = 1.055 * pow(color[i], 1.0 / 2.4) - 0.055;
        }
    }
    return result;
}

vec3 sRGBToLinear(vec3 srgb) {
    vec3 result;
    for (int i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            result[i] = srgb[i] / 12.92;
        } else {
            result[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return result;
}

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    // Convert linear to sRGB, invert, convert back to linear
    vec3 srgb = linearToSRGB(texel.rgb);
    srgb = 1.0 - srgb;
    vec3 linear = sRGBToLinear(srgb);
    gl_FragColor = vec4(linear, texel.a);
}
```

Then the pass order is: RenderPass -> InvertShaderPass -> OutputPass

This should work correctly.

Let me also make sure the EffectComposer render targets use linear color space (which is the default). The OutputPass handles the final linear->sRGB conversion.

Let me also think about whether I need to set `renderer.outputColorSpace`. By default it's `THREE.SRGBColorSpace`. But when using EffectComposer, the final output goes through OutputPass which handles the conversion. The renderer's outputColorSpace might interfere... Actually, when rendering to a render target (as EffectComposer does), the renderer doesn't apply the outputColorSpace conversion - that's only for the final canvas render. The OutputPass handles it.

Actually, I recall that with EffectComposer, you might want to set `renderer.outputColorSpace = THREE.SRGBColorSpace` (default) but the key thing is that render targets are linear. The OutputPass applies the tone mapping and color space conversion for the final output to the canvas.

Let me also check: does the RenderPass respect the scene's color management when writing the background to a render target? Yes - when rendering to a render target, the colors are written in linear space (assuming the render target's texture colorSpace is LinearSRGBColorSpace, which is the default).

I think my approach is correct. Let me write the full file.

One more thing: I need to make sure I import EffectComposer, RenderPass, ShaderPass, and OutputPass correctly.

Also, for the ShaderPass, I need to define the shader object with uniforms, vertexShader, and fragmentShader.

Let me also make sure about the render target format. By default, EffectComposer creates render targets with RGBAFormat and the appropriate type. For HDR/precision, HalfFloatType might be better, but for this basic case, the default should work.

Actually, I realize there might be an issue. Let me check if `new THREE.Color(0x336699)` with ColorManagement enabled actually converts to linear.

In Three.js r152+:
- `THREE.ColorManagement.enabled = true` by default
- `new THREE.Color(0x336699)` calls `this.setHex(0x336699, THREE.SRGBColorSpace)` internally
- This converts sRGB hex values to linear working space

So the Color object stores linear values. When this is used as scene.background and rendered to a linear render target, the linear values are written directly.

My shader then:
1. Reads linear value from the render target
2. Converts to sRGB (recovers the original 0x336699 sRGB values)
3. Inverts
4. Converts back to linear
5. OutputPass converts linear to sRGB for display

This gives us the correct sRGB inversion. 

Let me write the code now.

Actually, I want to double-check one thing about EffectComposer's default render target. In modern Three.js, the EffectComposer creates render targets. Let me make sure they're in linear space. By default, `new THREE.WebGLRenderTarget(...)` has texture colorSpace = `THREE.LinearSRGBColorSpace` (or `THREE.NoColorSpace` depending on version). This means values are stored as-is (linear). Good.

Let me also consider: should I explicitly set `renderer.outputColorSpace`? I'll leave it as default (SRGBColorSpace). The OutputPass should handle things correctly regardless since it reads the renderer's outputColorSpace setting.

Actually, looking at the OutputPass source code, it applies `LinearTosRGB` (or whatever the target color space is) and tone mapping. This is exactly what we want.

Let me finalize the code.
