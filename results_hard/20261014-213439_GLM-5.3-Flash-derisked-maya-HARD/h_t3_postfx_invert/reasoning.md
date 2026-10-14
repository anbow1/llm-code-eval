Setup: scene background 0x336699 (THREE.Color treats hex as sRGB, converts to linear with color management). RenderPass renders to linear target. If ShaderPass inverts linear colors then OutputPass does linear->sRGB conversion, result would be inverse in linear space which after sRGB conversion isn't the inverse of sRGB. We need to invert in sRGB space. Approach: convert to sRGB in shader, invert, then... but OutputPass will convert linear->sRGB again. Options: set OutputPass? Actually we can skip OutputPass and instead do conversion manually, but requirement says include OutputPass. Alternative: invert in the shader with sRGB conversion: c = 1 - srgbEncode(c), then OutputPass would linearize... no, OutputPass converts linear to sRGB, it doesn't linearize input.

Better approach: use OutputPass but pass colors such that final = 1 - srgb(c). We want on-screen srgb_out = 1 - srgb_in. If we invert in sRGB space inside the shader and then OutputPass converts linear->sRGB, we'd need shader output to be "linear" values that when converted give the right result — but output is already sRGB, converting again would double.

Trick: invert in sRGB space in the shader, then apply sRGBToLinear in the shader (convert the inverted sRGB back to linear), then OutputPass converts linear->sRGB giving exactly 1 - srgb(c). That works! Shader: color = LinearTosRGB? Actually shader input is linear. Do: inv = 1.0 - sRGBEncode(color); then output sRGBDecode(inv)... but three's sRGB decode/encode helpers: in the shader chunk, we can write our own functions: sRGBEncode approximations. But exactness required: sRGB conversion exact values 0x33 -> 0xcc etc. Using the standard sRGB transfer function should be fine since the same function is used in OutputPass (approx in shader uses LinearTosRGB from three's ColorConverter chunk? OutputPass uses LinearTosRGB from 'three' shader chunk colorSpace_fragment). To be exact, include the same functions. But writing approximations with pow(x, 1/3) is close; the exact encode: x <= 0.0031308 ? x*12.92 : 1.055*pow(x,1/2.4)-0.055. That's the exact function used in three's color space conversion (via sRGBTransferFunction? Actually three uses these constants). The decode uses x<=0.04045 ? x/12.92 : pow((x+0.055)/1.055, 2.4).

Simpler alternative: reorder — do the inversion AFTER the OutputPass. But ShaderPass after OutputPass: OutputPass converts to sRGB, then ShaderPass inverts in sRGB space, and pass output goes directly to screen without further conversion. But composer renders the last pass to screen if renderToScreen; OutputPass is not the last. The final pass with renderToScreen = true outputs directly. Does composer's last pass output get converted? EffectComposer sets renderToScreen on the last pass automatically (readBuffer to screen). Actually composer automatically sets renderToScreen for the last pass? In current three, composer.render uses this.renderToScreen and the passes' renderToScreen — I recall EffectComposer sets `pass.renderToScreen = (i === lastPassIndex)` ... Let me recall: In newer versions, EffectComposer.render sets `const isLastEnabledPass = i === passes.length - 1; pass.renderToScreen = this.renderToScreen && isLastEnabledPass`? Yes, modern EffectComposer does that automatically. So order: RenderPass -> OutputPass -> ShaderPass(invert). The shader then receives sRGB values and outputs 1-c directly to screen. That's exact and simple. But does the intermediate buffer after OutputPass hold sRGB values correctly (no further conversion)? The composer's buffers — OutputPass writes to writeBuffer, which is a render target; values are just numbers, no conversion. Then final shader pass renders to screen with renderer.outputColorSpace = sRGB; the final pass is a raw shader? ShaderPass uses ShaderMaterial — the fragment output... three might append colorspace_fragment? No, ShaderMaterial user shaders don't get automatic color space conversion (three only appends colorspace_fragment when the material... actually ShaderMaterial doesn't include #include <colorspace_fragment> unless user writes it). So output goes raw to canvas. Good.

However, one caveat: OutputPass's shader does LinearTosRGB conversion and outputs; also the renderer's outputColorSpace conversion — when rendering to screen with a ShaderMaterial, no extra conversion. So final on screen = 1 - srgb(linear color). srgb(linear(0x336699)) = 0x336699 exactly? Color management: THREE.ColorManagement converts sRGB hex to linear on set, and OutputPass converts back — round trip should give ~exact. Then inversion gives 0xcc9966. 

But wait — will the composer's final pass actually be the last pass with renderToScreen auto? To be safe, set the last ShaderPass.renderToScreen = true? Actually the modern EffectComposer: in render(), `const isLastEnabledPass = ...` hmm let me recall the actual source (r150+):

```js
render( deltaTime ) {
  ...
  for ( let i = 0, il = this.passes.length; i < il; i ++ ) {
    const pass = this.passes[ i ];
    if ( pass.enabled === false ) continue;
    pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
    pass.render( ... );
```

Yes, `isLastEnabledPass` exists. Good, automatic.

Alternatively, the safer widely-used approach: RenderPass -> ShaderPass (invert with sRGB encode inside) -> OutputPass, doing invert in sRGB and re-linearize. But the reorder approach is cleaner. However there's a subtlety: with reordered OutputPass before the invert shader, the invert shader receives sRGB values in a half-float buffer — fine.

Hmm, but another subtlety: OutputPass also does tone mapping — default renderer.toneMapping is NoToneMapping, fine.

Also need composer with default frame buffer type — composer uses HalfFloatType by default in recent versions. Good for precision.

I'll implement: scene with background, sphere; composer; renderPass; outputPass; invertPass. Order: renderPass, outputPass, invertPass. Shader inverts rgb.

Hmm, but is it okay conceptually? "think about where linear->sRGB happens and order the passes (or convert in the shader) so this holds." Yes — putting OutputPass before the invert shader is exactly the intended trick.

Also __ready after first frame: use a flag; in animation loop, after composer.render(), if !ready set ready = true. Use a boolean set on first render callback. "After the first frame is rendered" — we can set it after the first composer.render call in the loop. Better: use renderer.setAnimationLoop with a callback that checks a flag.

Resize: update camera aspect, renderer.setSize, composer.setSize.

Imports: EffectComposer, RenderPass, ShaderPass, OutputPass from addons.

Write shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(1.0 - c.rgb, c.a);
}
```

ShaderPass constructor takes shader object {uniforms, vertexShader, fragmentShader}.

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);
const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({color: 0xffffff}));
scene.add(sphere);

const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
const renderPass = new RenderPass(scene, camera);
const outputPass = new OutputPass();
const invertPass = new ShaderPass({ uniforms: { tDiffuse: {value: null} }, vertexShader: ..., fragmentShader: ... });
composer.addPass(renderPass);
composer.addPass(outputPass);
composer.addPass(invertPass);
```

Wait — vertexShader for ShaderPass: standard:
```
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);}
```

Animation loop:
```ts
const clock = new THREE.Clock();
let ready = false;
renderer.setAnimationLoop(() => {
  composer.render(clock.getDelta());
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Hmm — is __ready set after first frame actually rendered to screen? composer.render is synchronous; the GL commands are issued; the frame is "rendered". Fine.

Resize:
```ts
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w/h; camera.updateProjectionMatrix();
  renderer.setSize(w,h);
  composer.setSize(w,h);
});
```

Expose everything.

ShaderPass typing: the ShaderPass constructor accepts object | Shader; ShaderMaterialParameters type — ShaderPass(shader: object | ShaderMaterial, ...). The shader object needs uniforms typed as { [uniform: string]: IUniform }. Providing {tDiffuse: {value: null}} should typecheck. ShaderPass signature in three types: `constructor(shader: object | ShaderMaterial, uniformKey?: string)` — fine.

One concern: with the invert pass last, does composer set its renderToScreen true automatically? Yes via isLastEnabledPass. Good.

Double check round-trip: 0x33 = 51/255 = 0.2. Linear: ((0.2+0.055)/1.055)^2.4 = (0.24171)^2.4. ln(0.24171) = -1.4197; *2.4 = -3.4073; exp = 0.03314. sRGB encode: 1.055*0.03314^(1/2.4)-0.055: 0.03314^0.4167 = exp(0.4167*ln0.03314)=exp(0.4167*(-3.4073))=exp(-1.4197)=0.2417... times 1.055 = 0.2550 - 0.055 = 0.2000. Exact round trip (modulo half-float precision). Good.

White sphere: 1.0 linear -> sRGB 1.0 -> invert -> 0. Black. Good.

Write final code.