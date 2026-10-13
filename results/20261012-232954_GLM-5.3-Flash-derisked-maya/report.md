# GLM-5.3-Flash-derisked-maya

- Date: 2026-10-12 23:38
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 9.1 min (generation 8.7 min)
- Tokens: 11860 total, 4822 of them thinking
- Speed: 24.2 tok/s decode, first token after 3.5 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 95.5 GB (at start 94.5 GB) | Disk read: 0.4 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 80.0% |
| TypeScript + Three.js | 95.7% |
| **Overall** | **87.9%** |
| Only tasks it finished | 89.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 91% | ok | 24.4 | 521 | 4 | 24.9 |
| p1_parse_duration | 100% | ok | 28.7 | 611 | 323 | 24.1 |
| t2_solar | 100% | ok | 67.0 | 1560 | 535 | 24.6 |
| p2_sliding_median | 100% | ok | 24.3 | 503 | 307 | 24.0 |
| t3_instanced_wave | 100% | ok | 41.3 | 922 | 119 | 24.4 |
| p3_topo_order | 100% | ok | 17.4 | 325 | 143 | 23.1 |
| t4_shader_water | 100% | ok | 146.1 | 3419 | 2460 | 24.0 |
| p4_gather_limited | 20% | ok | 38.5 | 842 | 0 | 24.0 |
| t5_raycast_click | 100% | ok | 38.8 | 859 | 98 | 24.4 |
| t6_terrain | 83% | ok | 96.4 | 2298 | 833 | 24.8 |

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
  - note: src/t1_cube.ts(54,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.

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

## p4_gather_limited — 20%
- FAIL results in order
- FAIL respects limit
- FAIL sliding window, not batches
- PASS error: cancel + stop
- FAIL edge cases
  - note: results in order: ValueError: Set of Tasks/Futures is empty.
  - note: respects limit: ValueError: Set of Tasks/Futures is empty.
  - note: sliding window, not batches: ValueError: Set of Tasks/Futures is empty.
  - note: edge cases: ValueError: Set of Tasks/Futures is empty.

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

## t6_terrain — 83%
- FAIL compiles_strict
- PASS loads
- FAIL renders
- PASS custom_buffer_geometry
- PASS indexed
- PASS normals_point_up
- PASS vertex_colors
- PASS has_height
- PASS orbit_controls
- PASS lights
- PASS resize
- PASS no_console_errors
  - note: src/t6_terrain.ts(147,26): error TS2345: Argument of type 'XRFrame' is not assignable to parameter of type 'number'.
