# GLM-5.3-Flash-exl3-3.05bpw-HARD

- Date: 2026-09-28 22:31
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 65536, think default, effort low)
- Total time: 26.5 min (generation 26.0 min)
- Tokens: 17312 total, 11839 of them thinking
- Speed: 13.5 tok/s decode, first token after 8.5 s on average
- Peak VRAM: 30.2 GB | Peak RAM: 115.6 GB (at start 115.0 GB) | Disk read: 1.0 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 99.2% |
| TypeScript + Three.js | 69.6% |
| **Overall** | **84.4%** |
| Only tasks it finished | 84.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 138.9 | 1954 | 11 | 14.9 |
| h_p1_interval_set | 100% | ok | 121.6 | 1425 | 785 | 12.5 |
| h_t2_instanced_pick | 20% | ok | 54.9 | 700 | 28 | 15.4 |
| h_p2_expr_eval | 98% | ok | 111.4 | 1421 | 557 | 13.9 |
| h_t3_postfx_invert | 89% | ok | 94.8 | 1180 | 546 | 13.9 |
| h_p3_line_diff | 100% | ok | 1040.8 | 10632~ | 9912 | 10.3 |

## h_t1_physics — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS 20_sphere_meshes
- PASS picture_animates
- PASS sim_api
- PASS stay_in_box
- PASS no_overlap
- PASS energy_conserved
- PASS balls_move
- PASS masses_differ
- PASS resize
- PASS no_console_errors

## h_p1_interval_set — 100%
- PASS merge touching
- PASS split + half-open
- PASS empty ranges ignored
- PASS floats
- PASS swallow many
- PASS random vs brute force
- PASS performance 60k/200k

## h_t2_instanced_pick — 20%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- PASS resize
- FAIL no_console_errors
  - note: src/h_t2_instanced_pick.ts(50,23): error TS2551: Property 'getAnimationLoop' does not exist on type 'WebGLRenderer'. Did you mean 'setAnimationLoop'?
  - note: __ready never became true
  - note: check crashed: IndexError: image index out of range
  - note: pageerror: renderer.getAnimationLoop is not a function
  - note: pageerror: renderer.getAnimationLoop is not a function
  - note: pageerror: renderer.getAnimationLoop is not a function
  - note: pageerror: renderer.getAnimationLoop is not a function
  - note: pageerror: renderer.getAnimationLoop is not a function

## h_p2_expr_eval — 98%
- PASS value '1+2*3'
- PASS value '(1+2)*3'
- PASS value '2^3^2'
- PASS value '-2^2'
- PASS value '(-2)^2'
- PASS value '2^-1'
- PASS value '10/4'
- PASS value '7 - 2 - 1'
- PASS value '64/4/2'
- PASS value '--3'
- PASS value '-+-3'
- PASS value '.5+7.'
- PASS value '3.25*4'
- PASS value 'max(1, 5, 3) - min(4, 2)'
- PASS value 'abs(-7/2)'
- PASS value '2*x^2 + y'
- PASS value '  ( ( 1 ) ) '
- PASS value '0.1+0.2'
- PASS value '2^0'
- PASS value '(1/3)^-2'
- PASS value '-x'
- PASS value 'max(-1)'
- PASS value '1-2^2^0'
- PASS value '-(2+3)*2'
- PASS value '2^(1+1)^2'
- PASS error ''
- PASS error '1 +'
- PASS error '* 2'
- PASS error '(1'
- PASS error '1)'
- PASS error '2 3'
- PASS error '1..2'
- FAIL error 'abs 3'
- PASS error '3 $ 4'
- PASS error 'abs(1, 2)'
- PASS error 'min()'
- PASS error 'foo(1)'
- PASS error '2^(1/2)'
- PASS error '1/0'
- PASS error '0^-1'
- PASS error 'q + 1'
- PASS error 'max(1,)'
- PASS 400 random expressions
  - note: error 'abs 3': AssertionError: 'abs 3': raised NameError, want ValueError

## h_t3_postfx_invert — 89%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS composer_exposed
- FAIL background_inverted_srgb
- PASS sphere_inverted_to_black
- PASS composer_resizes
- PASS resize
- PASS no_console_errors

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
