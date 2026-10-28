# Qwen3.8-Flash-Next-NVFP4-GPTQ-Strata-medium-ENG

- Date: 2026-10-27 21:36
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 196608, think default, effort medium)
- Total time: 4.2 min (generation 3.6 min)
- Tokens: 30087 total, 6861 of them thinking
- Speed: 144.4 tok/s decode, first token after 3.5 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 137.8 GB (at start 135.2 GB) | Disk read: 0.2 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 82.4% |
| **Overall** | **82.4%** |
| Only tasks it finished | 82.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 77% | ok | 122.5 | 17326 | 3999 | 145.3 |
| e2_rocket_launch | 88% | ok | 92.7 | 12761 | 2862 | 143.5 |

## e1_watch_unitas — 77%
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
- FAIL train_ratios
- FAIL gears_mesh
- FAIL train_kinematics
- PASS pallet_sync
- PASS escape_only_on_beat
- PASS parts_visible
- PASS resize
- PASS no_console_errors

## e2_rocket_launch — 88%
- PASS compiles_strict
- PASS loads
- FAIL renders
- PASS rocket_api
- PASS liftoff_thrust_to_weight
- PASS vertical_start
- PASS gravity_turn
- PASS mass_burn_acc_grows
- PASS karman_line_reached
- PASS trail_visible
- FAIL plume_at_liftoff
- PASS plume_hot_core
- PASS smoke_clouds_at_pad
- PASS karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors

## Re-graded 2026-10-28

A test was fixed after this run; the saved answers were graded again: e1_watch_unitas 77% -> 77%, e2_rocket_launch 88% -> 75%. New overall: 76.1%.

## Re-graded 2026-10-28

A test was fixed after this run; the saved answers were graded again: e1_watch_unitas 77% -> 82%. New overall: 78.4%.

## Re-graded 2026-10-28

A test was fixed after this run; the saved answers were graded again: e1_watch_unitas 82% -> 86%. New overall: 80.7%.
