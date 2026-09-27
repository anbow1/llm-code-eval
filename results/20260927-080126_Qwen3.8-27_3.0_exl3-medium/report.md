# Qwen3.8-27_3.0_exl3-medium

- Date: 2026-09-27 08:08
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 6.7 min (generation 6.4 min)
- Tokens: 25409 total, 19724 of them thinking
- Speed: 86.2 tok/s decode, first token after 2.9 s on average
- Peak VRAM: 15.5 GB | Peak RAM: 14.9 GB (at start 14.5 GB) | Disk read: 0.2 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 82.1% |
| TypeScript + Three.js | 95.0% |
| **Overall** | **88.6%** |
| Only tasks it finished | 89.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 100% | ok | 10.7 | 822 | 371 | 105.2 |
| p1_parse_duration | 100% | ok | 30.2 | 2356 | 2125 | 88.9 |
| t2_solar | 100% | ok | 34.5 | 3085 | 1861 | 97.4 |
| p2_sliding_median | 29% | ok | 107.0 | 3328 | 3126 | 31.9 |
| t3_instanced_wave | 100% | ok | 32.7 | 2866 | 1902 | 95.8 |
| p3_topo_order | 100% | ok | 21.2 | 1735 | 1490 | 93.6 |
| t4_shader_water | 70% | ok | 18.6 | 1594 | 1004 | 100.6 |
| p4_gather_limited | 100% | ok | 41.4 | 3285 | 3148 | 84.6 |
| t5_raycast_click | 100% | ok | 32.0 | 2834 | 2097 | 97.2 |
| t6_terrain | 100% | ok | 55.1 | 3504 | 2600 | 67.2 |

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
- PASS even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- PASS invalid k
- FAIL performance 200k/1000
  - note: example odd k: IndexError: list index out of range
  - note: k=1 and k=n: IndexError: list index out of range
  - note: duplicates: IndexError: list index out of range
  - note: random vs brute force: IndexError: list index out of range
  - note: performance 200k/1000: IndexError: list index out of range

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

ERROR: 0:78: 'assign' : l-value required (can't modify an input "position")

  73: 
  74: void main() {
  75:   float wave = sin(position.x * 1.5 + uTime) * 0.3
  76:              + cos(position.z * 1.2 + uTime * 0.7) * 0.25
  77:              + sin((position.x + position.z) * 0.8 + uTime * 1.3) * 0.2;
> 78:   position.y += wave;
  79:   vHeight = wave;
  80:   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  81: }
  82: 


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
