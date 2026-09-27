# Qwen3.8-27B-AP-IQ3_S-low

- Date: 2026-09-26 21:05
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 9.7 min (generation 9.4 min)
- Tokens: 40952 total, 33496 of them thinking
- Speed: 78.1 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 15.2 GB | Peak RAM: 24.2 GB (at start 18.2 GB) | Disk read: 0.4 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 86.5% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **93.3%** |
| Only tasks it finished | 94.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 21.5 | 1569 | 1072 | 83.4 |
| p1_parse_duration | 89% | ok | 30.4 | 2003 | 1744 | 72.0 |
| t2_solar | 100% | ok | 50.0 | 3895 | 2536 | 82.2 |
| p2_sliding_median | 57% | ok | 180.0 | 13144 | 12368 | 74.2 |
| t3_instanced_wave | 100% | ok | 39.9 | 3118 | 1983 | 84.1 |
| p3_topo_order | 100% | ok | 65.4 | 4638 | 4396 | 74.0 |
| t4_shader_water | 100% | ok | 26.2 | 1951 | 1072 | 83.0 |
| p4_gather_limited | 100% | ok | 52.9 | 3377 | 3198 | 67.1 |
| t5_raycast_click | 100% | ok | 21.4 | 1489 | 667 | 79.7 |
| t6_terrain | 100% | ok | 73.4 | 5768 | 4460 | 81.6 |

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
  - note: valid '1h30m': ValueError: Invalid part: '1h30m'
  - note: valid '1d4s': ValueError: Invalid part: '1d4s'
  - note: valid '10d23h59m59s': ValueError: Invalid part: '10d23h59m59s'

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
- FAIL example odd k
- PASS even k
- PASS k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: example odd k: AssertionError: [1.0, -1.0, -1.0, 3.0, 6.0, 7.0]
  - note: duplicates: AssertionError: 
  - note: random vs brute force: AssertionError: ([-4, -13, 11, 8, 10, 4, -7, -14, 11], 2)

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
