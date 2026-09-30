The classic pitfall: RenderPass renders to an intermediate render target. With EffectComposer in recent three.js, render targets are linear (HalfFloatType), and OutputPass does the tone mapping + sRGB conversion at the end. So a ShaderPass that does gl_FragColor = 1.0 - color between RenderPass and OutputPass operates on linear values, while OutputPass converts linear→sRGB. Inverting in linear space does NOT invert the sRGB-encoded output as desired (1-x in linear ≠ inverse of sRGB encoding).

We want: displayed sRGB value = 1 - original displayed sRGB value. The original pipeline: linear value L → OutputPass converts to sRGB → screen shows sRGB(L). We want screen to show 1 - sRGB(L).

Options:
1. Do the inversion after sRGB conversion. Put the ShaderPass after OutputPass, and in the ShaderPass convert linear→sRGB first then invert? Actually if ShaderPass is after OutputPass, the buffer already contains sRGB-encoded values (OutputPass writes sRGB into the target? OutputPass outputs encoded values into whatever render target — if renderToScreen, it goes to the screen). If ShaderPass follows OutputPass, the intermediate holds sRGB-encoded values stored in a linear float texture... then inverting there gives 1 - sRGB(L), but then that value is written directly to screen (renderToScreen) without further encoding — but values written to the default framebuffer... since it's a plain shader, gl_FragColor = 1 - srgbValue, written as-is. That works if no further conversion. But three r152+ with outputColorSpace SRGB: writing to canvas framebuffer — the renderer does not do automatic conversion for ShaderPass output; the value is written raw. Hmm, actually with WebGL, the fragment output is written as-is to the sRGB... no, the canvas is not an sRGB framebuffer; the values are raw. OutputPass manually does the linear→sRGB in shader. So a pass after OutputPass receives already-encoded values and can invert them directly: gl_FragColor = vec3(1.0) - color.rgb. But does the color space of the input texture matter for sampling? Since composer targets are HalfFloatType and texture colorSpace NoColorSpace (linear), sampling returns raw values, no conversion. So this works.

2. Alternatively, do everything in one ShaderPass placed between RenderPass and OutputPass: in the shader, first convert linear→sRGB (or rather compute final sRGB, invert), then convert back sRGB→linear so OutputPass re-encodes it, resulting in screen = inverse. That's the "convert in the shader" approach but messier.

3. Simplest robust approach: place ShaderPass with custom GLSL after OutputPass... but then ShaderPass must be renderToScreen=true and OutputPass's renderToScreen=false (EffectComposer sets renderToScreen automatically for the last pass). EffectComposer: the last pass in the chain renders to screen. So order: RenderPass, OutputPass, InvertPass. InvertPass gets sRGB-encoded values, inverts, writes raw to screen. 

But careful: does OutputPass's encoding depend on renderer.outputColorSpace? OutputPass uses `passFrames`... OutputPass shader applies tone mapping and `linearToOutputTexel`-like encoding based on renderer.outputColorSpace at compile time. If outputColorSpace = SRGBColorSpace (default), OutputPass encodes to sRGB. Then our inversion pass operates on sRGB values. Since it's the final pass writing to canvas, values go raw. Good.

Check: background 0x336699 set as scene.background with THREE.Color. Color 0x336699 — with three r152+ color management enabled, new THREE.Color(0x336699) converts hex from sRGB to linear-sRGB internally. So background linear value = srgbToLinear(0x33, 0x66, 0x99). Pipeline: linear → OutputPass encodes back to sRGB → gives 0x33/255 etc. → invert → 1 - that = 0xcc, 0x99, 0x66 → screen shows 0xcc9966. Correct.

White sphere: linear 1.0 → sRGB 1.0 → inverted 0 → black. Correct.

Alternative: invert in linear then re-encode... no.

Alternatively simpler: put ShaderPass before OutputPass but have the shader do the sRGB conversion then inversion then linear conversion back? That double work. The after-OutputPass approach is cleaner.

Hmm but one subtlety: EffectComposer with only OutputPass in between — intermediate render targets half float, fine.

Another subtlety: the ShaderPass output to screen — no dithering/etc. fine.

Shader GLSL:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(1.0 - color.rgb, color.a);
}
```
For strict GLSL3? ShaderPass default uses GLSL1 style with texture2D — three injects. Fine.

Note: sampling tDiffuse: three injects texture2D alias for WebGL2 via ShaderMaterial (it defines texture2D in glsl3? ShaderMaterial uses GLSL1 by default unless glslVersion set). Fine.

Wait — one concern: when ShaderPass is the last pass writing to canvas (renderToScreen), does three apply any color space conversion to the fragment output? No — postprocessing shaders output raw; OutputPass handles encoding explicitly. So raw inverted sRGB values appear on screen. 

However — potential issue: OutputPass when not rendering to screen encodes to sRGB into a float target. Values remain in [0,1]. Fine.

Also need `#include <colorspace_fragment>`? No, custom.

Let me also double check: renderer.outputColorSpace default is SRGBColorSpace in r152+. OutputPass reads renderer.outputColorSpace to define its output encoding. Since we render with composer, the final pass writes to screen... OutputPass's encoding is set per renderer output color space regardless. Good.

But hmm, do I need to worry about three versions where ShaderPass's material gets `colorspace_fragment`? No, custom shader, no includes.

Resize: composer.setSize(w, h).

Ready flag: after first frame. Use a flag: in animation loop, render, then if not first set __ready = true. renderer.setAnimationLoop callback receives time. Use it.

Delta time: motion minimal — sphere could gently pulse? Requirement says motion must use delta. We can just have subtle rotation using clock. Fine — sphere rotation (invisible on white), maybe scale pulse subtly. Keep simple: rotate sphere over time via elapsed.

Composer render target: since ShaderPass last, need composer.setPixelRatio? Optional. I'll set renderer pixel ratio to devicePixelRatio and composer.setPixelRatio too.

Write code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// composer
const composer = new EffectComposer(renderer);
composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
const invertPass = new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader, fragmentShader });
composer.addPass(invertPass);
```

ShaderPass constructor accepts a shader object; it clones uniforms — fine since tDiffuse value null initially.

Animation loop:

```ts
const clock = new THREE.Clock();
(window as unknown as any).__scene = scene; etc.
let first = true;
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  sphere.rotation.y += delta * 0.5;
  renderer... composer.render();
  if (first) { (window as any).__ready = true; first = false; }
});
```

Note: set __ready after composer.render — the first frame is rendered synchronously.

Resize handler: update camera aspect, renderer.setSize, composer.setSize.

Typing: avoid `any`? tsc strict allows `any` explicitly; `(window as any)` is fine per requirements.

ShaderPass constructor parameter type: it's `Shader | ShaderMaterial`... In three's types, ShaderPass takes `shader: object | ShaderMaterial`. Passing object literal fine.

Write it out.