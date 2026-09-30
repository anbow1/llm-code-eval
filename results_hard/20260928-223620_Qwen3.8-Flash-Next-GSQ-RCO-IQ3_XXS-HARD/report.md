# Qwen3.8-Flash-Next-GSQ-RCO-IQ3_XXS-HARD

- Date: 2026-09-28 23:05
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 29.2 min (generation 29.0 min)
- Tokens: 53976 total, 46916 of them thinking
- Speed: 31.9 tok/s decode, first token after 7.2 s on average
- Peak VRAM: 24.5 GB | Peak RAM: 58.8 GB (at start 24.1 GB) | Disk read: 14.4 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 69.9% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **84.9%** |
| Only tasks it finished | 84.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 183.5 | 5460 | 3202 | 31.5 |
| h_p1_interval_set | 14% | ok | 126.6 | 3827 | 3221 | 31.7 |
| h_t2_instanced_pick | 100% | ok | 85.8 | 2556 | 1729 | 32.5 |
| h_p2_expr_eval | 95% | ok | 683.3 | 21278 | 19621 | 31.5 |
| h_t3_postfx_invert | 100% | ok | 163.6 | 5012 | 4053 | 32.1 |
| h_p3_line_diff | 100% | ok | 499.6 | 15843 | 15090 | 32.1 |

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

## h_p1_interval_set — 14%
- FAIL merge touching
- FAIL split + half-open
- PASS empty ranges ignored
- FAIL floats
- FAIL swallow many
- FAIL random vs brute force
- FAIL performance 60k/200k
  - note: merge touching: IndexError: list assignment index out of range
  - note: split + half-open: IndexError: list assignment index out of range
  - note: floats: IndexError: list assignment index out of range
  - note: swallow many: IndexError: list assignment index out of range
  - note: random vs brute force: IndexError: list assignment index out of range
  - note: performance 60k/200k: IndexError: list assignment index out of range

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

## h_p2_expr_eval — 95%
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
- FAIL 400 random expressions
  - note: error 'foo(1)': AssertionError: 'foo(1)': raised NameError, want ValueError
  - note: 400 random expressions: ValueError: unexpected token

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

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
