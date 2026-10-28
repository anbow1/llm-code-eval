# Qwen3.8-Flash-Next-NVFP4-GPTQ-Strata-xhigh-ENG

- Date: 2026-10-27 22:00
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 196608, think default, effort xhigh)
- Total time: 24.3 min (generation 23.6 min)
- Tokens: 178703 total, 145601 of them thinking
- Speed: 126.8 tok/s decode, first token after 4.2 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 139.0 GB (at start 137.1 GB) | Disk read: 0.2 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 45.5% |
| **Overall** | **45.5%** |
| Only tasks it finished | 45.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 91% | ok | 697.9 | 88653 | 70858 | 127.6 |
| e2_rocket_launch | 0% | ok | 720.0 | 90050 | 74743 | 125.9 |

## e1_watch_unitas — 91%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS watch_api
- PASS balance_2_5_hz
- PASS balance_amplitude
- PASS balance_steady
- FAIL escape_ticks
- PASS seconds_hand
- PASS minute_hand
- PASS hour_ratio
- PASS parts_40_unique
- PASS jewels_17
- FAIL explode_separates
- PASS train_ratios
- PASS gears_mesh
- PASS train_kinematics
- PASS pallet_sync
- PASS escape_only_on_beat
- PASS parts_visible
- PASS resize
- PASS no_console_errors

## e2_rocket_launch — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: src/e2_rocket_launch.ts(575,91): error TS2339: Property 'position' does not exist on type 'void'.
  - note: __ready never became true
  - note: pageerror: Cannot read properties of undefined (reading 'position')

## Re-graded 2026-10-28

A test was fixed after this run; the saved answers were graded again: e1_watch_unitas 91% -> 95%. New overall: 47.7%.

## Re-graded 2026-10-28

A test was fixed after this run; the saved answers were graded again: e1_watch_unitas 95% -> 100%. New overall: 50.0%.
