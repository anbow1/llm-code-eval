# Qwen3.8-Flash-Next-UD-Q4_K_XL-HARD

- Date: 2026-10-05 23:34
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 16.4 min (generation 16.2 min)
- Tokens: 35112 total, 28023 of them thinking
- Speed: 38.9 tok/s decode, first token after 7.4 s on average
- Peak VRAM: 30.4 GB | Peak RAM: 95.0 GB (at start 34.0 GB) | Disk read: 2.0 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 71.4% |
| TypeScript + Three.js | 87.2% |
| **Overall** | **79.3%** |
| Only tasks it finished | 79.3% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 82.5 | 2793 | 400 | 42.0 |
| h_p1_interval_set | 100% | ok | 198.6 | 7134 | 6331 | 36.9 |
| h_t2_instanced_pick | 62% | ok | 64.7 | 2451 | 1623 | 42.2 |
| h_p2_expr_eval | 98% | ok | 241.2 | 8608 | 7319 | 36.5 |
| h_t3_postfx_invert | 100% | ok | 104.5 | 3739 | 2740 | 38.0 |
| h_p3_line_diff | 17% | ok | 280.0 | 10387 | 9610 | 37.8 |

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

## h_p3_line_diff — 17%
- PASS empty
- FAIL classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- FAIL performance 1000 vs 1000 all different
  - note: classic example: AssertionError: script does not rebuild a
  - note: random small, repeated lines: AssertionError: script does not rebuild a
  - note: random medium vs LCS: AssertionError: script does not rebuild a
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild a
  - note: performance 1000 vs 1000 all different: AssertionError: script does not rebuild a
