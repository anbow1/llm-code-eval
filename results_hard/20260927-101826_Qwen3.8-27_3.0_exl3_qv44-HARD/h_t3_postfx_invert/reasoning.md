Let me think carefully about this problem.

The key challenge: We need the final on-screen colors to be the exact inverse of what would appear without the effect.

Without the effect:
- Background 0x336699 → in linear space this is approximately (0.035, 0.145, 0.329) in linear, but on screen it would appear as the sRGB values (0x33, 0x66, 0x99) = (51/255, 102/255, 153/255) = (0.2, 0.4, 0.6)
- White sphere 0xffffff → appears as white (1, 1, 1) on screen

With the effect, we want:
- Background to appear as 0xcc9966 = (204/255, 153/255, 102/255) = (0.8, 0.6, 0.4)
- White sphere to appear as black (0, 0, 0)

So the inversion should happen in sRGB space (the display space), not in linear space.

Now, how does Three.js handle color space in post-processing?

In Three.js with the default color management:
1. The scene is rendered in linear color space into the render target
2. The RenderPass renders the scene into the composer's render target (linear)
3. If we put our ShaderPass after RenderPass, it operates on linear values
4. The OutputPass does the linear → sRGB conversion at the end

So if we invert in linear space and then convert to sRGB, we won't get the correct result.

Let me think about this more carefully:

- 0x336699 in sRGB: (0.2, 0.4, 0.6)
- In linear: (0.2^2.2 ≈ 0.0315, 0.4^2.2 ≈ 0.133, 0.6^2.2 ≈ 0.328) approximately

If we invert in linear: (1-0.0315, 1-0.133, 1-0.328) = (0.9685, 0.867, 0.672)
Then convert to sRGB: (0.9685^(1/2.2), 0.867^(1/2.2), 0.672^(1/2.2)) ≈ (0.986, 0.93, 0.83)
That's approximately 0xf9edd4, NOT 0xcc9966.

If we invert in sRGB: (1-0.2, 1-0.4, 1-0.6) = (0.8, 0.6, 0.4) = 0xcc9966. ✓

So the inversion must happen AFTER the linear→sRGB conversion.

Options:
1. Put the OutputPass BEFORE the ShaderPass (inversion). But then the ShaderPass would output sRGB values, and the final output would be sRGB. But wait, the OutputPass is supposed to be the last pass...

Actually, let me reconsider the pipeline:

Option A: RenderPass → ShaderPass (inverts in linear) → OutputPass (linear→sRGB)
This gives wrong results as shown above.

Option B: RenderPass → OutputPass (linear→sRGB) → ShaderPass (inverts in sRGB)
This would work! The OutputPass converts to sRGB, then our shader inverts the sRGB values. The final output is already in sRGB (no further conversion needed).

But wait - does the OutputPass do anything else? In Three.js, OutputPass handles:
- Linear to sRGB conversion
- Tone mapping (if set)
- Color space conversion

If we put OutputPass before our ShaderPass, the ShaderPass receives sRGB values and outputs sRGB values. The final output to screen is sRGB. This should work!

But actually, let me reconsider. The OutputPass in Three.js is designed to be the LAST pass. If we put it in the middle, will it work correctly?

Looking at the OutputPass implementation, it's a ShaderPass that:
1. Applies tone mapping
2. Converts from linear to sRGB (or whatever the renderer's output color space is)

If we put it before our inversion pass, it will convert linear→sRGB, then our pass inverts. The final buffer is in sRGB. The renderer outputs it directly to screen. This should be correct.

Actually wait - I need to think about whether the renderer applies any additional color space conversion when writing to the final canvas. In Three.js, when rendering to screen (not to a render target), the renderer applies the output color space conversion. But when using EffectComposer, the final pass writes to the screen (null render target), and the renderer's built-in color space conversion... hmm.

Actually, in modern Three.js (r152+), the EffectComposer's final pass renders to the screen. The renderer's output encoding/color space is handled by the OutputPass, not by the renderer automatically when using a composer. Let me verify...

In Three.js, when you use EffectComposer:
- RenderPass renders the scene into a render target (linear)
- Subsequent passes operate on the render target
- The final pass renders to the screen (null target)

The renderer's `outputColorSpace` setting affects how colors are written to the canvas. But when using EffectComposer, the convention is that the OutputPass handles the final color space conversion.

Actually, I think the safest approach is:

Option B: RenderPass → OutputPass → ShaderPass (inversion in sRGB)

The OutputPass converts linear to sRGB. Then our ShaderPass inverts. The final output is sRGB and goes to screen. Since the shader outputs sRGB values and the screen expects sRGB, this should be correct.

But wait - will the renderer apply ANOTHER sRGB conversion when writing to the canvas? Let me think...

In Three.js, when the renderer renders to the screen (null render target), it does NOT apply an additional color space conversion if the material's color space matches the output. The OutputPass is specifically designed to handle this.

Actually, I recall that in Three.js, the renderer's outputColorSpace is 'srgb' by default. When rendering to a render target, no conversion happens (it stays linear). When rendering to the screen, the renderer... actually I think the conversion is handled by the shaders themselves based on the output color space.

Let me reconsider. In Three.js r152+:
- `renderer.outputColorSpace = THREE.SRGBColorSpace` (default)
- When rendering to a render target: the fragment shader outputs linear values (no sRGB conversion)
- When rendering to the screen: the fragment shader applies sRGB conversion

But with EffectComposer, all intermediate passes render to render targets. Only the FINAL pass renders to the screen. So the final pass's shader would get the sRGB conversion applied by the renderer automatically?

Hmm, actually I think that's not quite right either. Let me look at this differently.

In modern Three.js (r152+), the color space conversion is handled by the OutputPass. The renderer does NOT automatically apply sRGB conversion to the final output when using a composer. The OutputPass is the one that does it.

Wait, actually I think I'm overcomplicating this. Let me look at what OutputPass actually does:

OutputPass is a ShaderPass that:
1. Applies tone mapping (if the renderer has tone mapping set)
2. Converts from working color space (linear) to output color space (sRGB)

If we DON'T use OutputPass and just do RenderPass → ShaderPass, the ShaderPass operates on linear values and the final output to screen... I think the renderer would apply sRGB conversion to the final render target → screen step.

Actually, I just recalled: in Three.js, when the final pass of the composer renders to the screen (null target), the renderer DOES apply the output color space conversion. This is why OutputPass exists - it does the conversion BEFORE the final-to-screen step, so the values are already in sRGB when they hit the screen.

Wait no, that would double-convert. Let me think again...

OK let me look at this from first principles:

1. RenderPass: renders scene into composer's render target. The scene is in linear color space. The render target contains linear values.

2. If we have NO OutputPass and just a ShaderPass at the end:
   - ShaderPass reads from the render target (linear values)
   - ShaderPass writes to the screen (null target)
   - The renderer, when writing to the screen, applies outputColorSpace conversion (linear → sRGB)
   - So the final screen shows sRGB values

   In this case, if our ShaderPass inverts in linear space, the screen would show sRGB(1 - linear(original_sRGB)). That's wrong.

3. If we have OutputPass as the last pass:
   - OutputPass reads from render target (linear)
   - OutputPass converts to sRGB
   - OutputPass writes to screen
   - The renderer... does it apply ANOTHER conversion?

   I believe the answer is NO - the OutputPass is specifically designed to be the last pass, and the renderer does NOT apply additional conversion. The OutputPass's shader includes the sRGB transfer function, and the final output is already in sRGB.

   Actually wait, I think I need to reconsider. Let me look at how Three.js handles this internally.

   In Three.js, the `renderer.outputColorSpace` affects the `colorSpace` uniform in shaders. When rendering to a render target, the color space is the render target's color space (typically linear). When rendering to the screen, it's the output color space (sRGB).

   So actually, when the FINAL pass renders to the screen, the renderer DOES apply the sRGB conversion in the shader. This means:
   - If OutputPass is the last pass and it already converts to sRGB, then the renderer would apply sRGB AGAIN? That can't be right.

   I think the resolution is: OutputPass is a special pass that renders to the screen, and it handles the color space conversion itself. The renderer's automatic conversion is somehow bypassed or the OutputPass accounts for it.

   Actually, I think I've been overthinking this. Let me just go with the practical approach:

   The standard Three.js post-processing pipeline is:
   RenderPass → [other passes] → OutputPass

   The OutputPass handles tone mapping and linear→sRGB. It's meant to be the LAST pass.

   For our inversion to work correctly (inverting in sRGB space), we need the inversion to happen AFTER the linear→sRGB conversion.

   So the pipeline should be:
   RenderPass → OutputPass → ShaderPass (inversion)

   The OutputPass converts linear to sRGB. Then our ShaderPass inverts the sRGB values. The final output is sRGB on screen.

   But will the renderer apply another sRGB conversion to the final output? If the ShaderPass renders to the screen (null target), and the renderer applies sRGB conversion...

   Hmm, I think the key insight is: when a ShaderPass renders to the screen, the renderer's color space conversion IS applied. So if our ShaderPass outputs sRGB values and the renderer applies sRGB conversion again, we'd get double conversion.

   UNLESS... the ShaderPass's shader already accounts for this. Let me look at how ShaderPass works.

   ShaderPass creates a full-screen quad with a ShaderMaterial. The ShaderMaterial's fragment shader outputs the final color. The renderer, when rendering this to the screen, would apply the output color space conversion.

   Wait, but for ShaderMaterial, I think the color space conversion is NOT automatically applied. The conversion is only applied to materials that use the built-in color management (like MeshBasicMaterial, etc.). For ShaderMaterial, the output is used as-is.

   Actually, I think in Three.js, the color space conversion for the final output is handled by a "fragment shader chunk" that's appended to built-in materials. For ShaderMaterial, the user is responsible for the correct output.

   Let me just go with: RenderPass → OutputPass → ShaderPass(inversion)

   The OutputPass converts linear→sRGB. Our ShaderPass reads sRGB values, inverts them, and outputs sRGB values. Since ShaderMaterial doesn't get automatic color space conversion, the sRGB values go directly to the screen. This should give us the correct result.

   Actually, wait. I just realized there might be an issue. Let me reconsider.

   In Three.js r152+, the way EffectComposer works:
   - Each pass renders to a render target (except the last one which renders to screen)
   - The render targets are in linear color space by default
   - When the last pass renders to screen, the renderer applies outputColorSpace conversion

   But I think for ShaderMaterial, the conversion is NOT automatically applied. The shader output is used as-is. So:

   Pipeline: RenderPass → OutputPass → ShaderPass(inversion)
   - RenderPass: scene rendered in linear → render target (linear)
   - OutputPass: reads linear, converts to sRGB, writes to render target (now sRGB values in a "linear" render target - but it's just numbers)
   - ShaderPass: reads sRGB values, inverts, writes to screen

   The question is: does the renderer apply sRGB conversion when the ShaderPass writes to the screen?

   I believe the answer is: for ShaderMaterial, NO automatic conversion is applied. The shader output goes directly to the framebuffer. So our sRGB inverted values go directly to the screen. ✓

   But wait, I'm not 100% sure about this. Let me think of an alternative approach that's more robust:

   Alternative: Do the inversion in the shader by first converting linear→sRGB, then inverting, then converting back to linear (so the OutputPass can then convert back to sRGB).

   Pipeline: RenderPass → ShaderPass(linear→sRGB, invert, sRGB→linear) → OutputPass

   In the shader:
   ```glsl
   vec3 srgb = pow(linear, vec3(1.0/2.2)); // linear to sRGB (approximate)
   vec3 inverted = 1.0 - srgb;
   vec3 output = pow(inverted, vec3(2.2)); // sRGB back to linear
   ```

   Then OutputPass converts back to sRGB, and the screen shows the inverted sRGB values.

   This is more complex but ensures the OutputPass is last (standard practice).

   Actually, let me use the exact sRGB transfer function rather than the power approximation:

   Linear to sRGB:
   - if c <= 0.0031308: c * 12.92
   - else: 1.055 * pow(c, 1/2.4) - 0.055

   sRGB to Linear:
   - if c <= 0.04045: c / 12.92
   - else: pow((c + 0.055) / 1.055, 2.4)

   Hmm, but this is getting complex. Let me go with the simpler approach:

   Pipeline: RenderPass → OutputPass → ShaderPass(inversion)

   This should work because:
   1. RenderPass outputs linear values to the render target
   2. OutputPass converts to sRGB and outputs to the next render target
   3. ShaderPass reads sRGB values, inverts (1 - c), and outputs to screen
   4. Since ShaderMaterial doesn't get automatic color space conversion, the sRGB values go directly to screen

   Actually, I just want to double-check: does the renderer apply color space conversion to ShaderMaterial output when rendering to screen?

   Looking at Three.js source code mentally: The color space conversion is done via a `#include <colorspace_fragment>` chunk in the built-in material shaders. ShaderMaterial does NOT include this chunk by default. So no, the conversion is NOT applied to ShaderMaterial output.

   Great, so my approach works:
   - RenderPass → OutputPass → ShaderPass(inversion in sRGB)

   Let me also consider: does the OutputPass need to be after the RenderPass? Yes, because RenderPass produces linear values, and OutputPass converts them to sRGB.

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

// Composer
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

// Custom inversion shader
const inversionShader = {
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
  `,
};

const inversionPass = new ShaderPass(inversionShader);
composer.addPass(inversionPass);

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
renderer.setAnimationLoop((timestamp) => {
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to think about whether the `ShaderPass` needs the `tDiffuse` uniform set. Looking at ShaderPass source, it automatically sets `tDiffuse` to the input texture. So I just need to declare it in the uniforms.

Actually, looking at ShaderPass more carefully:
- It takes a shader object with `uniforms`, `vertexShader`, `fragmentShader`
- It automatically sets `uniforms.tDiffuse.value` to the input render target texture
- The `uniforms` in the shader object should have `tDiffuse` declared

Let me also make sure the types are correct for strict TypeScript.

The `inversionShader` object - in TypeScript strict mode, I need to make sure the types work. The ShaderPass constructor takes a `Shader` object. Let me check what type that is.

In Three.js, ShaderPass expects an object that looks like a THREE.Shader:
```
{
  uniforms: { [name: string]: IUniform },
  vertexShader: string,
  fragmentShader: string,
}
```

For strict TypeScript, I should type this properly. Let me use `THREE.Shader` or just type it as the expected structure.

Actually, looking at the Three.js types, `ShaderPass` constructor takes `shader: Shader`. And `Shader` is:
```typescript
class Shader {
  uniforms: { [uniform: string]: IUniform };
  vertexShader: string;
  fragmentShader: string;
}
```

So I can create a plain object that matches this structure. In strict mode, I need to be careful with the types.

Let me also consider: should I use `THREE.SRGBColorSpace` or is the default fine? The default `renderer.outputColorSpace` is `THREE.SRGBColorSpace` in modern Three.js, so it should be fine.

One more thing: the `delta/elapsed time` requirement. The problem says "Motion must use delta/elapsed time, not frame counts." But there's no motion in this scene - it's a static scene with post-processing. The sphere doesn't move. So I don't think I need to do anything time-based. But the requirement says to use `setAnimationLoop` which I'm doing. I'll just make sure I'm not using frame counts for anything.

Actually, re-reading the requirements: "Motion must use delta/elapsed time, not frame counts." Since there's no motion, this is satisfied trivially.

Let me also make sure the `__ready` flag is set after the first frame. I'll use a flag.

Let me finalize the code. I think my approach is correct. Let me write it out cleanly.

One concern: the `IUniform` type. In strict mode, I need to make sure the uniform values are properly typed.

```typescript
const inversionShader: THREE.Shader = {
  uniforms: {
    tDiffuse: { value: null },
  },
  vertexShader: `...`,
  fragmentShader: `...`,
};
```

Wait, `THREE.Shader` is a class, not an interface. Can I assign a plain object to it? In TypeScript, if `Shader` is a class, I can't just assign a plain object to it (it would need to be an instance). But actually, looking at the Three.js type definitions, `Shader` might be used as a type (interface-like) in the ShaderPass constructor.

Let me check: `ShaderPass` constructor signature is `constructor(shader: Shader, textureID?: string)`. And `Shader` in the type definitions is:

```typescript
class Shader {
  uniforms: { [uniform: string]: IUniform };
  vertexShader: string;
  fragmentShader: string;
  // ...
}
```

In TypeScript, you can assign a plain object literal to a class type if it matches the structure (structural typing). So `const shader: THREE.Shader = { uniforms: {...}, vertexShader: "...", fragmentShader: "..." }` should work as long as all required properties are present.

Actually wait, `THREE.Shader` might have more required properties. Let me just use a type assertion or create it as a plain object and let TypeScript infer.

Actually, the simplest approach that will compile in strict mode:

```typescript
const inversionShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
  },
  vertexShader: `...`,
  fragmentShader: `...`,
};
const inversionPass = new ShaderPass(inversionShader);
```

The `ShaderPass` constructor parameter type should accept this. Let me check if it's typed as `Shader` or as a more flexible type.

Looking at the Three.js addon types, `ShaderPass` is:
```typescript
class ShaderPass extends Pass {
  constructor(shader: Shader, textureID?: string);
}
```

And `Shader` from three types is a class. In TypeScript structural typing, a plain object with the right properties should be assignable to a class type (as long as the class doesn't have private members).

I think this will work. Let me write the final code.

Actually, one more thought: I should make sure the `value` for `tDiffuse` is typed correctly. In Three.js, `IUniform` is `{ value: any }`. So `{ value: null }` should be fine.

Let me write the final version now.
