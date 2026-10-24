# GLM-5.3-Flash-exl3-4.05bpw-maya-HARD

- Date: 2026-10-23 21:48
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 25.5 min (generation 25.3 min)
- Tokens: 25927 total, 18801 of them thinking
- Speed: 17.6 tok/s decode, first token after 4.3 s on average
- Peak VRAM: 30.9 GB | Peak RAM: 150.1 GB (at start 148.9 GB) | Disk read: 0.6 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 85.7% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **92.9%** |
| Only tasks it finished | 92.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 210.3 | 3724 | 1643 | 18.1 |
| h_p1_interval_set | 57% | ok | 203.0 | 3559 | 2784 | 17.9 |
| h_t2_instanced_pick | 100% | ok | 77.0 | 1352 | 486 | 18.6 |
| h_p2_expr_eval | 100% | ok | 146.1 | 2410 | 977 | 17.0 |
| h_t3_postfx_invert | 100% | ok | 235.9 | 3960 | 2826 | 17.1 |
| h_p3_line_diff | 100% | ok | 646.3 | 10922 | 10085 | 17.0 |

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
- FAIL merge touching
- PASS split + half-open
- PASS empty ranges ignored
- FAIL floats
- PASS swallow many
- FAIL random vs brute force
- PASS performance 60k/200k
  - note: merge touching: AssertionError: 
  - note: floats: AssertionError: 
  - note: random vs brute force: AssertionError: 

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
