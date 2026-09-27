# Qwen3.8-27_3.0_exl3_qv44-low-HARD

- Date: 2026-09-27 10:29
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 10.9 min (generation 10.8 min)
- Tokens: 18199 total, 16024 of them thinking
- Speed: 41.4 tok/s decode, first token after 2.9 s on average
- Peak VRAM: 15.5 GB | Peak RAM: 14.7 GB (at start 9.7 GB) | Disk read: 0.2 GB
- Tasks: 4/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 33.3% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **66.7%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 72.4 | 3030 | 1975 | 43.8 |
| h_p1_interval_set | 100% | ok | 143.3 | 3882 | 3738 | 27.6 |
| h_t2_instanced_pick | 100% | ok | 31.3 | 2757 | 1989 | 97.0 |
| h_p2_expr_eval | 0% | no_answer | 105.9 | 3539 | 3539 | 34.4 |
| h_t3_postfx_invert | 100% | ok | 77.2 | 2550 | 2342 | 34.3 |
| h_p3_line_diff | 0% | no_answer | 216.3 | 2441 | 2441 | 11.4 |

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

## h_p2_expr_eval — 0%
- FAIL harness_crashed
  - note: model stopped inside its thinking and never wrote an answer
  - note: generation got stuck repeating the same text (loop)
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results\20260927-101826_Qwen3.8-27_3.0_exl3_qv44-low-HARD\h_p2_expr_eval\tests.py", line 16, in <module>
    E = S_mod.evaluate
        ^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'evaluate'


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
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results\20260927-101826_Qwen3.8-27_3.0_exl3_qv44-low-HARD\h_p3_line_diff\tests.py", line 15, in <module>
    D = S_mod.diff_lines
        ^^^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'diff_lines'

