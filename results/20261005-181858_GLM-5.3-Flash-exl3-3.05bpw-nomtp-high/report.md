# GLM-5.3-Flash-exl3-3.05bpw-high

- Date: 2026-10-05 18:44
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 25.8 min (generation 24.4 min)
- Tokens: 19697 total, 11662 of them thinking
- Speed: 14.1 tok/s decode, first token after 6.9 s on average
- Peak VRAM: 29.0 GB | Peak RAM: 106.2 GB (at start 106.0 GB) | Disk read: 2.7 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 85.0% |
| TypeScript + Three.js | 81.8% |
| **Overall** | **83.4%** |
| Only tasks it finished | 83.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 45% | ok | 37.9 | 440 | 13 | 14.2 |
| p1_parse_duration | 100% | ok | 49.0 | 580 | 264 | 13.4 |
| t2_solar | 45% | ok | 96.9 | 1270 | 7 | 14.3 |
| p2_sliding_median | 100% | ok | 56.9 | 710 | 437 | 13.8 |
| t3_instanced_wave | 100% | ok | 96.3 | 1264 | 49 | 14.3 |
| p3_topo_order | 100% | ok | 29.9 | 349 | 130 | 14.2 |
| t4_shader_water | 100% | ok | 77.3 | 997 | 134 | 14.4 |
| p4_gather_limited | 40% | ok | 158.2 | 2138 | 1686 | 14.0 |
| t5_raycast_click | 100% | ok | 63.3 | 789 | 41 | 14.3 |
| t6_terrain | 100% | ok | 800.5 | 11160 | 8901 | 14.1 |

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
  - note: src/t1_cube.ts(45,35): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
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

## t2_solar — 45%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- PASS at_least_5_meshes
- PASS sun_basic_or_emissive
- PASS point_light
- FAIL 4_bodies_move
- PASS moon_child_of_planet
- FAIL 3_different_speeds
- PASS resize
- FAIL no_console_errors
  - note: src/t2_solar.ts(165,37): error TS2304: Cannot find name 'elapsed'.
  - note: __ready never became true
  - note: pageerror: elapsed is not defined
  - note: pageerror: elapsed is not defined
  - note: pageerror: elapsed is not defined
  - note: pageerror: elapsed is not defined
  - note: pageerror: elapsed is not defined

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

## p4_gather_limited — 40%
- FAIL results in order
- FAIL respects limit
- FAIL sliding window, not batches
- PASS error: cancel + stop
- PASS edge cases
  - note: results in order: TimeoutError: 
  - note: respects limit: TimeoutError: 
  - note: sliding window, not batches: TimeoutError: 

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
