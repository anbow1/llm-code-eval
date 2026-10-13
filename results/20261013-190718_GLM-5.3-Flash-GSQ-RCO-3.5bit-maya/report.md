# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya

- Date: 2026-10-13 19:22
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 15.1 min (generation 14.6 min)
- Tokens: 18326 total, 12107 of them thinking
- Speed: 21.8 tok/s decode, first token after 3.9 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 113.8 GB (at start 113.2 GB) | Disk read: 58.0 GB
- Tasks: 9/10 answered, 1 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| Python | 100.0% |
| TypeScript + Three.js | 74.2% |
| **Overall** | **87.1%** |
| Only tasks it finished | 93.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 45% | ok | 22.5 | 413 | 8 | 22.3 |
| p1_parse_duration | 100% | ok | 32.2 | 613 | 397 | 21.6 |
| t2_solar | 100% | ok | 85.9 | 1823 | 260 | 22.3 |
| p2_sliding_median | 100% | ok | 86.7 | 1803 | 1213 | 21.7 |
| t3_instanced_wave | 100% | ok | 106.3 | 2200 | 1229 | 21.5 |
| p3_topo_order | 100% | ok | 19.7 | 335 | 23 | 20.9 |
| t4_shader_water | 100% | ok | 44.2 | 889 | 28 | 22.1 |
| p4_gather_limited | 100% | ok | 111.1 | 2421 | 2050 | 22.5 |
| t5_raycast_click | 100% | ok | 109.3 | 2253 | 1323 | 21.4 |
| t6_terrain | 0% | max_tokens | 256.5 | 5576 | 5576 | 22.1 |

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
  - note: src/t1_cube.ts(48,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
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

## t6_terrain — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: hit max_tokens (98304) while still thinking, no answer
  - note: no code in the answer
