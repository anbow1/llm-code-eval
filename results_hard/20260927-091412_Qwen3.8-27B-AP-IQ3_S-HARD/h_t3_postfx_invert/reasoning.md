Let me think through this carefully.

The requirement is:
- Background color 0x336699 must appear as 0xcc9966 on screen
- White sphere (0xffffff) must appear as black (0x000000)

The key insight is about color space management. Let me think about the rendering pipeline:

1. In Three.js, when you set `scene.background = new THREE.Color(0x336699)`, the color is stored in sRGB space but internally converted to linear for rendering.
2. The renderer by default uses `renderer.outputColorSpace = THREE.SRGBColorSpace` (which is the default in modern Three.js).
3. When you use EffectComposer, the passes work in linear space internally, and the `OutputPass` handles the final linear -> sRGB conversion.

Wait, let me think more carefully about the pipeline:

With EffectComposer:
- RenderPass renders the scene. The colors are in linear space (since the renderer's internal framebuffer is linear).
- Actually, with EffectComposer, the intermediate render targets are typically in linear space (no color space conversion happens until the final pass).
- OutputPass does the final linear -> sRGB conversion (plus tone mapping if applicable).

So the pipeline is:
1. RenderPass: Renders scene into a linear-space buffer. Background 0x336699 (sRGB) becomes its linear equivalent. White sphere stays white (1.0, 1.0, 1.0) in linear.
2. Custom ShaderPass: If I just do `rgb = 1.0 - rgb` here, I'm inverting in LINEAR space. That's wrong! The requirement says the final on-screen result must be 0xcc9966 for the background.

Let me verify: 0x336699 in sRGB is (0x33, 0x66, 0x99) = (51, 102, 153) out of 255 = (0.2, 0.4, 0.6) in sRGB.
The inverse in sRGB would be (0.8, 0.6, 0.4) = (204, 153, 102) = (0xCC, 0x99, 0x66) = 0xCC9966. ✓

But if I invert in linear space:
- sRGB 0x33 = 51/255 ≈ 0.2 → linear ≈ 0.0331
- sRGB 0x66 = 102/255 = 0.4 → linear ≈ 0.1329
- sRGB 0x99 = 153/255 = 0.6 → linear ≈ 0.3185

Inverting in linear: (1-0.0331, 1-0.1329, 1-0.3185) = (0.9669, 0.8671, 0.6815)
Converting back to sRGB:
- 0.9669 → sRGB ≈ 0.9876 → 252 (0xFC)
- 0.8671 → sRGB ≈ 0.9377 → 239 (0xEF)
- 0.6815 → sRGB ≈ 0.8392 → 214 (0xD6)

That gives 0xFCEF D6, not 0xCC9966. So inverting in linear space is WRONG.

The correct approach: I need to invert in sRGB space. 

Options:
1. Put the ShaderPass AFTER OutputPass (so it operates on sRGB values).
2. In the ShaderPass, convert linear -> sRGB, invert, then convert sRGB -> linear (so OutputPass will convert back to sRGB).

Option 1 is simpler and more correct. Let me think about whether this works with EffectComposer.

Actually, with EffectComposer, the last pass renders to the screen. The OutputPass typically does:
- Linear to sRGB conversion
- Tone mapping (if set)

If I put my inversion pass AFTER OutputPass, then:
- RenderPass: scene rendered in linear
- OutputPass: linear -> sRGB (background becomes 0x336699 in sRGB, sphere stays 0xffffff)
- InversionPass: inverts in sRGB (background becomes 0xcc9966, sphere becomes 0x000000)

This is the correct approach! The inversion must happen in sRGB space.

Wait, but there's a subtlety. When EffectComposer renders the last pass to screen, does it do any additional color space conversion? Let me think...

In Three.js's EffectComposer, the final pass (the one with `renderToScreen = true` or the last pass in the chain) renders to the default framebuffer (the canvas). If the renderer has `outputColorSpace = SRGBColorSpace`, then the canvas is in sRGB. But EffectComposer's internal render targets are in linear space by default.

Actually, let me reconsider. In modern Three.js (r152+), the EffectComposer works like this:
- Intermediate render targets are in linear space (no color space tag, or LinearSRGB)
- The OutputPass converts from linear to sRGB as the final step
- The last pass renders to screen

If I add my ShaderPass AFTER OutputPass:
- OutputPass converts linear -> sRGB and writes to the next render target
- My ShaderPass reads sRGB, inverts, writes to screen

But wait - when the last pass renders to screen, does the renderer apply any additional gamma? In EffectComposer, the passes render to render targets (which are linear), and only the final pass renders to the canvas. The renderer's outputColorSpace affects how the final output looks.

Hmm, actually I think the safest approach is:

Option 2: In the shader, do the conversion manually:
- Input is linear (from RenderPass)
- Convert linear -> sRGB in the shader
- Invert: sRGB = 1.0 - sRGB
- Convert sRGB -> linear (so OutputPass will convert back to sRGB)

Wait, that's circular. Let me think again...

Actually, the cleanest approach:

Pipeline:
1. RenderPass - renders scene to linear buffer
2. OutputPass - converts linear -> sRGB (this is where the "correct" screen colors would appear)
3. Inversion ShaderPass - inverts the sRGB values

The last pass (Inversion ShaderPass) renders to screen. Since it's just a simple shader pass that doesn't do any color space conversion, and the canvas is sRGB, the values written directly to the canvas will be interpreted as sRGB. So this should work correctly.

Wait, but does the renderer apply any additional sRGB encoding when writing to the canvas from a pass? Let me think...

In EffectComposer, passes write to render targets or to the canvas. When writing to the canvas (the final pass), the values are written directly. The renderer's outputColorSpace setting affects the built-in rendering, but for post-processing passes, the values in the framebuffer are what you get on screen.

Actually, I recall that in Three.js, when you use EffectComposer, the renderer's `outputColorSpace` is effectively overridden by the OutputPass. The OutputPass is responsible for the final linear->sRGB conversion. After OutputPass, the data is in sRGB.

So the correct order is:
1. RenderPass
2. OutputPass (linear -> sRGB)
3. Custom inversion ShaderPass (inverts sRGB values)

The inversion pass is last, so it renders to screen. The values it writes are sRGB values (inverted), and they'll appear correctly on the sRGB canvas.

Let me verify with the white sphere:
- In linear: (1.0, 1.0, 1.0)
- After OutputPass (sRGB): (1.0, 1.0, 1.0) - white stays white
- After inversion: (0.0, 0.0, 0.0) - black ✓

And the background 0x336699:
- In sRGB: (0x33/255, 0x66/255, 0x99/255) = (0.2, 0.4, 0.6)
- After OutputPass (sRGB): (0.2, 0.4, 0.6) - correct sRGB values
- After inversion: (0.8, 0.6, 0.4) = (204, 153, 102) = 0xCC9966 ✓

This approach works.

Now let me write the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sphere
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Post-processing
const composer = new EffectComposer(renderer);

// 1. RenderPass
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2. OutputPass (linear -> sRGB)
const outputPass = new OutputPass();
composer.addPass(outputPass);

// 3. Inversion ShaderPass (inverts sRGB)
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
            color.rgb = 1.0 - color.rgb;
            gl_FragColor = color;
        }
    `
};
const inversionPass = new ShaderPass(inversionShader as any);
composer.addPass(inversionPass);

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    // Optional: some motion using delta
    // sphere.rotation.y += delta * 0.5;
    composer.render();
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

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

Wait, I need to be careful with the ShaderPass type. Let me check - `ShaderPass` constructor takes a `THREE.Shader` or an object with `uniforms`, `vertexShader`, `fragmentShader`. In TypeScript strict mode, I need to make sure the types work.

The `ShaderPass` constructor signature is:
```
constructor(shader: Shader | { uniforms: ..., vertexShader: string, fragmentShader: string }, textureID?: string)
```

Actually looking at the Three.js source, ShaderPass expects an object that looks like a Shader. Let me just type it properly.

Actually, I can create a `THREE.ShaderMaterial`-like object or just pass the shader object. Let me use a proper approach.

Looking at Three.js types, `ShaderPass` constructor takes:
```typescript
constructor(shader: { uniforms: { [uniform: string]: IUniform }, vertexShader: string, fragmentShader: string }, textureID?: string);
```

Or it can take a `THREE.Shader` instance. Let me just define the object inline and cast if needed.

Actually, let me look at this more carefully. The ShaderPass in three/addons expects something like:

```typescript
const shader = {
    name: 'InversionShader',
    uniforms: {
        tDiffuse: { value: null as Texture | null }
    },
    vertexShader: `...`,
    fragmentShader: `...`
};
```

In strict TypeScript, I need to make sure the types align. Let me use a type assertion if necessary.

Let me also consider: do I need to add some motion? The rules say "Motion must use delta/elapsed time, not frame counts." I could add a subtle rotation to the sphere using delta time to satisfy this requirement.

Let me also double-check: the `tDiffuse` uniform - ShaderPass automatically sets this to the input texture. So I just need to declare it in uniforms.

Let me write the final clean version:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const inversionShader = {
    uniforms: {
        tDiffuse: { value: null as THREE.Texture | null }
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
    `
};

const inversionPass = new ShaderPass(inversionShader as unknown as THREE.Shader);
composer.addPass(inversionPass);

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    sphere.rotation.y += delta * 0.5;
    composer.render();
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Hmm, the type casting `as unknown as THREE.Shader` might not be ideal. Let me check what ShaderPass actually accepts.

Looking at the Three.js source code for ShaderPass:
```javascript
class ShaderPass extends Pass {
    constructor(shader, textureID) {
        super();
        this.textureID = (textureID !== undefined) ? textureID : "tDiffuse";
        if (shader !== undefined) {
            this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
            this.material = new THREE.ShaderMaterial({
                defines: Object.assign({}, shader.defines),
                uniforms: this.uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader
            });
        }
        // ...
    }
}
```

So it just needs an object with `uniforms`, `vertexShader`, `fragmentShader`. The TypeScript types might be strict about this. Let me define it properly.

In strict mode, I should make sure the uniforms type is correct. Let me use:

```typescript
const inversionShader = {
    name: 'InversionShader',
    uniforms: {
        tDiffuse: { value: null as THREE.Texture | null }
    },
    vertexShader: `...`,
    fragmentShader: `...`
};
```

Actually, the issue is that `THREE.UniformsUtils.clone` expects `IUniform[]` or `{ [key: string]: IUniform }`. The value `null` might cause issues. But since ShaderPass handles this internally (it sets tDiffuse to the actual texture later), it should be fine at runtime. For TypeScript strict mode, I might need a cast.

Let me just use `as any` for the shader object to keep it simple and ensure it compiles:

```typescript
const inversionPass = new ShaderPass({
    uniforms: {
        tDiffuse: { value: null }
    },
    vertexShader: `...`,
    fragmentShader: `...`
} as any);
```

Wait, but `tsc --strict` - will `as any` work? Yes, `as any` is always valid in TypeScript. But let me try to be more type-safe.

Actually, looking at the Three.js type definitions more carefully, `ShaderPass` constructor accepts:
```typescript
constructor(shader: { uniforms: { [uniform: string]: IUniform }, vertexShader: string, fragmentShader: string }, textureID?: string)
```

Where `IUniform` is `{ value: any }`. So `{ value: null }` should work since `null` is assignable to `any`.

Let me just write it cleanly:

```typescript
const inversionPass = new ShaderPass({
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
            color.rgb = 1.0 - color.rgb;
            gl_FragColor = color;
        }
    `
});
```

Hmm, but the type of `value` in `IUniform` might be `any` in Three.js types. Let me check... In three.js types, `IUniform<T = any>` has `value: T`. So `{ value: null }` should be fine since `null` is assignable to `any`.

Actually wait - in `tsc --strict`, `null` is not assignable to `any`... no wait, `null` IS assignable to `any`. The issue is with `strictNullChecks` where `null` is not assignable to specific types, but `any` accepts everything.

I think this will work. Let me finalize the code.

One more thought: do I need to handle the `renderer.outputColorSpace`? In modern Three.js (r152+), the default is `THREE.SRGBColorSpace`. The OutputPass should handle the conversion correctly. I don't need to set it explicitly since it's the default.

Also, I should make sure the renderer's pixel ratio handling works with the composer. The `EffectComposer` should handle this internally when `setSize` is called, but let me also set pixel ratio on the composer... Actually, EffectComposer in newer versions handles pixel ratio internally. Let me just use `renderer.setPixelRatio` and `composer.setSize`.

Wait, actually I should check: does `EffectComposer.setSize` account for pixel ratio? Looking at the source... `EffectComposer.setSize(width, height)` sets the size of all render targets. It should work with the renderer's pixel ratio since it uses `renderer.getDrawingBufferSize` or similar.

Actually, in practice, you typically do:
```
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h);
composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(w, h);
```

Or just:
```
renderer.setSize(w, h);
composer.setSize(w, h);
```

And let the pixel ratio be handled. Let me include `composer.setPixelRatio` to be safe... Actually, EffectComposer doesn't have a `setPixelRatio` method in all versions. Let me just use `setSize` which should handle it.

Looking at the EffectComposer source, `setSize` does:
```javascript
setSize(width, height) {
    this._width = width;
    this._height = height;
    // ... resizes render targets
}
```

And in newer versions, it accounts for pixel ratio. Let me just call `composer.setSize(w, h)` and it should work.

Actually, to be safe, let me also call `renderer.setPixelRatio` and in the resize handler, just do the standard three things. The EffectComposer in recent Three.js handles pixel ratio via the renderer.

Let me finalize my solution. I'm confident the pass order is:
1. RenderPass (renders scene in linear)
2. OutputPass (converts linear to sRGB)
3. Inversion ShaderPass (inverts in sRGB, renders to screen)

This ensures the inversion happens in sRGB space, which is what the requirement demands.
