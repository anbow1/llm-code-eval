# Qwen3.8-27_2.2_exl3-low

- Date: 2026-09-27 07:19
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 10.3 min (generation 8.4 min)
- Tokens: 29483 total, 24179 of them thinking
- Speed: 79.6 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 14.1 GB | Peak RAM: 14.3 GB (at start 10.1 GB) | Disk read: 0.5 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 75.0% |
| TypeScript + Three.js | 81.9% |
| **Overall** | **78.5%** |
| Only tasks it finished | 79.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 24.6 | 1805 | 1464 | 86.1 |
| p1_parse_duration | 100% | ok | 41.9 | 3268 | 2974 | 83.2 |
| t2_solar | 0% | ok | 54.3 | 4454 | 3416 | 86.0 |
| p2_sliding_median | 0% | ok | 180.2 | 3746 | 3594 | 21.1 |
| t3_instanced_wave | 100% | ok | 25.8 | 2024 | 1156 | 87.4 |
| p3_topo_order | 100% | ok | 14.4 | 1021 | 851 | 86.7 |
| t4_shader_water | 100% | ok | 32.4 | 2531 | 1956 | 84.5 |
| p4_gather_limited | 100% | ok | 57.6 | 4410 | 4194 | 80.2 |
| t5_raycast_click | 100% | ok | 27.2 | 2294 | 1588 | 93.2 |
| t6_terrain | 92% | ok | 47.6 | 3930 | 2986 | 87.2 |

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

## t2_solar — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL no_console_errors
- FAIL renders
- FAIL resize
  - note: src/t2_solar.ts(93,43): error TS1109: Expression expected.
  - note: src/t2_solar.ts(94,16): error TS1005: ',' expected.
  - note: src/t2_solar.ts(94,20): error TS1005: ':' expected.
  - note: src/t2_solar.ts(94,52): error TS1005: ',' expected.
  - note: src/t2_solar.ts(95,11): error TS1005: ':' expected.
  - note: src/t2_solar.ts(95,12): error TS1005: ',' expected.
  - note: src/t2_solar.ts(95,37): error TS1005: ',' expected.
  - note: src/t2_solar.ts(96,12): error TS1005: ',' expected.
  - note: src/t2_solar.ts(96,15): error TS1005: ':' expected.
  - note: src/t2_solar.ts(96,62): error TS1005: ',' expected.
  - note: esbuild: Build failed with 1 error:
src/t2_solar.ts:93:42: ERROR: Unexpected ":"

## p2_sliding_median — 0%
- FAIL timeout
  - note: tests timed out (90 s)

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
