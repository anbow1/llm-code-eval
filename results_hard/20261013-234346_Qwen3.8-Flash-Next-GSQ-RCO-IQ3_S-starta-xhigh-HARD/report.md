# Qwen3.8-Flash-Next-GSQ-RCO-IQ3_S-starta-xhigh-HARD

- Date: 2026-10-14 00:09
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort xhigh)
- Total time: 25.3 min (generation 25.1 min)
- Tokens: 233159 total, 225525 of them thinking
- Speed: 156.7 tok/s decode, first token after 2.6 s on average
- Peak VRAM: 30.0 GB | Peak RAM: 67.5 GB (at start 66.5 GB) | Disk read: 11.7 GB
- Tasks: 5/6 answered, 1 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| Python | 44.4% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **72.2%** |
| Only tasks it finished | 86.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 218.9 | 35438 | 31598 | 163.9 |
| h_p1_interval_set | 100% | ok | 338.8 | 51530 | 50841 | 153.3 |
| h_t2_instanced_pick | 100% | ok | 163.9 | 25300 | 24304 | 156.8 |
| h_p2_expr_eval | 0% | max_tokens | 139.8 | 21224 | 21224 | 154.7 |
| h_t3_postfx_invert | 100% | ok | 259.0 | 40244 | 39176 | 157.0 |
| h_p3_line_diff | 33% | ok | 386.7 | 59423 | 58382 | 154.7 |

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
  - note: hit max_tokens (98304) while still thinking, no answer
  - note: generation got stuck repeating the same text (loop)
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results_hard\20261013-234346_Qwen3.8-Flash-Next-GSQ-RCO-IQ3_S-starta-xhigh-HARD\h_p2_expr_eval\tests.py", line 16, in <module>
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

## h_p3_line_diff — 33%
- PASS empty
- FAIL classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: classic example: AssertionError: script does not rebuild b
  - note: random small, repeated lines: AssertionError: script does not rebuild b
  - note: random medium vs LCS: AssertionError: script does not rebuild b
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild b
