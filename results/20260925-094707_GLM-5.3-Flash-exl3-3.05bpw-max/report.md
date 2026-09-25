# GLM-5.3-Flash-exl3-3.05bpw-max

- Date: 2026-09-25 13:12
- Model: GLM-5.3-Flash-exl3-3.05bpw
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 65536, think default, effort max)
- Total time: 205.8 min (generation 205.4 min)
- Tokens: 65806 total, 62226 of them thinking
- Speed: 8.6 tok/s decode, first token after 7.7 s on average
- Peak VRAM: 27.0 GB | Peak RAM: 120.5 GB (at start 116.6 GB) | Disk read: 9.0 GB
- Tasks: 9/10 answered, 0 hit max_tokens, 1 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 75.0% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **87.5%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 131.7 | 1808 | 1301 | 14.6 |
| p1_parse_duration | 100% | ok | 2298.6 | 6285 | 6174 | 2.7 |
| t2_solar | 100% | ok | 2131.3 | 5678 | 5376 | 2.7 |
| p2_sliding_median | 100% | ok | 334.8 | 4354 | 3945 | 13.2 |
| t3_instanced_wave | 100% | ok | 883.9 | 6334 | 5931 | 7.2 |
| p3_topo_order | 100% | ok | 260.8 | 3384 | 3107 | 13.3 |
| t4_shader_water | 100% | ok | 204.1 | 2968 | 2237 | 15.2 |
| p4_gather_limited | 0% | task_timeout | 3600.1 | 22099~ | 22099 | 6.1 |
| t5_raycast_click | 100% | ok | 1240.3 | 6143 | 5823 | 5.0 |
| t6_terrain | 100% | ok | 1239.6 | 6753 | 6233 | 5.5 |

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

## p4_gather_limited — 0%
- FAIL results in order
- FAIL respects limit
- FAIL sliding window, not batches
- FAIL error: cancel + stop
- FAIL edge cases
  - note: stopped after 60 min task timeout
  - note: results in order: AttributeError: module 'solution' has no attribute 'gather_limited'
  - note: respects limit: AttributeError: module 'solution' has no attribute 'gather_limited'
  - note: sliding window, not batches: AttributeError: module 'solution' has no attribute 'gather_limited'
  - note: error: cancel + stop: AttributeError: module 'solution' has no attribute 'gather_limited'
  - note: edge cases: AttributeError: module 'solution' has no attribute 'gather_limited'

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
