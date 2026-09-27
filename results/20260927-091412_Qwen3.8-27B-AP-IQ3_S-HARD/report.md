# Qwen3.8-27B-AP-IQ3_S-HARD

- Date: 2026-09-27 09:43
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 29.4 min (generation 29.2 min)
- Tokens: 97930 total, 91056 of them thinking
- Speed: 73.1 tok/s decode, first token after 2.8 s on average
- Peak VRAM: 15.4 GB | Peak RAM: 21.2 GB (at start 18.0 GB) | Disk read: 0.3 GB
- Tasks: 5/6 answered, 1 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 66.7% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **83.3%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 50.0 | 3944 | 1219 | 83.6 |
| h_p1_interval_set | 100% | ok | 161.7 | 11388 | 10345 | 71.6 |
| h_t2_instanced_pick | 100% | ok | 47.6 | 3600 | 2713 | 80.5 |
| h_p2_expr_eval | 100% | ok | 149.0 | 11514 | 10153 | 78.8 |
| h_t3_postfx_invert | 100% | ok | 83.3 | 6073 | 5215 | 75.5 |
| h_p3_line_diff | 0% | max_tokens | 1263.4 | 61411 | 61411 | 48.7 |

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
  - note: hit max_tokens (65536) while still thinking, no answer
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results\20260927-091412_Qwen3.8-27B-AP-IQ3_S-HARD\h_p3_line_diff\tests.py", line 15, in <module>
    D = S_mod.diff_lines
        ^^^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'diff_lines'

