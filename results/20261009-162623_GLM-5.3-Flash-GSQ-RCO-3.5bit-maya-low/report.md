# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-low

- Date: 2026-10-09 16:35
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort low)
- Total time: 9.5 min (generation 7.7 min)
- Tokens: 6221 total, 449 of them thinking
- Speed: 15.7 tok/s decode, first token after 7.0 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 120.9 GB (at start 120.0 GB) | Disk read: 115.7 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 74.1% |
| TypeScript + Three.js | 98.6% |
| **Overall** | **86.3%** |
| Only tasks it finished | 88.8% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 28.2 | 348 | 0 | 15.9 |
| p1_parse_duration | 96% | ok | 36.4 | 418 | 5 | 14.2 |
| t2_solar | 100% | ok | 77.5 | 1157 | 362 | 16.5 |
| p2_sliding_median | 100% | ok | 45.5 | 644 | 0 | 16.6 |
| t3_instanced_wave | 100% | ok | 54.1 | 757 | 2 | 16.3 |
| p3_topo_order | 100% | ok | 21.4 | 210 | 6 | 14.1 |
| t4_shader_water | 100% | ok | 47.2 | 644 | 5 | 16.2 |
| p4_gather_limited | 0% | ok | 25.1 | 277 | 3 | 15.1 |
| t5_raycast_click | 100% | ok | 50.4 | 680 | 62 | 15.8 |
| t6_terrain | 92% | ok | 76.1 | 1086 | 4 | 15.8 |

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

## p4_gather_limited — 0%
- FAIL timeout
  - note: tests timed out (90 s)

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
- FAIL compiles_strict
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
  - note: src/t6_terrain.ts(96,26): error TS2339: Property 'clock' does not exist on type 'WebGLRenderer'.
