The key: with OutputPass, the render happens in linear space, and OutputPass converts linear->sRGB at the end. So the invert shader should operate in linear space: invert linear values, then OutputPass converts to sRGB. Inverting in linear space gives: sRGB_out = linearToSRGB(1 - srgbToLinear(c)). Is that equal to 1 - c in sRGB? Not exactly for mid tones. For 0x336699: sRGB 0.2, 0.4, 0.6. linear: ~0.0331, 0.1329, 0.3185. Inverted linear: 0.9669, 0.8671, 0.6815. Convert to sRGB: ~0.9876, 0.9418, 0.8508 → 0xFC, 0xF0, 0xD9 — not 0xCC9966.

To get exact inverse in sRGB (0xcc9966), we need to invert in sRGB space after conversion. So the invert pass must happen after the linear->sRGB conversion. Options: use RenderPass, then a custom pass that both converts linear->sRGB and inverts, then... OutputPass would convert again. Alternatively: RenderPass -> ShaderPass that converts to sRGB (using the same transfer function) and inverts -> OutputPass would re-convert. Hmm.

Simplest: skip OutputPass? But the requirement says use OutputPass. Alternative: order: RenderPass -> ShaderPass(invert in linear) -> OutputPass. Result: not exact. To get exact: RenderPass -> OutputPass-like conversion inside shader...

Actually trick: RenderPass -> ShaderPass that does linear->sRGB conversion (sRGBTransferOETF) — OutputPass then... OutputPass does tone mapping + color space conversion. If renderer.outputColorSpace is set, composer's render targets... Actually with EffectComposer, render targets are in linear (HalfFloat), and OutputPass converts to sRGB. If our ShaderPass converts to sRGB first and then OutputPass converts again, double conversion — wrong.

Better approach: set composer's render target / use ShaderPass after OutputPass? Pass order: RenderPass, OutputPass, ShaderPass(invert). OutputPass writes sRGB-encoded values to the read buffer... Actually OutputPass renders to the next buffer if not last. OutputPass shader does tone mapping and sRGB conversion. Then our invert pass just does 1-rgb without conversion, and since it's the last pass rendering to screen... the final pass renders to null (screen). Does composer set color space conversion for the final pass? EffectComposer renders the last pass to screen with renderer.outputColorSpace... The final pass to screen: renderer will not auto-convert since the shader writes directly. Actually when rendering to the canvas, if renderer.outputColorSpace is SRGB, three converts? No — conversion to output color space happens in OutputPass shader or when rendering with the built-in materials' fragment output (colorspace_fragment chunk). ShaderPass material doesn't include that chunk... Actually ShaderMaterial doesn't apply output color space conversion unless... Hmm, in newer three versions, WebGLRenderer applies output color space encoding only via the colorspace_fragment shader chunk which is part of built-in materials. ShaderMaterial without that chunk writes raw values. So the final ShaderPass writing 1-sRGB values to screen gives exact inverse. 

But wait: does rendering to the default framebuffer with outputColorSpace sRGB do anything? No, encoding is done in shader. So plan:

- RenderPass (renders scene in linear into composer's HalfFloat target).
- OutputPass (tone mapping + linear->sRGB conversion, renders into another buffer since not last).
- InvertPass (ShaderPass: gl_FragColor = vec4(1.0 - color, 1.0)) — final, renders to screen.

Result: screen shows inverse of sRGB. Background: OutputPass converts 0x336699 linear values back to 0.2,0.4,0.6 → invert → 0.8,0.6,0.4 → 0xcc9966. White → 0 → black. 

But OutputPass when not last: it still works? OutputPass shader uses tone mapping and color space conversion uniforms set based on renderer state. Yes, it applies them regardless of target.

Alternatively simpler: invert in shader with sRGB conversion math inside: RenderPass -> ShaderPass(invert in sRGB: convert linear to sRGB then invert) -> OutputPass would double-convert. Not good unless we skip OutputPass. But requirement says include OutputPass. So use order RenderPass, OutputPass, InvertPass? But requirement lists "RenderPass, a custom ShaderPass ... and an OutputPass" — order might be checked loosely; the requirement is the on-screen colors. I'll do RenderPass -> ShaderPass -> OutputPass where the ShaderPass... hmm.

Alternative with that order: ShaderPass operates in linear, inverts linearly; OutputPass converts to sRGB. As computed, gives 0xFC F0 D9, not exact. Unless the check is lenient. But the spec explicitly says "must appear on screen as 0xcc9966". So exactness matters. 

Another option: keep order RenderPass, ShaderPass, OutputPass, but in the ShaderPass do: linear->sRGB conversion, invert, then sRGB->linear back (so OutputPass re-converts to sRGB and we get inverse). I.e., color = sRGBToLinear(1 - linearToSRGB(color)). That's exact and keeps the stated pass order! That's clever and satisfies both the pass list order and the exactness. Let me implement the sRGB transfer functions in GLSL.

sRGB OETF: if (c <= 0.0031308) c*12.92 else 1.055*pow(c, 1/2.4) - 0.055.
sRGB EOTF (to linear): if (c <= 0.04045) c/12.92 else pow((c+0.055)/1.055, 2.4).

ShaderPass fragment:
```glsl
vec3 linearToSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
vec3 sRGBToLinear(vec3 c){ return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045, c)); }
void main(){
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 srgb = linearToSRGB(texel.rgb);
  vec3 inv = 1.0 - srgb;
  gl_FragColor = vec4(sRGBToLinear(inv), texel.a);
}
```

Then OutputPass converts linear->sRGB giving exact inverse. Also need to handle tone mapping? Default renderer.toneMapping is NoToneMapping, OutputPass applies NoToneMapping fine. Also OutputPass sets its outputColorSpace from renderer.outputColorSpace (default SRGB). Good.

One subtlety: RenderPass renders scene with renderer.outputColorSpace... when rendering to composer's render target, three checks if target is sRGB — composer targets are linear (colorSpace NoColorSpace / LinearSRGB). So scene renders in linear. White sphere stays 1.0 linear, background 0x336699: THREE.Color with ColorManagement enabled converts hex to linear working space: 0.0331, 0.1329, 0.3185 linear. Then shader converts to sRGB = 0.2,0.4,0.6 exactly? linearToSRGB(0.0331...) : is 0.2/... The Color stores srgbToLinear(0.2) which is pow-based; our GLSL inverse gives back ~0.2 with rounding. srgbToLinear(0.2) = ((0.2+0.055)/1.055)^2.4 = (0.24170)^2.4. ln(0.2417)≈-1.4200, *2.4 = -3.408, e^-3.408 ≈ 0.033104. Then linearToSRGB: 1.055*0.033104^(1/2.4)-0.055. 0.033104^(0.41667): ln=-3.408*0.41667=-1.4200, e^-1.42=0.2417. 1.055*0.2417-0.055=0.2550-0.055=0.2000. Good, exact within float precision. Stored as HalfFloat in composer target — 16-bit float precision fine.

Precision: HalfFloatType targets... default composer uses HalfFloatType in recent three. Precision enough for 8-bit output rounding? Likely. There might be a rounding issue: 0.2*255 = 51 exactly; the inverse chain: srgb=0.2 → inv=0.8 → to linear: ((0.855)/1.055)^2.4 = (0.81043)^2.4. ln(0.81043)=-0.21019, *2.4=-0.50445, e^-0.50445=0.603827. Half float stores ~0.603827 fine. OutputPass: 1.055*0.603827^0.416667-0.055: ln=-0.50445*0.41667=-0.21019, e^-0.21019 = 0.81043, *1.055=0.855, -0.055=0.8000 → round(0.8*255)=204=0xCC. Good.

Also, does ShaderPass need tDiffuse uniform and vUv vertex shader — standard. Write custom shader.

Also expose __composer, __scene, __camera, __renderer, __ready after first frame.

Handle resize: camera.aspect, renderer.setSize, composer.setSize.

Use setAnimationLoop with time parameter; sphere could gently... motion optional; keep something subtle like slight rotation using elapsed time. Motion must use delta/elapsed. I'll rotate sphere slowly.

TypeScript strict: ShaderPass constructor accepts shader object. Define shader as { uniforms: { tDiffuse: { value: null } }, vertexShader, fragmentShader }. uniforms value null — type: uniforms typed as any in three? ShaderPass(shader: object | ShaderMaterial?, ...). It compiles fine with plain object.

Write code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(sphere);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const InvertShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `...`,
  fragmentShader: `...`
};
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);
composer.addPass(new OutputPass());

(window as any).__scene = scene; etc.
composer.setSize(innerWidth, innerHeight);

let firstFrame = true;
renderer.setAnimationLoop((time) => {
  const elapsed = time * 0.001;
  sphere.rotation.y = elapsed * 0.3;
  sphere.rotation.x = elapsed * 0.15;
  composer.render();
  if (firstFrame) { (window as any).__ready = true; firstFrame = false; }
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
```

Uniform typing: `{ value: null as THREE.Texture | null }` — ShaderPass constructor param type is `object | ShaderMaterial`... In three's types, ShaderPass constructor: `constructor(shader: object | Material, textureID?: string)`. Fine.

vertexShader: varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }

GLSL fragment with mix/step for vector ops — step(0.0031308, c) with vec3 c returns vec3 (step(float, vec3) is allowed? step(genType edge, genType x) yes; step(float, vec3)? GLSL ES spec: step(float edge, float x) and step(vecN edge, vecN x). step(float, vec3) is NOT valid in GLSL ES 1.0? Actually genType step(float edge, genType x) IS valid — yes, GLSL has overloads: step(genType, genType) and step(float, genType). Yes, that's valid.

fragmentShader:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 sRGBToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 srgb = linearToSRGB(max(texel.rgb, 0.0));
  vec3 inverted = 1.0 - srgb;
  gl_FragColor = vec4(sRGBToLinear(inverted), texel.a);
}
```

Note pow with negative base avoided by max(0).

Composer setSize before first render — done implicitly; call composer.setSize explicitly anyway.

OutputPass import path 'three/addons/postprocessing/OutputPass.js'.

Done. Output single ts block.