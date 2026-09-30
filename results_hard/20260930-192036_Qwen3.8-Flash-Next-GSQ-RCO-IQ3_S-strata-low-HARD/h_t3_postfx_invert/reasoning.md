Let me think carefully about the color space issue here.

The requirement is:
- Background color is 0x336699 (sRGB value)
- On screen, it must appear as 0xcc9966 (the exact sRGB inverse)
- White sphere (0xffffff sRGB) must appear as black (0x000000)

The key challenge: Three.js uses linear color space internally for rendering. The `OutputPass` (or previously `GammaCorrectionShader`) does the linear -> sRGB conversion.

Let me think about the pipeline:

1. Scene background 0x336699 - Three.js interprets this as sRGB and converts it to linear for rendering in the framebuffer.
2. In linear space, the rendered color is NOT simply (1 - sRGB_linear), because sRGB encoding is non-linear.

Wait, let me reconsider. What does "exact inverse" mean here?

If the screen shows 0x336699 without the effect, then with the effect it should show 0xCC9966. That means: 0x33 + 0xCC = 0xFF, 0x66 + 0x99 = 0xFF, 0x99 + 0x66 = 0xFF. So the inversion is done in sRGB space.

So the inversion must happen AFTER the linear -> sRGB conversion, not before.

Pipeline options:
1. RenderPass → (linear colors) → OutputPass (linear → sRGB) → ShaderPass (invert in sRGB) — but OutputPass should be last...

Actually wait, let me re-read the requirement: "Use EffectComposer with a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass."

So the order is RenderPass → ShaderPass → OutputPass. But if the ShaderPass inverts in linear space, the result won't be the exact sRGB inverse because sRGB is non-linear.

For example: 0x33 in sRGB = 51/255 ≈ 0.2 in sRGB. The linear value of 0.2 sRGB is about 0.0331. Inverting in linear: 1 - 0.0331 = 0.9669. Converting back to sRGB: about 0.9834 → 250 in 8-bit, which is 0xFA. But we want 0xCC = 204/255 = 0.8.

So inverting in linear space does NOT give the sRGB inverse.

Therefore, the inversion must happen in sRGB space. This means we need to:
1. RenderPass (linear) → OutputPass (linear → sRGB) → ShaderPass (invert in sRGB)

But the user says the order should be RenderPass, ShaderPass, OutputPass. Let me re-read...

"Use EffectComposer from 'three/addons/postprocessing/EffectComposer.js' with a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass."

It doesn't necessarily dictate the order. It says "Think about where the linear -> sRGB conversion happens and order the passes (or convert in the shader) so this holds."

So the hint is to order them correctly. The correct order is:
1. RenderPass (renders scene in linear space)
2. OutputPass (converts linear → sRGB)
3. ShaderPass (inverts in sRGB space)

Wait, but OutputPass is typically the last pass... Let me check how EffectComposer works. The last pass renders to screen. Actually, in EffectComposer, any pass can render to screen - the last pass added that has `renderToScreen = true` will render to screen. By default, the last pass gets `renderToScreen = true`.

Actually, looking at the EffectComposer source, it sets `renderToScreen` on the last pass. So if we add RenderPass → OutputPass → ShaderPass, the ShaderPass will be the last one and will render to screen. That should work!

Wait, but there's another consideration. When the ShaderPass is the last pass (renderToScreen = true), it writes directly to the framebuffer. The framebuffer is in sRGB space (since the renderer has outputColorSpace = sRGB by default in newer Three.js). Actually, let me think more carefully...

In Three.js r152+, the default output color space is sRGB. When rendering to screen (directly to framebuffer), the renderer handles the color space conversion. But with EffectComposer, the intermediate render targets...

Let me think about this differently. In modern Three.js (r152+):

- `renderer.outputColorSpace = THREE.SRGBColorSpace` (default)
- When rendering directly to screen, the shader output is in linear space and the browser/GPU handles the conversion... Actually no, in Three.js with WebGL2, the conversion is done in the shader.

Actually, let me reconsider the whole pipeline with EffectComposer:

With EffectComposer:
- RenderPass renders to an internal render target (which is in linear space)
- Intermediate passes operate on linear color data
- The last pass (renderToScreen = true) writes to the screen framebuffer

The key question: does the last pass automatically get linear→sRGB conversion applied?

Looking at the Three.js source for EffectComposer and ShaderPass:
- ShaderPass with renderToScreen writes to the default framebuffer
- The renderer's `outputColorSpace` setting affects whether sRGB encoding is applied

Actually, in newer Three.js, when you render to a render target, the color space of that render target matters. The internal render targets of EffectComposer are in linear space. When the last pass renders to screen (renderToScreen=true), the ShaderPass fragment shader output goes directly to the framebuffer without any automatic conversion (since it's a raw shader pass, not a MeshBasicMaterial or similar).

So the OutputPass is needed to do the linear→sRGB conversion when writing to screen.

Now, the correct approach for sRGB-space inversion:

Option A: RenderPass → OutputPass → ShaderPass(invert in sRGB)
- RenderPass outputs linear
- OutputPass converts linear → sRGB, writes to next render target
- ShaderPass inverts in sRGB space, renders to screen

But wait, will OutputPass work if it's not the last pass? Let me check... OutputPass should work as an intermediate pass - it just applies the sRGB encoding to its output render target.

Actually, I recall that in recent Three.js, the render targets created by EffectComposer might have their colorSpace set. Let me think about what happens step by step:

1. RenderPass: renders scene to renderTarget1 (linear colors)
2. OutputPass: reads from renderTarget1, applies linear→sRGB, writes to renderTarget2
3. ShaderPass (invert): reads from renderTarget2 (sRGB values), inverts, writes to screen

The issue: does the ShaderPass writing to screen apply any additional color space conversion? Since it's a raw shader, I believe not - the fragment shader output goes directly to the framebuffer as-is.

So this should work! The inversion happens in sRGB space, giving us the exact sRGB complement.

Let me verify: 0x336699 is sRGB. Three.js interprets it as sRGB and converts to linear for rendering. OutputPass converts back to sRGB (so we get 0x336699 back). ShaderPass inverts: 0xFF-0x33=0xCC, 0xFF-0x66=0x99, 0xFF-0x99=0x66. Result: 0xCC9966. ✓

White (0xffffff sRGB) → linear → OutputPass back to sRGB (0xffffff) → invert → 0x000000 (black). ✓

Now let me write the code.

For the OutputPass import: `import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'`

Let me write the custom shader for the ShaderPass:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    color.rgb = 1.0 - color.rgb;
    gl_FragColor = color;
}
```

Now, one more consideration: the ShaderPass when it's the last pass renders to screen. Does the renderer apply any color space conversion to the framebuffer output from ShaderPass? 

Looking at ShaderPass source code - it renders a fullscreen quad with the shader. The material is a ShaderMaterial. When rendering with a ShaderMaterial directly to the framebuffer, Three.js doesn't apply color space encoding (that's only for specific materials like MeshStandardMaterial etc. through the built-in shader chunks). So the output is exactly what the shader produces.

Wait, actually I need to double-check this. In recent Three.js, I think there might be an automatic conversion even for ShaderMaterial when outputColorSpace is sRGB... Let me think...

Actually no. The `outputColorSpace` on the renderer affects how materials encode their output. For `ShaderMaterial`, Three.js does NOT automatically add sRGB encoding. The sRGB encoding is part of the `output_fragment` chunk which is included in built-in materials but not in custom ShaderMaterials.

So if I write `gl_FragColor = vec4(1.0 - color.rgb, color.a)` and the input is already in sRGB (because OutputPass put it there), the output will be the inverted sRGB values written directly to the framebuffer. 

But wait - there's another subtlety. When the framebuffer is an sRGB framebuffer (which it is in WebGL2 with sRGB color space enabled), writing values to it might apply gamma encoding automatically... No, actually in WebGL, the framebuffer values are just written as-is. The color space of the framebuffer affects how it's displayed on screen, but the values written are the final sRGB values that get displayed.

OK so my plan is correct. Let me code it up.

Actually, I want to double-check one more thing. The `OutputPass` - does it actually work as a non-final pass? Looking at the Three.js source for OutputPass:

```js
class OutputPass extends ShaderPass {
    constructor() {
        super({
            name: 'OutputPass',
            uniforms: { ... },
            vertexShader: ...,
            fragmentShader: ...
        });
        this.toneMapping = null;
    }
}
```

It's a ShaderPass subclass, so yes, it can work as any pass in the chain. It just applies tone mapping + color space conversion.

Let me also consider: do I need to set `renderer.toneMapping`? The user didn't mention tone mapping, so I'll leave it at default (NoToneMapping).

One more thought: the user says "No external assets". The OutputPass and EffectComposer are from the three.js addons, which are imported as modules - that's fine.

Let me also make sure about the import paths:
- `import * as THREE from 'three'`
- `import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'`
- `import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'`
- `import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'`
- `import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'`

Now let me write the complete file:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outputPass = new OutputPass();
composer.addPass(outputPass);

const invertShader = {
    name: 'InvertShader',
    uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            color.rgb = 1.0 - color.rgb;
            gl_FragColor = color;
        }
    `,
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Animation loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
    composer.render();
    if (firstFrame) {
        (window as any).__ready = true;
        firstFrame = false;
    }
});
```

Wait, I need to double-check that this compiles with `tsc --strict`. Let me check for potential issues:

1. `null as THREE.Texture | null` - this should be fine since ShaderPass expects uniforms to be `{ [key: string]: IUniform }` where IUniform has `value: any`.

Actually, looking at the ShaderPass type definition more carefully, it accepts `shader` as `{ uniforms: { [uniform: string]: IUniform }, vertexShader: string, fragmentShader: string }`. The `value` in IUniform is `any`, so `null` should be fine.

Let me also check if `new ShaderPass(invertShader)` type checks. Looking at the type definition:

```typescript
declare class ShaderPass extends Pass {
    constructor(shader: object, textureID?: string);
    textureID: string;
    uniforms: { [uniform: string]: IUniform };
    material: ShaderMaterial;
    fsQuad: FullScreenQuad;
}
```

It takes `shader: object`, so passing our shader object should be fine.

Actually wait, I realize I should double-check the `name` property in the shader object. It's just an object property so it shouldn't cause type issues.

Hmm, let me also think about whether `renderer.setPixelRatio(window.devicePixelRatio)` could cause issues. It shouldn't cause type errors.

One more thing - the `new THREE.Color(0x336699)` constructor accepts a number, which is the hex color. This is fine.

Let me also verify: in the animation loop, I'm using `renderer.setAnimationLoop` as required. The callback doesn't take any arguments in my code (I'm using elapsed time... actually I don't need time since there's no animation). That's fine.

Actually wait - the requirement says "Motion must use delta/elapsed time, not frame counts." But there's no motion in this scene - it's a static scene. So this requirement doesn't apply here. The loop just needs to keep rendering.

I think the code is correct. Let me finalize it.

Hmm, one more thought about the color space pipeline. Let me trace through exactly what happens:

1. `scene.background = new THREE.Color(0x336699)` - This color is in sRGB (as specified by the user). Three.js stores it internally. When rendering, since the scene's color space handling is involved, the background is rendered... 

Actually, let me think about this more carefully. In Three.js r152+:
- `THREE.Color` values are always in linear space internally.
- `new THREE.Color(0x336699)` - this constructor treats the hex as sRGB and converts to linear internally.

Wait, actually no. Let me check. In older Three.js, `new THREE.Color(0x336699)` just sets the r, g, b components to the hex values divided by 255, treating them as linear. In r152+, there's `color.setStyle()` for sRGB input, and the hex constructor... 

Actually, I believe in modern Three.js (r152+), the `THREE.Color` hex constructor just does:
```
r = ((hex >> 16) & 0xFF) / 255
g = ((hex >> 8) & 0xFF) / 255
b = (hex & 0xFF) / 255
```

These values are interpreted as linear-space values by the renderer.

Hmm, but then when rendering the background, it writes these values directly (or through the color space encoding). If the background material writes 0.2, 0.4, 0.6 (which is what 0x33/255, 0x66/255, 0x99/255 gives) and then OutputPass applies sRGB encoding... the output would NOT be 0x336699 anymore because sRGB encoding is non-linear.

Wait, this is getting complicated. Let me re-think.

Actually, in Three.js, `scene.background` when set to a Color: the background is rendered by a special internal material. Let me look at how this works...

In the WebGLBackground module, when the background is a Color, it sets `gl.clearColor(color.r, color.g, color.b)`. The values written to gl.clearColor are the raw Color values.

Now, if the renderer's outputColorSpace is sRGB (default in r152+), does the framebuffer's sRGB encoding affect what `gl.clearColor` does? 

In WebGL2, if you have an sRGB framebuffer (using `gl.COLOR_ENCODING` or the color attachment format), values written to it are expected to be in sRGB space. The `gl.clearColor` values are the values that get written directly to the framebuffer.

So if Color stores 0x33/255 = 0.2 as-is, and writes 0.2 to the sRGB framebuffer, the pixel on screen will show sRGB value 0.2 → which displays as... well, the framebuffer stores 0.2, and when displayed on a sRGB monitor, it shows as the sRGB value 0.2 which corresponds to approximately 0x33 in 8-bit. So yes, the background WILL appear as 0x336699 on screen.

But wait - this is when rendering DIRECTLY to screen (no post-processing). With EffectComposer, the situation is different because we're rendering to intermediate render targets first.

With EffectComposer:
1. RenderPass renders to an internal render target. What color space is this render target? By default, EffectComposer creates render targets with `THREE.LinearSRGBColorSpace` (or rather, no special color space - just regular RGBA float/byte textures). The Color values (0.2, 0.4, 0.6) get written directly.

2. Actually wait - when rendering to a render target in Three.js, if the render target's texture doesn't have sRGB encoding, the values are written as-is. So the internal render target will contain (0.2, 0.4, 0.6) for the background.

3. OutputPass: This reads from the internal render target and applies sRGB encoding (linearToSRGB). If the input is (0.2, 0.4, 0.6) (which were meant as sRGB values but we're treating as linear and encoding again), we'd get wrong results!

Hmm, this is the crux of the issue. Let me think about this differently.

In Three.js r152+:
- `THREE.Color(0x336699)` stores (0.2, 0.4, 0.6) in the Color object
- When rendering to a render target (via RenderPass), these values are written to the render target
- The render target is in linear space (no sRGB encoding)
- OutputPass reads these linear values and applies sRGB encoding: sRGBEncode(0.2) ≈ 0.485, sRGBEncode(0.4) ≈ 0.667, sRGBEncode(0.6) ≈ 0.798
- This would produce a DIFFERENT color on screen than 0x336699!

But wait, that contradicts what the user says - they say the background should appear as 0x336699 without the effect. Let me reconsider...

Actually, I think I'm wrong about how `scene.background` works with post-processing. Let me look more carefully.

In Three.js r152+, when you set `scene.background = new THREE.Color(0x336699)`:
- The color values are stored as-is (0.2, 0.4, 0.6)
- When rendering to screen directly, the `setClear` function sets these values, and with the sRGB framebuffer, they get encoded... actually no.

Let me look at the actual code path for rendering background in Three.js r152+:

In `WebGLBackground.js`:
```js
function setClear( renderer, activeCubeTexture, color, forceClear ) {
    ...
    renderer.setClearColor( color, forceClear );
    ...
}
```

And `setClearColor` eventually calls:
```js
function setClearColor( color, alpha = 1 ) {
    _currentClearColor.set( color );
    _currentClearAlpha = alpha;
}
```

Then when `clear()` is called, it does `gl.clearColor(color.r, color.g, color.b, alpha)`.

Now, the key question: in the WebGL context, is the framebuffer sRGB-encoded?

In Three.js r152+, when `renderer.outputColorSpace === THREE.SRGBColorSpace`, the WebGL context's default framebuffer is NOT sRGB-encoded (because that's a property of the framebuffer, not something Three.js controls directly for the default framebuffer). Instead, Three.js handles the color space conversion in the fragment shader (appending `#include <colorspace_fragment>` which does `gl_FragColor = linearToOutputTexel(gl_FragColor)`).

BUT - for the background clear color, there's no fragment shader involved. The clear color values go directly to the framebuffer. So if the framebuffer is in linear space (no sRGB encoding at the hardware level), and we clear with (0.2, 0.4, 0.6), the screen will show these as linear values, which means the actual displayed color is the sRGB-encoded version of 0.2, 0.4, 0.6... 

Wait no. The screen displays whatever is in the framebuffer. If the framebuffer has value 0.2, the monitor interprets that as an sRGB value (0.2) and displays it. The monitor always interprets framebuffer values as sRGB (on a standard sRGB monitor).

So if we write 0.2 to the framebuffer (with no encoding), the screen shows sRGB 0.2 which is hex 0x33. So the background DOES appear as 0x336699 on screen!

And when using EffectComposer with RenderPass → OutputPass → screen:
1. RenderPass writes (0.2, 0.4, 0.6) to internal render target (linear interpretation, but actually these are sRGB values that happen to be stored in a "linear" render target)
2. OutputPass reads (0.2, 0.4, 0.6), applies sRGB encoding: `pow(0.2, 1/2.2)` etc... This would give WRONG results!

Hmm, but in practice, does this actually happen? Let me check if there's special handling for the background in the RenderPass...

Actually, I think the key insight is this: in modern Three.js, when you render a scene, the materials do linear→sRGB conversion in their fragment shaders (via the `colorspace_fragment` include). The background clear color is an exception - it bypasses the fragment shader.

Looking at the Three.js source more carefully for r152+:

In `WebGLBackground.js`, when rendering the background to a render target (not screen), it uses a different approach - it creates a mesh with a special material that includes the colorspace conversion. Let me check...

Actually, I recall that in newer versions of Three.js, the background rendering was updated to handle color spaces properly. The `setClear` path might only be used when rendering directly to screen. When rendering to a render target, it uses a mesh.

Hmm, let me look at this from a different angle. Let me just test what actually happens in practice.

Actually, you know what, let me re-read the Three.js source for WebGLBackground more carefully.

Looking at `WebGLBackground.render()`:
```js
render( renderList ) {
    const { currentRenderTarget } = renderer.properties;
    const background = scene.isScene === true ? scene.background : null;
    ...
    if ( background ) {
        if ( background.isColor ) {
            setClear( renderer, false, background, true );
            ...
        }
    }
}
```

It always uses `setClear` regardless of whether rendering to screen or render target. So the background color values (0.2, 0.4, 0.6) are written directly to whatever buffer is being rendered to.

Now, in Three.js r152+, when rendering with `outputColorSpace = SRGBColorSpace`, materials add sRGB encoding to their fragment shader output. But the background clear color doesn't go through a fragment shader - it's a clear operation.

So with the RenderPass → OutputPass pipeline:
- Background clear writes (0.2, 0.4, 0.6) to render target (these are the "raw" values from the Color object)
- OutputPass applies linear→sRGB to get (sRGBencode(0.2), ...) and writes to screen
- Screen shows the sRGB-encoded version, which is NOT 0x336699

This means the user's stated expectation ("background 0x336699 must appear on screen as 0xcc9966") might not be achievable with a simple invert after OutputPass, because the background rendering path doesn't go through the standard encoding pipeline.

Wait, but actually I think there's been a fix for this. Let me check if newer Three.js versions handle the background color correctly in post-processing...

Hmm, actually I think the issue might be simpler than I'm making it. Let me reconsider.

In Three.js r152+, I believe the internal render targets used by EffectComposer are configured with the appropriate color space. Let me check the EffectComposer constructor:

```js
constructor( renderer, renderTarget ) {
    ...
    if ( renderTarget === undefined ) {
        const size = renderer.getSize( new THREE.Vector2() );
        this._pixelRatio = renderer.getPixelRatio();
        this._width = size.width;
        this._height = size.height;

        renderTarget = new THREE.WebGLRenderTarget( this._width * this._pixelRatio, this._height * this._pixelRatio, { type: THREE.HalfFloatType } );
        this.renderTarget1 = renderTarget;
        this.renderTarget2 = renderTarget.clone();
        ...
    }
}
```

The render targets don't have any special color space setting. They're just regular render targets.

OK so I think the situation is:

Without EffectComposer (direct rendering):
- Background clear: writes (0.2, 0.4, 0.6) to screen framebuffer
- Screen displays sRGB(0.2, 0.4, 0.6) → shows hex 0x336699 (because 0.2*255=51=0x33)
- MeshBasicMaterial with color 0xffffff: the fragment shader outputs (1,1,1), then the colorspace_fragment adds sRGB encoding: pow(1, 1/2.2) = 1. So white appears as white.

Wait, that's interesting. The background shows the raw Color values as-is on screen, while materials apply sRGB encoding. So there IS a discrepancy.

Actually wait - for MeshBasicMaterial, the color is also stored as (1,1,1) for 0xffffff. The fragment shader would:
1. Get color from uniform (which is 1,1,1 in linear... wait, actually for MeshBasicMaterial, I think the color is used directly without color space conversion in the fragment shader? No, the colorspace_fragment chunk IS included.)

Hmm, let me look at MeshBasicMaterial's fragment shader. It includes `#include <colorspace_fragment>`. So the output goes through linearToSRGB. If the input color is (1,1,1) (linear), output is (1,1,1) (sRGB) - same thing since 1^anything = 1.

For the background clear (0.2, 0.4, 0.6): no encoding is applied. The framebuffer gets (0.2, 0.4, 0.6). The screen interprets these as sRGB values. So the displayed color corresponds to sRGB 0.2, 0.4, 0.6 → hex 0x33, 0x66, 0x99 → 0x336699. ✓

For a MeshBasicMaterial with color 0x336699 (if we used one instead of clear): the Color stores (0.2, 0.4, 0.6). The fragment shader includes colorspace_fragment which does sRGB encoding: pow(0.2, 1/2.2) ≈ 0.485. The framebuffer gets (0.485, ...). The screen displays this as sRGB 0.485 → hex 0x7C ≈ 124. So the displayed color would be 0x7CA8D8, NOT 0x336699!

So there's a fundamental inconsistency in Three.js: the background Color is displayed as-is (sRGB values), while material colors get double-encoded.

This is actually a known issue/behavior in Three.js. The hex values for `scene.background` are effectively treated as sRGB (displayed directly), while material colors are treated as linear (and then encoded to sRGB for display).

So with direct rendering, the background 0x336699 appears as 0x336699 on screen. Good, that matches the user's expectation.

Now with EffectComposer:
1. RenderPass: background clear writes (0.2, 0.4, 0.6) to render target
2. If we then just write this to screen without any encoding, the screen shows 0x336699 (same as direct)
3. If we apply OutputPass (which adds sRGB encoding), we get sRGBencode(0.2) ≈ 0.485 → wrong!

So OutputPass would actually BREAK the background color! The OutputPass assumes the input is in linear space and converts to sRGB, but the background values were already sRGB (not linear).

Hmm, but wait. The user says we should use OutputPass. Let me re-read the requirement...

"Use EffectComposer from 'three/addons/postprocessing/EffectComposer.js' with a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass."

"Think about where the linear -> sRGB conversion happens and order the passes (or convert in the shader) so this holds."

I think the user is aware of the complexity and is testing whether we can get it right. Let me think about what the "correct" answer is.

Actually, you know what, let me reconsider. In Three.js r155+ (or some recent version), I think there was a fix where `scene.background` handling was updated. Let me think about whether the behavior I described above is still accurate for the latest Three.js...

Actually, I recall that in more recent versions of Three.js (r157+?), the background rendering for Color was changed to use a mesh (with a special material that handles color space correctly) rather than gl.clearColor. Let me think...

No wait, I think it still uses clearColor. But there might be a workaround: when `outputColorSpace = SRGBColorSpace`, the renderer might set the clear color after applying linearToSRGB... Let me check.

Actually, I found it! In recent Three.js versions, there's this in the background handling:

```js
function setClear( renderer, activeCubeTexture, color, forceClear ) {
    if ( _clearColor !== color || ... ) {
        ...
        renderer.setClearColor( color );
    }
}
```

And `renderer.setClearColor` just stores the color. Then when `renderer.clear()` is called, it uses these values. The values are NOT color-space converted for the clear path.

OK so I'm fairly confident that in current Three.js, the background Color is written directly to the framebuffer without any color space conversion. This means:
- With direct rendering: screen shows the hex value as-is (0x336699)
- With EffectComposer + OutputPass: OutputPass would incorrectly apply sRGB encoding to the already-sRGB values

Hmm, but the user explicitly says to use OutputPass and to get the correct result. Let me think about whether there's a way to make this work...

Option 1: Don't use OutputPass, just RenderPass → ShaderPass(invert). This would work for the background (0.2 → 0.8 = 0xCC ✓) but might not work for the sphere (since the sphere's material DOES go through sRGB encoding).

Wait, let me trace the sphere with just RenderPass → ShaderPass:
- MeshBasicMaterial color 0xffffff: fragment shader outputs (1,1,1), then colorspace_fragment applies sRGB encoding: (1,1,1) (since 1^anything = 1)
- So render target gets (1,1,1) for the sphere
- ShaderPass inverts: (0,0,0)
- Written to screen: black ✓

And for background:
- Clear color: (0.2, 0.4, 0.6)
- ShaderPass inverts: (0.8, 0.6, 0.4)
- Written to screen: 0xCC9966 ✓

So RenderPass → ShaderPass (invert) WITHOUT OutputPass gives the correct result!

But the user says to use OutputPass... 

Option 2: RenderPass → OutputPass → ShaderPass(invert)
- Background clear: (0.2, 0.4, 0.6) in render target
- OutputPass applies sRGB encoding: (0.485, 0.7, 0.8) approximately
- ShaderPass inverts: (0.515, 0.3, 0.2)
- Written to screen: approximately 0x834C33... NOT 0xCC9966 ✗

This doesn't work.

Option 3: What if the OutputPass detects that the render target is already sRGB and doesn't apply encoding? No, that's not how it works.

Hmm, let me reconsider. Maybe I'm wrong about the background color handling. Let me look at this from the user's perspective - they say it should work, so maybe I'm missing something.

Actually, wait. Let me re-read the user's requirement: "the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect."

Without the effect (direct rendering), the screen shows 0x336699 for background and 0xffffff for sphere.

With the effect, it should show 0xCC9966 for background and 0x000000 for sphere.

So the question is: what pipeline achieves this?

If we just do RenderPass → ShaderPass(invert):
- Background: (0.2, 0.4, 0.6) → invert → (0.8, 0.6, 0.4) → screen shows 0xCC9966 ✓
- Sphere: the material outputs (1,1,1) after sRGB encoding → (1,1,1) in render target → invert → (0,0,0) → black ✓

This works! But it doesn't use OutputPass.

Hmm, but what if the user wants OutputPass to be used? Maybe the idea is:
- RenderPass → ShaderPass(invert) → OutputPass

Let's trace:
- Background: (0.2, 0.4, 0.6) in render target
- ShaderPass inverts: (0.8, 0.6, 0.4) in next render target
- OutputPass applies sRGB encoding: pow(0.8, 1/2.2) ≈ 0.9, pow(0.6, 1/2.2) ≈ 0.8... → WRONG, doesn't give 0xCC9966

Or maybe we do the inversion in linear space and then let OutputPass do the sRGB encoding? Let's check:
- Background: (0.2, 0.4, 0.6) (these are treated as "linear" by the pipeline)
- ShaderPass inverts in "linear": (0.8, 0.6, 0.4)
- OutputPass sRGB-encodes: pow(0.8, 1/2.2) ≈ 0.91, pow(0.6, 1/2.2) ≈ 0.82, pow(0.4, 1/2.2) ≈ 0.66
- Screen shows: 0xE9, 0xD1, 0xA8... NOT 0xCC9966 ✗

Hmm. None of the Orderings with OutputPass give the correct answer for the background, because the background bypasses the color space pipeline.

OK wait, let me reconsider the whole thing. Maybe in the latest Three.js (r160+?), the background IS handled correctly in post-processing. Let me think about what happens if Three.js properly encodes the clear color...

Actually, I just realized something. In newer Three.js versions (I believe r155+), when rendering to a render target, the background might be rendered differently. Let me check if there's a `colorspace` property on render targets that affects this.

In Three.js, `WebGLRenderTarget` has no colorSpace property on its texture (well, textures have colorSpace but render targets don't use it for the attachment encoding in the same way).

You know what, I think the practical answer is: the user expects us to use RenderPass → OutputPass → ShaderPass(invert), and in practice with the latest Three.js, this DOES give the correct result because Three.js properly handles the color spaces in the render pipeline (including the background).

Actually, let me reconsider. Maybe I was wrong about the background. Let me look at this from a more recent Three.js perspective.

In Three.js r152+, when you render a scene to a render target (not the screen):
- For the background color, it uses `renderer.setClearColor()` and `renderer.clear()`
- The render target has no sRGB encoding (it's a regular texture)
- The values written are the raw Color values (0.2, 0.4, 0.6)

Then when OutputPass reads from this render target and writes to screen:
- OutputPass applies linearToSRGB encoding
- (0.2, 0.4, 0.6) → sRGB encoded → NOT (0.2, 0.4, 0.6)

So OutputPass BREAKS the background.

BUT - what if Three.js is smart enough to NOT include the colorspace_fragment for the background when rendering to a linear render target? Let me think...

The background clear is just `gl.clearColor()` + `gl.clear()`. There's no shader involved. So no, Three.js doesn't add any encoding.

I think the user might be testing a slightly idealized scenario, or they might be using a version of Three.js where this is handled differently, or they might not be aware of this subtlety.

Alternatively, maybe the user is right and the correct answer IS: RenderPass → ShaderPass(invert) → OutputPass, and the shader does the inversion in linear space, and somehow it works out?

Let's check: if the background is (0.2, 0.4, 0.6) in the render target (raw values, treated as "linear" by the pipeline), and we invert in the shader: (0.8, 0.6, 0.4). Then OutputPass applies sRGB encoding: (0.8^(1/2.2), 0.6^(1/2.2), 0.4^(1/2.2)) ≈ (0.91, 0.81, 0.66). On screen: 0xE9, 0xCF, 0xA8. NOT 0xCC9966.

OK so that definitely doesn't work either.

Let me try: RenderPass → ShaderPass(invert) without OutputPass:
- Background: (0.2, 0.4, 0.6) → (0.8, 0.6, 0.4) → screen shows these values as sRGB → 0xCC9966 ✓
- Sphere: (1,1,1) (after material's sRGB encoding) → (0,0,0) → black ✓

This works! But doesn't use OutputPass.

Hmm, but what if we DON'T use OutputPass and the sphere's MeshBasicMaterial applies sRGB encoding in its fragment shader? Then the sphere's color in the render target is sRGB-encoded (1,1,1) which is still (1,1,1). Inverting gives (0,0,0). That's correct.

But what if the sphere had color 0x336699? Then:
- Material color stored as (0.2, 0.4, 0.6)
- Fragment shader: output = (0.2, 0.4, 0.6), then colorspace_fragment: sRGB_encode(0.2, 0.4, 0.6) ≈ (0.485, 0.699, 0.798)
- Render target: (0.485, 0.699, 0.798)
- ShaderPass inverts: (0.515, 0.301, 0.202)
- Screen shows: 0x83, 0x4D, 0x33

Without the effect:
- Material: (0.485, 0.699, 0.798) on screen → 0x7C, 0xB2, 0xCB

Inverse of 0x7CB2CB would be 0x834D34... which is close to 0x834D33! (Rounding differences)

Wait, actually: 0xFF - 0x7C = 0x83, 0xFF - 0xB2 = 0x4D, 0xFF - 0xCB = 0x34. And we got (0.515, 0.301, 0.202) → 0.515*255 = 131.3 → 0x83, 0.301*255 = 76.8 → 0x4D, 0.202*255 = 51.5 → 0x33. Close enough (rounding).

Hmm, so inverting AFTER sRGB encoding in the render target DOES give the sRGB inverse. Because:
- Without effect: screen shows sRGB(value) → pixel value is sRGB(value)
- With invert pass: screen shows 1 - sRGB(value)
- 1 - sRGB(value) IS the sRGB inverse of what's shown

Yes! This is correct. The inversion in the render target (which contains sRGB-encoded values from materials) gives the sRGB inverse. And for the background, the clear color values are written directly (already sRGB values), so inverting them also gives the sRGB inverse.

So the simple pipeline RenderPass → ShaderPass(invert) works for BOTH the background and materials! Because both paths end up with sRGB values in the render target:
- Background: clear color writes sRGB values directly
- Materials: fragment shader includes colorspace_fragment which writes sRGB values

So the render target contains sRGB values, and inverting sRGB values gives the sRGB inverse.

But the user insists on using OutputPass. If we add OutputPass AFTER the invert, it would incorrectly apply sRGB encoding to values that are already sRGB. If we add it BEFORE, it would also break things.

Unless... we do NOT include the OutputPass in the pass chain but still create it (just to satisfy the "use OutputPass" requirement). But that seems hacky.

Wait, actually, let me re-read the user's requirement one more time:

"Use EffectComposer from 'three/addons/postprocessing/EffectComposer.js' with a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass."

"Think about where the linear -> sRGB conversion happens and order the passes (or convert in the shader) so this holds."

The hint "Think about where the linear -> sRGB conversion happens and order the passes (or convert in the shader) so this holds" suggests that we need to carefully consider the ordering. The "(or convert in the shader)" suggests we might need to handle the color space in the shader itself.

I think the intended solution might be:

RenderPass → OutputPass → ShaderPass(invert)

The idea being:
- RenderPass renders in linear space to render target
- OutputPass converts to sRGB in the next render target  
- ShaderPass inverts in sRGB space and renders to screen

For this to work correctly with the background, we need the background to be rendered in linear space. But as I analyzed, the background clear writes the raw Color values (which are NOT linear - they're the sRGB hex values divided by 255).

UNLESS Three.js recently changed how `scene.background` works. Let me check if in newer versions, the Color is converted to linear before being used as clear color...

Actually, you know what, I just realized: `new THREE.Color(0x336699)` in Three.js does NOT do any color space conversion. It just does:
```
r = 0x33/255 = 0.2
g = 0x66/255 = 0.4  
b = 0x99/255 = 0.6
```

These are stored as-is. The Color class doesn't know about color spaces. The interpretation depends on context.

When rendering materials: the color is used in the shader, and then colorspace_fragment applies sRGB encoding. So the final output on screen is sRGB(0.2, 0.4, 0.6).

When rendering background: the color values are used directly as clear color. So the final output on screen is (0.2, 0.4, 0.6) directly (interpreted as sRGB by the display).

These are DIFFERENT! The background with color 0x336699 shows as 0x336699 on screen, while a material with color 0x336699 would show as a lighter color (0x7CA8D8 approximately).

This is a known inconsistency/bug in Three.js. The `scene.background` Color is effectively treated as sRGB (displayed as-is), while material colors are treated as linear (sRGB encoded for display).

OK, so given this inconsistency, let me think about what the user REALLY wants and what actually works:

The user wants:
- Background 0x336699 to show as 0xCC9966 on screen with the effect
- White sphere to show as black

With direct rendering (no post-processing):
- Background shows as 0x336699 (clear color writes values directly to framebuffer)
- White sphere (0xffffff) shows as 0xffffff (sRGB encode of 1 is 1)

The "inverse of what the screen would show without the effect":
- Inverse of 0x336699 = 0xCC9966 ✓
- Inverse of 0xffffff = 0x000000 ✓

Now, what pipeline gives this?

The render target after RenderPass contains:
- Background: (0.2, 0.4, 0.6) [clear color, treated as sRGB by display]
- Sphere: (1, 1, 1) [material with sRGB encoding in shader, but 1→1]

Both are effectively sRGB values in the render target (because the background bypasses encoding, and the sphere's sRGB encoding of 1 is still 1).

If we invert in this space: (0.8, 0.6, 0.4) and (0, 0, 0). Writing to screen: 0xCC9966 and black. ✓

So RenderPass → ShaderPass(invert) gives the correct answer WITHOUT OutputPass.

But what about a non-white sphere? Say color 0x808080:
- Material color: (0.502, 0.502, 0.502)
- sRGB encode: (0.735, 0.735, 0.735) in render target
- Invert: (0.265, 0.265, 0.265) → 0x43 on screen
- Without effect: sRGB encode(0.502) ≈ 0.735 → 0xBC on screen
- Inverse of 0xBC = 0x43 ✓

OK so it works for all materials because they all go through sRGB encoding, putting sRGB values in the render target.

And for the background, the values are already "sRGB" (the hex values / 255), so they're also in the right space for inversion.

So the answer is: DON'T use OutputPass (or use it in a way that doesn't break things).

But the user says to use OutputPass! 

Hmm, maybe the solution is to NOT actually add OutputPass to the composer chain, but still import/create it? No, that's silly.

Wait, maybe I should reconsider. What if we use:

RenderPass → ShaderPass(invert) → OutputPass

In this case:
- RenderPass: background (0.2, 0.4, 0.6), sphere (1,1,1) in render target
- ShaderPass inverts: (0.8, 0.6, 0.4) and (0,0,0) in next render target
- OutputPass applies sRGB encoding: sRGB_encode(0.8, 0.6, 0.4) ≈ (0.908, 0.798, 0.648) → NOT correct

That doesn't work.

What about doing the inverse in the shader but compensating for the OutputPass's encoding?

In the shader: instead of just `1.0 - rgb`, do `1.0 - linearToSRGB(rgb)`? But we don't have the original linear values...

Actually, wait. What if we do:

RenderPass → ShaderPass(invert with color space awareness) → OutputPass

In the ShaderPass, we'd need to:
1. Apply inverse sRGB (linearToSRGB inverse) to get back to "linear"
2. Invert
3. Let OutputPass do the sRGB encoding

So: output = 1.0 - sRGBEncode(input_linear)?

Hmm, that's getting circular. Let me think differently.

We want the final screen output to be 1 - sRGB(screen_without_effect).

Without effect: screen = sRGB_encode(linear_render_target_values) for materials, and clear_color for background.

With effect: screen should be 1 - that.

If we use RenderPass → invert → OutputPass:
- After invert: (1 - original_rt_values) in render target
- After OutputPass: sRGB_encode(1 - original_rt_values) on screen

We want: 1 - screen_without_effect = 1 - original_rt_values (since original_rt_values are already sRGB-encoded for materials, and raw values for background).

But OutputPass gives: sRGB_encode(1 - original_rt_values).

These are NOT the same. So RenderPass → invert → OutputPass doesn't work.

If we use RenderPass → OutputPass → invert:
- After OutputPass: sRGB_encode(original_rt_values) in next render target
  - For background: sRGB_encode(0.2, 0.4, 0.6) ≈ (0.485, 0.699, 0.798) — WRONG, should be (0.2, 0.4, 0.6)
  - For sphere: sRGB_encode(1, 1, 1) = (1, 1, 1) — OK (same)

This breaks the background.

I'm stuck. The fundamental issue is the Three.js background inconsistency.

Let me just go with the pragmatic solution: RenderPass → OutputPass → ShaderPass(invert). In practice, for the specific case the user describes (background 0x336699 and white sphere), let's see what actually happens:

Wait, actually, I want to verify my assumption. Let me re-check whether the background clear color really writes raw values to the render target, or if Three.js does something special.

Actually, I just recalled something. In very recent Three.js (r160+?), I think there was a change where the scene background Color's color space handling was updated. The `THREE.Color` might now use `setHex` with colorSpace parameter...

In Three.js r152+:
```js
class Color {
    setHex( hex, colorSpace = SRGBColorSpace ) {
        ...
        ColorManagement.toWorkingColorSpace( this, colorSpace );
    }
}
```

YES! The constructor `new THREE.Color(0x336699)` calls `setHex(0x336699)` which defaults to `SRGBColorSpace` and calls `ColorManagement.toWorkingColorSpace(this, SRGBColorSpace)`. This converts the sRGB values to linear!

So `new THREE.Color(0x336699)` actually stores LINEAR values internally:
- r = sRGBToLinear(0.2) ≈ 0.0331
- g = sRGBToLinear(0.4) ≈ 0.1329
- b = sRGBToLinear(0.6) ≈ 0.3185

And when this is used as background clear color, it writes these LINEAR values to the render target.

Then when OutputPass reads these linear values and applies sRGB encoding:
- sRGB_encode(0.0331) ≈ 0.2 = 0x33 ✓
- sRGB_encode(0.1329) ≈ 0.4 = 0x66 ✓
- sRGB_encode(0.3185) ≈ 0.6 = 0x99 ✓

So OutputPass gives back the correct sRGB values! The pipeline RenderPass → OutputPass → ShaderPass(invert) WORKS!

Let me verify for the sphere:
- `new THREE.MeshBasicMaterial({ color: 0xffffff })`: Color stores (1, 1, 1) in linear (since linearToLinear(1) = 1)
- Fragment shader: output color = (1,1,1), then colorspace_fragment applies sRGB encoding: (1,1,1) → (1,1,1)
- Render target: (1,1,1)

Hmm wait, but with my updated understanding, the material's color IS in linear space. The fragment shader outputs the linear color. Then `colorspace_fragment` in the material's shader converts to sRGB. So the render target gets sRGB values (1,1,1).

But wait, when rendering to a render target (not screen), does the colorspace_fragment still apply sRGB encoding? It should, because the material shader always includes it. The target render target's texture color space might affect this...

Actually, in Three.js r152+, the `colorspace_fragment` chunk uses the output color space of the current render target. If rendering to a render target with no sRGB encoding, it should output linear values! Let me check...

The `colorspace_fragment` chunk:
```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```

And `linearToOutputTexel` is defined based on the render target's color space. If the render target's texture has no color space set (or linear), then `linearToOutputTexel` is a no-op (just identity).

Wait, no. Let me look at the actual Three.js source. In `WebGLProgram.js`, the defines include:
```js
if ( parameters.outputColorSpace === SRGBColorSpace ) {
    defines.push( 'SRGB_TRANSFER_OUTPUT' );
}
```

And this is based on the RENDER TARGET's color space, not the renderer's outputColorSpace, when rendering to a render target.

Actually, looking at `WebGLPrograms.getParameters()`:
```js
const currentRenderTarget = renderer.getRenderTarget();
...
outputColorSpace: currentRenderTarget ? currentRenderTarget.texture.colorSpace : renderer.outputColorSpace,
```

YES! When rendering to a render target, the `outputColorSpace` used is the render target's texture colorSpace! If the render target's texture has `colorSpace = THREE.LinearSRGBColorSpace` (the default), then the shader outputs LINEAR values.

So with EffectComposer:
- RenderPass renders to an internal render target with linear color space
- Materials output LINEAR values (no sRGB encoding in shader)
- Background clear color: THREE.Color values are linear (as established above)
- Both the background and materials are in LINEAR space in the render target

Then OutputPass:
- Reads linear values from render target
- Applies sRGB encoding (since it's outputting to screen or to a sRGB context)
- Writes sRGB values

Then ShaderPass(invert):
- Reads sRGB values
- Inverts: 1 - sRGB(value) = sRGB inverse
- Writes to screen

This is CORRECT! The full pipeline RenderPass → OutputPass → ShaderPass(invert) gives the correct result!

Let me verify:
- Background: Color(0x336699) → linear (0.0331, 0.1329, 0.3185) in render target → OutputPass sRGB encodes → (0.2, 0.4, 0.6) → ShaderPass inverts → (0.8, 0.6, 0.4) → screen shows 0xCC9966 ✓
- White sphere: Color(0xffffff) → linear (1, 1, 1) in render target → OutputPass sRGB encodes → (1, 1, 1) → ShaderPass inverts → (0, 0, 0) → screen shows black ✓

The key insight I was missing: in Three.js r152+, Color hex values are converted to linear internally, AND when rendering to a linear render target, the material shaders output linear values (no sRGB encoding). This makes everything consistent!

So the correct order is: RenderPass → OutputPass → ShaderPass(invert)

And the last pass (ShaderPass) has renderToScreen = true (automatically set by EffectComposer for the last pass), so it writes directly to the screen framebuffer. Since it's a ShaderMaterial, no additional color space conversion is applied. The values it writes ARE the final sRGB values displayed on screen.

Let me now write the final code.

Actually wait, one more thing. When the last pass (ShaderPass) writes to screen, does Three.js add any color space conversion? For ShaderMaterial used by ShaderPass, the `colorspace_fragment` chunk is NOT included (it's a custom shader). So no automatic conversion. The values written are final. ✓

Also, I should double-check: does the ShaderPass with `renderToScreen = true` render to the default framebuffer? Looking at ShaderPass source:
```js
render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
    ...
    if ( this.renderToScreen ) {
        renderer.setRenderTarget( null );
        this.fsQuad.render( renderer );
    } else {
        renderer.setRenderTarget( writeBuffer );
        ...
    }
}
```

Yes, it renders to null (default framebuffer). And since it's a ShaderMaterial, no color space conversion is added. The output values go directly to the framebuffer. ✓

Now I'm confident. Let me write the final code.

One more consideration: the user said "Expose for testing: (window as any).__composer = composer". So I need to expose the composer too.

Let me write the final, clean code:
