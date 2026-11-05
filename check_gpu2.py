from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path("results_engineering/20261103-152413_DeepSeek-V4.1-Flash-1017-UD-IQ3_XXS-maya-ENG/e1_watch_unitas/scene.html").resolve()
JS = """() => { const c = document.createElement('canvas');
    const g = c.getContext('webgl2') || c.getContext('webgl');
    if (!g) return 'no WebGL';
    const d = g.getExtension('WEBGL_debug_renderer_info');
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'renderer hidden'; }"""

variants = [
    ("channel chromium", dict(channel="chromium")),
    ("channel chromium + d3d11", dict(channel="chromium", args=["--use-angle=d3d11", "--ignore-gpu-blocklist"])),
    ("headful", dict(headless=False)),
    ("headful + d3d11", dict(headless=False, args=["--use-angle=d3d11", "--ignore-gpu-blocklist"])),
]

with sync_playwright() as pw:
    for label, kw in variants:
        try:
            b = pw.chromium.launch(**kw)
            p = b.new_page()
            p.goto(html.as_uri())
            print(f"{label}: {p.evaluate(JS)}", flush=True)
            b.close()
        except Exception as e:
            print(f"{label}: error {type(e).__name__}: {str(e)[:120]}", flush=True)