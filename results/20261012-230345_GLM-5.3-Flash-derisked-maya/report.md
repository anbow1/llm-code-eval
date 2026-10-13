# GLM-5.3-Flash-derisked-maya

- Date: 2026-10-12 23:29
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 26.1 min (generation 24.0 min)
- Tokens: 34153 total, 27089 of them thinking
- Speed: 24.2 tok/s decode, first token after 3.5 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 127.4 GB (at start 100.4 GB) | Disk read: 7.1 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 75.0% |
| TypeScript + Three.js | 89.5% |
| **Overall** | **82.3%** |
| Only tasks it finished | 83.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 45% | ok | 26.5 | 537 | 59 | 23.5 |
| p1_parse_duration | 100% | ok | 65.0 | 1458 | 1204 | 23.7 |
| t2_solar | 100% | ok | 85.3 | 1974 | 755 | 24.2 |
| p2_sliding_median | 100% | ok | 1040.7 | 25308 | 24951 | 24.4 |
| t3_instanced_wave | 100% | ok | 38.3 | 868 | 28 | 25.0 |
| p3_topo_order | 0% | ok | 37.8 | 809 | 35 | 23.5 |
| t4_shader_water | 100% | ok | 38.6 | 837 | 14 | 24.0 |
| p4_gather_limited | 100% | ok | 16.1 | 308 | 0 | 24.3 |
| t5_raycast_click | 100% | ok | 35.1 | 779 | 20 | 24.7 |
| t6_terrain | 92% | ok | 55.4 | 1275 | 23 | 24.6 |

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
  - note: src/t1_cube.ts(54,35): error TS2339: Property 'clock' does not exist on type 'WebGLRenderer'.
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

## p3_topo_order — 0%
- FAIL timeout
  - note: tests timed out (90 s)

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
  - note: src/t6_terrain.ts(128,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
