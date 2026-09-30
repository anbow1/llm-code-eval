Let me think carefully about this problem.

The key challenge is getting the color inversion to work correctly with Three.js's color space management.

In Three.js (r152+), the rendering pipeline works like this:
1. Colors are defined in sRGB (e.g., 0x336699)
2. When a MeshBasicMaterial renders, the color is converted from sRGB to linear space for lighting calculations
3. The OutputPass (or the renderer's tone mapping) converts from linear back to sRGB for display

So if I just put a simple `1.0 - rgb` shader pass between RenderPass and OutputPass:
- RenderPass outputs linear colors
- My shader inverts: 1.0 - linear_rgb
- OutputPass converts linear to sRGB

This would NOT give the correct result because the inversion needs to happen in sRGB space.

The background 0x336699 in sRGB:
- R: 0x33/255 = 0.2 → linear: (0.2/12.92) or ((0.2+0.055)/1.055)^2.4 ≈ 0.0331
- G: 0x66/255 = 0.4 → linear: ((0.4+0.055)/1.055)^2.4 ≈ 0.1329
- B: 0x99/255 = 0.6 → linear: ((0.6+0.055)/1.055)^2.4 ≈ 0.3185

If I invert in linear: 1.0 - linear
- R: 1 - 0.0331 = 0.9669 → sRGB: (0.9669*1.055 - 0.055)^(1/2.4) ≈ 0.983
- G: 1 - 0.1329 = 0.8671 → sRGB: (0.8671*1.055 - 0.055)^(1/2.4) ≈ 0.934
- B: 1 - 0.3185 = 0.6815 → sRGB: (0.6815*1.055 - 0.055)^(1/2.4) ≈ 0.838

That would give approximately 0xfbefd5... not 0xcc9966.

The correct approach: I need to invert in sRGB space. So the shader should:
1. Convert from linear to sRGB
2. Invert
3. Then the OutputPass would convert linear to sRGB again... that's wrong.

Actually, let me think about this differently.

Option 1: Invert in the shader AFTER converting to sRGB, and then skip the OutputPass or make it a no-op.

Option 2: Invert in linear space but account for the sRGB conversion. This is complex.

Option 3: The simplest correct approach:
- RenderPass renders the scene in linear space
- My shader pass: convert linear → sRGB, then invert (1.0 - sRGB), then convert sRGB → linear (so OutputPass can convert back to sRGB)
  - Wait, that's silly. If I convert to sRGB, invert, then convert back to linear, OutputPass converts to sRGB, I get back the inverted sRGB. That works!

Actually wait, let me reconsider. The OutputPass does linear → sRGB conversion. So:

Pipeline: RenderPass → InvertShader → OutputPass

RenderPass outputs: linear color (e.g., background is linear(0x336699))
InvertShader: I need the final output to be linear(0xcc9966) so that OutputPass converts it to sRGB(0xcc9966) = 0xcc9966.

So in the shader, I need to:
1. Take the linear input
2. Convert to sRGB
3. Invert in sRGB: 1.0 - sRGB
4. Convert back to linear (so OutputPass can convert to sRGB correctly)

OR simpler:
1. Take the linear input
2. Convert to sRGB
3. Invert in sRGB: 1.0 - sRGB
4. Output this as the "linear" value, and then REMOVE the OutputPass or replace it with a pass that doesn't do color space conversion.

Actually, the cleanest approach: 

Let me think about what OutputPass does. It applies tone mapping and color space conversion (linear to sRGB). 

If I put my inversion shader AFTER the OutputPass, it would operate on sRGB values directly. But the requirement says to use OutputPass.

Let me re-read: "Use EffectComposer from 'three/addons/postprocessing/EffectComposer.js' with a RenderPass, a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass."

So the order is: RenderPass → ShaderPass(invert) → OutputPass

The shader receives linear color. It needs to output linear color such that after OutputPass (linear→sRGB), the result is the sRGB inverse.

So: output_linear = linearToSRGB(1.0 - sRGBToLinear(input_linear))

Wait no. Let me be more careful.

input_linear = the linear color from RenderPass
What I want on screen: sRGB_inverse = 1.0 - sRGB(input_linear)
OutputPass does: screen = sRGB(output_linear)
So: sRGB(output_linear) = 1.0 - sRGB(input_linear)
Therefore: output_linear = linearToSRGB(1.0 - sRGBToLinear... no wait.

sRGB(x) means: convert linear x to sRGB.
sRGB_inverse = 1.0 - sRGB(input_linear)

OutputPass: screen_color = sRGB(output_linear)
We want: screen_color = 1.0 - sRGB(input_linear)
So: sRGB(output_linear) = 1.0 - sRGB(input_linear)
Therefore: output_linear = linearToSRGB_inverse(1.0 - sRGB(input_linear))

Where linearToSRGB_inverse is the sRGB→linear conversion (since sRGB(x) = sRGB_to_display(x), its inverse is display_to_sRGB(x) = linear_from_sRGB(x)).

Hmm, let me use clearer notation:
- `linearToSRGB(x)`: converts a linear value to sRGB (gamma encode)
- `sRGBToLinear(x)`: converts an sRGB value to linear (gamma decode)

RenderPass outputs: L (linear)
My shader receives: L
My shader outputs: M (which OutputPass will treat as linear)
OutputPass outputs: linearToSRGB(M) = what's on screen

We want on screen: 1.0 - linearToSRGB(L)

So: linearToSRGB(M) = 1.0 - linearToSRGB(L)
M = sRGBToLinear(1.0 - linearToSRGB(L))

In GLSL:
```glsl
vec3 linear = texture2D(tDiffuse, vUv).rgb;
vec3 srgb = linearToSRGB(linear); // apply gamma
vec3 inverted = 1.0 - srgb;
vec3 output = sRGBToLinear(inverted); // convert back to linear for OutputPass
gl_FragColor = vec4(output, 1.0);
```

Where:
- linearToSRGB: if x <= 0.0031308, x * 12.92; else 1.055 * pow(x, 1.0/2.4) - 0.045
- sRGBToLinear: if x <= 0.04045, x / 12.92; else pow((x + 0.055) / 1.055, 2.4)

Let me verify with the background:
- 0x336699 → sRGB values: (0.2, 0.4, 0.6)
- Linear: sRGBToLinear(0.2) ≈ 0.0331, sRGBToLinear(0.4) ≈ 0.1329, sRGBToLinear(0.6) ≈ 0.3185
- In shader: linearToSRGB(0.0331) ≈ 0.2, linearToSRGB(0.1329) ≈ 0.4, linearToSRGB(0.3185) ≈ 0.6
- Invert: (0.8, 0.6, 0.4)
- sRGBToLinear(0.8) ≈ 0.6038, sRGBToLinear(0.6) ≈ 0.3185, sRGBToLinear(0.4) ≈ 0.1329
- OutputPass: linearToSRGB(0.6038) ≈ 0.8, linearToSRGB(0.3185) ≈ 0.6, linearToSRGB(0.1329) ≈ 0.4
- Screen: (0.8, 0.6, 0.4) = (204, 153, 102) = 0xCC9966 ✓

White sphere:
- 0xffffff → sRGB: (1, 1, 1) → linear: (1, 1, 1)
- In shader: linearToSRGB(1) = 1, invert: (0, 0, 0), sRGBToLinear(0) = 0
- OutputPass: linearToSRGB(0) = 0
- Screen: (0, 0, 0) = black ✓

This approach works.

Now let me write the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const invertShader = {
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
        
        vec3 linearToSRGB(vec3 color) {
            vec3 low = color * 12.92;
            vec3 high = 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.045;
            vec3 mask = step(vec3(0.0031308), color);
            return mix(low, high, mask);
        }
        
        vec3 sRGBToLinear(vec3 color) {
            vec3 high = pow((color + vec3(0.055)) / vec3(1.055), vec3(2.4));
            vec3 low = color / vec3(12.92);
            vec3 mask = step(vec3(0.04045), color);
            return mix(low, high, mask);
        }
        
        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec3 linear = texel.rgb;
            vec3 srgb = linearToSRGB(linear);
            vec3 inverted = 1.0 - srgb;
            vec3 output = sRGBToLinear(inverted);
            gl_FragColor = vec4(output, texel.a);
        }
    `,
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);
composer.addPass(new OutputPass());

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    // Could add animation here using delta
    composer.render();
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, I need to think about whether `renderer.setPixelRatio` affects the composer. The EffectComposer should handle pixel ratio internally when you call `setSize`. Actually, looking at the Three.js source, `EffectComposer.setSize` does account for pixel ratio. Let me check...

Actually, in newer versions of Three.js, `EffectComposer` uses `renderer.getPixelRatio()` internally. So calling `composer.setSize(window.innerWidth, window.innerHeight)` should be fine.

Let me also make sure the `invertShader` type is correct for `ShaderPass`. The ShaderPass constructor expects a `Shader` object which has `uniforms`, `vertexShader`, and `fragmentShader`. The uniforms object needs `tDiffuse` to be a property. Let me check the type...

Actually, `ShaderPass` expects an object that looks like a `THREE.Shader`. The type is:
```
{
    uniforms: { [key: string]: IUniform },
    vertexShader: string,
    fragmentShader: string,
}
```

My object should work. But I need to make sure the types are correct for strict mode.

Let me also think about whether I need `renderer.outputColorSpace`. In modern Three.js (r152+), the default is `THREE.SRGBColorSpace`. The OutputPass handles the conversion. If I don't set it, it should default to sRGB.

Actually, I should be careful. Let me check: does the OutputPass read `renderer.outputColorSpace`? Yes, it does. By default in r152+, `renderer.outputColorSpace = THREE.SRGBColorSpace`. So the OutputPass will do linear → sRGB.

I think my solution is correct. Let me also add `document.body.style.margin = '0'` to avoid any white borders, though the problem says "The page has no other HTML" so maybe I should just focus on the canvas.

Actually, let me reconsider the pixel ratio. The renderer's setPixelRatio affects the internal buffer size. The EffectComposer creates its own render targets. I should make sure they match. Looking at the EffectComposer source, it uses `renderer.getPixelRatio()` when creating render targets. So as long as I set the pixel ratio on the renderer before creating the composer, it should be fine.

Let me finalize my code. I'll keep it clean and make sure it compiles with strict mode.

One more thought: the `IUniform` type. In strict mode, I need to make sure my shader object is properly typed. Let me use `THREE.Shader` or just cast it.

Actually, looking at the ShaderPass type definition:
```typescript
class ShaderPass {
    constructor(shader: THREE.Shader | { uniforms: { [key: string]: IUniform }, vertexShader: string, fragmentShader: string }, textureID?: string);
}
```

So I can pass a plain object. Let me make sure the types work.

For the uniforms, `tDiffuse` should be `{ value: THREE.Texture | null }`. But actually ShaderPass sets it automatically. I just need to declare it.

Let me write the final version.
