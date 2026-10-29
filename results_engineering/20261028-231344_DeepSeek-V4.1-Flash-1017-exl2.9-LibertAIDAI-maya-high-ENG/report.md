# DeepSeek-V4.1-Flash-1017-exl2.9-LibertAIDAI-maya-high-ENG

- Date: 2026-10-29 01:14
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 120.3 min (generation 119.3 min)
- Tokens: 147919 total, 118668 of them thinking
- Speed: 21.0 tok/s decode, first token after 53.6 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 191.0 GB (at start 189.6 GB) | Disk read: 82.5 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 66.9% |
| **Overall** | **66.9%** |
| Only tasks it finished | 66.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 86% | ok | 4030.9 | 81967 | 65571 | 20.5 |
| e2_rocket_launch | 47% | ok | 3129.3 | 65952 | 53097 | 21.5 |

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

## e2_rocket_launch — 47%
- PASS compiles_strict
- FAIL loads
- FAIL renders
- PASS rocket_api
- PASS liftoff_thrust_to_weight
- PASS vertical_start
- PASS gravity_turn
- PASS mass_burn_acc_grows
- PASS karman_line_reached
- PASS trail_visible
- PASS speed_x1_then_x10
- FAIL speed_keys_1_10_30
- FAIL camera_follows_close
- FAIL plume_at_liftoff
- FAIL plume_hot_core
- FAIL smoke_clouds_at_pad
- FAIL karman_dark_sky_with_stars
- FAIL resize
- FAIL no_console_errors
  - note: __ready never became true
  - note: pageerror: Cannot set properties of undefined (setting 'value')
