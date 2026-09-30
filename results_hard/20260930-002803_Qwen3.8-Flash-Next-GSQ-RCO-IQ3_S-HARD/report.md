# Qwen3.8-Flash-Next-GSQ-RCO-IQ3_S-HARD

- Date: 2026-09-30 02:25
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 117.3 min (generation 117.1 min)
- Tokens: 237448 total, 229847 of them thinking
- Speed: 36.3 tok/s decode, first token after 5.2 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 79.6 GB (at start 79.2 GB) | Disk read: 1.0 GB
- Tasks: 5/6 answered, 1 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 66.7% |
| TypeScript + Three.js | 86.7% |
| **Overall** | **76.7%** |
| Only tasks it finished | 92.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 60% | ok | 110.6 | 3960 | 1460 | 38.0 |
| h_p1_interval_set | 100% | ok | 1334.9 | 47372 | 46097 | 35.6 |
| h_t2_instanced_pick | 100% | ok | 70.0 | 2496 | 1716 | 38.7 |
| h_p2_expr_eval | 100% | ok | 2425.9 | 81793 | 79736 | 33.8 |
| h_t3_postfx_invert | 100% | ok | 96.9 | 3523 | 2534 | 38.7 |
| h_p3_line_diff | 0% | max_tokens | 2986.9 | 98304 | 98304 | 33.0 |

## h_t1_physics — 60%
- PASS compiles_strict
- FAIL loads
- PASS renders
- FAIL resize
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
  - note: hit max_tokens (98304) while still thinking, no answer
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results_hard\20260930-002803_Qwen3.8-Flash-Next-GSQ-RCO-IQ3_S-HARD\h_p3_line_diff\tests.py", line 15, in <module>
    D = S_mod.diff_lines
        ^^^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'diff_lines'

