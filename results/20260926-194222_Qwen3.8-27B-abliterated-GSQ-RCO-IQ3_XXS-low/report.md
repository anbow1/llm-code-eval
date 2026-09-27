# Qwen3.8-27B-abliterated-GSQ-RCO-IQ3_XXS-low

- Date: 2026-09-26 19:52
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 10.6 min (generation 10.0 min)
- Tokens: 45022 total, 37403 of them thinking
- Speed: 81.1 tok/s decode, first token after 2.6 s on average
- Peak VRAM: 15.1 GB | Peak RAM: 27.0 GB (at start 22.9 GB) | Disk read: 0.2 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 89.3% |
| TypeScript + Three.js | 83.3% |
| **Overall** | **86.3%** |
| Only tasks it finished | 85.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 16.6 | 1315 | 803 | 94.5 |
| p1_parse_duration | 100% | ok | 48.5 | 3438 | 3192 | 74.9 |
| t2_solar | 100% | ok | 56.4 | 4203 | 3066 | 78.1 |
| p2_sliding_median | 57% | ok | 141.3 | 10798 | 9752 | 77.9 |
| t3_instanced_wave | 100% | ok | 35.3 | 2710 | 1775 | 82.9 |
| p3_topo_order | 100% | ok | 21.8 | 1409 | 1156 | 73.1 |
| t4_shader_water | 100% | ok | 24.8 | 1867 | 958 | 84.4 |
| p4_gather_limited | 100% | ok | 145.9 | 10567 | 10270 | 73.7 |
| t5_raycast_click | 100% | ok | 42.9 | 3468 | 2650 | 86.5 |
| t6_terrain | 0% | ok | 64.1 | 5247 | 3781 | 85.3 |

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

## p1_parse_duration — 100%
- PASS valid '1h30m'
- PASS valid '2d'
- PASS valid '45s'
- PASS valid '1d 2h 3m 4s'
- PASS valid '0s'
- PASS valid '90m'
- PASS valid '  1h  '
- PASS valid '1d4s'
- PASS valid '1h   30m'
- PASS valid '10d23h59m59s'
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

## p2_sliding_median — 57%
- PASS example odd k
- FAIL even k
- PASS k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: even k: AssertionError: [1.5, 2.5, 3.0]
  - note: duplicates: AssertionError: 
  - note: random vs brute force: AssertionError: ([6, -9, 3, 15, 3, -15, 8, 12, -14, -10, 13, 5, 3, 11, -19, 10, -18, -1, 19, 17, 17, 5, -10, -10, 12, -6, -20, -8, 14, 15, -6, 5, 12, 2, 16, 2, 9, -3, 15, 18, -20, 4, 12, -12, 13, 15, -7, 7], 26)

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

## t4_shader_water — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS shader_material
- PASS uTime_uniform
- PASS uTime_advances
- PASS plane_128_segments
- PASS picture_animates
- PASS resize
- PASS no_console_errors

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

## t6_terrain — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: src/t6_terrain.ts(22,36): error TS2339: Property 'canvas' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'.
