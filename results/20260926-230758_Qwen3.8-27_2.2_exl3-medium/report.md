# Qwen3.8-27_2.2_exl3-medium

- Date: 2026-09-26 23:17
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 9.6 min (generation 9.0 min)
- Tokens: 33097 total, 26750 of them thinking
- Speed: 81.2 tok/s decode, first token after 3.4 s on average
- Peak VRAM: 14.1 GB | Peak RAM: 16.3 GB (at start 13.3 GB) | Disk read: 0.2 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 75.8% |
| TypeScript + Three.js | 86.4% |
| **Overall** | **81.1%** |
| Only tasks it finished | 82.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 34.4 | 2855 | 2396 | 90.0 |
| p1_parse_duration | 89% | ok | 39.7 | 2612 | 2346 | 86.0 |
| t2_solar | 100% | ok | 42.3 | 3482 | 2455 | 88.2 |
| p2_sliding_median | 14% | ok | 165.3 | 2780 | 2646 | 17.1 |
| t3_instanced_wave | 100% | ok | 46.2 | 3830 | 2995 | 88.1 |
| p3_topo_order | 100% | ok | 15.3 | 1091 | 930 | 85.7 |
| t4_shader_water | 60% | ok | 31.3 | 2550 | 1404 | 89.3 |
| p4_gather_limited | 100% | ok | 72.5 | 5710 | 5490 | 81.7 |
| t5_raycast_click | 100% | ok | 29.9 | 2508 | 1800 | 92.4 |
| t6_terrain | 58% | ok | 63.9 | 5679 | 4288 | 93.0 |

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
  - note: valid '1h30m': ValueError: invalid duration format
  - note: valid '1d4s': ValueError: invalid duration format
  - note: valid '10d23h59m59s': ValueError: invalid duration format

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

## p2_sliding_median — 14%
- FAIL example odd k
- FAIL even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- FAIL performance 200k/1000
  - note: example odd k: UnboundLocalError: cannot access local variable 'lower_size' where it is not associated with a value
  - note: even k: UnboundLocalError: cannot access local variable 'lower_size' where it is not associated with a value
  - note: k=1 and k=n: UnboundLocalError: cannot access local variable 'lower_size' where it is not associated with a value
  - note: duplicates: UnboundLocalError: cannot access local variable 'lower_size' where it is not associated with a value
  - note: random vs brute force: UnboundLocalError: cannot access local variable 'lower_size' where it is not associated with a value
  - note: performance 200k/1000: UnboundLocalError: cannot access local variable 'lower_size' where it is not associated with a value

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

## t4_shader_water — 60%
- FAIL compiles_strict
- PASS loads
- FAIL renders
- PASS shader_material
- PASS uTime_uniform
- PASS uTime_advances
- PASS plane_128_segments
- FAIL picture_animates
- PASS resize
- FAIL no_console_errors
  - note: src/t4_shader_water.ts(90,42): error TS2551: Property 'autoResize' does not exist on type 'WebGLInfo'. Did you mean 'autoReset'?
  - note: src/t4_shader_water.ts(92,39): error TS2551: Property 'autoResize' does not exist on type 'WebGLInfo'. Did you mean 'autoReset'?
  - note: console.error: THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false

Material Name: 
Material Type: ShaderMaterial

Program Info Log: Vertex shader is not compiled.
VERTEX

ERROR: 0:82: 'assign' : l-value required (can't modify an input "position")

  77:     float w3 = sin((position.x + position.y) * 0.9 + uTime * 1.0) * 0.15;
  78:     float w4 = cos(position.x * 0.7 - position.y * 0.5 + uTime * 0.8) * 0.10;
  79: 
  80:     float displacement = w1 + w2 + w3 + w4;
  81: 
> 82:     position.z += displacement;
  83:     vHeight = displacement;
  84: 
  85:     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  86: }
  87: 


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
  - note: src/t6_terrain.ts(111,19): error TS2345: Argument of type 'Uint32Array<ArrayBufferLike>' is not assignable to parameter of type 'BufferAttribute<BufferAttributeEventMap> | number[] | null'.
  - note: __ready never became true
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
