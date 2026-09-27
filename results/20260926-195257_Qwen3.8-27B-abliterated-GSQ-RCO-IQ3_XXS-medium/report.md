# Qwen3.8-27B-abliterated-GSQ-RCO-IQ3_XXS-medium

- Date: 2026-09-26 20:02
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 9.2 min (generation 8.6 min)
- Tokens: 38315 total, 30368 of them thinking
- Speed: 78.7 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 15.1 GB | Peak RAM: 26.9 GB (at start 26.8 GB) | Disk read: 0.0 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 85.7% |
| TypeScript + Three.js | 90.9% |
| **Overall** | **88.3%** |
| Only tasks it finished | 88.8% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 22.7 | 1696 | 1054 | 85.1 |
| p1_parse_duration | 100% | ok | 65.1 | 4485 | 4203 | 71.8 |
| t2_solar | 100% | ok | 50.8 | 3954 | 2679 | 82.2 |
| p2_sliding_median | 43% | ok | 99.5 | 7388 | 6606 | 76.3 |
| t3_instanced_wave | 45% | ok | 27.2 | 1941 | 829 | 79.1 |
| p3_topo_order | 100% | ok | 29.5 | 1867 | 1593 | 69.5 |
| t4_shader_water | 100% | ok | 33.4 | 2617 | 1796 | 84.8 |
| p4_gather_limited | 100% | ok | 58.3 | 3870 | 3690 | 69.4 |
| t5_raycast_click | 100% | ok | 28.6 | 2246 | 1210 | 86.3 |
| t6_terrain | 100% | ok | 103.3 | 8251 | 6708 | 82.0 |

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
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: example odd k: AssertionError: [-1.0, -3.0, -3.0, 3.0, 5.0, 6.0]
  - note: k=1 and k=n: AssertionError: 
  - note: duplicates: AssertionError: 
  - note: random vs brute force: AssertionError: ([6, -9, 3, 15, 3, -15, 8, 12, -14, -10, 13, 5, 3, 11, -19, 10, -18, -1, 19, 17, 17, 5, -10, -10, 12, -6, -20, -8, 14, 15, -6, 5, 12, 2, 16, 2, 9, -3, 15, 18, -20, 4, 12, -12, 13, 15, -7, 7], 26)

## t3_instanced_wave — 45%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- PASS instanced_mesh
- PASS count_10000
- PASS instance_colors
- PASS few_plain_meshes
- FAIL wave_animates
- FAIL picture_animates
- PASS resize
- FAIL no_console_errors
  - note: src/t3_instanced_wave.ts(113,9): error TS2551: Property 'setElements' does not exist on type 'Matrix4'. Did you mean 'elements'?
  - note: __ready never became true
  - note: pageerror: mat.setElements is not a function
  - note: pageerror: mat.setElements is not a function
  - note: pageerror: mat.setElements is not a function
  - note: pageerror: mat.setElements is not a function
  - note: pageerror: mat.setElements is not a function

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
