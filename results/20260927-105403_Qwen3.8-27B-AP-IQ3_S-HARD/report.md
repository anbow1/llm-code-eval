# Qwen3.8-27B-AP-IQ3_S-HARD

- Date: 2026-09-27 11:07
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 13.7 min (generation 13.6 min)
- Tokens: 59503 total, 52199 of them thinking
- Speed: 77.8 tok/s decode, first token after 2.8 s on average
- Peak VRAM: 15.3 GB | Peak RAM: 26.3 GB (at start 22.1 GB) | Disk read: 0.2 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 88.1% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **94.1%** |
| Only tasks it finished | 94.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 69.9 | 6021 | 3377 | 89.9 |
| h_p1_interval_set | 100% | ok | 250.2 | 17503 | 16735 | 70.7 |
| h_t2_instanced_pick | 100% | ok | 38.1 | 2915 | 2029 | 82.6 |
| h_p2_expr_eval | 98% | ok | 172.0 | 13063 | 11802 | 77.2 |
| h_t3_postfx_invert | 100% | ok | 49.7 | 3501 | 2662 | 74.7 |
| h_p3_line_diff | 67% | ok | 233.9 | 16500 | 15594 | 71.4 |

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

## h_t2_instanced_pick — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS instanced_900
- PASS starts_gray
- PASS click_turns_red
- PASS red_visible_on_screen
- PASS second_click_independent
- PASS click_again_toggles_back
- PASS background_does_nothing
- PASS single_mesh
- PASS resize
- PASS no_console_errors

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

## h_t3_postfx_invert — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS composer_exposed
- PASS background_inverted_srgb
- PASS sphere_inverted_to_black
- PASS composer_resizes
- PASS resize
- PASS no_console_errors

## h_p3_line_diff — 67%
- PASS empty
- PASS classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: random small, repeated lines: RuntimeError: Internal backtracking error
  - note: random medium vs LCS: RuntimeError: Internal backtracking error
