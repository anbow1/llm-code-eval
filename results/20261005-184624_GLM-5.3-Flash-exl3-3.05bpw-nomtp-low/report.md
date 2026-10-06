# GLM-5.3-Flash-exl3-3.05bpw-nomtp-low

- Date: 2026-10-05 18:54
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort low)
- Total time: 8.5 min (generation 7.9 min)
- Tokens: 6046 total, 186 of them thinking
- Speed: 14.1 tok/s decode, first token after 5.0 s on average
- Peak VRAM: 29.0 GB | Peak RAM: 106.0 GB (at start 105.5 GB) | Disk read: 0.6 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 82.2% |
| TypeScript + Three.js | 89.4% |
| **Overall** | **85.8%** |
| Only tasks it finished | 86.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 45% | ok | 29.5 | 363 | 0 | 14.0 |
| p1_parse_duration | 89% | ok | 25.2 | 259 | 0 | 13.5 |
| t2_solar | 100% | ok | 79.5 | 1042 | 33 | 13.9 |
| p2_sliding_median | 100% | ok | 30.7 | 356 | 109 | 14.1 |
| t3_instanced_wave | 100% | ok | 61.6 | 833 | 0 | 14.6 |
| p3_topo_order | 100% | ok | 19.6 | 205 | 6 | 14.3 |
| t4_shader_water | 100% | ok | 55.5 | 734 | 0 | 14.4 |
| p4_gather_limited | 40% | ok | 28.7 | 322 | 10 | 13.9 |
| t5_raycast_click | 91% | ok | 51.5 | 660 | 23 | 14.2 |
| t6_terrain | 100% | ok | 94.9 | 1272 | 5 | 14.2 |

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
  - note: src/t1_cube.ts(40,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function

## p1_parse_duration — 89%
- FAIL valid '1h30m'
- PASS valid '2d'
- PASS valid '45s'
- PASS valid '1d 2h 3m 4s'
- PASS valid '0s'
- PASS valid '90m'
- PASS valid '  1h  '
- FAIL valid '1d4s'
- PASS valid '1h   30m'
- FAIL valid '10d23h59m59s'
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
  - note: valid '1h30m': ValueError: invalid part: '1h30m'
  - note: valid '1d4s': ValueError: invalid part: '1d4s'
  - note: valid '10d23h59m59s': ValueError: invalid part: '10d23h59m59s'

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

## p4_gather_limited — 40%
- FAIL results in order
- PASS respects limit
- PASS sliding window, not batches
- FAIL error: cancel + stop
- FAIL edge cases
  - note: results in order: AssertionError: 
  - note: error: cancel + stop: AssertionError: {'started': 2, 'cancelled': 0, 'finished': 1}
  - note: edge cases: AssertionError: 

## t5_raycast_click — 91%
- FAIL compiles_strict
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
  - note: src/t5_raycast_click.ts(40,23): error TS2339: Property 'color' does not exist on type 'Material<MaterialEventMap> | Material<MaterialEventMap>[]'.
  - note: src/t5_raycast_click.ts(57,23): error TS2339: Property 'color' does not exist on type 'Material<MaterialEventMap> | Material<MaterialEventMap>[]'.

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
