#!/usr/bin/env python3
"""Render the top-10 summary tables as images.

    python make_top10.py

top10.jpg       every setting (model + quant + backend + GPU + reasoning effort) that has results in BOTH
                suites, ranked by the average of its base-suite and hard-suite scores (each a mean over
                that setting's runs)
top10_hard.jpg  hard suite only, two rankings side by side: by each setting's best run, and by the mean
                of all its runs

Needs Playwright with Chromium, like run_eval.py (set CHROMIUM_PATH to use another build).
"""
import html
import os
from collections import defaultdict
from datetime import date
from pathlib import Path

import make_summary as ms

HERE = Path(__file__).resolve().parent
OUT = HERE / "top10.jpg"
OUT_HARD = HERE / "top10_hard.jpg"
TOP = 10


def collect():
    groups = defaultdict(lambda: {"base": [], "hard": []})
    for suite, (folder, *_rest) in ms.SUITES.items():
        for r in ms.load_runs(folder):
            groups[(r["model"], r["quant"], r["backend"], r["gpu"], r["effort"])][suite].append(r)
    rows = []
    for (model, quant, backend, gpu, effort), by in groups.items():
        if not by["base"] or not by["hard"]:
            continue
        mean = lambda rs, k: sum(r[k] for r in rs) / len(rs)
        everything = by["base"] + by["hard"]
        gen_min = sum(r["gen_minutes"] for r in everything)
        rows.append({
            "model": model, "quant": quant, "backend": backend, "gpu": gpu.replace("RTX ", ""), "effort": effort,
            "base": mean(by["base"], "overall"), "hard": mean(by["hard"], "overall"),
            "runs": f"{len(by['base'])} + {len(by['hard'])}",
            "min_base": mean(by["base"], "minutes"), "min_hard": mean(by["hard"], "minutes"),
            "tok_base": mean(by["base"], "tokens"), "tok_hard": mean(by["hard"], "tokens"),
            "approx_base": any(r["tokens_approx"] for r in by["base"]),
            "approx_hard": any(r["tokens_approx"] for r in by["hard"]),
            # real working speed over both suites: all generated tokens / all generation time
            "speed": sum(r["tokens"] for r in everything) / (gen_min * 60) if gen_min else None,
        })
    for r in rows:
        r["avg"] = (r["base"] + r["hard"]) / 2
    rows.sort(key=lambda r: (-r["avg"], r["min_base"] + r["min_hard"]))
    return rows[:TOP], len(rows)


STYLE = """:root { --surface:#fcfcfb; --text:#0b0b0b; --text2:#52514e; --muted:#8a8984; --rule:#e4e3df;
        --track:#ecebe7; --fill:#2a78d6; --fill-avg:#1c5cab; }
* { box-sizing:border-box; }
body { margin:0; background:var(--surface); color:var(--text);
       font-family:"Inter","Segoe UI","DejaVu Sans",Arial,sans-serif; }
.wrap { padding:36px 40px 28px; width:1640px; }
h1 { font-size:30px; margin:0 0 6px; font-weight:700; letter-spacing:-0.01em; }
.lede { font-size:16px; color:var(--text2); margin:0 0 22px; }
table { border-collapse:collapse; width:100%; font-size:16px; }
th { text-align:left; font-size:13px; font-weight:600; color:var(--text2); text-transform:uppercase;
     letter-spacing:0.04em; padding:0 12px 10px; border-bottom:2px solid var(--text); vertical-align:bottom; }
th small { display:block; text-transform:none; letter-spacing:0; font-weight:400; color:var(--muted); }
td { padding:12px; border-bottom:1px solid var(--rule); vertical-align:middle; }
tr:nth-child(-n+3) td { background:#f4f7fc; }
.rank { font-weight:700; font-size:18px; color:var(--text2); width:36px; text-align:center; }
.model { font-weight:600; }
.sub { font-size:14px; color:var(--text2); margin-top:2px; }
.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
th.num { text-align:right; }
.muted { color:var(--muted); }
.sep { color:var(--muted); padding:0 2px; }
.score { display:flex; flex-direction:column; gap:5px; min-width:118px; font-variant-numeric:tabular-nums; }
.track { height:6px; border-radius:3px; background:var(--track); overflow:hidden; }
.fill { height:100%; border-radius:3px; background:var(--fill); }
.avg .score span { font-weight:700; font-size:18px; }
.avg .fill { background:var(--fill-avg); }
.notes { margin-top:16px; font-size:13px; color:var(--text2); line-height:1.6; }
"""


def bar(value):
    """Score with a thin bar on a 50-100% scale, so the differences that matter are visible."""
    w = max(0.0, min(1.0, (value - 50) / 50)) * 100
    return (f'<div class="score"><span>{value:.1f}%</span>'
            f'<div class="track"><div class="fill" style="width:{w:.1f}%"></div></div></div>')


def build_html(rows, n_settings):
    e = html.escape
    k = lambda x: f"{x / 1000:.1f}k"
    body = []
    for i, r in enumerate(rows, 1):
        body.append(f"""<tr>
<td class="rank">{i}</td>
<td><div class="model">{e(r['model'])}</div><div class="sub">{e(r['quant'])} · {e(r['backend'])}</div></td>
<td>{e(r['gpu'])}</td><td>{e(r['effort'])}</td>
<td class="avg">{bar(r['avg'])}</td><td>{bar(r['base'])}</td><td>{bar(r['hard'])}</td>
<td class="num">{r['speed']:.0f}</td>
<td class="num">{r['min_base']:.1f} <span class="sep">/</span> {r['min_hard']:.1f}</td>
<td class="num">{"~" if r["approx_base"] else ""}{k(r['tok_base'])} <span class="sep">/</span> {"~" if r["approx_hard"] else ""}{k(r['tok_hard'])}</td>
<td class="num muted">{r['runs']}</td>
</tr>""")
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}</style></head><body><div class="wrap">
<h1>Local LLM coding test: top {len(rows)} settings</h1>
<p class="lede">Ranked by the average of the base suite (10 tasks) and the hard suite (6 tasks):
TypeScript + Three.js in a real browser and Python with hidden tests. {date.today():%d %b %Y}.</p>
<table><thead><tr>
<th>#</th><th>Model<small>quant · backend</small></th><th>GPU</th><th>Effort</th>
<th>Average<small>of both suites</small></th><th>Base suite</th><th>Hard suite</th>
<th class="num">Speed<small>tok/s</small></th><th class="num">Time, min<small>base / hard</small></th>
<th class="num">Tokens<small>base / hard</small></th><th class="num">Runs<small>base + hard</small></th>
</tr></thead><tbody>
{''.join(body)}
</tbody></table>
<div class="notes">
Scores, time and tokens are means over the runs of each setting; bars span 50–100%.
Speed = all generated tokens ÷ all generation time over both suites (prompt processing included).
Time and tokens are per full suite, thinking included. ~ = token count partly estimated from the text length
(ExLlamaV3 under-reports it). Only settings run on both suites are ranked ({n_settings} so far).
Token limit per task 65,536 (98,304 from 30 Sep). Temperature 1.0; with 1–3 runs per setting, differences under
~5 points are noise. RTX 5090 32 GB + 128 GB RAM, RTX 4080 16 GB + 32 GB RAM.
Details: SUMMARY.md, RESULTS_TABLE.md, RESULTS_TABLE_HARD.md.
</div></div></body></html>"""


def collect_hard():
    settings = ms.rank_settings(ms.load_runs("results_hard"))
    by_best = sorted(settings, key=lambda g: (-g["best"]["overall"], g["best"]["minutes"]))[:TOP]
    by_mean = sorted(settings, key=lambda g: (-g["mean"], g["mean_minutes"]))[:TOP]
    return by_best, by_mean, len(settings)


def hard_table(rows, best):
    e = html.escape
    body = []
    for i, g in enumerate(rows, 1):
        score = g["best"]["overall"] if best else g["mean"]
        minutes = g["best"]["minutes"] if best else g["mean_minutes"]
        other = (f"{g['mean']:.1f}%" if len(g["runs"]) > 1 else "–") if best else \
            (f"{g['worst']:.0f}%" if len(g["runs"]) > 1 else "–")
        body.append(f"""<tr>
<td class="rank">{i}</td>
<td><div class="model">{e(g['model'])}</div><div class="sub">{e(g['quant'])} · {e(g['backend'])}</div></td>
<td>{e(g['gpu'].split()[1])}</td><td>{e(g['effort'])}</td>
<td class="avg">{bar(score)}</td><td class="num muted">{other}</td>
<td class="num">{minutes:.1f}</td><td class="num muted">{len(g['runs'])}</td>
</tr>""")
    head = ("Best run", "Mean<small>of all runs</small>", "Time, min<small>of that run</small>") if best else \
        ("Mean", "Worst<small>run</small>", "Time, min<small>mean</small>")
    return f"""<table><thead><tr>
<th>#</th><th>Model<small>quant · backend</small></th><th>GPU</th><th>Effort</th>
<th>{head[0]}</th><th class="num">{head[1]}</th><th class="num">{head[2]}</th><th class="num">Runs</th>
</tr></thead><tbody>{''.join(body)}</tbody></table>"""


def build_hard_html(by_best, by_mean, n_settings):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}
.wrap {{ width:1900px; }}
.cols {{ display:grid; grid-template-columns:1fr 1fr; gap:40px; }}
h2 {{ font-size:20px; margin:0 0 4px; }}
h2 + p {{ font-size:14px; color:var(--text2); margin:0 0 14px; }}
table {{ font-size:15px; }}
td {{ padding:10px 8px; }} th {{ padding:0 8px 10px; }}
.score {{ min-width:100px; }}
</style></head><body><div class="wrap">
<h1>Local LLM coding test: hard suite, top {len(by_best)}</h1>
<p class="lede">6 tasks: physics, instanced picking and post-processing in Three.js (checked in a real browser),
an interval set, an exact calculator and a minimal diff in Python (hidden tests). {date.today():%d %b %Y}.</p>
<div class="cols">
<div><h2>By best run</h2><p>What a setting can do on a good run.</p>{hard_table(by_best, True)}</div>
<div><h2>By mean of all runs</h2><p>What to expect from it on a typical run.</p>{hard_table(by_mean, False)}</div>
</div>
<div class="notes">
A setting = model + quant + backend + GPU + reasoning effort ({n_settings} so far); bars span 50–100%.
Settings with one run have the same score in both rankings, so only repeated ones can move between them.
Ties on score are broken by time. Temperature 1.0; with 1–3 runs per setting, differences under ~5 points are noise.
Token limit per task 65,536 (98,304 from 30 Sep), 60 minutes per task. RTX 5090 32 GB + 128 GB RAM,
RTX 4080 16 GB + 32 GB RAM. Details: RESULTS_TABLE_HARD.md, SUMMARY.md.
</div></div></body></html>"""


def main():
    from playwright.sync_api import sync_playwright
    rows, n = collect()
    by_best, by_mean, n_hard = collect_hard()
    with sync_playwright() as pw:
        # CHROMIUM_PATH: use a specific Chromium build if Playwright's own is not installed
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = browser.new_page(viewport={"width": 1960, "height": 900}, device_scale_factor=2)
        for page_html, out in ((build_html(rows, n), OUT), (build_hard_html(by_best, by_mean, n_hard), OUT_HARD)):
            page.set_content(page_html)
            page.locator(".wrap").screenshot(path=str(out), type="jpeg", quality=92)
            print(f"wrote {out.name}")
        browser.close()
    for i, r in enumerate(rows, 1):
        print(f"{i:2} {r['avg']:5.1f}  {r['model']} {r['quant']} ({r['backend']}, {r['gpu']}) {r['effort']}")


if __name__ == "__main__":
    main()
