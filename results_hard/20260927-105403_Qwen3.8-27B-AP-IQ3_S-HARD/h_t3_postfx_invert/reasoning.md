Let me think carefully about this problem.

The key challenge here is color space management. Let me trace through what happens:

1. **Scene**: Background is `0x336699`, sphere is `0xffffff` (MeshBasicMaterial).
2. **Desired output**: Background `0x336699` appears as `0xcc9966` (which is `1.0 - 0x33/0xff`, `1.0 - 0x66/0xff`, `1.0 - 0x99/0xff`), and white sphere appears as black.

The trick here is understanding the color space pipeline:

- In Three.js (modern versions), the renderer works in linear color space internally.
- When you set a color like `0x336699`, Three.js converts it from sRGB to linear for internal processing.
- The `OutputPass` at the end converts from linear to sRGB for display.

So the normal pipeline is:
1. RenderPass: renders scene in linear color space
2. OutputPass: converts linear → sRGB

If I add an inversion pass between RenderPass and OutputPass:
- After RenderPass, the buffer contains linear colors
- The linear color for `0x336699` (sRGB) would be: `0x33/255 ≈ 0.2` → linear ≈ `0.2^2.2 ≈ 0.0322` (roughly)
- If I invert in linear: `1.0 - 0.0322 = 0.9678`
- Then OutputPass converts back to sRGB: `0.9678^(1/2.2) ≈ 0.984` → `0x984` → `0x255` roughly

That's NOT `0xcc9966`. So inverting in linear space and then converting to sRGB doesn't give the right answer.

The requirement says: "the final colors ON SCREEN must be the exact inverse of what the screen would show without the effect."

Without the effect:
- Background on screen: `0x336699` (sRGB)
- Sphere on screen: `0xffffff` (sRGB)

With the effect, on screen:
- Background should be: `1.0 - 0x33/0xff, 1.0 - 0x66/0xff, 1.0 - 0x99/0xff` = `0xcc, 0x99, 0x66` → `0xcc9966`
- Sphere should be: `1.0 - 1.0, 1.0 - 1.0, 1.0 - 1.0` = `0x000000` (black)

So the inversion needs to happen in sRGB space (the final display space).

**Approach 1**: Put the inversion pass AFTER the OutputPass.
- RenderPass → OutputPass (linear→sRGB) → Inversion (in sRGB space)
- This would give exactly the right result because the inversion happens after the color space conversion.

But wait - does EffectComposer allow passes after OutputPass? Yes, you can add any pass in any order.

Actually, let me reconsider. The `OutputPass` does linear→sRGB conversion and tone mapping. If I put my ShaderPass after OutputPass, the buffer will be in sRGB at that point, and inverting gives the correct result.

**Approach 2**: Put the inversion pass BEFORE the OutputPass, but do the conversion in the shader.
- RenderPass → Inversion (but the buffer is in linear space here)
- If I invert in linear space, I get wrong results as shown above.
- Unless I do: sRGB(linear) → invert → linear. That is, convert to sRGB, invert, convert back to linear, then OutputPass converts to sRGB again.
- This would work but is more complex and potentially lossy.

**Approach 1 is cleaner and correct.** Let me go with: RenderPass → OutputPass → Inversion ShaderPass.

Wait, but there's a subtlety. The `OutputPass` in Three.js applies tone mapping and color space conversion. After OutputPass, the colors are in sRGB gamma. So inverting them in the next pass gives the correct sRGB inversion.

Let me verify:
- Background `0x336699` in sRGB → stored in scene
- Three.js converts to linear for rendering: `linear = (0x33/255)^2.2` etc.
- RenderPass outputs linear colors
- OutputPass converts linear → sRGB: back to `0x336699`
- Inversion pass: `1.0 - 0x33/255, 1.0 - 0x66/255, 1.0 - 0x99/255` = `0xcc/255, 0x99/255, 0x66/255` = `0xcc9966` ✓
- Sphere `0xffffff` → linear `1.0` → OutputPass → `1.0` → inversion → `0.0` = black ✓

This works.

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

const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

// Inversion shader
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
      color.rgb = 1.0 - color.rgb;
      gl_FragColor = color;
    }
  `
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);

// Expose
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

// Render loop
let ready = false;
renderer.setAnimationLoop((time: number) => {
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, I need to double-check the ShaderPass uniform. The ShaderPass constructor expects a shader object with `uniforms`, `vertexShader`, and `fragmentShader`. The `tDiffuse` uniform is automatically set by ShaderPass to the input texture. Let me make sure the type is correct.

Actually, looking at the ShaderPass source, it expects the uniforms to have `tDiffuse` which it will set automatically. The initial value can be `null` but TypeScript might complain. Let me use `new THREE.Texture()` or just cast.

Actually, in strict mode, `THREE.Texture` is fine. But the initial value being null might be an issue. Let me just use `null as any` or better, I'll initialize it properly.

Looking at how ShaderPass works - it takes a shader object and the `tDiffuse` uniform is expected to be a texture that gets set each frame. The initial value can be anything; it gets overwritten. In strict TypeScript, I need to type it correctly.

Let me use:
```typescript
uniforms: {
  tDiffuse: { value: null as THREE.Texture | null }
}
```

Hmm, but `THREE.Texture | null` might not be assignable to the expected type. Let me just use `new THREE.DataTexture()` as a placeholder or cast.

Actually, the simplest approach that compiles with `--strict`:

```typescript
const invertShader = {
  uniforms: {
    tDiffuse: { value: null }
  },
  vertexShader: `...`,
  fragmentShader: `...`
};
```

But `null` might not be assignable to `THREE.Texture` in strict mode. Let me check what ShaderPass expects...

ShaderPass extends Pass and its constructor is `constructor(shader: TShader, textureID?: string)`. TShader is `{ uniforms: { [key: string]: IUniform }, vertexShader: string, fragmentShader: string }`.

IUniform is `{ value: any }` essentially (or more specifically in newer Three.js it's `{ value: any }`).

Actually in Three.js types, `IUniform` is `{ value: any }` - wait, let me think. In the type definitions, it's typically:

```typescript
interface IUniform<T = any> {
  value: T;
}
```

So `{ value: null }` should be fine since T defaults to `any`.

But wait, in strict mode with `noImplicitAny`, if I write `{ value: null }` without a type annotation, TypeScript infers it as `null`. That should be fine since it's assignable to `any`.

Let me just write it cleanly. The key concern is making sure it compiles with `--strict`.

Let me also think about whether `OutputPass` needs any special handling. In newer Three.js versions, `OutputPass` handles tone mapping and color space conversion. By default, the renderer's output color space is SRGBColorSpace.

The order should be:
1. RenderPass (renders scene in linear)
2. OutputPass (applies tone mapping + linear→sRGB)
3. ShaderPass (inverts in sRGB)

This gives the correct result.

Let me also make sure I handle the `time` parameter properly. The animation loop callback receives `time` in milliseconds. I don't actually need motion for this scene (static sphere and background), so I just need to call `composer.render()`.

But the requirement says "Motion must use delta/elapsed time, not frame counts." Since there's no motion needed (static scene), I'll just ensure the loop uses the time parameter if needed. Actually, the scene is static so there's no motion to animate. The requirement is about IF there were motion. Since this is a static scene, I just render.

Let me finalize the code.
