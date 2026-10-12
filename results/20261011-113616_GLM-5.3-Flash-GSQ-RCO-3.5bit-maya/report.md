# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya

- Date: 2026-10-11 11:59
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort medium)
- Total time: 22.8 min (generation 22.2 min)
- Tokens: 26319 total, 18905 of them thinking
- Speed: 20.1 tok/s decode, first token after 4.3 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 116.0 GB (at start 115.6 GB) | Disk read: 253.0 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 82.1% |
| TypeScript + Three.js | 90.9% |
| **Overall** | **86.5%** |
| Only tasks it finished | 87.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 45% | ok | 30.1 | 484 | 8 | 18.9 |
| p1_parse_duration | 100% | ok | 75.3 | 1478 | 1180 | 20.8 |
| t2_solar | 100% | ok | 83.7 | 1636 | 415 | 20.7 |
| p2_sliding_median | 29% | ok | 201.4 | 4079 | 3330 | 20.7 |
| t3_instanced_wave | 100% | ok | 54.9 | 965 | 59 | 19.1 |
| p3_topo_order | 100% | ok | 18.8 | 271 | 23 | 18.4 |
| t4_shader_water | 100% | ok | 47.3 | 858 | 83 | 20.0 |
| p4_gather_limited | 100% | ok | 122.2 | 2515 | 2160 | 21.3 |
| t5_raycast_click | 100% | ok | 41.7 | 750 | 27 | 20.2 |
| t6_terrain | 100% | ok | 654.4 | 13283 | 11620 | 20.4 |

## t1_cube — 45%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- PASS box_geometry
- PASS standard_material
- PASS ambient_light
- PASS directional_light
- FAIL cube_rotates
- FAIL picture_animates
- PASS resize
- FAIL no_console_errors
  - note: src/t1_cube.ts(37,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
  - note: src/t1_cube.ts(58,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function

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

## p2_sliding_median — 29%
- FAIL example odd k
- FAIL even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: example odd k: AssertionError: [1.0, -1.0, -1.0, 3.0, 5.0, 7.0]
  - note: even k: IndexError: list index out of range
  - note: k=1 and k=n: IndexError: index out of range
  - note: duplicates: IndexError: list index out of range
  - note: random vs brute force: IndexError: list index out of range

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
