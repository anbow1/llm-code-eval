# DeepSeek-V4.1-Flash-1017-Maya-S-high-ENG

- Date: 2026-10-28 03:57
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 111.9 min (generation 111.3 min)
- Tokens: 153876 total, 124301 of them thinking
- Speed: 23.1 tok/s decode, first token after 21.6 s on average
- Peak VRAM: 30.9 GB | Peak RAM: 160.0 GB (at start 158.1 GB) | Disk read: 19.6 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 89.2% |
| **Overall** | **89.2%** |
| Only tasks it finished | 89.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 91% | ok | 3459.9 | 79832 | 65560 | 23.1 |
| e2_rocket_launch | 88% | ok | 3219.0 | 74044 | 58741 | 23.2 |

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
- FAIL jewels_17
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
