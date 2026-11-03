# DeepSeek-V4.1-Flash-1017-GSQ-RCO-Coder-IQ2_XXS-strata-ENG

- Date: 2026-11-03 11:06
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 65.8 min (generation 65.0 min)
- Tokens: 152324 total, 131163 of them thinking
- Speed: 39.2 tok/s decode, first token after 4.5 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 68.6 GB (at start 67.2 GB) | Disk read: 6.5 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 84.2% |
| **Overall** | **84.2%** |
| Only tasks it finished | 84.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 100% | ok | 1911.6 | 76189 | 65588 | 40.0 |
| e2_rocket_launch | 68% | ok | 1985.5 | 76135 | 65575 | 38.4 |

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
- FAIL compiles_strict
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
- FAIL camera_follows_close
- FAIL plume_at_liftoff
- FAIL plume_hot_core
- FAIL smoke_clouds_at_pad
- FAIL karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
  - note: src/e2_rocket_launch.ts(1171,31): error TS2339: Property 'x' does not exist on type 'RocketState'.
  - note: src/e2_rocket_launch.ts(1173,39): error TS2339: Property 'x' does not exist on type 'RocketState'.
