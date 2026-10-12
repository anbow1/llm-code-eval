# Qwen3.8-Flash-Next-UD-Q4_K_XL-strata-low

- Date: 2026-10-07 22:15
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort low)
- Total time: 6.7 min (generation 6.3 min)
- Tokens: 29921 total, 22470 of them thinking
- Speed: 87.0 tok/s decode, first token after 4.0 s on average
- Peak VRAM: 30.9 GB | Peak RAM: 99.8 GB (at start 98.2 GB) | Disk read: 4.3 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 89.3% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **94.6%** |
| Only tasks it finished | 95.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 14.9 | 809 | 338 | 78.9 |
| p1_parse_duration | 100% | ok | 43.4 | 3405 | 3110 | 86.5 |
| t2_solar | 100% | ok | 38.7 | 2832 | 1831 | 82.1 |
| p2_sliding_median | 57% | ok | 94.0 | 8078 | 7195 | 89.6 |
| t3_instanced_wave | 100% | ok | 17.2 | 1186 | 295 | 89.3 |
| p3_topo_order | 100% | ok | 27.5 | 1797 | 1363 | 75.7 |
| t4_shader_water | 100% | ok | 19.1 | 1381 | 501 | 90.8 |
| p4_gather_limited | 100% | ok | 68.6 | 5874 | 5378 | 90.6 |
| t5_raycast_click | 100% | ok | 19.5 | 1439 | 714 | 92.8 |
| t6_terrain | 100% | ok | 37.5 | 3120 | 1745 | 93.6 |

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

## p2_sliding_median — 57%
- PASS example odd k
- PASS even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: k=1 and k=n: AssertionError: 
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
