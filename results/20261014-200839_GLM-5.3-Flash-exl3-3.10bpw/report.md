# GLM-5.3-Flash-exl3-3.10bpw

- Date: 2026-10-14 20:24
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 16.3 min (generation 15.9 min)
- Tokens: 12911 total, 6214 of them thinking
- Speed: 14.6 tok/s decode, first token after 7.3 s on average
- Peak VRAM: 30.0 GB | Peak RAM: 109.4 GB (at start 109.1 GB) | Disk read: 1.1 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 92.6% |
| TypeScript + Three.js | 98.3% |
| **Overall** | **95.5%** |
| Only tasks it finished | 96.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 45.7 | 501 | 38 | 14.0 |
| p1_parse_duration | 70% | ok | 77.6 | 1076 | 844 | 14.9 |
| t2_solar | 100% | ok | 99.5 | 1307 | 385 | 14.3 |
| p2_sliding_median | 100% | ok | 55.2 | 741 | 506 | 14.9 |
| t3_instanced_wave | 100% | ok | 79.6 | 1035 | 36 | 14.5 |
| p3_topo_order | 100% | ok | 29.9 | 364 | 108 | 14.8 |
| t4_shader_water | 90% | ok | 74.7 | 960 | 36 | 14.4 |
| p4_gather_limited | 100% | ok | 271.4 | 3939 | 3528 | 14.8 |
| t5_raycast_click | 100% | ok | 72.3 | 916 | 176 | 14.3 |
| t6_terrain | 100% | ok | 151.0 | 2072 | 557 | 14.6 |

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

## p1_parse_duration — 70%
- FAIL valid '1h30m'
- PASS valid '2d'
- FAIL valid '45s'
- PASS valid '1d 2h 3m 4s'
- FAIL valid '0s'
- FAIL valid '90m'
- FAIL valid '  1h  '
- FAIL valid '1d4s'
- FAIL valid '1h   30m'
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
  - note: valid '1h30m': ValueError: invalid duration string: '1h30m'
  - note: valid '45s': ValueError: invalid duration string: '45s'
  - note: valid '0s': ValueError: invalid duration string: '0s'
  - note: valid '90m': ValueError: invalid duration string: '90m'
  - note: valid '  1h  ': ValueError: invalid duration string: '  1h  '
  - note: valid '1d4s': ValueError: invalid duration string: '1d4s'
  - note: valid '1h   30m': ValueError: invalid duration string: '1h   30m'
  - note: valid '10d23h59m59s': ValueError: invalid duration string: '10d23h59m59s'

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

## t4_shader_water — 90%
- FAIL compiles_strict
- PASS loads
- PASS renders
- PASS shader_material
- PASS uTime_uniform
- PASS uTime_advances
- PASS plane_128_segments
- PASS picture_animates
- PASS resize
- PASS no_console_errors
  - note: src/t4_shader_water.ts(107,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.

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
