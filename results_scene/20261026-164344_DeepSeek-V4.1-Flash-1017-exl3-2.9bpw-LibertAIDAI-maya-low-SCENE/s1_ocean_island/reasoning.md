We need to produce a single TypeScript file with all the requirements. Let me carefully design.

Key pieces:
1. Renderer, scene, camera at (35,12,35) looking at (0,2,0).
2. Ocean: PlaneGeometry 400x400 (or larger, say 600x600) with 256x256 segments, ShaderMaterial with Gerstner waves. Expose heightAt matching shader.
3. Boat group with hull, deck/cabin, mast, sail. Floating at (12,0,14).
4. Island: procedural geometry with vertex colors — radius ~20 (40 across), peak ~9 units. Use a cone-ish displaced plane/ circle geometry.
5. Palm trees: trunks (curved) — can use TubeGeometry or LatheGeometry along a curve; leaves as one InstancedMesh with >= 30 instances, animated every frame.
6. Sky: use Sky addon.
7. DirectionalLight sun matching sky sun direction, shadows.
8. Fog, ACESFilmic tone mapping, sRGB output.
9. Expose window vars.

Let me be careful about strict TS compile: no implicit any, proper types.

Wave function design: I'll define waves in a JS/TS constant used both by shader (via uniforms array or hardcoded GLSL string generated from same data) and TS. To guarantee match, generate GLSL from the same wave array.

Gerstner waves: for each wave i: direction (dx, dz) normalized, steepness Q, wavelength L, speed. k = 2π/L, c = sqrt(9.8/k) maybe, or given speed. amplitude.

Let's define waves:

```
interface Wave { dirX: number; dirZ: number; steepness: number; wavelength: number; speed: number; }
const WAVES = [
  { dirX: 1, dirZ: 0.3, steepness: 0.12, wavelength: 40, speed: 1.0 },
  { dirX: 0.7, dirZ: -0.7, steepness: 0.09, wavelength: 23, speed: 1.2 },
  { dirX: -0.4, dirZ: 0.9, steepness: 0.07, wavelength: 14, speed: 1.4 },
  { dirX: 0.2, dirZ: 1, steepness: 0.05, wavelength: 8, speed: 1.6 },
];
```

Gerstner: for horizontal displacement not needed for height; height = sum over waves of amplitude * sin(k*dot(dir,pos) - omega*t + phase)? For Gerstner vertical: y += Q * A * sin(...) hmm. Standard Gerstner:

P.x = x + sum(Q_i * A_i * D_i.x * cos(w_i * dot(D_i, x) + phi_i * t))
P.z = z + ...
P.y = sum(A_i * sin(...))

For heightAt ignoring horizontal shift, we compute y at undisplaced (x,z) using the same formula with (x,z) — that's exactly "the vertical displacement your shader applies at the undisplaced position". Good.

Amplitude A = steepness / k ... Actually Gerstner amplitude A_i with steepness Q_i: the constraint is Q_i * k_i * A_i <= 1. Use A = steepness/k? Then vertical amplitude = A. Let's set A_i directly, and use Q_i = steepness. Let's define amplitude per wave and steepness factor.

Let me use: for wave i:
- k = 2π/L
- omega = speed * sqrt(9.8 * k) — that gives realistic dispersion; speed multiplier ~1.
- A = amplitude
- phase = k * dot(D, p) - omega * t
- y += A * sin(phase)
- horizontal: x += Q * A * D.x * cos(phase)

Total crest-to-trough: sum of amplitudes * 2. Want 0.5–2 units. Let's use amplitudes 0.5, 0.35, 0.2, 0.12 → sum = 1.17, crest-to-trough ~2.34. Hmm, maybe slightly less. Let's aim sum ~0.8 → crest-to-trough 1.6. Good.

Amplitudes: 0.40, 0.25, 0.12, 0.06 → sum 0.83, crest-to-trough 1.66. Good.

Compute omega = sqrt(9.8*k) * speedFactor maybe just sqrt(9.8*k). For L=40, k=0.157, omega=1.24 rad/s → period 5s. Fine.

Shader: compute normal analytically from Gerstner derivatives, plus foam on crests.

Ocean material: ShaderMaterial with uniforms: time, sunDirection, sunColor, skyColor, deepColor, shallowColor, cameraPosition (auto), fog stuff (need fog manually since ShaderMaterial doesn't get fog automatically unless we add). We can include fog manually via uniforms fogColor, fogNear/Far, or use `fog: true` and include fog chunks. Simpler: manually compute fog in fragment shader with scene.fog values passed as uniforms.

Actually for ShaderMaterial, we can set `fog: true` and include `#include <fog_pars_fragment>` etc. But those require the material to have fog uniforms merged — three handles that if `fog: true` is set on ShaderMaterial? Yes: if material.fog === true, the renderer adds fog uniforms to the material's uniforms via WebGLRenderer's refreshFogUniforms. Actually for ShaderMaterial, uniforms must be merged with UniformsLib.fog. Let's just do manual fog to be safe. Simpler and safe.

I'll write GLSL manually.

Ocean vertex shader:
- attributes position (plane rotated so we handle in shader? Better: create PlaneGeometry(600,600,256,256) and rotateX(-PI/2) so vertices are in XZ plane with y=0). Then position.x is x, position.z is z. Good.
- Compute displacement using wave function; set y and horizontal offsets.
- Compute normal via analytic derivatives or finite differences. Use analytic: derivative of y with respect to x and z.

For Gerstner, the surface normal calculation is more complex because of horizontal displacement. But for lighting, computing approximate normal from y derivative is fine. I'll compute the normal as cross of tangents including horizontal shift — but simpler: use finite-difference-ish analytic using the height derivatives of the vertical component only. Actually let's compute proper Gerstner normal:

For each wave: 
phi = k*(D·p) - omega*t
y += A sin(phi)
x_offset += Q A D.x cos(phi)
z_offset += Q A D.z cos(phi)

Tangent along x: dP/dx = (1 + sum(-Q A D.x^2 k sin(phi)) , sum(A D.x k cos(phi)) , sum(-Q A D.x D.z k sin(phi)))
Tangent along z similarly. Normal = cross(Tz, Tx)? Let's just compute partial derivatives:

dP/dx = ( 1 - Σ Q A k Dx² sin φ,  Σ A k Dx cos φ,  -Σ Q A k Dx Dz sin φ )
dP/dz = ( -Σ Q A k Dx Dz sin φ,  Σ A k Dz cos φ,  1 - Σ Q A k Dz² sin φ )

Normal = cross(dP/dz, dP/dx)? For a surface parameterized by (x,z), N = dP/dx × dP/dz gives... Standard: N = cross(dPdz, dPdx) — let's check with flat: dPdx=(1,0,0), dPdz=(0,0,1). cross(dPdz,dPdx) = (0,0,1)×(1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0). Good, up. So N = cross(dPdz, dPdx).

Computing this in GLSL with loops is fine. Grid is 256x256 = 65k vertices; loop of 4 waves okay.

But I'll compute normal in the fragment shader instead for higher quality? With 256x256 grid over 600 units, that's 2.34 units per quad — that's coarse. Fragment-based normal computation gives smoother shading. But we need world position in fragment. Let's compute the normal per-fragment from world position (using analytic derivatives again but with high precision) — that's 4 waves in the fragment shader, cheap enough.

Actually simpler: compute vWorldPos in vertex shader (including displacement? but for fragments between vertices, world pos is interpolated; derivates computed from the interpolated world position won't match the true wave surface since horizontal displacement is linearly interpolated). Simpler to just compute normal in the vertex shader and pass as varying, but smooth interpolation over coarse grid could look faceted-ish. With 256 segments and large waves it's fine-ish. Hmm.

Alternative approach: don't apply horizontal displacement in the vertex shader at all (just vertical), then compute the normal analytically in the fragment shader from the interpolated horizontal world position (x,z) — this exactly matches the analytic function since x,z are interpolated exactly (no horizontal shift). And heightAt in JS returns the vertical displacement at undisplaced position, which matches. That's cleaner and satisfies the requirement ("ignore the small horizontal shift"). So: no horizontal displacement — that makes it a sum of sine waves, not Gerstner proper, but the spec says sum of directional waves (Gerstner or sine) and heightAt returns vertical displacement ignoring horizontal shift. To keep picture matching heightAt exactly, best to skip horizontal displacement. It looks fine with directional sine waves of varied direction.

So: y = Σ A sin(k D·p - ω t). Fragment computes normal from analytic derivative of the same function using world x,z. Vertex computes y. 

But wait — the fragment's world x,z comes from the interpolated position; we pass vWorldPos.xz = position.xz (undisplaced) — exact. Good.

Then normal:
dy/dx = Σ A k Dx cos(φ)
dy/dz = Σ A k Dz cos(φ)
N = (-dy/dx, 1, -dy/dz) normalized. Good.

Foam: based on crest height (y above some threshold) and shore proximity (distance to island center) plus noise. Use a simple hash noise in GLSL for foam texture.

Water color: deep color, shallow near island. Fresnel with sky color. Specular Blinn-Phong from sun.

Also we need a sky. Use Sky addon from 'three/addons/objects/Sky.js'. Set turbidity, rayleigh, sun position. Then use Sky's sun direction for DirectionalLight. But fog color should match horizon — set scene.fog color to something like 0x9fc4e0 or use a light blue.

Sky addon: `import { Sky } from 'three/addons/objects/Sky.js';` It requires a large scale: sky.scale.setScalar(10000). It computes sun position via elevation/azimuth uniforms. Then get sun direction from `sky.getSunDirection`? Newer three Sky has `sky.getSunDirection(new THREE.Vector3())`? Hmm, in recent versions Sky has a `sunPosition` uniform which is a Vector3 you set directly (uniforms['sunPosition'].value). Actually in r150+, Sky has uniforms: turbidity, rayleigh, mieCoefficient, mieDirectionalG, sunPosition. And there's a helper method? In the examples, they compute the sun position from elevation/azimuth using spherical and set uniforms['sunPosition'].value.copy(sun). I'll do that manually so no dependency on a helper method's existence.

Sun elevation e.g. 25 degrees, azimuth 130 degrees (in three's spherical convention used by Sky example):
```
const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);
sun.setFromSphericalCoords(1, phi, theta);
sky.material.uniforms['sunPosition'].value.copy(sun);
```
Then directional light position = sun * 200, target at origin.

Note that Sky's material is a ShaderMaterial with side: BackSide. It renders the sky. Also we must ensure the sky renders behind everything; since scale 10000 and camera far plane must be large (say 20000) — or set sky renderOrder and depthWrite false. Simpler: camera far = 2000, sky.scale.setScalar(1500)? But fog... Actually the Sky shader ignores fog. Let's set sky scale 4000, camera far 10000. Fine.

Hmm but the ocean 600x600 will render; with fog fading to horizon it should be okay. The horizon line: ocean edges at 300 units, fog far around 350-400. Let's set fog near 100, far 400 with color matching sky horizon (light blue). Ocean plane 700x700 maybe. Requirement: at least 400x400. Let's use 800x800 with 256 segments → 3.1 units per quad — coarse for waves of wavelength 8. Hmm, that reduces detail. But okay; small waves mostly for normal detail. Vertex displacement with 3.1 units spacing on wavelength-8 wave would alias. Let's reduce the ocean to 600x600 with 256 segments (2.34 units/quad). Wavelengths: 40, 23, 14, 8. The 8 wavelength would be aliased at 2.34 spacing (needs ~8 samples per wavelength minimum ~1 unit). Hmm, maybe drop the shortest wave to wavelength 12 and amplitude small. Actually we compute normals in the fragment shader from analytic derivatives, so the vertical displacement aliasing matters less visually — but the geometry silhouette could wobble. Let's use wavelengths 42, 24, 15, 9 with the smallest amplitude 0.05. The high-frequency detail comes from normal computed per-fragment, which will look fine.

Hmm, but there's a mismatch: geometry displacement vs shading normal — should match closely enough.

Actually, alternative: since shading normal comes from the analytic function evaluated per-fragment, we could go further with a detail normal for small ripples. Keep it modest.

Ocean size: let's use 1000x1000? fog far 400 would hide edges. With fog far ~350, ocean half-extent 500 is plenty safe. Grid 256 segments over 1000 → 3.9 units/quad, too coarse near the island. Hmm.

Better: use a smaller ocean 400x400 with 256 segments (1.56 units/quad) and set fog to fade before the edge: fog near 120, far 200? The camera is at distance ~50 from origin, so the ocean edge at 200 units from origin is at ~250 from camera; fog far 220 hides it. Hmm, that'll look like a foggy day. Actually with a sky dome and good horizon color it can look fine — a hazy tropical horizon.

Let's do: ocean plane 500x500, 256 segments → 1.95 units/quad. Fog: near 80, far 230. Camera at 48 units from origin. The ocean edge nearest is at ~200 units distance from camera and farthest 300. With fog far 230, edges mostly fogged. Good enough. Actually, to guarantee no visible edge, make the ocean 900x900 but with the geometry grid non-uniform? Too complex. 

Alternative: two-layer ocean — a detailed 400x400 near plane plus a huge simple far plane at low y? Simplest: single 700x700 with 256 segs (2.7 units/quad) and fog far ~250. Let's just pick 600x600 with 256 → 2.34. Fog far 260. Ocean edge at 300 from origin: from the camera at (35,12,35) looking at origin, points at the far edge are ~380 away → fully fogged. Points near edge along the view direction: the horizon. Fine.

Hmm, but fog color must match the sky's horizon color to look seamless. Sky at horizon with turbidity 8, rayleigh 2, etc. gives a whitish-blue. I'll set fog color ~0xbcd7ea and tweak. Not perfect match but with the tone mapping it'll look acceptable-ish. Actually, mismatched fog vs sky horizon is a common visual issue. Let's set the sky params so the horizon is pale blue-white, and fog color 0xa8c8de-ish.

Actually the Sky shader has a bright sun near the horizon region... whatever. Let's just go with reasonable values.

Alternatively — instead of the Sky addon, make a custom gradient sky dome ShaderMaterial with a sun disc, and derive the fog color from the same gradient horizon color. That guarantees a match and avoids the Sky addon's brightness issues with tone mapping (Sky addon output is very bright; needs tone mapping exposure adjustment). Using Sky addon is requested as an option, not a requirement. A custom gradient sky is more controllable and matches fog. I think a custom sky dome is safer and looks good: gradient from deep blue at zenith to pale near horizon, plus a sun disc with glow.

Let's write a sky dome: SphereGeometry(4000, 32, 16), BackSide, ShaderMaterial with uniforms topColor, horizonColor, sunDirection, sunColor. In fragment: 
```
vec3 dir = normalize(vWorldPosition); // relative to camera? For a huge sphere centered on origin, and camera near center, direction ≈ normalize(worldPos - cameraPos). Use vWorldPos - cameraPosition uniform.
float h = clamp(dir.y, 0.0, 1.0);
vec3 col = mix(horizonColor, topColor, pow(h, 0.55));
// below horizon fade to horizon color
// sun
float sd = max(dot(dir, sunDir), 0.0);
col += sunColor * pow(sd, 900.0) * 3.0;  // disc
col += sunColor * pow(sd, 12.0) * 0.25;  // glow
```
Add fog color = horizonColor. But the sky's horizon color changes with sun direction... For simplicity, keep horizon color constant-ish. Fog color = horizonColor.

But wait — tone mapping applies to the sky too (ShaderMaterial needs tone mapping applied manually or `toneMapped: true`? For ShaderMaterial, the renderer doesn't automatically apply tone mapping unless you include the tonemapping fragment chunks. Actually three.js applies tone mapping in the shader only if the material's fragment shader includes `#include <tonemapping_fragment>`. For raw ShaderMaterial we must include it ourselves. Let's include:

```
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
At the end of the fragment shader for both sky and ocean. These chunks exist in three (r152+ has colorspace_fragment; older has encodings_fragment). For r150+, `colorspace_fragment` exists. Since we use modern three addons (r155+ likely), use `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`. But those chunks reference `gl_FragColor` — in newer three (r152+) they use gl_FragColor still (until r163 where they moved to outputColor?). Hmm. In three r167, the chunks were changed? Let me recall: In r165ish, three moved to `gl_FragColor` still... Actually in r163+, the shader chunks were updated: `tonemapping_fragment` uses `gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );`? Let me recall the current chunk content:

```
#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
Yes, that's it (still uses gl_FragColor as of r170). And colorspace_fragment:
```
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
Yes. So writing to gl_FragColor works in ShaderMaterial. But wait — WebGL2 with three's ShaderMaterial: three prepends `#define gl_FragColor` ... no. Actually in newer versions, ShaderMaterial fragment shaders can use gl_FragColor since three still injects compatibility. Hmm, in three r152+, gl_FragColor is deprecated but still works in GLSL1 shaders (three uses GLSL1 by default for ShaderMaterial → uses gl_FragColor). Actually three compiles ShaderMaterial as GLSL ES 1.00 unless glslVersion is set. So gl_FragColor is fine. But three r163+ replaced internal `gl_FragColor` with `pc_fragColor`? Only in WebGPU/TSL. For WebGL, three's shader chunks still use gl_FragColor (with `#define gl_FragColor pc_fragColor` when using GLSL3?). Let's just use gl_FragColor and include the chunks — this is standard practice and works.

Hmm, risk: If the installed three version is newer (r18x?), did they remove `colorspace_fragment`? I believe r170 still has it. Let's just use them but wrap in a way that's safe? Can't conditionally include. I'll go with `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`.

Alternatively, to be safest, I could set `renderer.outputColorSpace = THREE.SRGBColorSpace` and `toneMapping = ACESFilmic` and for ShaderMaterial, do the tone mapping manually in my fragment shader, and then convert to sRGB manually? But three will not double-convert since for ShaderMaterial without the chunks, no conversion happens — the output is written directly. Wait: with outputColorSpace = sRGB, three applies the conversion in the shader via colorspace_fragment chunk, which is included in built-in materials only. For a custom ShaderMaterial, if I don't include it, the color goes out linearly to the sRGB-encoded framebuffer... Actually the canvas framebuffer is sRGB-ish (the drawing buffer is treated as sRGB by the browser when outputColorSpace = SRGBColorSpace? Three sets the drawing buffer to be treated... hmm). In three, when outputColorSpace is sRGB, the renderer's shaders do `linearToOutputTexel` which applies the sRGB encode. The canvas isn't an sRGB framebuffer automatically (three doesn't use sRGB8_ALPHA8 for the default framebuffer), so we must encode manually. So yes, I must include the colorspace chunk (or do the conversion manually).

Simplest robust approach: include the chunks. I'm fairly confident they exist in all recent versions (r152–r180). Let's do it.

Actually, safer: do tone mapping + sRGB conversion manually in my shader with explicit functions, and set `material.toneMapped` irrelevant. Let's write:

```
vec3 toneMapACES(vec3 x){ ... }
vec3 linearToSRGB(vec3 c){ return pow(c, vec3(1.0/2.2)); } // approximate
```
Then `gl_FragColor = vec4(pow(aces(c), vec3(1.0/2.2)), 1.0);`

If the renderer also applies the chunk... it doesn't for custom ShaderMaterial (no chunk included = no conversion). So output is exactly what I write. But careful: three's built-in materials (boat, island, palms) WILL be tone mapped and converted by three. So my custom shader must match that pipeline: ACES filmic + sRGB. If I implement the same ACES approximation as three's ACESFilmicToneMapping, colors will match nicely.

Three's ACESFilmicToneMapping implementation:
```
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),
		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),
		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
```
And sRGB conversion: three uses `linearToOutputTexel` = `sRGBTransferOETF`:
```
vec4 sRGBTransferOETF( in vec4 value ) {
  return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
```

That's a lot of code to duplicate but it's safe. Hmm. Alternatively use `#include` chunks which is less code and standard. I'll use the include chunks — they're standard and will exist. Actually, there's a subtle risk that newer three (r172+) might have changed chunk names... I recall `colorspace_fragment` was introduced in r152 replacing `encodings_fragment`. It's still there in r180 I believe. Let me just use the includes; it's the documented approach.

Hmm, let me reduce risk: I'll implement manual ACES + sRGB encode with a simpler ACES approximation (Narkowicz) — it's close enough and doesn't depend on chunk names. But then ocean and sky would be slightly darker/different from the rest. Actually the difference between Narkowicz ACES and three's ACES is small. Alternatively set renderer.toneMapping = NoToneMapping and handle everything... no, built-in materials need tone mapping.

Decision: use `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` at the end of fragment shaders for sky and water. This is the standard documented approach. I'll go with it.

Wait, one caveat: for `tonemapping_fragment` to do anything, the material needs the TONE_MAPPING define, which the renderer sets automatically for materials with `toneMapped !== false`... Does the renderer inject TONE_MAPPING define for ShaderMaterial? In WebGLProgram, `parameters.toneMapping` is derived from `material.toneMapped ? renderer.toneMapping : NoToneMapping`. And it adds `#define TONE_MAPPING` and the tone mapping function via `getToneMappingFunction` in the prefix for fragment shaders — this happens for all materials including ShaderMaterial? Let me recall WebGLProgram.js:

```
if ( parameters.toneMapping !== NoToneMapping ) {
	prefixFragment += '#define TONE_MAPPING\n';
}
...
prefixFragment += ShaderChunk['tonemapping_pars_fragment'] ... 
```
Actually in WebGLProgram:
```
parameters.toneMapping !== NoToneMapping ? '#define TONE_MAPPING' : '',
parameters.toneMapping !== NoToneMapping ? ShaderChunk[ 'tonemapping_pars_fragment' ] : '',
parameters.toneMapping !== NoToneMapping ? getToneMappingFunction( 'toneMapping', parameters.toneMapping ) : '',
```
These are in the "custom defines" prefix for all shaders I believe. Yes, prefixFragment includes them for all materials. And `toneMappingExposure` uniform is added automatically for materials? The renderer sets `uniforms.toneMappingExposure` via `refreshUniformsCommon`... Hmm, for ShaderMaterial, is `toneMappingExposure` available? In WebGLProgram, `uniforms` come from material.uniforms. But `toneMappingExposure` is declared as a uniform in the prefix: `uniform float toneMappingExposure;` and set by the renderer via `p_uniforms.setValue( _gl, 'toneMappingExposure', _this.toneMappingExposure );` — this happens in setProgram for all programs (`materialProperties.needsLights` branch...). Let me recall:

```
if ( material.isShaderMaterial || ... ) { ... }
...
// common matrices
p_uniforms.setValue( _gl, 'modelViewMatrix', object.modelViewMatrix );
...
```
And toneMappingExposure: In `setProgram`:
```
if ( refreshMaterial ) {
  ...
  p_uniforms.setValue( _gl, 'toneMappingExposure', _this.toneMappingExposure );
```
Hmm, I believe this is inside a block for materials with `toneMapping`? Let me recall more precisely from three source (WebGLRenderer.setProgram):

```
if ( material.isMeshStandardMaterial || ... ) { ... }
...
```
Actually there's:
```
// common matrices
p_uniforms.setValue( _gl, 'modelViewMatrix', object.modelViewMatrix );
...
```
and earlier:
```
if ( refreshMaterial || materialProperties.receiveShadow !== object.receiveShadow ) {...}
...
if ( refreshMaterial ) {
	p_uniforms.setValue( _gl, 'toneMappingExposure', _this.toneMappingExposure );
	if ( materialProperties.needsLights ) { markUniformsLightsNeedsUpdate(...) }
	...
}
```
I'm fairly sure `toneMappingExposure` is set for every material when refreshMaterial. Yes — I recall that line exists unconditionally in the refreshMaterial block. Good.

But it's still risky. Honestly, the safest bet: do everything manually. Let me just include the chunks but ALSO set the uniform manually in my material by adding `toneMappingExposure: { value: 1 }`? No — if it's auto-set it'd be overwritten anyway. Fine.

Hmm, let me weigh once more. The most robust approach that produces good images without depending on chunk internals: manual tone mapping in my shaders with the exact same math three uses. I'll write the ACES function manually and the sRGB OETF manually and set `renderer.toneMapping` to ACESFilmic for built-in materials. But wait — if the renderer sets TONE_MAPPING define for my ShaderMaterial (since toneMapped defaults true), then `tonemapping_pars_fragment` gets injected into the prefix (harmless, just defines functions), and my shader includes `#include <tonemapping_fragment>` only if I write it. If I don't write it, nothing happens. So I can do my own math — but then if my manual math differs slightly from three's, minor mismatch. Using the exact same formula ensures match.

Actually simplest and cleanest: include the chunks. Three's docs literally say for custom shaders you should include `<tonemapping_fragment>` and `<colorspace_fragment>`. I'll go with includes. Risk of chunk rename is low for the version being used in this evaluation (probably r16x-r17x).

OK. Decision made: use includes.

Now, let me plan the code structure.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

Do I need OrbitControls? Requirement: camera at exactly (35,12,35) looking at (0,2,0) — OrbitControls allowed if they start there and don't move by themselves. I'll skip OrbitControls to avoid complications (camera must be exactly at that position). Skip.

Renderer setup:
```ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0'; // set via cssText
```

Scene, fog:
```ts
const scene = new THREE.Scene();
const horizonColor = new THREE.Color(0xa9c6dd); // fog
scene.fog = new THREE.FogExp2? 
```
Requirement says scene.fog blends far ocean into horizon. Use THREE.Fog(color, 120, 420) maybe. With ocean 600x600, the far edge at ~300 from origin, camera at 48 → distance ~350 → nearly fully fogged. Good. Let's use Fog(0x9fc3dd, 90, 380).

Hmm, ocean 600x600: half extent 300. The corner distance from camera is sqrt((300+35)^2 + (300+35)^2) ≈ 474, but the visible horizon in view direction ~ 300-ish. With fog far 380, edges partially visible. Let's make the ocean 800x800 with 256 segments (3.1 units/quad) — coarse... trade-off.

Alternative: use a radial/circular ocean mesh with more density near the center? Custom geometry: a disc with rings, exponential spacing → high detail near the island and boat, coarse far away. That's a nice trick. But then the vertex shader still works in world XZ. Building a custom ring-based grid:

Actually simpler: PlaneGeometry 600x600 with 256 segments and fog far 300 (near 100). Then the far edges (300 away) are fully fogged. Camera at 48 from origin, so a point at 300 units in the view direction is 348 from camera → fully fogged at far=300? Fog applies based on camera distance. With Fog near=100 far=300, a point 348 away is fully fogged. But points at the edge perpendicular... hmm, in the view direction the ocean edge is behind the horizon anyway.

But the horizon problem: with fog far 300, everything beyond 300 is fog colored, which matches the sky horizon → looks like a proper horizon. Good. And the ocean plane at 600x600 ensures coverage out past 300 in all directions from the camera (camera at 48 from center, the plane extends 300 from center → at least 252 in every direction from the camera... hmm, in the direction away from the plane's near edge: camera at (35,35) diag, plane extends to (-300,-300) corner → distance ~474. The near edge is at distance ~252 from the camera. Points between 252 and 300 distance are not fully fogged. Meaning the near ocean edge could be visible as a line at ~252 units... At that distance, fog is at 76% — a faint seam. Hmm.

Make the ocean bigger: 1000x1000 with 256 segments → 3.9 units/quad. Then the near edge is at ~450 from camera → beyond fog far 300, fully fogged. Great, no seam. But 3.9 units/quad for waves: wavelength 42 → 10 samples per wavelength, fine. Wavelength 24 → 6 samples, marginal. Wavelength 15 → 4 samples, aliasing. But since normals are computed analytically per-fragment, geometry aliasing shows mainly in silhouette. Actually vertex displacement with 4 samples/wavelength creates visible jagged geometry at grazing angles... but with distance fog, far waves aren't visible. Near the boat (close to camera), the geometry at 3.9-unit spacing on a 15-unit wavelength wave gives visible faceting in the silhouette? With per-fragment normals it'd look okay-ish. Hmm.

Compromise: ocean 800x800 with 256 segments (3.1 units/quad) and fog near 100 far 320. The plane's near edge from camera ≈ 350 → fully fogged. Good. And limit the smallest wavelength to 16 to avoid aliasing. Crest-to-trough: amplitudes 0.42, 0.28, 0.15, 0.08 → sum 0.93 → 1.86 total. Good.

Wavelengths: 55, 32, 19, 12? The 12 with 3.1 spacing is 4 samples — aliasing. Use 55, 33, 20, 12.5. Meh. Let's use amplitudes with the shortest being 0.05 (small). Fine.

Actually, one more idea to get detail: add a high-frequency normal-only detail in the fragment shader (sin waves with wavelength ~3-5, small amplitude), which doesn't need geometry. But then heightAt vs picture mismatch — heightAt returns the vertical displacement, and the detail normal doesn't change the displacement, so heightAt still matches. That's fine, since normal detail is just shading. But it could break the "match the picture" if someone compares. Small detail normals are acceptable. I'll skip extra detail to keep the match tight... Actually adding slight detail normal is a nice visual improvement. Let's keep it simple: skip.

Now: island. Procedural island centered at origin, ~40 units across, peak ~8.

Build a mesh: use a CircleGeometry? Better: a custom radial grid: rings from r=0 to r=R, with height = f(r) * noise. Let's build a circular grid geometry manually:

- Radius max 22 (44 across).
- Rings: 64 rings, segments: 96 around → 6144 verts, fine.
- Height(r, theta) = peak * heightProfile: h = A * exp(-(r/σ)²)?? We want it to slope into the sea below water level near edges: h = peak * (1 - r/R)^1.5 * something, going negative at the edge.

Let's define: baseHeight = 9.0. f(r) = 1 - smoothstep... Let's do a simple cone-ish: h(r) = peak * Math.pow(1 - r/R, 1.6) * 1.0, where at r = R it's 0, and beyond R it's negative (extend to r = R*1.25 with negative height so it dips underwater). Add noise (perlin-ish via sin/cos sum) for realism.

Then also color per vertex: sand below y < 0.9, grass above, rock at top, wet sand darker below water. Use vertex colors with a MeshStandardMaterial({vertexColors: true, flatShading: false, roughness: 0.9}).

Actually for a nicer look I could use flatShading with low-poly style... but "realistic, good-looking". Let's use smooth shading with vertex colors and some noise.

Peak 5-15 above water: use peak ~8.5.

Island geometry generation:
```ts
function islandHeight(x: number, z: number): number
```
Hmm — the island mesh's heights should match a function so palms can sit on it. Use polar: r = sqrt(x²+z²).

```
const R = 22;
function heightAtR(r: number): number {
  if (r > R*1.3) return -6;
  const t = Math.min(r / R, 1.2);
  let h = peak * Math.pow(Math.max(0, 1 - t/1.0), 1.7); // 0 at r=R
  // beyond R: continue negative
  if (r > R) h = -3.5 * ((r - R) / (R*0.3));
  return h + noise;
}
```
Add noise: 1.2 * sin(x*0.35)*cos(z*0.31) + 0.6*sin(x*0.9+1.3)*sin(z*0.8). Multiply noise by a falloff that fades near the shore? Keep noise moderate so the peak isn't jagged.

Also to ensure the island actually rises out of the water, the ocean waves at the shore will wash over. Fine.

Vertex colors:
- y < 0.0: dark sand/rock underwater (0x5a5443?)
- 0 <= y < 1.2: sand 0xd8c69a
- 1.2 <= y < 4.5: grass 0x4f8b3a → mix
- y >= 4.5: rock 0x6b6455

Blend using smoothstep for smooth transitions. Write a small function to compute color per vertex with some noise variation.

Palms: 7 palms placed at radius 5..14, height from island terrain. Trunk: curved — build with TubeGeometry along a CatmullRomCurve3, or use a series of cylinders. TubeGeometry is easy: create points from base to top with a curve, radius tapering via TubeGeometry(curve, 20, 0.25). Tube radius constant; for taper we could use a custom approach, but constant radius 0.22 is fine. Actually let's build the trunk manually with a CylinderGeometry ring... simpler: TubeGeometry with radius 0.25 and radialSegments 6.

Leaves: InstancedMesh of a leaf geometry (a custom shape: a tapered plane). Create leaves as a small cone-ish shape: use a PlaneGeometry(0.35, 2.2) then modify vertices to taper to a point, or use a custom BufferGeometry. Simpler: use `THREE.PlaneGeometry(0.5, 2.4, 1, 4)` and taper widths along its length via vertex manipulation, with a slight curve (bend along y). Then InstancedMesh with 7 palms × 8 leaves = 56 instances (>=30). Each leaf gets a matrix computed each frame from the palm's top position, rotation (yaw + droop + wind sway), and scale.

Leaf material: MeshStandardMaterial({color: 0x2e7d32, side: DoubleSide, roughness: 0.8}). Shadows: leaves cast shadows? castShadow on InstancedMesh works. Maybe enable it.

Every frame update instance matrices: base transform per leaf (position at palm top, yaw, pitch) times wind sway rotation (sin(t*speed + phase)). Compose with matrices via Matrix4.compose or multiply.

Implementation:
```ts
const dummy = new THREE.Object3D();
// per instance: position (palmTopPos + offset), rotation (yaw, pitch, roll), scale
```
Every frame:
```
for (i...) {
  const p = leafData[i];
  const sway = Math.sin(time * 1.7 + p.phase) * 0.16 + Math.sin(time*3.1+p.phase*1.7)*0.06;
  dummy.position.copy(p.base); // world position
  dummy.rotation.set(0,0,0);
  dummy.rotateY(p.yaw);
  dummy.rotateX(p.pitch + sway); // droop + sway
  dummy.rotateZ(sway*0.5);
  dummy.scale.setScalar(p.scale);
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
leaves.instanceMatrix.needsUpdate = true;
```
Note: the leaf geometry should have its origin at the base and extend along +Y (length direction), so rotating works naturally. So build the leaf geometry from y=0 to y=length.

Leaf geometry construction: a custom BufferGeometry with a spine and width — create vertices: for each of N segments along y, two vertices at ±width(y)/2 in x, plus a slight curl in z. Then indices. Let me write a helper `createLeafGeometry()`.

Simpler alternative: use a PlaneGeometry(1, 1, 1, 6) translated so it spans y in [0,1], then taper x by (1 - y) shape and add curl:
```
const g = new THREE.PlaneGeometry(0.5, 2.6, 2, 8);
g.rotateX(-Math.PI/2)? 
```
Hmm, let's just write a custom geometry — cleaner control.

```ts
function makeLeafGeometry(): THREE.BufferGeometry {
  const segs = 8;
  const positions: number[] = [];
  const indices: number[] = [];
  const len = 2.6;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const y = t * len;
    const w = 0.42 * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.35*t); // width profile
    const curl = -0.55 * t * t * len * 0.5; // droop in z
    positions.push(-w * 0.5, y, curl);
    positions.push( w * 0.5, y, curl + 0.02);
  }
  // Actually width should be 0 at t=0 and t=1.
  for (let i = 0; i < segs; i++) {
    const a = i*2, b = i*2+1, c = (i+1)*2, d = (i+1)*2+1;
    indices.push(a, c, b, b, c, d);
  }
  ...
}
```
Width profile: sin(pi * t^0.6) gives 0 at both ends, max in middle. Good. Plus a slight fold along the spine: make the mid z offset a V shape — create 3 vertices per row (left, center, right) with center slightly lower (like a folded leaf). Let's do 3 columns for a nicer look: left, center, right where center z is +0.04 (a ridge). Eh, keep it simple with 2 columns but add a curl in z that varies.

I'll do the 3-column version for a nicer leaf shape:
- for each i: t, y, halfWidth w, centerZ = curl(t), edgeZ = curl(t) - w*0.25 (drooping edges).
- vertices: (-w, y, edgeZ), (0, y, centerZ), (w, y, edgeZ).
- indices: two quads per segment.

Good.

Palm crown position: the palm top. Leaves arranged around at yaw = i*2π/8 + offset, pitch = -(0.5..1.1) rad droop (rotateX negative bends the leaf down? Rotation of a leaf pointing +Y by rotateX(angle) tilts toward +Z or -Z). With rotateX(-θ), +Y goes toward +Z? Rotation about X by angle θ: y' = y cosθ - z sinθ, z' = y sinθ + z cosθ. So a point (0,1,0) → (0, cosθ, sinθ). So rotateX(positive θ) tilts the leaf toward +Z. Then rotateY around to distribute. So each leaf: rotateY(yaw) then rotateX(droop) — order matters: apply rotation as Euler with order 'YXZ' gives R = Ry * Rx * Rz? Three's Euler 'YXZ' means R = Ry(y) * Rx(x) * Rz(z). Yes with order YXZ, rotateY happens first in the composition (applied last to the vector?). Let's set dummy.rotation.order = 'YXZ' and set rotation.y = yaw, rotation.x = droop. Then matrix = Ry * Rx, so the vector is first rotated by X (tilting into +Z), then by Y (spinning around). That gives leaves pointing outward in the direction yaw with droop. 

Need the leaf base at the palm crown, so dummy.position = palm top.

Also add coconuts? Not needed.

Boat: group at (12, 0, 14), 4 units long. Parts:
- Hull: use a custom shape? Simplest realistic-ish: a scaled sphere or a lathe? Use a stretched box with tapered ends... Let's build the hull from a custom geometry: an extruded shape? Alternative: use a CapsuleGeometry scaled? Let's use a lathe-like approach: create a hull using THREE.BufferGeometry from a "boat" loft — too complex.

Simple approach that looks decent: hull = a sphere scaled (2.0, 0.55, 0.75)? A half-sphere-ish. Hmm.

Let's make the hull from a box with beveled ends via a custom geometry: define cross-sections along the length. Actually a nice trick: use CylinderGeometry with radialSegments=8 rotated so its axis is along Z (length), scaled in x and y to make a hull shape, and taper? Cylinder doesn't taper, but we can use CylinderGeometry(radiusTop, radiusBottom,...) — along the axis. If the axis is the boat length, tapering means the front is narrower. CylinderGeometry with different top/bottom radii tapers along the axis, which gives a bow narrowing... but it narrows evenly along the whole length rather than just at the bow.

Better: build a custom hull geometry via lofting sections along z. Let's write it: for i in 0..N (along length from -2 to 2), width w(i) = 0.8 * sqrt(1 - (i_centered/2.2)^2)... that's an ellipse planform. Height h(i) = 0.55 * same-ish. Cross section: an arc (half-ellipse) for the hull bottom plus a flat deck at the top.

Let me just generate a hull mesh: parameterize by (u along length, v around cross-section). For each station z_i from -2 to 2 (bow at +2), half-width W(z) = 0.75 * sqrt(max(0, 1 - (z/2.05)^2)) plus a bit; depth D(z) = 0.5 * same. Cross-section points: for angle a from 0..π (half circle from port to starboard through the bottom): x = W*cos(a)?? Let's define cross-section as a half-ellipse: x = W * cos(θ), y = -D * sin(θ) for θ in [0, π] going from starboard (θ=0: x=W, y=0) down to keel (θ=π/2: x=0,y=-D) to port (θ=π: x=-W, y=0). Then the deck closes the top flat at y=0. So the hull is a half-ellipsoid cap + flat top.

Generate grid: rows = stations (say 20 along length), cols = 16 across the half-ellipse. Then a deck plane covering the top. Actually the hull top is open; add a deck mesh as a flat surface (a separate shape) — or just include the deck as part of the hull by closing the top: add a center vertex per station? Simpler: create a separate deck mesh using the same planform outline, flat at y = 0.02, as a ShapeGeometry in XZ. Eh.

Simplest approach overall: use `LatheGeometry`? no.

Alternative simpler boat: hull = a scaled SphereGeometry half? A sphere scaled to (0.8, 0.55, 2.0) and then cut in half at y=0 (using phiStart/phiLength? SphereGeometry(1, 32, 16, 0, Math.PI*2, Math.PI/2, Math.PI/2) gives the bottom half). Then scale to (0.8, 0.6, 2.0). That gives a nice boat-ish hull (rounded, pointed-ish ends). Plus a deck: a flat shape on top, e.g., a scaled circle/ellipse shape or a box. Then a cabin: a box with a rounded top. Mast: cylinder + sail: a curved plane or a triangle shape.

I think the half-sphere hull is a good, quick, good-looking solution. Adding a tapered bow can be done by scaling z more and using a "cone" front... The half-ellipsoid looks like a little dinghy. Good enough for "small boat".

Let's do:
- hull: SphereGeometry(1, 32, 24, 0, Math.PI*2, Math.PI/2, Math.PI/2) (bottom half), scaled (0.85, 0.62, 2.0). Material: MeshStandardMaterial({color: 0x9c3b2e (red), roughness: 0.5, metalness: 0.1}).
- deck: a flat ellipse: CylinderGeometry(1,1,0.06, 32) rotated? no — use CircleGeometry then rotateX(-PI/2) and scale (0.82, 1, 1.9). Slight y offset 0.02 above hull rim. Actually the hull's rim at y=0 has half-width 0.85 and length 2.0 at its widest; the ellipse at y=0 is exactly the scale. Deck slightly smaller: 0.8, 1.9. Color wood 0xb08b5a.
- cabin: a box (1.0 x 0.55 x 0.9) at (0, 0.3, -0.35) white, with a smaller box on top? Keep: cabin box + roof.
- mast: CylinderGeometry(0.05, 0.06, 3.2) at (0, 1.6, 0.25).
- sail: a triangular sail — use a custom BufferGeometry triangle with slight curve, DoubleSide, color 0xf7f4ea. Or use PlaneGeometry with vertices bent. Let's build a triangular sail with 3 vertices (0,0,0),(0,3,0),(0,0,-1.2)... Actually let's make a sail from a BufferGeometry: a curved triangle from mast top down to boom. I'll create a shape with a slight belly using a plane grid and displacing z, then cutting into a triangle... simpler: a triangle with a curve, using a small grid of 4x4 vertices with the triangle mask applied. Let's use THREE.Shape + ShapeGeometry: define a 2D triangle with a curved hypotenuse via quadraticCurveTo, then ShapeGeometry → flat in XY plane, then position at the mast. That gives a nice sail shape.

Sail placement: mast at z=0.25, sail plane spanning from the mast top (y=3.0) down to the boom at y=0.75, extending backward (z negative? or along x?). Let's put the sail in the YZ plane at x=0, spanning z from 0.25 to -1.4, with the leading edge along the mast.

Using ShapeGeometry in XY then rotating to YZ: create shape in XY: points (0,0) bottom at mast, (0,2.2)? Let's define shape with x = along the boom direction, y = up:
- start at (0, 0), line to (0, 2.4) [mast head? no, the luff is along the mast], then quadratic curve to (1.5, 0.2) with control (1.2, 1.6) [leech], then close to (0,0) [foot].
Then rotate the geometry so that its local x maps to world -z and y stays y. rotateY? A shape in XY plane has normal +Z. To place it in the YZ plane, rotate about Y by -π/2: x→ -z? Rotation about Y by -90°: (x,y,z) → (x cos(-90) + z sin(-90), y, -x sin(-90)+ z cos(-90)) = (-z, y, x)... let's compute: R_y(θ): x' = x cosθ + z sinθ; z' = -x sinθ + z cosθ. With θ = π/2: x' = z, z' = -x. So geometry x maps to world -z. Good: rotateY(Math.PI/2). Then the sail extends in -z direction, normal along -x or +x.

Fine — with DoubleSide it doesn't matter.

Also add a jib? Not necessary. Keep 5-6 meshes: hull, deck, cabin, mast, boom, sail. Good.

Boat group positioned at (12, 0, 14); we set group.position.y each frame = heightAt(x,z,t) + offset (~0.3 so the hull sits at the waterline). Also add a slight constant offset so that the hull bottom is underwater: hull bottom is at -0.62 relative; waterline offset 0.35 → bottom at -0.27 below the surface. Good.

Boat pitch/roll: sample heightAt at bow (z+2), stern (z-2), port (x-0.9), starboard (x+0.9) in world coordinates around the boat's position (ignoring boat rotation; fine).

pitch = atan2(hBow - hStern, 4) → rotation about X axis. With bow at +z (local +z), positive pitch... In three, rotation.x positive tilts the +z axis downward (since rotating about X: z→ y negative? R_x(θ): y' = y cosθ - z sinθ, z' = y sinθ + z cosθ. A point at +z (0,0,1) → (0, -sinθ, cosθ). So positive rotation.x moves the bow down. If the bow is higher (hBow > hStern), we want the bow up → rotation.x = -atan2(hBow-hStern, 4). 

Roll: rotation.z. Positive rotation.z rotates +x toward +y (x' = x cos - y sin, y' = x sin + y cos) → starboard (+x) up. If starboard water is higher (hStar > hPort), the boat should roll with starboard up → rotation.z = +atan2(hStar - hPort, 1.8). Good.

Smooth these with lerping for stability? Just compute directly; fine, but might be jittery. Use damping: boat.rotation.x = lerp toward target. Since we compute per frame with continuous time it's smooth anyway.

Boat position: fixed at (12, ?, 14) with a slow drift: x = 12 + 1.5*sin(t*0.13), z = 14 + 1.2*cos(t*0.11). Stays within 25 of origin — yes (12.5,14.5 → ~19). Good.

Now the DirectionalLight with shadows covering the island and the boat: shadow camera ortho -40..40 with the light at sunDir*100 pointing at origin. Shadow map 2048.

Let's set sun elevation ~32°, azimuth ~55°? The camera is at (35,12,35) looking at origin — the sun should be up and to the side. Let's put the sun direction at elevation 35°, azimuth 215°? Let's think about where it appears in view. The camera looks from (+x,+z) toward the origin, so the view direction is (-1,-1,-1)-ish. The sky is visible around the top. If the sun is behind the camera (i.e., in the +x+z direction), the scene is front-lit which is good for the boat and island. Sun azimuth: direction vector = (sin(az), ...). Using spherical from three's Sky example conventions: 
```
phi = degToRad(90 - elevation); theta = degToRad(azimuth);
sunDir.setFromSphericalCoords(1, phi, theta)
```
setFromSphericalCoords(radius, phi, theta) → x = r sinφ sinθ, y = r cosφ, z = r sinφ cosθ. With elevation=35: φ = 55°, sinφ = 0.819, y = cos55° = 0.574. theta = 40°: x = 0.819*0.643 = 0.527, z = 0.819*0.766 = 0.627. So the sun is at +x+z, which is behind the camera (camera at +x+z looking to origin). Front-lit scene. 

Sun disc in the sky would then be behind the camera — not visible in the initial view. Hmm, "with a visible sun position". Maybe put the sun to the side so it's visible in the frame. Camera at (35,12,35) looking at (0,2,0): its forward direction is (-0.7, -0.2, -0.7). The FOV is 55° (vertical). Horizontal FOV ~ 80°. For the sun to be visible in the frame, the sun direction should be near the forward direction (-x-z) or up. If the sun is at azimuth 200° and elevation 30°, direction (-0.47, 0.5, -0.72)... The angle between that and forward (-0.7,-0.2,-0.7): dot = 0.33+(-0.1)+0.5 = 0.73 → 43°, borderline visible at the top-right of the frame.

Alternatively, put the sun high (elevation 55°) and to the left: azimuth 200° → direction = (sin35°*sin200°, cos35°, sin35°*sin... let's compute: φ = 35°, sinφ=0.574; theta=200°: sinθ=-0.342, cosθ=-0.940. x = 0.574*(-0.342) = -0.196, y = cos35° = 0.819, z = 0.574*(-0.940) = -0.539. Direction (-0.196, 0.819, -0.539). Forward is (-0.7,-0.2,-0.7) normalized. Angle: dot = 0.137 - 0.164 + 0.377 = 0.35 → 69°. Not visible.

Hmm, the sun visibility in frame: the camera looks down at the water from 12 units up, so the sky occupies the top portion of the frame. With a 55° vertical FOV, the view's upper edge is at about... forward direction elevation = atan(-10/49.5) = -11.4°; the top of the frame is at -11.4 + 27.5 = +16°, and with the horizontal spread the top corners go higher. So the sun must be low (near the horizon) to appear. A sun at elevation ~10° would be visible near the horizon in the frame, giving a nice sunset-ish look and beautiful specular highlights on the water. But a low sun makes the lighting dim and long shadows.

Compromise: elevation ~15°, azimuth chosen so the sun is roughly in the view direction (-x, -z): azimuth 225° → direction: φ=75°, sinφ=0.966; θ=225°: sinθ=-0.707, cosθ=-0.707. x = -0.683, y = 0.259, z = -0.683. That's exactly toward the far corner (-x,-z). Forward direction is (-0.7,-0.2,-0.7) → the sun is almost exactly in the view center but at elevation 15°. Angle between sun and forward: dot = 0.683*0.7 + 0.259*(-0.2) + 0.683*0.7 = 0.478 - 0.052 + 0.478 = 0.904 → 25°. So the sun is at 25° from the view center — visible in the frame. 

This creates a backlit scene with the sun near the horizon, water glitter path, and long shadows. Very pretty and "game-like". But the island is backlit and dark on the camera side. Add hemisphere light for fill so it's not too dark. Backlit sunsets look great.

But requirement: "A DirectionalLight as the sun, matching the sky's sun direction". Fine.

Hmm, but maybe better to keep the sun a bit higher for a pleasant tropical day: elevation 25°, azimuth 215°, and use a warm-white sky. With elevation 25 the sun is at ~25° above the horizon, and the frame's top edge is at 16° (+ the corners higher). At azimuth 215°, direction: φ=65°, sinφ=0.906; θ=215°: sinθ=-0.574, cosθ=-0.819. x=-0.520, y=0.423, z=-0.742. Angle from forward (-0.7,-0.2,-0.7)/|.|: forward normalized ≈ (-0.698,-0.199,-0.698). dot = 0.363 - 0.084 + 0.518 = 0.797 → 37°. With a horizontal FOV of ~80° (half 40°) and vertical half 27.5°, a point 37° off-axis could be visible in the corner region. The sun would be at the top of the frame near the horizon-ish. Good enough — visible when you look up.

I'll place the sun at elevation 28°, azimuth 210° — visible in the upper part of the frame if slightly off-center. Let's compute where it lands. Actually, it doesn't matter much; let's just make it decent: elevation 30, azimuth 205.

Let me compute: φ = 60°, sinφ=0.866; θ=205°: sinθ=-0.4226, cosθ=-0.9063. x=-0.366, y=0.5, z=-0.785. Angle with camera forward (-0.698,-0.199,-0.698): dot = 0.2555 - 0.0995 + 0.548 = 0.704 → 45.3°. Hmm, likely just outside the frame (corner distance for a 55° vertical FOV and 16:9 aspect: horizontal half-FOV = atan(tan(27.5°)*1.78) = atan(0.52*1.78)= atan(0.926) = 42.8°; corner angle = acos(cos(27.5)cos(42.8)) = acos(0.887*0.733)=acos(0.65)=49.4°). So 45° is within the frame corner. OK, visible in the top-right corner region. 

To ensure it's clearly visible, let's use elevation 25°, azimuth 200°:
φ=65°, sinφ=0.9063; θ=200°: sinθ=-0.342, cosθ=-0.940. x=-0.310, y=0.4226, z=-0.852. dot with forward: 0.216 - 0.084 + 0.595 = 0.727 → 43.4°. Visible near the top corner. Good.

Actually, the sun disc glow will be visible. Fine.

Hmm, with the sun that low (25°), shadows are long and the scene warm. That's fine and pretty.

Let me set elevation = 28, azimuth = 200. Warm-ish sun color 0xfff2d0 with intensity ~2.5 (with ACES and physically correct lights... three r155+ uses "useLegacyLights = false" by default, meaning intensity in candela-ish units. For DirectionalLight, intensity 2-3 works well).

Let's use: sun intensity 2.2, color 0xffeedd. Hemisphere light: sky 0x9fc4e8, ground 0x3a5b3a, intensity 0.6. Plus a small ambient? Hemisphere is enough.

Now the ocean shader details.

Vertex shader:
```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vFlatPos; // undisplaced xz

// wave function
vec3 waveInfo(vec2 p) ... 
```
Define waves in GLSL with a loop over a const array. I'll generate the GLSL string in TS from the WAVES array to guarantee consistency:

```ts
const waveGLSL = `
vec3 waveHeight(vec2 p, float t) { ... }
`;
```
Simpler: hardcode 4 waves as constants using template literal with computed numbers.

Let me define waves:

```ts
interface WaveDef { angle:number; wavelength:number; amplitude:number; speed:number; phase:number; }
const WAVES: WaveDef[] = [
  { angle: 0.0, wavelength: 52, amplitude: 0.42, speed: 1.0, phase: 0.0 },
  { angle: 0.9, wavelength: 31, amplitude: 0.24, speed: 1.0, phase: 1.7 },
  { angle: -0.6, wavelength: 19, amplitude: 0.13, speed: 1.0, phase: 4.1 },
  { angle: 2.1, wavelength: 11.5, amplitude: 0.07, speed: 1.0, phase: 2.6 },
];
```
omega = speed * sqrt(9.8 * k). For L=52: k=0.1208, ω=1.088. For L=11.5: k=0.546, ω=2.313.

In TS:
```ts
export? no.
const waveK = (w: WaveDef) => 2*Math.PI/w.wavelength;
function heightAt(x:number, z:number, t:number): number {
  let h = 0;
  for (const w of WAVES) {
    const k = 2*Math.PI/w.wavelength;
    const omega = w.speed * Math.sqrt(9.8*k);
    const dx = Math.cos(w.angle), dz = Math.sin(w.angle);
    h += w.amplitude * Math.sin(k*(dx*x + dz*z) - omega*t + w.phase);
  }
  return h;
}
```
Wait — direction: use D = (cos a, sin a) in xz. Fine.

The shader must match exactly. Generate the GLSL loop from the same data:

```ts
const waveGLSL = WAVES.map(w => {
  const k = 2*Math.PI/w.wavelength;
  const omega = w.speed*Math.sqrt(9.8*k);
  const dx = Math.cos(w.angle), dz = Math.sin(w.angle);
  return `h += ${w.amplitude.toFixed(6)} * sin(${k.toFixed(6)} * (${dx.toFixed(6)} * p.x + ${dz.toFixed(6)} * p.y) - ${omega.toFixed(6)} * t + ${w.phase.toFixed(6)});`;
}).join('\n');
```
Careful with `p.y` for z. I'll name the vec2 `p` with p.x = x, p.y = z.

And the derivative:
```
dh/dx += A*k*dx*cos(...)
dh/dz += A*k*dz*cos(...)
```
Generate similarly.

That's clean and guarantees a match. But floating-point literal precision: toFixed(6) is precise enough.

Ocean geometry: PlaneGeometry(800, 800, 256, 256) → 257*257 = 66049 vertices. That's fine. rotateX(-PI/2). Actually, does the plane rotated have position.x/y/z? After rotateX(-π/2), the plane's local coordinates become y=0, z = original -y. So position.x = x, position.z = z. Good.

But for the vertex shader, I only need position.xz (undisplaced). Good.

Ocean material:
```ts
const oceanMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSunDir: { value: sunDir.clone() },
    uSunColor: { value: new THREE.Color(0xfff0d8) },
    uSkyColor: { value: new THREE.Color(0x9fc4e8) },
    uHorizonColor: { value: horizonColor },
    uDeepColor: { value: new THREE.Color(0x03253f) },
    uShallowColor: { value: new THREE.Color(0x1f7f96) },
    uIslandRadius: ...
  },
  vertexShader, fragmentShader,
  side: THREE.DoubleSide? FrontSide is fine,
  transparent: false,
});
```
Fog manually: uniforms uFogColor, uFogNear, uFogFar. Compute in fragment: `float d = length(vWorldPos - cameraPosition); float f = smoothstep(uFogNear, uFogFar, d);`. Note: `cameraPosition` is a built-in uniform provided for ShaderMaterial? Yes — three injects `uniform vec3 cameraPosition;` in the vertex/fragment prefix for all shaders. Actually `cameraPosition` is defined in the common prefix for both vertex and fragment shaders: in the vertex prefix there's `uniform vec3 cameraPosition;` and the fragment prefix also has it. Yes.

Hmm — but careful: `cameraPosition` is auto-set by three only if the uniform exists in the program; three sets it via `p_uniforms.setValue(_gl,'cameraPosition', _this.camera.position)`? Hmm, actually three declares cameraPosition in the shader prefix and sets it in `WebGLRenderer` — I recall `p_uniforms.setValue( _gl, 'cameraPosition', ... )` exists? In WebGLRenderer there's:
```
if ( p_uniforms.map.cameraPosition !== undefined ) { ... }
```
Hmm. Actually cameraPosition is injected via `UniformsLib`? Let me recall: In three's WebGLRenderer, there's

```
// common uniforms
p_uniforms.setValue( _gl, 'cameraPosition', _this.camera.position );  ??
```
Hmm, I recall that in `setProgram` there's:
```
if ( material.isShaderMaterial || material.isRawShaderMaterial ) { ... }
```
and later:
```
p_uniforms.setValue( _gl, 'projectionMatrix', camera.projectionMatrix );
p_uniforms.setValue( _gl, 'viewMatrix', camera.matrixWorldInverse );
p_uniforms.setValue( _gl, 'cameraPosition', camera.position );  <- I'm fairly sure this exists
```
Hmm... Actually I remember `cameraPosition` is set in `WebGLRenderer.setProgram` under the `refreshMaterial` block:
```
if ( refreshMaterial ) {
  ...
  p_uniforms.setValue( _gl, 'cameraPosition', _this.camera.position ); // hmm not sure
}
```
I'm not 100% sure. But I know for sure that built-in materials use `cameraPosition` in their shaders (e.g., MeshStandardMaterial's envmap, and `vViewPosition` computation uses modelViewMatrix). Actually MeshStandardMaterial uses `cameraPosition` in `worldpos_vertex`? The `fog_vertex` chunk uses `mvPosition`. Hmm, `cameraPosition` is used in `envmap` chunks and `transmission`. Built-in shaders do reference `cameraPosition` and it works, so it must be set. Yes — I'm confident three sets `cameraPosition` for all programs.

To be safe, I could avoid relying on it: pass my own uniform `uCameraPos` updated each frame. That's safer. Let's do that.

Ocean fragment shader:

```glsl
uniform float uTime;
uniform vec3 uSunDir, uSunColor, uSkyColor, uHorizonColor, uDeepColor, uShallowColor, uFogColor, uCameraPos;
uniform float uFogNear, uFogFar;
varying vec3 vWorldPos;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ ... value noise ... }

void main() {
  vec2 p = vWorldPos.xz;
  float t = uTime;
  // height
  float h = 0.0;
  <generated>;
  // derivatives
  float dhx = 0.0, dhz = 0.0;
  <generated>;
  vec3 N = normalize(vec3(-dhx, 1.0, -dhz));

  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + V);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
  fres = mix(0.03, 1.0, fres);

  // shallow factor near island
  float dIsland = length(p);  // distance from island center
  float shallow = 1.0 - smoothstep(14.0, 40.0, dIsland);

  vec3 waterColor = mix(uDeepColor, uShallowColor, shallow * 0.9);
  // add a bit of diffuse from sun
  float diff = max(dot(N, L), 0.0);
  vec3 body = waterColor * (0.35 + 0.65*diff);

  // specular
  float spec = pow(max(dot(N, H), 0.0), 220.0) * 3.0 + pow(max(dot(N,H),0.0), 24.0)*0.25;

  // sky reflection
  vec3 R = reflect(-V, N);
  vec3 skyRefl = mix(uHorizonColor, uSkyColor, clamp(R.y*1.2, 0.0, 1.0));

  vec3 col = mix(body, skyRefl, fres) + uSunColor * spec;

  // foam on crests
  float crest = smoothstep(0.55, 0.95, h);  // h up to ~0.9
  float foamNoise = noise(p*0.7 + vec2(t*0.2, -t*0.15));
  float foam = smoothstep(0.45, 0.75, crest * (0.6 + 0.8*foamNoise));
  // shore foam
  float shoreFoam = (1.0 - smoothstep(15.0, 19.0, dIsland)) * smoothstep(0.35,0.8, noise(p*1.3 + t*0.3));
  col = mix(col, vec3(0.9, 0.95, 1.0), clamp(foam + shoreFoam*0.6, 0.0, 1.0));

  // fog
  float dist = length(uCameraPos - vWorldPos);
  float fogF = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

Note: `#include <tonemapping_fragment>` in a ShaderMaterial — the chunk is present in ShaderChunk; the include mechanism is handled by `resolveIncludes` in WebGLProgram for all shaders. Yes, includes are resolved for ShaderMaterial too.

Careful with the foam noise function needing to be defined. I'll write a small value noise.

Also the normals: with a wave amplitude sum of 0.86 and wavelengths, dh/dx can be significant. Good.

Wait: one issue — `h` computed in the fragment shader is the same as the vertex displacement, but the vertex y is interpolated; the fragment computes h analytically at that xz so it's exact. Fine, we just use h for foam.

Also for the island proximity: island radius ~22 for the terrain, but the water surface is at y=0 and the island slopes below; foam near shore at r≈18-22.

Now, does the ocean need to hide the underwater part of the island? The island dips below y=0 near r>22. Since the ocean is opaque, the underwater island parts are hidden. Good, but the ocean plane is at y=displaced which is around 0 ± 0.9; the island's shore at r≈22 has height 0 → the water at those places oscillates ±0.9, so the water may be above/below the sand. That creates a natural shoreline. Good.

Hmm, but the ocean mesh at 800 size and the island mesh inside: fine.

Now let's also handle: does the ocean receive shadows from the island? No (ShaderMaterial). Not required.

Sky dome: SphereGeometry(3000, 32, 16), BackSide, ShaderMaterial with depthWrite false, and rendered first. Set `sky.renderOrder = -1` and `sky.frustumCulled = false`. camera.far = 6000? With the sky at radius 3000 and the camera far = 5000, fine. But the fog... the sky doesn't use fog.

Hmm — with a large far plane, depth precision is fine (logarithmic not needed).

The ocean at 800x800 fits within far=5000.

Sun disc in the sky shader with a bright disc + glow, plus maybe some cloud-ish noise? Keep it simple but pretty: gradient + sun glow. Maybe add a subtle horizon haze band.

Sky fragment:
```glsl
varying vec3 vDir;
uniform vec3 uSunDir, uTopColor, uHorizonColor, uSunColor;
void main() {
  vec3 d = normalize(vDir);
  float y = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizonColor, uTopColor, pow(y, 0.6));
  // below horizon
  col = mix(col, uHorizonColor * 0.9, smoothstep(0.0, -0.15, d.y));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(sd, 1800.0) * 6.0;      // sun disc
  col += uSunColor * pow(sd, 60.0) * 0.5;        // inner glow
  col += uSunColor * pow(sd, 6.0) * 0.12;        // wide glow
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
With ACES tone mapping and exposure ~1, pow(sd,1800)*6 will be white-hot. Good.

vDir: from the vertex shader, `vDir = position;` (the sphere's local position). Since the sphere is centered on the camera? No, it's at the origin, and the camera is at (35,12,35) — the sphere radius 3000 means parallax is negligible. Use `vDir = position` and normalize in the fragment. Fine. Or better: make the sky follow the camera: `sky.position.copy(camera.position)` each frame. That guarantees the sky is centered on the camera. Then vDir = normalize(worldPos - cameraPos). Let's just set the sky's position to the camera each frame and use `vDir = position` (local). Good.

Colors: topColor = 0x2a5da8 (deep blue), horizonColor = 0xb8d4e8 (pale). Sun color 0xfff0d0. With tone mapping, the blue will darken... Let's pick slightly brighter linear colors: since the shader outputs linear values that get tone mapped, we should specify colors as linear. THREE.Color from hex is sRGB by default; three's Color constructor with a hex sets the values directly as sRGB-ish numbers (no conversion unless using setStyle with color management enabled... In r152+, `new THREE.Color(0x336699)` — with color management enabled by default, `Color.setHex(hex, colorSpace = SRGBColorSpace)` converts to linear working space. Yes! In r152+, Color.setHex applies `ColorManagement.toWorkingColorSpace`. So `new THREE.Color(0x336699)` gives linear values. Then passing it as a uniform to a custom shader gives linear values, which is what we want. Good — that's consistent.

But careful: `new THREE.Color(0xff0000)` → linear (1,0,0). Good.

So when I write `vec3 col = uHorizonColor` it's linear. Good. Then tone mapping + sRGB encode → correct.

Now the water colors: deep = 0x052235-ish, shallow = 0x1a8fa0. In linear these are darker. Fine.

Fog color: 0xa8c8dd. In linear ~ (0.4, 0.57, 0.72). The sky horizon color 0xb8d4e8 linear ≈ (0.48,0.65,0.82). Close enough; I'll use the exact same color for both to guarantee a match: `const horizonColor = new THREE.Color(0xaecfe8)` used both for the sky horizon and for the fog. But the sky's horizon near the sun is brighter due to the glow. That's fine.

Hmm, but with ACES tone mapping, the fog color will be tone-mapped to something less bright than expected; the sky's horizon color would also be tone-mapped identically (since it's the same value) — so they match at the horizon line. 

But the sky's horizon at the far ocean is the direction y≈0, where col = mix(horizon, top, 0) = horizonColor, plus the sun glow. So they match where the sun isn't. Excellent.

Also, the ocean at grazing angles shows the sky reflection which is `mix(horizon, sky, R.y)`. Fine.

Now, let's think about "the ocean looks good". Add a bit of specular sparkle with high power. And the fresnel. Good.

Let's think about wave height attenuation near the island? Not necessary.

Now let's write the code. Also need to expose:
```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__ocean = { heightAt, time };
(window as any).__boat = boat;
(window as any).__leaves = leaves;
(window as any).__island = island;
(window as any).__sun = sun;
(window as any).__ready = true after the first frame.
```

Let's set __ready in the animation loop after the first render (using a flag).

Time: `const clock = new THREE.Clock();` then `const t = clock.getElapsedTime();` and oceanTime = t (wave time = elapsed). The `time()` function returns the wave time used by the shader right now — i.e., the last value set to uTime. Store in a variable `waveTime`. Then `time: () => waveTime`.

Important: the boat uses heightAt(x, z, time()) which must match the frame. Since we set uTime = waveTime before rendering, and the boat uses the same waveTime, all consistent.

Now TypeScript strictness: no implicit any; the ShaderMaterial uniforms are fine. Use explicit types.

For `(window as any)` — allowed since `any`.

Let's now write the island geometry.

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const R = 21;
  if (r > R * 1.35) return -8;
  let h: number;
  if (r <= R) {
    const t = r / R;
    h = 8.5 * Math.pow(1 - t, 1.5);   // 8.5 at center, 0 at R
  } else {
    const t = (r - R) / (R * 0.35);
    h = -4.5 * t;
  }
  // ridge noise
  const n = Math.sin(x * 0.22 + 1.3) * Math.cos(z * 0.19 - 0.7) * 1.8
          + Math.sin(x * 0.55) * Math.sin(z * 0.48 + 2.1) * 0.8
          + Math.sin(x * 1.1 + z * 0.9) * 0.35;
  // fade noise toward the shore so the beach stays smooth-ish
  const fade = Math.min(1, Math.max(0, (R - r) / 6 + 0.25)) ;
  h += n * fade * 0.8;
  return h;
}
```
Hmm, at r=R, h=0 exactly plus noise*fade where fade ~0.25 → the shoreline wobbles. Fine.

The peak with pow(1-t,1.5): at t=0, 8.5. Plus noise up to ~2.9*0.8 = 2.3 → peak ~10.8. Good (5-15).

Now build the island mesh geometry with polar rings:
```ts
const rings = 56, segs = 128, Rmax = 21*1.35 = 28.35;
```
Vertices: ring 0 is the center (single vertex) — actually a ring of radius 0 has coincident vertices; simpler to start rings at i=0 with r=0 (degenerate) — that creates degenerate triangles at the center but is fine visually. Or start at i=1 with a center vertex. Let's include the center as a separate vertex.

Positions: for i in 0..rings: r = Rmax * (i/rings)^1.2? A non-linear radial distribution gives more detail near the center. Or uniform. Uniform is fine with 56 rings over 28 units → 0.5 units per ring. Good.

For each ring, segs=128 points around → 56*128 = 7168 verts + center. Fine.

Height via islandHeight(x,z). But note that near the outer rim, we want underwater depth so the island disappears under the ocean. With islandHeight returning -4.5 at r = Rmax, that's fine.

Also, the island mesh has a hole in the middle if we start rings at r=Rmax/rings... Let's do i from 0 to rings with r = Rmax*i/rings, and at i=0 all vertices coincide at (0,0,peak). Degenerate triangles — fine, but might create normal artifacts. Better: start at i=1 and add a center vertex at index 0.

Let me do: 
- vertices: index 0 = center (0, h(0,0), 0).
- then rings i=1..rings: r = Rmax*(i/rings), segs points.
- indices: for the center fan: (0, firstRing[j], firstRing[j+1]).
- for rings i and i+1: quads.

Normals: computeVertexNormals.

Vertex colors: per vertex based on height.

Colors:
- deep underwater: 0x4a5a4a? Let's do a wet sand color 0xb9a878 → darker underwater.
- beach sand: 0xe6d8a8
- grass: 0x5b8a3c
- rock: 0x7a7266

Blend:
```
if (h < 0.0) color = mix(sandDark, sand, smoothstep(-3, 0, h))
else if h < 1.5: mix(sand, sandDry,...)
...
```
Let me write:
```ts
const cSand = new THREE.Color(0xe4d5a4);
const cSandWet = new THREE.Color(0xbfae7e);
const cGrass = new THREE.Color(0x4d7c37);
const cRock = new THREE.Color(0x7d7668);
```
Blend:
- t1 = smoothstep(-1.5, 0.6, h) → wet sand to dry sand
- t2 = smoothstep(1.2, 2.8, h) → sand to grass
- t3 = smoothstep(6.0, 9.0, h) → grass to rock

color = mix(cSandWet, cSand, t1); then mix with grass by t2; then with rock by t3. Plus small noise variation on brightness.

Also, the terrain near the shore is underwater (h<0) — the ocean covers it.

Island material: MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0, flatShading: false }). Receives shadows, casts shadows.

island.receiveShadow = true; island.castShadow = true.

Palms placement: at radius 6..15 from the center, at angles spread out. Height = islandHeight(x,z). Need the height above water for the palm base: only place palms where islandHeight > 0.5. Let's place them at specific (x,z) computed from radius/angle with checks. I'll generate positions deterministically with a seeded random or a fixed list.

Let's use a small deterministic PRNG:
```ts
let seed = 1337;
function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
```

Palm positions: for i in 0..7:
```
const a = (i / 8) * Math.PI*2 + 0.4;
const r = 5 + rnd()*9; // 5..14
x = cos(a)*r, z = sin(a)*r
h = islandHeight(x,z)
if (h < 1.0) adjust: scale r down
```
Hmm, need each palm to be on land above water. Since h decreases with r, r=5..14 gives heights: at r=14, t=0.667, h=8.5*(0.333)^1.5 = 8.5*0.192 = 1.63. OK above water. At r=5: h = 8.5*(1-0.238)^1.5 = 8.5*0.667=5.67. Good. So r in [5,14] gives 1.6..5.7. All good.

Palm trunk: from the base up ~6-8 units, curved. Build with TubeGeometry:
```ts
const pts: THREE.Vector3[] = [];
for (let j=0;j<=8;j++){ 
  const t=j/8; 
  const bend = 1.6 * t*t;
  pts.push(new THREE.Vector3(base.x + bendDir.x*bend, base.y + t*height, base.z + bendDir.z*bend));
}
const curve = new THREE.CatmullRomCurve3(pts);
const tube = new THREE.TubeGeometry(curve, 16, 0.22, 6, false);
```
Tube radius constant; a slight taper would be nicer but skip. Actually TubeGeometry radius is constant. Use radius 0.2.

But TubeGeometry per palm → 7 geometries; merge them? It's fine (7 draw calls). Actually we could merge using BufferGeometryUtils, but not needed.

Alternatively build the trunk as a CylinderGeometry with a slight bend by displacing vertices... TubeGeometry is easier.

Palm crown: leaves InstancedMesh with 8 leaves per palm, 7 palms → 56 instances.

Also add coconuts? Skip.

Leaf base at the palm's top point (the end of the curve).

Now the leaf instanced mesh: geometry = makeLeafGeometry(), material = MeshStandardMaterial({color: 0x3f8b34, roughness: 0.75, side: THREE.DoubleSide}). castShadow true.

Note: InstancedMesh shadows work.

Store per-instance data:
```ts
interface LeafData { pos: THREE.Vector3; yaw: number; droop: number; scale: number; phase: number; }
```
Compute matrices each frame.

Since the palm tops are static, we can compute base positions once.

Instance count: 56.

Now the boat details.

Boat group:
```ts
const boat = new THREE.Group();
boat.position.set(12, 0, 14);
```
Meshes:
- hull: SphereGeometry(1, 32, 16, 0, Math.PI*2, Math.PI/2, Math.PI/2) → the lower hemisphere (phiStart=0, phiLength=2π, thetaStart=π/2, thetaLength=π/2). Yes: thetaStart π/2 to π gives the bottom half. Scale (0.85, 0.62, 2.0). y offset 0 (the rim at y=0).

But then there's no top; the deck covers it. Add the deck: CircleGeometry(1, 32) rotated -π/2 about X, scaled (0.85,1,2.0) then a slight scale-down (0.95). It'll be a flat ellipse at y = 0.01. Since the hull is a hemisphere open at the top, the deck will show. Note the CircleGeometry after rotateX(-π/2) lies in the XZ plane facing +Y. Good.

Hmm, actually the hull's rim at y=0 is the exact ellipse (0.85, 2.0); the deck scaled 0.95 fits inside. Good.

Colors: hull dark red 0x8f3a2e; deck wood 0xb58a55; cabin 0xf0ece0 with a wood roof; mast wood 0x8a6a45; sail 0xf6f1e2.

- cabin: BoxGeometry(0.9, 0.5, 0.8) at (0, 0.3, -0.4). Plus a roof BoxGeometry(1.0,0.08,0.9) at (0,0.58,-0.4).
- mast: CylinderGeometry(0.045,0.055,3.4) at (0, 1.7, 0.35).
- boom: CylinderGeometry(0.035,0.035,1.5) rotated to lie along z, at (0, 1.0, 0.35-0.75)? Let's place the boom from z=0.35 to z=-1.15 at y=0.9.
- sail: ShapeGeometry as described, attached between the mast and boom.

Let's define the sail shape in local XY where x is the horizontal extent (which maps to -z after rotateY(π/2)) and y is up:
```
shape.moveTo(0, 0.95);
shape.lineTo(0, 3.05);      // luff along the mast (mast top at y=3.4-... mast center 1.7 half 1.7 => top at 3.4)
shape.quadraticCurveTo(1.15, 2.2, 1.4, 1.0); // leech
shape.lineTo(0, 0.95);
```
Hmm, the sail is attached at the mast (x=0) and extends in -z (after rotateY(π/2), x maps to -z). So the sail goes aft (toward -z, the stern) — good for a mainsail. The boom should be at y≈0.95 spanning z from 0.35 to 0.35-1.4 = -1.05.

Then the sail mesh position = (0, 0, mastZ) where mastZ = 0.35. And rotateY(π/2) makes it lie in the YZ plane. Good.

Hmm, wait: shape coordinates: after rotateY(π/2), the shape's x maps to world -z. So x=1.4 → z = -1.4 relative to the mesh position. And the geometry's y stays y. So position the sail at (0, 0, 0.35). At y=0.95..3.05 → the sail spans from the boom to the mast top. Good.

Let's also add a jib (a smaller triangular sail forward)? Skip; we already have 6 meshes.

Boat shadow: castShadow = true on all meshes.

Then per frame:
```ts
const bx = 12 + Math.sin(t*0.15)*1.2;
const bz = 14 + Math.cos(t*0.11)*1.0;
boat.position.x = bx; boat.position.z = bz;
const hc = heightAt(bx, bz, wt);
boat.position.y = hc + 0.25;
const hF = heightAt(bx, bz+2.0, wt), hB = heightAt(bx, bz-2.0, wt);
const hR = heightAt(bx+0.9, bz, wt), hL = heightAt(bx-0.9, bz, wt);
boat.rotation.x = -Math.atan2(hF - hB, 4.0);
boat.rotation.z = Math.atan2(hR - hL, 1.8);
```
Hmm, but the wave slope at 4-unit separation can be large; the pitch will be realistic.

Also should the boat yaw? Keep rotation.y = small drift direction? Keep 0.

Now the shadow camera. sun.position = sunDir * 120. shadow camera ortho left/right ±60, top/bottom ±60, near 1, far 300. The light looks at (0,0,0). The boat at (12,14) and the island radius 21 — the ±60 ortho covers both. Shadow map 2048, bias -0.0005, normalBias 0.02.

With a low sun elevation (25°), long shadows across the island. Good.

Sun target: `sun.target.position.set(0,0,0); scene.add(sun.target);`

Now, does the boat receive shadows? Set receiveShadow on hull/deck.

Let's also add a subtle point of interest: maybe a few rocks? Not required. Keep it focused.

Performance: ocean 66k verts with a 4-wave shader → fine.

Now let me also handle the fog uniform update: since the fog is fixed, pass values once.

Let's write the code now.

```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Waves
// ---------------------------------------------------------------------------
interface WaveDef {
  angle: number;
  wavelength: number;
  amplitude: number;
  speed: number;
  phase: number;
}

const WAVES: WaveDef[] = [
  { angle: 0.15, wavelength: 54, amplitude: 0.42, speed: 1.0, phase: 0.0 },
  { angle: 0.95, wavelength: 32, amplitude: 0.25, speed: 1.0, phase: 1.9 },
  { angle: -0.65, wavelength: 19, amplitude: 0.14, speed: 1.0, phase: 4.2 },
  { angle: 2.2, wavelength: 12, amplitude: 0.065, speed: 1.0, phase: 2.7 },
];
```
Sum of amplitudes = 0.875 → crest to trough 1.75. 

Computed values in TS and GLSL generated from the same numbers. Good.

```ts
const waveData = WAVES.map(w => {
  const k = (2 * Math.PI) / w.wavelength;
  const omega = w.speed * Math.sqrt(9.8 * k);
  const dx = Math.cos(w.angle);
  const dz = Math.sin(w.angle);
  return { amp: w.amplitude, k, omega, dx, dz, phase: w.phase };
});
```

heightAt:
```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of waveData) {
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
  }
  return h;
}
```

GLSL generation:
```ts
const f = (n: number) => n.toFixed(8);
const waveHeightGLSL = `
  float waveHeight(vec2 p, float t) {
    float h = 0.0;
    ${waveData.map(w => `h += ${f(w.amp)} * sin(${f(w.k)} * (${f(w.dx)} * p.x + ${f(w.dz)} * p.y) - ${f(w.omega)} * t + ${f(w.phase)});`).join('\n    ')}
    return h;
  }
  vec2 waveSlope(vec2 p, float t) {
    vec2 s = vec2(0.0);
    ${waveData.map(w => `s += ${f(w.amp*w.k)} * vec2(${f(w.dx)}, ${f(w.dz)}) * cos(${f(w.k)} * (${f(w.dx)} * p.x + ${f(w.dz)} * p.y) - ${f(w.omega)} * t + ${f(w.phase)});`).join('\n    ')}
    return s;
  }
`;
```
Good.

Note that a GLSL function `sin` with a `-` and `+` sequence is fine.

Now the ocean vertex shader:
```glsl
uniform float uTime;
varying vec3 vWorldPos;
${waveHeightGLSL}
void main() {
  vec3 pos = position;
  float h = waveHeight(pos.xz, uTime);
  pos.y += h;
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Note: `modelMatrix` — the ocean is at the origin with no rotation (we rotated the geometry itself). Fine.

Hmm, one issue: the geometry is rotated via geometry.rotateX, so `position` in the shader is already the rotated data (y=0, z=the original plane y). Yes, geometry rotation bakes into the attribute. Good.

Fragment as designed.

For the foam: `h` ranges roughly ±0.875. Crest threshold smoothstep(0.45,0.8,h).

Let's write noise:
```glsl
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
```

Now the sky.

Let me finalize colors:
- horizonColor = new THREE.Color(0xbcd8ef)
- topColor = new THREE.Color(0x2f6bb5)
- sunColor = new THREE.Color(0xfff0d5)

Fog color = horizonColor.

Hmm, with ACES tone mapping at exposure 1.0, the horizon color linear ~ (0.5,0.7,0.88) will tone map to ~ (0.55,0.72,0.85) → looks like a pale blue. Good.

The ocean deep color 0x072a44 → linear (0.0025, 0.024, 0.068)? That's very dark. With tone mapping the water will be nearly black in the shadows. Let's use a brighter deep: 0x0b3a55 → linear ~ (0.005, 0.043, 0.09). Hmm, still dark. Realistic deep water is dark, but for a game look, use a more saturated teal: 0x0e5f7a → linear (0.005, 0.12, 0.19)? Let me compute sRGB 0x0e5f7a = (14,95,122)/255 = (0.055,0.373,0.478) → linear ≈ (0.0045, 0.111, 0.192). Diffuse * (0.35+0.65*diff) gives about (0.002,0.05,0.09) — dark blue-teal. Plus specular and sky reflection. That's fine for deep water.

Shallow: 0x2eb3b8 → linear (0.026, 0.44, 0.46) — bright turquoise. Mixed near the island. Good.

Let's also multiply the body color by a subtle sun-facing factor.

I think it'll look decent.

Now writing the whole file.

Also need to handle: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

Resize handler.

Animation loop with clock delta.

Let's write:

```ts
const clock = new THREE.Clock();
let waveTime = 0;
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  waveTime = elapsed;
  ...
});
```
Note: getDelta and getElapsedTime — getElapsedTime internally calls getDelta and updates oldTime, which would break the delta. Actually, `Clock.getElapsedTime()` calls `this.getDelta()` and adds to elapsedTime. So calling both in the same frame: getDelta() returns the delta and updates oldTime; then getElapsedTime() calls getDelta() again which returns ~0 (since oldTime was just updated), so elapsedTime accumulates correctly but the delta is consumed. Hmm, that means calling getDelta first then getElapsedTime: getDelta returns d (and sets oldTime=now), then getElapsedTime calls getDelta which returns 0 and adds 0 → elapsedTime stays at its previous accumulated value, which was updated... Let's trace: clock.elapsedTime starts 0. Frame: getDelta → diff = now - oldTime, oldTime = now, running true → this.elapsedTime += diff. So getDelta already accumulates elapsedTime! And getElapsedTime returns this.elapsedTime + (running ? getDelta() : 0). So calling getDelta then getElapsedTime returns the correct elapsed. OK — both work. So `const elapsed = clock.getElapsedTime();` after getDelta gives the right value.

Simpler: maintain my own time: `let tPrev = 0; const tNow = performance.now()/1000; const dt = tNow - tPrev;` Actually just use clock.getElapsedTime() once and derive. Let's do:

```ts
const clock = new THREE.Clock();
let waveTime = 0;
const animate = () => {
  const elapsed = clock.getElapsedTime();
  waveTime = elapsed;
  const dt = Math.min(elapsed - lastElapsed, 0.1); // not necessary
  ...
};
```
We don't really need dt except for the palm sway, which uses absolute time anyway. Motion must use delta/elapsed time — using elapsed time satisfies that.

I'll use `const elapsed = clock.getElapsedTime();` and use it everywhere. Good, and no dt needed. But "Motion must use delta/elapsed time, not frame counts" — elapsed qualifies.

Now, __ready after the first render: set a flag `rendered` and after `renderer.render(...)` set `(window as any).__ready = true` if not already.

Let's now write out everything concretely.

```ts
import * as THREE from 'three';

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, window.innerWidth/window.innerHeight, 0.1, 6000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);
```

Wait — "PerspectiveCamera at exactly (35, 12, 35) looking at (0, 2, 0)". Yes.

Fog: `scene.fog = new THREE.Fog(horizonColorHex, 120, 380);` The fog color as a number: 0xbcd8ef. But three's Fog color is converted to linear internally and the built-in materials use `fogColor` uniform (linear). My shader gets `uFogColor` from `new THREE.Color(0xbcd8ef)` → linear. Consistent. 

But wait: for the ocean plane 800x800, the far edge is at 400 from origin; from the camera that's up to ~460. With fog far=380, the whole edge region is fully fogged. Good, and the near edge (400 away in the opposite direction... the camera is at (35,35); the nearest ocean edge is in the +x+z direction at (400,400) → distance sqrt(365²+365²)=516 > 380 fully fogged). Great — no visible edge anywhere. Actually the nearest edge is at 400 in x and 400 in z? The plane spans ±400; the camera at (35,12,35) — the closest point on the boundary is at x=400 (distance 365) or z=400 (distance 365) → more than 380? 365 < 380, slightly not fully fogged. Make the plane 1000x1000 (±500): the closest boundary is 465 away → fully fogged. With 256 segments over 1000 → 3.9 units/quad. Hmm.

Alternatively keep the plane at 800 (±400, near edge 365) and set fog far to 340. Then at 365 it's fully fogged. And fog near 90. The visible water beyond 340 is fog-colored — matching the sky horizon at that direction. The scene's visible water extends at most to the horizon-line-ish. Good: fog(90, 340) on a 800 plane. The 3.1-unit quads. Good.

Hmm, but actually is 340 fog far too aggressive? The island is 21 units radius, the boat at ~19. The whole scene is within ~60 units of the camera, so fog barely affects them (near 90). Water between 90 and 340 fades out. That's a nice haze. OK.

Let's go with ocean 800x800 and fog(0xbcd8ef, 90, 340).

Hmm, but the ocean plane at 800 with 256 segments near the camera: the quads are 3.1 units. The boat is 4 units long; the waves near the boat will have ~1 quad per wave crest for the short waves. Since the shading normal is analytic per-fragment, the surface shading will be smooth even if the geometry is coarse. The main issue is the silhouette near the boat — the waterline. It's acceptable.

Actually — the boat sits at heightAt(x,z) + offset; if the geometry is coarse, the boat may float or sink a bit visually. Since heightAt is exact and the vertex displacement uses the same function at 3.1-unit spacing, the interpolated surface can deviate from the analytic height by up to ~0.1 units for the shortest wave (amplitude 0.065, wavelength 12 → over 3.1 units, that's a quarter-wavelength → could deviate ±0.06). Fine.

Let's just use 256 segments over 700 units (2.73 units/quad): edges at ±350, nearest boundary 315 from camera — less than fog far 340, slightly visible... ugh. Use fog far 300 and plane 700. Then at 315 it's fully fogged. fog(80, 300). Good. 2.73 units/quad.

Hmm, the requirement says at least 400x400 units centered at the origin — 700x700 satisfies.

Decision: PlaneGeometry(700, 700, 256, 256), fog(0xbcd8ef, 80, 300).

Wait, 256 segments for a 700-unit plane = 2.73 units. OK.

Now let's consider the visible horizon: with fog far 300, water beyond 300 units from the camera is sky-colored; that's where the "horizon" is. The real horizon (the geometric edge) is at 315+ units in some directions but fully fogged. Good.

Now writing the full ocean shader with fog.

Let's write out the code.

```ts
const horizonColor = new THREE.Color(0xbcd8ef);
```

Fog color for scene.fog: pass `horizonColor.getHex()`? No — THREE.Fog(color) takes a hex or Color; it converts to Color (with color management, a hex gets converted to linear working space). If I pass the Color object directly, it copies it. So `new THREE.Fog(horizonColor.getHex(), 80, 300)` — getHex returns the sRGB hex (converts back from linear), so passing it back re-converts. Cleaner: `new THREE.Fog(horizonColor, 80, 300)` — the Fog constructor: `this.color = new Color(color);` and `new Color(colorInstance)` copies the values directly (setRGB? Actually `Color.set(value)` for a Color does `this.copy(value)` — no conversion). Good. So pass the Color instance.

Hmm, does `new THREE.Fog(0xbcd8ef, ...)` handle color space? `Color.setHex` with SRGBColorSpace converts to linear if color management is enabled. And passing a Color instance copies the already-linear values. Both give the same result. Fine.

Now, sun direction vector:

```ts
const sunDir = new THREE.Vector3();
const elevation = 27, azimuth = 200;
const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);
sunDir.setFromSphericalCoords(1, phi, theta);
```

Directional light:
```ts
const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
sun.position.copy(sunDir).multiplyScalar(120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55; right = 55; top = 55; bottom = -55; near = 10; far = 320;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.05;
scene.add(sun);
scene.add(sun.target);
```
Note: the shadow camera must cover the island and boat: from -55..55 around the origin. The light direction is at position sunDir*120 → the ortho camera is centered on the light's target (origin) with those extents. Good.

Hemisphere light: `new THREE.HemisphereLight(0xbcd8ef, 0x3a4a2a, 0.8)`.

Wait, with the r155+ lighting changes: HemisphereLight intensity ~1.5 and DirectionalLight ~2-3 look reasonable with ACES. Let's do hemi 1.0, sun 2.6.

Sky dome:

```ts
const skyGeo = new THREE.SphereGeometry(4000, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDir.clone() },
    uTopColor: { value: topColor },
    uHorizonColor: { value: horizonColor },
    uSunColor: { value: sunColor },
  },
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: ...,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,  // hmm
});
```
With depthTest false and renderOrder -1, the sky is drawn first and everything draws over it. That's the classic skybox approach. But depthWrite=false and depthTest=false means the sky is always drawn (drawn first, so it's fine). Set `sky.renderOrder = -1000` and `frustumCulled = false`.

Actually if depthTest is false and the sky is rendered first, everything else covers it. Good.

Also set `sky.position.copy(camera.position)` each frame so it's centered on the camera. Then vDir = position (local) is the correct direction. 

Sky fragment:
```glsl
varying vec3 vDir;
uniform vec3 uSunDir, uTopColor, uHorizonColor, uSunColor;
void main() {
  vec3 d = normalize(vDir);
  float y = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizonColor, uTopColor, pow(y, 0.55));
  col = mix(col, uHorizonColor * 0.92, smoothstep(0.0, -0.25, d.y));
  vec3 s = normalize(uSunDir);
  float sd = max(dot(d, s), 0.0);
  col += uSunColor * pow(sd, 2200.0) * 8.0;
  col += uSunColor * pow(sd, 90.0) * 0.6;
  col += uSunColor * pow(sd, 8.0) * 0.18;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Careful: `pow(sd, 2200.0)` with sd up to 1 — fine.

Note: mix with horizonColor*0.92 below the horizon — since the ocean covers it, it doesn't matter much.

Now the ocean material's sun direction uniform = sunDir (normalized). Fresnel sky reflection uses horizon/top colors.

OK, now let's write the island.

```ts
const islandGroup = new THREE.Group(); // actually the mesh itself
```
Expose __island as the mesh.

Build geometry:

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.sqrt(x*x + z*z);
  const R = 21;
  let h: number;
  if (r <= R) {
    const t = r / R;
    h = 8.6 * Math.pow(1 - t, 1.6);
  } else {
    const t = (r - R) / (R * 0.35);
    h = -5.0 * Math.min(1, t) - 0.5*t;
  }
  const n = Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.19 - 0.7) * 1.7
          + Math.sin(x * 0.53 - 0.4) * Math.sin(z * 0.47 + 2.1) * 0.75
          + Math.sin(x * 1.05 + z * 0.92) * 0.28;
  const fade = Math.min(1, Math.max(0, (R * 1.05 - r) / 8));
  h += n * fade * 0.75;
  return h;
}
```
At r=0: h = 8.6, n = sin(1.3)*cos(-0.7)*1.7 + sin(-0.4)*sin(2.1)*0.75 + 0 ≈ 0.9636*0.7648*1.7 + (-0.3894)(0.8632)*0.75 = 1.253 - 0.252 = 1.0 → h ≈ 8.6 + 0.75 = 9.35. Good.

At r=21 (t=1): h=0 + noise*fade where fade = (22.05-21)/8 = 0.13 → tiny. So the shoreline at ~0. Good.

Rmax for the mesh: r = 21 * 1.35 = 28.35 → h = -5*1 -0.5 ≈ -5.5 at r=28.35 (t = (28.35-21)/(21*0.35)=7.35/7.35=1 → h=-5-0.5=-5.5). Underwater. Good.

Mesh rings: 64 rings, 128 segments. r from 0 to 28.35 with a slight non-linear bias (more resolution near the shore? uniform is fine: 28.35/64 = 0.44 per ring).

Actually let's use rings = 72, segs = 144 for smoothness. 72*144 = 10368 verts. Fine.

Build:
```ts
const positions: number[] = [];
const colors: number[] = [];
const indices: number[] = [];

// center vertex
positions.push(0, islandHeight(0,0), 0);
colors.push(...colorAt(0, islandHeight(0,0)));

for (let i = 1; i <= rings; i++) {
  const r = (i / rings) * rMax;
  for (let j = 0; j < segs; j++) {
    const a = (j / segs) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = islandHeight(x, z);
    positions.push(x, y, z);
    const c = islandColor(x, y, z);
    colors.push(c.r, c.g, c.b);
  }
}
```
Indexing: center = 0. Ring i vertex j = 1 + (i-1)*segs + j.

Triangles:
- center fan to ring 1: (0, v(1,j), v(1,(j+1)%segs)) — winding must be CCW when viewed from above (+y). For a point at angle a, the position is (cos a, 0, sin a). Viewed from above (looking down -y), the x-axis right and z... hmm. Let's think: we want the normal to be +y. Triangle with vertices A=(0,y,0), B=(cos a,0,sin a)*r, C=(cos(a+da),0,sin(a+da))*r. The cross product (B-A)×(C-A) should be +y. With a=0: B=(r,0,0), C≈(r,0,r*da). (B-A)×(C-A) = (r,0,0)×(r,0,r*da) = (0*r*da - 0*0, 0*r - r*r*da, 0 - 0) = (0, -r²da, 0). That's -y. So the winding (0, B, C) gives a downward normal. We want (0, C, B). So indices should be (0, C, B) i.e. (0, v(1,j+1), v(1,j)).

Similarly for ring quads: quad between ring i (inner) and ring i+1 (outer):
inner j, inner j+1, outer j, outer j+1. To get a +y normal: going around, the order should be counterclockwise when viewed from above. Viewed from above with x right and z down (screen), a counterclockwise loop in the xz-plane... Let's just compute: use the same pattern as the fan. Triangle (inner_j, outer_j+1, outer_j)? Let's derive: for a flat annulus at y=0, the correct +y normal ordering for a quad (inner_j, inner_j+1, outer_j+1, outer_j) — check with a=0, da small, r1 inner, r2 outer:
inner_j = (r1, 0, 0); inner_j+1 = (r1 cos da, 0, r1 sin da) ≈ (r1, 0, r1 da); outer_j = (r2,0,0); outer_j+1 ≈ (r2,0,r2 da).
Take triangle A=inner_j, B=inner_j+1, C=outer_j+1: (B-A) = (0,0,r1 da); (C-A) = (r2-r1, 0, r2 da). Cross = (B-A)×(C-A) = (0*0 - r1da*0, r1da*(r2-r1) - 0*r2da, 0 - 0) = (0, r1 da (r2-r1), 0) → +y. So the triangle (inner_j, inner_j+1, outer_j+1) is correct (+y). And the second triangle (inner_j, outer_j+1, outer_j): A=inner_j, B=outer_j+1, C=outer_j: (B-A)=(r2-r1,0,r2da), (C-A)=(r2-r1,0,0). Cross = ((0)(0)-(r2da)(0), (r2da)(r2-r1)-(r2-r1)(0), 0-0) = (0, r2da(r2-r1), 0) → +y. 

So indices for each quad: (a=inner_j, b=inner_j+1, c=outer_j+1) and (a, c, outer_j).

And for the fan: (0, v(1,j+1), v(1,j)) — check consistency with the quad formula: treat the center as "inner". inner=center, inner_j=center, outer_j=v(1,j), outer_j+1=v(1,j+1). Then triangle (center, center, v1_j+1) is degenerate; the other one (center, v1_j+1, v1_j) matches "(a, c, outer_j)". Yes, so the fan triangle is (0, v(1,j+1), v(1,j)). Good.

Then `geometry.computeVertexNormals()`.

Hmm, but the island mesh will have a hole? No, the fan covers the center.

Vertex colors: I'll write a function `islandColor(x, y, z, target)`.

Let's define a palette with some variation:
```ts
function islandColor(x: number, y: number, z: number): THREE.Color {
  const c = new THREE.Color();
  const wet = new THREE.Color(0xa89a72);   // wet sand
  const sand = new THREE.Color(0xe8d9a8);
  const grass = new THREE.Color(0x4e7f36);
  const darkGrass = new THREE.Color(0x2f5a26);
  const rock = new THREE.Color(0x7c7266);
  const t1 = smoothstep(-2.0, 0.4, y);    // wet -> dry
  const t2 = smoothstep(1.0, 2.6, y);     // sand -> grass
  const t3 = smoothstep(5.5, 8.5, y);     // grass -> rock
  c.copy(wet).lerp(sand, t1);
  c.lerp(grass, t2);
  c.lerp(rock, t3);
  // variation
  const v = 0.9 + 0.2 * (0.5 + 0.5*Math.sin(x*1.7 + z*2.3));
  c.multiplyScalar(v);
  return c;
}
```
Allocating Colors per vertex (10k) is fine at init.

smoothstep helper.

Note: `THREE.Color.multiplyScalar` may exceed 1; clamp via `c.r = Math.min(1, ...)`. Eh, fine.

Now the palms.

```ts
interface PalmInfo { base: THREE.Vector3; top: THREE.Vector3; }
```
Build trunk curves.

```ts
const palmBases: {x:number,z:number}[] = [];
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2 + 0.55;
  const r = 6.5 + rnd() * 7.0;
  palmBases.push({ x: Math.cos(a)*r, z: Math.sin(a)*r });
}
```
r in [6.5, 13.5] → island height at r=13.5: t=0.643, h=8.6*(0.357)^1.6 = 8.6*0.19 = 1.63 + noise. Positive. Good.

For each palm:
```ts
const bx = p.x, bz = p.z;
const by = islandHeight(bx, bz);
const height = 5.5 + rnd()*2.0;
const bendAng = rnd()*Math.PI*2;
const bend = 1.2 + rnd()*0.9;
const pts: THREE.Vector3[] = [];
for (let j = 0; j <= 10; j++) {
  const t = j/10;
  const curve = bend * t * t;
  pts.push(new THREE.Vector3(bx + Math.cos(bendAng)*curve, by + height*t, bz + Math.sin(bendAng)*curve));
}
const curve = new THREE.CatmullRomCurve3(pts);
const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.22, 6, false);
```
Hmm, TubeGeometry radius 0.22 constant. To make a taper, I could scale... skip. Actually, I can make the trunk look better by using a slight taper: modify the tube geometry's vertices radially? Not worth it. Use radius 0.2.

Also the trunk should be visible against the sand: color 0x8a6b46.

Add the trunk mesh to the island group with castShadow.

Leaf positions at the palm top: `top = pts[10]`.

Crown: 9 leaves per palm.

Leaf data:
```ts
interface LeafInstance { pos: THREE.Vector3; yaw: number; droop: number; scale: number; phase: number; }
```
For each palm, for k in 0..8:
yaw = (k/9)*2π + rnd()*0.3; droop = 0.55 + rnd()*0.5 (radians below horizontal); scale = 0.9 + rnd()*0.35; phase = rnd()*Math.PI*2.

Actually leaves droop: rotateX with a positive angle tilts the leaf toward +z, i.e., outward after yaw. droop from 0.4 (near horizontal) to 1.2 (drooping). Let's use 0.35 + rnd()*0.6.

The leaf geometry: length 2.6, so a palm crown has leaves extending 2.6 units. With scale ~1 that's fine in proportion to a 6-unit trunk.

Total instances = 8 palms × 9 = 72. Good (>=30).

Now, the sway: each frame
```ts
for (let i = 0; i < leafData.length; i++) {
  const L = leafData[i];
  const sway = Math.sin(elapsed * 1.6 + L.phase) * 0.18 + Math.sin(elapsed * 2.7 + L.phase * 1.9) * 0.07;
  dummy.position.copy(L.pos);
  dummy.rotation.set(0, 0, 0);
  dummy.rotation.order = 'YXZ';
  dummy.rotation.y = L.yaw + sway * 0.5;
  dummy.rotation.x = L.droop + sway;
  dummy.scale.setScalar(L.scale);
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
leaves.instanceMatrix.needsUpdate = true;
```
Note `dummy.rotation.set(0,0,0)` then setting .y/.x directly is fine.

Hmm — Euler order must be set once, not each frame. `dummy.rotation.order = 'YXZ'` set once outside the loop. Fine.

Also we need `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.

The InstancedMesh must be added to the scene (or the island group). Its instance matrices are in world space (since the palm tops are computed in world coords and the island group is at the origin). If I add the leaves to the island group at the origin, world = local. Fine.

Careful: the island mesh is separate; the group contains trunks and the leaves InstancedMesh. `__island` should be exposed as the island mesh or group. Let's create an `islandGroup` containing the terrain mesh, the trunks, and the leaves, and expose the group. But the terrain mesh itself should be exposed too? The requirement: "Expose the island (Mesh or Group) as __island; it receives shadows." Exposing the group is fine; but "it receives shadows" — set receiveShadow on the terrain mesh. I'll expose the terrain mesh as __island (it's a Mesh and receives shadows) and add everything to a group for organization. Actually let's just expose the terrain mesh and put everything in the scene directly. Simpler.

Hmm, but the island group with the palm trunks: if the trunk meshes are in the scene at world positions, that's fine.

Let's put the terrain mesh, trunk meshes, leaves in `islandGroup` (a Group at origin), add islandGroup to the scene, and set `(window as any).__island = terrainMesh;` — a Mesh that receives shadows. Good.

Now the boat. Let me write:

```ts
const boat = new THREE.Group();
boat.position.set(12, 0, 14);

const hullMat = new THREE.MeshStandardMaterial({ color: 0x9e3d2e, roughness: 0.45, metalness: 0.15 });
const hullGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI*2, Math.PI*0.5, Math.PI*0.5);
hullGeo.scale(0.85, 0.62, 2.0);
const hull = new THREE.Mesh(hullGeo, hullMat);
```
Wait: SphereGeometry(radius, widthSeg, heightSeg, phiStart, phiLength, thetaStart, thetaLength). thetaStart=π/2, thetaLength=π/2 gives the bottom half (theta measured from +y). Yes.

The hull's rim is at y=0, radius scale (0.85, 2.0) in x/z. The bottom at y=-0.62.

- deck: CircleGeometry(1, 48) rotated -π/2 → in XZ, facing +y. Scale (0.82, 1, 1.92) via geometry.scale(0.82,1,1.92) after rotateX. Position y = 0.01.

Hmm, the CircleGeometry rotated -PI/2 about X: the circle in XY becomes XZ. Then scale (0.82,1,1.92)? After rotation, the geometry has x and z; scaling y by 1 doesn't matter. So `deck.scale.set(0.82, 1, 1.92)` on the mesh. But the mesh is a part of the boat group; scaling the mesh is fine.

Actually simpler: create the geometry, rotateX(-π/2), then geometry.scale(0.82, 1, 1.92).

- cabin: BoxGeometry(0.95, 0.5, 0.85), position (0, 0.28, -0.45). Material white 0xece7db, roughness 0.6.
- cabin roof: BoxGeometry(1.05, 0.08, 0.95), pos (0, 0.55, -0.45), wood color.
- mast: CylinderGeometry(0.04, 0.055, 3.3, 8), pos (0, 1.65, 0.35), wood.
- boom: CylinderGeometry(0.035, 0.035, 1.45, 6), rotate to lie along z: rotateX(π/2), pos (0, 1.0, 0.35 - 0.72) → z=-0.37? Let's set the boom from z=0.35 to z=-1.05, center z=-0.35, length 1.4. So position (0, 1.0, -0.35) with rotateX(π/2).
- sail: shape geometry as described, positioned at (0, 0, 0.35), rotateY(π/2).

Sail shape: 
```ts
const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0.98);
sailShape.lineTo(0, 3.15);
sailShape.quadraticCurveTo(1.05, 2.3, 1.35, 1.05);
sailShape.lineTo(0, 0.98);
```
Hmm, the mast top is at y = 1.65+1.65 = 3.3. So the sail head at 3.15 is just below. Good. The boom is at y=1.0, and the sail foot at 0.98. Good.

The sail extends to x=1.35 → after rotateY(π/2) it goes to z=-1.35 relative to the mast at z=0.35 → z=-1.0. Good, within the boat (length 4 → ±2).

Sail material: MeshStandardMaterial({color: 0xf7f2e4, roughness: 0.85, side: THREE.DoubleSide}).

All meshes castShadow = true; hull and deck receiveShadow = true.

Then the boat is added to the scene.

Now let's verify the boat is "about 4 units long": hull scale z = 2.0 → 4 units long. Good.

Now shadow casting for the boat: it's at (12,14), within the shadow camera bounds (±55). Good.

Let's also check the sun elevation 27° means the shadows are long; that's fine.

Now, does the island block the sun? Backlit. The camera sees the shadowed side of the island. Hmm, that might make the island dark. The hemisphere light will fill it. Let's raise the hemisphere intensity to 1.2 and add a small ambient of 0.2.

Actually, sun azimuth 200° and camera at (35,35) → the camera is at azimuth... the camera is in the +x+z quadrant (azimuth ~45° in the xz-plane measured from... whichever). The sun at azimuth 200° is in roughly the -x,-z direction (from the camera's viewpoint it's in front). So the island's camera-facing side (the +x+z side) is in shadow. Combined with the ocean being dark, this could look moody. It'll still look good with the fill light and the sun glitter behind.

Alternatively, put the sun at azimuth 130°: x = sinφ sinθ = 0.906*0.766 = 0.694, z = 0.906*cos(130°) = 0.906*(-0.643) = -0.583, y = cos(65°)=0.42. So the sun is at +x, -z — to the right of the camera. The camera looks toward -x,-z. The angle between the sun and forward (-0.698,-0.199,-0.698): dot = -0.485 - 0.084 + 0.407 = -0.16 → 99°, behind. Not visible.

The sun should be in front of the camera for visibility → azimuth between ~150° and ~250°. Front-lit vs. visible sun conflict. Backlit with a low sun looks dramatic and pretty (the glitter path). Let's do azimuth 225° with elevation 22°:
x = sin(68°)=0.927 * sin(225°)=-0.707 → -0.655; z = 0.927*(-0.707) = -0.655; y = cos(68°) = 0.375.
The sun is directly in the -x,-z direction at 22° elevation. The camera forward is (-0.698,-0.199,-0.698) at -11.4° elevation. The sun is exactly opposite in azimuth and 33° higher in elevation. Angle between: dot = 0.457 - 0.075 + 0.457 = 0.839 → 33°. Within the frame (corner angle 49°). Great — a sun near the top of the frame, straight ahead, backlighting the island with a golden glitter path on the water. This is the money shot.

But then the island is entirely backlit and dark. Add stronger ambient/hemisphere fill and maybe raise the sun a bit to 28° elevation and shift azimuth to 210° so the island gets some side light.

Let's compute with elevation 30°, azimuth 215°:
φ = 60°, sinφ = 0.866; sinθ = sin(215°) = -0.574, cosθ = -0.819.
x = -0.497, y = 0.5, z = -0.709.
Angle from forward (-0.698,-0.199,-0.698): dot = 0.347 - 0.0995 + 0.495 = 0.742 → 42°. Still within the corner (49°) but near the edge. The sun would be visible in the upper-left/upper-right corner of the frame. Hmm, which corner? The camera is at (35,12,35) looking at the origin, up is +y. The camera's right vector = normalize(cross(forward, up))... forward = (-0.698,-0.199,-0.698). up=(0,1,0). right = forward × up? Three's camera right = normalize(cross(up, -forward))... let's compute right = normalize(cross(forward, up))? For a right-handed system with the camera looking along -Z_local, right = X_local. X = up × (-forward)... Let's do: forward f = (-0.698,-0.199,-0.698); right r = normalize(f × up) = f × (0,1,0) = (f.y*0 - f.z*1, f.z*0 - f.x*0, f.x*1 - f.y*0) = (-f.z, 0, f.x) = (0.698, 0, -0