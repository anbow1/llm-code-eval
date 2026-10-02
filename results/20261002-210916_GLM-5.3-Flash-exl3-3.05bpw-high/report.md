# GLM-5.3-Flash-exl3-3.05bpw-high

- Date: 2026-10-02 21:40
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 31.0 min (generation 30.6 min)
- Tokens: 22583 total, 15597 of them thinking
- Speed: 13.4 tok/s decode, first token after 7.7 s on average
- Peak VRAM: 30.2 GB | Peak RAM: 115.2 GB (at start 112.7 GB) | Disk read: 5.3 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 100.0% |
| TypeScript + Three.js | 98.5% |
| **Overall** | **99.2%** |
| Only tasks it finished | 99.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 81.7 | 1052 | 575 | 14.2 |
| p1_parse_duration | 100% | ok | 84.3 | 870 | 679 | 11.2 |
| t2_solar | 100% | ok | 88.8 | 1192 | 169 | 14.9 |
| p2_sliding_median | 100% | ok | 708.7 | 8852~ | 8459 | 12.6 |
| t3_instanced_wave | 91% | ok | 91.9 | 1188 | 179 | 14.3 |
| p3_topo_order | 100% | ok | 25.2 | 281 | 82 | 14.4 |
| t4_shader_water | 100% | ok | 76.6 | 1002 | 60 | 14.7 |
| p4_gather_limited | 100% | ok | 266.3 | 2854 | 2551 | 11.0 |
| t5_raycast_click | 100% | ok | 81.8 | 977 | 69 | 13.5 |
| t6_terrain | 100% | ok | 329.9 | 4315 | 2774 | 13.5 |

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

## t3_instanced_wave — 91%
- FAIL compiles_strict
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
  - note: src/t3_instanced_wave.ts(104,57): error TS2694: Namespace '"C:/Users/bigbo/Documents/AI/llm-code-eval/ts_env/node_modules/@types/three/build/three.module"' has no exported member 'XRFrame'.

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
