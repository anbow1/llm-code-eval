# GLM-5.3-Flash-exl3-3.05bpw-maya-HARD

- Date: 2026-10-12 19:19
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 41.4 min (generation 41.2 min)
- Tokens: 47864 total, 40348 of them thinking
- Speed: 20.0 tok/s decode, first token after 3.8 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 109.4 GB (at start 108.1 GB) | Disk read: 0.7 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 77.0% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **88.5%** |
| Only tasks it finished | 88.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 146.5 | 2828 | 358 | 19.8 |
| h_p1_interval_set | 100% | ok | 269.0 | 5449 | 4670 | 20.5 |
| h_t2_instanced_pick | 100% | ok | 53.5 | 995 | 189 | 20.0 |
| h_p2_expr_eval | 98% | ok | 92.4 | 1816 | 817 | 20.5 |
| h_t3_postfx_invert | 100% | ok | 133.1 | 2547 | 1492 | 19.7 |
| h_p3_line_diff | 33% | ok | 1777.9 | 34229 | 32822 | 19.3 |

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

## h_p3_line_diff — 33%
- PASS empty
- FAIL classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: classic example: IndexError: list assignment index out of range
  - note: random small, repeated lines: IndexError: list assignment index out of range
  - note: random medium vs LCS: IndexError: list assignment index out of range
  - note: performance 20k lines, 50 changes: IndexError: list assignment index out of range
