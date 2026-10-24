The key: RenderPass renders into composer's render target. In three.js (r152+), composer render targets are... EffectComposer's renderTarget defaults to HalfFloatType, and color space handling: RenderPass renders scene into a target; with renderer.outputColorSpace = SRGBColorSpace, the renderer only applies output conversion when rendering to canvas (null target). When rendering to a render target, the output is linear. So the composer chain holds linear values. The custom ShaderPass inverts: 1.0 - color, still linear. Then OutputPass does linear→sRGB conversion (and tone mapping).

The requirement: on-screen colors must be exact inverse of what screen would show without effect. Without effect: renderer renders linear color 0x336699. Scene background color: THREE.Color(0x336699) — with ColorManagement enabled, setHex converts sRGB 0x336699 to linear working space. Without postprocessing, renderer converts linear back to sRGB → screen shows 0x336699. Sphere white 0xffffff → linear 1 → sRGB 1 → white.

With composer: linear values in target. Invert linearly: 1 - lin(0x336699) for each channel, then OutputPass converts linear→sRGB. lin(0x33/255=0.2) → sRGB(0.2) = 0.2^(1/2.4)-ish... Actually sRGB to linear: linear = ((c+0.055)/1.055)^2.4 for c > 0.04045. Then inverse: sRGB(1-linear) vs 1 - sRGB(linear). These differ! 1 - sRGB(l) ≠ sRGB(1 - l) in general.

Without effect: screen shows sRGB(0.2) = 0.2 → 0x33. Inverse on screen should be 0xCC = 0.8. sRGB(1 - lin(0.2)) = sRGB(1 - 0.0331) = sRGB(0.9669) ≈ ... sRGB(0.9669) = 1.055*0.9669^(1/2.4) - 0.055 = 1.055*0.98654 - 0.055 ≈ 0.9858 → 0xFB, not 0xCC. So inverting in linear space gives wrong result.

Correct: invert in sRGB space. So either invert in the shader after linear→sRGB conversion, or compute sRGB values directly. Options:

1. ShaderPass: convert incoming linear color to sRGB in shader, invert, then OutputPass would re-apply conversion — bad. Unless we skip OutputPass and set the pass to renderToScreen with the conversion done in shader. But requirement says use OutputPass.

Hmm, but wait — does OutputPass check if color space conversion already applied? OutputPass in recent three.js converts working color space to output color space. If we already converted in shader, OutputPass would convert again.

Alternative: put inversion pass AFTER OutputPass. Order: RenderPass → OutputPass (linear→sRGB conversion) → ShaderPass (invert). Then shader receives sRGB-encoded colors, inverts 1.0 - rgb, exact inverse. That's the clean solution: OutputPass converts to sRGB, then invert. The ShaderPass's output to screen — since values are already sRGB-encoded, no further conversion happens (renderer doesn't convert on renderToScreen pass-through? Actually when rendering to screen with a full-screen quad material, the shader output goes directly; renderer.outputColorSpace conversion is done in the material's output via... hmm).

Actually in three.js, the color space conversion for render-to-screen happens because renderer.outputColorSpace = SRGBColorSpace makes the renderer... no — the conversion is done in the fragment shader via included chunks (colorspace_fragment) in built-in materials. For a ShaderPass's shader, there's no colorspace_fragment chunk, so output goes raw. That's why ShaderPass invert after OutputPass works: OutputPass already did conversion, ShaderPass just flips channels, output raw to screen. 

But wait — does composer's renderToScreen final pass apply conversion? No. The CopyShader / last pass writes directly. Actually, in three.js r152+, there's a subtlety: EffectComposer sets `renderer.outputColorSpace`? No. RenderPass renders scene to render target — but scene materials when rendering to a target: renderer checks renderTarget color space; composer's render target... EffectComposer creates render target with type HalfFloatType and colorSpace... default LinearSRGBColorSpace? Actually WebGLRenderTarget default colorSpace is NoColorSpace... Hmm, in r152+, WebGLRenderTarget default texture.colorSpace = NoColorSpace which is treated as linear for rendering. Materials rendered to a target with non-sRGB color space do NOT apply output conversion. Good.

OutputPass reads renderer.outputColorSpace and applies conversion from working (linear) to sRGB in its shader. Then our invert pass after it operates on sRGB-encoded values.

Order: RenderPass, OutputPass, ShaderPass(invert). The final pass (ShaderPass) renders to screen (composer sets renderToScreen on last pass automatically when composer.renderToScreen... EffectComposer automatically renders the last pass to screen if composer.renderToScreen is true, which is default... Actually EffectComposer sets pass.renderToScreen for the last enabled pass? In current three.js, EffectComposer renders passes; the last pass renders to screen if `this.renderToScreen` on composer is true — yes, composer.renderToScreen defaults true, and in render() the last enabled pass is rendered to screen.

Wait, actually let me recall: EffectComposer.render(): `const il = this.passes.length; ... pass.renderToScreen = (this.renderToScreen && isLastEnabledPass(i))`. Yes, modern versions do that.

So order: RenderPass → OutputPass → InvertPass. Shader inverts: gl_FragColor = vec4(1.0 - color.rgb, color.a) or 1.0 - gl_FragColor.

Hmm, but OutputPass also applies tone mapping. Default renderer.toneMapping = NoToneMapping, fine.

One catch: RenderPass output linear values in a HalfFloat target. OutputPass converts. Good.

Also need OutputPass import from 'three/addons/postprocessing/OutputPass.js'.

Also, do we need to worry that ShaderPass's uniforms tDiffuse, and its shader reads sampler — fine.

Alternatively, some versions: RenderPass may render scene with sRGB output if... no, safe.

Let me write code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const invertShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `...`,
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
composer.addPass(new OutputPass());
composer.addPass(invertPass);
```

Wait — ShaderPass's uniform typing: `uniforms: { tDiffuse: { value: null } }`. In TypeScript, ShaderPass constructor accepts object; fine.

Vertex shader standard:
```
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
```

Hmm — one concern: OutputPass before the invert pass. Does composer render last pass to screen correctly with sRGB values? Yes.

But wait: another subtlety — OutputPass in newer three.js versions: it uses renderer.outputColorSpace. When OutputPass renders to composer's internal target writeBuffer (not screen), does it apply the conversion? Yes — OutputPass always applies the conversion in shader regardless of target; that's its purpose. But then the intermediate buffer holds sRGB-encoded values as HalfFloat — fine.

Then invert pass flips. Good.

Actually, double check exactness: sRGB values stored in HalfFloat, inverted, output to screen. Screen shows exact byte inverse? sRGB(0.2) computed exactly: for 0.2: 1.055*0.2^(1/2.4)-0.055 = 1.055*exp(ln0.2/2.4) - 0.055. ln0.2=-1.6094, /2.4=-0.6706, exp=0.5114, *1.055=0.5395, -0.055=0.4845 → *255 ≈ 123.6 → 0x33 (51/255=0.2 → encoded ≈ 123.6 ≈ 0x7C... wait 0x33=51 is the sRGB input, not encoded). Hold on: 0x336699 background: R=0x33=51/255≈0.2 sRGB. Encoded output for linear 0.2... The scene background Color(0x336699) converts sRGB→linear: lin = ((0.2+0.055)/1.055)^2.4 = (0.2417)^2.4. ln(0.2417)=-1.4200, *2.4=-3.408, exp=0.0331. Without composer, renderer outputs sRGB(lin)=0.2 → byte 51=0x33. ✓.

With composer: linear 0.0331 in target. OutputPass converts linear→sRGB: 0.2 (approx, float precision ~0.2). Invert: 0.8. Byte: 0.8*255=204=0xCC ✓. Sphere: lin 1 → sRGB 1 → invert 0 → black ✓. 

Also should I set renderer.outputColorSpace? Default is SRGBColorSpace, fine. OutputPass reads it.

Animation loop: composer.render() with delta. Use renderer.setAnimationLoop((time) => ...) — could add slight rotation for motion using delta time. Simple: sphere rotates. Use clock delta.

Resize: camera.aspect, renderer.setSize, composer.setSize.

Expose __scene, __camera, __renderer, __composer, __ready after first frame.

TS strict concerns: `value: null as THREE.Texture | null` — ShaderPass's uniforms parameter type is `object`. Actually ShaderPass signature: `constructor(shader: object, textureID?: string)`. The shader object's uniforms typed loosely. Passing `{ uniforms: {...}, vertexShader: string, fragmentShader: string }` — should be fine as object.

Hmm, in newer three.js types, ShaderPass shader type: `shader: object`. Our literal with uniforms nested object fits.

Let me write final code.

Also document.body margin: add style to remove margin so canvas fills properly? Page has no other HTML; canvas appended. Adding margin:0 via style is nice-to-have; can do `document.body.style.margin = '0'`. Fine.

Ready flag: set in first loop iteration after composer.render().

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const geometry = new THREE.SphereGeometry(1, 32, 16);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const InvertShader = {
  uniforms: { tDiffuse: { value: null } },
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
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `,
};
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  sphere.rotation.y += delta * 0.5;
  composer.render(delta);
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```

Type check: `uniforms: { tDiffuse: { value: null } }` — ShaderPass expects `object`; nested fine. Actually ShaderPass copies uniforms; then when rendering, `if (this.uniforms[this.textureID]) this.uniforms[this.textureID].value = readBuffer.texture;` — fine.

One consideration: setPixelRatio on renderer but composer.setSize uses renderer.getPixelRatio internally? EffectComposer constructor reads renderer size × pixelRatio when creating targets, and setSize(width, height) multiplies by pixelRatio? Actually composer.setSize sets _width/_height and renderTarget sizes with pixelRatio? Let me recall: EffectComposer.setSize(width, height) sets effectiveWidth = width * this._pixelRatio. Yes, it stores _pixelRatio = renderer.getPixelRatio(). But if setPixelRatio is called after composer creation, mismatch. I set pixel ratio before creating composer. Good. On resize, composer.setSize(window.innerWidth, window.innerHeight) handles pixel ratio internally. Good.

Comment explaining the ordering rationale. Done.