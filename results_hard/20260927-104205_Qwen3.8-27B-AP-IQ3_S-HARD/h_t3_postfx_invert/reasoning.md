The user wants a post-processing color-inversion effect with correct color space handling.

Let me think about this carefully:

1. **The scene**: Background `0x336699`, white sphere, camera at (0,0,4).
2. **The post-processing chain**: RenderPass → ShaderPass (invert) → OutputPass.

**The key color space question:**

In Three.js, the renderer works in linear color space internally. When rendering to the screen normally:
- Materials store colors in linear space (or the material color is interpreted in sRGB and converted to linear for computation)
- Actually, `MeshBasicMaterial` with color `0xffffff` - the color property is in sRGB by default, but internally Three.js converts it to linear for rendering
- The background `0x336699` - same, it's an sRGB color that gets converted to linear

Wait, let me think more carefully about Three.js color management:

- By default in recent Three.js, `renderer.outputColorSpace = THREE.SRGBColorSpace` (which is the default).
- When you set `material.color.set(0xffffff)`, the color is stored as-is but when used in shaders, it's converted to linear space for computation.
- Actually, let me reconsider. In Three.js with `ColorManagement.enabled = true` (default), when you set a color like `new THREE.Color(0x336699)`, it's interpreted as sRGB and converted to linear internally.

Wait, actually let me reconsider. `THREE.Color` stores values in linear space when ColorManagement is enabled? No...

Let me think again:
- `new THREE.Color(0x336699)` - This stores the hex values as-is in the Color object. The Color object in Three.js stores linear values by default in recent versions.
- Actually, `THREE.Color` with a hex constructor: `new THREE.Color(0x336699)` sets r, g, b to the linear values corresponding to that sRGB hex. Wait no...

Actually in Three.js:
- `new THREE.Color(0x336699)` - The hex is interpreted as sRGB and the Color stores... hmm.

Let me look at this differently. The key insight for the problem:

The requirement is: "The final colors ON SCREEN must be the exact inverse of what the screen would show without the effect."

So without the effect, background `0x336699` appears as `0x336699` on screen (sRGB). With the effect, it should appear as `1.0 - 0x33/0xff = 0xcc`, `1.0 - 0x66/0xff = 0x99`, `1.0 - 0x99/0xff = 0x66` → `0xcc9966`.

The white sphere (0xffffff) appears white on screen normally, so with inversion it should be black (0x000000).

**Where does the linear→sRGB conversion happen?**

In the standard Three.js pipeline:
1. RenderPass renders the scene to a render target (in linear space)
2. OutputPass does the linear→sRGB conversion and tone mapping at the end

So if I do: RenderPass → InvertPass → OutputPass:
- RenderPass outputs linear colors
- InvertPass inverts the linear colors: `linear_inverted = 1.0 - linear_original`
- OutputPass converts to sRGB: `srgb_inverted = linearToSrgb(linear_inverted)`

But we want: `srgb_inverted = 1.0 - srgb_original = 1.0 - srgbToLinear(linear_original)`

These are NOT the same! `1.0 - linear` then convert to sRGB ≠ `1.0 - sRGB`

So the correct approach is:
- Either invert in sRGB space (i.e., convert linear→sRGB first, then invert), OR
- Place the OutputPass BEFORE the InvertPass (so OutputPass does linear→sRGB, then we invert the sRGB values)

Option: RenderPass → OutputPass → InvertPass

With this ordering:
- RenderPass: outputs linear
- OutputPass: converts to sRGB (and applies tone mapping)
- InvertPass: inverts the sRGB values → `srgb_inverted = 1.0 - srgb_original`

This gives us exactly what we want! Background 0x336699 → inverted → 0xcc9966. White → black.

Wait, but does OutputPass expect to be the last pass? Let me think... OutputPass in Three.js's EffectComposer just does the color space conversion. It shouldn't matter if it's not the last pass - it just applies the shader to the buffer.

Actually, looking at Three.js source, OutputPass just applies a shader that does tone mapping + color space conversion. It should work fine as a middle pass.

Alternatively, I could write the invert shader to do the sRGB conversion itself:
- Convert linear to sRGB in the shader, then invert

But the simpler and cleaner approach is: RenderPass → OutputPass → InvertPass.

Wait, but there's a subtlety. The EffectComposer's final pass needs to render to screen. Let me check - in EffectComposer, the last pass in the chain renders to screen (if `renderToScreen` is true, or in newer versions it's handled automatically).

Actually in recent Three.js EffectComposer, the last pass automatically renders to the screen. So if I have:
- RenderPass (renders to composer's write buffer)
- OutputPass (reads from read buffer, writes to write buffer)
- InvertPass (reads from read buffer, writes to screen)

This should work. The InvertPass being last means it renders to screen.

Let me write the code:

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

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Composer
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

// Custom invert shader
const InvertShader = {
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
};

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

// Animation
let lastTime = performance.now();
let ready = false;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;
  
  // Slowly rotate sphere for visual interest
  sphere.rotation.y += delta * 0.5;
  
  composer.render();
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Wait, I need to double-check the color space handling.

In Three.js (r152+), by default:
- `renderer.outputColorSpace = THREE.SRGBColorSpace`
- `THREE.ColorManagement.enabled = true`

When `ColorManagement` is enabled:
- `new THREE.Color(0x336699)` - The hex is treated as sRGB. The Color object stores the LINEAR values internally.
  - Actually wait, I need to verify this. In Three.js, `Color.setHex(0x336699)` - does it convert to linear?
  
Let me reconsider. In Three.js:
- `Color` stores values in a specific color space
- When `ColorManagement.enabled` is true (default), colors specified in sRGB are automatically converted to linear when used in materials
- Actually, `Color.setHex(hex, colorSpace)` - by default colorSpace is `THREE.SRGBColorSpace`
- But `new THREE.Color(0x336699)` calls `setHex(0x336699)` which by default uses SRGBColorSpace
- This means the Color object will have its r,g,b in LINEAR space (converted from the sRGB hex)

Wait, actually I think I'm overcomplicating this. Let me look at it from the pipeline perspective:

When the scene renders to the composer's render target (which is a linear-space target):
- The background color and material colors are in linear space in the framebuffer
- RenderPass outputs linear colors

Then:
- OutputPass applies the output color space conversion (linear → sRGB) and tone mapping
- After OutputPass, the buffer contains sRGB values

Then:
- InvertPass inverts those sRGB values

Result: inverted sRGB = 1.0 - sRGB_original ✓

This is exactly what we want. Background 0x336699 (sRGB) → linear → OutputPass converts back to sRGB (0x336699) → InvertPass → 0xcc9966 ✓
White sphere (sRGB white = 1,1,1) → linear (1,1,1) → OutputPass → sRGB (1,1,1) → InvertPass → (0,0,0) = black ✓

This ordering (RenderPass → OutputPass → InvertPass) is correct.

Let me also make sure the shader is properly written for tsc --strict. The shader strings are fine, the uniforms object needs proper typing.

For `ShaderPass`, the shader object needs to match what ShaderPass expects. Let me check - ShaderPass takes a shader object (or Shader) with uniforms, vertexShader, and fragmentShader. The uniforms need to be typed properly.

Actually for `tsc --strict`, I need to be careful with types. Let me make sure:
- The shader object passed to ShaderPass should have the right structure
- `uniforms` should be `Record<string, { value: any }>` or similar

Let me also make sure I handle the `tDiffuse` uniform - ShaderPass automatically sets `tDiffuse` to the input texture, so I just need to declare it in the shader.

Let me finalize the code and make sure it compiles with `tsc --strict`.

One thing to watch: `renderer.setPixelRatio` - should I include it? The problem says "Size the renderer from window.innerWidth / window.innerHeight" - I'll include pixelRatio for quality but the main sizing is from innerWidth/innerHeight.

Actually, let me reconsider whether to set pixel ratio. The problem says to size from innerWidth/innerHeight. I'll set pixel ratio to 1 to keep it simple and avoid any potential issues with the composer.

Actually, let me just not set pixel ratio to keep things simple and avoid any potential issues with the composer and color space.

Let me finalize:
