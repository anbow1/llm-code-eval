# GLM-5.3-Flash-GSQ-RCO-3.5bit

- Date: 2026-09-25 23:06
- Model: GLM-5.3-Flash-GSQ-RCO\GLM-5.3-Flash-GSQ-RCO-3.5bit.gguf
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 65536, think default, effort high)
- Total time: 18.8 min (generation 18.2 min)
- Tokens: 13535 total, 6378 of them thinking
- Speed: 14.4 tok/s decode, first token after 16.6 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 127.1 GB (at start 43.5 GB) | Disk read: 59.1 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 100.0% |
| TypeScript + Three.js | 87.9% |
| **Overall** | **93.9%** |
| Only tasks it finished | 92.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 45% | ok | 119.4 | 497 | 12 | 11.1 |
| p1_parse_duration | 100% | ok | 63.3 | 686 | 450 | 14.4 |
| t2_solar | 82% | ok | 75.6 | 1019 | 12 | 14.8 |
| p2_sliding_median | 100% | ok | 203.1 | 2859 | 2228 | 14.7 |
| t3_instanced_wave | 100% | ok | 80.4 | 1021 | 50 | 14.9 |
| p3_topo_order | 100% | ok | 35.9 | 404 | 178 | 14.8 |
| t4_shader_water | 100% | ok | 124.8 | 1692 | 842 | 14.9 |
| p4_gather_limited | 100% | ok | 81.3 | 1074 | 736 | 14.9 |
| t5_raycast_click | 100% | ok | 111.8 | 1498 | 519 | 14.9 |
| t6_terrain | 100% | ok | 196.1 | 2785 | 1351 | 14.8 |

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
  - note: src/t1_cube.ts(56,26): error TS2339: Property 'clock' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')

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

## t2_solar — 82%
- FAIL compiles_strict
- PASS loads
- PASS renders
- PASS at_least_5_meshes
- PASS sun_basic_or_emissive
- PASS point_light
- PASS 4_bodies_move
- PASS moon_child_of_planet
- PASS 3_different_speeds
- PASS resize
- FAIL no_console_errors
  - note: src/t2_solar.ts(132,6): error TS2304: Cannot find name 'delta'.
  - note: pageerror: delta is not defined

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
