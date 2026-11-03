# DeepSeek-V4.1-Flash-1017-UD-IQ3_XXS-maya-ENG

- Date: 2026-11-03 17:51
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 147.0 min (generation 146.3 min)
- Tokens: 160086 total, 130917 of them thinking
- Speed: 18.4 tok/s decode, first token after 29.2 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 191.1 GB (at start 184.5 GB) | Disk read: 923.4 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 97.4% |
| **Overall** | **97.4%** |
| Only tasks it finished | 97.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 100% | ok | 4483.0 | 79311 | 65343 | 17.7 |
| e2_rocket_launch | 95% | ok | 4297.5 | 80775 | 65574 | 19.0 |

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
- PASS plume_at_liftoff
- PASS plume_hot_core
- PASS smoke_clouds_at_pad
- FAIL karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
