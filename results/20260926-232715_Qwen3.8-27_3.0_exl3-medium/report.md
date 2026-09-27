# Qwen3.8-27_3.0_exl3-medium

- Date: 2026-09-26 23:41
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 13.8 min (generation 13.4 min)
- Tokens: 35443 total, 29214 of them thinking
- Speed: 86.8 tok/s decode, first token after 3.1 s on average
- Peak VRAM: 15.5 GB | Peak RAM: 17.1 GB (at start 13.4 GB) | Disk read: 0.2 GB
- Tasks: 9/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 72.2% |
| TypeScript + Three.js | 95.0% |
| **Overall** | **83.6%** |
| Only tasks it finished | 95.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 15.0 | 1283 | 868 | 105.9 |
| p1_parse_duration | 89% | ok | 28.7 | 2165 | 1936 | 93.5 |
| t2_solar | 100% | ok | 34.8 | 3250 | 2158 | 101.6 |
| p2_sliding_median | 0% | no_answer | 501.4 | 13047~ | 13047 | 26.2 |
| t3_instanced_wave | 100% | ok | 29.5 | 2744 | 1718 | 102.9 |
| p3_topo_order | 100% | ok | 24.4 | 2005 | 1826 | 92.2 |
| t4_shader_water | 70% | ok | 25.6 | 2322 | 1438 | 101.8 |
| p4_gather_limited | 100% | ok | 91.5 | 3709 | 3607 | 41.8 |
| t5_raycast_click | 100% | ok | 18.1 | 1551 | 716 | 102.3 |
| t6_terrain | 100% | ok | 36.8 | 3367 | 1900 | 99.6 |

## t1_cube — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS box_geometry
- PASS standard_material
- PASS ambient_light
- PASS directional_light
- PASS cube_rotates
- PASS picture_animates
- PASS resize
- PASS no_console_errors

## p1_parse_duration — 89%
- FAIL valid '1h30m'
- PASS valid '2d'
- PASS valid '45s'
- PASS valid '1d 2h 3m 4s'
- PASS valid '0s'
- PASS valid '90m'
- PASS valid '  1h  '
- FAIL valid '1d4s'
- PASS valid '1h   30m'
- FAIL valid '10d23h59m59s'
- PASS invalid ''
- PASS invalid '   '
- PASS invalid '1x'
- PASS invalid '30m1h'
- PASS invalid '1h1h'
- PASS invalid 'h'
- PASS invalid '1.5h'
- PASS invalid '-1h'
- PASS invalid '+1h'
- PASS invalid '1H'
- PASS invalid '1h30'
- PASS invalid '1 h'
- PASS invalid '1h,30m'
- PASS invalid 'abc'
- PASS invalid '1d2d'
- PASS invalid '5'
- PASS invalid '1s2m'
  - note: valid '1h30m': ValueError: Invalid duration string: '1h30m'
  - note: valid '1d4s': ValueError: Invalid duration string: '1d4s'
  - note: valid '10d23h59m59s': ValueError: Invalid duration string: '10d23h59m59s'

## t2_solar — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS at_least_5_meshes
- PASS sun_basic_or_emissive
- PASS point_light
- PASS 4_bodies_move
- PASS moon_child_of_planet
- PASS 3_different_speeds
- PASS resize
- PASS no_console_errors

## p2_sliding_median — 0%
- FAIL example odd k
- FAIL even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- FAIL invalid k
- FAIL performance 200k/1000
  - note: model stopped inside its thinking and never wrote an answer
  - note: example odd k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: even k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: k=1 and k=n: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: duplicates: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: random vs brute force: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: invalid k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: performance 200k/1000: AttributeError: module 'solution' has no attribute 'sliding_median'

## t3_instanced_wave — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS instanced_mesh
- PASS count_10000
- PASS instance_colors
- PASS few_plain_meshes
- PASS wave_animates
- PASS picture_animates
- PASS resize
- PASS no_console_errors

## p3_topo_order — 100%
- PASS empty / no edges
- PASS lexicographic
- PASS duplicate edges
- PASS cycles
- PASS random vs brute force
- PASS performance 200k/400k

## t4_shader_water — 70%
- PASS compiles_strict
- PASS loads
- FAIL renders
- PASS shader_material
- PASS uTime_uniform
- PASS uTime_advances
- PASS plane_128_segments
- FAIL picture_animates
- PASS resize
- FAIL no_console_errors
  - note: console.error: THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false

Material Name: 
Material Type: ShaderMaterial

Program Info Log: Vertex shader is not compiled.
VERTEX

ERROR: 0:81: 'assign' : l-value required (can't modify an input "position")

  76:   float wave2 = cos(position.y * 1.2 + uTime * 1.5) * 0.25;
  77:   float wave3 = sin((position.x + position.y) * 0.8 + uTime * 1.0) * 0.20;
  78:   float wave4 = sin(length(position.xy) * 2.0 - uTime * 3.0) * 0.10;
  79: 
  80:   float height = wave1 + wave2 + wave3 + wave4;
> 81:   position.z += height;
  82: 
  83:   vHeight = height;
  84:   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  85: }
  86: 


## p4_gather_limited — 100%
- PASS results in order
- PASS respects limit
- PASS sliding window, not batches
- PASS error: cancel + stop
- PASS edge cases

## t5_raycast_click — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS 25_cubes
- PASS own_materials
- PASS start_color_4488ff
- PASS click_selects
- PASS single_selection
- PASS background_clears
- PASS resize
- PASS no_console_errors

## t6_terrain — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS custom_buffer_geometry
- PASS indexed
- PASS normals_point_up
- PASS vertex_colors
- PASS has_height
- PASS orbit_controls
- PASS lights
- PASS resize
- PASS no_console_errors
