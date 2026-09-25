# llm-code-eval — szybki test lokalnych modeli

## Wyniki (25.09.2026, RTX 5090 32 GB + 128 GB RAM)

**Zwycięzca: Qwen3.8-27B UD-Q6_K_M na poziomie `low` (llama.cpp): 100% w 4,7 min, 40 GB RAM.** Najlepszy duży model to GLM-5.3-Flash EXL3 3.05 bpw na `high` (99,5% w 20,5 min, 118 GB RAM). Poziom myślenia liczy się bardziej niż wybór modelu: dla Qwen najlepsze są `low`/`medium` (`xhigh` przy kodzie myśli 8× dłużej), a dla GLM `high`.

| Model | Kwantyzacja | Poziom | Wynik | Czas | Tokeny razem | Śr. tok/s (z czasu) |
|---|---|---|---|---|---|---|
| Qwen3.8-27B | UD-Q6_K_M | low | 100.0% | 4.7 min | 28.7k | 108.9 |
| Qwen3.8-27B | UD-Q6_K_M | medium | 98.6% | 3.9 min | 22.2k | 105.3 |
| GLM-5.3-Flash | EXL3 3.05 bpw | high | 99.5% | 20.5 min | 15.0k | 12.4 |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | medium | 99.2% | 29.5 min | 55.4k | 31.7 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | medium | 100.0% | 54.6 min | 72.1k | 22.2 |

Śr. tok/s (z czasu) = wszystkie wygenerowane tokeny ÷ łączny czas generowania.

Pełne podsumowanie: [SUMMARY.md](SUMMARY.md). Wszystkie 12 przebiegów i wyniki każdego zadania: [RESULTS_TABLE.md](RESULTS_TABLE.md).


10 zadań: 6 × TypeScript + Three.js, 4 × Python. Wszystko sprawdzane automatycznie.

## Instalacja (raz)

```
pip install playwright pillow
python -m playwright install chromium
```

Potrzebny też Node.js 20+ (`node -v`). Przy pierwszym starcie skrypt sam zainstaluje three, typescript i esbuild do `ts_env/`.

## Start

Uruchom model na serwerze zgodnym z OpenAI (llama.cpp, TabbyAPI, LM Studio, Ollama), potem:

```
python run_eval.py --base-url http://localhost:8080/v1 --label qwen-flash-iq3xxs
```

Najważniejsze opcje:
- `--label` — krótka nazwa w raporcie (zamiast długiej ścieżki do pliku)
- `--preset qwen-think` / `qwen-instruct` / `glm` — ustawienia próbkowania zalecane przez twórców modelu
- `--temperature 1.0` — domyślnie 1.0; `--top-p`, `--top-k`, `--min-p`, `--presence-penalty`, `--repetition-penalty` nadpisują preset
- `--max-tokens 65536` — limit tokenów na zadanie, razem z myśleniem (domyślnie 65536)
- `--task-timeout-min 60` — limit czasu na jedno zadanie (domyślnie 60 min)
- `--budget-min 0` — limit na cały przebieg, 0 = bez limitu (domyślnie)
- `--think off` — wyłącza myślenie (enable_thinking=false w szablonie Qwen/GLM)
- `--reasoning-effort low` — poziom myślenia (np. low / medium / high / xhigh), jeśli serwer to obsługuje
- `--reasoning-effort off,low,xhigh` — pełny test po kolei na każdym poziomie, każdy z osobnym raportem
- `--probe-effort` — szybka sonda (poziomy dobiera do presetu: GLM `off,low,high,max`, Qwen `off,low,medium,xhigh`; możesz podać własne, od najsłabszego): jedno krótkie pytanie na każdym poziomie; pokazuje, ile model myśli i czy serwer w ogóle zmienia poziom; domyślnie 3 próby na poziom (`--probe-repeats`); `--probe-question hard` daje trudniejsze pytanie, przy którym poziom myślenia ma większe znaczenie
- `--only three` / `--only python`, `--tasks t5_raycast_click` — tylko wybrane zadania

| Preset | Ustawienia |
|---|---|
| qwen-think | temperature 1.0, top_p 0.95, top_k 20, min_p 0, presence_penalty 0, repetition_penalty 1.0 |
| qwen-instruct | temperature 0.7, top_p 0.80, top_k 20, min_p 0, presence_penalty 1.5, repetition_penalty 1.0 (użyj z `--think off`) |
| glm | temperature 1.0, top_p 1.0 |

Przy temperaturze 1.0 wyniki różnią się między przebiegami. Do porównań warto puścić każdy model 2 razy.

Pomiar pamięci wymaga: `pip install psutil` (VRAM czyta z `nvidia-smi`).

Porównanie przebiegów (najnowszy przebieg każdej nazwy; `--all` pokazuje wszystkie):

```
python compare.py
```

## Co jest mierzone

- wynik każdego zadania i status: `ok`, `max_tokens` (skończył się limit tokenów), `task_timeout`, `server_crash`, `server_down`
- „fin.” — średni wynik tylko z zadań, które model skończył (oddziela jakość od szybkości)
- czas, tokeny (w tym tokeny myślenia), szybkość generowania (tok/s), czas do pierwszego tokena
- szczytowe VRAM i RAM oraz ile GB przeczytano z dysku w czasie testu
- tekst myślenia zapisuje się w `reasoning.md` obok odpowiedzi

## Co jest sprawdzane

Three.js — każde zadanie:
- kompiluje się w `tsc --strict`
- ładuje się w przeglądarce i nie ma błędów w konsoli
- coś widać na ekranie (nie pusty kolor)
- dobrze reaguje na zmianę rozmiaru okna
- plus testy zadania (np. czy kostka się obraca, czy klik zaznacza właściwą kostkę, czy normalne patrzą w górę)

| Zadanie | Co testuje |
|---|---|
| t1_cube | podstawy: scena, światło, animacja z delta time |
| t2_solar | hierarchia obiektów, orbity, PointLight |
| t3_instanced_wave | InstancedMesh 10 000 kostek, wydajność |
| t4_shader_water | własny ShaderMaterial, GLSL, uniformy |
| t5_raycast_click | Raycaster, klik myszką, stan zaznaczenia |
| t6_terrain | własna BufferGeometry, indeksy, kolejność wierzchołków, OrbitControls z addons |

Python — ukryte testy (poprawność + wydajność):

| Zadanie | Co testuje |
|---|---|
| p1_parse_duration | dokładne czytanie specyfikacji, przypadki brzegowe |
| p2_sliding_median | algorytm + wydajność (200k elementów) |
| p3_topo_order | graf, najmniejsza leksykograficznie kolejność, cykle |
| p4_gather_limited | asyncio: limit, kolejność, anulowanie po błędzie |

## Wyniki

Każdy przebieg trafia do `results/<data>_<model>/`:
- `report.md` — co przeszło, co nie i dlaczego
- `summary.json` — liczby do porównań
- w folderze zadania: pełna odpowiedź modelu, kod i `screenshot.png`

## Wskazówki

- Używaj presetu zalecanego dla danego modelu.
- Modele „myślące” mogą pisać bardzo długo. Jeśli czas się kończy, wyłącz myślenie albo zmniejsz `--max-tokens`.
- Zadania i testy są w `tasks.py`. Łatwo dodać własne.
