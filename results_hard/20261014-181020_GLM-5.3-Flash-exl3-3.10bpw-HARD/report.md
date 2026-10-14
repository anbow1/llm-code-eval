# GLM-5.3-Flash-exl3-3.10bpw-HARD

- Date: 2026-10-14 19:28
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 78.4 min (generation 78.2 min)
- Tokens: 65898 total, 59909 of them thinking
- Speed: 13.9 tok/s decode, first token after 10.4 s on average
- Peak VRAM: 30.0 GB | Peak RAM: 108.6 GB (at start 106.5 GB) | Disk read: 13.5 GB
- Tasks: 5/6 answered, 0 hit max_tokens, 1 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| Python | 62.0% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **81.0%** |
| Only tasks it finished | 97.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 188.0 | 2361 | 248 | 13.4 |
| h_p1_interval_set | 100% | ok | 257.1 | 3419 | 2812 | 13.8 |
| h_t2_instanced_pick | 100% | ok | 103.9 | 1344 | 401 | 14.2 |
| h_p2_expr_eval | 86% | ok | 386.6 | 5238 | 4019 | 14.1 |
| h_t3_postfx_invert | 100% | ok | 155.4 | 1949 | 842 | 13.3 |
| h_p3_line_diff | 0% | task_timeout | 3600.1 | 51587~ | 51587 | 14.4 |

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

## h_p2_expr_eval — 86%
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
- FAIL value 'abs(-7/2)'
- FAIL value '2*x^2 + y'
- PASS value '  ( ( 1 ) ) '
- PASS value '0.1+0.2'
- PASS value '2^0'
- PASS value '(1/3)^-2'
- FAIL value '-x'
- FAIL value 'max(-1)'
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
  - note: value 'max(1, 5, 3) - min(4, 2)': ValueError: function 'max' requires parentheses
  - note: value 'abs(-7/2)': ValueError: function 'abs' requires parentheses
  - note: value '2*x^2 + y': ValueError: unexpected trailing token 'x'
  - note: value '-x': ValueError: unexpected trailing token 'x'
  - note: value 'max(-1)': ValueError: function 'max' requires parentheses
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

## h_p3_line_diff — 0%
- FAIL harness_crashed
  - note: stopped after 60 min task timeout
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results_hard\20261014-181020_GLM-5.3-Flash-exl3-3.10bpw-HARD\h_p3_line_diff\tests.py", line 15, in <module>
    D = S_mod.diff_lines
        ^^^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'diff_lines'

