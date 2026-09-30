Let me think carefully about the color space handling here.

The key requirement: the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect.

Without the effect:
- Background 0x336699 → displayed on screen as 0x336699
- White sphere 0xffffff → displayed on screen as 0xffffff

With the effect:
- Background should appear as 0xcc9966 (which is 1.0 - 0x336699 in sRGB components)
- White sphere should appear as black (1.0 - 1.0 = 0.0)

Now, the critical question is about color spaces and where the linear-to-sRGB conversion happens.

In Three.js with `renderer.outputColorSpace = THREE.SRGBColorSpace` (default in modern Three.js), the pipeline is:
1. Scene renders in linear color space internally
2. OutputPass (or the last pass) handles the linear → sRGB conversion

The background color `0x336699` - when set as `scene.background = new THREE.Color(0x336699)`, Three.js stores it in linear space. The hex 0x336699 is interpreted as sRGB by default (Three.js converts it to linear when `colorManagement` is enabled).

Wait, let me reconsider. In Three.js with color management enabled (default since r152):
- `new THREE.Color(0x336699)` - the color is set from sRGB hex, stored as linear in the Color object
- Actually, `THREE.Color` stores values in linear space when `THREE.ColorManagement.enabled = true`
- So `new THREE.Color(0x336699)` gets converted to linear internally

The render pass renders to a framebuffer. The OutputPass then does linear → sRGB conversion.

So the pipeline without inversion:
1. Scene has linear colors (0x336699 converted to linear)
2. RenderPass renders to linear framebuffer
3. OutputPass converts linear → sRGB for display
4. Screen shows 0x336699

With inversion, I need screen to show 0xcc9966 (which is 1-0x33, 1-0x66, 1-0x99 in sRGB).

The inversion must happen in **sRGB space** because we want:
- sRGB output = 1.0 - sRGB_input

If I invert in linear space:
- Linear inversion: 1.0 - linear_value
- Then OutputPass converts to sRGB
- This won't give the correct sRGB inversion

If I invert after sRGB conversion (or invert in sRGB space):
- Take sRGB values, invert: 1.0 - sRGB_value
- This gives the correct result on screen

So the correct approach:
1. RenderPass renders in linear space to a render target
2. A custom pass inverts colors - but this needs to happen in sRGB space
3. OutputPass converts linear → sRGB

Wait, if the passes between RenderPass and OutputPass work in linear space, then I need to:
- Option A: After OutputPass converts to sRGB, invert. But EffectComposer applies passes sequentially, and OutputPass is typically last.
- Option B: In the custom shader, first convert from linear to sRGB, then invert, then convert back to linear. Then OutputPass does linear → sRGB again.
- Option C: Put the inversion AFTER OutputPass. But the standard pipeline expects OutputPass to be last.

Actually, let me reconsider the EffectComposer pipeline:
- RenderPass → writes linear colors to framebuffer
- ShaderPass (custom) → reads from previous buffer, writes to next buffer
- OutputPass → reads from previous buffer (linear), applies linear→sRGB, writes to screen

If I put my inversion between RenderPass and OutputPass, it operates on linear values. To get correct sRGB inversion, I need to:
1. Convert linear → sRGB in the shader
2. Invert: 1.0 - sRGB
3. Convert sRGB → linear (so OutputPass can then convert back to sRGB)

Let me verify with the background:
- Background sRGB: 0x33/0xFF = 0.2, 0x66/0xFF = 0.4, 0x99/0xFF = 0.6
- Linear: sRGBToLinear(0.2) ≈ 0.0331, sRGBToLinear(0.4) ≈ 0.1329, sRGBToLinear(0.6) ≈ 0.3283
- In shader: convert to sRGB → (0.2, 0.4, 0.6), invert → (0.8, 0.6, 0.4), convert to linear → (0.6038, 0.3283, 0.1329)
- OutputPass: linear → sRGB → (0.8, 0.6, 0.4) → 0xCC, 0x99, 0x66 ✓

For the white sphere:
- sRGB: (1,1,1), Linear: (1,1,1)
- In shader: sRGB → (1,1,1), invert → (0,0,0), linear → (0,0,0)
- OutputPass: linear → sRGB → (0,0,0) → black ✓

This works.

Alternatively, I could put the inversion after OutputPass, but that's unusual. Let me think if there's a simpler way...

Actually, another approach: use OutputPass first, then my inversion pass. The EffectComposer applies passes in order. If OutputPass writes sRGB values to its output buffer, and my ShaderPass reads those sRGB values and inverts them, then writes directly to screen... but wait, does the renderer apply another sRGB conversion? 

In EffectComposer, the last pass renders to screen (renderToScreen = true). The OutputPass is designed to handle the linear→sRGB conversion. If I put my inversion after OutputPass, the OutputPass would output sRGB values, my pass would invert them, but then the renderer might apply another sRGB conversion... Actually no, when rendering to screen in the final pass, Three.js doesn't do additional color conversion on the fragment shader output.

Wait, actually in modern Three.js, the renderer's `outputColorSpace` only applies when using `renderer.render()` directly. With EffectComposer and ShaderPass, the fragment shader output goes directly to the screen framebuffer without additional conversion. The OutputPass explicitly handles the conversion.

So another approach:
- RenderPass (linear → framebuffer)
- OutputPass (linear → sRGB, writes to internal framebuffer)  
- ShaderPass with inversion (reads sRGB, inverts sRGB, writes to screen)

This should work! The inversion happens on sRGB values directly, and since it's the last pass writing to screen, no further conversion is applied.

But wait, does the renderer do a final sRGB conversion when writing to the screen canvas? Let me think... In WebGL, the canvas can be in sRGB mode or not. Three.js typically sets up the canvas without sRGB encoding on the WebGL side (it does the conversion in the shader via OutputPass). So writing sRGB values to the final framebuffer should display them correctly.

Actually, I need to be more careful. In Three.js r152+, with `renderer.outputColorSpace = THREE.SRGBColorSpace`:
- When using `renderer.render()`, the built-in materials' shaders include a linear→sRGB conversion at the end
- When using EffectComposer, RenderPass disables this (renders in linear), and OutputPass handles the conversion

The EffectComposer's last pass has `renderToScreen = true`, which means it renders directly to the canvas. The ShaderPass fragment shader output goes directly to the canvas without additional conversion (the renderer doesn't add another sRGB pass on top).

So the approach of putting inversion after OutputPass should work. Let me go with:
1. RenderPass
2. OutputPass  
3. ShaderPass (inversion, renderToScreen = true)

Actually wait - I need to be careful about how EffectComposer handles `renderToScreen`. By default, the last pass added has `renderToScreen = true`. But actually, I think EffectComposer doesn't automatically set renderToScreen. Let me check...

Actually, EffectComposer automatically sets `renderToScreen = true` for the last pass added. No wait, I don't think it does. You need to set it manually, or actually... let me recall. 

Looking at the EffectComposer code, `addPass()` doesn't automatically set renderToScreen. The OutputPass and final passes need to have `renderToScreen = true`. Actually, I recall that in practice, the EffectComposer renders the last pass to screen if no renderTarget is provided for that pass... No, I think you need to explicitly set `renderToScreen`.

Hmm, actually looking at EffectComposer source: during `render()`, for each pass, if `pass.renderToScreen` is true, it renders to `null` (screen). Otherwise it renders to the write buffer. By default, ShaderPass has `renderToScreen = false`. 

But actually, I recall that if you just do `composer.addPass()` for all passes and call `composer.render()`, the last pass's output goes to the screen because... no, I think you do need to set it.

Wait, let me re-read the Three.js docs/examples. In most examples with OutputPass:
```js
composer.addPass(renderPass);
composer.addPass(outputPass);
```
And it works without explicitly setting renderToScreen. Looking at EffectComposer code more carefully... 

Actually, I think EffectComposer's `render()` method does render the last pass to screen. Let me look at the logic: it renders each pass to the write buffer, then swaps. For the last pass... hmm, I'm not 100% sure it auto-detects the last pass. 

Looking at examples online, the standard pattern is:
```js
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(shader));
composer.addPass(new OutputPass());
```
And OutputPass is last and renders to screen. I believe OutputPass sets `renderToScreen = true` by default, or the EffectComposer handles it.

Actually, I just recalled: `EffectComposer` constructor creates two render targets (readBuffer, writeBuffer). During `render()`, for each pass, it sets the read/write buffers. The pass itself checks `this.renderToScreen`. OutputPass has `renderToScreen = false` by default, but the composer... 

OK, let me just look at what actually works in practice. The standard pattern that works is putting OutputPass last, and it renders to screen. I'll follow that pattern.

But for my inversion pass, if I put it after OutputPass, it becomes the last pass. I should set `renderToScreen = true` on it, or ensure the composer handles it.

Actually, I just realized: I can also make my inversion pass handle everything. Instead of using OutputPass, I can do the linear→sRGB conversion AND the inversion in my custom shader, and make that the last pass. But the requirement says to use OutputPass.

Let me re-read the requirements: "a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass."

The order isn't explicitly specified. Let me go with:
1. RenderPass
2. OutputPass (linear → sRGB)
3. ShaderPass (inverts sRGB values, renders to screen)

This is clean because the inversion happens in sRGB space directly.

Wait, but will the ShaderPass after OutputPass work correctly? OutputPass writes sRGB values to the internal framebuffer. ShaderPass reads those sRGB values, inverts them, and writes to screen. Since it's writing to screen (which is an sRGB display), the values should appear correctly.

But there's a subtlety: the internal framebuffer between passes. What color space is it in? If I put the inversion pass's render target, is there any automatic conversion? No, ShaderPass just samples from a texture and outputs via fragment shader - no color space conversion happens automatically in the render targets.

OK let me also consider: does `renderer.outputColorSpace` affect the ShaderPass rendering? I don't think so - ShaderPass uses its own material with a custom shader.

Let me also consider: the render targets used by EffectComposer. By default, `EffectComposer` creates render targets. In newer Three.js, these might have `type: THREE.HalfFloatType` by default to preserve linear HDR values. This shouldn't affect my inversion since sRGB values are in [0,1] anyway.

OK, let me go with this approach:
- RenderPass (renders scene to linear framebuffer)
- OutputPass (converts linear → sRGB, writes to framebuffer)  
- ShaderPass with inversion (reads sRGB, inverts, outputs to screen)

For the inversion shader, I just need:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    gl_FragColor = vec4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, color.a);
}
```

This is simple and correct because the input is already in sRGB space (thanks to OutputPass before it).

Now let me also think about whether I need to set `renderToScreen = true` on the last ShaderPass. Looking at EffectComposer source code:

In the `render` method, for each pass:
```js
pass.renderToScreen = (this.passes[i] === this.passes[this.passes.length - 1]);
```

Wait, does it do that? I don't think the standard EffectComposer auto-sets this. Let me just explicitly set it to be safe.

Actually, I just recalled from the Three.js source:

```js
// in EffectComposer.render()
const ilPass = this.passes.length;
for (let i = 0; i < ilPass; i++) {
    const pass = this.passes[i];
    // ...
    pass.renderToScreen = (this.passes[i] === this.passes[this.passes.length - 1]);
```

Hmm, I'm not sure if this is in the actual source. Let me just explicitly set it.

Wait, actually I recall now - looking at the actual EffectComposer source:

```js
for ( let i = 0, il = this.passes.length; i < il; i ++ ) {
    const pass = this.passes[ i ];
    if ( pass.enabled === false ) continue;
    pass.renderToScreen = ( this.passes[ i ] === this.passes[ this.passes.length - 1 ] );
```

Hmm, no I don't think EffectComposer sets renderToScreen automatically. But OutputPass... let me check. Actually in the Three.js examples, people do things like:

```js
composer.addPass(renderPass);
composer.addPass(outputPass);
composer.render();
```

And it works. So either OutputPass sets renderToScreen = true, or the composer handles it.

Looking at the actual Three.js r158 source for EffectComposer.render():
It doesn't seem to auto-set renderToScreen. But looking at examples, it works... 

OH WAIT. I think I recall now. The last pass that's not renderToScreen will render to the write buffer, and then... no. 

Actually, I think in practice, if you use EffectComposer with the standard passes and don't set renderToScreen, nothing renders to screen. But the examples work... so either I'm wrong about the source, or OutputPass does set it.

Let me just explicitly set `renderToScreen = true` on my last ShaderPass. That's the safe thing to do.

Hmm, but actually, looking at real Three.js examples more carefully, the pattern is:
```js
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const effectPass = new ShaderPass(Shader);
composer.addPass(effectPass);
composer.addPass(new OutputPass());
```

And this works to screen. I believe the reason is that OutputPass's `render()` method, when `renderToScreen` is false, still renders correctly because... actually no. 

Let me just go with explicitly setting it. I'll set `(lastPass as any).renderToScreen = true;`

Actually, you know what, let me reconsider the order. The requirement says the passes are RenderPass, custom ShaderPass, and OutputPass. Maybe they want that order. Let me think about whether I can make it work with that order.

Order: RenderPass → ShaderPass (invert) → OutputPass

In this case:
- RenderPass: renders scene in linear space to framebuffer
- ShaderPass: inverts linear colors: output = 1.0 - linear_input
- OutputPass: converts linear → sRGB for screen

Let's check with background:
- Background sRGB: (0x33, 0x66, 0x99) = (0.2, 0.4, 0.6) in sRGB
- Linear: sRGBtoLinear(0.2) ≈ 0.0331, sRGBtoLinear(0.4) ≈ 0.1329, sRGBtoLinear(0.6) ≈ 0.3283
- ShaderPass invert: 1 - 0.0331 = 0.9669, 1 - 0.1329 = 0.8671, 1 - 0.3283 = 0.6717
- OutputPass linear→sRGB: sRGBtoLinear_inverse(0.9669) ≈ 0.9864, sRGBtoLinear_inverse(0.8671) ≈ 0.9441, sRGBtoLinear_inverse(0.6717) ≈ 0.8377
- Screen: (0.9864, 0.9441, 0.8377) → (0xFB, 0xF1, 0xD6)

But we want (0xCC, 0x99, 0x66) = (0.8, 0.6, 0.4). So this DOESN'T work!

Inverting in linear space then converting to sRGB does NOT give the sRGB inversion.

So I MUST either:
1. Put inversion after OutputPass (so it inverts sRGB values), OR
2. Do the conversion dance in the shader (linear→sRGB, invert, sRGB→linear), OR
3. Disable OutputPass's color space conversion and handle everything manually

The requirement says to use all three passes. Let me go with order: RenderPass → OutputPass → ShaderPass(invert). The requirement lists the passes but doesn't strictly mandate their order.

Actually, re-reading: "a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass." - This just lists what to include, not necessarily the order.

I'll go with: RenderPass → OutputPass → ShaderPass(invert with renderToScreen=true)

But wait, there might be an issue. When OutputPass renders to an internal framebuffer (not screen), the values are sRGB. Then my ShaderPass reads from that framebuffer and inverts. But will the texture sampling apply any color space conversion? 

In Three.js, when you create a WebGLRenderTarget, the texture doesn't have an automatic sRGB interpretation unless you set `texture.colorSpace = THREE.SRGBColorSpace`. The default is `THREE.NoColorSpace` or `THREE.LinearSRGBColorSpace`. So the texture will be sampled "raw" - no automatic sRGB→linear conversion during sampling. This is what we want.

Wait, but OutputPass writes sRGB values to a linear-space texture. When ShaderPass samples it with `texture2D()`, it gets the raw sRGB values. My shader inverts them. The output goes to screen. Since the screen expects sRGB values, this works correctly. ✓

Let me also consider: does the EffectComposer's render target have `type: THREE.HalfFloatType`? If so, values outside [0,1] could be stored, but our sRGB values are in [0,1] so it's fine.

One more concern: when ShaderPass renders to screen, does the renderer apply any color management? In Three.js, `renderer.outputColorSpace` only affects the built-in material shaders (via the `#include <colorspace_fragment>` chunk). A custom ShaderPass uses its own raw shader, so no automatic conversion is applied. ✓

Great, my plan is solid. Let me code it up.

Actually wait - I need to double-check one more thing. After OutputPass writes to the framebuffer, does the EffectComposer's internal framebuffer have sRGB color space set? Let me check...

OutputPass in Three.js renders using a material that includes the `#include <colorspace_fragment>` which does linear→sRGB. The output goes to the composer's write buffer (a WebGLRenderTarget). The render target's texture has `colorSpace: THREE.NoColorSpace` by default (or it might be set to something). When I read from it with `texture2D()` in my shader, I get the raw stored values (sRGB-encoded floats). Good.

Let me finalize the code now.

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const inversionShader = {
    uniforms: {
        tDiffuse: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            gl_FragColor = vec4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, color.a);
        }
    `
};

const inversionPass = new ShaderPass(inversionShader);
inversionPass.renderToScreen = true;
composer.addPass(inversionPass);

// Animation
let firstFrame = true;
const animate = () => {
    composer.render();
    if (firstFrame) {
        (window as any).__ready = true;
        firstFrame = false;
    }
};
renderer.setAnimationLoop(animate);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Wait, I need to think about whether the sphere will actually be visible and the inversion will produce the exact colors. Let me trace through again with color management:

1. `new THREE.Color(0x336699)` with ColorManagement enabled:
   - The hex is interpreted as sRGB
   - Stored internally as linear: r = sRGBtoLinear(51/255), g = sRGBtoLinear(102/255), b = sRGBtoLinear(153/255)
   - 51/255 = 0.2, 102/255 = 0.4, 153/255 = 0.6
   - Linear: (0.03310, 0.13287, 0.32831)

2. RenderPass renders the scene:
   - Background color is drawn as linear values to the framebuffer
   - White sphere: MeshBasicMaterial color 0xffffff → linear (1,1,1)
   - Framebuffer contains linear values

3. OutputPass: applies linear→sRGB conversion
   - Background: linearToSRGB(0.03310) ≈ 0.2, linearToSRGB(0.13287) ≈ 0.4, linearToSRGB(0.32831) ≈ 0.6
   - Sphere: linearToSRGB(1.0) = 1.0
   - Output is sRGB values in [0,1]

4. My inversion ShaderPass:
   - Background: (1-0.2, 1-0.4, 1-0.6) = (0.8, 0.6, 0.4) → hex (0xCC, 0x99, 0x66) ✓
   - Sphere: (1-1, 1-1, 1-1) = (0, 0, 0) → black ✓
   - Output goes directly to screen

This is correct. The sRGB values on screen will be exactly the inverse.

One thing to verify: `new THREE.Color(0x336699)` - does Three.js's Color constructor with a hex number treat it as sRGB when ColorManagement is enabled? 

Yes, in Three.js with `THREE.ColorManagement.enabled = true` (default since r152), `new THREE.Color(hex)` converts from sRGB to linear working space. The `setHex()` method uses `SRGBColorSpace` by default.

Actually wait, let me double-check. Looking at Three.js source:
```js
setHex( hex, colorSpace = SRGBColorSpace ) {
    // ...
    return this.setRGB( ( ( hex >> 16 ) & 255 ) / 255, ... , colorSpace );
}
```
And `setRGB` with SRGBColorSpace converts to linear. Yes, this is correct.

But hold on - does the `Color` class actually convert to linear? Let me think again... In r152+, `THREE.Color` has `ColorManagement` awareness. The internal r,g,b values are in the working color space (linear-sRGB by default). So `new THREE.Color(0x336699)` does:
- Parse hex → sRGB components (0.2, 0.4, 0.6)
- Convert sRGB → linear (0.0331, 0.1329, 0.3283)
- Store as .r, .g, .b

Then when rendering, the scene background color is in linear space, which is correct for the linear framebuffer. OutputPass converts back to sRGB. 

Now, does `renderer.outputColorSpace` matter here? Since I'm using EffectComposer:
- RenderPass: The scene's background is rendered. In the fragment shader for the background, does Three.js apply any color conversion? 

Actually, for `scene.background`, Three.js renders it directly in the background pass. The color is in linear space. The renderer with EffectComposer should NOT apply the output colorspace conversion (since we're rendering to a render target, not to screen). Actually...

Hmm, this is tricky. When RenderPass renders to a render target (not to screen), does the renderer still apply `outputColorSpace`? I believe it does NOT - the `outputColorSpace` conversion only applies when rendering to screen (renderToScreen). When rendering to a render target, colors stay in linear space. This is correct for our pipeline.

Actually wait, I need to re-examine. In Three.js, the `outputColorSpace` is encoded in the shader as `#include <colorspace_fragment>` which is:
```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```

This is included in all material shaders. When rendering to a render target with `EffectComposer`, does this still apply? 

In the EffectComposer's RenderPass, it calls `renderer.render(scene, camera)` which renders to the composer's render target. The renderer checks if it's rendering to a render target vs. to screen... Actually, I don't think it does. The `outputColorSpace` conversion might always be applied.

Hmm, but that would break the whole pipeline. If RenderPass already outputs sRGB, and then OutputPass also does linear→sRGB, we'd get double conversion.

Let me think about this more carefully. Looking at the Three.js RenderPass source:
```js
render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
    // ...
    renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );
    // ...
    renderer.render( this.scene, this.camera );
}
```

And the renderer's behavior with color space: The `outputColorSpace` is used to determine the encoding in the fragment shader. When rendering to a render target, Three.js might set the render target's color space to linear...

Actually, I recall that in newer Three.js, the render targets created by EffectComposer have their color space set. And the renderer adapts its shader output based on the target's color space.

From the EffectComposer constructor:
```js
if ( renderTarget === undefined ) {
    // creates default render target
    renderTarget = new WebGLRenderTarget( size.width, size.height, { type: HalfFloatType } );
    renderTarget.texture.name = 'EffectComposer.rt1';
}
```

And the render target texture colorSpace defaults to `THREE.NoColorSpace` (or LinearSRGBColorSpace). When the renderer renders to a target with linear color space, it outputs linear values (no sRGB conversion in the shader). When rendering to screen with `outputColorSpace = SRGBColorSpace`, it outputs sRGB.

Actually, I think the key is: the renderer checks the current render target's color space (or null for screen) to determine whether to include the linear→sRGB conversion in the shader. For render targets with linear/default color space, no conversion. For screen, conversion based on `outputColorSpace`.

So in our pipeline:
1. RenderPass → renders to linear render target → output is LINEAR ✓
2. OutputPass → reads linear, converts to sRGB, writes to next render target (which is also linear/NoColorSpace) → stores sRGB values in the texture ✓
3. My ShaderPass → reads the sRGB values (raw, no auto-conversion since texture is linear/NoColorSpace), inverts, renders to screen → outputs sRGB-inverted values to screen ✓

Wait, but if the render target has NoColorSpace/Linear, and OutputPass writes sRGB values to it, that's a bit of a semantic mismatch. The texture stores sRGB-encoded values but is tagged as linear. When my shader reads it with `texture2D()`, it gets the raw stored values (the sRGB-encoded floats). No automatic sRGB→linear conversion happens during texture fetch because the texture's colorSpace doesn't say sRGB. So I get sRGB values, invert them, and output to screen. ✓

Actually, I realize there might be an issue with how OutputPass works. Let me look at OutputPass more carefully.

OutputPass extends ShaderPass and uses a material with `colorSpace` handling. Its fragment shader includes the linear→sRGB conversion. The key question: does it set `renderToScreen` or write to a render target?

In EffectComposer.render(), for the second-to-last pass (OutputPass in my case since inversion is last), it renders to the write buffer. The material's shader has the colorspace conversion built in. So it takes linear input, outputs sRGB to the render target texture.

Then for my inversion pass (last pass), it has `renderToScreen = true`. It renders to screen (null render target). Its fragment shader just inverts the sampled texture values. Since it's rendering to screen, does the renderer apply any additional color space conversion? For a ShaderPass with a custom material, no - the custom fragment shader output goes directly. The `outputColorSpace` only affects built-in material shaders that include `<colorspace_fragment>`.

Great, so the pipeline works correctly.

Let me also make sure about the `renderer.outputColorSpace`. In newer Three.js (r152+), the default is `THREE.SRGBColorSpace`. I should keep it as default or explicitly set it. Actually, since OutputPass handles the conversion explicitly, and my custom ShaderPass bypasses the built-in conversion, I should set `renderer.outputColorSpace = THREE.SRGBColorSpace` to be explicit (though it's the default).

Actually, wait. If `renderer.outputColorSpace = THREE.SRGBColorSpace` and my ShaderPass renders to screen... does the renderer inject any color space conversion into the ShaderPass's material? Let me check ShaderPass source:

ShaderPass creates a `ShaderMaterial` with the provided shader. ShaderMaterial doesn't include `<colorspace_fragment>` automatically. So no, the renderer won't add sRGB conversion to my shader. ✓

OK, I'm confident the code is correct. Let me also handle the `toneMapping` - by default it's `NoToneMapping` which is fine.

Let me also make sure I'm not missing anything for the tsc --strict compilation:
- The ShaderPass `tDiffuse` uniform needs `value: null` initially (it gets set by the composer)
- I might need type assertions for the uniform value

Actually for TypeScript strict mode, `{ value: null }` should be fine for the uniform definition object. The `ShaderPass` constructor accepts a shader object with uniforms as `{ [key: string]: { value: any } }` or similar.

Let me finalize the code.
