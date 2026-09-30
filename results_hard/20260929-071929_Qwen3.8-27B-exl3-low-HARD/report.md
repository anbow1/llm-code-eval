# Qwen3.8-27B-exl3-low-HARD

- Date: 2026-09-29 07:25
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 65536, think default, effort low)
- Total time: 6.5 min (generation 6.3 min)
- Tokens: 46061 total, 39048 of them thinking
- Speed: 131.9 tok/s decode, first token after 2.4 s on average
- Peak VRAM: 26.9 GB | Peak RAM: 19.8 GB (at start 18.9 GB) | Disk read: 0.9 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 100.0% |
| TypeScript + Three.js | 88.9% |
| **Overall** | **94.4%** |
| Only tasks it finished | 94.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 41.0 | 5576 | 3421 | 144.6 |
| h_p1_interval_set | 100% | ok | 74.0 | 9019 | 8389 | 126.0 |
| h_t2_instanced_pick | 100% | ok | 21.5 | 2690 | 2003 | 141.3 |
| h_p2_expr_eval | 100% | ok | 87.5 | 11669~ | 9930 | 137.1 |
| h_t3_postfx_invert | 67% | ok | 28.1 | 3352 | 2375 | 130.0 |
| h_p3_line_diff | 100% | ok | 124.5 | 13755~ | 12930 | 112.6 |

## h_t1_physics — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS 20_sphere_meshes
- PASS picture_animates
- PASS sim_api
- PASS stay_in_box
- PASS no_overlap
- PASS energy_conserved
- PASS balls_move
- PASS masses_differ
- PASS resize
- PASS no_console_errors

## h_p1_interval_set — 100%
- PASS merge touching
- PASS split + half-open
- PASS empty ranges ignored
- PASS floats
- PASS swallow many
- PASS random vs brute force
- PASS performance 60k/200k

## h_t2_instanced_pick — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS instanced_900
- PASS starts_gray
- PASS click_turns_red
- PASS red_visible_on_screen
- PASS second_click_independent
- PASS click_again_toggles_back
- PASS background_does_nothing
- PASS single_mesh
- PASS resize
- PASS no_console_errors

## h_p2_expr_eval — 100%
- PASS value '1+2*3'
- PASS value '(1+2)*3'
- PASS value '2^3^2'
- PASS value '-2^2'
- PASS value '(-2)^2'
- PASS value '2^-1'
- PASS value '10/4'
- PASS value '7 - 2 - 1'
- PASS value '64/4/2'
- PASS value '--3'
- PASS value '-+-3'
- PASS value '.5+7.'
- PASS value '3.25*4'
- PASS value 'max(1, 5, 3) - min(4, 2)'
- PASS value 'abs(-7/2)'
- PASS value '2*x^2 + y'
- PASS value '  ( ( 1 ) ) '
- PASS value '0.1+0.2'
- PASS value '2^0'
- PASS value '(1/3)^-2'
- PASS value '-x'
- PASS value 'max(-1)'
- PASS value '1-2^2^0'
- PASS value '-(2+3)*2'
- PASS value '2^(1+1)^2'
- PASS error ''
- PASS error '1 +'
- PASS error '* 2'
- PASS error '(1'
- PASS error '1)'
- PASS error '2 3'
- PASS error '1..2'
- PASS error 'abs 3'
- PASS error '3 $ 4'
- PASS error 'abs(1, 2)'
- PASS error 'min()'
- PASS error 'foo(1)'
- PASS error '2^(1/2)'
- PASS error '1/0'
- PASS error '0^-1'
- PASS error 'q + 1'
- PASS error 'max(1,)'
- PASS 400 random expressions

## h_t3_postfx_invert — 67%
- PASS compiles_strict
- PASS loads
- FAIL renders
- PASS composer_exposed
- FAIL background_inverted_srgb
- PASS sphere_inverted_to_black
- PASS composer_resizes
- PASS resize
- FAIL no_console_errors
  - note: console.error: THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false

Material Name: unspecified
Material Type: ShaderMaterial

Program Info Log: Fragment shader is not compiled.

FRAGMENT

ERROR: 0:80: 'output' : Illegal use of reserved word
ERROR: 0:80: 'output' : syntax error

  75:       // Convert from linear to sRGB to recover original sRGB values
  76:       vec3 srgb = linearToSRGB(color.rgb);
  77:       // Invert in sRGB space
  78:       vec3 inverted = 1.0 - srgb;
  79:       // Convert back to linear so OutputPass handles the final linear->sRGB correctly
> 80:       vec3 output = sRGBToLinear(inverted);
  81:       gl_FragColor = vec4(output, color.a);
  82:     }
  83:   

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
