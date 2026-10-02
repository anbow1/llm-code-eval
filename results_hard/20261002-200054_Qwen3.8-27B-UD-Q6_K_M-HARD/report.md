# Qwen3.8-27B-UD-Q6_K_M-HARD

- Date: 2026-10-02 20:09
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 9.0 min (generation 8.8 min)
- Tokens: 50736 total, 43262 of them thinking
- Speed: 102.4 tok/s decode, first token after 2.4 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 42.5 GB (at start 42.1 GB) | Disk read: 0.2 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 95.2% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **97.6%** |
| Only tasks it finished | 97.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 37.0 | 3954 | 1564 | 114.6 |
| h_p1_interval_set | 86% | ok | 116.5 | 10335 | 9619 | 90.6 |
| h_t2_instanced_pick | 100% | ok | 27.1 | 2706 | 1910 | 110.0 |
| h_p2_expr_eval | 100% | ok | 117.7 | 12465 | 10736 | 108.1 |
| h_t3_postfx_invert | 100% | ok | 40.4 | 3659 | 2779 | 96.6 |
| h_p3_line_diff | 100% | ok | 189.4 | 17617 | 16654 | 94.2 |

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

## h_p1_interval_set — 86%
- PASS merge touching
- PASS split + half-open
- PASS empty ranges ignored
- PASS floats
- PASS swallow many
- FAIL random vs brute force
- PASS performance 60k/200k
  - note: random vs brute force: AssertionError: ([('a', 42, 44), ('a', 3, 46), ('r', 19, 41), ('r', 43, 52), ('a', 18, 45), ('a', 42, 56), ('a', 1, 60), ('a', 10, 22), ('r', 7, 31)], [(1, 7)], [(1, 7), (31, 60)])

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

## h_p2_expr_eval — 100%
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
- PASS error 'abs 3'
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
