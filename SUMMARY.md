# Podsumowanie testów lokalnych modeli (25.09.2026)

## Bardzo krótko

- **Zwycięzca: Qwen3.8-27B UD-Q6_K_M na poziomie `low` (llama.cpp): 100% w 4,7 min, 40 GB RAM.** Żaden większy model nie dał lepszej jakości, a każdy był od 4 do 40 razy wolniejszy.
- Najlepszy duży model: GLM-5.3-Flash EXL3 3.05 bpw, poziom `high`: 99,5% w 20,5 min, ale zajmuje 118 GB RAM.
- Poziom myślenia ma większe znaczenie niż wybór modelu. Qwen działa najlepiej na `low`/`medium`, a `xhigh` przy kodzie myśli 8× dłużej i nie daje lepszego kodu. GLM działa najlepiej na `high`: `low` robi błędy, a `max` jest 10× wolniejszy.
- Test (10 zadań) jest już za łatwy dla najlepszych modeli. Do dalszego rozróżniania potrzebne są trudniejsze zadania.

## Sprzęt i ustawienia

- RTX 5090 32 GB VRAM + 128 GB RAM DDR5, Windows.
- Backendy: llama.cpp (`llama-server --jinja`) i ExLlamaV3 (TabbyAPI).
- 10 zadań: 6 × TypeScript + Three.js (sprawdzane w przeglądarce: kompilacja `tsc --strict`, render, animacja, klikanie, zmiana rozmiaru okna) i 4 × Python (ukryte testy poprawności i wydajności).
- Wszystkie przebiegi w tabeli: temperatura 1.0, próbkowanie według zaleceń twórców modelu (`--preset glm` / `qwen-think`), limit 65 536 tokenów i 60 min na zadanie.
- Każde ustawienie było uruchomione raz.

Pełna tabela i wyniki każdego zadania są w [RESULTS_TABLE.md](RESULTS_TABLE.md). Surowe dane (kod modeli, myślenie, zrzuty ekranu) są w `results/`.

## Tabela wyników

| # | Model | Kwantyzacja | Backend | Poziom | Wynik | Czas (min) | Tokeny myślenia | tok/s | RAM GB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | low | **100.0%** | **4.7** | 21.9k | 121 | 39.8 |
| 2 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | medium | **100.0%** | 54.6 | 64.4k | 23 | 67.3 |
| 3 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | high | **99.5%** | 20.5 | 7.8k | 14 | 117.7 |
| 4 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | medium | **99.2%** | 29.5 | 47.7k | 39 | 101.3 |
| 5 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | medium | **98.6%** | **3.9** | 14.1k | 120 | 39.7 |
| 6 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | high | 93.9% | 18.8 | 6.4k | 14 | 127.1 |
| 7 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | xhigh | 92.9% | 37.5 | 184.8k | 94 | 39.7 |
| 8 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | medium | 90.6% | 12.8 | 18.0k | 36 | 86.1 |
| 9 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | low | 87.5% | 68.2 | 80.3k | 23 | 63.6 |
| 10 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | max | 87.5% | 205.8 | 62.2k | 9 | 120.5 |
| 11 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | low | 82.9% | 13.7 | 1.0k | 14 | 119.7 |
| 12 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | xhigh | 79.2% | 84.7 | 51.4k | 18 | 83.3 |

VRAM we wszystkich przebiegach: 24,6–30,8 GB.

## Jakość

Pięć ustawień uzyskało 98,6% lub więcej:

- Qwen3.8-27B `low`: 100%
- Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS `medium`: 100%
- GLM-5.3-Flash EXL3 `high`: 99,5%
- Qwen3.8-Flash-Next UD-Q4_K_XL `medium`: 99,2%
- Qwen3.8-27B `medium`: 98,6%

Różnice między nimi to pojedyncze przypadki testowe. Przy jednym przebiegu i temperaturze 1.0 mieszczą się w granicach przypadku. W tej grupie **jakość jest praktycznie równa**.

Zadania Three.js poszły dobrze prawie wszystkim: 9 z 12 ustawień miało tam 100%. Różnice robiły zadania Python, zwłaszcza:

- **p2_sliding_median** (mediana w przesuwanym oknie). Pojawiły się błąd przesunięcia o jeden (Qwen 27B `xhigh`, po 39 000 tokenów myślenia), `IndexError` (Qwen EXL3 `medium`) i koniec limitu 65 536 tokenów (Qwen IQ3_XXS `low`).
- **p4_gather_limited** (asyncio z limitem). GLM `low` użył czegoś, czego nie ma w asyncio (`asyncio.exceptions.FIRST_EXCEPTION`). GLM `max` myślał ponad 22 000 tokenów i przekroczył 60 minut.
- **p1_parse_duration** (parser czasu). Najczęstszy błąd to odrzucanie zapisu „1h30m” bez spacji albo przepuszczanie „1 h”.

Błędy, które nie były złym kodem, tylko awarią generowania:

- Qwen Flash-Next EXL3 `xhigh`: w `p1` model zapętlił się i pisał same zera przez 7 800 tokenów, a w `t6` przestał pisać w środku myślenia i nie dał kodu.
- GLM GSQ-RCO 3.5-bit (llama.cpp): błędy kompilacji TypeScript w `t1` i `t2` (nieistniejące pole, niezdefiniowana zmienna). Ten sam model w EXL3 3.05 bpw ich nie zrobił.

## Jakość a czas

| Ustawienie | Wynik | Czas | Uwagi |
|---|---|---|---|
| Qwen3.8-27B `medium` | 98.6% | 3.9 min | najszybszy |
| Qwen3.8-27B `low` | 100.0% | 4.7 min | najlepszy stosunek jakości do czasu |
| Qwen3.8-Flash-Next EXL3 `medium` | 90.6% | 12.8 min | |
| GLM-5.3-Flash EXL3 `low` | 82.9% | 13.7 min | za mało myślenia |
| GLM GSQ-RCO 3.5-bit `high` | 93.9% | 18.8 min | |
| GLM-5.3-Flash EXL3 `high` | 99.5% | 20.5 min | najlepszy duży model |
| Qwen3.8-Flash-Next UD-Q4_K_XL `medium` | 99.2% | 29.5 min | |
| Qwen3.8-27B `xhigh` | 92.9% | 37.5 min | przemyśla kod |
| Qwen3.8-Flash-Next IQ3_XXS `medium` | 100.0% | 54.6 min | |
| Qwen3.8-Flash-Next IQ3_XXS `low` | 87.5% | 68.2 min | |
| Qwen3.8-Flash-Next EXL3 `xhigh` | 79.2% | 84.7 min | awarie generowania |
| GLM-5.3-Flash EXL3 `max` | 87.5% | 205.8 min | przekroczony limit czasu |

- **Qwen3.8-27B wygrywa zdecydowanie.** 100% w 4,7 minuty. Szybszy jest tylko ten sam model na `medium` (3,9 min, 98,6%), a wszystkie inne ustawienia są wolniejsze i nie lepsze. Generuje 120 tok/s, bo cały mieści się w VRAM.
- **Duże modele MoE są wolne na tym sprzęcie.** Generują 9–39 tok/s, bo większość ekspertów leży w RAM. Myślą też dłużej, więc zadanie trwa kilka razy dłużej.
- Najszybszy duży model to Qwen Flash-Next UD-Q4_K_XL (39 tok/s). GLM generuje 14 tok/s, ale myśli krótko (7 800 tokenów przy `high`), więc kończy test w 20 minut.
- Wolniejsza szybkość w części zadań GLM `max` (spadki do 2,7 tok/s) zbiegła się z użyciem RAM ok. 120 GB ze 128 GB. Możliwe, że Windows zaczął przenosić pamięć na dysk.

## Poziomy myślenia

**Qwen (szablon zna `low`, `medium`, `xhigh`, domyślnie `xhigh`).**

- `xhigh` dodaje do promptu instrukcję „sprawdzaj założenia, rozważ alternatywy”. Przy kodzie model zaczyna wtedy analizować w kółko.
- Qwen 27B: `low` 21,9 tys. tokenów myślenia, `medium` 14,1 tys., `xhigh` 184,8 tys. `xhigh` był 8× wolniejszy i dał gorszy wynik.
- Qwen Flash-Next EXL3: `medium` 90,6% w 12,8 min, a `xhigh` 79,2% w 84,7 min, do tego z dwiema awariami generowania.
- Na krótkim pytaniu matematycznym `xhigh` myślał za to najkrócej i się nie mylił. Działanie poziomu zależy więc od rodzaju zadania.
- **Do kodu: `low` albo `medium`.**

**GLM-5.3 (szablon zna tylko `low` i `high`, każda inna wartość to `max`).**

- `low` prawie nie myśli (1 000 tokenów na cały test), więc robi prawdziwe błędy (82,9%).
- `high` to najlepszy kompromis: 99,5% w 20,5 min.
- `max` myśli 8× dłużej niż `high`, trwa 206 min i przekroczył limit czasu w jednym zadaniu.
- **Do kodu: `high`.**

## Zastrzeżenia

- Każde ustawienie było uruchomione raz, przy temperaturze 1.0. Różnice kilku punktów mogą być przypadkowe. Różnice w czasie i liczbie tokenów powtarzały się za to w każdym zadaniu.
- 10 zadań to mało, a najlepsze modele mają już ~100%. Test nie rozróżnia ich jakości. Mierzy głównie jednorazowe pisanie kodu, a nie długą pracę agentową (tam według kart modeli GLM i DeepSeek mają przewagę).
- Etykiety `qwen27b-q6-temp0-*` są mylące: te przebiegi miały temperaturę 1.0, a nie 0.
- Czas zależy od obciążenia komputera i zajętości RAM w trakcie testu.
- Kwantyzacje różnią się rozmiarem i backendem, więc to porównanie konkretnych plików na tym sprzęcie, a nie samych modeli.

## Przebiegi przerwane (bez wyniku, nie ma ich w tabeli)

- Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS `xhigh` (4 zadania): w `p2` i `t2` myślał 240–250 tys. znaków i nie dał odpowiedzi.
- Qwen3.8-Flash-Next EXL3 5.05, drugi przebieg (4 zadania): w `p1` brak odpowiedzi po ok. 100 tys. znaków myślenia.
- GLM-5.3-Flash GSQ-RCO 3.0-bit: trzy próby, każda przerwana po 3 zadaniach.
- Qwen3.8-Flash-Next UD-Q4_K_XL, pierwsza próba (2 zadania).

Wcześniejsze testy z 24.09 (temperatura 0, limit 12 000 tokenów, starsza wersja skryptu) nie są porównywalne i nie są tu uwzględnione.

## Co dalej

- Codzienna praca z kodem: Qwen3.8-27B Q6 na `low` albo `medium` (`--chat-template-kwargs "{\"reasoning_effort\":\"low\"}"`).
- Jeśli potrzebny większy model: GLM-5.3-Flash EXL3 3.05 bpw na `high`.
- Do lepszego rozróżnienia modeli dodać trudniejsze zadania i powtarzać każdy przebieg 2–3 razy.

Tabele odtworzysz z danych poleceniem: `python make_summary.py`
