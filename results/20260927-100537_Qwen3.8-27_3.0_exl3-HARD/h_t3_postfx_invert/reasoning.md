Let me think carefully about this problem.

The key challenge is getting the color inversion to work correctly with the color space.

Let me trace through the rendering pipeline:

1. **Without post-processing:**
   - Scene background: 0x336699 (sRGB)
   - Sphere: white (0xffffff, sRGB)
   - Three.js converts sRGB colors to linear working space
   - Renders in linear
   - The OutputPass (or the default renderer) converts linear back to sRGB for display
   - So on screen: background appears as 0x336699, sphere appears as 0xffffff

2. **With post-processing (EffectComposer):**
   - EffectComposer renders to a render target (texture)
   - RenderPass renders the scene into the render target
   - ShaderPass applies the inversion
   - OutputPass handles the final color space conversion (linear -> sRGB)

The critical question: what color space is the data in the render target?

In Three.js with EffectComposer:
- The render target typically uses `LinearSRGBColorSpace` (or no color space conversion)
- RenderPass renders the scene into the render target in linear color space
- ShaderPass operates on the linear values
- OutputPass converts from linear to sRGB

So the flow is:
1. RenderPass: scene is rendered in linear space into the render target
   - Background 0x336699 in sRGB -> converted to linear in the shader -> stored in render target as linear
   - White sphere 0xffffff in sRGB -> converted to linear (1.0, 1.0, 1.0) -> stored in render target as linear

2. ShaderPass (inversion): inverts the linear values
   - Background: linear values of 0x336699 inverted
   - Sphere: (1.0, 1.0, 1.0) -> (0.0, 0.0, 0.0) = black ✓

3. OutputPass: converts linear to sRGB
   - Background: inverted linear -> sRGB
   - Sphere: (0.0, 0.0, 0.0) -> (0.0, 0.0, 0.0) = black ✓

Now let's verify the background:
- 0x336699 in sRGB: R=0x33/255=0.2, G=0x66/255=0.4, B=0x99/255=0.6
- Linear: R = (0.2/12.92) if <= 0.04045, else ((0.2+0.055)/1.055)^2.4
  - 0.2 > 0.04045, so ((0.2+0.055)/1.055)^2.4 = (0.255/1.055)^2.4 = (0.24171)^2.4
  - Let me compute: 0.24171^2.4... ln(0.24171) = -1.420, * 2.4 = -3.408, e^(-3.408) = 0.0331
  - G: ((0.4+0.055)/1.055)^2.4 = (0.455/1.055)^2.4 = (0.43128)^2.4
  - ln(0.43128) = -0.841, * 2.4 = -2.018, e^(-2.018) = 0.133
  - B: ((0.6+0.055)/1.055)^2.4 = (0.655/1.055)^2.4 = (0.62085)^2.4
  - ln(0.62085) = -0.4767, * 2.4 = -1.144, e^(-1.144) = 0.3186

- Inverted linear: R = 1-0.0331 = 0.9669, G = 1-0.133 = 0.867, B = 1-0.3186 = 0.6814

- Back to sRGB:
  - R: 0.9669 > 0.0031308, so (1.055 * 0.9669^(1/2.4) - 0.055)
  - 0.9669^(1/2.4): ln(0.9669) = -0.0336, /2.4 = -0.014, e^(-0.014) = 0.9861
  - 1.055 * 0.9861 - 0.055 = 1.0403 - 0.055 = 0.9853 -> 0x9853... that's not 0xcc9966

Hmm, so inverting in linear space does NOT give us the exact sRGB inverse.

0xcc9966: R=0xcc/255=0.8, G=0x99/255=0.6, B=0x66/255=0.4

So the requirement is that the screen shows the sRGB inverse. That means:
- Screen without effect: 0x336699
- Screen with effect: 0xcc9966 (which is 1.0 - 0x336699 in sRGB)

So the inversion needs to happen in sRGB space, not linear space.

How to achieve this:

Option 1: Do the inversion in the shader, but convert linear to sRGB first, invert, then... but then OutputPass would convert again.

Option 2: Place the ShaderPass BEFORE the OutputPass, but make the shader work in sRGB.

Wait, let me reconsider the pipeline:

With EffectComposer:
- RenderPass renders to a render target. The render target in EffectComposer uses `LinearSRGBColorSpace` by default (actually, let me think... In newer Three.js, the render target might use `NoColorSpace` or `LinearSRGBColorSpace`).

Actually, in Three.js, when you use EffectComposer:
- The scene is rendered with the renderer's output color space settings
- But when rendering to a render target (not the canvas), the color space conversion is different

Let me think about this more carefully. In Three.js:
- `renderer.outputColorSpace = THREE.SRGBColorSpace` (default)
- When rendering to the canvas (default framebuffer), the final output is converted to sRGB
- When rendering to a render target, the output is in linear space (no sRGB conversion)

So in EffectComposer:
1. RenderPass: renders scene to render target in LINEAR space
   - Background 0x336699 sRGB -> linear in the fragment shader
   - Sphere white -> linear (1,1,1)

2. ShaderPass: operates on LINEAR values
   - If we just do `1.0 - rgb`, we invert in linear space
   - This does NOT give us the sRGB inverse

3. OutputPass: converts linear to sRGB

So to get the correct sRGB inverse, I need to:
- In the ShaderPass, first convert linear to sRGB, then invert, then convert back to linear (so OutputPass can then convert to sRGB correctly)

OR:
- In the ShaderPass, convert linear to sRGB, invert in sRGB, and then the OutputPass should NOT do another conversion.

Wait, let me think again. If I:
1. In shader: linear -> sRGB, invert sRGB -> get sRGB inverted
2. OutputPass: sRGB -> ... no, OutputPass expects linear input and outputs sRGB.

Hmm, let me reconsider.

Actually, the cleanest approach:

In the ShaderPass, I need to:
1. Take the linear color from the render target
2. Convert it to sRGB (linear-to-sRGB)
3. Invert: `1.0 - srgb_color`
4. Convert back to linear (sRGB-to-linear) so that OutputPass can properly convert to sRGB

Wait, but that's circular. If I convert linear->sRGB, invert, then sRGB->linear, then OutputPass does linear->sRGB, the net effect is:
- linear -> sRGB -> invert -> sRGB->linear -> (OutputPass) linear->sRGB
- The final result is the sRGB inverse. ✓

Let me verify:
- Background linear: (0.0331, 0.133, 0.3186)
- Convert to sRGB: (0.2, 0.4, 0.6) = 0x336699 ✓
- Invert: (0.8, 0.6, 0.4) = 0xcc9966 ✓
- Convert to linear: (some linear values)
- OutputPass converts to sRGB: (0.8, 0.6, 0.4) = 0xcc9966 ✓

For the sphere:
- Linear: (1, 1, 1)
- Convert to sRGB: (1, 1, 1)
- Invert: (0, 0, 0)
- Convert to linear: (0, 0, 0)
- OutputPass: (0, 0, 0) = black ✓

So the shader needs to:
1. Linear to sRGB conversion
2. Invert
3. sRGB to linear conversion

The GLSL for linear to sRGB:
```glsl
vec3 linearToSrgb(vec3 c) {
    vec3 r = c * 12.92;
    vec3 g = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
    return mix(r, g, step(0.0031308, c));
}
```

And sRGB to linear:
```glsl
vec3 srgbToLinear(vec3 c) {
    vec3 r = c / 12.92;
    vec3 g = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(r, g, step(0.04045, c));
}
```

Wait, I need to be careful with the step function. Let me use the standard formulas:

Linear to sRGB:
- if c <= 0.0031308: srgb = c * 12.92
- else: srgb = 1.055 * c^(1/2.4) - 0.055

sRGB to linear:
- if c <= 0.04045: linear = c / 12.92
- else: linear = ((c + 0.055) / 1.055)^2.4

In GLSL, I can use `mix` with `step`:

```glsl
vec3 linearToSrgb(vec3 c) {
    vec3 low = c * 12.92;
    vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
    return mix(low, high, step(0.0031308, c));
}

vec3 srgbToLinear(vec3 c) {
    vec3 low = c / 12.92;
    vec3 high = pow(max((c + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
    return mix(low, high, step(0.04045, c));
}
```

Now let me write the complete file.

Actually wait - I need to double-check: does Three.js's EffectComposer render target use linear color space?

In Three.js, when `renderer.outputColorSpace = THREE.SRGBColorSpace` (default), and you render to a render target:
- The renderer checks if the render target's texture has a color space
- By default, `WebGLRenderTarget` textures have `colorSpace = THREE.NoColorSpace` (or `LinearSRGBColorSpace` in newer versions)
- When rendering to a render target with linear/no color space, the renderer does NOT apply the sRGB conversion

So yes, the render target contains linear values. The OutputPass then applies the linear-to-sRGB conversion.

Let me also make sure about the OutputPass. In Three.js, `OutputPass` from 'three/addons/postprocessing/OutputPass.js' handles:
- Color space conversion (linear to sRGB)
- Tone mapping
- It reads `renderer.outputColorSpace` and `renderer.toneMapping`

So the pipeline is:
1. RenderPass -> renders scene in linear to render target
2. ShaderPass -> I convert linear->sRGB, invert, sRGB->linear
3. OutputPass -> converts linear->sRGB for final display

This should work correctly.

Let me write the code now.

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Sphere
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Custom inversion shader
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
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    
    vec3 linearToSrgb(vec3 c) {
      vec3 low = c * 12.92;
      vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(low, high, step(0.0031308, c));
    }
    
    vec3 srgbToLinear(vec3 c) {
      vec3 low = c / 12.92;
      vec3 high = pow(max((c + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
      return mix(low, high, step(0.04045, c));
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 linear = color.rgb;
      vec3 srgb = linearToSrgb(linear);
      vec3 inverted = 1.0 - srgb;
      vec3 result = srgbToLinear(inverted);
      gl_FragColor = vec4(result, color.a);
    }
  `,
};

const inversionPass = new ShaderPass(InversionShader);
composer.addPass(inversionPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

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
let ready = false;
renderer.setAnimationLoop(() => {
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to check: does `tsc --strict` compile this? Let me think about potential issues:

1. The `InversionShader` object - the uniforms type. `tDiffuse` value is `null` initially but ShaderPass will set it. The type should be fine.

2. The `step` function in GLSL with vec3 - actually, `step` in GLSL works component-wise for vec3. `step(0.0031308, c)` where c is vec3 - this should work as `step(float, vec3)` returns vec3. Yes, that's valid GLSL.

3. The `max(c, vec3(0.0))` - this is fine, prevents negative values from pow.

4. TypeScript strict mode: Let me check all types are correct.

Actually, let me reconsider the `InversionShader` type. The `ShaderPass` constructor expects a `Shader` object. In Three.js types, it's:

```typescript
interface Shader {
  uniforms: { [uniform: string]: IUniform };
  vertexShader: string;
  fragmentShader: string;
}
```

And `IUniform` is `{ value: any }`. So `null as THREE.Texture | null` should be fine since `value` is `any`.

Actually, let me just use `null` for the initial value since the type is `any`:

```typescript
uniforms: {
  tDiffuse: { value: null },
},
```

This should work with strict mode since `value` is typed as `any`.

Let me also make sure the `step` function usage is correct. In GLSL:
- `step(edge, x)` - returns 0.0 if x < edge, 1.0 if x >= edge
- For vec3: `step(0.0031308, c)` - this is `step(float, vec3)` which is valid and returns vec3

Actually wait, I should double-check: in GLSL, `step` with a scalar edge and vector x is valid. Yes, it is.

Let me also consider: the `pow` function with vec3 - `pow(vec3, vec3)` is valid in GLSL.

I think the code is correct. Let me finalize it.

One more thought: the `max(c, vec3(0.0))` in the linearToSrgb - this is to prevent `pow` of negative numbers (which would give NaN). Since the input should be valid linear colors (0 to 1), this is just a safety measure.

Similarly in srgbToLinear, `max((c + 0.055) / 1.055, vec3(0.0))` prevents negative values.

I'm satisfied with the solution. Let me write the final version.
