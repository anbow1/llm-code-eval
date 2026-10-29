# DeepSeek-V4.1-Flash-1017-Maya-S-high-ENG

- Date: 2026-10-28 21:59
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 123.8 min (generation 123.2 min)
- Tokens: 164747 total, 131092 of them thinking
- Speed: 22.5 tok/s decode, first token after 24.5 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 165.9 GB (at start 162.1 GB) | Disk read: 139.7 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 100.0% |
| **Overall** | **100.0%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 100% | ok | 3700.7 | 82317 | 65563 | 22.3 |
| e2_rocket_launch | 100% | ok | 3692.4 | 82430 | 65529 | 22.6 |

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

## e2_rocket_launch — 100%
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
- PASS speed_x1_then_x10
- PASS speed_keys_1_10_30
- PASS camera_follows_close
- PASS plume_at_liftoff
- PASS plume_hot_core
- PASS smoke_clouds_at_pad
- PASS karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
