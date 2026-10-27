# DeepSeek-V4.1-Flash-1017-Maya-S-max-SCENE

- Date: 2026-10-27 00:01
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort max)
- Total time: 45.5 min (generation 45.1 min)
- Tokens: 60153 total, 50799 of them thinking
- Speed: 22.3 tok/s decode, first token after 13.7 s on average
- Peak VRAM: 31.3 GB | Peak RAM: 166.4 GB (at start 159.9 GB) | Disk read: 8.7 GB
- Tasks: 1/1 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 95.7% |
| **Overall** | **95.7%** |
| Only tasks it finished | 95.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| s1_ocean_island | 96% | ok | 2706.0 | 60153 | 50799 | 22.3 |

## s1_ocean_island — 96%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS ocean_api
- PASS waves_move
- PASS waves_visible
- PASS boat_floats
- PASS boat_tilts
- PASS boat_built
- PASS boat_casts_shadow
- PASS palm_leaves
- PASS leaves_sway
- PASS island
- PASS shadows
- PASS fog_and_tone_mapping
- PASS camera_view
- PASS sky_gradient
- PASS water_animates
- PASS picture_rich
- PASS water_visible
- PASS island_lit
- PASS resize
- FAIL no_console_errors
  - note: console.error: THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. _PlaneGeometry
