# Qwen3.8-Flash-Next-UD-Q4_K_XL-strata

- Date: 2026-10-06 20:03
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 7.7 min (generation 7.1 min)
- Tokens: 32177 total, 24192 of them thinking
- Speed: 84.3 tok/s decode, first token after 3.7 s on average
- Peak VRAM: 31.3 GB | Peak RAM: 81.9 GB (at start 78.0 GB) | Disk read: 2.3 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 92.9% |
| TypeScript + Three.js | 94.4% |
| **Overall** | **93.7%** |
| Only tasks it finished | 93.8% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 11.2 | 666 | 146 | 88.1 |
| p1_parse_duration | 100% | ok | 69.7 | 3935 | 3664 | 59.6 |
| t2_solar | 100% | ok | 33.4 | 2315 | 1144 | 78.6 |
| p2_sliding_median | 71% | ok | 146.6 | 12721 | 12010 | 88.9 |
| t3_instanced_wave | 100% | ok | 19.7 | 1395 | 253 | 88.2 |
| p3_topo_order | 100% | ok | 25.5 | 1794 | 1595 | 81.0 |
| t4_shader_water | 100% | ok | 21.1 | 1510 | 418 | 87.1 |
| p4_gather_limited | 100% | ok | 38.0 | 3037 | 2613 | 88.2 |
| t5_raycast_click | 100% | ok | 19.5 | 1360 | 505 | 86.8 |
| t6_terrain | 67% | ok | 39.7 | 3444 | 1844 | 96.4 |

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

## p2_sliding_median — 71%
- PASS example odd k
- FAIL even k
- PASS k=1 and k=n
- PASS duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: even k: IndexError: list index out of range
  - note: random vs brute force: IndexError: list index out of range

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
  - note: src/t6_terrain.ts(148,26): error TS2339: Property 'clock' does not exist on type 'WebGLRenderer'.
  - note: src/t6_terrain.ts(149,28): error TS2339: Property 'clock' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
  - note: pageerror: Cannot read properties of undefined (reading 'getDelta')
