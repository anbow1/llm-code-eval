# GLM-5.3-Flash-exl3-3.05bpw-low

- Date: 2026-10-02 21:09
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort low)
- Total time: 11.0 min (generation 10.0 min)
- Tokens: 7781 total, 1033 of them thinking
- Speed: 14.6 tok/s decode, first token after 7.9 s on average
- Peak VRAM: 30.2 GB | Peak RAM: 114.8 GB (at start 114.7 GB) | Disk read: 3.4 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 75.4% |
| TypeScript + Three.js | 92.6% |
| **Overall** | **84.0%** |
| Only tasks it finished | 85.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 64% | ok | 35.3 | 356 | 0 | 13.9 |
| p1_parse_duration | 81% | ok | 22.6 | 238 | 14 | 14.5 |
| t2_solar | 100% | ok | 120.8 | 1732 | 811 | 15.5 |
| p2_sliding_median | 100% | ok | 38.0 | 357 | 176 | 11.2 |
| t3_instanced_wave | 100% | ok | 114.1 | 1631 | 0 | 15.6 |
| p3_topo_order | 100% | ok | 22.2 | 250 | 19 | 15.3 |
| t4_shader_water | 100% | ok | 61.3 | 824 | 0 | 15.6 |
| p4_gather_limited | 20% | ok | 41.7 | 456 | 8 | 12.9 |
| t5_raycast_click | 100% | ok | 48.6 | 633 | 0 | 16.0 |
| t6_terrain | 92% | ok | 93.6 | 1304 | 5 | 15.5 |

## t1_cube — 64%
- FAIL compiles_strict
- PASS loads
- FAIL renders
- PASS box_geometry
- PASS standard_material
- PASS ambient_light
- PASS directional_light
- FAIL cube_rotates
- FAIL picture_animates
- PASS resize
- PASS no_console_errors
  - note: src/t1_cube.ts(34,26): error TS2869: Right operand of ?? is unreachable because the left operand is never nullish.

## p1_parse_duration — 81%
- FAIL valid '1h30m'
- PASS valid '2d'
- PASS valid '45s'
- FAIL valid '1d 2h 3m 4s'
- PASS valid '0s'
- PASS valid '90m'
- PASS valid '  1h  '
- FAIL valid '1d4s'
- FAIL valid '1h   30m'
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
  - note: valid '1h30m': ValueError: invalid number
  - note: valid '1d 2h 3m 4s': ValueError: wrong order
  - note: valid '1d4s': ValueError: invalid number
  - note: valid '1h   30m': ValueError: wrong order
  - note: valid '10d23h59m59s': ValueError: invalid number

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

## p4_gather_limited — 20%
- FAIL results in order
- FAIL respects limit
- FAIL sliding window, not batches
- PASS error: cancel + stop
- FAIL edge cases
  - note: results in order: TimeoutError: 
  - note: respects limit: TimeoutError: 
  - note: sliding window, not batches: TimeoutError: 
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
  - note: src/t6_terrain.ts(123,18): error TS2869: Right operand of ?? is unreachable because the left operand is never nullish.
