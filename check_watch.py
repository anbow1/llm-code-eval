import time
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path("results_engineering/20261103-152413_DeepSeek-V4.1-Flash-1017-UD-IQ3_XXS-maya-ENG/e1_watch_unitas/scene.html").resolve()

def try_launch(label, **kw):
    print(f"--- {label}", flush=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch(**kw)
        p = b.new_page(viewport={"width": 640, "height": 360})
        p.goto(html.as_uri())
        t = time.time()
        try:
            p.wait_for_function("() => window.__ready === true", timeout=60000)
            print("  ready after", round(time.time() - t, 1), "s", flush=True)
        except Exception as e:
            print("  not ready:", type(e).__name__, flush=True)
        t = time.time()
        try:
            p.screenshot(path=f"test_{label}.png", timeout=20000)
            print("  screenshot ok in", round(time.time() - t, 2), "s", flush=True)
        except Exception as e:
            print("  screenshot failed:", type(e).__name__, flush=True)
        b.close()

try_launch("default")
try_launch("swiftshader", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
try_launch("no-gpu", args=["--disable-gpu"])