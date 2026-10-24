The key: RenderPass renders scene in linear space (render targets are linear unless outputColorSpace applied). EffectComposer render target is linear. The inversion should happen in linear space? If we invert in linear space: background 0x336699 as sRGB, converted to linear: c/12.92 for c<=0.04045 else ((c+0.055)/1.055)^2.4. Inverting linear then converting back to sRGB won't give 0xcc9966. To get exact sRGB inverse, we should invert after sRGB conversion. But the pipeline: composer render targets — in recent Three.js, EffectComposer's render target uses HalfFloatType, and the working color space is linear. The OutputPass performs linear→sRGB conversion. So if our ShaderPass runs before OutputPass, it works in linear space; inverting there gives linear inverse, not exact sRGB inverse.

To get exact screen inverse, we need to convert linear→sRGB in shader, invert, then output... but then OutputPass would convert again. Options: place ShaderPass after OutputPass, with renderToScreen, and in shader convert to sRGB then invert. But OutputPass's sRGB conversion writes sRGB values into an output buffer... Actually if ShaderPass is after OutputPass, the target is the composer's buffer (linear-interpreted), then ShaderPass renders to screen — but the renderer's outputColorSpace conversion applies to... With ShaderPass rendering to screen (renderToScreen true), the renderer's outputColorSpace conversion applies? In modern three.js, the final pass to screen: renderer applies output color space conversion only if the material has colorSpace_fragment chunk... ShaderMaterial doesn't include colorspace_fragment by default? Actually ShaderMaterial does include the encodings via #include <colorspace_fragment> only if present in shader. RawShaderMaterial/ShaderMaterial: the renderer sets the output conversion based on render target; for ShaderMaterial, tone mapping and color space conversion are NOT automatically applied — they're shader chunks. So a custom ShaderMaterial fragment must include `#include <colorspace_fragment>` to get conversion.

Simplest robust approach: order passes: RenderPass → ShaderPass (inverts) → OutputPass. For exact inverse in sRGB, invert must happen in sRGB space. So in the shader: sample linear color, convert to sRGB, invert, convert back to linear, output. Then OutputPass converts linear→sRGB, giving sRGB(inverse of sRGB(linear)) = inverse of sRGB. 

So shader:
```
vec3 srgb = LinearTosRGB(color) — but we don't have those functions in ShaderMaterial automatically... Actually three's ShaderChunk 'colorspace_pars_fragment' defines LinearTosRGB etc. We can write our own functions.
```

Write own:
```glsl
vec3 linearToSRGB(vec3 c){
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}
vec3 sRGBToLinear(vec3 c){
  return mix(c / 12.92, pow((c + 0.055)/1.055, vec3(2.4)), step(0.04045, c));
}
void main(){
  vec4 col = texture2D(tDiffuse, vUv);
  vec3 srgb = linearToSRGB(col.rgb);
  vec3 inv = 1.0 - srgb;
  gl_FragColor = vec4(sRGBToLinear(inv), col.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Wait — including colorspace_fragment would convert linear→sRGB again. If ShaderPass outputs linear and OutputPass then converts, we should NOT include colorspace_fragment in our shader; just output linear. But ShaderMaterial gl_FragColor: does the renderer append conversion? For ShaderMaterial, no automatic conversion (chunks control it). Actually since r152ish, ShaderMaterial output goes through... The render target for ShaderPass is the composer's buffer which has no color space conversion applied automatically — conversions only happen via chunks or when rendering to canvas with outputColorSpace for materials that include the chunk. ShaderMaterial without chunks outputs raw values. Good.

Hmm, but ShaderPass with CopyShader-based material... our custom shader. Fine.

Alternative simpler: RenderPass → OutputPass → ShaderPass(invert) with renderToScreen. But OutputPass writes sRGB-encoded values into a render target; then ShaderPass reads those values (which are sRGB-encoded numbers stored in a buffer), inverts, and outputs to screen — no further conversion if ShaderMaterial lacks chunk. That gives exact inverse too. But there might be precision issues with HalfFloat — fine actually. However, does OutputPass's target... EffectComposer: passes render to writeBuffer/readBuffer; the last pass with renderToScreen renders to null target. OutputPass by default renderToScreen is set by composer for last pass. If ShaderPass is after OutputPass, composer sets ShaderPass.renderToScreen = true (composer determines renderToScreen based on pass order and renderToScreen property... EffectComposer sets renderToScreen on the last pass that has renderToScreen... actually EffectComposer.render: it checks `pass.renderToScreen` — no, in current three, EffectComposer automatically renders the last enabled pass to screen? Let me recall: EffectComposer has `this.renderToScreen = true` on... Passes have renderToScreen property; composer render: `const isLastEnabledPass = i === passes.length - 1 ... pass.renderToScreen = ...` Actually modern EffectComposer: 

```js
pass.renderToScreen = (this.renderToScreen && isLastEnabledPass);
```
Hmm, I think there's `renderToScreen` handling: in EffectComposer.render, `if (pass.enabled === false) continue; pass.renderToScreen = (this.renderToScreen && isLastEnabledPass); pass.render(...)`. Yes, newer versions do this. So ordering RenderPass → OutputPass → ShaderPass works: OutputPass writes sRGB into buffer, ShaderPass inverts and outputs to screen raw. That's exact inverse and simple shader: gl_FragColor = vec4(1.0 - color, 1.0). But wait — when ShaderPass renders to screen (null target) with ShaderMaterial, does renderer apply outputColorSpace conversion? The canvas is sRGB; conversion to output color space happens in shaders via colorspace_fragment chunk; ShaderMaterial does not auto-include it. Hmm, actually since r152, ShaderMaterial... let me think. WebGLProgram: `getTexelEncodingFunction` / in newer: parameters include outputColorSpace conversion injected only when material.toneMapped... For ShaderMaterial, toneMapped defaults true but no tonemapping chunk. The colorspace conversion: WebGLPrograms parameters `outputColorSpace` — the chunk `colorspace_fragment` uses `linearToOutputTexel`. For ShaderMaterial, the shader source is user-provided; the program prepends prefixes but conversion only occurs where `#include <colorspace_fragment>` appears. So raw output. 

But risk: the final pass rendering to screen — since the values stored after OutputPass are already sRGB-encoded numbers, inverting gives sRGB inverse directly on screen. 

However, there's subtlety: OutputPass reads from linear buffer and writes sRGB values to... its render target (composer buffer). Then ShaderPass reads tDiffuse — texture sampled as-is (no colorspace interpretation for HalfFloat targets... render target texture colorSpace default is NoColorSpace/linear). Values pass through. Good.

But precision: HalfFloatType buffer — sRGB values stored with ~10-bit mantissa, fine.

Which approach is more robust? I'll do the convert-in-shader approach with order RenderPass → InvertPass → OutputPass, since that's the "think about ordering" hint: invert in sRGB space within the shader before OutputPass. Either works. Actually the hint says "order the passes (or convert in the shader) so this holds." I'll do the shader conversion approach: shader converts to sRGB, inverts, converts back to linear, OutputPass does final conversion. This keeps OutputPass last (standard practice).

Verify math: linear background L = srgbToLinear(0x33/255, 0x66/255, 0x99/255). Shader: s = linearToSRGB(L) = original sRGB values (0.2, 0.4, 0.6). inv = 0.8, 0.6, 0.4 → 0xcc, 0x99, 0x66. Output linear again: srgbToLinear(inv). OutputPass: linearToSRGB → inv exactly (modulo float precision). ✓. Sphere white: linear 1 → sRGB 1 → 0 → black. ✓

Note: MeshBasicMaterial white color — Color 0xffffff set via material.color; renderer will convert hex to linear (working space) since ColorManagement enabled. scene.background Color 0x336699 also converted. Good.

One concern: OutputPass also does tone mapping (renderer.toneMapping default NoToneMapping) — fine.

Also ShaderPass requires uniforms tDiffuse. Vertex shader standard.

Write GLSL with functions. step-based mix: for linearToSRGB, mix(c*12.92, pow..., step(0.0031308, c)) — mix with vec step works componentwise. Fine.

Also include `#include <colorspace_fragment>`? No — output linear, OutputPass handles. But ShaderMaterial writes gl_FragColor; ShaderPass uses this as texture. OK.

Hmm, one caveat: newer three versions (r155+?) ShaderPass material... fine.

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({color: 0xffffff}));
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.body.appendChild(renderer.domElement);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const InvertShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `...`,
  fragmentShader: `...`
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);
composer.addPass(new OutputPass());

window resize handler: camera.aspect, renderer.setSize, composer.setSize.

let ready = false;
renderer.setAnimationLoop(() => {
  const t = clock.getDelta(); // use elapsed for rotation maybe
  sphere.rotation.y += delta * 0.5; // motion via delta
  composer.render();
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```

Exposes: __scene, __camera, __renderer, __composer, __ready.

TypeScript strict: fine.

Fragment shader:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
vec3 linearToSRGB(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}
vec3 srgbToLinear(vec3 c) {
  vec3 lo = c / 12.92;
  vec3 hi = pow(max((c + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), c));
}
void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 srgb = clamp(linearToSRGB(texel.rgb), 0.0, 1.0);
  vec3 inverted = 1.0 - srgb;
  gl_FragColor = vec4(srgbToLinear(inverted), texel.a);
}
```

Vertex: standard `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`.

OutputPass since r15x handles linear→sRGB. Good.