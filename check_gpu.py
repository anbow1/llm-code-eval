from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path("results_engineering/20261103-152413_DeepSeek-V4.1-Flash-1017-UD-IQ3_XXS-maya-ENG/e1_watch_unitas/scene.html").resolve()
with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = b.new_page()
    p.goto(html.as_uri())
    print(p.evaluate("""() => { const c = document.createElement('canvas');
        const g = c.getContext('webgl2') || c.getContext('webgl');
        if (!g) return 'no WebGL';
        const d = g.getExtension('WEBGL_debug_renderer_info');
        return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'renderer hidden'; }"""))
    b.close()