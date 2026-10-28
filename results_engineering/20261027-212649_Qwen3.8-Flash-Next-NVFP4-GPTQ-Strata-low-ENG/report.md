# Qwen3.8-Flash-Next-NVFP4-GPTQ-Strata-low-ENG

- Date: 2026-10-27 21:31
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 196608, think default, effort low)
- Total time: 5.0 min (generation 4.5 min)
- Tokens: 38213 total, 13775 of them thinking
- Speed: 148.2 tok/s decode, first token after 4.1 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 135.9 GB (at start 134.3 GB) | Disk read: 1.9 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 63.6% |
| **Overall** | **63.6%** |
| Only tasks it finished | 63.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 77% | ok | 183.3 | 25473 | 11798 | 141.8 |
| e2_rocket_launch | 50% | ok | 87.0 | 12740 | 1977 | 154.5 |

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

## e2_rocket_launch — 50%
- FAIL compiles_strict
- PASS loads
- PASS renders
- PASS rocket_api
- FAIL liftoff_thrust_to_weight
- PASS vertical_start
- FAIL gravity_turn
- FAIL mass_burn_acc_grows
- FAIL karman_line_reached
- FAIL trail_visible
- FAIL plume_at_liftoff
- PASS plume_hot_core
- PASS smoke_clouds_at_pad
- FAIL karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
  - note: src/e2_rocket_launch.ts(749,19): error TS2339: Property 'opacity' does not exist on type 'Material<MaterialEventMap> | Material<MaterialEventMap>[]'.
  - note: src/e2_rocket_launch.ts(796,48): error TS2339: Property 'opacity' does not exist on type 'Material<MaterialEventMap> | Material<MaterialEventMap>[]'.
