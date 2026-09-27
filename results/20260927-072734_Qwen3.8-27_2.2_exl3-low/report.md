# Qwen3.8-27_2.2_exl3-low

- Date: 2026-09-27 07:40
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 12.4 min (generation 11.9 min)
- Tokens: 24359 total, 18905 of them thinking
- Speed: 80.6 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 14.9 GB | Peak RAM: 15.4 GB (at start 10.1 GB) | Disk read: 0.4 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 89.3% |
| TypeScript + Three.js | 93.1% |
| **Overall** | **91.2%** |
| Only tasks it finished | 91.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 11.4 | 731 | 297 | 93.0 |
| p1_parse_duration | 100% | ok | 35.1 | 2679 | 2509 | 82.9 |
| t2_solar | 100% | ok | 40.4 | 3290 | 2290 | 87.0 |
| p2_sliding_median | 57% | ok | 440.5 | 2593 | 2547 | 5.9 |
| t3_instanced_wave | 100% | ok | 32.9 | 2745 | 1918 | 91.3 |
| p3_topo_order | 100% | ok | 14.9 | 1078 | 915 | 88.4 |
| t4_shader_water | 100% | ok | 32.5 | 2627 | 1979 | 87.7 |
| p4_gather_limited | 100% | ok | 35.4 | 2662 | 2494 | 81.1 |
| t5_raycast_click | 100% | ok | 27.6 | 2342 | 1713 | 93.7 |
| t6_terrain | 58% | ok | 40.5 | 3612 | 2243 | 95.3 |

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

## p2_sliding_median — 57%
- FAIL example odd k
- PASS even k
- PASS k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: example odd k: AssertionError: [1, -1, -1, 5, 6, 7]
  - note: duplicates: IndexError: list index out of range
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

## t6_terrain — 58%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- PASS custom_buffer_geometry
- PASS indexed
- FAIL normals_point_up
- PASS vertex_colors
- PASS has_height
- PASS orbit_controls
- PASS lights
- PASS resize
- FAIL no_console_errors
  - note: src/t6_terrain.ts(107,19): error TS2345: Argument of type 'Uint32Array<ArrayBuffer>' is not assignable to parameter of type 'number[] | BufferAttribute<BufferAttributeEventMap> | null'.
  - note: __ready never became true
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
