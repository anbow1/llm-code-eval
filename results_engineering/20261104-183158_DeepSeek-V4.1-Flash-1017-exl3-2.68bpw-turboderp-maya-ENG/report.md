# DeepSeek-V4.1-Flash-1017-exl3-2.68bpw-turboderp-maya-ENG

- Date: 2026-11-04 20:35
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 123.2 min (generation 122.3 min)
- Tokens: 163905 total, 132882 of them thinking
- Speed: 22.4 tok/s decode, first token after 15.5 s on average
- Peak VRAM: 31.4 GB | Peak RAM: 181.8 GB (at start 180.2 GB) | Disk read: 25.5 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 90.6% |
| **Overall** | **90.6%** |
| Only tasks it finished | 90.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 86% | ok | 3518.0 | 76495 | 61764 | 21.9 |
| e2_rocket_launch | 95% | ok | 3822.5 | 87410 | 71118 | 22.9 |

## e1_watch_unitas — 86%
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
- FAIL train_ratios
- FAIL gears_mesh
- FAIL train_kinematics
- PASS pallet_sync
- PASS escape_only_on_beat
- PASS parts_visible
- PASS resize
- PASS no_console_errors

## e2_rocket_launch — 95%
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
- FAIL plume_at_liftoff
- PASS plume_hot_core
- PASS smoke_clouds_at_pad
- PASS karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
