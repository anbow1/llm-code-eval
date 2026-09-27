# Qwen3.8-27_2.2_exl3-medium

- Date: 2026-09-27 07:48
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 8.9 min (generation 8.5 min)
- Tokens: 26996 total, 20858 of them thinking
- Speed: 82.8 tok/s decode, first token after 2.8 s on average
- Peak VRAM: 15.0 GB | Peak RAM: 14.9 GB (at start 14.8 GB) | Disk read: 0.0 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 77.6% |
| TypeScript + Three.js | 92.6% |
| **Overall** | **85.1%** |
| Only tasks it finished | 86.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 64% | ok | 12.5 | 880 | 361 | 91.8 |
| p1_parse_duration | 96% | ok | 39.0 | 3217 | 2971 | 88.4 |
| t2_solar | 100% | ok | 36.2 | 3028 | 2019 | 90.6 |
| p2_sliding_median | 14% | ok | 225.7 | 3920 | 3778 | 17.6 |
| t3_instanced_wave | 100% | ok | 36.0 | 2963 | 2079 | 89.1 |
| p3_topo_order | 100% | ok | 17.6 | 1327 | 1081 | 88.2 |
| t4_shader_water | 100% | ok | 24.4 | 1987 | 1073 | 92.1 |
| p4_gather_limited | 100% | ok | 60.2 | 4592 | 4394 | 79.8 |
| t5_raycast_click | 100% | ok | 28.1 | 2430 | 1676 | 96.3 |
| t6_terrain | 92% | ok | 31.1 | 2652 | 1426 | 93.9 |

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
  - note: src/t1_cube.ts(52,27): error TS2345: Argument of type '(_time: number, delta: number) => void' is not assignable to parameter of type 'XRFrameRequestCallback'.

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

## p2_sliding_median — 14%
- FAIL example odd k
- FAIL even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- FAIL performance 200k/1000
  - note: example odd k: UnboundLocalError: cannot access local variable 'lower_count' where it is not associated with a value
  - note: even k: UnboundLocalError: cannot access local variable 'lower_count' where it is not associated with a value
  - note: k=1 and k=n: UnboundLocalError: cannot access local variable 'lower_count' where it is not associated with a value
  - note: duplicates: UnboundLocalError: cannot access local variable 'lower_count' where it is not associated with a value
  - note: random vs brute force: UnboundLocalError: cannot access local variable 'lower_count' where it is not associated with a value
  - note: performance 200k/1000: UnboundLocalError: cannot access local variable 'lower_count' where it is not associated with a value

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
