# GLM-5.3-Flash-exl3-3.05bpw-HARD

- Date: 2026-09-28 20:21
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 65536, think default, effort high)
- Total time: 115.5 min (generation 115.3 min)
- Tokens: 73642 total, 66132 of them thinking
- Speed: 12.0 tok/s decode, first token after 10.6 s on average
- Peak VRAM: 26.9 GB | Peak RAM: 122.0 GB (at start 119.3 GB) | Disk read: 13.7 GB
- Tasks: 5/6 answered, 0 hit max_tokens, 1 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 66.7% |
| TypeScript + Three.js | 97.4% |
| **Overall** | **82.1%** |
| Only tasks it finished | 98.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 341.3 | 4501 | 517 | 13.9 |
| h_p1_interval_set | 100% | ok | 1751.9 | 18384~ | 17425 | 10.6 |
| h_t2_instanced_pick | 92% | ok | 116.8 | 1362 | 597 | 12.7 |
| h_p2_expr_eval | 100% | ok | 636.0 | 7511 | 6578 | 12.0 |
| h_t3_postfx_invert | 100% | ok | 469.1 | 5717 | 4848 | 12.5 |
| h_p3_line_diff | 0% | task_timeout | 3600.1 | 36167~ | 36167 | 10.1 |

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

## h_t2_instanced_pick — 92%
- FAIL compiles_strict
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
  - note: src/h_t2_instanced_pick.ts(94,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.

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
  - note: stopped after 60 min task timeout
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results_hard\20260928-182550_GLM-5.3-Flash-exl3-3.05bpw-HARD\h_p3_line_diff\tests.py", line 15, in <module>
    D = S_mod.diff_lines
        ^^^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'diff_lines'

