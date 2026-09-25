# qwen-exl3-5.05

- Date: 2026-09-25 15:14
- Model: Qwen38-exl3-505
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default)
- Total time: 84.7 min (generation 84.4 min)
- Tokens: 53621 total, 51401 of them thinking
- Speed: 18.5 tok/s decode, first token after 4.2 s on average
- Peak VRAM: 29.4 GB | Peak RAM: 83.3 GB (at start 77.9 GB) | Disk read: 28.6 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 75.0% |
| TypeScript + Three.js | 83.3% |
| **Overall** | **79.2%** |
| Only tasks it finished | 80.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 53.7 | 1348 | 985 | 27.7 |
| p1_parse_duration | 0% | ok | 281.3 | 7872 | 7872 | 28.4 |
| t2_solar | 100% | ok | 838.9 | 6901 | 6705 | 8.3 |
| p2_sliding_median | 100% | ok | 1241.5 | 8054 | 7945 | 6.5 |
| t3_instanced_wave | 100% | ok | 273.2 | 8896 | 8244 | 33.2 |
| p3_topo_order | 100% | ok | 328.5 | 4506 | 4444 | 13.9 |
| t4_shader_water | 100% | ok | 124.6 | 4252 | 3698 | 35.1 |
| p4_gather_limited | 100% | ok | 1487.9 | 5936 | 5897 | 4.0 |
| t5_raycast_click | 100% | ok | 318.7 | 4340 | 4095 | 13.9 |
| t6_terrain | 0% | ok | 115.3 | 1516~ | 1516 | 13.6 |

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

## p1_parse_duration — 0%
- FAIL valid '1h30m'
- FAIL valid '2d'
- FAIL valid '45s'
- FAIL valid '1d 2h 3m 4s'
- FAIL valid '0s'
- FAIL valid '90m'
- FAIL valid '  1h  '
- FAIL valid '1d4s'
- FAIL valid '1h   30m'
- FAIL valid '10d23h59m59s'
- FAIL invalid ''
- FAIL invalid '   '
- FAIL invalid '1x'
- FAIL invalid '30m1h'
- FAIL invalid '1h1h'
- FAIL invalid 'h'
- FAIL invalid '1.5h'
- FAIL invalid '-1h'
- FAIL invalid '+1h'
- FAIL invalid '1H'
- FAIL invalid '1h30'
- FAIL invalid '1 h'
- FAIL invalid '1h,30m'
- FAIL invalid 'abc'
- FAIL invalid '1d2d'
- FAIL invalid '5'
- FAIL invalid '1s2m'
  - note: valid '1h30m': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '2d': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '45s': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '1d 2h 3m 4s': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '0s': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '90m': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '  1h  ': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '1d4s': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '1h   30m': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: valid '10d23h59m59s': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '   ': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1x': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '30m1h': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1h1h': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid 'h': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1.5h': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '-1h': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '+1h': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1H': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1h30': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1 h': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1h,30m': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid 'abc': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1d2d': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '5': AttributeError: module 'solution' has no attribute 'parse_duration'
  - note: invalid '1s2m': AttributeError: module 'solution' has no attribute 'parse_duration'

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

## p2_sliding_median — 100%
- PASS example odd k
- PASS even k
- PASS k=1 and k=n
- PASS duplicates
- PASS random vs brute force
- PASS invalid k
- PASS performance 200k/1000

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
  - note: no code in the answer
