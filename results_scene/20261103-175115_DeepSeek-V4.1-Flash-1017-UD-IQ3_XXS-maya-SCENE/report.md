# DeepSeek-V4.1-Flash-1017-UD-IQ3_XXS-maya-SCENE

- Date: 2026-11-03 18:46
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 55.2 min (generation 54.8 min)
- Tokens: 56531 total, 46657 of them thinking
- Speed: 17.7 tok/s decode, first token after 97.9 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 191.0 GB (at start 189.9 GB) | Disk read: 380.7 GB
- Tasks: 1/1 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 82.6% |
| **Overall** | **82.6%** |
| Only tasks it finished | 82.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| s1_ocean_island | 83% | ok | 3286.6 | 56531 | 46657 | 17.7 |

## s1_ocean_island — 83%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS ocean_api
- PASS waves_move
- PASS waves_visible
- PASS boat_floats
- PASS boat_tilts
- PASS boat_built
- PASS boat_casts_shadow
- PASS palm_leaves
- PASS leaves_sway
- PASS island
- PASS shadows
- PASS fog_and_tone_mapping
- PASS camera_view
- FAIL sky_gradient
- FAIL water_animates
- PASS picture_rich
- PASS water_visible
- FAIL island_lit
- PASS resize
- FAIL no_console_errors
  - note: console.error: THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false

Material Name: 
Material Type: ShaderMaterial

Program Info Log: Fragment shader is not compiled.

FRAGMENT

ERROR: 0:169: 'RRTAndODTFit' : function already has a body

  164:     uniform vec3 uGround;
  165:     uniform vec3 uSunColor;
  166:     uniform float uExposure;
  167:     varying vec3 vDir;
  168:     
> 169: vec3 RRTAndODTFit(vec3 v) {
  170:   vec3 a = v * (v + 0.0245786) - 0.000090537;
  171:   vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  172:   return a / b;
  173: }
  174: vec3 acesTone(vec3 color, float exposure) {
  175:   const mat3 IN = mat3(
  - note: console.error: THREE.WebGLProgram: Shader Error 1282 - VALIDATE_STATUS false

Material Name: 
Material Type: ShaderMaterial

Program Info Log: Fragment shader is not compiled.

FRAGMENT

ERROR: 0:180: 'RRTAndODTFit' : function already has a body

  175:   varying vec3 vNormalW;
  176:   varying float vHeight;
  177:   varying vec2 vXZ;
  178: 
  179:   
> 180: vec3 RRTAndODTFit(vec3 v) {
  181:   vec3 a = v * (v + 0.0245786) - 0.000090537;
  182:   vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  183:   return a / b;
  184: }
  185: vec3 acesTone(vec3 color, float exposure) {
  186:   const mat3 IN = mat3(
