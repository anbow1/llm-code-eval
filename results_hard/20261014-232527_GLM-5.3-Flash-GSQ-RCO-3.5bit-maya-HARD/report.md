# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-HARD

- Date: 2026-10-15 00:06
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 40.6 min (generation 40.4 min)
- Tokens: 55181 total, 48291 of them thinking
- Speed: 22.6 tok/s decode, first token after 4.0 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 113.8 GB (at start 113.5 GB) | Disk read: 86.3 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 81.8% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **90.9%** |
| Only tasks it finished | 90.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 210.8 | 4544 | 2245 | 22.0 |
| h_p1_interval_set | 100% | ok | 1533.6 | 35571 | 34837 | 23.3 |
| h_t2_instanced_pick | 100% | ok | 47.5 | 947 | 191 | 21.8 |
| h_p2_expr_eval | 95% | ok | 176.8 | 4008 | 2777 | 23.2 |
| h_t3_postfx_invert | 100% | ok | 194.6 | 4239 | 3276 | 22.3 |
| h_p3_line_diff | 50% | ok | 262.3 | 5872 | 4965 | 22.7 |

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
- PASS value 'max(1, 5, 3) - min(4, 2)'
- PASS value 'abs(-7/2)'
- PASS value '2*x^2 + y'
- FAIL value '  ( ( 1 ) ) '
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
  - note: value '  ( ( 1 ) ) ': ValueError: invalid character at position 11: ' '
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

## h_p3_line_diff — 50%
- PASS empty
- PASS classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: random small, repeated lines: AssertionError: (['a', 'c', 'a'], ['b', 'a', 'b', 'a', 'a', 'a'])
  - note: random medium vs LCS: AssertionError: 
  - note: performance 20k lines, 50 changes: AssertionError: 
