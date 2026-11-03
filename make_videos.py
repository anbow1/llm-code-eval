#!/usr/bin/env python3
"""10-second videos of the three Three.js tests, one tile per quantization, side by side like the graphics.

    python make_videos.py                  every test, all models and DeepSeek only (videos/*.mp4)
    python make_videos.py --test watch     one test (island, watch or rocket)

Each tile is the best run of one model version (model, quant, backend), the same runs as the galleries: the best by
eye for the test (the island uses the scene ratings). The tile caption is the quantization only.
Watch and rocket are rendered frame by frame: the simulation is stepped by exactly 1/fps per frame, so the motion
does not depend on how fast the software renderer runs. The rocket is at x1 for the first 2 s, then x30 (the page's own
key 3). The island has no stepping hook, so its clock and frame loop are replaced by a manual clock (FAKE_CLOCK_JS): each frame
advances the scene by exactly 1/30 s, so the water and the boat move smoothly at 30 frames per second.
Needs ffmpeg, Pillow and Playwright with Chromium (CHROMIUM_PATH, as for run_eval.py).
"""
import argparse
import io
import json
import math
import os
import shutil
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import make_summary as ms  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE / "videos"
WORK = Path(os.environ.get("VIDEO_WORK", HERE / "video_work"))  # frames; not part of the repo
FPS, SECS = 20, 10  # watch and rocket; the island uses 30
TILE_W, TILE_H = 480, 270
COLS_MAX = 4
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

TESTS = {
    # name: (suite folder, html file inside the run folder, capture kind, rating key, frames per second)
    "island": ("results_scene", "s1_ocean_island/scene.html", "scene", "overall", 30),
    "watch": ("results_engineering", "e1_watch_unitas/scene.html", "watch", "watch", 20),
    "rocket": ("results_engineering", "e2_rocket_launch/scene.html", "rocket", "rocket", 20),
}

# replaces the page's clock and frame loop: window.__tick(ms) advances the clock and runs the queued frame callbacks,
# so one call renders exactly one frame at a known time (THREE.Clock reads performance.now())
FAKE_CLOCK_JS = """
(() => {
  let now = 0, queue = [];
  performance.now = () => now;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.__tick = ms => { now += ms; const q = queue; queue = []; q.forEach(cb => cb(now)); return now; };
})();
"""


def pick_runs(folder, key):
    """One run per model version (model, quant, backend): the best by eye for this test, then by the automatic score."""
    runs = ms.load_runs(folder)
    rating = ms.scene_ratings() if folder == "results_scene" else ms.engineering_ratings()
    groups = {}
    for r in runs:
        groups.setdefault((r["model"], r["quant"], r["backend"]), []).append(r)
    keep = [max(rs, key=lambda r: (rating.get(r["run"], {}).get(key, -1), r["overall"], r["run"]))
            for rs in groups.values()]
    keep.sort(key=lambda r: (-rating.get(r["run"], {}).get(key, -1), -r["overall"]))
    return keep


def shot(page, path):
    """One rendered frame, after two animation frames, as a small JPEG."""
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))")
    im = Image.open(io.BytesIO(page.screenshot(type="jpeg", quality=88))).convert("RGB")
    im.resize((TILE_W, TILE_H), Image.LANCZOS).save(path, quality=88)


def capture(browser, html, kind, outdir, fps):
    """Frames of one run: FPS * SECS of them, one per simulated 1/fps s (the island: one per 1/30 s of its own clock)."""
    outdir.mkdir(parents=True, exist_ok=True)
    n = fps * SECS
    if kind == "scene":
        page = browser.new_page(viewport={"width": TILE_W, "height": TILE_H})
        page.add_init_script(FAKE_CLOCK_JS)
        page.goto(html.as_uri())
        for _ in range(60):  # the first rendered frame sets __ready
            if page.evaluate("() => { window.__tick(1000 / 30); return window.__ready === true; }"):
                break
        for i in range(n):
            page.evaluate("() => window.__tick(1000 / 30)")
            page.screenshot(path=str(outdir / f"{i:04d}.jpg"), type="jpeg", quality=88)
        page.close()
        return sorted(outdir.glob("*.jpg"))
    page = browser.new_page(viewport={"width": 640, "height": 360})
    page.goto(html.as_uri())
    from playwright.sync_api import TimeoutError as PlaywrightTimeout
    try:
        page.wait_for_function("() => window.__ready === true", timeout=60000)
    except PlaywrightTimeout:
        # the page never starts (it does not compile): film its screen as it is
        for i in range(n):
            shot(page, outdir / f"{i:04d}.jpg")
        page.close()
        return sorted(outdir.glob("*.jpg"))
    if kind == "watch":
        page.evaluate("() => { const w = window.__watch; w.paused = true; w.reset(); }")
        for i in range(n):
            page.evaluate(f"() => window.__watch.step(1 / {fps})")
            shot(page, outdir / f"{i:04d}.jpg")
    else:
        page.evaluate("() => { const r = window.__rocket; r.paused = true; r.reset(); }")
        for i in range(n):
            if i == 2 * fps:
                page.keyboard.press("3")  # x30 from 2 s on, the page's own speed key
            speed = 1 if i < 2 * fps else 30
            page.evaluate("d => window.__rocket.step(d)", speed / fps)
            shot(page, outdir / f"{i:04d}.jpg")
    page.close()
    return sorted(outdir.glob("*.jpg"))


def placeholder(outdir, text):
    """A grey tile for a run with no page (no answer): one frame with the reason."""
    outdir.mkdir(parents=True, exist_ok=True)
    im = Image.new("RGB", (TILE_W, TILE_H), (235, 234, 230))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, 20)
    d.text((TILE_W // 2, TILE_H // 2), text, fill=(90, 90, 90), font=f, anchor="mm")
    p = outdir / "0000.jpg"
    im.save(p, quality=88)
    return [p]


def compose(tiles, out_mp4, frames_dir, fps):
    """tiles: list of (caption, [frame files]). Writes out_mp4 (H.264) with the tiles side by side in a grid."""
    n = len(tiles)
    cols = min(COLS_MAX, n)
    rows = math.ceil(n / cols)
    font = ImageFont.truetype(FONT, 22)
    frames_dir.mkdir(parents=True, exist_ok=True)
    total = fps * SECS
    for i in range(total):
        canvas = Image.new("RGB", (cols * TILE_W, rows * TILE_H), (0, 0, 0))
        for k, (caption, files) in enumerate(tiles):
            j = min(len(files) - 1, int(i * len(files) / total))
            x, y = (k % cols) * TILE_W, (k // cols) * TILE_H
            canvas.paste(Image.open(files[j]).convert("RGB"), (x, y))
            d = ImageDraw.Draw(canvas)
            d.rectangle((x, y + TILE_H - 36, x + TILE_W - 1, y + TILE_H - 1), fill=(0, 0, 0))
            d.text((x + 12, y + TILE_H - 18), caption, fill=(255, 255, 255), font=font, anchor="lm")
        canvas.save(frames_dir / f"{i:04d}.jpg", quality=90)
    out_mp4.parent.mkdir(parents=True, exist_ok=True)
    os.system(f'ffmpeg -y -loglevel error -framerate {fps} -i "{frames_dir}/%04d.jpg" -c:v libx264 '
              f'-pix_fmt yuv420p -crf 23 -movflags +faststart "{out_mp4}"')


def run_test(test, browser):
    folder, html_rel, kind, key, fps = TESTS[test]
    picked = pick_runs(folder, key)
    tiles = []
    for r in picked:
        html = HERE / folder / r["run"] / html_rel
        slug = f"{test}/{r['run']}"
        tile_dir = WORK / slug
        if (tile_dir / "done").exists():
            files = sorted(tile_dir.glob("*.jpg"))
        elif html.is_file():
            print(f"[{test}] {r['model']} {r['quant']} {r['backend']}", flush=True)
            files = capture(browser, html, kind, tile_dir, fps)
            (tile_dir / "done").write_text("ok", encoding="utf-8")
        else:
            files = placeholder(tile_dir, "no answer")
        tiles.append({"model": r["model"], "caption": r["quant"], "files": files, "run": r["run"]})
    (WORK / test).mkdir(parents=True, exist_ok=True)
    (WORK / test / "tiles.json").write_text(json.dumps(
        [{k: v for k, v in t.items() if k != "files"} for t in tiles], indent=1, ensure_ascii=False), encoding="utf-8")
    sets = {
        f"{test}_all": tiles,
        f"{test}_deepseek": [t for t in tiles if t["model"].startswith("DeepSeek")],
    }
    for name, subset in sets.items():
        if not subset:
            continue
        compose([(t["caption"], t["files"]) for t in subset], OUT / f"{name}.mp4", WORK / "frames" / name, fps)
        shutil.rmtree(WORK / "frames" / name, ignore_errors=True)
        print("wrote", OUT / f"{name}.mp4", f"({len(subset)} tiles)", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", choices=list(TESTS), action="append", help="one or more tests (default: all)")
    args = ap.parse_args()
    from playwright.sync_api import sync_playwright
    chosen = args.test or list(TESTS)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=os.environ.get("CHROMIUM_PATH") or None,
            args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        for test in chosen:
            run_test(test, browser)
        browser.close()


if __name__ == "__main__":
    main()
