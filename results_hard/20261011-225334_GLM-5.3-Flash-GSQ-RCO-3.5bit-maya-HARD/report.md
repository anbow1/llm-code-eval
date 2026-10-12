# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-HARD

- Date: 2026-10-11 23:47
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort medium)
- Total time: 53.5 min (generation 53.1 min)
- Tokens: 74046 total, 48635 of them thinking
- Speed: 23.3 tok/s decode, first token after 3.6 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 100.1 GB (at start 98.9 GB) | Disk read: 0.4 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| Python | 100.0% |
| TypeScript + Three.js | 80.0% |
| **Overall** | **90.0%** |
| Only tasks it finished | 90.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 134.3 | 3023 | 1135 | 23.2 |
| h_p1_interval_set | 100% | ok | 209.4 | 4822 | 4229 | 23.4 |
| h_t2_instanced_pick | 100% | ok | 37.2 | 788 | 66 | 23.5 |
| h_p2_expr_eval | 100% | ok | 227.7 | 5224 | 4057 | 23.3 |
| h_t3_postfx_invert | 40% | ok | 322.9 | 7369 | 6214 | 23.1 |
| h_p3_line_diff | 100% | ok | 2253.8 | 52820 | 32934 | 23.5 |

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

## h_t3_postfx_invert — 40%
- PASS compiles_strict
- FAIL loads
- PASS renders
- FAIL resize
- FAIL no_console_errors
  - note: __ready never became true

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: generation got stuck repeating the same text (loop)
