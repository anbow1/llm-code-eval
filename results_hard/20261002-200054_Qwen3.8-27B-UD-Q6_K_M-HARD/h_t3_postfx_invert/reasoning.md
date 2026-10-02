Let me think carefully about this problem.

The key requirement is: the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect.

Without the effect:
- Background 0x336699 appears as 0x336699 on screen
- White sphere 0xffffff appears as 0xffffff on screen

With the effect, we want:
- Background appears as 0xcc9966 (which is 1.0 - 0x33/255, 1.0 - 0x66/255, 1.0 - 0x99/255 = 0xcc, 0x99, 0x66)
- White sphere appears as 0x000000 (black)

So the inversion must happen in sRGB space (gamma space), not linear space.

Now, how does Three.js handle color space?

In modern Three.js (r152+), the renderer works in linear color space internally. The `OutputPass` handles the conversion from linear to sRGB (the tone mapping and color space conversion).

So the pipeline is:
1. RenderPass - renders the scene. The output is in linear color space.
2. ShaderPass (inversion) - this operates on the linear buffer
3. OutputPass - converts from linear to sRGB

If I do the inversion in linear space, then the output would be:
- Linear 0x336699 → invert → linear complement → then sRGB conversion → NOT 0xcc9966

That won't work. The inversion needs to happen in sRGB space.

So I have a few options:

Option 1: Put the inversion shader AFTER the OutputPass. But that would mean the output is in sRGB, and I'd be inverting sRGB values. But then there's no final output pass... Actually, if I put ShaderPass after OutputPass, the ShaderPass would receive sRGB values and invert them. The result would be the inverted sRGB colors. But wait, would the OutputPass still try to convert? No, OutputPass is the last pass. If I put ShaderPass after it, the ShaderPass would be the last pass.

Actually, let me reconsider the pass order:

If the order is: RenderPass → OutputPass → ShaderPass(inversion)
- RenderPass outputs linear
- OutputPass converts to sRGB (applies tone mapping + linear-to-sRGB)
- ShaderPass inverts the sRGB values
- Final result: inverted sRGB values → this is what we want!

But wait, does EffectComposer handle this correctly? The last pass in the composer renders to screen. So if ShaderPass is last, it renders to screen. The values it receives from OutputPass would be in sRGB (since OutputPass converts them). Then inverting gives us the correct result.

Actually, let me reconsider. In Three.js's EffectComposer:
- Each pass renders to a render target (FBO)
- The last pass renders to screen (null)
- The buffers are typically in linear color space by default

Wait, but OutputPass specifically does the linear-to-sRGB conversion. After OutputPass, the buffer contains sRGB values. If the next pass reads that buffer, it gets sRGB values.

Hmm, but actually I need to think about this more carefully. The EffectComposer uses HalfFloat or UnsignedByte render targets. The color space of the render targets...

Actually, in Three.js post-processing:
- The render targets are typically linear (no color space conversion is applied to intermediate buffers)
- OutputPass is specifically designed to be the LAST pass - it converts from linear working color space to the display color space (sRGB)

So if I put the inversion AFTER OutputPass:
- RenderPass → linear buffer
- OutputPass → sRGB buffer (converts linear to sRGB)
- ShaderPass(inversion) → reads sRGB buffer, inverts, writes to screen

This should give us the correct result! The inversion happens on sRGB values.

Let me verify:
- Background: 0x336699 in sRGB → as linear: srgbToLinear(0x33/255), srgbToLinear(0x66/255), srgbToLinear(0x99/255)
- After RenderPass: linear values in buffer
- After OutputPass: converted back to sRGB → 0x33, 0x66, 0x99 (approximately, assuming no tone mapping)
- After ShaderPass inversion: 1 - 0x33/255 = 0xcc/255, 1 - 0x66/255 = 0x99/255, 1 - 0x99/255 = 0x66/255 → 0xcc9966 ✓
- White: 1.0 → 0.0 → black ✓

This works!

Option 2: Put the inversion BEFORE OutputPass, but convert the values to sRGB, invert, then convert back to linear in the shader. This is more complex but also works.

I'll go with Option 1 as it's cleaner: RenderPass → OutputPass → ShaderPass(inversion)

Wait, but there's a subtlety. Does the EffectComposer's render targets preserve the sRGB values from OutputPass correctly? Let me think...

In Three.js, when a pass renders to a render target, the values are written as-is. OutputPass writes sRGB-encoded values to the next buffer. The next pass (ShaderPass) reads those values. Since the shader just does `1.0 - color.rgb`, it will operate on the sRGB-encoded values. The final output goes to screen.

But wait - when writing to screen (the default framebuffer), does Three.js do any additional conversion? If the renderer has `outputColorSpace = THREE.SRGBColorSpace` (which is the default), does it apply an additional sRGB conversion when rendering to screen?

Actually, I think in the EffectComposer context, when the final pass renders to screen (renderTarget = null), the WebGL framebuffer is used directly. The values in the shader output are what appear on screen. No additional conversion is applied by the GL context for the default framebuffer in WebGL (the sRGB conversion in Three.js is done in shaders, not by the GPU).

So the pipeline RenderPass → OutputPass → ShaderPass(inversion) should work correctly.

Let me also consider: do I need to worry about tone mapping? By default, Three.js uses NoToneMapping. The OutputPass applies tone mapping and color space conversion. With NoToneMapping, it just does linear-to-sRGB.

Let me write the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Sphere
const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeo, sphereMat);
scene.add(sphere);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Inversion shader (operates on sRGB values since it's after OutputPass)
const invertShader = {
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
            gl_FragColor = vec4(1.0 - color.rgb, color.a);
        }
    `
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    // Could use delta for animation, but sphere is static
    composer.render();
    
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, I need to double-check the type of the shader uniforms. In Three.js, ShaderPass expects the shader to have `tDiffuse` as a uniform. Let me make sure the types work with `tsc --strict`.

The `ShaderPass` constructor takes a `Shader` object. Let me check what type that is. It expects something like:
```
{
    uniforms: { [key: string]: IUniform },
    vertexShader: string,
    fragmentShader: string
}
```

With `tsc --strict`, I need to be careful about types. Let me use `THREE.ShaderMaterial` type or just cast appropriately.

Actually, looking at the Three.js source, ShaderPass takes a `Shader` which is essentially:
```typescript
interface Shader {
    uniforms: { [uniform: string]: IUniform };
    vertexShader: string;
    fragmentShader: string;
    ...
}
```

And `IUniform` is `{ value: any }`.

So `tDiffuse: { value: null }` should be fine. But with strict mode, `null` might need to be typed. Let me use `{ value: null as THREE.Texture | null }` or just `{ value: null }`.

Actually, since `IUniform` has `value: any`, just `{ value: null }` should work. But let me be safe.

Let me also make sure I'm not missing anything. The requirement says "Motion must use delta/elapsed time, not frame counts." Since the sphere is static, I don't really need motion, but I'll still use the clock to satisfy the requirement. Maybe I'll add a subtle rotation to the sphere to demonstrate delta usage.

Actually, the problem says "One sphere (radius 1, MeshBasicMaterial color 0xffffff) at the origin." It doesn't say it must be static. But it doesn't require motion either. The rule says "Motion must use delta/elapsed time, not frame counts" - this is a conditional rule. If there's motion, use delta. If there's no motion, it's fine.

But to be safe and show good practice, let me add a slow rotation using delta.

Let me also think about whether the `ready` flag approach is correct. The requirement says "After the first frame is rendered, set (window as any).__ready = true." Using `setAnimationLoop` and setting it after the first `composer.render()` call should work.

Let me finalize the code. I'll add a subtle rotation to the sphere to demonstrate delta-based animation.

One more thought: the `tDiffuse` uniform in ShaderPass is automatically set by the pass to the input texture. I don't need to manually set it. The ShaderPass will handle that.

Let me write the final version.
