Let me think carefully about color spaces and post-processing in Three.js.

Key considerations:
1. The scene background is `0x336699` (sRGB value).
2. The sphere material color is `0xffffff` (white, sRGB value).
3. We want the final screen output to show `0xcc9966` for background and `0x000000` for the sphere.

How Three.js color management works:
- When you set `scene.background = new THREE.Color(0x336699)`, Three.js (with color management enabled, which is default in r152+) converts this sRGB value to linear internally. So `0x336699` becomes the linear equivalent.
- When rendering normally (without post-processing), the renderer applies linear->sRGB conversion at the end, so the screen shows `0x336699`.
- With EffectComposer and OutputPass, the OutputPass handles the linear->sRGB conversion at the end.

The issue with post-processing:
- `RenderPass` renders the scene into a float/half-float render target. The colors in this render target are in LINEAR space (because the renderer outputs linear to the render target, not sRGB).
- `OutputPass` does the linear->sRGB conversion and tone mapping before writing to the screen.

If I invert in linear space and then OutputPass converts to sRGB:
- Background in linear: sRGBToLinear(0x336699) ≈ (0.03185, 0.12742, 0.30828) (approximately)
- Inverted linear: 1 - (0.03185, 0.12742, 0.30828) = (0.96815, 0.87258, 0.69172)
- OutputPass converts to sRGB: linearToSRGB(0.96815) ≈ 0.986, linearToSRGB(0.87258) ≈ 0.939, linearToSRGB(0.69172) ≈ 0.850
- Result in sRGB: approximately (0.986*255, 0.939*255, 0.850*255) ≈ (251, 239, 217) ≈ 0xFBEFD9
- But we want 0xcc9966 = (204, 153, 102) = (0.8, 0.6, 0.4) in sRGB.

So inverting in linear space and then doing linear->sRGB gives a DIFFERENT result than inverting in sRGB space.

For the white sphere (0xffffff):
- In linear: (1, 1, 1)
- Inverted: (0, 0, 0)
- linearToSRGB(0) = 0 → black. This works!

But for the background, it doesn't work because of the non-linearity of sRGB.

To get the EXACT inverse in sRGB space, I need to:
1. Convert linear to sRGB
2. Invert in sRGB space
3. Convert sRGB back to linear (so OutputPass can do its conversion correctly)

Wait, let me reconsider. The OutputPass does linear->sRGB. So if I want the final sRGB output to be `1.0 - original_srgb`, I need:

- Input to my shader: linear value (from RenderPass)
- I need to convert to sRGB, invert, then convert back to linear
- OutputPass then converts linear to sRGB, giving me the inverted sRGB value.

Let me verify:
- Background sRGB: 0x336699 = (0.2, 0.4, 0.6) normalized (51/255, 102/255, 153/255)
- Convert to linear: srgbToLinear(0.2) ≈ 0.0331, srgbToLinear(0.4) ≈ 0.1329, srgbToLinear(0.6) ≈ 0.3185
- RenderPass outputs this linear value
- My shader: linearToSRGB(0.0331) = 0.2, invert: 0.8, linearToSRGB back: srgbToLinear(0.8) ≈ 0.6038
- Wait no. After inverting in sRGB space, I need to convert back to linear for OutputPass.

Let me redo:
- Linear value from RenderPass: L = srgbToLinear(0.2, 0.4, 0.6)
- In my shader: 
  - s = linearToSRGB(L) → gives back (0.2, 0.4, 0.6)
  - inverted_s = 1.0 - s → (0.8, 0.6, 0.4)
  - output_linear = srgbToLinear(inverted_s) → srgbToLinear(0.8, 0.6, 0.4)
- OutputPass: final_srgb = linearToSRGB(output_linear) = linearToSRGB(srgbToLinear(0.8, 0.6, 0.4)) = (0.8, 0.6, 0.4)
- 0.8*255=204, 0.6*255=153, 0.4*255=102 → 0xcc9966 ✓

For white sphere:
- Linear: (1,1,1)
- linearToSRGB(1) = 1, invert: 0, srgbToLinear(0) = 0
- OutputPass: linearToSRGB(0) = 0 → black ✓

So the shader needs to:
1. Convert input (linear) to sRGB
2. Invert
3. Convert back to linear

Now, regarding tone mapping: OutputPass applies tone mapping. If tone mapping is set to NoToneMapping (default), then it just does the color space conversion. I should set `renderer.toneMapping = THREE.NoToneMapping` to be safe.

Actually wait - let me check. In Three.js r152+, `renderer.outputColorSpace` defaults to `SRGBColorSpace`. The OutputPass is designed to work with EffectComposer - it reads from the internal render target (which is linear) and writes to the screen framebuffer (which expects sRGB), applying the color space conversion.

The render targets used by EffectComposer - by default they're RGBA format. In newer Three.js, there might be considerations about whether the render target has `THREE.SRGBColorSpace` or `THREE.LinearSRGBColorSpace`. Let me think...

When EffectComposer creates its render target, by default it uses `LinearSRGBColorSpace`. The RenderPass renders into this linear render target. The OutputPass then converts from linear to sRGB when writing to the canvas.

So my approach should work. Let me write the shader:

```glsl
// Vertex shader
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment shader
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 color) {
    return mix(
        color * 12.92,
        pow(color, vec3(1.0 / 2.4)) * 1.055 - 0.055,
        step(vec3(0.0031308), color)
    );
}

vec3 sRGBToLinear(vec3 color) {
    return mix(
        color / 12.92,
        pow((color + 0.055) / 1.055, vec3(2.4)),
        step(vec3(0.04045), color)
    );
}

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    // Convert from linear to sRGB
    vec3 srgb = linearToSRGB(texel.rgb);
    // Invert in sRGB space
    vec3 inverted = 1.0 - srgb;
    // Convert back to linear for OutputPass
    vec3 linear = sRGBToLinear(inverted);
    gl_FragColor = vec4(linear, texel.a);
}
```

Now let me think about the EffectComposer render target format. By default, EffectComposer uses `HalfFloatType` for the render targets. This should be fine for our linear intermediate values.

Actually, I need to double-check: does `THREE.Color` with color management enabled store values in linear or sRGB? 

In Three.js r152+, `new THREE.Color(0x336699)` - when color management is enabled (default), the constructor interprets the hex as sRGB and converts to linear for internal storage. So `color.r`, `color.g`, `color.b` will be linear values.

The sphere material `new THREE.MeshBasicMaterial({ color: 0xffffff })` - 0xffffff in linear is also (1,1,1), so no issue there.

The scene background: `new THREE.Color(0x336699)` stored internally as linear. When rendered, the shader gets linear values, and the output to the render target is linear. Good.

Let me also make sure the EffectComposer's internal render target is in linear space. By default it should be. Let me explicitly set it or just rely on defaults.

Actually, I realize I should double-check one thing: `renderer.outputColorSpace = THREE.SRGBColorSpace` is the default. The OutputPass is supposed to handle this conversion. Let me make sure I'm not double-converting.

The pipeline:
1. RenderPass renders scene → EffectComposer's render target (linear space)
2. My ShaderPass processes (my shader converts to sRGB, inverts, converts back to linear) → next render target (linear)
3. OutputPass converts linear → sRGB and writes to canvas

This should give correct results.

Let me also set `renderer.toneMapping = THREE.NoToneMapping` explicitly to avoid any surprises.

One more thing: the EffectComposer's render target type. By default in recent Three.js, it might use `HalfFloatType` or `UnsignedByteType`. For our purposes, since we're dealing with values in [0,1] range after inversion, either should work. But let me use the default.

Actually, I want to be extra careful. Let me explicitly create the render target with appropriate format:

```typescript
const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    type: THREE.HalfFloatType,
    colorSpace: THREE.LinearSRGBColorSpace
});
const composer = new EffectComposer(renderer, renderTarget);
```

Hmm, actually `colorSpace` might not be a valid option for WebGLRenderTarget. Let me just use the default EffectComposer constructor which handles this correctly.

Let me also think about whether I need `THREE.LinearSRGBColorSpace` or `THREE.SRGBColorSpace` for the render targets. In the default EffectComposer setup, the internal render targets should be in linear space, which is what we want.

I think the safe approach is:

```typescript
const composer = new EffectComposer(renderer);
```

And just let the defaults handle it. The RenderPass writes linear, my shader operates in linear (converting to/from sRGB internally), and OutputPass converts final result to sRGB for the screen.

Let me finalize my code.

Wait, one more thing. The `__ready` flag - I need to set it after the first frame. I'll do a single render first, then set the flag, then start the animation loop. Or I can use a flag in the loop.

Let me write the complete file now.
