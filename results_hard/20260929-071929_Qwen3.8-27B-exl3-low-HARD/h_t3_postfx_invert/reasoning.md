Let me think through this carefully.

The key challenge here is getting the color inversion to produce the correct visual result. Let me trace through the rendering pipeline:

1. **Without post-processing:**
   - Scene background is `0x336699` (sRGB)
   - Sphere is `0xffffff` (sRGB)
   - Three.js converts these to linear for rendering
   - The renderer's output (before tone mapping/output color space) is in linear space
   - The final output to screen applies linear → sRGB conversion

2. **With post-processing using EffectComposer:**
   - `RenderPass` renders the scene into a render target (in linear space, since the renderer's output color space conversion happens at the final output)
   - Wait, actually I need to think about this more carefully.

Let me reconsider. In Three.js with EffectComposer:

- The `RenderPass` renders the scene into a framebuffer. The colors in this framebuffer are in **linear** space (because the renderer hasn't done the linear→sRGB conversion yet - that normally happens in the final output to the screen).
- Actually, wait. Let me think again. When rendering to a render target (not the screen), Three.js does NOT apply the output color space conversion. So the render target contains linear values.
- The `OutputPass` is responsible for doing the linear → sRGB conversion (and tone mapping) at the end of the chain.

So the pipeline is:
1. `RenderPass` → produces linear color values in the framebuffer
2. `ShaderPass` (inversion) → operates on linear values
3. `OutputPass` → converts linear → sRGB for display

Now, if I simply do `1.0 - rgb` in linear space, that's NOT the same as inverting in sRGB space.

For example:
- Background `0x336699` in sRGB → linear: `linear(0x33/255)`, `linear(0x66/255)`, `linear(0x99/255)`
- If I invert in linear: `1.0 - linear(0x33/255)`, etc.
- Then OutputPass converts back to sRGB: `sRGB(1.0 - linear(0x33/255))`

But the requirement says the final on-screen color must be `0xcc9966`, which is the sRGB inverse of `0x336699`.

The sRGB inverse of `0x336699` is:
- R: 255 - 0x33 = 0xCC
- G: 255 - 0x66 = 0x99
- B: 255 - 0x99 = 0x66

So `0xcc9966`.

Now, if I invert in linear space and then convert to sRGB, I'll get a different result. For example:
- `0x33` = 51/255 ≈ 0.2 in sRGB
- Linear: 0.2^2.2 ≈ 0.032 (using simplified gamma)
- Invert: 1 - 0.032 = 0.968
- Back to sRGB: 0.968^(1/2.2) ≈ 0.985 → about 251, not 204 (0xCC)

So inverting in linear space and then converting to sRGB does NOT give the correct result.

To get the correct result, I need to either:
1. Convert linear → sRGB in my shader, then invert, then output (and make sure OutputPass doesn't double-convert), OR
2. Invert in linear space but with a modified formula, OR
3. Do the inversion in sRGB space within the shader.

Option 3 seems cleanest: In my shader, convert the linear input to sRGB, invert, then output the sRGB value. But then the OutputPass would try to convert it again...

Wait, let me reconsider the pipeline. The `OutputPass` in Three.js applies:
- Tone mapping
- Color space conversion (linear → sRGB)

If my shader outputs sRGB values, and then OutputPass converts them from linear to sRGB again, that would be wrong.

So the options are:
1. In my shader: convert linear → sRGB, invert, then the output is already in sRGB. But OutputPass will treat it as linear and convert again. This won't work unless I skip OutputPass or modify it.

2. In my shader: invert in linear space. Then OutputPass converts to sRGB. But as shown above, this gives wrong results.

3. In my shader: convert linear → sRGB, invert, then convert sRGB → linear. Then OutputPass converts linear → sRGB. This effectively does: sRGB( linear( sRGB_inverse( sRGB( linear_value ) ) ) ) = sRGB_inverse( sRGB( linear_value ) ) = sRGB_inverse( original_sRGB_value ). 

Wait, that's circular. Let me think differently.

Actually, the simplest approach: In my shader, I need to produce a linear value that, when converted to sRGB by OutputPass, gives the sRGB inverse of the original sRGB value.

Original sRGB value: `s`
Original linear value: `l = linearize(s)`
Desired sRGB output: `1 - s`
Desired linear output (so that OutputPass converts it correctly): `linearize(1 - s)`

So in my shader, given the linear input `l`:
1. Convert to sRGB: `s = sRGB(l)`
2. Invert: `1 - s`
3. Convert back to linear: `l_out = linearize(1 - s)`

Then OutputPass will convert `l_out` to sRGB, giving `1 - s`, which is exactly what we want.

The sRGB transfer function:
- Linear to sRGB: if c <= 0.0031308, then 12.92 * c; else 1.055 * c^(1/2.4) - 0.055
- sRGB to Linear: if c <= 0.04045, then c / 12.92; else ((c + 0.055) / 1.055)^2.4

In GLSL:
```glsl
vec3 linearToSRGB(vec3 color) {
    vec3 low = color * 12.92;
    vec3 high = 1.055 * pow(color, vec3(1.0/2.4)) - 0.055;
    return mix(low, high, step(vec3(0.0031308), color));
}

vec3 sRGBToLinear(vec3 color) {
    vec3 low = color / 12.92;
    vec3 high = pow((color + 0.055) / 1.055, vec3(2.4));
    return mix(low, high, step(vec3(0.04045), color));
}
```

So my shader would be:
```glsl
vec4 color = texture2D(tDiffuse, vUv);
vec3 srgb = linearToSRGB(color.rgb);
vec3 inverted = 1.0 - srgb;
vec3 output = sRGBToLinear(inverted);
gl_FragColor = vec4(output, color.a);
```

This way:
- Input: linear color from RenderPass
- My shader: linear → sRGB → invert → linear
- OutputPass: linear → sRGB
- Final result: sRGB inverse of original sRGB ✓

Let me verify with the background:
- `0x336699` sRGB → linear (stored in render target)
- My shader: linear → sRGB (back to 0x336699 equivalent) → invert (0xcc9966 equivalent) → linear
- OutputPass: linear → sRGB (back to 0xcc9966)
- On screen: 0xcc9966 ✓

And for white sphere:
- `0xffffff` sRGB → linear (1.0, 1.0, 1.0)
- My shader: sRGB(1.0) = 1.0 → invert → 0.0 → linear(0.0) = 0.0
- OutputPass: sRGB(0.0) = 0.0
- On screen: black ✓

Now let me write the complete file.

Actually, wait. I need to double-check: does Three.js's `MeshBasicMaterial` with color `0xffffff` store the color in linear space internally? Yes, Three.js converts sRGB hex colors to linear when you set them. So `new THREE.Color(0xffffff)` will be (1, 1, 1) in linear, and `new THREE.Color(0x336699)` will be the linearized version.

Also, I need to make sure the `OutputPass` is doing what I think. Looking at Three.js source, `OutputPass` applies:
- Tone mapping (if set on renderer)
- Color space conversion from working color space (linear) to output color space (sRGB by default)

Since I'm not setting any tone mapping, it should just do the linear → sRGB conversion.

Let me also consider: the `EffectComposer` render targets - what color space are they in? By default, Three.js render targets are in linear space (no color space encoding). The `OutputPass` is the one that does the final conversion.

I think my approach is correct. Let me write the code.

One more thing: I should use `renderer.toneMapping = THREE.NoToneMapping` to make sure no tone mapping interferes. Actually, the default is `THREE.NoToneMapping` so it should be fine.

Let me write the complete file now.
