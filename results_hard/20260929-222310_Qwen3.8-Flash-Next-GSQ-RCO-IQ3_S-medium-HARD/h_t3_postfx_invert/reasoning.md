The user wants a post-processing color-inversion effect with correct color space handling.

Let me think carefully about the color space issue:

1. The scene background is 0x336699. In sRGB, this is (0.2, 0.4, 0.6).
2. The white sphere is 0xffffff in sRGB, which is (1, 1, 1).
3. The desired output: background should appear as 0xcc9966 (which is (0.8, 0.6, 0.4) in sRGB), and the sphere should appear black (0, 0, 0) in sRGB.

The key insight: THREE.js by default uses linear color space internally for rendering. When `renderer.outputColorSpace = THREE.SRGBColorSpace` (default in modern Three.js), the renderer converts linear colors to sRGB on output.

The rendering pipeline without post-processing:
- Scene colors are stored in sRGB (MeshBasicMaterial color 0xffffff is interpreted as sRGB)
- Three.js converts them to linear for rendering (0xffffff sRGB -> 1.0 linear)
- The background 0x336699 sRGB -> linear space rendering
- OutputPass (or renderer) converts linear back to sRGB for display

Wait, let me think more carefully. With EffectComposer:
- RenderPass renders to a render target. The render target by default has linear color space.
- The scene background color 0x336699: when set as scene.background, Three.js will convert it to linear space when rendering.
- The sphere with MeshBasicMaterial color 0xffffff: also converted to linear.
- OutputPass applies the sRGB encoding (linear -> sRGB) as the final step.

So the pipeline is:
1. RenderPass: renders scene in linear color space. Background 0x336699 (sRGB input) -> converted to linear internally. In linear space, 0x336699 becomes approximately (0.0331, 0.1329, 0.2918) (sRGB to linear conversion). The white sphere becomes (1, 1, 1) in linear.

2. My ShaderPass (color inversion): operates on whatever is in the render target. If the render target is linear, then inverting linear values won't give us the right result.

The requirement is:
- Background sRGB 0x336699 should appear as sRGB 0xcc9966 on screen.
- 0x336699 inverted in sRGB: (1-0.2, 1-0.4, 1-0.6) = (0.8, 0.6, 0.4) = 0xcc9966. ✓
- White 0xffffff inverted in sRGB: (0, 0, 0) = black. ✓

So the inversion must happen in sRGB space, not linear space.

Options:
A) Do the inversion in the render target in linear space, then OutputPass converts to sRGB. But inverting in linear space: linear(0x336699) ≈ (0.0331, 0.1329, 0.2918). Inverted: (0.9669, 0.8671, 0.7082). Then OutputPass converts to sRGB: approximately (0.986, 0.946, 0.868) = roughly 0xfbf1dd. That's NOT 0xcc9966.

B) Do the inversion AFTER the sRGB conversion. But OutputPass is the last pass that does sRGB conversion. So I'd need to:
   - OutputPass first (linear -> sRGB)
   - Then my inversion shader (inverts in sRGB space)

Wait, but that means the final output is in sRGB already. Then the renderer won't double-convert because the composer's final output goes directly to the screen.

Actually, let me reconsider the Three.js EffectComposer pipeline:

With EffectComposer, the render targets between passes store linear values (by default, the render target's colorSpace is LinearSRGBColorSpace). The OutputPass is the one that applies the final linear->sRGB gamma encoding.

So the order matters:
- RenderPass -> RenderTarget (linear)
- My ShaderPass -> RenderTarget (linear)
- OutputPass -> Screen (sRGB encoded)

If I do inversion in the linear-space render target, then OutputPass applies sRGB encoding. The result won't be a simple sRGB inversion.

To get the correct result (inversion in sRGB space), I need to:
1. First convert to sRGB, then invert in sRGB space.

Option 1: Put OutputPass BEFORE my inversion shader, then the final pass (my shader) outputs directly to screen. But wait, if OutputPass is not the last pass, what happens? The OutputPass applies sRGB encoding and writes to the next render target. Then my shader inverts those sRGB values. Then the final render target goes to screen. But does the renderer apply another sRGB conversion on the final pass?

Actually, in Three.js's EffectComposer, the last pass renders to the screen (null render target). The renderer's `outputColorSpace` setting affects whether it does a color space conversion on the final blit. But in the composer, the final pass writes directly to the canvas via a full-screen quad. The renderer's outputColorSpace setting is used by the OutputPass specifically.

Let me look at how OutputPass works: it takes the linear render target and applies sRGB encoding (gamma 2.2 approximation or exact sRGB curve), then writes to the output. If OutputPass is not the last pass, it still writes to the next render target with the sRGB-encoded values.

But here's the issue: if the final render target (after OutputPass) has values in sRGB, and then another pass reads from it and writes to screen, does the screen show those values correctly? The canvas is in sRGB by default. So if the values are already in sRGB, they should display correctly without further conversion.

Wait, but there's a subtlety. The ShaderPass reads the texture from the previous render target. If the render target was written by OutputPass (which stored sRGB values), and the shader just passes through or modifies those values, the final output to screen should show them correctly because the screen is sRGB.

Actually, I need to be more careful. Let me think about what `renderer.outputColorSpace` does in the context of EffectComposer:

In newer Three.js, the EffectComposer's internal render targets have `colorSpace` property. The OutputPass specifically reads the `renderer.outputColorSpace` setting. If it's SRGBColorSpace, it applies the sRGB transfer function.

The key question: if I put OutputPass before my inversion shader, will the values be correctly displayed?

Let me try another approach: do the inversion in sRGB space within my shader:

In my shader:
1. Read the linear value from the previous pass
2. Apply sRGB encoding (linear -> sRGB)
3. Invert in sRGB space (1 - rgb)
4. Apply sRGB decoding (sRGB -> linear) to get the result back in linear
5. Then OutputPass will convert linear -> sRGB for display

Let's verify: Background 0x336699 in sRGB = (0.2, 0.4, 0.6).
- In RenderPass, it's stored as linear: approximately (0.0331, 0.1329, 0.2918)
- My shader: sRGB encode -> (0.2, 0.4, 0.6), invert -> (0.8, 0.6, 0.4), sRGB decode -> linear
- OutputPass: sRGB encode -> (0.8, 0.6, 0.4) = 0xcc9966. ✓

White sphere: sRGB (1,1,1) -> linear (1,1,1)
- My shader: sRGB encode -> (1,1,1), invert -> (0,0,0), sRGB decode -> (0,0,0)
- OutputPass: sRGB encode -> (0,0,0) = black. ✓

This works! So my shader should:
1. Convert input from linear to sRGB
2. Invert in sRGB space
3. Convert back to linear (so OutputPass can then convert to sRGB for display)

This is the cleanest approach that keeps the pass order as: RenderPass -> ShaderPass -> OutputPass.

Let me write the sRGB encode/decode functions in GLSL:

sRGB to linear: if c <= 0.04045, c/12.92, else ((c+0.055)/1.055)^2.4
Linear to sRGB: if c <= 0.0031308, c*12.92, else 1.055*c^(1/2.4) - 0.055

Now let me write the complete TypeScript file:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Let me make sure I handle the color space correctly. In Three.js r152+, the default `renderer.outputColorSpace` is `THREE.SRGBColorSpace`. The OutputPass reads this and applies the appropriate conversion.

Let me also make sure the render targets in the composer use the correct color space. By default, EffectComposer creates render targets with `LinearSRGBColorSpace`. The OutputPass will then apply the sRGB encoding.

Let me write the full solution:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
sphere.position.set(0, 0, 0);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Custom shader for color inversion in sRGB space
const InvertShader = {
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

    vec3 sRGBToLinear(vec3 srgb) {
      return mix(
        srgb / 12.92,
        pow((srgb + 0.055) / 1.055, vec3(2.4)),
        step(vec3(0.04045), srgb)
      );
    }

    vec3 linearToSRGB(vec3 linear) {
      return mix(
        linear * 12.92,
        1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055,
        step(vec3(0.0031308), linear)
      );
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      // Input is in linear space, convert to sRGB
      vec3 srgb = linearToSRGB(texel.rgb);
      // Invert in sRGB space
      vec3 inverted = 1.0 - srgb;
      // Convert back to linear for OutputPass
      vec3 linearInverted = sRGBToLinear(inverted);
      gl_FragColor = vec4(linearInverted, texel.a);
    }
  `,
};

// Composer setup
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
  composer.render();
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Wait, I need to double-check the sRGB encode/decode in the shader. The `step` function returns 0 or 1, and `mix` with 0/1 selector picks between the two branches. Let me verify:

`step(edge, x)` returns 0 if x < edge, 1 if x >= edge.

For sRGBToLinear: if srgb <= 0.04045, use srgb/12.92; else use ((srgb+0.055)/1.055)^2.4
- `step(vec3(0.04045), srgb)` returns 0 when srgb < 0.04045, 1 when srgb >= 0.04045
- `mix(a, b, t)` returns a*(1-t) + b*t
- So when t=0 (srgb < 0.04045): returns a = srgb/12.92 ✓
- When t=1 (srgb >= 0.04045): returns b = pow(...) ✓

For linearToSRGB: if linear <= 0.0031308, use linear*12.92; else use 1.055*linear^(1/2.4) - 0.055
- `step(vec3(0.0031308), linear)` returns 0 when linear < 0.0031308, 1 when linear >= 0.0031308
- `mix(linear*12.92, 1.055*pow(linear, vec3(1.0/2.4)) - 0.055, step(...))`
- When t=0: returns linear*12.92 ✓
- When t=1: returns 1.055*pow(...) - 0.055 ✓

Looks correct.

One concern: `pow` with vec3 exponent in GLSL. Let me make sure `pow((srgb + 0.055) / 1.055, vec3(2.4))` is valid GLSL. In GLSL, `pow(vec3, vec3)` is not standard - actually, `pow` can take `vec3, float` or `float, float`. Let me fix this.

Actually in GLSL ES (which WebGL uses), `pow(vec3 x, float y)` is valid. But `pow(vec3, vec3)` is NOT valid in GLSL ES 1.0 (WebGL 1). In GLSL ES 3.0 (WebGL 2), it is valid.

Since Three.js uses WebGL 2 by default in recent versions, `pow(vec3, vec3)` should be fine. But to be safe, let me use the float version: `pow((srgb + 0.055) / 1.055, 2.4)` - wait, can I pass a float as the second arg to pow when the first is vec3? Yes, GLSL allows `pow(vec3, float)`.

Let me use `pow((srgb + 0.055) / 1.055, 2.4)` and `pow(linear, 1.0/2.4)`.

Actually, in GLSL ES, `pow(vec3, float)` is valid - it applies the scalar power to each component. Let me use that.

Hmm, but actually checking the Three.js source for OutputPass, it uses a lookup-based approach or the exact formula. Let me just make sure my shader is correct.

Also, I should make sure the `mix` with `step` works correctly for vectors. In GLSL, `mix(vec3, vec3, vec3)` is valid where the third argument is a vec3 of 0s and 1s. Yes, this is valid.

Let me also consider: should I use `smoothstep` instead? No, the exact step at the breakpoints is correct for the piecewise sRGB formula.

One more thing: the `step` comparison. For sRGBToLinear, the condition is:
- if value <= 0.04045: linear = value / 12.92
- else: linear = ((value + 0.055) / 1.055) ^ 2.4

`step(0.04045, srgb)` returns 1 when srgb >= 0.04045. So:
- mix(srgb/12.92, pow(...), step(0.04045, srgb))
- When srgb < 0.04045: step returns 0, mix picks first arg = srgb/12.92 ✓
- When srgb >= 0.04045: step returns 1, mix picks second arg = pow(...) ✓



For linearToSRGB:
- if value <= 0.0031308: srgb = value * 12.92
- else: srgb = 1.055 * value^(1/2.4) - 0.055

`step(0.0031308, linear)` returns 1 when linear >= 0.0031308.
- mix(linear*12.92, 1.055*pow(linear, 1.0/2.4)-0.055, step(0.0031308, linear))
- When linear < 0.0031308: step=0, picks linear*12.92 ✓
- When linear >= 0.0031308: step=1, picks 1.055*pow(...) ✓



Now let me also make sure the `name` property is needed. Looking at the Three.js ShaderPass source, it uses the shader object's uniforms, vertexShader, and fragmentShader. The `name` property isn't strictly required but is good practice.

I think my solution is complete and correct. Let me finalize it.

Actually, wait - I should double check: does Three.js's `scene.background = new THREE.Color(0x336699)` treat this color as sRGB and convert to linear internally when rendering? 

In Three.js r152+, colors are treated as being in sRGB space by default. When rendering, they get converted to linear space. So yes, 0x336699 (sRGB) gets converted to linear before being stored in the render target.

And `MeshBasicMaterial({ color: 0xffffff })` - the color 0xffffff in sRGB is (1,1,1), which in linear is also (1,1,1). So that's straightforward.

Let me verify the full pipeline for the background:
1. Scene background: 0x336699 (sRGB) → internally stored as sRGB Color
2. RenderPass renders to linear render target: converts sRGB to linear
   - 0x336699 sRGB = (51/255, 102/255, 153/255) = (0.2, 0.4, 0.6)
   - Linear: sRGBToLinear(0.2) ≈ 0.0331, sRGBToLinear(0.4) ≈ 0.1329, sRGBToLinear(0.6) ≈ 0.2918
3. My ShaderPass:
   - linearToSRGB(0.0331) ≈ 0.2, linearToSRGB(0.1329) ≈ 0.4, linearToSRGB(0.2918) ≈ 0.6
   - Invert: (0.8, 0.6, 0.4)
   - sRGBToLinear(0.8) ≈ 0.6038, sRGBToLinear(0.6) ≈ 0.2918, sRGBToLinear(0.4) ≈ 0.1329
4. OutputPass: linearToSRGB
   - linearToSRGB(0.6038) ≈ 0.8, linearToSRGB(0.2918) ≈ 0.6, linearToSRGB(0.1329) ≈ 0.4
   - Result in sRGB: (0.8, 0.6, 0.4) = 0xcc9966 ✓

For the white sphere:
1. Color: 0xffffff sRGB = (1,1,1)
2. Linear: (1,1,1)
3. My shader: linearToSRGB(1,1,1) = (1,1,1), invert = (0,0,0), sRGBToLinear(0,0,0) = (0,0,0)
4. OutputPass: linearToSRGB(0,0,0) = (0,0,0) → black ✓

The solution is correct.

One more thing to check: I need to make sure the `InvertShader` object type is compatible with `ShaderPass`. The `ShaderPass` constructor expects an object with `uniforms`, `vertexShader`, `fragmentShader`. Let me type it properly for TypeScript strict mode.

Actually, looking at the ShaderPass type definition, it expects a `Shader` type which has:
```
uniforms: { [uniform: string]: IUniform }
vertexShader: string
fragmentShader: string
```

Let me make sure my object conforms. The `tDiffuse` uniform value is `null` initially (ShaderPass will assign the texture). I need to type it properly.

Let me use `as` or proper typing. Actually, for strict TypeScript, I might need to type the uniforms carefully. Let me just use a plain object and cast if needed.

Actually, looking at Three.js types, `IUniform` is `{ value: any }`. So `{ value: null }` should work since `null` is assignable to `any`... actually no, `any` accepts null. Wait, `{ value: null as THREE.Texture | null }` - the IUniform type uses `any` for value, so this should be fine.

Hmm, but with strict mode, let me be careful. The ShaderPass constructor parameter type is `Shader` from three. Let me check what that looks like in @types/three or three's own types.

In recent Three.js, the types are built-in. The `Shader` interface:
```ts
interface Shader {
  uniforms: { [uniform: string]: IUniform };
  vertexShader: string;
  fragmentShader: string;
  name?: string;
}
```

Where `IUniform` is `{ value: any }`. So my shader object should be fine as long as the uniform has a `value` property.

Let me also make sure `name` being present doesn't cause issues - it's optional, so it's fine.

I think the code is ready. Let me write the final version.
