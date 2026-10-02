The user wants a post-processing color-inversion effect with correct color space handling.

Let me think through this carefully:

1. **Scene setup**: Background color 0x336699, white sphere at origin, camera at (0,0,4).

2. **The key challenge**: Getting the inversion to produce the "correct" result on screen.

Let me think about how Three.js color space works with EffectComposer:

- When you set `scene.background = new THREE.Color(0x336699)`, Three.js stores this as linear color values (it converts from sRGB to linear internally in newer versions, or actually... let me think more carefully).

Actually, in Three.js r152+, colors are handled as follows:
- `new THREE.Color(0x336699)` creates a color with sRGB values (0x33/255, 0x66/255, 0x99/255) = (0.2, 0.4, 0.6)
- When rendering to the screen with `renderer.render()`, the final output is converted from linear to sRGB (the OutputPass or the built-in color space conversion handles this).

Wait, let me reconsider. In Three.js:
- `new THREE.Color(0x336699)` - the Color constructor with a hex value stores the values as-is (they're the sRGB components). So `color.r = 0x33/255 ≈ 0.2`, `color.g = 0x66/255 ≈ 0.4`, `color.b = 0x99/255 ≈ 0.6`.
- But when the renderer outputs to screen, it applies the output color space transformation (linear -> sRGB) if `renderer.outputColorSpace = THREE.SRGBColorSpace` (which is the default).

Wait, actually I need to be more precise. In Three.js:
- `THREE.Color` with hex: The values stored are the raw sRGB values (0-1 range).
- The renderer's output color space conversion: If `renderer.outputColorSpace` is `SRGBColorSpace`, the renderer applies a linear-to-sRGB conversion at the end.

But wait - `MeshBasicMaterial` with color 0xffffff: the color is (1,1,1) in both linear and sRGB space, so it doesn't matter.

For the background 0x336699:
- The Color stores (0.2, 0.4, 0.6) - these are sRGB values.
- When rendered without post-processing, the renderer applies the linear-to-sRGB output transform. But wait - are the stored values already sRGB or linear?

Let me look at this more carefully. In Three.js source:
- `new THREE.Color(0x336699)` calls `setHex(0x336699)` which sets `r = 0x33/255`, `g = 0x66/255`, `b = 0x99/255`. These are the **sRGB** values.
- The renderer's shader for a basic material will use these values directly (MeshBasicMaterial doesn't do any color space conversion on the input color).
- At the end of the rendering pipeline (when outputting to screen), the renderer applies `linearToOutputTexel` which converts from linear to the output color space (sRGB by default).

So without post-processing, the background would appear as:
- Input to fragment shader: (0.2, 0.4, 0.6) - these are sRGB values but treated as "linear" in the shader
- Output transform: linearToSRGB(0.2), linearToSRGB(0.4), linearToSRGB(0.6)
- linearToSRGB(x) = x <= 0.0031308 ? 12.92*x : 1.055*x^(1/2.4) - 0.055
- So: linearToSRGB(0.2) ≈ 0.482, linearToSRGB(0.4) ≈ 0.665, linearToSRGB(0.6) ≈ 0.798

That would give approximately (0x7B, 0xA9, 0xC5) on screen, NOT (0x33, 0x66, 0x99).

Hmm, but that doesn't seem right for what users expect. Let me reconsider.

Actually wait. I think I'm confusing myself. Let me look at this differently.

In Three.js, when you do `scene.background = new THREE.Color(0x336699)`:
- The color is stored as (0.2, 0.4, 0.6)
- In the background rendering shader, these values are used directly
- The output color space transform is applied at the end

But actually, I recall that Three.js has been changing how it handles color spaces. In more recent versions (r152+), there's a distinction:
- Colors specified in code are assumed to be in sRGB
- The renderer converts them to linear working space for calculations
- Then converts back to sRGB for output

So the flow would be:
1. sRGB input (0.2, 0.4, 0.6) → linear working space: sRGBToLinear(0.2), sRGBToLinear(0.4), sRGBToLinear(0.6)
2. Linear working space → sRGB output: linearToSRGB(linear values)

If both conversions happen, the result should be the same as input: (0.2, 0.4, 0.6) → appears as 0x336699 on screen.

Let me verify: sRGBToLinear(0.2):
- 0.2 > 0.04045, so ((0.2 + 0.055) / 1.055)^2.4 = (0.255/1.055)^2.4 = (0.2417)^2.4 ≈ 0.0331

Then linearToSRGB(0.0331):
- 0.0331 > 0.0031308, so 1.055 * 0.0331^(1/2.4) - 0.055 = 1.055 * 0.0331^0.4167 - 0.055
- 0.0331^0.4167 ≈ 0.1998
- 1.055 * 0.1998 - 0.055 ≈ 0.2108 - 0.055 ≈ 0.1558

That's not 0.2... so either the sRGB→linear conversion is NOT applied to the background color, or I'm wrong about something.

Let me reconsider. I think in Three.js, the Color class stores values in the "working color space" which is linear by default. When you do `new THREE.Color(0x336699)`, it actually stores the sRGB values directly without conversion. The conversion to/from sRGB is only done at the renderer output stage.

Actually, I just recalled: in Three.js, `Color` stores values as-is. The `setHex` method just divides by 255. No color space conversion is done. The color space management happens in the renderer's output.

So for `scene.background = new THREE.Color(0x336699)`:
- Stored values: (0.2, 0.4, 0.6)
- These are written to the framebuffer as-is (no linear conversion)
- At output time, the renderer applies the linear-to-sRGB conversion

Wait, but that would mean the background appears wrong (not as 0x336699). Unless...

Actually, I think I need to check: does Three.js convert the background color from sRGB to linear before putting it in the shader?

Looking at Three.js source code for `WebGLBackground`:
```javascript
const color = new Color();
// ...
color.copy( scene.background );
```
And in the shader, the color is used directly. There's no sRGB-to-linear conversion applied to the background.

So the framebuffer gets (0.2, 0.4, 0.6) for the background, and then the output transform (linear to sRGB) is applied, giving a different color on screen.

BUT WAIT - I just realized something. The `outputColorSpace` conversion might not be applied to the background in the same way. Let me think about this differently.

Actually, you know what, let me just think about what makes the problem solvable and what the user is asking for.

The user says: "The background 0x336699 must appear on screen as 0xcc9966 and the white sphere as black."

So the user wants: the pixel on screen that WOULD be 0x336699 (without the effect) becomes 0xcc9966 (with the effect), and white (0xffffff) becomes black (0x000000).

This means: if the final pixel on screen (after all color space conversions) is `X`, we want it to be `1 - X` in sRGB space.

Now, the question is: at what point in the pipeline do we apply the inversion?

**Option 1**: Invert in the shader pass, before the OutputPass.
- The render target has values in linear space (or whatever the working space is).
- We invert: `1.0 - rgb`
- Then OutputPass converts linear → sRGB.
- Result: linearToSRGB(1.0 - linearValue)

Without the effect:
- linearToSRGB(linearValue) is what appears on screen.

For the background: if the background is stored as (0.2, 0.4, 0.6) in the framebuffer (let's call these the "linear" values from the shader's perspective):
- Without effect: screen shows linearToSRGB(0.2), linearToSRGB(0.4), linearToSRGB(0.6)
- With inversion before OutputPass: screen shows linearToSRGB(1-0.2), linearToSRGB(1-0.4), linearToSRGB(1-0.6) = linearToSRGB(0.8), linearToSRGB(0.6), linearToSRGB(0.4)

We want: screen shows (1 - sRGB_r, 1 - sRGB_g, 1 - sRGB_b) where sRGB values are what would appear without the effect.

So we want: linearToSRGB(1 - x) = 1 - linearToSRGB(x) for all x?

That's NOT true in general! The sRGB transfer function is non-linear, so inverting in linear space and then converting to sRGB is NOT the same as converting to sRGB and then inverting.

**Option 2**: Invert after the OutputPass (i.e., invert in sRGB space).
- This would give exactly `1 - sRGB` which is what we want.
- But we can't easily put a pass after OutputPass... or can we?

Actually, we CAN! We can put the inversion ShaderPass AFTER the OutputPass in the composer chain.

The composer chain would be: RenderPass → OutputPass → InversionPass

- RenderPass renders the scene to a render target (in linear space).
- OutputPass converts from linear to sRGB (applies the tone mapping and color space conversion).
- InversionPass: `gl_FragColor = vec4(1.0 - rgb, a)` - this inverts in sRGB space.

This should give the correct result! The final pixel on screen would be `1 - sRGB(original)`.

Let me verify:
- Background without effect: some sRGB value (let's call it S)
- Background with effect: 1 - S
- If S = (0x33/255, 0x66/255, 0x99/255) = (0.2, 0.4, 0.6), then 1-S = (0.8, 0.6, 0.4) = (0xCC, 0x99, 0x66) = 0xCC9966 ✓
- White sphere without effect: S = (1, 1, 1), with effect: (0, 0, 0) = black ✓

So the correct order is: RenderPass → OutputPass → InversionPass

But wait, does the OutputPass actually do the linear→sRGB conversion? Let me check.

In Three.js, `OutputPass` applies:
1. Tone mapping (if any)
2. Color space conversion (linear working space → output color space, which is sRGB by default)

Yes! So the pipeline should be:
1. RenderPass: renders scene to render target (values in linear working space)
2. OutputPass: converts to sRGB (the final display color space)
3. InversionPass: inverts the sRGB values

This is the correct approach.

Now let me also consider: does the renderer's `outputColorSpace` matter when using EffectComposer? 

When using EffectComposer, the renderer doesn't apply the output color space conversion to intermediate render targets. The OutputPass handles that. The final pass's output goes to the screen. If the last pass writes to the screen (which it does in EffectComposer by default), the renderer might apply its own output transform... 

Actually, I need to be careful here. In EffectComposer:
- Intermediate passes render to render targets (no output color space conversion by the renderer)
- The final pass renders to the screen (null render target)
- When rendering to screen, the renderer DOES apply the output color space conversion

Wait, that's a problem. If the last pass (inversion pass) renders to screen, the renderer will apply linear→sRGB conversion AGAIN on top of what OutputPass already did.

Hmm, let me look at how EffectComposer handles this.

Actually, in newer versions of Three.js, when you use EffectComposer, the renderer's `outputColorSpace` is effectively handled by the OutputPass. The EffectComposer sets up the render targets, and the final pass outputs to screen. The renderer's built-in output transform should NOT be applied to the composer's output because the OutputPass already did it.

Let me check: in EffectComposer's render method, the final pass renders to `null` (the screen). When a ShaderPass renders to the screen, does the renderer apply the output color space transform?

Looking at Three.js source: The output color space transform is applied in the material's fragment shader via the `#include <colorspace_fragment>` chunk. This is part of the material's shader program. For the ShaderPass, the shader is a custom one that doesn't include this chunk, so the transform is NOT automatically applied.

Wait, but for the background and basic materials in the scene, the renderer DOES include the colorspace_fragment chunk. So when RenderPass renders the scene to a render target, does it include the output transform?

Actually no! When rendering to a render target (not the screen), Three.js does NOT apply the output color space conversion. The `colorspace_fragment` chunk checks if we're rendering to the default framebuffer. When rendering to a render target, the linear values are written as-is.

So the pipeline is:
1. RenderPass → renders scene to render target A. The background color (0.2, 0.4, 0.6) and white (1, 1, 1) are written to the render target WITHOUT sRGB conversion (because it's a render target, not the screen).
2. OutputPass → reads from A, applies linear→sRGB conversion, writes to render target B. Now B has the correct sRGB values.
3. InversionPass → reads from B, inverts (1 - rgb), writes to screen. Since it's a custom shader without the colorspace chunk, no additional conversion is applied. The screen shows the inverted sRGB values.

This should work correctly!

But wait, I need to double-check: when the InversionPass writes to the screen (null render target), does the renderer apply any additional transform? For a custom ShaderPass, the shader is:
```glsl
void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    gl_FragColor = vec4(1.0 - color.rgb, color.a);
}
```

This doesn't include `<colorspace_fragment>`, so no additional transform. 

Actually wait, I need to reconsider. Let me look at how ShaderPass works in Three.js. The ShaderPass uses a ShaderMaterial. When a ShaderMaterial renders to the screen, does Three.js inject the colorspace chunk?

Looking at the Three.js source for WebGLPrograms / shader compilation: The `colorspace_fragment` chunk is included in the built-in materials' shaders. For custom ShaderMaterials, the user provides the full fragment shader, and Three.js does NOT inject anything. So no, the colorspace conversion is NOT applied to ShaderPass output.

Great, so my approach is correct:
- RenderPass → OutputPass → InversionPass (to screen)

The final pixel on screen = 1 - sRGB(linear_scene_color) = exactly what we want.

Now let me also make sure about the render target format. The EffectComposer by default uses a render target with `type: HalfFloatType` (or `UnsignedByteType`?). Let me check...

In recent Three.js versions, EffectComposer creates render targets with `type: HalfFloatType` by default to avoid banding. This is fine for our purposes.

Actually, I just realized I should double-check one more thing. The `OutputPass` - what exactly does it do?

From Three.js source (r152+):
```javascript
class OutputPass extends Pass {
    constructor() {
        super();
        this._outputColorSpace = SRGBColorSpace;
        // ...
        this.fullScreenQuad = new FullScreenQuad(material);
    }
    
    render(renderer, writeBuffer, readBuffer) {
        this.uniforms['tDiffuse'].value = readBuffer.texture;
        this.uniforms['toneMappingExposure'].value = renderer.toneMappingExposure;
        // ...
        this.fullScreenQuad.material.defines = Object.assign({}, {
            TONE_MAPPING: renderer.toneMapping !== NoToneMapping ? '' : undefined,
            OUTPUT_COLORSPACE: ''
        });
        // ...
    }
}
```

The OutputPass shader includes:
```glsl
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

So yes, it applies tone mapping and then color space conversion. Since we're not using tone mapping (default is NoToneMapping), it just does the color space conversion.

The `colorspace_fragment` chunk does:
```glsl
gl_FragColor = linearToOutputTexel( gl_FragColor );
```

Where `linearToOutputTexel` converts from the linear working space to the output color space (sRGB).

Perfect. So my plan is solid.

Let me now write the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Sphere
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Effect Composer
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

// Inversion shader
const InversionShader = {
    uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
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
            gl_FragColor = vec4(1.0 - color.rgb, color.a);
        }
    `
};

const inversionPass = new ShaderPass(InversionShader);
composer.addPass(inversionPass);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
renderer.setAnimationLoop(() => {
    composer.render();
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Wait, I need to check the `tDiffuse` uniform type. In ShaderPass, the uniform `tDiffuse` is automatically set by the pass. But for TypeScript strict mode, I need to type it correctly.

Looking at the ShaderPass source, it expects the shader to have a `tDiffuse` uniform. The type should be `THREE.IUniform<THREE.Texture>` or similar.

Actually, let me look at how other shaders in Three.js addons define their uniforms:

```typescript
uniforms: {
    tDiffuse: { value: null }
}
```

For strict TypeScript, I should type it properly. Let me use:
```typescript
uniforms: {
    tDiffuse: { value: null as THREE.Texture | null }
}
```

Or I could use the `Shader` type from Three.js. Actually, the simplest approach that compiles with `--strict` would be to type it as:

```typescript
const InversionShader = {
    uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
    },
    vertexShader: `...`,
    fragmentShader: `...`
};
```

Let me also make sure the ShaderPass constructor accepts this. Looking at the type:
```typescript
class ShaderPass {
    constructor(shader: { uniforms: { [uniform: string]: THREE.IUniform<any> }; vertexShader: string; fragmentShader: string }, textureID?: string)
}
```

So `tDiffuse: { value: null as THREE.Texture | null }` should work since `THREE.Texture | null` is assignable to `any`.

Actually, I realize I should double-check: does `tDiffuse` need to be `THREE.IUniform<THREE.Texture>`? The value can be null initially since ShaderPass will set it. Let me just use a type that satisfies strict mode.

Let me also consider: should I use `renderer.setPixelRatio`? The user didn't mention it, but it's good practice. However, if I use it, I should also set the composer's pixel ratio. Actually, EffectComposer handles pixel ratio through `setSize`. Let me include it for correctness.

Wait, actually there's a subtlety. `composer.setSize(w, h)` sets the size of the render targets. If I use `renderer.setPixelRatio`, the renderer will render at a higher resolution, but the composer's render targets might not match. Let me check...

Actually, `EffectComposer`'s constructor reads the renderer's pixel ratio and sets the render target size accordingly. And `composer.setSize(w, h)` also accounts for pixel ratio. So it should be fine.

Let me also remove the `antialias` option since we're using post-processing (the MSAA on the default framebuffer won't help with render targets anyway, and it can cause issues).

Actually, I'll keep it simple and not use antialias since it doesn't matter with post-processing.

One more thing: I should make sure the body has no margin/padding so the canvas fills the screen properly. I'll add a style reset.

Let me finalize the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Remove default margins
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Sphere
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

// Inversion shader pass (applied AFTER OutputPass so it inverts in sRGB space)
const InversionShader = {
    uniforms: {
        tDiffuse: { value: null as THREE.Texture | null }
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
            gl_FragColor = vec4(1.0 - color.rgb, color.a);
        }
    `
};

const inversionPass = new ShaderPass(InversionShader);
composer.addPass(inversionPass);

// Resize
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
});

// Animation loop
let ready = false;
renderer.setAnimationLoop(() => {
    composer.render();
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Hmm, I'm using `/* glsl */` template literal tags. Let me check if that's valid TypeScript... Actually, `/* glsl */` before a template literal is just a comment. The template literal is just a regular string. That's fine.

Wait, actually in TypeScript, `/* glsl */` before a template literal might cause issues in some configurations. Let me just use regular template literals without the comment tag to be safe.

Actually, I just realized there might be an issue with the `tDiffuse` uniform type. Let me check what `ShaderPass` expects:

Looking at the Three.js addons type definitions:
```typescript
class ShaderPass extends Pass {
    constructor(shader: TShader, textureID?: string);
}
```

Where `TShader` is:
```typescript
interface TShader {
    uniforms: { [uniform: string]: IUniform<any> };
    vertexShader: string;
    fragmentShader: string;
}
```

And `IUniform<T>` is:
```typescript
interface IUniform<T = any> {
    value: T;
}
```

So `tDiffuse: { value: null as THREE.Texture | null }` should work since `THREE.Texture | null` is assignable to `any`.

Actually wait, I want to make sure this compiles with `--strict`. The issue is that `{ value: null as THREE.Texture | null }` has type `{ value: THREE.Texture | null }`. Is this assignable to `IUniform<any>` which is `{ value: any }`? Yes, because `THREE.Texture | null` is assignable to `any`.

I think the code is correct. Let me finalize it.

One more thought: should I use `renderer.setPixelRatio(window.devicePixelRatio)`? It's good for high-DPI displays but not strictly necessary. The user didn't mention it. I'll skip it to keep things simple and avoid potential issues with the composer size.

Actually, let me reconsider. Without setting pixel ratio, on a Retina display, the canvas will be 1x resolution. The user might expect crisp rendering. But since the requirement is about color correctness, not resolution, I'll keep it simple.

Let me also double-check: the `OutputPass` needs to be imported from 'three/addons/postprocessing/OutputPass.js'. Yes, that's correct.

I'm satisfied with the solution. Let me write the final version.
