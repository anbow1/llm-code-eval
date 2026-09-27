# Qwen3.8-27B-abliterated-GSQ-RCO-IQ3_S-low

- Date: 2026-09-27 09:03
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 12.1 min (generation 11.5 min)
- Tokens: 47211 total, 39919 of them thinking
- Speed: 77.1 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 15.6 GB | Peak RAM: 23.4 GB (at start 17.4 GB) | Disk read: 0.2 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 84.3% |
| TypeScript + Three.js | 83.3% |
| **Overall** | **83.8%** |
| Only tasks it finished | 83.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 9.6 | 617 | 171 | 89.5 |
| p1_parse_duration | 100% | ok | 36.5 | 2432 | 2168 | 71.7 |
| t2_solar | 100% | ok | 46.3 | 3561 | 2263 | 81.4 |
| p2_sliding_median | 57% | ok | 333.2 | 21961 | 21286 | 66.4 |
| t3_instanced_wave | 100% | ok | 29.9 | 2284 | 1247 | 84.7 |
| p3_topo_order | 100% | ok | 28.0 | 1738 | 1525 | 68.8 |
| t4_shader_water | 0% | ok | 28.0 | 1953 | 1161 | 77.2 |
| p4_gather_limited | 80% | ok | 102.0 | 6775 | 6444 | 68.2 |
| t5_raycast_click | 100% | ok | 33.5 | 2555 | 1748 | 83.1 |
| t6_terrain | 100% | ok | 44.3 | 3335 | 1906 | 80.0 |

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
- FAIL example odd k
- PASS even k
- PASS k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: example odd k: AssertionError: [1.0, -3.0, -3.0, -3.0, 3.0, 3.0]
  - note: duplicates: AssertionError: 
  - note: random vs brute force: AssertionError: ([6, -9, 3, 15, 3, -15, 8, 12, -14, -10, 13, 5, 3, 11, -19, 10, -18, -1, 19, 17, 17, 5, -10, -10, 12, -6, -20, -8, 14, 15, -6, 5, 12, 2, 16, 2, 9, -3, 15, 18, -20, 4, 12, -12, 13, 15, -7, 7], 26)

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

## t4_shader_water — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: src/t4_shader_water.ts(58,36): error TS2339: Property 'canvas' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'.

## p4_gather_limited — 80%
- PASS results in order
- PASS respects limit
- PASS sliding window, not batches
- FAIL error: cancel + stop
- PASS edge cases
  - note: error: cancel + stop: ExceptionGroup: unhandled errors in a TaskGroup (1 sub-exception)

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
