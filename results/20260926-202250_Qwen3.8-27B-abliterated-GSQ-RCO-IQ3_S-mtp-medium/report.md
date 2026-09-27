# Qwen3.8-27B-abliterated-GSQ-RCO-IQ3_S-mtp-medium

- Date: 2026-09-26 20:30
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 7.9 min (generation 7.5 min)
- Tokens: 29787 total, 21895 of them thinking
- Speed: 73.0 tok/s decode, first token after 2.6 s on average
- Peak VRAM: 15.5 GB | Peak RAM: 27.4 GB (at start 24.5 GB) | Disk read: 0.1 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 92.9% |
| TypeScript + Three.js | 98.6% |
| **Overall** | **95.7%** |
| Only tasks it finished | 96.3% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 15.7 | 1108 | 678 | 85.8 |
| p1_parse_duration | 100% | ok | 73.0 | 4662 | 4374 | 66.3 |
| t2_solar | 100% | ok | 23.7 | 1647 | 114 | 78.4 |
| p2_sliding_median | 71% | ok | 115.4 | 7930 | 7204 | 70.2 |
| t3_instanced_wave | 100% | ok | 29.1 | 2043 | 1057 | 77.7 |
| p3_topo_order | 100% | ok | 32.6 | 2047 | 1830 | 68.3 |
| t4_shader_water | 100% | ok | 21.5 | 1508 | 710 | 79.7 |
| p4_gather_limited | 100% | ok | 69.4 | 4397 | 4075 | 65.9 |
| t5_raycast_click | 100% | ok | 35.6 | 2217 | 1161 | 67.2 |
| t6_terrain | 92% | ok | 34.3 | 2228 | 692 | 70.3 |

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

## p2_sliding_median — 71%
- PASS example odd k
- FAIL even k
- PASS k=1 and k=n
- PASS duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: even k: IndexError: list index out of range
  - note: random vs brute force: IndexError: list index out of range

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

## t6_terrain — 92%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS custom_buffer_geometry
- PASS indexed
- FAIL normals_point_up
- PASS vertex_colors
- PASS has_height
- PASS orbit_controls
- PASS lights
- PASS resize
- PASS no_console_errors
