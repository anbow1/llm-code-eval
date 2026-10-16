Let me think carefully about this problem.

The key challenge: The final colors on screen must be the exact inverse of what would appear without the effect.

Without the effect:
- Background 0x336699 → in linear space this is srgb_to_linear(0x336699) → then rendered → then linear_to_srgb back to 0x336699 on screen
- White sphere 0xffffff → in linear space is (1,1,1) → rendered → linear_to_srgb → 0xffffff on screen

With the effect, we want:
- Background appears as 0xcc9966 (which is 1.0 - 0x336699 in sRGB space)
- White sphere appears as 0x000000 (which is 1.0 - 0xffffff in sRGB space)

So the inversion must happen in sRGB space, not linear space.

Now, how does Three.js handle color space in post-processing?

In Three.js (r152+), the renderer outputs in linear color space by default. The OutputPass handles the linear → sRGB conversion at the end of the post-processing chain.

So the pipeline is:
1. RenderPass - renders the scene into a render target. The render target stores colors in linear space.
2. ShaderPass (custom) - operates on the linear space buffer
3. OutputPass - converts from linear to sRGB

If I invert in the ShaderPass (which operates in linear space), I'd be doing 1.0 - linear_rgb, which is NOT the same as 1.0 - srgb_rgb.

To get the correct result, I need to:
- Either: Convert linear → sRGB in the shader, invert, then the OutputPass would convert again (wrong, double conversion)
- Or: Do the inversion in sRGB space by converting to sRGB first, inverting, then converting back to linear before OutputPass
- Or: Do the inversion after the OutputPass (but then I can't use OutputPass properly)
- Or: Convert linear → sRGB in the shader, invert, and then set the OutputPass to not do the conversion... but OutputPass always does the conversion.

Wait, let me think again. The correct approach:

Option 1: In the ShaderPass, convert linear to sRGB, invert, then convert back to linear. Then OutputPass converts linear to sRGB again. This would give: srgb(1 - linear_to_srgb(x))... no wait.

Let me trace through:
- Linear value L
- OutputPass does: sRGB = linear_to_srgb(L)
- Without effect: screen shows sRGB = linear_to_srgb(L)
- We want: screen shows 1.0 - linear_to_srgb(L)

If ShaderPass does:
- Input: L (linear)
- Convert to sRGB: S = linear_to_srgb(L)
- Invert: S_inv = 1.0 - S
- Convert back to linear: L_inv = srgb_to_linear(S_inv)
- Output: L_inv

Then OutputPass does: screen = linear_to_srgb(L_inv) = linear_to_srgb(srgb_to_linear(1.0 - linear_to_srgb(L))) = 1.0 - linear_to_srgb(L) ✓

So the shader needs to:
1. Convert from linear to sRGB
2. Invert
3. Convert from sRGB back to linear

The sRGB conversion functions:
- linear_to_srgb: if x <= 0.0031308 then 12.92*x else 1.055*pow(x, 1/2.4) - 0.055
- srgb_to_linear: if x <= 0.04045 then x/12.92 else pow((x+0.055)/1.055, 2.4)

Let me write the GLSL:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSrgb(vec3 color) {
    vec3 low = color * 12.92;
    vec3 high = 1.055 * pow(color, vec3(1.0/2.4)) - 0.055;
    return mix(low, high, step(0.0031308, color));
}

vec3 srgbToLinear(vec3 color) {
    vec3 low = color / 12.92;
    vec3 high = pow((color + 0.055) / 1.055, vec3(2.4));
    return mix(low, high, step(0.04045, color));
}

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    vec3 srgb = linearToSrgb(color.rgb);
    vec3 inverted = 1.0 - srgb;
    vec3 backToLinear = srgbToLinear(inverted);
    gl_FragColor = vec4(backToLinear, color.a);
}
```

Wait, but there's a subtlety. The `step` function in GLSL: `step(edge, x)` returns 0 if x < edge, 1 if x >= edge. So `step(0.0031308, color)` would be 0 when color < 0.0031308 and 1 when color >= 0.0031308. That's correct for the mix.

Actually, let me reconsider. `mix(a, b, t)` = a*(1-t) + b*t. So when t=0 (color < threshold), we get `low`. When t=1 (color >= threshold), we get `high`. That's correct.

But wait - there's a per-component issue. `step` with vec3 works per-component, and `mix` with vec3 works per-component. So this should be fine.

Now let me also think about whether the RenderPass output is actually in linear space. In Three.js with the default color management (which is enabled by default in recent versions), when you set a color like `new THREE.Color(0x336699)`, it's interpreted as sRGB and converted to linear internally. The render target in EffectComposer stores linear values. The OutputPass then converts to sRGB for display.

So yes, the ShaderPass receives linear values, and I need to do the conversion-invert-conversion as described.

Let me also make sure about the `OutputPass`. In Three.js, `OutputPass` performs:
- Linear to sRGB conversion
- Tone mapping (if set)

Since we're not using tone mapping, it should just do the linear → sRGB conversion.

Now let me write the complete file:

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

// Create camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Create sphere
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

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
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        
        vec3 linearToSrgb(vec3 color) {
            vec3 low = color * 12.92;
            vec3 high = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
            return mix(low, high, step(0.0031308, color));
        }
        
        vec3 srgbToLinear(vec3 color) {
            vec3 low = color / 12.92;
            vec3 high = pow(max((color + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
            return mix(low, high, step(0.04045, color));
        }
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 srgb = linearToSrgb(color.rgb);
            vec3 inverted = 1.0 - srgb;
            vec3 backToLinear = srgbToLinear(inverted);
            gl_FragColor = vec4(backToLinear, color.a);
        }
    `,
};

// Setup EffectComposer
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(InversionShader));
composer.addPass(new OutputPass());

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Resize handler
function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    // Could animate with delta if needed
    composer.render();
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, I need to think about whether `pow` with 0 base is an issue. `pow(0, 1/2.4)` - in GLSL, `pow(0, positive)` should be 0. But to be safe, I added `max(color, vec3(0.0))`. Actually, the values coming from the render target should already be in [0,1] range, so they shouldn't be negative. But the `max` is a safety measure.

Actually, wait. Let me reconsider the `step` function behavior at the boundary. When color is exactly 0.0031308, `step(0.0031308, 0.0031308)` returns 1.0 (since step returns 1 when x >= edge). And at that point, `low = 0.0031308 * 12.92 ≈ 0.04045` and `high = 1.055 * pow(0.0031308, 1/2.4) - 0.055`. Let me check: pow(0.0031308, 1/2.4) = pow(0.0031308, 0.4167). Hmm, 0.0031308^(1/2.4). Let me compute: ln(0.0031308) ≈ -5.766, * (1/2.4) ≈ -2.4025, exp(-2.4025) ≈ 0.0904. So high ≈ 1.055 * 0.0904 - 0.055 ≈ 0.0954 - 0.055 ≈ 0.0404. And low ≈ 0.04045. They're close enough that the transition is smooth.

This looks correct. Let me finalize the code.

One more thing - I should make sure the `ShaderPass` uniform is properly typed. The `ShaderPass` constructor takes a shader object with `uniforms`, `vertexShader`, and `fragmentShader`. The `tDiffuse` uniform is automatically set by the ShaderPass to the input texture.

Let me also double-check: does `EffectComposer` in Three.js use render targets with the correct color space? By default, the render targets in EffectComposer are in linear space (they're just float or unsigned byte textures without color space conversion). The OutputPass handles the final conversion. This is the standard setup.

I think the code is correct. Let me write the final version.
