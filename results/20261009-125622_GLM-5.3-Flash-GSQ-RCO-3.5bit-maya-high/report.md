# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-high

- Date: 2026-10-09 13:11
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 15.0 min (generation 14.7 min)
- Tokens: 13828 total, 6701 of them thinking
- Speed: 16.7 tok/s decode, first token after 6.6 s on average
- Peak VRAM: 30.9 GB | Peak RAM: 118.4 GB (at start 117.9 GB) | Disk read: 143.1 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 100.0% |
| TypeScript + Three.js | 98.5% |
| **Overall** | **99.2%** |
| Only tasks it finished | 99.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 91% | ok | 36.2 | 510 | 6 | 17.2 |
| p1_parse_duration | 100% | ok | 56.8 | 856 | 623 | 17.1 |
| t2_solar | 100% | ok | 161.2 | 2664 | 1351 | 17.3 |
| p2_sliding_median | 100% | ok | 69.4 | 1012 | 604 | 16.0 |
| t3_instanced_wave | 100% | ok | 84.6 | 1275 | 182 | 16.5 |
| p3_topo_order | 100% | ok | 25.1 | 291 | 67 | 15.2 |
| t4_shader_water | 100% | ok | 56.6 | 848 | 22 | 17.0 |
| p4_gather_limited | 100% | ok | 154.6 | 2655 | 2309 | 17.8 |
| t5_raycast_click | 100% | ok | 59.8 | 868 | 54 | 16.5 |
| t6_terrain | 100% | ok | 176.3 | 2849 | 1483 | 16.8 |

## t1_cube — 91%
- FAIL compiles_strict
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
  - note: src/t1_cube.ts(57,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.

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
