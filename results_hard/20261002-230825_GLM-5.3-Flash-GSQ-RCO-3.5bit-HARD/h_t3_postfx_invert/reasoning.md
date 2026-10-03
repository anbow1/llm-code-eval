Key point: EffectComposer renders to linear buffers; RenderPass output is in linear color space when renderer.outputColorSpace is SRGB (composer render targets are linear). Then custom ShaderPass inverts in linear space, then OutputPass converts linear->sRGB. But inversion must happen in sRGB space to get exact inverse of on-screen colors. So: invert in sRGB space means we need to convert to sRGB, invert, and output... then OutputPass would convert again. Options:

1. Do inversion in the shader after converting linear->sRGB in the shader, then... OutputPass would apply sRGB conversion again, doubling. Actually if we invert in sRGB but then OutputPass converts linear->sRGB again, wrong.

Correct approach: since buffers are linear, the screen output = linearToSRGB(pass output). We want screen = 1 - sRGB(linearOriginal). So we need pass output (in linear) such that sRGB(output) = 1 - sRGB(input), i.e. output = sRGBToLinear(1 - sRGB(input)). So in the shader: read linear color, convert to sRGB, invert, convert back to linear. Then OutputPass does final linear->sRGB, giving exact inversion on screen.

Alternatively: convert linear->sRGB in shader, invert, and remove OutputPass? But requirement says include OutputPass. So use shader with sRGBToLinear conversions, then OutputPass does linear->sRGB.

But also renderer.toneMapping? Default is NoToneMapping, fine.

THREE colors: Color(0x336699) — setHex with SRGBColorSpace default converts to linear working space. Background is stored linear. Scene background is rendered into composer target as linear. Sphere white linear = (1,1,1). Good.

Shader: sRGB approximation vs exact? Three's OutputPass uses exact sRGB transfer (well, actually it uses the SRGB_TRANSFER shader chunk... In recent three versions, OutputPass uses the color space fragment with sRGBToLinear/LinearTosRGB exact formulas? Three's color_space_fragment uses LinearTosRGB which is the exact piecewise? Actually three uses approximate formula: LinearTosRGB = mix(1.055*pow Linear(-1/2.4))... Three's colorspace_pars uses the exact-ish formula with piecewise? Three's LinearTosRGB:

```
vec3 LinearTosRGB( in vec3 value ) {
    vec3 lt = vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) );
    vec3 hi = ...
    vec3 lo = 12.92 * value
    return mix(hi, lo, lt);
}
```

Yes, three uses the exact piecewise sRGB transfer. And LinearToSRGB in linear_to_srgb chunk. To exactly match, my shader should use the same functions. I can use `#include <colorspace_pars_fragment>` and `#include <colorspace_fragment>`? ShaderPass allows including chunks since it compiles ShaderMaterial which supports includes. Actually ShaderMaterial compiles with prefix including includes resolution — yes, all Three shader materials resolve #include.

Simpler robust approach: use SRGBTransfer functions. But version-dependent chunk names. Safer: implement my own exact piecewise transfer in the shader, matching three's. Three's functions (r150+):

```
vec3 LinearTosRGB(in vec3 value) {
  vec3 lt = lessThanEqual(vec3(0.0031308), value)?? 
```

Hmm, actually the chunk linear_to_srgb.glsl.js:

```
vec3 LinearToSRGB( in vec3 value ) {
	vec3 lt = vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) );
	vec3 hi = vec3( 1.055 ) * pow( value, vec3( 1.0 / 2.4 ) ) - vec3( 0.055 );
	vec3 lo = value * vec3( 12.92 );
	return mix( hi, lo, lt );
}
```

Wait, that's for value <= 0.0031308 use lo. mix(hi, lo, lt) — lt is 1 where value low, so lo chosen. Correct.

To avoid chunk name drift, I'll write my own identical functions: LinearTosRGB and SRGBToLinear (exact inverse piecewise). Then:

color = texture2D(tDiffuse, vUv).rgb (linear)
srgb = LinearToSRGB(color)
inverted = 1.0 - srgb
gl_FragColor = vec4(SRGBToLinear(inverted), 1.0)

Then OutputPass converts linear->sRGB: output sRGB = srgb(inverted linear) = inverted srgb exactly (SRGBToLinear then LinearToSRGB is exact inverse). Screen shows exact inverse.

One subtlety: OutputPass also applies tone mapping (NoToneMapping by default). Renderer default toneMapping = NoToneMapping, fine.

Also check background 0x336699: screen without effect = 0x336699. Inverted = 0xCC9966. R: 0x33=51 → 51/255... exact: srgb value = 51/255 = 0.2. inverted = 0.8 → byte 204 = 0xCC. G: 0x66=102 → inverted 153 = 0x99. B: 0x99=153 → inverted 102 = 0x66. Exact, since piecewise: linear = srgbToLinear(0.2), then invert in srgb space gives 0.8, back to linear, OutputPass gives 0.8. Exact round trip? srgbToLinear then linearToSRGB is exact identity mathematically (piecewise functions are inverses). Float precision may give tiny error, but fine.

Sphere white → linear 1 → srgb 1 → inverted 0 → black. 

Three version: import from 'three/addons/...' — assume npm style with import map. Use OutputPass from 'three/addons/postprocessing/OutputPass.js'.

Also need renderer with default settings; composer's OutputPass handles conversion, and renderer.outputColorSpace is SRGBColorSpace default but composer renders final pass to screen with renderToScreen — with OutputPass handling the conversion. Good.

ShaderPass uniforms: tDiffuse. Write GLSL.

TypeScript strict: ShaderPass constructor: new ShaderPass(shader object). Fine.

Resize: composer.setSize(w, h).

First frame ready flag: use a boolean in the render loop: after composer.render() first time, set __ready.

Code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0,0,4);
camera.lookAt(0,0,0);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({color: 0xffffff}));
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const invertPass = new ShaderPass({
  uniforms: { tDiffuse: {value: null} },
  vertexShader: ..., fragmentShader: ...
});
composer.addPass(invertPass);
composer.addPass(new OutputPass());
```

Note about pixel ratio: composer handles renderer's pixel ratio in setSize? EffectComposer.setSize uses renderer.getDrawingBufferSize? Actually composer.setSize(width, height) sets render target size to width*pixelRatio internally (it uses effectiveTextureSize? It uses this._pixelRatio = renderer.getPixelRatio(), and setSize multiplies). Yes, EffectComposer handles pixel ratio. Good.

Shader GLSL:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
vec3 linearToSRGB(vec3 value) {...}
vec3 sRGBToLinear(vec3 value) {...}
void main() {
  vec3 src = texture2D(tDiffuse, vUv).rgb;
  vec3 srgb = linearToSRGB(src);
  vec3 inv = 1.0 - srgb;
  gl_FragColor = vec4(sRGBToLinear(inv), 1.0);
}
```

Vertex shader standard: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

Animation loop with clock delta (motion requirement — nothing moves, but still use clock). Update __ready after first frame.

Resize handler updates camera aspect, renderer.setSize, composer.setSize.

Type strictness: fine. Write final.