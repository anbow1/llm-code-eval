Let me think carefully about this problem.

The key challenge is color space management in Three.js post-processing.

In modern Three.js (r152+), the rendering pipeline works as follows:
1. Scene objects are rendered in linear color space internally
2. `OutputPass` (or previously `GammaCorrectionShader`) converts from linear to sRGB at the end of the post-processing chain
3. The `renderer.outputColorSpace` is typically `THREE.SRGBColorSpace`

When using `EffectComposer`:
- The `RenderPass` renders the scene into a render target. This render target is in linear space (because the renderer renders in linear space internally).
- The `OutputPass` converts from linear to sRGB for the final display.

So the pipeline is: Scene (linear) → RenderPass (linear) → [custom passes in linear] → OutputPass (linear → sRGB) → Screen

Now, the requirement: The background color 0x336699 must appear on screen as 0xcc9966.

Let's think about what 0x336699 means. In Three.js, when you set `new THREE.Color(0x336699)`, this is an sRGB color value. Three.js internally converts it to linear space for rendering. So the internal linear value would be approximately (0.0418, 0.1329, 0.3206) (sRGB to linear conversion).

On screen (after OutputPass sRGB conversion), the background would appear as 0x336699 again.

Now, for inversion: We want the screen to show 0xcc9966 instead of 0x336699.

0xcc9966 is NOT the sRGB-inversion of 0x336699. Let me check:
- 0x33 = 51, 255-51 = 204 = 0xcc ✓
- 0x66 = 102, 255-102 = 153 = 0x99 ✓
- 0x99 = 153, 255-153 = 102 = 0x66 ✓

So 0xcc9966 is the simple per-channel inversion in sRGB space: each channel = 1.0 - value in sRGB space.

Now, if I invert in linear space (1.0 - linear_value) and then convert to sRGB, I would NOT get 0xcc9966.

If I invert in sRGB space (1.0 - sRGB_value), I get 0xcc9966 directly.

So the question is: where should I apply the inversion?

Option 1: Apply inversion AFTER OutputPass (in sRGB space) - but OutputPass is the last pass and writes directly to screen. I'd need to add a pass after OutputPass.

Option 2: Apply inversion in the shader in linear space, but do the math differently. If I want the final sRGB output to be 1 - original_sRGB, I need to work in sRGB space.

Option 3: Apply inversion BEFORE OutputPass but in a way that accounts for the color space conversion.

Let me think more carefully:

Without the effect:
- Scene renders in linear space
- OutputPass converts linear → sRGB
- Screen shows 0x336699

With the effect, we want screen to show 0xcc9966.

0xcc9966 = 1.0 - 0x336699 in sRGB space.

So we need the final sRGB value to be the inversion of the original sRGB value.

If I put my inversion pass AFTER OutputPass, the values would be in sRGB space, and `1.0 - rgb` would give the correct result. But wait - OutputPass writes to the screen (the default framebuffer). Can I add a pass after OutputPass?

Actually, in EffectComposer, OutputPass writes to `null` target (screen). If I add another pass after it, it would write back to the screen. Let me check - EffectComposer passes alternate between two render targets. OutputPass writes to null (screen). The next pass would read from the last written target...

Actually, looking at how EffectComposer works: it alternates between readBuffer and writeBuffer. When `pass.renderToScreen` is true (or it's the last pass), it writes to null. 

Let me reconsider the architecture:

The simplest correct approach: Put the inversion pass BEFORE OutputPass. But in the shader, I need to invert in sRGB space.

In the shader, before OutputPass:
- Values are in LINEAR space
- I need to: convert linear → sRGB, invert, convert sRGB → linear (so OutputPass can then convert back to sRGB correctly)

Wait, that would give: sRGB_invert(sRGB_to_linear(original)) → then OutputPass does sRGB_to_linear → sRGB_to_linear... that's wrong.

Let me think step by step:

Original pipeline: linear_value → OutputPass (linear→sRGB) → screen shows sRGB(original_linear) = 0x336699

Desired: screen shows 0xcc9966 = 1 - 0x336699 in sRGB space.

So I need OutputPass to output 1 - original_sRGB_value.

If my pass is before OutputPass (in linear space), I need to modify the linear value such that when OutputPass converts it to sRGB, I get 1 - sRGB(original_linear).

That means: I need my pass to output a linear value L' such that sRGB(L') = 1 - sRGB(L) where L is the original linear value.

L' = sRGBToLinear(1 - sRGB(L))

This is complex but doable in a shader.

Alternatively, put the inversion pass AFTER OutputPass:
- OutputPass outputs sRGB values to the screen
- My inversion pass reads from the screen... but that's not how EffectComposer works.

Actually wait - let me re-read how EffectComposer works. 

In EffectComposer:
- Passes are executed in order
- Each pass reads from `readBuffer` and writes to `writeBuffer` (or to screen if it's the last pass / renderToScreen)
- After each pass, readBuffer and writeBuffer are swapped

So if I have: RenderPass → InversionPass → OutputPass

RenderPass writes scene to writeBuffer (linear space). Swap.
InversionPass reads from readBuffer (linear space), writes to writeBuffer. Swap.
OutputPass reads from readBuffer, writes to screen (null). Applies linear→sRGB conversion.

So if I put my inversion between RenderPass and OutputPass, I'm in LINEAR space.

If I put inversion AFTER OutputPass:
RenderPass writes to writeBuffer (linear). Swap.
OutputPass reads readBuffer, writes to writeBuffer (sRGB). Swap. But wait - OutputPass might write to screen if renderToScreen is set...

Actually, let me look at how OutputPass works. In recent Three.js, OutputPass is typically the last pass and has `renderToScreen = true` by default. But actually, looking at the source, EffectComposer sets `pass.renderToScreen` on the last pass automatically.

Hmm, but what if I put inversion AFTER OutputPass? Then OutputPass would NOT be the last pass, so it would write to a render target (in sRGB), and my inversion pass would read from it in sRGB space and write to screen.

Wait, but there's a subtlety. The render targets in EffectComposer are typically RGBA16F or similar. Let me check what format they use.

Looking at Three.js EffectComposer source:
```js
constructor( renderer, renderTarget ) {
    ...
    if ( renderTarget === undefined ) {
        const size = renderer.getSize( new Vector2() );
        this._pixelRatio = renderer.getPixelRatio();
        ...
        renderTarget = new WebGLRenderTarget( size.width * this._pixelRatio, size.height * this._pixelRatio, { type: HalfFloatType } );
    }
    ...
}
```

The render targets use HalfFloatType. The OutputPass applies tone mapping and color space conversion. After OutputPass, the values stored in the render target would be sRGB-encoded values (as half floats).

So if I put my inversion pass AFTER OutputPass:
- OutputPass converts linear→sRGB and writes sRGB values to a render target
- My inversion pass reads those sRGB values, inverts them (1-rgb), and writes to screen

This would give the correct result! Because inverting in sRGB space gives exactly what we want.

But wait - does OutputPass really write to a render target if it's not the last pass? Let me check... In EffectComposer.render():

```js
for (let i = 0, il = this.passes.length; i < il; i++) {
    const pass = this.passes[i];
    ...
    pass.renderToScreen = (this.passes.length === i + 1);  // Actually I'm not sure about this
    ...
}
```

Hmm, actually looking more carefully at the EffectComposer source, I believe it sets `renderToScreen` based on whether the pass is the last one. But actually, looking at newer versions, it might be that passes just write to the write buffer and the last one writes to screen.

Let me look at this differently. Actually, I recall that in the standard setup:

```
composer.addPass(renderPass);
composer.addPass(shaderPass);  
composer.addPass(outputPass);
```

The OutputPass is typically last and writes to screen. But I could also do:

```
composer.addPass(renderPass);
composer.addPass(outputPass);
composer.addPass(inversionPass);
```

And inversionPass would be last, writing to screen. It would read sRGB-encoded values.

Actually, I need to be more careful. Let me look at what OutputPass actually does. OutputPass applies tone mapping and converts from linear to the renderer's output color space (sRGB). It outputs sRGB-encoded values.

If my inversion pass comes after OutputPass, it reads sRGB-encoded values from the render target. These are already gamma-corrected. Inverting them (1.0 - rgb) in sRGB space would give the desired result.

But there's a problem: the render target format. If it's HalfFloatType, the sRGB values stored as half-floats should be fine for inversion.

However, there's another subtlety: when reading from a HalfFloat render target in a shader, the values are just the stored floating-point values. If OutputPass wrote sRGB-encoded values (0.0-1.0 range), then reading them gives sRGB values directly.

Let me verify: OutputPass's shader does something like:
```glsl
// apply tone mapping
// convert to output color space (sRGB)
gl_FragColor = vec4(LinearTosRGB(color), 1.0);
```

So the render target after OutputPass contains sRGB-encoded values in [0,1] range (stored as half floats).

My inversion pass reads these, does 1.0 - rgb, and writes to screen. The screen interprets these as sRGB values. Result: 1 - original_sRGB. This is exactly what we want!

So the order should be: RenderPass → OutputPass → InversionPass

Let me verify with the numbers:
- Background: scene.background = new Color(0x336699)
- In sRGB: (51/255, 102/255, 153/255) = (0.2, 0.4, 0.6)
- After RenderPass: stored in linear space in render target
- After OutputPass: converted to sRGB, stored as (0.2, 0.4, 0.6) in render target
- After InversionPass: (1-0.2, 1-0.4, 1-0.6) = (0.8, 0.6, 0.4) = (204/255, 153/255, 102/255) = 0xcc9966 ✓

- White sphere: (1, 1, 1) in sRGB
- After inversion: (0, 0, 0) = black ✓

This works!

Now let me write the shader for the inversion pass. It's a simple ShaderPass:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    gl_FragColor = vec4(1.0 - color.rgb, color.a);
}
```

Now for the TypeScript code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Let me write the complete file now.

Wait, one more thing to consider. The ShaderPass needs a proper shader definition. Let me make sure I use the correct interface for ShaderPass.

ShaderPass expects a shader object with `uniforms`, `vertexShader`, and `fragmentShader`.

Also, I need to make sure the render targets are properly configured. By default, EffectComposer creates HalfFloatType render targets. OutputPass writes sRGB values into these. My inversion pass reads from these (which contain sRGB-encoded float values) and inverts.

Actually, I want to double-check: when OutputPass writes to the intermediate render target (not the screen), what exactly happens? OutputPass's shader:

Looking at OutputPass source in Three.js:
```glsl
// fragment shader
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec3 outputColorSpace; // not exactly, it uses defines

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    // tone mapping
    texel = toneMapping(texel);
    // color space conversion
    #if defined(USE_SRGB_OUTPUT)
    texel = LinearTosRGB(texel);
    #endif
    gl_FragColor = texel;
}
```

So after OutputPass, the render target contains sRGB-encoded values. Good.

One potential issue: the render target type is HalfFloatType. When my shader reads from it, it gets the float values directly. No automatic sRGB conversion happens at the texture sampling level (unless the texture has sRGB encoding, but render targets don't typically have that). So reading gives raw sRGB-encoded values. Inverting gives the correct result.

Let me also make sure about `renderer.outputColorSpace`. By default in modern Three.js, it's `THREE.SRGBColorSpace`. OutputPass will convert linear→sRGB when it's not the last pass writing to a render target... actually wait.

Hmm, let me reconsider. OutputPass is designed to be the final pass that converts for display. If it's writing to an intermediate render target (because it's NOT the last pass), does it still apply the sRGB conversion?

Looking at OutputPass source more carefully:

```js
class OutputPass extends Pass {
    constructor() {
        super();
        this.outputColorSpace = THREE.SRGBColorSpace;
        this.toneMapping = THREE.NoToneMapping;
        // ...
    }
    
    render(renderer, writeBuffer, readBuffer) {
        // ...
        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
            this.fsQuad.render(renderer);
        } else {
            renderer.setRenderTarget(writeBuffer);
            // ...
            this.fsQuad.render(renderer);
        }
    }
}
```

The key question: does the OutputPass shader ALWAYS apply sRGB conversion, or only when rendering to screen?

Looking at the OutputPass shader setup in the constructor:
```js
const defines = { 
    'USE_TONE_MAPPING': '',
};

if (this.outputColorSpace === THREE.SRGBColorSpace) {
    defines['USE_SRGB_OUTPUT'] = '';
}
```

So the sRGB conversion is always in the shader regardless of renderToScreen. It's a compile-time define based on the outputColorSpace property.

So yes, OutputPass always converts to sRGB, even when writing to an intermediate buffer. My inversion pass after it will read sRGB-encoded values. 

Now let me write the complete file.

Actually, I want to reconsider one more time. The problem says "the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect."

Without the effect (just RenderPass → OutputPass), the screen shows 0x336699 for the background.

With the effect (RenderPass → OutputPass → InversionPass), the screen should show 0xcc9966.

In my approach:
- RenderPass → render target (linear values)
- OutputPass → render target (sRGB values: 0x336699 = 0.2, 0.4, 0.6)
- InversionPass → screen (inverted: 0.8, 0.6, 0.4 = 0xcc9966) ✓

The screen receives 0xcc9966 directly. No further conversion happens because the final output is the InversionPass writing directly to the screen framebuffer.

Wait, but does the browser/screen do any additional color management? In WebGL, if the framebuffer is interpreted as sRGB (which it typically is on modern displays), then writing 0xcc9966 values to the framebuffer means the pixels are sRGB-encoded. The display shows them correctly.

Yes, this is correct. The final InversionPass writes to null (screen), and the values it writes are sRGB-encoded (because it read sRGB-encoded values from OutputPass and inverted them). The display shows them as-is.

Let me now write the complete TypeScript file.
