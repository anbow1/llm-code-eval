The user wants a TypeScript file that:
1. Creates a Three.js scene with a blue background (0x336699) and a white sphere
2. Uses EffectComposer with RenderPass, a custom ShaderPass that inverts colors, and OutputPass
3. The key challenge: the color inversion must happen BEFORE the linear-to-sRGB conversion, so that the final on-screen colors are the exact inverse of what would be shown without the effect.

Let me think about the color space carefully:

- The scene background is 0x336699. In sRGB, this is the color as specified. In linear space, THREE.Color(0x336699) is stored as linear values. Actually, wait - THREE.Color stores values in linear space when you set them with hex. Let me think...

Actually, THREE.Color(0x336699) - the hex value is interpreted as sRGB values, then converted to linear. So:
- 0x33 = 51/255 ≈ 0.2 → linear ≈ 0.0331
- 0x66 = 102/255 ≈ 0.4 → linear ≈ 0.1329
- 0x99 = 153/255 ≈ 0.6 → linear ≈ 0.3178

Wait, actually in Three.js, `new THREE.Color(0x336699)` - the color is stored in linear space. The hex is interpreted as sRGB and then converted to linear. So the color values in the Color object are linear.

Now, the rendering pipeline:
1. RenderPass renders the scene into the render target (linear space)
2. ShaderPass applies the inversion
3. OutputPass does the linear-to-sRGB conversion (and tone mapping)

So the order matters:
- If we invert in linear space, then the OutputPass converts to sRGB. The final screen color would be sRGB(inverse(linear)).
- Without the effect, the screen would show sRGB(linear).
- For the inversion to be "exact inverse on screen", we need: screen_with_effect = 1.0 - screen_without_effect

So: sRGB(inverse(linear)) should equal 1.0 - sRGB(linear)

But sRGB(x) is NOT linear, so sRGB(1-x) ≠ 1 - sRGB(x) in general.

For example:
- 0x33 in sRGB = 0.2 (approximately). Linear = (0.2/12.92 if < 0.04045, else ((0.2+0.055)/1.055)^2.4)
  - 0.2 > 0.04045, so linear = ((0.255)/1.055)^2.4 ≈ (0.2417)^2.4 ≈ 0.0331
  - 1 - 0.0331 = 0.9669
  - sRGB(0.9669) = 1.055 * 0.9669^(1/2.4) - 0.055 = 1.055 * 0.9737 - 0.055 ≈ 0.969 - 0.055 ≈ 0.914
  - That's 0.914 * 255 ≈ 233 = 0xE9, not 0xCC (204)

So if we invert in linear space, we don't get the exact sRGB inverse.

The requirement says: "the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect."

Without the effect: screen shows sRGB(linear) = the original color (0x336699 appears as 0x336699 on screen).
With the effect: screen should show 1.0 - sRGB(linear) = 1.0 - 0x33/255, 1.0 - 0x66/255, 1.0 - 0x99/255 = 0xCC, 0x99, 0x66 = 0xCC9966.

So the inversion needs to happen in sRGB space, AFTER the linear-to-sRGB conversion.

The pipeline should be:
1. RenderPass (renders in linear)
2. A pass that converts linear to sRGB (the OutputPass does this)
3. Then invert in sRGB space

But wait, OutputPass is the last pass. If we put the inversion after OutputPass, we'd need another pass after it.

Actually, let me reconsider. The OutputPass does:
- Tone mapping
- Linear to sRGB conversion

If we want the inversion to happen in sRGB space, we could:
1. RenderPass (linear)
2. OutputPass (converts to sRGB)
3. Inversion ShaderPass (inverts in sRGB space)

But the requirement says to use "a RenderPass, a custom ShaderPass that inverts colors, and an OutputPass." The order specified is RenderPass, ShaderPass, OutputPass.

Hmm, but the requirement also says "Think about where the linear -> sRGB conversion happens and order the passes (or convert in the shader) so this holds."

So the user is giving me flexibility. Let me think about what order makes the math work:

Option A: RenderPass → ShaderPass (invert in linear) → OutputPass (linear to sRGB)
- Screen = sRGB(1 - linear)
- Without effect: screen = sRGB(linear)
- These are NOT complementary in sRGB space.

Option B: RenderPass → OutputPass (linear to sRGB) → ShaderPass (invert in sRGB)
- Screen = 1 - sRGB(linear)
- Without effect: screen = sRGB(linear)
- These ARE complementary! 1 - sRGB(linear) + sRGB(linear) = 1. ✓

So Option B is correct. We need to put OutputPass BEFORE the inversion shader pass.

But wait, the user says "a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass." This lists them in order, but then says "order the passes (or convert in the shader) so this holds." So I can reorder.

Let me go with: RenderPass → OutputPass → ShaderPass (inversion in sRGB space)

This way:
- RenderPass outputs linear color
- OutputPass converts to sRGB (and does tone mapping, but with default NoToneMapping it's just the sRGB conversion)
- ShaderPass inverts: rgb = 1.0 - rgb (in sRGB space)

For the background 0x336699:
- Linear values are stored in the Color
- After OutputPass: sRGB values = the original hex values (0x33, 0x66, 0x99) → (0.2, 0.4, 0.6)
- After inversion: (0.8, 0.6, 0.4) → 0xCC, 0x99, 0x66 ✓

For the white sphere (0xffffff):
- Linear: (1, 1, 1)
- After OutputPass: sRGB (1, 1, 1)
- After inversion: (0, 0, 0) → black ✓

This works.

Now let me write the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

For the ShaderPass, I need to write a custom shader that inverts colors:

```typescript
const InvertShader = {
  uniforms: {
    tDiffuse: { value: null as unknown as THREE.Texture }
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
```

Wait, I need to be careful with the TypeScript types. The ShaderPass expects a specific shader interface. Let me look at what ShaderPass expects.

ShaderPass constructor takes a shader object with `uniforms`, `vertexShader`, and `fragmentShader`. The uniforms need to be in the format `{ [key: string]: { value: ... } }`.

For strict TypeScript, I need to type things properly.

Let me also make sure the renderer is created and appended to document.body.

Let me write the complete file:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Create sphere
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Create camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Create composer
const composer = new EffectComposer(renderer);

// Pass 1: RenderPass
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Pass 2: OutputPass (linear -> sRGB)
const outputPass = new OutputPass();
composer.addPass(outputPass);

// Pass 3: Inversion ShaderPass (invert in sRGB space)
const invertPass = new ShaderPass({
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
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
});
composer.addPass(invertPass);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
renderer.setAnimationLoop((time) => {
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

Wait, I need to think about the ShaderPass typing. The ShaderPass constructor in Three.js addons expects a specific type. Let me check what the type looks like.

The ShaderPass class expects a `ShaderPassShader` which has:
- `uniforms: { [key: string]: { value: unknown } }`
- `vertexShader: string`
- `fragmentShader: string`

Actually, looking at the Three.js source, ShaderPass's constructor parameter type is:

```typescript
interface ShaderPassShader {
  uniforms: { [key: string]: { value: unknown } };
  vertexShader: string;
  fragmentShader: string;
}
```

In strict mode, `{ value: null }` might be an issue. Let me use `{ value: null as unknown as THREE.Texture }` or just `{ value: null }`.

Actually, in the Three.js addons, the type might be slightly different. Let me just make sure it compiles. The `uniforms` type in ShaderPass is `{ [key: string]: { value: unknown } }`. So `{ value: null }` should work since null is assignable to unknown.

Let me also make sure the `setAnimationLoop` callback parameter is handled. The callback receives a time parameter (DOMHighResPerformanceNow). I don't need to use it since I'm just rendering.

Actually, for the "delta/elapsed time" requirement - the user says "Motion must use delta/elapsed time, not frame counts." But there's no motion in this scene. The sphere is static. So I just need to call composer.render() in the loop. There's no animation to animate. The requirement about delta/elapsed time is about how to handle motion if there were any. Since there's no motion, I just render each frame.

Let me finalize the code. I think it's correct. Let me double-check the color space logic:

1. RenderPass: renders scene in linear space into the render target
2. OutputPass: converts linear to sRGB (this is where the sRGB gamma curve is applied)
3. Invert ShaderPass: inverts the sRGB values

So the background:
- In linear: THREE.Color(0x336699) stores linear values
- After RenderPass: render target has linear values
- After OutputPass: sRGB values (which should be the original hex values since Three.js converts from hex to linear, and OutputPass converts back)
- After Invert: 1 - sRGB values = complement

Yes, this is correct.

One more thing - I should make sure the renderer doesn't do its own output encoding. By default, Three.js renderer has `outputColorSpace = THREE.SRGBColorSpace`. But since we're using EffectComposer, the renderer renders to a float/half-float render target in linear space, and the OutputPass handles the sRGB conversion. The renderer's output encoding setting shouldn't matter for the composer's internal render targets.

Actually, I should set `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` or just leave it as default. When using EffectComposer, the render targets are in linear space, and the OutputPass handles the conversion. The final output to screen... hmm, actually the last pass of the composer renders to the screen. If the last pass is the ShaderPass (inversion), it renders to the screen directly. The OutputPass already converted to sRGB, and the inversion is in sRGB space, so the final output is already in sRGB. The renderer's outputColorSpace setting might affect the final blit to screen.

Wait, let me think about this more carefully. In Three.js, when using EffectComposer:
- Internal render targets are linear (float or half-float)
- The last pass renders to the screen (the default framebuffer)
- The renderer's `outputColorSpace` determines how the final blit works

If `outputColorSpace = SRGBColorSpace` (default), the renderer expects the final pass output to be in linear space and will do the sRGB conversion when blitting to screen. But if our last pass is already in sRGB space (after OutputPass + inversion), we'd get a double conversion.

Hmm, this is tricky. Let me think...

Actually, in modern Three.js (r150+), the EffectComposer's render targets use `type: THREE.HalfFloatType` and the color space is linear. The OutputPass performs the linear-to-sRGB conversion. After OutputPass, the data is in sRGB space.

When the final pass renders to the screen, the renderer's `outputColorSpace` matters. If it's `SRGBColorSpace`, the renderer will assume the data is linear and apply the sRGB transfer function again. This would be wrong.

To avoid this, I should set `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` so the renderer doesn't apply any additional color space conversion when blitting to screen.

Wait, actually let me reconsider. In Three.js r152+:
- `renderer.outputColorSpace` defaults to `THREE.SRGBColorSpace`
- When rendering to the default framebuffer (screen), if `outputColorSpace` is `SRGBColorSpace`, the renderer applies the linear-to-sRGB transfer function
- When rendering to a render target (like EffectComposer's internal targets), no color space conversion is applied

So the pipeline with EffectComposer:
1. RenderPass → renders to composer's internal target (linear, no conversion)
2. OutputPass → converts linear to sRGB in the shader, writes to next target
3. InvertPass → inverts sRGB values, writes to... the screen (default framebuffer)

When the InvertPass writes to the screen, the renderer sees `outputColorSpace = SRGBColorSpace` and will apply the sRGB transfer function to the data it's about to write. But the data is already in sRGB space! This would cause a double conversion.

To fix this, I should set `renderer.outputColorSpace = THREE.LinearSRGBColorSpace`. This tells the renderer that the data going to the screen is already in the correct format (sRGB), so no additional conversion is needed.

Actually wait, I need to double-check. Let me look at how Three.js handles this.

In Three.js, when the final pass of the composer renders to the screen:
- The shader outputs values
- The renderer blits to the default framebuffer
- If `outputColorSpace` is `SRGBColorSpace`, the GPU does the linear-to-sRGB conversion via the framebuffer's color space

Hmm, actually I think in WebGL, the sRGB conversion happens at the framebuffer level. If the default framebuffer is marked as sRGB (which it is by default in most browsers), the GPU applies the gamma curve to values written to it.

But Three.js handles this through `outputColorSpace`. If it's `SRGBColorSpace`, Three.js adds the sRGB transfer function to the shader output. If it's `LinearSRGBColorSpace`, it doesn't.

So for our pipeline:
- After OutputPass: data is in sRGB space
- InvertPass: inverts sRGB data, output is in sRGB space
- Blit to screen: if `outputColorSpace = SRGBColorSpace`, the renderer will apply sRGB transfer → WRONG (double conversion)
- If `outputColorSpace = LinearSRGBColorSpace`, no additional conversion → CORRECT

So I should set `renderer.outputColorSpace = THREE.LinearSRGBColorSpace`.

Wait, but actually I'm not 100% sure about the WebGL framebuffer behavior. Let me think differently.

In Three.js, the `outputColorSpace` property controls whether the final fragment shader output gets the sRGB transfer function applied. For render targets, it's always linear. For the default framebuffer (screen), it depends on `outputColorSpace`.

If I set `renderer.outputColorSpace = THREE.LinearSRGBColorSpace`:
- The final pass's output is written to the screen without any additional color space conversion
- Since our data is already in sRGB space (after OutputPass + inversion), this is correct

If I leave it as `THREE.SRGBColorSpace` (default):
- The final pass's output gets the sRGB transfer function applied
- Our data is already in sRGB space, so we'd get sRGB(sRGB(linear)) → WRONG

So yes, I need `renderer.outputColorSpace = THREE.LinearSRGBColorSpace`.

Let me update the code.

Actually, I want to double-check: does the OutputPass in recent Three.js versions actually do the linear-to-sRGB conversion? Let me recall...

OutputPass (introduced around r152) does:
1. Tone mapping (if `renderer.toneMapping` is set)
2. Linear to sRGB conversion

Yes, it does the sRGB conversion. So after OutputPass, the data is in sRGB space.

OK so my plan is:
1. `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` (to prevent double conversion)
2. RenderPass → OutputPass → InvertShaderPass

This should give the correct result.

Let me write the final code now.

Hmm, one more consideration: the `renderer.toneMapping` default is `THREE.NoToneMapping`, so OutputPass won't do any tone mapping. Good.

Let me write it out:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const renderer = new THREE.WebGLRenderer();
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const invertPass = new ShaderPass({
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
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `,
});
composer.addPass(invertPass);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
renderer.setAnimationLoop(() => {
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Wait, I need to check if `tDiffuse: { value: null }` will cause a TypeScript error in strict mode. The ShaderPass type for uniforms is `{ [key: string]: { value: unknown } }`. `null` is assignable to `unknown`, so it should be fine.

Actually, let me check the exact type of ShaderPass. Looking at the Three.js source:

```typescript
class ShaderPass {
  constructor(shader: ShaderPassShader, texturePassthrough: boolean)
}
```

Where `ShaderPassShader` is:
```typescript
interface ShaderPassShader {
  uniforms: { [key: string]: { value: unknown } };
  vertexShader: string;
  fragmentShader: string;
}
```

So `{ value: null }` should work since `null` is assignable to `unknown`.

Let me also make sure I'm not missing any `this` or typing issues. The code looks clean.

One more thing: the `setAnimationLoop` callback. The signature is `(time: DOMHighResPerformanceNow) => void`. I'm not using the time parameter, which is fine - I can just use `() => { ... }`.

I think this is correct. Let me finalize.
