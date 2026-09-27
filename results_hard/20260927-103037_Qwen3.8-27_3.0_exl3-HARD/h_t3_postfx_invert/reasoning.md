Let me think carefully about this problem.

The key challenge: We need the final on-screen colors to be the exact inverse of what would appear without the effect.

Without the effect:
- Background 0x336699 → appears on screen as some sRGB value
- White sphere (0xffffff) → appears on screen as white (1,1,1) in sRGB

With the effect, we want:
- Background appears as 0xcc9966 (which is 1.0 - 0x33, 1.0 - 0x66, 1.0 - 0x99 in hex, i.e., inverted sRGB)
- White sphere appears as black (1.0 - 1.0 = 0.0)

Now, the color space pipeline in Three.js:
1. Scene colors are defined in sRGB (0x336699 is an sRGB hex value)
2. Three.js converts them to linear working color space internally
3. RenderPass renders the scene into a render target (in linear color space)
4. OutputPass does the linear → sRGB conversion (tonemapping + color space conversion)

So the pipeline is:
- RenderPass: renders scene in linear color space into the composer's render target
- ShaderPass (invert): operates on the linear color buffer
- OutputPass: converts linear → sRGB

If I invert in linear space, then convert to sRGB, the result is NOT the same as inverting the sRGB values. Because sRGB is a non-linear encoding.

For example:
- 0x33 in sRGB = 51/255 ≈ 0.2. In linear: 0.2^2.2 ≈ 0.034 (roughly). 
- Inverting in linear: 1 - 0.034 = 0.966. Converting back to sRGB: 0.966^(1/2.2) ≈ 0.983 → about 0xFA
- But we want 0xCC (which is 1 - 0x33 = 0xCC in sRGB space)

So inverting in linear space does NOT give us the correct result.

The correct approach: We need to invert in sRGB space. This means we need to:
1. Render the scene (linear)
2. Convert linear → sRGB
3. Invert the sRGB values
4. Display the result (which is already in sRGB, so no further conversion needed)

OR:
1. Render the scene (linear)
2. Invert in linear (wrong - doesn't give correct result)
3. Convert linear → sRGB (this gives wrong result)

So the correct order is:
- RenderPass (renders in linear)
- ShaderPass that converts linear → sRGB AND inverts (or two passes)
- Then we need to make sure OutputPass doesn't convert again

Wait, let me reconsider. The OutputPass does:
1. Tone mapping
2. Linear → sRGB conversion

If I put my inversion shader BEFORE OutputPass, it operates on linear values. That's wrong.

If I put my inversion shader AFTER OutputPass, it operates on sRGB values. That's correct!

But wait - can I put a ShaderPass after OutputPass? Let me think about the EffectComposer pipeline.

EffectComposer renders passes in order. Each pass reads from the current read buffer and writes to the write buffer. So:

1. RenderPass → writes linear scene to buffer
2. OutputPass → reads linear, writes sRGB (does linear→sRGB conversion)
3. ShaderPass (invert) → reads sRGB, writes inverted sRGB

This should work! The final output would be the inverted sRGB values, which is exactly what we want.

But wait - does the EffectComposer handle the final output correctly? When the last pass writes to the screen, does it apply any additional color space conversion?

In Three.js, the EffectComposer's final output to screen: the last pass renders to the screen (renderToScreen = true). The EffectComposer doesn't do any additional color space conversion on the final output - it just blits the texture to the screen.

Actually, let me reconsider. In newer versions of Three.js (r152+), the color management system works like this:
- Renderer.outputColorSpace = THREE.SRGBColorSpace (default)
- When rendering to a render target (which is what EffectComposer does internally), the output is in linear space
- OutputPass handles the conversion from linear to sRGB for the final display

So the pipeline should be:
1. RenderPass → linear scene in buffer
2. OutputPass → converts to sRGB in buffer
3. ShaderPass (invert) → inverts the sRGB values, renders to screen

This way:
- Background: 0x336699 sRGB → linear → back to sRGB (0x336699) → inverted → 0xcc9966 ✓
- White: 0xffffff sRGB → linear (1,1,1) → back to sRGB (1,1,1) → inverted → (0,0,0) black ✓

Wait, but there's a subtlety. The OutputPass also applies tone mapping. By default, the renderer has NoToneMapping, so it should be fine.

Actually, let me reconsider the order. Let me check what OutputPass actually does in the Three.js source:

OutputPass:
- Applies tone mapping (based on renderer.toneMapping)
- Applies color space conversion (linear → output color space, which is sRGB by default)

So if I do:
1. RenderPass (linear)
2. OutputPass (linear → sRGB, with tone mapping)
3. Invert ShaderPass (inverts sRGB)

The final result on screen would be the inverted sRGB. Since no further conversion happens after the last pass (it goes directly to screen), this should be correct.

But wait - I need to be careful. When the EffectComposer renders the final pass to screen, does the renderer apply any additional output encoding? 

In Three.js, when rendering to the screen (not a render target), the renderer's output color space is applied. But when EffectComposer renders to screen, it uses a full-screen quad with a simple shader that just samples the texture. The texture was already in sRGB (after OutputPass), and the final quad shader just copies it. 

Hmm, actually I need to think about this more carefully. In recent Three.js versions:

- When rendering to a WebGLRenderTarget, the renderer does NOT apply output color space conversion (it stays linear)
- When rendering to the screen (default framebuffer), the renderer DOES apply output color space conversion

But in EffectComposer, the final pass that renders to screen... let me think. The EffectComposer uses a full-screen quad with a ShaderMaterial. The output of this shader goes to the screen. Does Three.js apply the output color space conversion to this?

Actually, in Three.js r152+, the color space conversion is handled in the shader's fragment output. For built-in materials, Three.js adds the color space conversion at the end of the fragment shader. For custom ShaderMaterials, you need to handle it yourself.

The EffectComposer's final pass uses a simple shader that just does `gl_FragColor = texture2D(tDiffuse, vUv)`. This doesn't include any color space conversion. So the output is whatever is in the texture.

So if OutputPass has already converted to sRGB, and then the invert pass inverts it, the final output to screen is the inverted sRGB values. No additional conversion happens. 

Let me verify: does the EffectComposer set `renderer.outputColorSpace` or does it matter? I believe the EffectComposer's internal render targets are in linear space, and the final blit to screen doesn't apply any conversion. The OutputPass is specifically designed to do the conversion that would normally happen when rendering to screen.

So my plan:
1. RenderPass
2. OutputPass (does linear → sRGB)
3. ShaderPass with invert shader (inverts sRGB values)

The invert shader:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    gl_FragColor = vec4(1.0 - color.rgb, color.a);
}
```

Wait, but I need to think about whether the EffectComposer's render targets use sRGB or linear. In Three.js, the EffectComposer creates render targets with `type: THREE.HalfFloatType` and they are in linear color space. The OutputPass reads from the linear buffer and writes sRGB values. Then my invert pass reads the sRGB values and inverts them.

Actually, I realize there might be an issue. Let me look at this more carefully.

In EffectComposer, the render targets are created with:
- `type: THREE.HalfFloatType` (for HDR)
- No specific color space (linear)

The OutputPass shader does:
- Tone mapping
- Linear to sRGB conversion

After OutputPass, the buffer contains sRGB values. Then my invert pass reads these sRGB values and inverts them. The final output to screen is the inverted sRGB.

This should be correct!

Let me also consider: does the `renderer.outputColorSpace` setting matter here? Since we're using the EffectComposer and the final pass is a ShaderMaterial that just copies the texture, the renderer's output color space shouldn't matter for the final blit. The values in the texture are already in the color space we want.

Actually wait - I need to double-check. In Three.js, when you render a ShaderMaterial to the screen, does Three.js apply any post-processing at the GL level? I don't think so - the shader output goes directly to the framebuffer. The color space conversion in Three.js is done in-shader (added to the fragment shader code), not at the GL level.

So for a custom ShaderMaterial, the output is exactly what the shader produces. No additional conversion.

Great, so my plan is solid:
1. RenderPass
2. OutputPass
3. ShaderPass (invert)

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

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
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

// Invert shader
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

// Resize
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
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    // Could add some motion here using delta
    composer.render();
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Wait, I need to think about whether the invert shader needs to be in sRGB or if there's a color space issue with the render target.

Let me trace through the exact pixel values:

1. Background color 0x336699:
   - In sRGB: R=0x33/255=0.2, G=0x66/255=0.4, B=0x99/255=0.6
   - Three.js converts to linear: R=linearize(0.2), G=linearize(0.4), B=linearize(0.6)
   - linearize(x) = x <= 0.04045 ? x/12.92 : ((x+0.055)/1.055)^2.4
   - R_linear = ((0.2+0.055)/1.055)^2.4 ≈ (0.2417)^2.4 ≈ 0.0331
   - G_linear = ((0.4+0.055)/1.055)^2.4 ≈ (0.4313)^2.4 ≈ 0.1329
   - B_linear = ((0.6+0.055)/1.055)^2.4 ≈ (0.6209)^2.4 ≈ 0.3185

2. RenderPass renders the scene in linear to the composer's render target:
   - Background pixel: (0.0331, 0.1329, 0.3185) in linear
   - Sphere pixel: (1.0, 1.0, 1.0) in linear

3. OutputPass converts linear → sRGB:
   - Background: linearize inverse of (0.0331, 0.1329, 0.3185) → (0.2, 0.4, 0.6) in sRGB → 0x336699 ✓
   - Sphere: (1.0, 1.0, 1.0) → (1.0, 1.0, 1.0) in sRGB → 0xffffff ✓

4. Invert pass:
   - Background: (1-0.2, 1-0.4, 1-0.6) = (0.8, 0.6, 0.4) in sRGB → 0xCC9966 ✓
   - Sphere: (1-1.0, 1-1.0, 1-1.0) = (0.0, 0.0, 0.0) → black ✓

This confirms the approach is correct.

Now, one concern: the EffectComposer's render targets. By default, they use `THREE.HalfFloatType`. The values stored are the raw shader output. After OutputPass, the values in the buffer are sRGB-encoded (i.e., 0.2, 0.4, 0.6 for the background). My invert shader reads these values and inverts them. The output goes to the screen.

But wait - does the EffectComposer's final output to screen go through any additional processing? Let me think...

The EffectComposer's `render()` method:
- Iterates through passes
- For each pass, sets up the read/write buffers
- The last pass that has `renderToScreen = true` renders to the screen (null framebuffer)
- The render is done with a full-screen quad using the pass's material

For ShaderPass, the material is a ShaderMaterial with the provided vertex/fragment shaders. The output of this shader goes directly to the screen framebuffer. No additional color space conversion is applied by Three.js to custom ShaderMaterials.

So the final output is exactly what my shader produces: the inverted sRGB values. 

One more thing: I should make sure the ShaderPass's `renderToScreen` is set correctly. Actually, in EffectComposer, the last pass automatically gets `renderToScreen = true` if it's the last one... wait, no. Let me check.

Actually, in EffectComposer, you need to explicitly set `renderToScreen = true` on the last pass, OR the composer handles it. Let me check the Three.js source...

In recent Three.js versions, the EffectComposer automatically sets the last pass to render to screen. Actually, I think you need to set it manually. Let me just set it to be safe.

Actually, looking at the Three.js EffectComposer source code, in the `render` method:
```
for (let i = 0; i < this.passes.length; i++) {
    const pass = this.passes[i];
    if (pass.needsRender === false) continue;
    pass.renderToScreen = (this.renderToScreen && this.isLastEnabledPass(i));
    pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);
}
```

So it automatically sets `renderToScreen` for the last enabled pass. Good, I don't need to set it manually.

Let me also make sure I'm not missing anything with the `deltaTime` parameter. The ShaderPass.render signature takes deltaTime but doesn't use it for simple passes.

I think my code is correct. Let me finalize it.

Actually, one more thought: the problem says "Motion must use delta/elapsed time, not frame counts." But the scene is static (no animation). I'll include the clock and delta variable to satisfy the requirement, even though there's no actual motion to apply. Or I could add a subtle rotation to the sphere to demonstrate the use of delta time.

Let me add a slow rotation to the sphere to show delta time usage.

Let me finalize the code.
