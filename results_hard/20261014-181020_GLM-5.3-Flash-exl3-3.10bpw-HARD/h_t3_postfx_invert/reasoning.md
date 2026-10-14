Key issue: EffectComposer renders into LinearSRGB render targets... Actually with OutputPass at the end, RenderPass outputs linear colors into composer's render target. The ShaderPass operates on the linear values. To invert sRGB values correctly, in the shader we must first convert linear→sRGB, invert, then convert back sRGB→linear (since OutputPass will do linear→sRGB at the end). Alternatively invert in linear space: screen_srgb = srgb(linear); inverted screen = 1 - srgb(linear) = srgb-inverse... The correct approach: in the shader, convert gl_FragColor (linear) to sRGB, invert, convert back to linear. Then OutputPass converts to sRGB giving exactly 1 - srgb_display.

Write shader: use functions matching Three's sRGB conversion (LinearSRGBToSRGB / SRGBToLinear approximations). Implement standard pow-based functions with the 0.0031308 / 0.00313066 thresholds.

GLSL:

```glsl
uniform sampler2D tDiffuse;
varying vec2 vUv;
vec3 lin2srgb(vec3 c){ return mix(c * 12.92, pow(c, vec3(1.0/2.4)) * 1.055 - 0.055, step(0.0031308, c)); }
vec3 srgb2lin(vec3 c){ vec3 s = c / 12.92; vec3 h = pow((c + 0.055)/1.055, vec3(2.4)); return mix(s, h, step(0.0031308, c)); }
void main(){
  vec4 col = texture2D(tDiffuse, vUv);
  vec3 srgb = lin2srgb(col.rgb);
  srgb = 1.0 - srgb;
  gl_FragColor = vec4(srgb2lin(srgb), col.a);
}
```

Check 0x336699: r=0x33/255=0.2; srgb→linear: r_lin ≈ 0.0331. lin2srgb recovers 0.2, invert = 0.8 = 0xcc ✓. g=0x66=0.4 → 1-0.4=0.6=0x99 ✓. b=0x99=0.6 → 0.4=0x66 ✓. 0xcc9966 ✓.

White sphere: 0xffffff → srgb 1.0 → 0 → linear 0 → output 0 → black ✓.

Important: renderer.outputColorSpace default is SRGBColorSpace; with EffectComposer, composer render targets are LinearSRGB? In modern three, EffectComposer's renderTarget colorSpace is set... Actually OutputPass handles tonemapping and color space conversion. The composer's render target is linear. ShaderPass receives linear data. Good.

Note: step edge cases — fine.

Also need tsc strict compile: ShaderPass takes shader object. Use full code:

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

ShaderPass needs `{ uniforms, vertexShader, fragmentShader }`. uniform tDiffuse must exist (texture gets overwritten). Use THREE.IUniform type? ShaderPass constructor accepts object; uniforms: `{ tDiffuse: { value: null } }`. With strict TS, ShaderPass(shader: object, textureID?) — it accepts object. Fine.

Render loop: setAnimationLoop with time param; compute previous time manually. __ready after first frame.

Resize: camera.aspect, updateProjectionMatrix, renderer.setSize, composer.setSize.

Write code.