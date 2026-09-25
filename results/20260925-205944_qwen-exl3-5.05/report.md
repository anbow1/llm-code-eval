# qwen-exl3-5.05

- Date: 2026-09-25 21:12
- Model: Qwen38-exl3-505
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 12.8 min (generation 12.4 min)
- Tokens: 25044 total, 17991 of them thinking
- Speed: 36.2 tok/s decode, first token after 4.7 s on average
- Peak VRAM: 29.3 GB | Peak RAM: 86.1 GB (at start 84.0 GB) | Disk read: 7.1 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 81.2% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **90.6%** |
| Only tasks it finished | 92.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 30.5 | 777 | 312 | 32.3 |
| p1_parse_duration | 96% | ok | 88.5 | 2630 | 2305 | 31.3 |
| t2_solar | 100% | ok | 86.8 | 2887 | 1888 | 35.3 |
| p2_sliding_median | 29% | ok | 130.1 | 4134 | 3561 | 32.8 |
| t3_instanced_wave | 100% | ok | 49.0 | 1643 | 585 | 37.2 |
| p3_topo_order | 100% | ok | 46.0 | 1603 | 1384 | 37.9 |
| t4_shader_water | 100% | ok | 38.7 | 1323 | 340 | 39.2 |
| p4_gather_limited | 100% | ok | 125.3 | 4534 | 4284 | 37.3 |
| t5_raycast_click | 100% | ok | 58.5 | 2200 | 1413 | 41.0 |
| t6_terrain | 100% | ok | 92.7 | 3313 | 1919 | 37.8 |

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

## p1_parse_duration — 96%
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
- FAIL invalid '1 h'
- PASS invalid '1h,30m'
- PASS invalid 'abc'
- PASS invalid '1d2d'
- PASS invalid '5'
- PASS invalid '1s2m'
  - note: invalid '1 h': AssertionError: '1 h': expected ValueError, got 3600

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

## p2_sliding_median — 29%
- FAIL example odd k
- PASS even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- FAIL performance 200k/1000
  - note: example odd k: IndexError: index out of range
  - note: k=1 and k=n: IndexError: index out of range
  - note: duplicates: IndexError: index out of range
  - note: random vs brute force: IndexError: index out of range
  - note: performance 200k/1000: IndexError: index out of range

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
