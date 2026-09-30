The user wants a post-processing color-inversion effect that correctly handles color space. Let me think about this carefully.

The key challenge here is understanding how Three.js handles color spaces in the post-processing pipeline.

In modern Three.js (r152+), the rendering pipeline works like this:
1. Objects are rendered in linear color space internally
2. The final OutputPass (or the renderer's output encoding) converts from linear to sRGB for display

The EffectComposer pipeline:
1. RenderPass - renders the scene in linear color space into a render target
2. Custom ShaderPass (inversion) - operates on the values in the render target
3. OutputPass - converts from linear to sRGB (tone mapping + color space conversion)

The problem: If we invert in the ShaderPass (between RenderPass and OutputPass), the inversion happens in linear space, but the user wants the inversion to happen in sRGB space (what's actually on screen).

Let's verify:
- Background color: 0x336699 in sRGB
- In Three.js, this gets converted to linear space when stored in the render target
- sRGB 0x336699 → linear: approximately (0.0331, 0.1329, 0.3257) (using the sRGB to linear conversion)
- If we invert in linear: 1 - 0.0331 = 0.9669, 1 - 0.1329 = 0.8671, 1 - 0.3257 = 0.6743
- Then OutputPass converts back to sRGB: that would give approximately 0.983, 0.938, 0.825 → roughly 0xfaf0d2... not 0xcc9966

The expected inverse of 0x336699 in sRGB space:
- R: 0xFF - 0x33 = 0xCC
- G: 0xFF - 0x66 = 0x99  
- B: 0xFF - 0x99 = 0x66
- So expected: 0xcc9966 ✓

The expected inverse of white (0xffffff): 0x000000 (black) ✓

So the inversion must happen in sRGB space, AFTER the linear→sRGB conversion.

Options:
1. Do the inversion AFTER the OutputPass (i.e., swap the order: RenderPass → OutputPass → ShaderPass for inversion)
2. In the shader, convert from linear to sRGB first, then invert, then convert back to linear (so the final OutputPass conversion produces the correct result)

Wait, let me think more carefully.

If we do: RenderPass → OutputPass → Inversion ShaderPass (last pass renders to screen)

The OutputPass converts linear → sRGB. Then the inversion shader operates on sRGB values. This should give us exactly what we want.

But wait - does OutputPass work correctly when it's not the last pass in the chain? Let me think...

Actually, looking at how EffectComposer works: each pass writes to a render target (or the screen for the last pass). The OutputPass applies tone mapping and color space conversion. If we put OutputPass before the inversion pass, the inversion pass will receive sRGB-encoded values, invert them, and write to screen.

But there's a subtlety: the render targets in the composer might be configured with specific encoding/color space. Let me think about this differently.

Actually, the simplest and most correct approach:

1. RenderPass → renders scene to a linear-space render target
2. OutputPass → converts linear to sRGB (and applies tone mapping)
3. ShaderPass (inversion) → inverts sRGB values, writes to screen

This way, the inversion happens on sRGB values, which is exactly what we want.

Wait, but does OutputPass work correctly when it's not the last pass? Looking at the Three.js source for OutputPass - it applies the renderer's tone mapping and output color space conversion. It should work in any position in the chain.

Actually, let me reconsider. There might be an issue with the render target's color space. The EffectComposer creates render targets with `LinearSRGBColorSpace` by default (in newer Three.js). The OutputPass converts to sRGB when writing to the screen. But if it's writing to an intermediate render target, it might still apply the conversion.

Let me look at this more carefully. In Three.js r155+:
- The renderer's `outputColorSpace` defaults to `SRGBColorSpace`
- OutputPass applies the renderer's tone mapping and converts to the renderer's output color space
- The composer's internal render targets use `LinearSRGBColorSpace`

Hmm, actually I think the issue is more nuanced. Let me reconsider the approach.

Approach: In the inversion shader itself, convert from linear to sRGB, invert, then convert back to linear. This way, when the OutputPass later converts linear→sRGB, the sRGB values get inverted correctly.

Let's verify:
- Scene renders 0x336699 (sRGB) → stored in render target as linear (~0.0331, 0.1329, 0.3257)
- Shader: convert linear to sRGB → (0.2, 0.4, 0.6) [approx 0x336699]
- Invert: (0.8, 0.6, 0.4) [this is 0xcc9966 in sRGB]
- Convert back to linear: (0.6038, 0.3257, 0.1329)
- OutputPass converts linear to sRGB: (0.8, 0.6, 0.4) → displays as 0xcc9966 ✓

For white sphere:
- Scene renders 0xffffff → stored as linear (1, 1, 1)
- Shader: convert to sRGB → (1, 1, 1)
- Invert: (0, 0, 0)
- Convert back to linear: (0, 0, 0)
- OutputPass: linear to sRGB → (0, 0, 0) → black ✓

This works!

Alternatively, the simpler approach: RenderPass → OutputPass → ShaderPass(inversion).

Let me think about whether this works. The OutputPass will convert linear to sRGB. Then the shader pass receives sRGB-encoded pixel values and inverts them directly. The final pass (shader) writes to screen.

Actually, I think the cleanest approach that's guaranteed to work is:

Option A: RenderPass → ShaderPass(inversion in sRGB space with linear↔sRGB conversion in shader) → OutputPass

Option B: RenderPass → OutputPass → ShaderPass(inversion, which is the last pass)

Let me go with Option B first since it's simpler. But I need to make sure the ShaderPass is the last pass so it renders to the screen directly.

Actually wait, there might be an issue. When the OutputPass is not the last pass, it writes to a render target. The question is whether the color space conversion is correctly applied when writing to an intermediate target.

Looking at the OutputPass source code, it applies a shader that does:
1. Tone mapping
2. Color space conversion (linear → output color space)

So it will write sRGB-encoded values to the intermediate render target. Then the next ShaderPass will read those sRGB-encoded values.

But here's the catch: when a ShaderPass reads from a render target, does Three.js's shader system do any automatic color space conversion on the input texture? 

In Three.js, textures attached to materials might have their color space set. If the texture is marked as `SRGBColorSpace`, the GPU (or Three.js shader) will convert it to linear when sampling. This would be a problem!

Actually, looking at how EffectComposer and ShaderPass work internally:
- ShaderPass uses a ShaderMaterial with `uniforms.tDiffuse` being the input texture
- The input texture from the previous pass is assigned to `tDiffuse`
- If the material has `tDiffuse` declared as a regular sampler2D uniform, no automatic color space conversion happens (unlike MeshBasicMaterial which uses defines)

So in a ShaderPass, the texture values are read as-is (raw values from the render target). No automatic sRGB decoding happens.

OK so with Option B:
- RenderPass writes linear values to render target A
- OutputPass reads from A, applies tone mapping + linear→sRGB, writes to render target B
- ShaderPass reads from B (gets sRGB values directly since no auto-decode), inverts them, writes to screen

This should work correctly!

But wait, I need to double-check: does the ShaderPass's output to screen go through any final conversion? In Three.js, when the last pass renders to the screen (null target), does it apply any color space conversion?

Looking at EffectComposer.render():
- If a pass is marked as `renderToScreen = true`, it renders to null (the screen)
- The renderer's final color space output is handled by OutputPass, not by the renderer itself (in newer Three.js)

Actually, in newer Three.js, the renderer doesn't automatically convert color space anymore - that's what OutputPass does. So if we put ShaderPass after OutputPass as the last pass, it just writes whatever values it computes to the screen directly.

So Option B should work:
- RenderPass → OutputPass (converts to sRGB) → ShaderPass (inverts sRGB values, renders to screen)

The inversion shader just does `color.rgb = 1.0 - color.rgb` and that's it.

Hmm, but actually I realize there might be an issue with how EffectComposer handles the last pass. Let me think again...

Actually, looking at the EffectComposer code more carefully:

```js
render(deltaTime) {
    // ...
    for (let i = 0; i < this.passes.length; i++) {
        const pass = this.passes[i];
        if (pass.enabled === false) continue;
        
        pass.renderToScreen = (this.passes.length - 1 === i); // or some logic
        // ...
    }
}
```

Wait, actually I recall that in newer Three.js EffectComposer, the last enabled pass renders to screen. Let me just make sure the ShaderPass is the last pass.

Let me go with Option B: RenderPass → OutputPass → ShaderPass(inversion)

The shader is simple:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    color.rgb = 1.0 - color.rgb;
    gl_FragColor = color;
}
```

Wait, but I should double-check: does the ShaderPass with this simple shader actually produce the correct output? The concern is:

1. OutputPass writes sRGB values to the intermediate framebuffer
2. ShaderPass reads those values and inverts them
3. The inverted values go to the screen

Since the values in the framebuffer are sRGB-encoded, and we invert them, the screen shows the inverted sRGB values. 

For background 0x336699:
- sRGB values: (51/255, 102/255, 153/255) = (0.2, 0.4, 0.6)
- Inverted: (0.8, 0.6, 0.4)
- As hex: (204, 153, 102) = 0xcc9966 ✓

For white:
- sRGB values: (1, 1, 1)
- Inverted: (0, 0, 0)
- As hex: 0x000000 ✓

This approach works.

Now, let me also consider Option A as a fallback (converting in the shader):

RenderPass → ShaderPass(linear→sRGB, invert, sRGB→linear) → OutputPass

The shader would be:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 sRGBToLinear(vec3 color) {
    return mix(
        color / 12.92,
        pow((color + 0.055) / 1.055, vec3(2.4)),
        step(0.04045, color)
    );
}

vec3 linearToSRGB(vec3 color) {
    return mix(
        color * 12.92,
        1.055 * pow(color, vec3(1.0/2.4)) - 0.055,
        step(0.0031308, color)
    );
}

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    vec3 srgb = linearToSRGB(color.rgb);
    vec3 inverted = 1.0 - srgb;
    color.rgb = sRGBToLinear(inverted);
    gl_FragColor = color;
}
```

I'll go with Option B (RenderPass → OutputPass → ShaderPass) as it's cleaner and simpler.

Wait, actually I want to double-check one thing. In Three.js, when a ShaderPass renders to the screen (as the last pass), does the renderer apply any final gamma/color space correction? 

In Three.js r152+, `renderer.outputColorSpace = THREE.SRGBColorSpace` by default. But this setting only affects how materials render their output - it's built into the material's shader as a final conversion step. It does NOT affect raw ShaderMaterial outputs or when rendering to the screen from a fullscreen quad in a pass.

Actually, I need to be more careful. Let me look at what happens when EffectComposer's last pass renders to the screen.

When a pass has `renderToScreen = true`, it renders a fullscreen quad to `renderer.render()` with target = null. The material used is typically a ShaderMaterial. Three.js's ShaderMaterial does NOT automatically apply output color space conversion - that's only done by built-in materials (MeshBasicMaterial, MeshStandardMaterial, etc.) through shader includes.

So for a ShaderPass rendering to screen, the output goes directly to the framebuffer without any color space conversion. This means if we write sRGB values, they'll display correctly on screen.

Great, so Option B is correct.

Let me write the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Now let me think about whether there's any issue with the order. Actually, I just realized there might be a subtlety.

When the ShaderPass is the last pass and renders to screen, it writes to the default framebuffer. The browser/compositor expects sRGB values in the framebuffer (assuming the canvas is in sRGB mode, which it is by default). So writing sRGB values (inverted sRGB values) is correct.

Let me also make sure about the OutputPass behavior. The OutputPass:
1. Takes linear-space input
2. Applies tone mapping (identity by default)
3. Applies color space conversion (linear → sRGB)
4. Writes the result

So after OutputPass, the values in the intermediate target are sRGB-encoded. The ShaderPass reads them, inverts, and writes to screen. Perfect.

Let me write the full solution now.

Actually, one more thought: I should verify that the `OutputPass` is available in the Three.js addons. It was introduced in r152. The import path is `three/addons/postprocessing/OutputPass.js`. Yes, this should be available.

Let me finalize the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Sphere
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Composer
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const invertShader: THREE.Shader = {
    uniforms: {
        tDiffuse: { value: null },
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
            color.rgb = 1.0 - color.rgb;
            gl_FragColor = color;
        }
    `,
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Animation loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
    composer.render();
    if (firstFrame) {
        firstFrame = false;
        (window as any).__ready = true;
    }
});

// Resize
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
});
```

Wait, I need to think about the order once more. The passes are:
1. RenderPass - renders scene (linear values) to render target
2. OutputPass - converts linear → sRGB, writes to next render target
3. ShaderPass (invert) - inverts sRGB values, renders to screen

This should be correct.

Actually, let me reconsider whether there's an issue with how EffectComposer manages its read/write buffers. The EffectComposer alternates between two render targets (readBuffer and writeBuffer). Each pass reads from readBuffer and writes to writeBuffer, then they swap. The last pass (with renderToScreen=true) reads from the current readBuffer and writes to the screen.

So the flow is:
1. RenderPass: writes scene (linear) to writeBuffer → swap → readBuffer has linear
2. OutputPass: reads readBuffer (linear), applies output transform (linear→sRGB), writes to writeBuffer → swap → readBuffer has sRGB
3. ShaderPass: reads readBuffer (sRGB), inverts, writes to screen (renderToScreen=true)

This is correct!

One concern: does the ShaderPass's ShaderMaterial have any automatic color space handling? Let me check... ShaderMaterial in Three.js doesn't have any automatic color space conversion built into it. The texture uniform `tDiffuse` is sampled as raw values. So we get the raw sRGB-encoded values from the previous pass. Perfect.

I'm confident this solution is correct. Let me finalize it.

Actually, I want to also think about whether `THREE.Shader` type might cause issues with strict TypeScript. The `ShaderPass` constructor accepts an object with `uniforms`, `vertexShader`, and `fragmentShader`. Let me check the type...

In Three.js types, `ShaderPass` constructor takes:
```typescript
constructor(shader?: object, textureID?: string)
```

Or it might be typed as accepting a specific interface. Let me use a simple object literal without explicit typing to avoid potential issues, or use the proper type.

Actually, looking at the Three.js types more carefully, ShaderPass extends Pass and its constructor accepts:
```typescript
constructor(shader: object, textureID?: string);
```

So I can just pass the object directly. Let me not annotate it with `THREE.Shader` to avoid potential type mismatches.

Actually, `THREE.Shader` is defined as:
```typescript
interface Shader {
    uniforms: { [uniform: string]: IUniform };
    vertexShader: string;
    fragmentShader: string;
    name?: string;
    defines?: { [name: string]: string };
}
```

And ShaderPass accepts this type. Let me keep the type annotation but make sure it compiles correctly.

Hmm, actually in newer versions of Three.js types, `ShaderPass` constructor might expect `Shader` or `Partial<Shader>` or just `object`. To be safe with strict mode, let me just pass the object without a type annotation:

```typescript
const invertPass = new ShaderPass({
    uniforms: {
        tDiffuse: { value: null },
    },
    vertexShader: `...`,
    fragmentShader: `...`,
});
```

This should work fine with strict TypeScript since the object literal matches the expected shape.

Let me finalize the code.
