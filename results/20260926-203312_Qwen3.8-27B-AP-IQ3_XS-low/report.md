# Qwen3.8-27B-AP-IQ3_XS-low

- Date: 2026-09-26 20:45
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 12.3 min (generation 12.0 min)
- Tokens: 46842 total, 39352 of them thinking
- Speed: 79.4 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 14.8 GB | Peak RAM: 24.0 GB (at start 17.7 GB) | Disk read: 0.2 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 95.0% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **97.5%** |
| Only tasks it finished | 98.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 10.9 | 697 | 258 | 86.5 |
| p1_parse_duration | 100% | ok | 48.7 | 3457 | 3175 | 74.9 |
| t2_solar | 100% | ok | 37.1 | 3013 | 1784 | 87.4 |
| p2_sliding_median | 100% | ok | 389.9 | 22049 | 21471 | 56.9 |
| t3_instanced_wave | 100% | ok | 36.8 | 2932 | 1802 | 86.5 |
| p3_topo_order | 100% | ok | 26.5 | 1744 | 1364 | 73.1 |
| t4_shader_water | 100% | ok | 25.9 | 1964 | 1098 | 84.7 |
| p4_gather_limited | 80% | ok | 39.0 | 2463 | 2116 | 67.6 |
| t5_raycast_click | 100% | ok | 31.9 | 2616 | 1786 | 89.6 |
| t6_terrain | 100% | ok | 70.8 | 5907 | 4498 | 86.6 |

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

## p4_gather_limited — 80%
- PASS results in order
- PASS respects limit
- PASS sliding window, not batches
- FAIL error: cancel + stop
- PASS edge cases
  - note: error: cancel + stop: AssertionError: started 5 after failure

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
