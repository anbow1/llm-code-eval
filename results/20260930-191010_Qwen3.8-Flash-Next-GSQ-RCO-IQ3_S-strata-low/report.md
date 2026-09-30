# Qwen3.8-Flash-Next-GSQ-RCO-IQ3_S-strata-low

- Date: 2026-09-30 19:15
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort low)
- Total time: 5.1 min (generation 4.7 min)
- Tokens: 35371 total, 28412 of them thinking
- Speed: 140.5 tok/s decode, first token after 3.1 s on average
- Peak VRAM: 30.5 GB | Peak RAM: 70.1 GB (at start 69.6 GB) | Disk read: 2.2 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 84.8% |
| TypeScript + Three.js | 97.1% |
| **Overall** | **90.9%** |
| Only tasks it finished | 92.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 11.4 | 556 | 141 | 125.5 |
| p1_parse_duration | 96% | ok | 18.3 | 2304 | 1982 | 146.2 |
| t2_solar | 100% | ok | 25.4 | 3179 | 2191 | 139.8 |
| p2_sliding_median | 43% | ok | 83.4 | 11681 | 11000 | 144.6 |
| t3_instanced_wave | 91% | ok | 12.4 | 1421 | 490 | 146.1 |
| p3_topo_order | 100% | ok | 32.5 | 3283 | 3098 | 109.8 |
| t4_shader_water | 100% | ok | 18.1 | 2373 | 1495 | 153.5 |
| p4_gather_limited | 100% | ok | 34.4 | 4423 | 4178 | 139.1 |
| t5_raycast_click | 100% | ok | 18.6 | 2325 | 1568 | 145.8 |
| t6_terrain | 92% | ok | 27.5 | 3826 | 2269 | 154.2 |

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

## p2_sliding_median — 43%
- FAIL example odd k
- PASS even k
- PASS k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- FAIL performance 200k/1000
  - note: example odd k: IndexError: list index out of range
  - note: duplicates: IndexError: list index out of range
  - note: random vs brute force: IndexError: list index out of range
  - note: performance 200k/1000: IndexError: list index out of range

## t3_instanced_wave — 91%
- FAIL compiles_strict
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
  - note: src/t3_instanced_wave.ts(44,7): error TS2740: Type 'Float64Array<ArrayBuffer>' is missing the following properties from type 'number[]': pop, push, concat, shift, and 5 more.

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
