# GLM-5.3-Flash-exl3-4.10bpw-maya-ENG

- Date: 2026-10-31 01:05
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 105.7 min (generation 105.1 min)
- Tokens: 110884 total, 65670 of them thinking
- Speed: 17.6 tok/s decode, first token after 5.6 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 158.9 GB (at start 158.1 GB) | Disk read: 0.4 GB
- Tasks: 2/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 48.9% |
| **Overall** | **48.9%** |
| Only tasks it finished | 48.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 14% | ok | 2658.4 | 47393 | 32830 | 17.9 |
| e2_rocket_launch | 84% | ok | 3644.7 | 63491 | 32840 | 17.4 |

## e1_watch_unitas — 14%
- FAIL compiles_strict
- PASS loads
- PASS renders
- FAIL watch_api
- FAIL balance_2_5_hz
- FAIL balance_amplitude
- FAIL balance_steady
- FAIL escape_ticks
- FAIL seconds_hand
- FAIL minute_hand
- FAIL hour_ratio
- FAIL train_ratios
- FAIL gears_mesh
- FAIL train_kinematics
- FAIL pallet_sync
- FAIL escape_only_on_beat
- FAIL parts_40_unique
- FAIL jewels_17
- FAIL explode_separates
- FAIL parts_visible
- PASS resize
- FAIL no_console_errors
  - note: src/e1_watch_unitas.ts(513,46): error TS2345: Argument of type 'MeshPhysicalMaterial[]' is not assignable to parameter of type 'Material<MaterialEventMap>'.
  - note: src/e1_watch_unitas.ts(530,36): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: src/e1_watch_unitas.ts(531,34): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: src/e1_watch_unitas.ts(532,36): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: src/e1_watch_unitas.ts(533,36): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: src/e1_watch_unitas.ts(538,36): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: src/e1_watch_unitas.ts(544,36): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: src/e1_watch_unitas.ts(549,38): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: src/e1_watch_unitas.ts(721,57): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: src/e1_watch_unitas.ts(916,86): error TS2339: Property 'z' does not exist on type 'Vector2'.
  - note: console.error: THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _ExtrudeGeometry
  - note: console.error: THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _ExtrudeGeometry
  - note: console.error: THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _ExtrudeGeometry
  - note: console.error: THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _ExtrudeGeometry

## e2_rocket_launch — 84%
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
- FAIL plume_hot_core
- FAIL smoke_clouds_at_pad
- PASS karman_dark_sky_with_stars
- PASS resize
- PASS no_console_errors
