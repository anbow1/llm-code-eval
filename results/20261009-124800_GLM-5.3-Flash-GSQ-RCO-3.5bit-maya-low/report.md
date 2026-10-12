# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-low

- Date: 2026-10-09 12:56
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort low)
- Total time: 8.4 min (generation 8.0 min)
- Tokens: 7017 total, 850 of them thinking
- Speed: 16.5 tok/s decode, first token after 6.4 s on average
- Peak VRAM: 30.9 GB | Peak RAM: 118.8 GB (at start 118.8 GB) | Disk read: 96.4 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 75.8% |
| TypeScript + Three.js | 97.0% |
| **Overall** | **86.4%** |
| Only tasks it finished | 88.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 28.9 | 369 | 2 | 15.2 |
| p1_parse_duration | 89% | ok | 27.9 | 291 | 5 | 13.9 |
| t2_solar | 82% | ok | 58.7 | 880 | 42 | 17.1 |
| p2_sliding_median | 14% | ok | 56.3 | 879 | 14 | 17.5 |
| t3_instanced_wave | 100% | ok | 51.3 | 765 | 2 | 17.3 |
| p3_topo_order | 100% | ok | 29.9 | 358 | 28 | 14.9 |
| t4_shader_water | 100% | ok | 45.0 | 670 | 4 | 17.3 |
| p4_gather_limited | 100% | ok | 59.9 | 949 | 734 | 17.5 |
| t5_raycast_click | 100% | ok | 50.4 | 715 | 3 | 16.5 |
| t6_terrain | 100% | ok | 72.2 | 1141 | 16 | 17.6 |

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
  - note: valid '1h30m': ValueError: invalid duration part: '1h30m'
  - note: valid '1d4s': ValueError: invalid duration part: '1d4s'
  - note: valid '10d23h59m59s': ValueError: invalid duration part: '10d23h59m59s'

## t2_solar — 82%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS at_least_5_meshes
- PASS sun_basic_or_emissive
- PASS point_light
- FAIL 4_bodies_move
- PASS moon_child_of_planet
- FAIL 3_different_speeds
- PASS resize
- PASS no_console_errors

## p2_sliding_median — 14%
- FAIL example odd k
- FAIL even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- FAIL performance 200k/1000
  - note: example odd k: UnboundLocalError: cannot access local variable 'hi_count' where it is not associated with a value
  - note: even k: UnboundLocalError: cannot access local variable 'lo_count' where it is not associated with a value
  - note: k=1 and k=n: UnboundLocalError: cannot access local variable 'hi_count' where it is not associated with a value
  - note: duplicates: UnboundLocalError: cannot access local variable 'lo_count' where it is not associated with a value
  - note: random vs brute force: UnboundLocalError: cannot access local variable 'lo_count' where it is not associated with a value
  - note: performance 200k/1000: UnboundLocalError: cannot access local variable 'hi_count' where it is not associated with a value

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
