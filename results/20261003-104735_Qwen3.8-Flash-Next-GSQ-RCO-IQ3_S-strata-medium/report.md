# Qwen3.8-Flash-Next-GSQ-RCO-IQ3_S-strata-medium

- Date: 2026-10-03 11:01
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 13.9 min (generation 13.6 min)
- Tokens: 117595 total, 110356 of them thinking
- Speed: 151.1 tok/s decode, first token after 2.6 s on average
- Peak VRAM: 30.6 GB | Peak RAM: 65.0 GB (at start 64.9 GB) | Disk read: 7.8 GB
- Tasks: 9/10 answered, 1 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 75.0% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **87.5%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 7.0 | 676 | 170 | 151.7 |
| p1_parse_duration | 100% | ok | 19.3 | 2598 | 2294 | 155.5 |
| t2_solar | 100% | ok | 13.7 | 1707 | 470 | 153.4 |
| p2_sliding_median | 0% | max_tokens | 665.7 | 98304 | 98304 | 148.2 |
| t3_instanced_wave | 100% | ok | 23.3 | 3015 | 1739 | 146.0 |
| p3_topo_order | 100% | ok | 12.9 | 1470 | 1233 | 141.4 |
| t4_shader_water | 100% | ok | 12.3 | 1474 | 357 | 152.4 |
| p4_gather_limited | 100% | ok | 25.1 | 3433 | 3112 | 152.2 |
| t5_raycast_click | 100% | ok | 11.3 | 1312 | 521 | 151.3 |
| t6_terrain | 100% | ok | 25.3 | 3606 | 2156 | 159.3 |

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
  - note: hit max_tokens (98304) while still thinking, no answer
  - note: generation got stuck repeating the same text (loop)
  - note: example odd k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: even k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: k=1 and k=n: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: duplicates: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: random vs brute force: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: invalid k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: performance 200k/1000: AttributeError: module 'solution' has no attribute 'sliding_median'

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
