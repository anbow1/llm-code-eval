# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-SCENE

- Date: 2026-10-26 14:26
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 27.8 min (generation 27.5 min)
- Tokens: 39985 total, 32776 of them thinking
- Speed: 24.3 tok/s decode, first token after 4.2 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 129.0 GB (at start 128.2 GB) | Disk read: 0.1 GB
- Tasks: 1/1 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 100.0% |
| **Overall** | **100.0%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| s1_ocean_island | 100% | ok | 1647.7 | 39985 | 32776 | 24.3 |

## s1_ocean_island — 100%
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
- PASS resize
- PASS no_console_errors

## Re-graded 2026-10-26

A test was fixed after this run; the saved answers were graded again: s1_ocean_island 100% -> 96%. New overall: 95.7%.
