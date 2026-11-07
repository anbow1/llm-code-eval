# UNITAS 6497-1 — animacja zegarka i nagrywanie wideo

Interaktywny model mechanizmu zegarka UNITAS 6497-1 w three.js (`index.html`) oraz dwa sposoby zapisu animacji do pliku MP4 (H.264, 1920×1080):

1. **Nagrywanie w przeglądarce** — przycisk w panelu strony, bez instalacji.
2. **Loader offline** (`render_video.mjs`) — renderuje stronę klatka po klatce i składa film o dokładnie zadanej długości.

## Pliki

| Plik | Opis |
|---|---|
| `index.html` | Cała strona (jeden plik). Biblioteki three.js i lil-gui ładuje z unpkg.com, więc potrzebny jest dostęp do internetu. |
| `render_video.mjs` | Loader offline: Node.js + Playwright (headless Chromium) + ffmpeg. |
| `package.json` | Zależność `playwright` dla loadera. |
| `package-lock.json` | Zablokowane wersje zależności. |
| `.gitignore` | Ignoruje `node_modules/` i pliki `*.mp4`. |

## 1. Podgląd

Otwórz `index.html` w przeglądarce z obsługą WebGL (Chrome, Edge, Firefox, Safari). Obracaj zegarek myszą, klikaj części, a w panelu po prawej zmieniaj ustawienia.

## 2. Nagrywanie w przeglądarce (MP4, 1080p, H.264)

1. Otwórz `index.html` w **Chrome** lub **Edge** (nagrywanie korzysta z WebCodecs i kodowania H.264; w Firefoksie i Safari może nie działać — wtedy użyj loadera offline).
2. W panelu po prawej rozwiń **Video Recording · MP4 H.264**.
3. Ustaw:
   - **Length (s)** — długość filmu w sekundach (1–120),
   - **Frame rate** — 30 lub 60 kl./s,
   - **Bitrate (Mbps)** — jakość; domyślnie 16 Mb/s.
4. Kliknij **● Record 1080p MP4**. Etykieta przycisku pokazuje postęp. Po zakończeniu plik `unitas-6497-1_1920x1080_<fps>fps.mp4` pobiera się automatycznie.

Uwagi:
- Film nie zawiera dźwięku (dźwięk spustu jest wyciszony podczas nagrywania).
- Podczas nagrywania płótno ma proporcje 16:9, więc w oknie przeglądarki może pojawić się czarny pas.
- Czas nagrywania zależy od karty graficznej. Klatki są liczone w stałym kroku czasu, więc długość filmu jest dokładna niezależnie od szybkości komputera.

## 3. Loader offline (`render_video.mjs`)

### Wymagania

- **Node.js** 18.3 lub nowszy (https://nodejs.org).
- **ffmpeg** w zmiennej PATH:
  - Windows: `winget install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Linux (Debian/Ubuntu): `sudo apt install ffmpeg`

### Instalacja (jednorazowo)

```bash
cd unitas
npm install
npx playwright install chromium
```

### Użycie

```bash
node render_video.mjs --seconds 12
node render_video.mjs --seconds 30 --fps 30 --out dial.mp4
node render_video.mjs --seconds 8 --query "explode=1&spread=0.6"
```

Domyślnie plik trafia do bieżącego katalogu jako `unitas-6497-1_1920x1080.mp4`. Skrót: `npm run render` nagrywa 10 s.

### Opcje

| Opcja | Domyślnie | Opis |
|---|---|---|
| `--seconds N` | — (wymagane) | Długość filmu w sekundach. |
| `--fps N` | `60` | Liczba klatek na sekundę. |
| `--out PLIK` | `unitas-6497-1_1920x1080.mp4` | Plik wyjściowy. |
| `--html PLIK` | `index.html` obok skryptu | Strona do wyrenderowania. |
| `--query TEKST` | pusty | Parametry adresu strony, np. `explode=1&spread=0.6`. |
| `--crf N` | `18` | Jakość x264: im niżej, tym lepiej i większy plik (sensowny zakres 16–23). |
| `--chromium SCIEŻKA` | Chromium z Playwrighta | Własna przeglądarka (można też ustawić zmienną `CHROMIUM_PATH`). |

### Parametry strony (`--query`)

| Parametr | Efekt |
|---|---|
| `explode=0..1` | Stopień rozłożenia mechanizmu. |
| `spread=0..1` | Rozsunięcie kół w bok. |
| `cam=x,y,z` | Pozycja kamery. |
| `target=x,y,z` | Punkt, na który patrzy kamera. |
| `labels=0` | Ukrywa etykiety części. |
| `guides=0` | Ukrywa linie prowadzące. |

Parametry można łączyć znakiem `&`.

### Wynik

Film ma dokładnie `--seconds × --fps` klatek, kodek H.264 (High, poziom 4.2), format `yuv420p` i przełącznik `faststart`, więc odtwarza się w przeglądarkach i na większości odtwarzaczy.

## Rozwiązywanie problemów

| Komunikat | Co zrobić |
|---|---|
| `ffmpeg was not found on PATH` | Zainstaluj ffmpeg (patrz wyżej) i otwórz nowy terminal. |
| `Executable doesn't exist` | Uruchom `npx playwright install chromium` albo podaj `--chromium`. |
| Timeout przy czekaniu na `__UNITAS_READY__` | Sprawdź połączenie z internetem (unpkg.com) i to, czy strona otwiera się w przeglądarce. |
| `WebCodecs unavailable` (w przeglądarce) | Użyj Chrome lub Edge. |
| `H.264 1080p not supported here` (w przeglądarce) | Użyj loadera offline. |
| Nagrywanie trwa bardzo długo | Normalne przy renderowaniu programowym bez karty graficznej. Zmniejsz długość albo FPS. |

## Jak to działa

- Strona udostępnia hooki `window.__UNITAS_CAPTURE__` (`begin`, `frame`, `end`) oraz `window.__UNITAS_REC__` (ustawienia nagrania). Loader i nagrywanie w przeglądarce sterują tą samą funkcją `renderFrame(dt)`.
- Każda klatka przesuwa symulację o dokładnie `1/fps` sekundy, a nie o czas rzeczywisty. Dzięki temu długość filmu nie zależy od wydajności komputera.
