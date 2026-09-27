# Qwen3.8-27B-abliterated-GSQ-RCO-IQ3_S-mtp-low

- Date: 2026-09-26 20:22
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 10.5 min (generation 10.2 min)
- Tokens: 40235 total, 33176 of them thinking
- Speed: 73.8 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 15.5 GB | Peak RAM: 24.6 GB (at start 19.3 GB) | Disk read: 0.2 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 85.7% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **92.9%** |
| Only tasks it finished | 94.3% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 9.8 | 629 | 184 | 88.8 |
| p1_parse_duration | 100% | ok | 42.2 | 2657 | 2385 | 67.2 |
| t2_solar | 100% | ok | 50.5 | 3622 | 2527 | 75.5 |
| p2_sliding_median | 43% | ok | 276.2 | 17404 | 16704 | 63.6 |
| t3_instanced_wave | 100% | ok | 36.7 | 2663 | 1721 | 78.6 |
| p3_topo_order | 100% | ok | 29.8 | 1763 | 1513 | 65.1 |
| t4_shader_water | 100% | ok | 29.2 | 2047 | 1226 | 77.1 |
| p4_gather_limited | 100% | ok | 42.0 | 2430 | 2274 | 61.8 |
| t5_raycast_click | 100% | ok | 39.3 | 2955 | 2070 | 80.8 |
| t6_terrain | 100% | ok | 54.0 | 4065 | 2572 | 79.0 |

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

## p2_sliding_median — 43%
- FAIL example odd k
- PASS even k
- PASS k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- FAIL performance 200k/1000
  - note: example odd k: AssertionError: [1.0, -1.0, -1.0, -3.0, 6.0, 7.0]
  - note: duplicates: AssertionError: 
  - note: random vs brute force: IndexError: list index out of range
  - note: performance 200k/1000: IndexError: list index out of range

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
