# Qwen3.8-Flash-Next-GSQ-RCO-IQ3_S-strata-low-HARD

- Date: 2026-09-30 19:29
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort low)
- Total time: 8.4 min (generation 8.3 min)
- Tokens: 70378 total, 64439 of them thinking
- Speed: 147.1 tok/s decode, first token after 2.7 s on average
- Peak VRAM: 30.5 GB | Peak RAM: 67.9 GB (at start 67.9 GB) | Disk read: 1.9 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 99.2% |
| TypeScript + Three.js | 96.3% |
| **Overall** | **97.8%** |
| Only tasks it finished | 97.8% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 37.4 | 5381 | 3151 | 155.5 |
| h_p1_interval_set | 100% | ok | 89.1 | 12923 | 12418 | 149.5 |
| h_t2_instanced_pick | 100% | ok | 19.2 | 2374 | 1694 | 144.4 |
| h_p2_expr_eval | 98% | ok | 52.8 | 7288 | 6306 | 145.3 |
| h_t3_postfx_invert | 89% | ok | 110.5 | 14852 | 14120 | 137.8 |
| h_p3_line_diff | 100% | ok | 186.3 | 27560 | 26750 | 150.0 |

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

## h_t3_postfx_invert — 89%
- FAIL compiles_strict
- PASS loads
- PASS renders
- PASS composer_exposed
- PASS background_inverted_srgb
- PASS sphere_inverted_to_black
- PASS composer_resizes
- PASS resize
- PASS no_console_errors
  - note: src/h_t3_postfx_invert.ts(70,12): error TS2339: Property 'name' does not exist on type 'ShaderPass'.

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
