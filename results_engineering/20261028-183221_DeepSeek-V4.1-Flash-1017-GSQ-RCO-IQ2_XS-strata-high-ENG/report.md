# DeepSeek-V4.1-Flash-1017-GSQ-RCO-IQ2_XS-strata-high-ENG

- Date: 2026-10-28 19:45
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 73.4 min (generation 72.5 min)
- Tokens: 119341 total, 65689 of them thinking
- Speed: 27.6 tok/s decode, first token after 10.6 s on average
- Peak VRAM: 31.3 GB | Peak RAM: 165.6 GB (at start 164.1 GB) | Disk read: 17.4 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 84.2% |
| **Overall** | **84.2%** |
| Only tasks it finished | 84.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 100% | ok | 2700.8 | 74182 | 32878 | 27.6 |
| e2_rocket_launch | 68% | ok | 1651.9 | 45159 | 32811 | 27.5 |

## e1_watch_unitas — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS watch_api
- PASS balance_2_5_hz
- PASS balance_amplitude
- PASS balance_steady
- PASS escape_ticks
- PASS seconds_hand
- PASS minute_hand
- PASS hour_ratio
- PASS parts_40_unique
- PASS jewels_17
- PASS explode_separates
- PASS train_ratios
- PASS gears_mesh
- PASS train_kinematics
- PASS pallet_sync
- PASS escape_only_on_beat
- PASS parts_visible
- PASS resize
- PASS no_console_errors

## e2_rocket_launch — 68%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS rocket_api
- PASS liftoff_thrust_to_weight
- PASS vertical_start
- PASS gravity_turn
- PASS mass_burn_acc_grows
- PASS karman_line_reached
- PASS trail_visible
- FAIL speed_x1_then_x10
- FAIL speed_keys_1_10_30
- FAIL camera_follows_close
- FAIL plume_at_liftoff
- FAIL plume_hot_core
- FAIL smoke_clouds_at_pad
- PASS karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
