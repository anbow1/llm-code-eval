# Tabela wyników

Wszystkie przebiegi: temperatura 1.0, limit 65 536 tokenów i 60 min na zadanie, 10 zadań (6 × TypeScript + Three.js, 4 × Python). Jeden przebieg na ustawienie.

| # | Model | Kwantyzacja | Backend | Poziom myślenia | Wynik | Python | Three.js | Czas (min) | Tokeny | Myślenie | tok/s | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | low | **100.0%** | 100.0 | 100.0 | 4.7 | 28.7k | 21.9k | 121 | 29.8 | 39.8 |
| 2 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | medium | **100.0%** | 100.0 | 100.0 | 54.6 | 72.1k | 64.4k | 23 | 24.6 | 67.3 |
| 3 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | high | **99.5%** | 99.1 | 100.0 | 20.5 | 15.0k | 7.8k | 14 | 27.0 | 117.7 |
| 4 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | medium | **99.2%** | 100.0 | 98.5 | 29.5 | 55.4k | 47.7k | 39 | 26.8 | 101.3 |
| 5 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | medium | **98.6%** | 97.2 | 100.0 | 3.9 | 22.2k | 14.1k | 120 | 29.8 | 39.7 |
| 6 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | high | **93.9%** | 100.0 | 87.9 | 18.8 | 13.5k | 6.4k | 14 | 30.8 | 127.1 |
| 7 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | domyślny (xhigh) | **92.9%** | 85.7 | 100.0 | 37.5 | 194.0k | 184.8k | 94 | 30.0 | 39.7 |
| 8 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | medium | **90.6%** | 81.2 | 100.0 | 12.8 | 25.0k | 18.0k | 36 | 29.3 | 86.1 |
| 9 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | low | **87.5%** | 75.0 | 100.0 | 68.2 | 87.6k | 80.3k | 23 | 24.6 | 63.6 |
| 10 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | max | **87.5%** | 75.0 | 100.0 | 205.8 | 65.8k | 62.2k | 9 | 27.0 | 120.5 |
| 11 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | low | **82.9%** | 65.7 | 100.0 | 13.7 | 9.6k | 1.0k | 14 | 27.0 | 119.7 |
| 12 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | domyślny (xhigh) | **79.2%** | 75.0 | 83.3 | 84.7 | 53.6k | 51.4k | 18 | 29.4 | 83.3 |

## Wynik na zadanie (%)

| Model / poziom | t1_cube | t2_solar | t3_instanced_wave | t4_shader_water | t5_raycast_click | t6_terrain | p1_parse_duration | p2_sliding_median | p3_topo_order | p4_gather_limited |
|---|---|---|---|---|---|---|---|---|---|---|
| Qwen3.8-27B UD-Q6_K_M / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| GLM-5.3-Flash EXL3 3.05 bpw / high | 100 | 100 | 100 | 100 | 100 | 100 | 96 | 100 | 100 | 100 |
| Qwen3.8-Flash-Next UD-Q4_K_XL / medium | 100 | 91 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Qwen3.8-27B UD-Q6_K_M / medium | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 100 | 100 | 100 |
| GLM-5.3-Flash GSQ-RCO 3.5-bit / high | 45 | 82 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Qwen3.8-27B UD-Q6_K_M / domyślny (xhigh) | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| Qwen3.8-Flash-Next EXL3 5.05 bpw / medium | 100 | 100 | 100 | 100 | 100 | 100 | 96 | 29 | 100 | 100 |
| Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (limit) | 100 | 100 |
| GLM-5.3-Flash EXL3 3.05 bpw / max | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (czas) |
| GLM-5.3-Flash EXL3 3.05 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 63 | 100 | 100 | 0 |
| Qwen3.8-Flash-Next EXL3 5.05 bpw / domyślny (xhigh) | 100 | 100 | 100 | 100 | 100 | 0 | 0 | 100 | 100 | 100 |

(limit) = skończył się limit tokenów, (czas) = przekroczony limit 60 min, (brak) = model skończył w trakcie myślenia bez odpowiedzi.
