# Qwen3.8-Flash-Next-NVFP4-GPTQ-Strata-SCENE

- Date: 2026-10-26 12:56
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 1.2 min (generation 0.9 min)
- Tokens: 8411 total, 1563 of them thinking
- Speed: 162.6 tok/s decode, first token after 3.5 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 85.8 GB (at start 85.4 GB) | Disk read: 0.4 GB
- Tasks: 1/1 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 100.0% |
| **Overall** | **100.0%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| s1_ocean_island | 100% | ok | 55.2 | 8411 | 1563 | 162.6 |

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
