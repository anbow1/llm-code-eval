# Qwen3.8-27B-AP-IQ3_S-HARD

- Date: 2026-09-27 10:52
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 10.2 min (generation 10.0 min)
- Tokens: 44880 total, 38040 of them thinking
- Speed: 78.0 tok/s decode, first token after 2.8 s on average
- Peak VRAM: 15.2 GB | Peak RAM: 22.2 GB (at start 18.4 GB) | Disk read: 0.2 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 72.2% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **86.1%** |
| Only tasks it finished | 86.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 69.0 | 6025 | 3630 | 91.0 |
| h_p1_interval_set | 100% | ok | 124.0 | 8876 | 8310 | 73.2 |
| h_t2_instanced_pick | 100% | ok | 44.3 | 3298 | 2452 | 79.4 |
| h_p2_expr_eval | 100% | ok | 135.4 | 10439 | 9027 | 78.7 |
| h_t3_postfx_invert | 100% | ok | 52.0 | 3597 | 2840 | 73.0 |
| h_p3_line_diff | 17% | ok | 176.0 | 12645 | 11781 | 73.0 |

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

## h_p3_line_diff — 17%
- PASS empty
- FAIL classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- FAIL performance 1000 vs 1000 all different
  - note: classic example: AssertionError: script does not rebuild a
  - note: random small, repeated lines: IndexError: list index out of range
  - note: random medium vs LCS: AssertionError: script does not rebuild a
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild a
  - note: performance 1000 vs 1000 all different: IndexError: list index out of range
