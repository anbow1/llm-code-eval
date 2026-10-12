# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-HARD

- Date: 2026-10-11 12:36
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort medium)
- Total time: 19.6 min (generation 19.4 min)
- Tokens: 22684 total, 16221 of them thinking
- Speed: 19.8 tok/s decode, first token after 4.5 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 114.4 GB (at start 113.5 GB) | Disk read: 184.3 GB
- Tasks: 5/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| Python | 66.7% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **83.3%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 177.2 | 3330 | 1187 | 19.3 |
| h_p1_interval_set | 100% | ok | 176.0 | 3552 | 2789 | 20.7 |
| h_t2_instanced_pick | 100% | ok | 94.2 | 1712 | 788 | 19.1 |
| h_p2_expr_eval | 100% | ok | 254.4 | 5000 | 3576 | 20.0 |
| h_t3_postfx_invert | 100% | ok | 243.3 | 4599 | 3390 | 19.3 |
| h_p3_line_diff | 0% | no_answer | 221.3 | 4491~ | 4491 | 20.7 |

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

## h_p3_line_diff — 0%
- FAIL harness_crashed
  - note: model stopped inside its thinking and never wrote an answer
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results_hard\20261011-121653_GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-HARD\h_p3_line_diff\tests.py", line 15, in <module>
    D = S_mod.diff_lines
        ^^^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'diff_lines'

