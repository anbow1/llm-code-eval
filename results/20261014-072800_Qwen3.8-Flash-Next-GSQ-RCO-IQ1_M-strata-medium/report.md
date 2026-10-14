# Qwen3.8-Flash-Next-GSQ-RCO-IQ1_M-strata-medium

- Date: 2026-10-14 07:32
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 4.4 min (generation 3.3 min)
- Tokens: 29921 total, 22711 of them thinking
- Speed: 174.3 tok/s decode, first token after 2.4 s on average
- Peak VRAM: 30.7 GB | Peak RAM: 42.1 GB (at start 41.1 GB) | Disk read: 3.0 GB
- Tasks: 10/10 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 75.0% |
| TypeScript + Three.js | 15.2% |
| **Overall** | **45.1%** |
| Only tasks it finished | 39.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t1_cube | 0% | ok | 4.3 | 301 | 124 | 180.6 |
| p1_parse_duration | 100% | ok | 27.1 | 3997 | 3792 | 162.0 |
| t2_solar | 0% | ok | 18.7 | 2819 | 1648 | 173.1 |
| p2_sliding_median | 0% | ok | 21.3 | 3050 | 2344 | 161.0 |
| t3_instanced_wave | 91% | ok | 17.1 | 2554 | 1480 | 174.2 |
| p3_topo_order | 100% | ok | 11.6 | 1564 | 1384 | 169.4 |
| t4_shader_water | 0% | ok | 10.2 | 1441 | 409 | 184.5 |
| p4_gather_limited | 100% | ok | 52.0 | 8038 | 7639 | 161.9 |
| t5_raycast_click | 0% | ok | 20.6 | 3325 | 2441 | 183.2 |
| t6_terrain | 0% | ok | 17.1 | 2832 | 1450 | 193.4 |

## t1_cube — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL no_console_errors
- FAIL renders
- FAIL resize
  - note: src/t1_cube.ts(28,45): error TS1160: Unterminated template literal.
  - note: esbuild: Build failed with 1 error:
src/t1_cube.ts:28:44: ERROR: Unterminated string literal

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

## t2_solar — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: src/t2_solar.ts(8,36): error TS2339: Property 'canvas' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'.

## p2_sliding_median — 0%
- FAIL example odd k
- FAIL even k
- FAIL k=1 and k=n
- FAIL duplicates
- FAIL random vs brute force
- FAIL invalid k
- FAIL performance 200k/1000
  - note: example odd k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: even k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: k=1 and k=n: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: duplicates: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: random vs brute force: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: invalid k: AttributeError: module 'solution' has no attribute 'sliding_median'
  - note: performance 200k/1000: AttributeError: module 'solution' has no attribute 'sliding_median'

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
  - note: src/t3_instanced_wave.ts(64,3): error TS18047: 'mesh.instanceColor' is possibly 'null'.

## p3_topo_order — 100%
- PASS empty / no edges
- PASS lexicographic
- PASS duplicate edges
- PASS cycles
- PASS random vs brute force
- PASS performance 200k/400k

## t4_shader_water — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL no_console_errors
- FAIL renders
- FAIL resize
  - note: src/t4_shader_water.ts(1,28): error TS1005: ';' expected.
  - note: src/t4_shader_water.ts(1,38): error TS1005: ';' expected.
  - note: src/t4_shader_water.ts(2,10): error TS1003: Identifier expected.
  - note: src/t4_shader_water.ts(2,32): error TS1005: ';' expected.
  - note: src/t4_shader_water.ts(2,42): error TS1005: ';' expected.
  - note: esbuild: Build failed with 1 error:
src/t4_shader_water.ts:1:27: ERROR: Expected ";" but found ":"

## p4_gather_limited — 100%
- PASS results in order
- PASS respects limit
- PASS sliding window, not batches
- PASS error: cancel + stop
- PASS edge cases

## t5_raycast_click — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: src/t5_raycast_click.ts(7,36): error TS2339: Property 'canvas' does not exist on type 'WebGLRenderer'.
  - note: src/t5_raycast_click.ts(66,10): error TS2339: Property 'canvas' does not exist on type 'WebGLRenderer'.
  - note: src/t5_raycast_click.ts(67,27): error TS2339: Property 'canvas' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'.

## t6_terrain — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: src/t6_terrain.ts(111,36): error TS2339: Property 'canvas' does not exist on type 'WebGLRenderer'.
  - note: src/t6_terrain.ts(114,53): error TS2339: Property 'canvas' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'.
