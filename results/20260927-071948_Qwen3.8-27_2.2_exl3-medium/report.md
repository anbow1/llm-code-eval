# Qwen3.8-27_2.2_exl3-medium

- Date: 2026-09-27 07:26
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 6.4 min (generation 5.8 min)
- Tokens: 24571 total, 19405 of them thinking
- Speed: 81.9 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 14.2 GB | Peak RAM: 15.5 GB (at start 14.2 GB) | Disk read: 0.1 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 97.2% |
| TypeScript + Three.js | 88.1% |
| **Overall** | **92.6%** |
| Only tasks it finished | 91.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 20.4 | 1603 | 1186 | 90.3 |
| p1_parse_duration | 89% | ok | 27.6 | 2033 | 1810 | 82.2 |
| t2_solar | 100% | ok | 48.1 | 3805 | 2772 | 84.0 |
| p2_sliding_median | 100% | ok | 19.7 | 1487 | 1307 | 86.7 |
| t3_instanced_wave | 100% | ok | 33.2 | 2715 | 1861 | 89.1 |
| p3_topo_order | 100% | ok | 17.4 | 1247 | 1086 | 84.6 |
| t4_shader_water | 70% | ok | 26.5 | 2157 | 1267 | 90.9 |
| p4_gather_limited | 100% | ok | 55.9 | 4330 | 4097 | 81.1 |
| t5_raycast_click | 100% | ok | 32.0 | 2699 | 2083 | 92.6 |
| t6_terrain | 58% | ok | 69.2 | 2495 | 1936 | 37.6 |

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

## t4_shader_water — 70%
- PASS compiles_strict
- PASS loads
- FAIL renders
- PASS shader_material
- PASS uTime_uniform
- PASS uTime_advances
- PASS plane_128_segments
- FAIL picture_animates
- PASS resize
- FAIL no_console_errors
  - note: console.error: THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false

Material Name: 
Material Type: ShaderMaterial

Program Info Log: Vertex shader is not compiled.
VERTEX

ERROR: 0:81: 'assign' : l-value required (can't modify an input "position")

  76:     float w2 = cos(position.y * 1.2 + uTime * 1.5) * 0.12;
  77:     float w3 = sin((position.x + position.y) * 0.8 + uTime * 1.0) * 0.08;
  78:     float w4 = sin(position.x * 0.6 - position.y * 0.9 + uTime * 0.7) * 0.06;
  79: 
  80:     float displacement = w1 + w2 + w3 + w4;
> 81:     position.z += displacement;
  82: 
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
  - note: src/t6_terrain.ts(106,19): error TS2345: Argument of type 'Uint32Array<ArrayBufferLike>' is not assignable to parameter of type 'BufferAttribute<BufferAttributeEventMap> | number[] | null'.
  - note: __ready never became true
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
  - note: pageerror: Cannot read properties of undefined (reading 'byteLength')
