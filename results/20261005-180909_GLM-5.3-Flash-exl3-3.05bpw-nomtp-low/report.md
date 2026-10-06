# GLM-5.3-Flash-exl3-3.05bpw-low

- Date: 2026-10-05 18:18
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort low)
- Total time: 9.8 min (generation 8.8 min)
- Tokens: 6058 total, 493 of them thinking
- Speed: 13.5 tok/s decode, first token after 8.2 s on average
- Peak VRAM: 28.9 GB | Peak RAM: 108.3 GB (at start 108.2 GB) | Disk read: 4.8 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 72.2% |
| TypeScript + Three.js | 98.6% |
| **Overall** | **85.4%** |
| Only tasks it finished | 88.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 41.4 | 362 | 0 | 12.1 |
| p1_parse_duration | 89% | ok | 46.1 | 528 | 0 | 13.3 |
| t2_solar | 100% | ok | 66.2 | 726 | 0 | 14.0 |
| p2_sliding_median | 100% | ok | 25.8 | 270 | 63 | 13.2 |
| t3_instanced_wave | 100% | ok | 64.2 | 784 | 0 | 14.0 |
| p3_topo_order | 100% | ok | 20.3 | 202 | 5 | 13.5 |
| t4_shader_water | 100% | ok | 57.0 | 654 | 0 | 13.4 |
| p4_gather_limited | 0% | ok | 45.7 | 540 | 59 | 13.4 |
| t5_raycast_click | 100% | ok | 54.6 | 658 | 0 | 14.3 |
| t6_terrain | 92% | ok | 104.7 | 1334 | 366 | 13.9 |

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
  - note: valid '1h30m': ValueError: invalid part: '1h30m'
  - note: valid '1d4s': ValueError: invalid part: '1d4s'
  - note: valid '10d23h59m59s': ValueError: invalid part: '10d23h59m59s'

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

## p4_gather_limited — 0%
- FAIL results in order
- FAIL respects limit
- FAIL sliding window, not batches
- FAIL error: cancel + stop
- FAIL edge cases
  - note: results in order: TimeoutError: 
  - note: respects limit: TimeoutError: 
  - note: sliding window, not batches: TimeoutError: 
  - note: error: cancel + stop: AssertionError: {'started': 2, 'cancelled': 0, 'finished': 1}
  - note: edge cases: TimeoutError: 

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

## t6_terrain — 92%
- FAIL compiles_strict
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
  - note: src/t6_terrain.ts(95,18): error TS2869: Right operand of ?? is unreachable because the left operand is never nullish.
