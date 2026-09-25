# Qwen3.8-Flash-Next-GSQ-RCO-IQ3_XXS-low

- Date: 2026-09-25 17:37
- Model: Qwen3.8-Flash-Next-GSQ-RCO-IQ3_XXS-00001-of-00002.gguf
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 68.2 min (generation 67.8 min)
- Tokens: 87646 total, 80312 of them thinking
- Speed: 22.9 tok/s decode, first token after 9.8 s on average
- Peak VRAM: 24.6 GB | Peak RAM: 63.6 GB (at start 25.1 GB) | Disk read: 3.1 GB
- Tasks: 9/10 answered, 1 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 75.0% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **87.5%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 47.1 | 729 | 268 | 22.9 |
| p1_parse_duration | 100% | ok | 190.2 | 4221 | 3965 | 23.3 |
| t2_solar | 100% | ok | 92.8 | 1897 | 768 | 23.3 |
| p2_sliding_median | 0% | max_tokens | 3018.9 | 65536 | 65044 | 21.8 |
| t3_instanced_wave | 100% | ok | 67.2 | 1272 | 410 | 22.8 |
| p3_topo_order | 100% | ok | 127.6 | 2753 | 2551 | 22.8 |
| t4_shader_water | 100% | ok | 112.8 | 2347 | 1338 | 23.0 |
| p4_gather_limited | 100% | ok | 150.9 | 3305 | 2944 | 23.0 |
| t5_raycast_click | 100% | ok | 67.1 | 1279 | 439 | 23.0 |
| t6_terrain | 100% | ok | 194.9 | 4307 | 2585 | 22.9 |

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

## p2_sliding_median — 0%
- FAIL example odd k
- FAIL even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- FAIL invalid k
- FAIL performance 200k/1000
  - note: hit max_tokens (65536) answer may be cut
  - note: example odd k: SyntaxError: invalid syntax (solution.py, line 1)
  - note: even k: SyntaxError: invalid syntax (solution.py, line 1)
  - note: k=1 and k=n: SyntaxError: invalid syntax (solution.py, line 1)
  - note: duplicates: SyntaxError: invalid syntax (solution.py, line 1)
  - note: random vs brute force: SyntaxError: invalid syntax (solution.py, line 1)
  - note: invalid k: SyntaxError: invalid syntax (solution.py, line 1)
  - note: performance 200k/1000: SyntaxError: invalid syntax (solution.py, line 1)

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
