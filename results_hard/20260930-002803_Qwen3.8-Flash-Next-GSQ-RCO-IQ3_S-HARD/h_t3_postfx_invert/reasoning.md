The user wants a post-processing color-inversion effect with correct color space handling.

Let me think carefully about the color space issue:

1. Three.js uses linear color space internally. The `MeshBasicMaterial` color `0xffffff` is stored as `1.0, 1.0, 1.0` in linear space. The background `0x336699` is also interpreted in linear space (actually, let me check - Three.js Color constructor with hex values... since Three.js r152+, colors set with hex are treated as sRGB by default when using `setHex`, but internally they're stored as linear).

Wait, let me reconsider. In Three.js:
- `new THREE.Color(0x336699)` - this sets the color. In Three.js r152+, the color space handling changed. By default, `THREE.ColorManagement.enabled` is true. When you do `color.setHex(0x336699)`, it interprets the hex as sRGB and converts to linear internally.

Actually, let me be more precise. In modern Three.js (r152+):
- `new THREE.Color(0x336699)` calls `setHex(0x336699)`. The `setHex` method by default interprets the hex as sRGB (when ColorManagement is enabled) and converts to linear working space.

So `0x336699` in sRGB becomes linear values. Then the RenderPass renders to a framebuffer that's in linear space. The OutputPass (or OutputPass in newer Three.js) converts from linear to sRGB for display.

Now the key question: where do we invert?

The requirement: "the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect."

Without the effect:
- Background `0x336699` (sRGB hex) → displayed as `0x336699` on screen
- White sphere `0xffffff` → displayed as `0xffffff` on screen

With the effect:
- Background should appear as `0xcc9966` (which is `0xFF - 0x33, 0xFF - 0x66, 0xFF - 0x99` = `0xCC, 0x99, 0x66`)
- White sphere should appear as black (`0x000000`)

So the inversion must happen in sRGB space. If we invert in linear space, we won't get the exact sRGB inverse.

The approach:
1. RenderPass renders the scene to a linear framebuffer.
2. We need to convert to sRGB, invert, then the OutputPass converts back... wait, no.

Actually, let me think again:

- RenderPass renders to linear framebuffer (scene colors are in linear space).
- If we invert in the linear framebuffer: `1.0 - linearValue`, then OutputPass converts to sRGB for display. This won't give us the sRGB-space inverse.
- If we convert linear→sRGB in the shader, invert, then... the OutputPass would convert again from "linear" to sRGB. But if we already output sRGB, the OutputPass would incorrectly apply another gamma curve.

Wait, let me reconsider the pipeline:

Normal pipeline (no effect):
1. RenderPass → renders to framebuffer in linear space
2. OutputPass → converts linear → sRGB for display

With inversion that gives sRGB-space inverse:
1. RenderPass → linear framebuffer
2. Custom ShaderPass → we need the final on-screen result to be `1.0 - sRGB(linear_color)`. 

The OutputPass does: `output = linear_to_sRGB(input)` where input is in linear space.

If we want: `final_on_screen = 1.0 - sRGB(original_linear)`

The OutputPass computes: `final = sRGB(input)` where input is what we pass to it.

So we need: `sRGB(input) = 1.0 - sRGB(original_linear)`
→ `input = sRGB_inv(1.0 - sRGB(original_linear))`
→ `input = linear_from_sRGB(1.0 - sRGB(original_linear))`

In the shader:
1. Convert linear input to sRGB: `sRGB = pow(linear, vec3(1.0/2.2))` or use the proper sRGB transfer function.
2. Invert: `inverted_sRGB = 1.0 - sRGB`
3. Convert back to linear (since OutputPass expects linear input): `output = pow(inverted_sRGB, vec3(2.2))` or proper function.

Wait, but actually the OutputPass in Three.js r152+ does the linear→sRGB conversion. Let me check what OutputPass actually does.

Looking at Three.js source for OutputPass: it uses `LinearSRGBColorSpace` to `SRGBColorSpace` conversion. The fragment shader essentially applies the sRGB transfer function (linear_to_sRGB).

So the pipeline is:
- RenderPass outputs linear values to the composer's render target.
- Our ShaderPass receives linear values.
- OutputPass receives values from our ShaderPass and applies linear→sRGB.

For the desired output `1.0 - sRGB(linear_original)` to appear on screen:
- OutputPass will compute `sRGB(input)` from whatever we give it.
- We need `sRGB(input) = 1.0 - sRGB(linear_original)`
- So `input = sRGB_inv(1.0 - sRGB(linear_original))`

In GLSL:
```
vec3 srgb = linearToSRGB(color.rgb);  // linear → sRGB
vec3 inverted = 1.0 - srgb;
vec3 result = sRGBToLinear(inverted); // sRGB → linear (because OutputPass will convert back)
```

Actually, let me use the proper sRGB functions:

```glsl
vec3 linearToSRGB(vec3 color) {
    return mix(
        color * 12.92,
        1.055 * pow(color, vec3(1.0/2.4)) - 0.055,
        step(0.0031308, color)
    );
}

vec3 sRGBToLinear(vec3 color) {
    return mix(
        color / 12.92,
        pow((color + 0.055) / 1.055, vec3(2.4)),
        step(0.04045, color)
    );
}
```

So the shader pass:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 color) { ... }
vec3 sRGBToLinear(vec3 color) { ... }

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    vec3 srgb = linearToSRGB(color.rgb);
    vec3 inverted = 1.0 - srgb;
    vec3 linear_inverted = sRGBToLinear(inverted);
    gl_FragColor = vec4(linear_inverted, color.a);
}
```

Then OutputPass converts `linear_inverted` to sRGB for display, giving us `1.0 - srgb_original`.

Let me verify with the background color:
- `0x336699` in sRGB → linear. The hex is `51/255, 102/255, 153/255` = `0.2, 0.4, 0.6` in sRGB.
- Linear: approximately `0.0331, 0.1329, 0.3257` (using the sRGB formula)
- In shader: linearToSRGB gives back `0.2, 0.4, 0.6`
- Invert: `0.8, 0.6, 0.4`
- sRGBToLinear: `0.6038, 0.3257, 0.1329`
- OutputPass: sRGB(0.6038) ≈ 0.8 → 0xCC, sRGB(0.3257) ≈ 0.6 → 0x99, sRGB(0.1329) ≈ 0.4 → 0x66
- Result: `0xCC9966` ✓

For white sphere:
- `0xffffff` → linear `1.0, 1.0, 1.0`
- linearToSRGB: `1.0, 1.0, 1.0`
- Invert: `0.0, 0.0, 0.0`
- sRGBToLinear: `0.0, 0.0, 0.0`
- OutputPass: `0.0, 0.0, 0.0` → `0x000000` ✓

Now let me also think about whether `new THREE.Color(0x336699)` in modern Three.js converts to linear. 

In Three.js r152+: `new THREE.Color(0x336699)` → the constructor calls `setHex(0x336699, SRGBColorSpace)`. This converts the sRGB hex to linear working space. So the color stored in `color.r, color.g, color.b` will be the linear representation.

Actually wait - let me double check. `THREE.Color` constructor with a number calls `setHex(hex, colorSpace)`. The default colorSpace parameter... In r152+, `setHex` signature is `setHex(hex: number, colorSpace?: string)`. If ColorManagement is enabled (default true), it treats the hex as sRGB and converts to linear.

So yes, `new THREE.Color(0x336699)` stores linear values internally, and the RenderPass will render those linear values to the framebuffer. Our shader then converts to sRGB, inverts, converts back to linear, and OutputPass converts to sRGB for display.

Now for the TypeScript code:

- Import THREE, EffectComposer, RenderPass, ShaderPass, OutputPass
- Define the shader as an object with uniforms, vertexShader, fragmentShader
- The ShaderPass vertexShader is the standard one (from ShaderPass or we write our own)

Let me write the complete file now.

Actually, I need to be careful with the OutputPass import path. In Three.js addons it's `three/addons/postprocessing/OutputPass.js`.

For the ShaderPass vertex shader, the standard one from ShaderPass is:
```glsl
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Let me structure the shader definition:

```typescript
const InvertShader = {
    name: 'InvertShader',
    uniforms: {
        tDiffuse: { value: null }
    },
    vertexShader: `...`,
    fragmentShader: `...`
};
```

Now let me write the complete file.
