# GLM-5.3-Flash-exl3-3.05bpw-nomtp-high

- Date: 2026-10-05 19:16
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 21.3 min (generation 20.7 min)
- Tokens: 17135 total, 9547 of them thinking
- Speed: 14.4 tok/s decode, first token after 4.9 s on average
- Peak VRAM: 29.0 GB | Peak RAM: 106.8 GB (at start 105.7 GB) | Disk read: 1.5 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 100.0% |
| TypeScript + Three.js | 94.4% |
| **Overall** | **97.2%** |
| Only tasks it finished | 96.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 39.7 | 530 | 39 | 14.6 |
| p1_parse_duration | 100% | ok | 69.0 | 844 | 573 | 13.4 |
| t2_solar | 100% | ok | 113.6 | 1598 | 341 | 14.7 |
| p2_sliding_median | 100% | ok | 434.7 | 6078 | 5375 | 14.2 |
| t3_instanced_wave | 100% | ok | 86.2 | 1204 | 96 | 14.7 |
| p3_topo_order | 100% | ok | 65.6 | 827 | 493 | 13.8 |
| t4_shader_water | 100% | ok | 61.9 | 850 | 31 | 14.8 |
| p4_gather_limited | 100% | ok | 194.1 | 2768 | 2437 | 14.7 |
| t5_raycast_click | 100% | ok | 64.8 | 875 | 53 | 14.6 |
| t6_terrain | 67% | ok | 112.7 | 1561 | 109 | 14.5 |

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

## t6_terrain — 67%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- PASS custom_buffer_geometry
- PASS indexed
- PASS normals_point_up
- PASS vertex_colors
- PASS has_height
- PASS orbit_controls
- PASS lights
- PASS resize
- FAIL no_console_errors
  - note: src/t6_terrain.ts(147,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
  - note: src/t6_terrain.ts(148,28): error TS2339: Property 'getElapsedTime' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
