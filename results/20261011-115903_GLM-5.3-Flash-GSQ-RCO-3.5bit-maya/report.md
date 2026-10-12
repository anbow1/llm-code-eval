# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya

- Date: 2026-10-11 12:10
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort medium)
- Total time: 11.4 min (generation 11.2 min)
- Tokens: 12867 total, 5245 of them thinking
- Speed: 20.3 tok/s decode, first token after 4.3 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 114.9 GB (at start 114.4 GB) | Disk read: 143.5 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 100.0% |
| TypeScript + Three.js | 85.2% |
| **Overall** | **92.6%** |
| Only tasks it finished | 91.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 30.4 | 518 | 34 | 19.9 |
| p1_parse_duration | 100% | ok | 80.2 | 1642 | 1329 | 21.6 |
| t2_solar | 91% | ok | 83.6 | 1628 | 424 | 20.6 |
| p2_sliding_median | 100% | ok | 48.1 | 859 | 555 | 19.5 |
| t3_instanced_wave | 20% | ok | 52.9 | 972 | 94 | 20.1 |
| p3_topo_order | 100% | ok | 29.7 | 497 | 22 | 19.4 |
| t4_shader_water | 100% | ok | 44.2 | 804 | 64 | 20.2 |
| p4_gather_limited | 100% | ok | 143.1 | 2946 | 2557 | 21.2 |
| t5_raycast_click | 100% | ok | 50.1 | 912 | 123 | 20.0 |
| t6_terrain | 100% | ok | 107.0 | 2089 | 43 | 20.4 |

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

## t2_solar — 91%
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
- PASS no_console_errors
  - note: src/t2_solar.ts(126,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
  - note: src/t2_solar.ts(126,46): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.

## p2_sliding_median — 100%
- PASS example odd k
- PASS even k
- PASS k=1 and k=n
- PASS duplicates
- PASS random vs brute force
- PASS invalid k
- PASS performance 200k/1000

## t3_instanced_wave — 20%
- PASS compiles_strict
- FAIL loads
- FAIL no_console_errors
- FAIL renders
- FAIL resize
  - note: esbuild: Build failed with 1 error:
src/t3_instanced_wave.ts:2:7: ERROR: Could not resolve "three/addons/"

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
