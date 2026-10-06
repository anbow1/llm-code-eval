The user wants a post-processing color-inversion effect with correct color space handling.

Let me think about the color space issue carefully:

1. Three.js r152+ uses linear color space internally for rendering. The `MeshBasicMaterial` color `0xffffff` is interpreted in sRGB by default (Three.js converts it to linear when `Color.setHex` is used with `SRGBColorSpace` management). Actually, let me think more carefully.

In Three.js with color management enabled (default since r152):
- `new THREE.Color(0x336699)` - this is stored as linear working color space values. Wait, no. Let me reconsider.

Actually, in Three.js r152+:
- Colors are stored in linear working color space internally
- `scene.background = new THREE.Color(0x336699)` - the hex value `0x336699` is treated as sRGB and converted to linear internally
- The renderer then converts linear -> sRGB on output

The key issue: With EffectComposer, the rendering pipeline is:
1. RenderPass renders the scene to a render target (in linear space)
2. ShaderPass applies the shader (in linear space if the render target is linear)
3. OutputPass converts linear -> sRGB for display

So the pipeline is: Scene (linear) -> RenderPass -> [linear buffer] -> ShaderPass -> [linear buffer] -> OutputPass -> [sRGB display]

If I invert in linear space: `1.0 - linear_value`
Then OutputPass converts to sRGB: `sRGB(1.0 - linear_value)`

But the expected result is:
- Background 0x336699 (sRGB) -> linear is approximately (0.0353, 0.1522, 0.3283) -> display without effect: sRGB(0.0353, 0.1522, 0.3283) = (0x33, 0x66, 0x99)
- Expected on screen: 0xcc9966
- 0xcc9966 in linear is approximately (0.6038, 0.3185, 0.1329)
- 1.0 - (0.0353, 0.1522, 0.3283) = (0.9647, 0.8478, 0.6717)
- sRGB(0.9647, 0.8478, 0.6717) ≈ ... let me compute: 0.9647^(1/2.2) ≈ 0.9827 → 0xfb... that's not 0xcc.

So simple linear inversion won't give the right result.

The correct approach: We want the SCREEN output to be `1.0 - srgb(input)`. 

Without the effect, the screen shows: `sRGB_to_linear → linear_value → linear_to_sRGB → sRGB_display = original_sRGB`

So the screen shows the original sRGB values: 0x336699.

With the effect, we want the screen to show: 0xcc9966 = 1.0 - 0x336699 in sRGB space.

So we need to invert in sRGB space, not linear space.

Approach 1: Convert linear→sRGB in the shader, invert, then convert back to linear. OutputPass then converts linear→sRGB for display.

In shader:
```
vec3 srgb = LinearTosRGB(texColor.rgb);
vec3 inverted = 1.0 - srgb;
vec3 linearInverted = sRGBToLinear(inverted);
gl_FragColor = vec4(linearInverted, texColor.a);
```

Then OutputPass does: linear → sRGB → display.

Display = sRGB(linearInverted) = sRGB(sRGBToLinear(1.0 - srgb(original))) = 1.0 - srgb(original) ✓

This should work!

Approach 2: Don't use OutputPass, and do the sRGB conversion ourselves in the shader. But that's hacky.

Approach 3: Use OutputPass but configure the render target to be sRGB... No, that's more complex.

Let me go with Approach 1.

For the GLSL shader:
- LinearTosRGB: for each channel c: c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0/2.4) - 0.055
- sRGBToLinear: for each channel c: c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)

Actually, wait. Let me reconsider the pipeline order with EffectComposer:

1. RenderPass: Renders scene to the composer's render target (which is in linear space by default)
2. ShaderPass (our invert shader): Receives linear color, should output... what?
3. OutputPass: Takes the result and handles tone mapping + color space conversion (linear → sRGB for display)

So if our shader outputs linear values, OutputPass will convert to sRGB for display.

We want: display = 1.0 - srgb_value_of_scene_color

Scene renders in linear: `linear_scene_color`
OutputPass would normally show: `srgb(linear_scene_color)` = original sRGB (e.g., 0x336699)

We want: `1.0 - srgb(linear_scene_color)`

So our shader should output a linear value `X` such that:
`sRGB(X) = 1.0 - srgb(linear_scene_color)`
`X = srgb_to_linear(1.0 - srgb(linear_scene_color))`

In the shader:
```
vec3 srgb = linearToSrgb(texColor.rgb);
vec3 invSrgb = 1.0 - srgb;
vec3 linearOut = srgbToLinear(invSrgb);
gl_FragColor = vec4(linearOut, texColor.a);
```

This is correct.

Let me also think about whether the render target needs to be half-float or can be uint8. For correct sRGB inversion, we need enough precision. Using HalfFloatType should be fine. Actually, EffectComposer by default uses HalfFloatType in newer Three.js versions. Let me be safe and specify it.

Actually, looking at EffectComposer constructor, if no renderTarget is provided, it creates one. In recent Three.js, the default is HalfFloatType. But to be safe, I'll create one explicitly.

Wait, but if I use uint8 (UnsignedByteType) for the render target, the linear values would already be quantized to 8-bit, which could cause precision issues. HalfFloatType is better.

Let me also consider: do I need to set `renderer.outputColorSpace`? By default it's `THREE.SRGBColorSpace`. The OutputPass handles the conversion. If I set it to LinearSRGBColorSpace, then OutputPass wouldn't do the conversion... Let me keep defaults.

Actually wait - let me reconsider. With `renderer.outputColorSpace = THREE.SRGBColorSpace` (default), when rendering to the screen directly, the renderer converts linear→sRGB. But when rendering to a render target (which EffectComposer does), the render target's texture color space matters.

In EffectComposer:
- The render target typically has `texture.colorSpace = THREE.LinearSRGBColorSpace` (or no conversion)
- OutputPass reads from the last pass and writes to the screen, applying tone mapping and linear→sRGB conversion

So the pipeline is:
1. RenderPass → writes linear scene colors to render target
2. ShaderPass → reads linear, we convert to sRGB, invert, convert back to linear, write linear to render target
3. OutputPass → reads linear, applies tone mapping, converts linear→sRGB, writes to screen

This should give us: screen = sRGB(srgb_to_linear(1.0 - srgb(linear_scene))) = 1.0 - srgb(linear_scene) = 1.0 - original_sRGB ✓

Let me verify with the background:
- Original sRGB: 0x336699 → (51/255, 102/255, 153/255) = (0.2, 0.4, 0.6)
- 1.0 - (0.2, 0.4, 0.6) = (0.8, 0.6, 0.4) → (204/255, 153/255, 102/255) = 0xcc9966 ✓

White sphere:
- Original sRGB: 0xffffff → (1, 1, 1)
- 1.0 - (1, 1, 1) = (0, 0, 0) → black ✓

Now let me write the code. I need to be careful with the shader to match Three.js's sRGB conversion formulas.

Actually, I realize I should double-check: does Three.js use the exact sRGB formula or a gamma approximation? Three.js uses the piecewise sRGB formula in its built-in conversions.

Let me write the complete file now.

One more consideration: `renderer.outputColorSpace`. By default in Three.js r152+, it's `SRGBColorSpace`. The OutputPass is designed to handle the conversion. I should NOT change this.

Also, for the render target, I should make sure it's not applying sRGB encoding on storage. EffectComposer by default creates a render target without sRGB color space on the texture, so it stores linear values. Good.

Let me also make sure I import OutputPass correctly. It's from 'three/addons/postprocessing/OutputPass.js'.

Let me write the shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 c) {
    vec3 low = c * 12.92;
    vec3 high = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(high, low, step(c, vec3(0.0031308)));
}

vec3 srgbToLinear(vec3 c) {
    vec3 low = c / 12.92;
    vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(high, low, step(c, vec3(0.04045)));
}

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    vec3 srgb = linearToSRGB(texColor.rgb);
    vec3 inverted = 1.0 - srgb;
    vec3 linearInverted = srgbToLinear(inverted);
    gl_FragColor = vec4(linearInverted, texColor.a);
}
```

Wait, I need to be careful with `mix(high, low, step(...))` - this means when `c <= 0.0031308` (step returns 1), we get `low`. When `c > 0.0031308` (step returns 0), we get `high`. Yes that's correct.

For srgbToLinear: when `c <= 0.04045`, step returns 1, we get `low` (c/12.92). When `c > 0.04045`, step returns 0, we get `high`. Correct.

Now for the vertex shader, the standard EffectComposer ShaderPass vertex shader is:
```glsl
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Let me finalize the code. I need to use `ShaderPass` from 'three/addons/postprocessing/ShaderPass.js'.

One thing to note: I need to make sure `renderer.outputColorSpace` is set to `SRGBColorSpace` (which is default). And I should NOT set it to LinearSRGBColorSpace because OutputPass expects to handle the conversion.

Actually, wait. Let me reconsider. If `renderer.outputColorSpace = SRGBColorSpace`, does the renderer apply the conversion when drawing to a render target? Let me think...

In Three.js, the color space conversion on output is applied when rendering to the canvas (screen). When rendering to a render target, the conversion depends on the render target's texture colorSpace. If the render target texture's colorSpace is `LinearSRGBColorSpace` (default for EffectComposer's internal targets), no conversion is applied - linear values are stored.

When OutputPass renders to the screen (the canvas), the renderer's `outputColorSpace = SRGBColorSpace` applies the linear→sRGB conversion.

So the flow is:
1. RenderPass: scene → RT (linear values stored, no conversion because RT texture is LinearSRGB)
2. ShaderPass: RT → RT (we output linear, no conversion because RT texture is LinearSRGB)
3. OutputPass: RT → canvas (renderer applies linear→sRGB because outputColorSpace is SRGB)

This confirms my approach is correct.

Let me also set `renderer.toneMapping = THREE.NoToneMapping` to avoid any tone mapping interference. Actually, by default it's NoToneMapping, but let's be explicit.

Actually, OutputPass applies the renderer's tone mapping. If tone mapping is NoToneMapping, it's just the color space conversion. Let me keep default (NoToneMapping).

Let me write the final code now.
