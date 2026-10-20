The user wants a post-processing color-inversion effect with correct color space handling. Let me think carefully about the color space pipeline in Three.js.

In Three.js with modern versions (r152+), the color management pipeline works like this:

1. Scene renders into a render target (which is in linear color space by default in newer Three.js)
2. The EffectComposer's internal render target - this is the key question. By default, EffectComposer uses a render target with `type: THREE.HalfFloatType` and no color space conversion (it's linear).
3. The final pass (OutputPass) converts from linear to sRGB for display.

So the pipeline is:
- Scene colors (specified in sRGB, converted to linear internally by Three.js)
- RenderPass renders to composer's render target (linear space)
- ShaderPass inverts colors
- OutputPass converts linear -> sRGB for screen

Wait, let me think more carefully. In Three.js r152+, when color management is enabled:
- `scene.background = new THREE.Color(0x336699)` - this color is stored in sRGB but when rendered, Three.js converts it to linear space for the framebuffer.
- Actually, with `THREE.ColorManagement.enabled = true` (default in r152+), colors set via `new THREE.Color(0x336699)` are treated as sRGB and converted to linear-sRGB when used in rendering.

So in the linear render target:
- Background 0x336699 (sRGB) → in linear space it becomes the linear representation
- White sphere 0xffffff → in linear space it's (1, 1, 1)

Now, the issue with inversion:
- If I invert in linear space: linear_inverted = 1.0 - linear_value
- Then OutputPass converts linear -> sRGB: sRGB_inverted = linear_to_sRGB(1.0 - linear_value)
- But what we WANT is: sRGB_inverted = 1.0 - sRGB_original

These are NOT the same! Linear inversion then sRGB conversion ≠ sRGB inversion.

For the background 0x336699:
- sRGB value: (0x33/255, 0x66/255, 0x99/255) = (0.2, 0.4, 0.6)
- Desired inverse on screen: 1.0 - (0.2, 0.4, 0.6) = (0.8, 0.6, 0.4) = 0xcc9966

If I do linear inversion:
- Convert sRGB to linear: srgb_to_linear(0.2) ≈ 0.0331, srgb_to_linear(0.4) ≈ 0.1329, srgb_to_linear(0.6) ≈ 0.3185
- Invert in linear: 1 - 0.0331 = 0.9669, 1 - 0.1329 = 0.8671, 1 - 0.3185 = 0.6815
- Convert linear to sRGB: linear_to_srgb(0.9669) ≈ 0.9844, linear_to_srgb(0.8671) ≈ 0.9404, linear_to_srgb(0.6815) ≈ 0.8425
- That's approximately (0.98, 0.94, 0.84) which is NOT (0.8, 0.6, 0.4)

So I need to do the inversion in sRGB space. The correct approach is:

1. In the ShaderPass, convert linear -> sRGB, invert, then convert sRGB -> linear. Then the OutputPass will convert linear -> sRGB, giving us the inverted sRGB values.

OR

2. Skip the OutputPass's linear->sRGB conversion and do the inversion in sRGB space in the shader, then manually output to sRGB.

OR

3. The simplest approach: In the ShaderPass, convert the incoming linear value to sRGB, invert in sRGB, convert back to linear. Then OutputPass converts linear->sRGB for display. This gives:
- screen = linear_to_sRGB(linear_to_srgb_inverse(srgb_inverse(linear_to_sRGB(linear_value))))
- = linear_to_sRGB(linear_to_srgb_inverse(1 - srgb_value))
- = 1 - srgb_value  ✓

Wait let me redo this. Let's say the render target holds `L` (linear value).

The shader does:
- s = linear_to_sRGB(L)  [convert to sRGB]
- s_inv = 1.0 - s  [invert in sRGB space]
- L_inv = sRGB_to_linear(s_inv)  [convert back to linear]

Then OutputPass does:
- screen = linear_to_sRGB(L_inv) = linear_to_sRGB(sRGB_to_linear(1.0 - sRGB_to_linear... wait

Let me be more careful:
- L = linear value in render target
- s = linear_to_sRGB(L)
- s_inv = 1 - s
- L_inv = sRGB_to_linear(s_inv) = sRGB_to_linear(1 - linear_to_sRGB(L))

OutputPass: screen = linear_to_sRGB(L_inv) = linear_to_sRGB(sRGB_to_linear(1 - linear_to_sRGB(L)))
= 1 - linear_to_sRGB(L)

So for white sphere: L = 1.0, s = 1.0, s_inv = 0.0, L_inv = 0.0, screen = 0.0 → black ✓
For background 0x336699: s = (0.2, 0.4, 0.6), s_inv = (0.8, 0.6, 0.4), screen = (0.8, 0.6, 0.4) = 0xcc9966 ✓

So the approach is: in the ShaderPass, convert linear→sRGB, invert, convert sRGB→linear. OutputPass handles the final linear→sRGB.

Now, the linear<->sRGB conversion in GLSL:
- linear_to_sRGB: if x <= 0.0031308, return 12.92*x; else return 1.055*pow(x, 1.0/2.4) - 0.055
- sRGB_to_linear: if x <= 0.04045, return x/12.92; else return pow((x+0.055)/1.055, 2.4)

Now about EffectComposer color space:
- In Three.js r152+, EffectComposer creates its render target. The internal render target's texture colorSpace defaults to... let me think. Actually, the RenderPass renders the scene to the composer's read buffer. The scene's colors are already in linear (because Three.js converts sRGB colors to linear before rendering).

Actually wait - I need to check what color space the EffectComposer's render target is in. By default in modern Three.js, the render target's texture has `colorSpace = THREE.NoColorSpace` or `THREE.LinearSRGBColorSpace`. The RenderPass just renders normally.

The OutputPass is what handles the final color space conversion (linear -> sRGB) when outputting to the screen.

So my plan:
1. RenderPass renders scene to linear render target
2. Custom ShaderPass: reads linear color, converts to sRGB, inverts, converts back to linear
3. OutputPass: converts linear to sRGB for screen display

Let me also think about whether the EffectComposer's render target is HalfFloatType. By default it is. That should be fine for storing linear values.

One more thing: I need to make sure the scene.background color is properly handled. With ColorManagement enabled (default), `new THREE.Color(0x336699)` is treated as sRGB and Three.js converts it to linear when setting the background. So the render target will contain the linear value of 0x336699. My shader will convert it back to sRGB, invert, and that should give the right result.

Let me write the code now.

Actually, let me double-check: does `scene.background = new THREE.Color(0x336699)` store in sRGB and convert to linear at render time? Yes, with ColorManagement.enabled = true (default in r152+), colors are stored in sRGB and converted to linear working space during rendering.

Let me write the complete file.
