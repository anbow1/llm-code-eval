# DeepSeek-V4.1-Flash-1017-exl2.9-LibertAIDAI-maya-max-ENG

- Date: 2026-10-29 03:23
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort max)
- Total time: 129.9 min (generation 128.9 min)
- Tokens: 168003 total, 131086 of them thinking
- Speed: 22.1 tok/s decode, first token after 74.1 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 191.0 GB (at start 188.7 GB) | Disk read: 60.4 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 95.1% |
| **Overall** | **95.1%** |
| Only tasks it finished | 95.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 95% | ok | 3842.9 | 83333 | 65559 | 22.1 |
| e2_rocket_launch | 95% | ok | 3893.4 | 84670 | 65527 | 22.1 |

## e1_watch_unitas — 95%
- FAIL compiles_strict
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
  - note: src/e1_watch_unitas.ts(1378,29): error TS7053: Element implicitly has an 'any' type because expression of type '"focus"' can't be used to index type '{}'.
  - note: src/e1_watch_unitas.ts(1379,5): error TS7053: Element implicitly has an 'any' type because expression of type '"focus"' can't be used to index type '{}'.

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
