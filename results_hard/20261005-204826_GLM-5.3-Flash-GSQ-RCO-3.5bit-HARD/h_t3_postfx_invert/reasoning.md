Key insight: EffectComposer renders into linear space render targets. The RenderPass renders the scene into a linear target (scene background color 0x336699 set via THREE.Color — note: Color from hex is interpreted... actually with modern three, `new THREE.Color(0x336699)` stores the components as-is unless color management converts. By default THREE.ColorManagement.enabled = true, and Color.setHex converts from sRGB to linear-sRGB working space. So the background color in the scene is stored linearly. RenderPass renders with renderer.outputColorSpace... but rendering to composer's render target — composer targets are linear (HalfFloatType, no color space conversion). So target has linear color. The sphere white (0xffffff → linear 1.0).

ShaderPass inverts: 1.0 - linear color. If we invert linear values: background linear for 0x336699: sRGB 0x33/0x99/0x66 → linear approx (0.2, 0.6, 0.4)/... compute: 0x33=51/255≈0.2 → linear ≈ 0.0331; 0x99=153/255=0.6 → linear ≈ 0.3185; 0x66=102/255=0.4 → linear ≈ 0.1329. Inverted linear: (0.9669, 0.6815, 0.8671). Then OutputPass converts linear→sRGB: sRGB(0.9669) ≈ 0.987 → 0xFC; sRGB(0.6815) ≈ 0.851 → 0xD9; sRGB(0.8671) ≈ 0.9405 → 0xF0. That's not 0xCC9966.

Correct approach: invert AFTER linear→sRGB conversion. Desired: sRGB background appears as 0xCC9966 = 1 - 0x336699 exactly per channel in sRGB. So we need: convert linear to sRGB first, then invert sRGB, then output. OutputPass does tone mapping + linear→sRGB conversion. So order: RenderPass → OutputPass? No — OutputPass must be last as it writes to canvas. But if OutputPass is last, the conversion linear→sRGB happens there. We could invert in shader in sRGB space if we do conversion in the shader and then OutputPass... OutputPass always does the conversion. Alternative: keep order RenderPass → ShaderPass → OutputPass, but in the ShaderPass convert input linear→sRGB, invert, then convert back sRGB→linear, so that OutputPass's conversion yields the inverted sRGB values. That works: shader output linear values whose sRGB conversion equals 1 - sRGB(input linear). I.e., shader: c = LinearTosRGB(color); c = 1-c; output sRGBToLinear(c).

Alternatively simpler: put ShaderPass after OutputPass but then it writes to screen? ShaderPass after OutputPass renders to screen if it's last (renderToScreen). ShaderPass with renderToScreen=true writes directly — but the canvas... Actually passes render to the canvas when renderToScreen; output color space conversion doesn't apply then? When rendering directly to the default framebuffer, three checks renderer.outputColorSpace... The composer's ShaderPass material outputs fragment color and when rendering to canvas, no automatic conversion happens for ShaderPass material (raw ShaderMaterial, three doesn't apply encoding to ShaderMaterial unless using encodings_fragment). Actually since composer render targets and the final pass — modern three: OutputPass handles the conversion; if you put ShaderPass last with renderToScreen, values go raw to canvas. Hmm, but WebGLRenderer applies output color space conversion only for built-in materials via fragment output; ShaderMaterial without encodings chunk writes raw. So RenderPass → OutputPass → ShaderPass(invert on sRGB-encoded values). But wait — if OutputPass writes to a render target (since it's not last), it does the conversion into that target, then ShaderPass inverts and writes raw to screen. That gives exact 1-c per 8-bit channel? The intermediate target is HalfFloat — sRGB values stored with float precision, invert, then written to canvas as bytes: rounding could produce off-by-one (e.g. value 0.2 exactly → canvas gets 51; invert → 204, fine). But float representation: sRGB conversion yields values like 0.2000000x; stored as half float; 1-x then quantized to byte — could differ by 1 LSB from exact 204. Risk of mismatch in testing. Safer: convert in shader.

Best robust approach: order RenderPass → ShaderPass → OutputPass, and in ShaderPass do:
- input is linear color
- convert to sRGB (approx or exact), invert, convert back to linear.
Then OutputPass converts to sRGB again. Double conversion round trip: sRGBToLinear(LinearToSRGB(x)) — precision loss but half-float precision is ~10 bits, fine.

But careful: exact per-channel byte match required. Path: scene linear color L (from ColorManagement: setHex(0x336699) with SRGBColorSpace → linear). Target screen = sRGB bytes inverted of 0x336699 = 0xCC9966.

Chain: ShaderPass input = L. shader: s = linearToSRGB(L); s' = 1 - s; output L' = sRGBToLinear(1 - linearToSRGB(L)). Half float precision ~3 decimal digits. OutputPass: s'' = linearToSRGB(L') ≈ 1 - linearToSRGB(L) up to precision, then canvas quantize to 8-bit. linearToSRGB(0x33/255) = (0.2)^(1/2.4 adjusted)... exact formula. The error from double conversion: half float has ~2^-11 relative; after gamma the absolute error ~ 0.0025 in sRGB, quantization step 1/255 ≈ 0.0039. Could land near a byte boundary and flip one LSB. Hmm.

Alternative cleaner approach: do the inversion after sRGB conversion by NOT letting OutputPass do it — i.e., only RenderPass → ShaderPass, with ShaderPass as last pass, converting linear→sRGB inside... but ShaderPass with renderToScreen writes raw to canvas: if shader outputs sRGB-encoded values, and no further conversion happens, canvas shows exactly those sRGB values. But does rendering to the canvas via composer apply conversion? In three.js, EffectComposer's final pass renders to null render target (screen). When renderer renders to screen with a ShaderMaterial, the output color space conversion... WebGLRenderer applies `encodings_fragment`/colorspace_fragment chunk only if the material's fragment shader includes <colorspace_fragment> include. ShaderPass uses raw ShaderMaterial without that include, so no conversion. But tone mapping? Renderer.toneMapping applies via tonemapping_fragment include — not present. So raw output. So: RenderPass → ShaderPass(shader: read linear, convert to sRGB, invert, output) with renderToScreen true. Only one conversion → exact: s = linearToSRGB(L); output 1 - s. Quantization: 1-s computed in float, quantize → should give exact complement since s quantized and inverted... Actually we want 1 - (byte value of s). Byte value of s = round(s*255). We output 1-s then quantize: round((1-s)*255). Is round(s*255) + round((1-s)*255) = 255? If s*255 = k + f, round = k if f<0.5. (1-s)*255 = 255-k-f, round = 255-k if f < 0.5 → yes 255-k... if f<0.5, round(255-k-f) = 255-k since 255-k-f = (255-k) - f, f<0.5 rounds down → 255-k. If f≥0.5: round(s*255)=k+1, round((1-s)*255)= round(255-k-1 + (1-f)) = 255-k-1 +1 = 255-k (since 1-f > 0.5 rounds up). Wait: 255-k-f with f≥0.5: = (255-k-1) + (1-f), 1-f ≤ 0.5, rounds down (round half up? GPU uses round to nearest even or truncation?). Typically float→byte uses round to nearest, ties... hmm edge cases. Generally it works but not guaranteed for exact half ties, which are rare for gamma-corrected values. Fine.

But requirement says to include an OutputPass. So order: RenderPass → OutputPass would convert to sRGB but then we need inversion after... If OutputPass is in the middle rendering to a target, it converts linear→sRGB into target, then ShaderPass last inverts sRGB and outputs raw → exact 1-s with single inversion. That's clean! Order: RenderPass → OutputPass → ShaderPass(renderToScreen). ShaderPass: gl_FragColor = vec4(1.0 - color.rgb, color.a). But wait: does OutputPass when rendering to a render target (not screen) still do the conversion? OutputPass shader does tone mapping + colorspace conversion based on renderer state? OutputPass's material uses defines set at render time: it checks `this._outputColorSpace = renderer.outputColorSpace` etc. In OutputPass.render(): it sets defines based on renderer.toneMapping and renderer.outputColorSpace regardless of render target. Yes — OutputPass always applies outputColorSpace conversion (renderer.outputColorSpace, default SRGB). And tone mapping: renderer.toneMapping default NoToneMapping → no tone mapping applied. Good.

So final: composer passes: renderPass, outputPass, invertPass. The composer sets renderToScreen on the last pass automatically? EffectComposer in render() does: passes iterate; `pass.renderToScreen` — modern EffectComposer sets renderToScreen of last enabled pass? Yes, EffectComposer.render: "this.renderToScreen" logic: it determines last enabled pass and sets renderToScreen. Actually current implementation: `const isLastEnabledPass = i === passes.length - 1 ... pass.renderToScreen = (this.renderToScreen && isLastEnabledPass)`? Let me recall: EffectComposer render code:

```
const deltaTime = ...
currentToneMapping = renderer.toneMapping ...
for (let i = 0, il = passes.length; i < il; i++) {
  const pass = passes[i];
  if (pass.enabled === false) continue;
  pass.renderToScreen = (this.renderToScreen && this.isLastEnabledPass(i));
  pass.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  ...
}
```

Yes, EffectComposer has isLastEnabledPass. Good, so last pass renders to screen automatically.

But caution: ShaderPass rendering to screen — the input is readBuffer (OutputPass's output). OutputPass reads from readBuffer and writes to writeBuffer when not screen. Then invertPass reads writeBuffer... Standard ping-pong handles it. OutputPass when renderToScreen false: outputs to writeBuffer. Then invertPass renderToScreen true reads writeBuffer, outputs to screen. But does OutputPass's conversion to sRGB then get re-converted when read into invertPass? Render target texture colorSpace: composer render targets have colorSpace... EffectComposer creates render targets with... In recent three versions, composer's render target colorSpace defaults to LinearSRGBColorSpace? Actually WebGLRenderTarget default texture.colorSpace = NoColorSpace... Hmm. If the writeBuffer after OutputPass contains sRGB-encoded values stored in a HalfFloat target — reading gives raw values, no conversion on read (render target sampling doesn't auto-convert; color space of texture affects only via shader decode in built-in materials... ShaderPass samples with texel texture2D raw). Actually three's texture colorSpace with NoColorSpace means no decode. And when rendering the invert output to canvas raw — no encode. So values pass through unchanged. 

But wait: does writing sRGB values into a LinearSRGB-tagged target then reading cause issues? No — sampling is raw; three only auto-decodes textures with sRGB colorSpace set. Composer targets: `new WebGLRenderTarget(w,h,{type:HalfFloatType,...})`, texture.colorSpace default is NoColorSpace. Good.

Also need: when OutputPass renders to writeBuffer, its shader does conversion — yes unconditional in shader based on defines.

However: there's a subtlety — OutputPass sets defines based on renderer.outputColorSpace, fine.

Alternatively simpler and safe: keep natural order RenderPass → ShaderPass → OutputPass, and in ShaderPass do the inverse-roundtrip trick. But precision concerns. The OutputPass-after approach is cleaner and exact. I'll go with RenderPass → OutputPass → ShaderPass.

Hmm, but one more check: ShaderPass uniform tDiffuse sampling. Standard ShaderPass shader.

Shader:
```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(1.0 - color.rgb, color.a);
}
```
Wait — but the fragment shader output: ShaderMaterial by default includes... ShaderMaterial fragment shader is used as-is (plus prefix with precision). gl_FragColor raw. When rendering to screen (default framebuffer), does three apply output conversion? No — conversion happens only in materials including <colorspace_fragment>. Raw. Good.

But hmm — actually there's a nuance: three r152+ with WebGL2, ShaderMaterial outputs to gl_FragColor via the prefix? ShaderPass ShaderMaterial is a plain ShaderMaterial; fine.

Also alpha: composer render targets — clear alpha 0? Background is set via scene.background color, opaque. Output color alpha... To be safe output alpha 1.0. Canvas alpha: WebGLRenderer default alpha:false? Default renderer alpha false, so fine either way. I'll set color.a but background covers whole screen so alpha=1.

Now also verify the exact hex inversion: background 0x336699. scene.background = new THREE.Color(0x336699) → ColorManagement converts hex from sRGB to linear internally. RenderPass renders background into linear target as linear values. OutputPass converts linear→sRGB: gives exactly the sRGB values that were put in (round trip: sRGB→linear→sRGB with float precision — the linear stored as half float, error ~1e-3 relative; converting back gives sRGB value within ~0.001 → 255*s within ~0.3 of original → byte = original). Then invert → 255 - byte. Good: 0xCC9966. White sphere linear 1 → sRGB 1 → 0 → black. 

One more check: does RenderPass set clear with the background color properly into the target? Yes, renderer clears with scene.background color — when rendering to a render target, background color conversion: WebGLRenderer when clearing with Color background and rendering to a render target: uses _clearColor from background, converted via ColorManagement to working color space (linear). Actually background color: `scene.background` color — in WebGLBackground, clear color is converted with `ColorManagement.toWorkingColorSpace(_clearColor, ...)`. For render targets it uses the target's color space? In recent three: `WebGLBackground` — when renderTarget exists, uses linear conversion. The composer target is linear-srgb effectively. Either way, stored linear. Good.

Now write the code. Also resize: composer.setSize, renderer.setSize, camera aspect, updateProjectionMatrix.

Animation loop with delta/elapsed: minimal motion required? "Motion must use delta/elapsed time, not frame counts." I can slowly rotate the sphere. Fine.

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight); // setSize uses renderer size actually
composer.addPass(new RenderPass(scene, camera));

const InvertShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: `...`,
  fragmentShader: `...`
};
const invertPass = new ShaderPass(InvertShader);
const outputPass = new OutputPass();
composer.addPass(outputPass);
composer.addPass(invertPass);

let elapsed = 0;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;
  sphere.rotation.y = elapsed * 0.5;
  composer.render(delta);
  (window as any).__ready = true;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
...
```

Note: setAnimationLoop callback receives time and deltaTime? setAnimationLoop callback gets (time) param only... Actually WebGLRenderer.setAnimationLoop passes (time, frame?) — it passes timestamp. Use THREE.Clock for delta anyway; I already do.

ShaderPass typing: ShaderPass constructor accepts object with uniforms/vertexShader/fragmentShader. TypeScript types: ShaderPass(shader: object, textureID?: string). The uniforms typing — I'll define shader object plainly; tsc strict: ShaderPass expects `object`? Its signature: `constructor(shader: object, textureID?: string)`? Let me recall three's d.ts: 

```ts
class ShaderPass extends Pass {
  constructor(shader: object, textureID?: string);
  uniforms: { [name: string]: any };
  ...
}
```
Something like that — passing a plain object literal works. The `value: null` fine.

Hmm, ShaderPass constructor: it does `if (shader instanceof ShaderMaterial)` ... UniformsUtils.clone(shader.uniforms). Plain object fine.

OutputPass placement: adding outputPass before invertPass — composer's isLastEnabledPass handles renderToScreen.

Edge: OutputPass's material defines — it computes based on renderer.outputColorSpace which is SRGBColorSpace default → conversion applied. Good.

Also note about half-float precision: linear background values stored as half (10-bit mantissa). linearToSRGB round trip: error in sRGB ~ up to 0.002 → *255 up to 0.5 — could flip byte at boundary! Hmm, this is a real concern for exactness. Let's estimate: half float relative precision 2^-11 ≈ 4.88e-4. sRGB→linear of 0.2: linear ≈ 0.0331. Half representation error up to 0.0331 * 2.44e-4 (rounding to nearest: half ULP / 2) ≈ 8e-6 relative 2.4e-4. Then linear→sRGB: derivative ds/dL = (1/2.4) * L^(1/2.4 - 1) / ... For s=1.055*L^(1/2.4)-0.055: ds/dL ≈ (1.055/2.4) * L^(1/2.4-1). At L=0.0331: L^{-0.583} ≈ e^{0.583*3.408} ≈ e^{1.987} ≈ 7.3. ds/dL ≈ 0.44*7.3 ≈ 3.2. Error: 8e-6 * 3.2 = 2.6e-5 in sRGB → *255 = 0.0065. Negligible. For green 0x99=0.6: linear 0.3185, ds/dL at L=0.318: L^{-0.583} ≈ e^{0.583*1.144} ≈ 1.95, ds/dL≈0.86, error ~ 0.318*2.44e-4*0.86*255 ≈ 0.017. Still fine. Half precision is fine because relative error small; the sRGB curve amplifies but stays well under 0.5 byte. Good.

Actually wait — one thing: does ColorManagement convert hex to linear in `new THREE.Color(0x336699)`? Color.setHex(hex, colorSpace = SRGBColorSpace) → converts to working color space (linear). Yes.

MeshBasicMaterial color 0xffffff → white.

Also need to be careful: RenderPass's clear — composer target, renderer.autoClear... fine.

Also the requirement "(window as any).__composer = composer" and others.

Also OutputPass constructor in older three versions takes no args. Fine.

One concern: with pixelRatio > 1, composer handles setSize with pixelRatio internally (composer.setPixelRatio? EffectComposer takes renderer's pixel ratio at construction; setSize multiplies). OK.

Also I should set renderer.outputColorSpace? Default SRGB. Fine.

Write final code.