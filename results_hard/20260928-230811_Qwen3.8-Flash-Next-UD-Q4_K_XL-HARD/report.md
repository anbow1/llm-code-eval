# Qwen3.8-Flash-Next-UD-Q4_K_XL-HARD

- Date: 2026-09-28 23:30
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort medium)
- Total time: 22.2 min (generation 22.0 min)
- Tokens: 48916 total, 41198 of them thinking
- Speed: 39.6 tok/s decode, first token after 8.1 s on average
- Peak VRAM: 26.4 GB | Peak RAM: 92.7 GB (at start 30.8 GB) | Disk read: 5.4 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 90.5% |
| TypeScript + Three.js | 96.3% |
| **Overall** | **93.4%** |
| Only tasks it finished | 93.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 96.8 | 3295 | 635 | 43.0 |
| h_p1_interval_set | 71% | ok | 243.8 | 9038 | 8556 | 37.9 |
| h_t2_instanced_pick | 100% | ok | 72.3 | 2801 | 1860 | 42.5 |
| h_p2_expr_eval | 100% | ok | 228.8 | 8994 | 7080 | 40.2 |
| h_t3_postfx_invert | 89% | ok | 247.6 | 8602 | 7781 | 35.6 |
| h_p3_line_diff | 100% | ok | 429.4 | 16186 | 15286 | 38.2 |

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

## h_p1_interval_set — 71%
- PASS merge touching
- PASS split + half-open
- PASS empty ranges ignored
- FAIL floats
- PASS swallow many
- FAIL random vs brute force
- PASS performance 60k/200k
  - note: floats: AssertionError: 
  - note: random vs brute force: AssertionError: ([('a', 20, 48), ('a', 25, 53), ('a', 59, 60), ('a', 0, 45), ('r', 16, 18), ('a', 4, 25), ('a', 37, 55), ('a', 23, 59), ('a', 17, 48), ('a', 6, 17), ('a', 42, 53)], [(0, 59), (59, 60)], [(0, 60)])

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
  - note: src/h_t3_postfx_invert.ts(47,30): error TS2694: Namespace '"C:/Users/bigbo/Documents/AI/llm-code-eval/ts_env/node_modules/@types/three/build/three.module"' has no exported member 'Shader'.

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
