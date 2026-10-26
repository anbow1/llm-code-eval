# DeepSeek-V4.1-Flash-1017-Maya-S-SCENE

- Date: 2026-10-26 12:05
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 28.2 min (generation 27.9 min)
- Tokens: 43371 total, 32793 of them thinking
- Speed: 26.0 tok/s decode, first token after 8.2 s on average
- Peak VRAM: 31.4 GB | Peak RAM: 161.6 GB (at start 160.5 GB) | Disk read: 6.3 GB
- Tasks: 1/1 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 90.5% |
| **Overall** | **90.5%** |
| Only tasks it finished | 90.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| s1_ocean_island | 90% | ok | 1673.7 | 43371 | 32793 | 26.0 |

## s1_ocean_island — 90%
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
- PASS sky_gradient
- FAIL water_animates
- PASS picture_rich
- PASS resize
- FAIL no_console_errors
  - note: console.error: THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false

Material Name: 
Material Type: ShaderMaterial

Program Info Log: Vertex shader is not compiled.
VERTEX

ERROR: 0:94: 'z' : vector field selection out of range
ERROR: 0:108: 'z' : vector field selection out of range
ERROR: 0:122: 'z' : vector field selection out of range
ERROR: 0:136: 'z' : vector field selection out of range
ERROR: 0:150: 'z' : vector field selection out of range

  89:       float a = 0.400000;
  90:       float c = cos(f);
  91:       float s = sin(f);
  92:       h += a * s;
  93:       disp.x += 0.4200 * a * d.x * c;
> 94:       disp.z += 0.4200 * a * d.y * c;
  95:       grad.x += a * k * d.x * c;
  96:       grad.y += a * k * d.y * c;
  97:     }
  98:     {
  99:       float k = 0.299199;
  100:       float om = 1.713227;

## Re-graded 2026-10-26

A test was fixed after this run; the saved answers were graded again: s1_ocean_island 90% -> 83%. New overall: 82.6%.

## Re-graded 2026-10-26

A test was fixed after this run; the saved answers were graded again: s1_ocean_island 83% -> 87%. New overall: 87.0%.
