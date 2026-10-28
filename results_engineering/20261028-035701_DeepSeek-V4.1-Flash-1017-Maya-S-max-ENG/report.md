# DeepSeek-V4.1-Flash-1017-Maya-S-max-ENG

- Date: 2026-10-28 05:58
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort max)
- Total time: 121.4 min (generation 120.7 min)
- Tokens: 164867 total, 131163 of them thinking
- Speed: 22.8 tok/s decode, first token after 8.6 s on average
- Peak VRAM: 30.9 GB | Peak RAM: 160.7 GB (at start 159.5 GB) | Disk read: 20.1 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 91.5% |
| **Overall** | **91.5%** |
| Only tasks it finished | 91.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 95% | ok | 3531.0 | 80840 | 65590 | 22.9 |
| e2_rocket_launch | 88% | ok | 3710.9 | 84027 | 65573 | 22.7 |

## e1_watch_unitas — 95%
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
- PASS explode_separates
- PASS train_ratios
- PASS gears_mesh
- PASS train_kinematics
- PASS pallet_sync
- PASS escape_only_on_beat
- PASS parts_visible
- PASS resize
- PASS no_console_errors

## e2_rocket_launch — 88%
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
- FAIL plume_at_liftoff
- PASS plume_hot_core
- PASS smoke_clouds_at_pad
- FAIL karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
