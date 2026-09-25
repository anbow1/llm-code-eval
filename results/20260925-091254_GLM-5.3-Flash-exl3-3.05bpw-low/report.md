# GLM-5.3-Flash-exl3-3.05bpw-low

- Date: 2026-09-25 09:26
- Model: GLM-5.3-Flash-exl3-3.05bpw
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 65536, think default, effort low)
- Total time: 13.7 min (generation 13.4 min)
- Tokens: 9567 total, 978 of them thinking
- Speed: 13.8 tok/s decode, first token after 8.5 s on average
- Peak VRAM: 27.0 GB | Peak RAM: 119.7 GB (at start 119.4 GB) | Disk read: 4.6 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 65.7% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **82.9%** |
| Only tasks it finished | 86.3% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 38.8 | 358 | 0 | 14.0 |
| p1_parse_duration | 63% | ok | 57.9 | 590 | 7 | 11.5 |
| t2_solar | 100% | ok | 59.6 | 738 | 3 | 14.7 |
| p2_sliding_median | 100% | ok | 244.4 | 3203 | 8 | 13.4 |
| t3_instanced_wave | 100% | ok | 53.2 | 660 | 0 | 15.0 |
| p3_topo_order | 100% | ok | 19.1 | 195 | 14 | 14.9 |
| t4_shader_water | 100% | ok | 61.5 | 783 | 0 | 15.0 |
| p4_gather_limited | 0% | ok | 120.1 | 1117 | 924 | 9.8 |
| t5_raycast_click | 100% | ok | 53.2 | 655 | 0 | 15.1 |
| t6_terrain | 100% | ok | 96.0 | 1268 | 22 | 14.7 |

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

## p1_parse_duration — 63%
- FAIL valid '1h30m'
- FAIL valid '2d'
- FAIL valid '45s'
- FAIL valid '1d 2h 3m 4s'
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
  - note: valid '1h30m': ValueError: invalid part: '1h30m'
  - note: valid '2d': ValueError: malformed duration
  - note: valid '45s': ValueError: malformed duration
  - note: valid '1d 2h 3m 4s': ValueError: malformed duration
  - note: valid '0s': ValueError: malformed duration
  - note: valid '90m': ValueError: malformed duration
  - note: valid '  1h  ': ValueError: malformed duration
  - note: valid '1d4s': ValueError: invalid part: '1d4s'
  - note: valid '1h   30m': ValueError: malformed duration
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

## p4_gather_limited — 0%
- FAIL results in order
- FAIL respects limit
- FAIL sliding window, not batches
- FAIL error: cancel + stop
- FAIL edge cases
  - note: results in order: AttributeError: module 'asyncio.exceptions' has no attribute 'FIRST_EXCEPTION'
  - note: respects limit: AttributeError: module 'asyncio.exceptions' has no attribute 'FIRST_EXCEPTION'
  - note: sliding window, not batches: AttributeError: module 'asyncio.exceptions' has no attribute 'FIRST_EXCEPTION'
  - note: error: cancel + stop: AttributeError: module 'asyncio.exceptions' has no attribute 'FIRST_EXCEPTION'
  - note: edge cases: AttributeError: module 'asyncio.exceptions' has no attribute 'FIRST_EXCEPTION'

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
