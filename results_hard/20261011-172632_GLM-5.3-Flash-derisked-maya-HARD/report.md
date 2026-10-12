# GLM-5.3-Flash-derisked-maya-HARD

- Date: 2026-10-11 17:47
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort medium)
- Total time: 20.8 min (generation 20.6 min)
- Tokens: 26589 total, 18777 of them thinking
- Speed: 21.9 tok/s decode, first token after 3.7 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 102.0 GB (at start 101.5 GB) | Disk read: 0.1 GB
- Tasks: 5/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| Python | 57.4% |
| TypeScript + Three.js | 87.2% |
| **Overall** | **72.3%** |
| Only tasks it finished | 86.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 99.0 | 2081 | 143 | 21.9 |
| h_p1_interval_set | 100% | ok | 145.5 | 3013 | 0 | 21.2 |
| h_t2_instanced_pick | 62% | ok | 41.6 | 835 | 92 | 22.0 |
| h_p2_expr_eval | 72% | ok | 89.8 | 1927 | 878 | 22.4 |
| h_t3_postfx_invert | 100% | ok | 112.1 | 2384 | 1315 | 22.0 |
| h_p3_line_diff | 0% | no_answer | 750.0 | 16349~ | 16349 | 21.9 |

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

## h_p2_expr_eval — 72%
- FAIL value '1+2*3'
- FAIL value '(1+2)*3'
- PASS value '2^3^2'
- PASS value '-2^2'
- PASS value '(-2)^2'
- PASS value '2^-1'
- FAIL value '10/4'
- PASS value '7 - 2 - 1'
- FAIL value '64/4/2'
- PASS value '--3'
- PASS value '-+-3'
- PASS value '.5+7.'
- FAIL value '3.25*4'
- PASS value 'max(1, 5, 3) - min(4, 2)'
- FAIL value 'abs(-7/2)'
- FAIL value '2*x^2 + y'
- PASS value '  ( ( 1 ) ) '
- PASS value '0.1+0.2'
- PASS value '2^0'
- FAIL value '(1/3)^-2'
- PASS value '-x'
- PASS value 'max(-1)'
- PASS value '1-2^2^0'
- FAIL value '-(2+3)*2'
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
- FAIL error '1/0'
- PASS error '0^-1'
- PASS error 'q + 1'
- PASS error 'max(1,)'
- FAIL 400 random expressions
  - note: value '1+2*3': ValueError: unexpected trailing token '*'
  - note: value '(1+2)*3': ValueError: unexpected trailing token '*'
  - note: value '10/4': ValueError: unexpected trailing token '/'
  - note: value '64/4/2': ValueError: unexpected trailing token '/'
  - note: value '3.25*4': ValueError: unexpected trailing token '*'
  - note: value 'abs(-7/2)': ValueError: expected ')', got '/'
  - note: value '2*x^2 + y': ValueError: unexpected trailing token '*'
  - note: value '(1/3)^-2': ValueError: expected ')', got '/'
  - note: value '-(2+3)*2': ValueError: unexpected trailing token '*'
  - note: error 'abs 3': AssertionError: 'abs 3': raised NameError, want ValueError
  - note: error '1/0': AssertionError: '1/0': raised ValueError, want ZeroDivisionError
  - note: 400 random expressions: ValueError: unexpected trailing token '/'

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
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results_hard\20261011-172632_GLM-5.3-Flash-derisked-maya-HARD\h_p3_line_diff\tests.py", line 15, in <module>
    D = S_mod.diff_lines
        ^^^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'diff_lines'

