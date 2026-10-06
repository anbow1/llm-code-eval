# Qwen3.8-Flash-Next-UD-Q4_K_XL-strata-HARD

- Date: 2026-10-06 19:38
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 23.7 min (generation 23.5 min)
- Tokens: 110558 total, 103210 of them thinking
- Speed: 92.5 tok/s decode, first token after 4.8 s on average
- Peak VRAM: 31.3 GB | Peak RAM: 73.0 GB (at start 67.1 GB) | Disk read: 9.4 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 99.2% |
| TypeScript + Three.js | 73.8% |
| **Overall** | **86.5%** |
| Only tasks it finished | 86.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 60% | ok | 41.2 | 3271 | 780 | 99.3 |
| h_p1_interval_set | 100% | ok | 127.7 | 11728 | 11338 | 95.0 |
| h_t2_instanced_pick | 62% | ok | 18.7 | 1345 | 592 | 91.8 |
| h_p2_expr_eval | 98% | ok | 73.7 | 6993 | 5580 | 100.5 |
| h_t3_postfx_invert | 100% | ok | 45.4 | 3795 | 2894 | 92.1 |
| h_p3_line_diff | 100% | ok | 1101.0 | 83426 | 82026 | 76.0 |

## h_t1_physics — 60%
- PASS compiles_strict
- FAIL loads
- PASS renders
- FAIL resize
- PASS no_console_errors

## h_p1_interval_set — 100%
- PASS merge touching
- PASS split + half-open
- PASS empty ranges ignored
- PASS floats
- PASS swallow many
- PASS random vs brute force
- PASS performance 60k/200k

## h_t2_instanced_pick — 62%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS instanced_900
- PASS starts_gray
- FAIL click_turns_red
- FAIL red_visible_on_screen
- FAIL second_click_independent
- FAIL click_again_toggles_back
- FAIL background_does_nothing
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
