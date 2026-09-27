# Qwen3.8-27_2.2_exl3-low

- Date: 2026-09-26 23:07
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 6.1 min (generation 5.7 min)
- Tokens: 25613 total, 20355 of them thinking
- Speed: 86.8 tok/s decode, first token after 4.3 s on average
- Peak VRAM: 14.1 GB | Peak RAM: 13.5 GB (at start 11.6 GB) | Disk read: 0.3 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 87.2% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **93.6%** |
| Only tasks it finished | 94.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 32.6 | 1186 | 808 | 79.9 |
| p1_parse_duration | 89% | ok | 26.5 | 2111 | 1896 | 89.8 |
| t2_solar | 100% | ok | 40.3 | 3055 | 2151 | 84.3 |
| p2_sliding_median | 100% | ok | 43.0 | 3219 | 3043 | 80.7 |
| t3_instanced_wave | 100% | ok | 19.1 | 1483 | 522 | 89.5 |
| p3_topo_order | 100% | ok | 13.9 | 966 | 799 | 86.7 |
| t4_shader_water | 100% | ok | 19.3 | 1561 | 970 | 93.0 |
| p4_gather_limited | 60% | ok | 69.3 | 5093 | 4787 | 76.3 |
| t5_raycast_click | 100% | ok | 26.9 | 2281 | 1673 | 93.8 |
| t6_terrain | 100% | ok | 52.0 | 4658 | 3706 | 94.2 |

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
  - note: valid '1h30m': ValueError: invalid part: '1h30m'
  - note: valid '1d4s': ValueError: invalid part: '1d4s'
  - note: valid '10d23h59m59s': ValueError: invalid part: '10d23h59m59s'

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

## p4_gather_limited — 60%
- PASS results in order
- PASS respects limit
- FAIL sliding window, not batches
- FAIL error: cancel + stop
- PASS edge cases
  - note: sliding window, not batches: AssertionError: took 0.50s: looks like fixed batches
  - note: error: cancel + stop: AssertionError: {'started': 2, 'cancelled': 0, 'finished': 1}

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
