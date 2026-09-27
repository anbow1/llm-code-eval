# Qwen3.8-27_3.0_exl3_qv44-low-HARD

- Date: 2026-09-27 10:41
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 10.6 min (generation 10.5 min)
- Tokens: 18515 total, 15433 of them thinking
- Speed: 44.9 tok/s decode, first token after 2.9 s on average
- Peak VRAM: 15.6 GB | Peak RAM: 15.4 GB (at start 9.7 GB) | Disk read: 4.1 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 84.2% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **92.1%** |
| Only tasks it finished | 92.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 65.6 | 2422 | 1448 | 38.7 |
| h_p1_interval_set | 57% | ok | 233.5 | 3468 | 3232 | 15.0 |
| h_t2_instanced_pick | 100% | ok | 32.9 | 2913 | 2133 | 97.2 |
| h_p2_expr_eval | 95% | ok | 81.5 | 3139 | 2635 | 40.0 |
| h_t3_postfx_invert | 100% | ok | 61.7 | 3384 | 2944 | 57.5 |
| h_p3_line_diff | 100% | ok | 152.3 | 3189 | 3041 | 21.3 |

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

## h_p1_interval_set — 57%
- PASS merge touching
- PASS split + half-open
- PASS empty ranges ignored
- PASS floats
- FAIL swallow many
- FAIL random vs brute force
- FAIL performance 60k/200k
  - note: swallow many: AssertionError: 
  - note: random vs brute force: AssertionError: ([('a', 25, 41), ('a', 4, 52), ('r', 6, 23), ('r', 3, 58), ('r', 2, 13), ('a', 26, 27), ('a', 5, 15), ('r', 3, 27), ('r', 7, 60), ('a', 40, 40), ('r', 3, 60)], [(25, 41), (25, 41)], [])
  - note: performance 60k/200k: AssertionError: (12, 12)

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

## h_p2_expr_eval — 95%
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
- FAIL value 'max(1, 5, 3) - min(4, 2)'
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
- PASS error 'abs 3'
- PASS error '3 $ 4'
- PASS error 'abs(1, 2)'
- PASS error 'min()'
- FAIL error 'foo(1)'
- PASS error '2^(1/2)'
- PASS error '1/0'
- PASS error '0^-1'
- PASS error 'q + 1'
- PASS error 'max(1,)'
- PASS 400 random expressions
  - note: value 'max(1, 5, 3) - min(4, 2)': ValueError: Unexpected character ',' at position 5
  - note: error 'foo(1)': AssertionError: 'foo(1)': raised NameError, want ValueError

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
