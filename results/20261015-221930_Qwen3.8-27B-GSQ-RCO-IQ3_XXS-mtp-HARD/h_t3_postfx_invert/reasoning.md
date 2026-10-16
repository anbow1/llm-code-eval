Let me think through this carefully.

The requirement is:
- Scene background: 0x336699
- White sphere (MeshBasicMaterial color 0xffffff)
- Camera at (0, 0, 4) looking at origin
- EffectComposer with RenderPass, custom ShaderPass (invert colors: rgb -> 1.0 - rgb), and OutputPass
- Final colors on screen must be exact inverse of what screen would show without the effect
- Background 0x336699 must appear as 0xcc9966, white sphere as black

Let me think about the color space:

Three.js by default renders in linear color space. The renderer's output is in linear RGB. The OutputPass handles the conversion from linear to sRGB (gamma correction).

So the pipeline without post-processing:
1. RenderPass renders the scene in linear color space
2. OutputPass converts linear -> sRGB

With the inversion:
- Without effect: background 0x336699 (which is stored as sRGB values in Three.js... wait, let me think more carefully)

Actually, in Three.js, when you set a color like `new THREE.Color(0x336699)`, the values are stored as sRGB values (i.e., the hex values directly). When rendering, the renderer converts these to linear internally for lighting calculations, but for MeshBasicMaterial, the color is used directly.

Wait, let me reconsider. In Three.js:
- `new THREE.Color(0x336699)` stores the values as (0x33/255, 0x66/255, 0x99/255) in the color object.
- When the renderer renders, it works in linear color space. The material colors are converted from sRGB to linear before being used in shaders.
- The OutputPass converts from linear to sRGB for display.

So without post-processing:
- Background 0x336699 → stored as sRGB (0.2, 0.4, 0.6) → converted to linear in shader → OutputPass converts back to sRGB → screen shows 0x336699
- White sphere 0xffffff → stays white throughout → screen shows 0xffffff

Now with the inversion shader:
- If I invert AFTER the linear->sRGB conversion (i.e., in OutputPass or after it), then:
  - Background: sRGB 0x336699 → invert → 0xcc9966 ✓
  - White: sRGB 0xffffff → invert → 0x000000 ✓

- If I invert BEFORE the linear->sRGB conversion (i.e., in linear space), then:
  - Background: sRGB (0.2, 0.4, 0.6) → linear (≈0.033, 0.132, 0.314) → invert → (0.967, 0.868, 0.686) → sRGB → (≈0.983, 0.946, 0.847) which is NOT 0xcc9966

So the inversion must happen in sRGB space, i.e., AFTER the OutputPass conversion. But wait, the OutputPass is supposed to be the last pass...

Actually, let me reconsider. The standard pipeline is:
1. RenderPass - renders scene to a render target (linear)
2. ShaderPass - our inversion (operates in linear space)
3. OutputPass - converts linear to sRGB

If we put the inversion in linear space, the result won't be the correct sRGB inversion.

To get the correct result, we need the inversion to happen in sRGB space. Options:
1. Put the inversion AFTER OutputPass - but OutputPass is supposed to be last
2. Convert linear to sRGB in our shader, then invert, then OutputPass would double-convert... no that's wrong.

Wait, actually let me reconsider. What if we:
1. RenderPass (linear)
2. OutputPass (linear -> sRGB)
3. ShaderPass (invert in sRGB)

But can OutputPass be in the middle? Let me check... Yes, you can put passes in any order. OutputPass just does the tonemapping and sRGB conversion.

Actually wait - the requirement says "a custom ShaderPass (write the GLSL yourself) that inverts the colors (rgb -> 1.0 - rgb), and an OutputPass". It doesn't specify the order explicitly, but says "Think about where the linear -> sRGB conversion happens and order the passes (or convert in the shader) so this holds."

So option A: Order passes as RenderPass → OutputPass → ShaderPass(invert). This way:
- RenderPass outputs linear
- OutputPass converts to sRGB
- ShaderPass inverts in sRGB space

Option B: Keep RenderPass → ShaderPass → OutputPass, but have the ShaderPass convert linear to sRGB first, then invert.

I'll go with option A: RenderPass → OutputPass → ShaderPass.

Wait, but will this work? Let me verify:
- Background 0x336699: The scene background is set to this color. In Three.js, the background color is rendered in the scene. With MeshBasicMaterial and scene.background, the color values... 

Actually, I need to be more careful. When you set `scene.background = new THREE.Color(0x336699)`, Three.js will render this in the appropriate color space. The renderer handles the sRGB conversion.

Let me trace through:
1. RenderPass: The scene is rendered. The background color 0x336699 and the white sphere are rendered in linear color space (Three.js internally converts sRGB inputs to linear for rendering). The framebuffer contains linear values.
2. OutputPass: Converts linear to sRGB. Now the framebuffer has sRGB values: background is (0.2, 0.4, 0.6) in sRGB, sphere is (1.0, 1.0, 1.0).
3. ShaderPass (invert): rgb -> 1.0 - rgb. Background becomes (0.8, 0.6, 0.4) = 0xCC9966. Sphere becomes (0.0, 0.0, 0.0) = black. ✓

This works!

But wait - does the OutputPass in the middle work correctly? The OutputPass in Three.js does:
- Applies tone mapping
- Converts from linear to sRGB (or applies the renderer's output encoding)

Actually, looking at the Three.js source, OutputPass uses `colorSpace` and `toneMapping` from the renderer. It should work in the middle of the chain.

Let me also consider: does the RenderPass output to a render target that's in linear space? Yes, by default render targets in Three.js are in linear color space.

And does the OutputPass correctly convert to sRGB? Yes, it applies the sRGB transfer function.

So the order RenderPass → OutputPass → ShaderPass should give us the correct result.

Now let me write the code:

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeo, sphereMat);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

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
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      color.rgb = 1.0 - color.rgb;
      gl_FragColor = vec4(color.rgb, color.a);
    }
  `,
};

composer.addPass(new ShaderPass(invertShader));

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
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, let me double-check the ShaderPass uniform name. ShaderPass expects the texture uniform to be named `tDiffuse`. Let me verify... Yes, ShaderPass in Three.js uses `tDiffuse` as the default texture uniform name.

Also, I should make sure the fragment shader handles the color correctly. The OutputPass converts to sRGB, so the values in the shader will be sRGB values. Inverting them gives the correct result.

Let me also think about whether the alpha channel needs handling. The background is opaque, the sphere is opaque, so alpha should be 1.0 everywhere. I'll just pass alpha through.

One more thing: the `tsc --strict` requirement. Let me make sure the types are correct. The shader object passed to ShaderPass - the uniforms value for tDiffuse should be typed properly.

Actually, looking at ShaderPass, it accepts a shader object with `uniforms`, `vertexShader`, and `fragmentShader`. The type is `ShaderMaterial`-like. Let me type it properly.

For strict mode, I need to be careful with the uniforms. The `tDiffuse` value is initially null but will be set by ShaderPass. I'll type it as `{ value: null }` or use a proper type.

Actually, let me look at how ShaderPass is typed. It takes a shader parameter that has:
- uniforms: { [key: string]: { value: any } }
- vertexShader: string
- fragmentShader: string

In strict mode, I should type this properly. Let me use `Record<string, { value: unknown }>` or just type it inline.

Actually, the simplest approach for strict TypeScript is:

```typescript
const invertShader: {
  uniforms: { tDiffuse: { value: THREE.Texture | null } };
  vertexShader: string;
  fragmentShader: string;
} = { ... };
```

Hmm, but ShaderPass expects the type from three/addons. Let me just cast it or use `as any` if needed. Actually, let me check what type ShaderPass expects.

Looking at the Three.js types, ShaderPass constructor takes `shader: ShaderMaterial` or an object with uniforms, vertexShader, fragmentShader. The type is typically:

```
{
  uniforms: { [uniform: string]: IUniform };
  vertexShader: string;
  fragmentShader: string;
}
```

Where IUniform is `{ value: any, ... }`.

For strict mode, I'll type the uniforms properly. Let me just use:

```typescript
const invertShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
  },
  vertexShader: `...`,
  fragmentShader: `...`,
};
```

This should work with strict mode since `null as THREE.Texture | null` is a valid type.

Wait, actually I realize that in the ShaderPass, the `tDiffuse` uniform value gets set to the input texture by the pass itself. So initializing it to null is fine.

Let me finalize the code. I think my solution is correct. Let me write it out cleanly.
