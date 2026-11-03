# DeepSeek-V4.1-Flash-1017-UD-Q2_K_XL-maya-ENG

- Date: 2026-11-03 01:21
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 107.8 min (generation 107.0 min)
- Tokens: 154089 total, 120155 of them thinking
- Speed: 24.1 tok/s decode, first token after 23.2 s on average
- Peak VRAM: 30.9 GB | Peak RAM: 177.9 GB (at start 176.1 GB) | Disk read: 15.6 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 95.1% |
| **Overall** | **95.1%** |
| Only tasks it finished | 95.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 95% | ok | 3351.0 | 81448 | 65597 | 24.4 |
| e2_rocket_launch | 95% | ok | 3072.0 | 72641 | 54558 | 23.9 |

## e1_watch_unitas — 95%
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
- FAIL no_console_errors
  - note: console.error: THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index 1. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.
  - note: console.error: THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index 1. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.
  - note: console.error: THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index 1. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.
  - note: console.error: THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index 1. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.

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
  - note: generation got stuck repeating the same text (loop)
