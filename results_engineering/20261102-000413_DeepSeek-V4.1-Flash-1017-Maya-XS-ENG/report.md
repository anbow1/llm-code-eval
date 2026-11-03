# DeepSeek-V4.1-Flash-1017-Maya-XS-ENG

- Date: 2026-11-02 01:17
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 73.6 min (generation 73.1 min)
- Tokens: 197978 total, 65718 of them thinking
- Speed: 45.3 tok/s decode, first token after 6.1 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 114.2 GB (at start 113.0 GB) | Disk read: 22.1 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 89.5% |
| **Overall** | **89.5%** |
| Only tasks it finished | 89.5% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 100% | ok | 2522.8 | 112936 | 32938 | 44.9 |
| e2_rocket_launch | 79% | ok | 1860.8 | 85042 | 32780 | 45.8 |

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

## e2_rocket_launch — 79%
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
- PASS camera_follows_close
- FAIL plume_at_liftoff
- FAIL plume_hot_core
- PASS smoke_clouds_at_pad
- FAIL karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
  - note: src/e2_rocket_launch.ts(255,16): error TS2694: Namespace '"C:/Users/bigbo/Documents/AI/llm-code-eval/ts_env/node_modules/@types/three/build/three.module"' has no exported member 'WrapS'.
  - note: src/e2_rocket_launch.ts(256,16): error TS2694: Namespace '"C:/Users/bigbo/Documents/AI/llm-code-eval/ts_env/node_modules/@types/three/build/three.module"' has no exported member 'WrapT'.
