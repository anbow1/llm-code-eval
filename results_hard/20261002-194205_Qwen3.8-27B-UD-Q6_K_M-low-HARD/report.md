# Qwen3.8-27B-UD-Q6_K_M-low-HARD

- Date: 2026-10-02 19:50
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort low)
- Total time: 8.1 min (generation 7.9 min)
- Tokens: 47074 total, 40220 of them thinking
- Speed: 105.6 tok/s decode, first token after 2.4 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 38.9 GB (at start 34.8 GB) | Disk read: 0.5 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 77.0% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **88.5%** |
| Only tasks it finished | 88.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 53.5 | 6082 | 3866 | 119.1 |
| h_p1_interval_set | 100% | ok | 85.3 | 7754 | 7054 | 93.5 |
| h_t2_instanced_pick | 100% | ok | 24.5 | 2567 | 1764 | 116.3 |
| h_p2_expr_eval | 98% | ok | 90.1 | 9652 | 8216 | 110.1 |
| h_t3_postfx_invert | 100% | ok | 85.6 | 7742 | 6853 | 93.2 |
| h_p3_line_diff | 33% | ok | 133.2 | 13277 | 12467 | 101.5 |

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

## h_p3_line_diff — 33%
- PASS empty
- FAIL classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: classic example: AssertionError: script does not rebuild a
  - note: random small, repeated lines: AssertionError: script does not rebuild b
  - note: random medium vs LCS: AssertionError: script does not rebuild b
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild a
