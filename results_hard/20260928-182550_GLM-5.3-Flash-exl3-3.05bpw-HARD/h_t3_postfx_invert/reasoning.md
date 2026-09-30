Let me think about how to set this up correctly so the final on-screen colors are the exact inverse.

Setup: Scene background is 0x336699 (in sRGB hex, converted to linear internally). The sphere is white (1,1,1 in linear).

Without post-processing: renderer.render() would render the scene into the canvas with outputColorSpace = SRGBColorSpace by default, so linear colors get converted to sRGB on output. The background 0x336699 as seen on screen without effect is exactly 0x336699 (since the color is specified in sRGB and converted to linear then back to sRGB, round trip is exact with proper encoding). White sphere stays white.

With post-processing:
- RenderPass renders the scene into a render target (linear values, since render targets are linear... actually render targets in three.js store raw values; when rendering to a render target, no output color space conversion is applied — conversion happens only when rendering to canvas with outputColorSpace sRGB).
- So the RenderPass render target contains linear values: bg = srgbToLinear(0x33, 0x66, 0x99), sphere = (1,1,1).
- My custom ShaderPass must invert the final sRGB values. If I simply do 1.0 - color in linear space, then OutputPass converts linear->sRGB, the result won't be the exact inverse of 0x336699 in sRGB.
- The requirement: on screen, background should appear 0xcc9966 = (204, 153, 102) = inverse of (51, 102, 153). White sphere appears black (0,0,0). Inverse of sRGB white (255) is 0 in sRGB; linear inverse of linear white 1 is 0, which converts to sRGB 0. That works either way for white. But for the background, we need the inversion to happen "in sRGB space" (or specifically, the inverse of the final displayed color).

Approach options:

Option A: Convert linear to sRGB inside the shader, invert, then... but then OutputPass would again apply linear->sRGB conversion. That would double-convert. To fix, we could tell OutputPass... OutputPass applies tone mapping and output color space conversion based on renderer settings. If the shader outputs sRGB values, then OutputPass converting them again would be wrong.

Option B: Do the inversion in sRGB space within the shader: take the linear color from RenderPass, convert linear->sRGB in shader, invert (1.0 - srgb), then convert sRGB->linear back, and let OutputPass do the final linear->sRGB. Then final = srgbToLinear(1 - linearToSrgb(c)) converted back to sRGB = 1 - linearToSrgb(c). That gives exact inverse of the displayed color. 

Actually simpler: since OutputPass does the linear->sRGB conversion, we need the render target after our shader pass to contain linear values L' such that linearToSrgb(L') = 1 - linearToSrgb(L). So L' = srgbToLinear(1 - linearToSrgb(L)). So in the shader: srgb = LinearToSrgb(L); inv = 1 - srgb; out = SrgbToLinear(inv).

Alternatively, Option C: Set renderer.outputColorSpace = THREE.LinearSRGBColorSpace (or NoColorSpace), so OutputPass doesn't convert, and in the shader do: convert linear->sRGB, invert, output sRGB directly. Then the final framebuffer holds sRGB values directly. Final on screen = 1 - linearToSrgb(L) which equals exact inverse of the displayed color without effect (since without effect with linear output color space... hmm but "the screen would show without the effect" — the comparison is presumably against the default setup where renderer.render() shows 0x336699 with sRGB output).

Wait — careful. If I change renderer.outputColorSpace to Linear, then "without the effect" the scene would show linear values directly, which wouldn't be 0x336699. But the requirement states the final colors on screen must be the exact inverse of what the screen would show without the effect. If I disable the sRGB output conversion, then without effect the screen would show linear values (which visually would differ from 0x336699). Hmm, but the requirement pins the specific expected values: background 0x336699 appears as 0xcc9966. 0xcc9966 = (255-51, 255-102, 255-153) = (204, 153, 102). Yes.

So the safest approach: keep renderer default (outputColorSpace = SRGBColorSpace), RenderPass renders linear into RT, my shader converts to sRGB, inverts, converts back to linear, and OutputPass does final linear->sRGB conversion. Result on screen: inverse in sRGB space of displayed color. 

Hmm, but actually there's a subtlety: three.js newer versions render to the render target with... Let me recall: In modern three.js (r152+), when rendering to a render target with a color space, the output color space conversion depends on the render target's texture colorSpace. Default render targets created by EffectComposer use... EffectComposer creates render targets with type HalfFloatType (in newer versions) and default color space (LinearSRGBColorSpace i.e. no conversion). So RenderPass output is linear values. Good.

Then outputColorSpace conversion happens only in the final pass to the canvas. OutputPass reads renderer.outputColorSpace and applies the sRGB transfer. So my plan works.

Shader GLSL:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, pow(c, vec3(1.0/2.4)) * 1.055 - 0.055, step(0.0031308, c));
}
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055)/1.055, vec3(2.4)), step(0.04045, c));
}

void main() {
  vec4 col = texture2D(tDiffuse, vUv);
  vec3 srgb = linearToSrgb(max(col.rgb, 0.0));
  vec3 inv = 1.0 - srgb;
  gl_FragColor = vec4(srgbToLinear(inv), col.a);
}
```

Actually careful with three.js built-in chunks — I could include <colorspace_pars_fragment> etc., but writing my own is fine and "write the GLSL yourself."

Need clamp: col.rgb could be slightly >1? With basic materials no, values are ≤1. But pow of negative — clamp to 0.

Also note: colorspace conversion in shader — three.js defines include chunks if we want; but plain GLSL works with ShaderPass as it compiles raw shader with some prefixes (cameraPosition etc. not needed). ShaderPass uses UniformsUtils.clone and creates ShaderMaterial. Fine.

Now precision: linearToSrgb(srgbToLinear(x)) — for exact round trip of 0x336699? The background color: THREE.Color with setHex(0x336699) applies sRGB->linear conversion (working color space linear by default, ColorManagement enabled). So background linear = srgbToLinear(51/255, 102/255, 153/255). Then in shader, linearToSrgb of that... floating point rounding could produce 50.999/51 in 8-bit. The final framebuffer is 8-bit; rounding to nearest should give back 51 for background... Wait no — the final value: we invert, so final = srgb display value = 255 - 51 = 204 for round trip exact. Rounding: srgb = linearToSrgb(bgLinear) ≈ 0.2 (51/255). inv = 0.8. srgbToLinear(0.8) then OutputPass linearToSrgb(0.8) ≈ 0.8 → 204. Small float errors (~1e-7) won't shift 8-bit rounding except at exact .5 boundaries; acceptable. This is the standard approach.

Alternatively, a cleaner approach that avoids double conversion: do the inversion in linear space? No — inverse in linear is not inverse in sRGB perceptually; the requirement demands exact byte inversion, so sRGB-space inversion is needed. My approach is correct.

Another approach: order passes so my shader is AFTER OutputPass. Then OutputPass outputs sRGB-encoded values into... but the composer's final pass renders to screen; if my ShaderPass is last, it writes to screen. ShaderPass renders with a ShaderMaterial to the canvas — three.js would apply output color space conversion when rendering to canvas! Hmm, actually for ShaderMaterial, three.js applies... When rendering to canvas (null render target) with outputColorSpace sRGB, three.js appends the color space conversion fragment chunks to built-in materials; for ShaderMaterial/RawShaderMaterial, the output color space conversion is applied via `#include <colorspace_fragment>` only if the shader includes it. Actually in recent three.js, ShaderMaterial does get the encodings automatically? Let me recall: In r152+, the output color space conversion for ShaderMaterial is NOT automatically applied — you need to include `#include <colorspace_fragment>` in the shader. Hmm, actually there was a change: ShaderMaterial shaders get `#include <colorspace_fragment>` handling only if written. The renderer appends... no. For ShaderMaterial, the user must handle encoding. Actually I recall that ShaderMaterial DOES receive the colorspace_fragment chunk substitution only if the shader source contains it.

Hmm, but there's another subtlety: OutputPass writes to a render target if it's not the last pass. EffectComposer: renderToScreen is set on the last pass. If I order: RenderPass, OutputPass, InvertPass — OutputPass would render into the write buffer with linear-to-sRGB conversion applied (since outputColorSpace... OutputPass applies conversion based on renderer.outputColorSpace regardless of target? OutputPass shader uses `#include <colorspace_fragment>` with the shader defining... OutputPass fragment shader: it includes tonemapping_fragment and colorspace_fragment. The colorspace conversion chunk uses the render target's color space / output color space — it's resolved at compile/material update time based on renderer state. If rendering to a render target whose texture colorSpace is LinearSRGB, then... The chunk `colorspace_fragment` converts to the output color space which for a render target is the target's colorSpace? In the WebGLProgram, the output color space is determined by renderer.outputColorSpace when rendering to canvas, or renderTarget.texture.colorSpace when rendering to a render target. EffectComposer's render targets: created with default color space (LinearSRGB? Actually new WebGLRenderTarget default texture colorSpace is NoColorSpace/Linear). So OutputPass into RT would not convert... This gets complicated. Then my invert pass with plain gl_FragColor to canvas — no conversion applied. So final = 1 - (unchanged sRGB values that OutputPass wrote)... only if OutputPass converted when writing to RT, which it doesn't (RT is linear space). Hmm, this ordering approach is fragile.

Stick with: RenderPass → InvertShader (with sRGB round trip inside) → OutputPass. This is the standard robust solution.

Actually wait — there's subtlety about OutputPass's colorspace_fragment behavior: OutputPass material is a ShaderMaterial; the `#include <colorspace_fragment>` chunk resolves `linearToOutputTexel` based on the current output color space, which the renderer determines per-render. When OutputPass renders to screen (renderToScreen=true, null target), output color space = renderer.outputColorSpace = SRGBColorSpace → conversion applied. Good.

One more consideration: does three.js RenderPass render to RT with any color space conversion? No — RT colorSpace default is NoColorSpace (linear-ish), so values stay linear. Good.

Also HalfFloat vs UnsignedByte composer targets: newer EffectComposer defaults to HalfFloatType. HalfFloat keeps linear values fine.

Also alpha: background alpha... scene.background with Color: renders as background with alpha 1. Fine.

Now, "After the first frame is rendered, set __ready = true": use a flag; in the animation loop, after composer.render(), if !ready set ready = true. But does composer.render() actually complete the frame before JS continues? Yes, WebGL commands... setAnimationLoop callback; after first composer.render() call, we can set __ready = true. The pixels may not be composited yet, but that's the standard expectation. To be safer, ensure at least one render happened. Fine.

Resize: update camera.aspect + updateProjectionMatrix, renderer.setSize, composer.setSize. Also maybe set composer setPixelRatio — optional; I'll set renderer.setPixelRatio(Math.min(devicePixelRatio, 2)) and composer.setPixelRatio similarly. EffectComposer has setPixelRatio. Keep it simple but include it.

Renderer: `new THREE.WebGLRenderer({ antialias: true })`. Hmm, antialiasing with composer: MSAA on canvas doesn't apply since rendering via composer... The final quad pass - antialias irrelevant. Keep antialias true anyway harmless. Actually with composer, the canvas AA doesn't matter. Fine.

Write the code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Shader definition:

```ts
const InvertShader = {
  name: 'InvertSRGBShader',
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `...`,
  fragmentShader: `...`
};
```

ShaderPass constructor expects a shader object with uniforms/vertexShader/fragmentShader; uniforms type — ShaderPass's constructor signature in TS: `constructor(shader: object, textureID?: string)`. So passing plain object fine. The uniform value typing: `{ value: null }` — cloning via UniformsUtils.clone works with null uniform; then it gets set to the read buffer texture by the pass. UniformsUtils.clone may complain about null value? It handles null fine (it clones values with value.clone if it's a clone-able... it checks if value is Texture etc.; for null it just assigns). Actually UniformsUtils.clone: for each uniform, if value && (value.isTexture || ...) then clone... else copies. null → copies null. OK.

TS strictness: uniform type is `{ [uniform: string]: IUniform }` — IUniform value is any. Fine.

In the animation loop, use clock.getDelta passed to composer.render(delta). composer.render accepts deltaTime.

The fragment shader — careful with GLSL: use highp; functions defined before main.

Precision of the inverse transform to hit exact bytes: The chain is: L0 = srgbToLinear(51/255) computed by three.js Color (in JS, uses Math.pow etc. maybe slightly different formula — three.js uses the standard piecewise? three.js ColorManagement uses the sRGB transfer functions piecewise? Let me recall: three.js uses... In WebGLColor/ColorManagement, SRGBToLinear defined as: if c <= 0.04045 → c/12.92 else pow((c+0.055)/1.055, 2.4). Yes, standard. And output linear→sRGB in shader (colorspace fragment chunk): mix based on step, pow 1/2.4. These are exact inverses mathematically. Float rounding: fine for 8-bit targets as long as result not exactly at a boundary. 204/255=0.8. srgbToLinear(0.8)=0.603827..., linearToSrgb back gives ~0.8 within 1e-6. Rounding to nearest gives 204. Good.

Half float RT precision: fine.

One consideration: max(col.rgb, 0.0) and min(col.rgb, 1.0)? Clamp to [0,1] to avoid pow issues. Clamp lower bound only needed for pow; values could be > 1? Not with basic material. I'll clamp both.

Should the inversion also invert alpha? Background opaque. Keep alpha = col.a.

Now also handle: `scene.background = new THREE.Color(0x336699);` — with default color management, setHex converts from sRGB to linear working space. Good.

Sphere: MeshBasicMaterial color 0xffffff → linear 1. RenderPass → 1,1,1. In shader: linearToSrgb(1)=1, inv=0, srgbToLinear(0)=0, OutputPass → 0 → black. 

Resize: also update composer.setSize(w, h).

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const InvertColorsShader = {
  name: 'InvertColorsShader',
  uniforms: {
    tDiffuse: { value: null },
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

    const float SRGB_EPSILON = 0.0031308;
    const float SRGB_LINEAR_THRESHOLD = 0.04045;

    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055;
      return mix(lo, hi, step(vec3(SRGB_EPSILON), c));
    }

    vec3 srgbToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      return mix(lo, hi, step(vec3(SRGB_LINEAR_THRESHOLD), c));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 linear = clamp(texel.rgb, 0.0, 1.0);
      vec3 srgb = linearToSRGB(linear);
      vec3 inverted = 1.0 - srgb;
      gl_FragColor = vec4(srgbToLinear(inverted), texel.a);
    }
  `,
};
```

Note: linearToSRGB hi: pow(c, 1/2.4)*1.055 - 0.055 for c ≥ 0.0031308. And srgbToLinear threshold 0.04045. Good.

Main code:

```ts
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
const invertPass = new ShaderPass(InvertColorsShader);
const outputPass = new OutputPass();
composer.addPass(renderPass);
composer.addPass(invertPass);
composer.addPass(outputPass);
```

Animate:

```ts
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  composer.render(delta);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Expose globals. Resize handler.

TS strict: `(window as any).__scene = scene;` fine.

One TS issue: ShaderPass type: `new ShaderPass(InvertColorsShader)` — the constructor param type is `object`? Check @types/three / three's own d.ts: `class ShaderPass extends Pass { constructor(shader: object, textureID?: string); ... }`. Yes it accepts object. uniforms property: `{ [uniform: string]: { value: any } }`. OK.

EffectComposer.setPixelRatio exists. Good.

Also should I handle `delta` param typing: composer.render(delta) – renders deltaTime?: number. Fine.

Also camera.lookAt(0,0,0) — position (0,0,4) default orientation already looks at origin, but call it anyway.

Done. Output single ts block.