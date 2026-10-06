# Qwen3.8-Flash-Next-UD-Q4_K_XL-strata-HARD

- Date: 2026-10-06 19:47
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 7.7 min (generation 7.5 min)
- Tokens: 40306 total, 33663 of them thinking
- Speed: 92.8 tok/s decode, first token after 4.0 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 75.6 GB (at start 72.1 GB) | Disk read: 2.0 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 99.2% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **99.6%** |
| Only tasks it finished | 99.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 39.6 | 3342 | 622 | 94.8 |
| h_p1_interval_set | 100% | ok | 165.7 | 15538 | 14891 | 96.0 |
| h_t2_instanced_pick | 100% | ok | 19.9 | 1391 | 643 | 87.5 |
| h_p2_expr_eval | 98% | ok | 61.1 | 5685 | 4640 | 99.4 |
| h_t3_postfx_invert | 100% | ok | 54.0 | 4178 | 3228 | 83.6 |
| h_p3_line_diff | 100% | ok | 110.1 | 10172 | 9639 | 95.7 |

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

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
