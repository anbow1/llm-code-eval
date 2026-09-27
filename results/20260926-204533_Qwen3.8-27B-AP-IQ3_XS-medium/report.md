# Qwen3.8-27B-AP-IQ3_XS-medium

- Date: 2026-09-26 20:54
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 8.8 min (generation 8.4 min)
- Tokens: 37228 total, 29630 of them thinking
- Speed: 79.8 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 14.8 GB | Peak RAM: 26.2 GB (at start 23.9 GB) | Disk read: 0.1 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 96.4% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **98.2%** |
| Only tasks it finished | 98.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 19.4 | 1522 | 979 | 91.4 |
| p1_parse_duration | 100% | ok | 45.2 | 3100 | 2822 | 73.0 |
| t2_solar | 100% | ok | 41.7 | 3153 | 2031 | 80.8 |
| p2_sliding_median | 86% | ok | 178.5 | 13079 | 12410 | 74.4 |
| t3_instanced_wave | 100% | ok | 33.5 | 2541 | 1435 | 83.0 |
| p3_topo_order | 100% | ok | 22.1 | 1436 | 1223 | 73.7 |
| t4_shader_water | 100% | ok | 26.5 | 1881 | 907 | 79.2 |
| p4_gather_limited | 100% | ok | 73.3 | 5443 | 5104 | 76.9 |
| t5_raycast_click | 100% | ok | 19.3 | 1365 | 555 | 82.0 |
| t6_terrain | 100% | ok | 47.2 | 3708 | 2164 | 83.2 |

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

## p2_sliding_median — 86%
- PASS example odd k
- PASS even k
- PASS k=1 and k=n
- PASS duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: random vs brute force: AssertionError: ([-19, -1, 4, 1, 6, -8, -4, -14, -4, 12, -7, 18, 7, -19, -6, -19, 5, -11, -18, -10, 8, 12, 7, 14, -6, 20, 13, 8, -6, 13, -19], 4)

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
