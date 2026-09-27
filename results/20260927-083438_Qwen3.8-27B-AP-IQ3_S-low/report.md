# Qwen3.8-27B-AP-IQ3_S.gguf-low

- Date: 2026-09-27 08:41
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 6.8 min (generation 6.4 min)
- Tokens: 27049 total, 19678 of them thinking
- Speed: 75.2 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 15.3 GB | Peak RAM: 22.6 GB (at start 17.8 GB) | Disk read: 0.2 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 82.1% |
| TypeScript + Three.js | 95.0% |
| **Overall** | **88.6%** |
| Only tasks it finished | 89.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 13.2 | 712 | 241 | 68.7 |
| p1_parse_duration | 100% | ok | 40.0 | 2274 | 1983 | 61.1 |
| t2_solar | 100% | ok | 55.0 | 3463 | 2092 | 66.3 |
| p2_sliding_median | 29% | ok | 51.4 | 3842 | 3251 | 78.8 |
| t3_instanced_wave | 100% | ok | 40.6 | 3083 | 1946 | 81.3 |
| p3_topo_order | 100% | ok | 23.8 | 1537 | 1332 | 72.2 |
| t4_shader_water | 70% | ok | 20.7 | 1450 | 667 | 80.6 |
| p4_gather_limited | 100% | ok | 47.7 | 3130 | 2936 | 69.4 |
| t5_raycast_click | 100% | ok | 35.3 | 2772 | 1860 | 85.1 |
| t6_terrain | 100% | ok | 56.9 | 4786 | 3370 | 88.0 |

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

## p2_sliding_median — 29%
- FAIL example odd k
- FAIL even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- PASS performance 200k/1000
  - note: example odd k: AssertionError: [1.0, -1.0, -1.0, 3.0, 5.0, 7.0]
  - note: even k: IndexError: list index out of range
  - note: k=1 and k=n: IndexError: index out of range
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

ERROR: 0:79: 'assign' : l-value required (can't modify an input "position")

  74:   void main() {
  75:     float wave = sin(position.x * 2.0 + uTime * 1.2) * 0.35
  76:                + cos(position.y * 3.0 + uTime * 1.8) * 0.25
  77:                + sin((position.x + position.y) * 1.5 + uTime * 0.7) * 0.15;
  78: 
> 79:     position.z += wave;
  80:     vHeight = wave;
  81: 
  82:     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  83:   }
  84: 


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
