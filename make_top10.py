#!/usr/bin/env python3
"""Render the top-10 summary tables as images.

    python make_top10.py

top10.jpg       every setting (model + quant + backend + GPU + reasoning effort) that has results in BOTH
                suites, ranked by the average of its base-suite and hard-suite scores (each a mean over
                that setting's runs)
top10_hard.jpg  hard suite only, two rankings side by side: by each setting's best run, and by the mean
                of all its runs
glm_flash.jpg   every GLM-5.3-Flash variant in all four suites

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
OUT_GLM = HERE / "glm_flash.jpg"
TOP = 10


def collect():
    groups = defaultdict(lambda: {"base": [], "hard": []})
    for suite in ("base", "hard"):  # the image ranks by these two; the newer suites have their own tables
        folder = ms.SUITES[suite][0]
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
            "problems": "; ".join(t for t in (ms.problem_text(by["base"], kinds=False),
                                              ms.problem_text(by["hard"], kinds=False)) if t),
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
.warn { font-size:13px; color:#a3480f; margin-top:3px; }
.notes { margin-top:16px; font-size:13px; color:var(--text2); line-height:1.6; }
"""


def bar(value):
    """Score with a thin bar on a 50-100% scale, so the differences that matter are visible."""
    w = max(0.0, min(1.0, (value - 50) / 50)) * 100
    return (f'<div class="score"><span>{value:.1f}%</span>'
            f'<div class="track"><div class="fill" style="width:{w:.1f}%"></div></div></div>')


def warn(problems):
    """Orange line under the model name: tasks the setting keeps failing over repeated runs."""
    return f'<div class="warn">often fails: {html.escape(problems)}</div>' if problems else ""


PROBLEM_NOTE = ("Often fails = a task scored below 90% in at least half of a setting's runs (and at least twice), "
                "with failed/runs.")


def build_html(rows, n_settings):
    e = html.escape
    k = lambda x: f"{x / 1000:.1f}k"
    body = []
    for i, r in enumerate(rows, 1):
        body.append(f"""<tr>
<td class="rank">{i}</td>
<td><div class="model">{e(r['model'])}</div><div class="sub">{e(r['quant'])} · {e(r['backend'])}</div>{warn(r['problems'])}</td>
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
{PROBLEM_NOTE} Details: SUMMARY.md, RESULTS_TABLE.md, RESULTS_TABLE_HARD.md.
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
        tokens = g["best"]["tokens"] if best else g["mean_tokens"]
        approx = g["best"]["tokens_approx"] if best else g["tokens_approx"]
        other = (f"{g['mean']:.1f}%" if len(g["runs"]) > 1 else "–") if best else \
            (f"{g['worst']:.0f}%" if len(g["runs"]) > 1 else "–")
        body.append(f"""<tr>
<td class="rank">{i}</td>
<td><div class="model">{e(g['model'])}</div><div class="sub">{e(g['quant'])} · {e(g['backend'])}</div>{warn(g['problems'])}</td>
<td>{e(g['gpu'].split()[1])}</td><td>{e(g['effort'])}</td>
<td class="avg">{bar(score)}</td><td class="num muted">{other}</td>
<td class="num">{minutes:.1f}</td><td class="num">{"~" if approx else ""}{tokens / 1000:.0f}k</td>
<td class="num muted">{len(g['runs'])}</td>
</tr>""")
    head = ("Best run", "Mean<small>of all runs</small>", "Time, min<small>of that run</small>",
            "Tokens<small>of that run</small>") if best else \
        ("Mean", "Worst<small>run</small>", "Time, min<small>mean</small>", "Tokens<small>mean</small>")
    return f"""<table><thead><tr>
<th>#</th><th>Model<small>quant · backend</small></th><th>GPU</th><th>Effort</th>
<th>{head[0]}</th><th class="num">{head[1]}</th><th class="num">{head[2]}</th><th class="num">{head[3]}</th>
<th class="num">Runs</th>
</tr></thead><tbody>{''.join(body)}</tbody></table>"""


def build_hard_html(by_best, by_mean, n_settings):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}
.wrap {{ width:2000px; }}
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
RTX 4080 16 GB + 32 GB RAM. Time and tokens per full suite, thinking included; ~ = partly estimated (ExLlamaV3
under-reports tokens). {PROBLEM_NOTE} Details: RESULTS_TABLE_HARD.md, SUMMARY.md.
</div></div></body></html>"""


def collect_family(prefix):
    """Every setting of one model family, with its mean per suite."""
    by = defaultdict(lambda: defaultdict(list))
    for suite, (folder, *_r) in ms.SUITES.items():
        for r in ms.load_runs(folder):
            if r["model"].startswith(prefix):
                by[(r["model"], r["quant"], r["backend"], r["effort"])][suite].append(r)
    rows = []
    for (model, quant, backend, effort), suites in by.items():
        cells = {}
        best = {}
        problems = []
        for su, rs in suites.items():
            cells[su] = {"score": sum(r["overall"] for r in rs) / len(rs), "runs": len(rs),
                         "minutes": sum(r["minutes"] for r in rs) / len(rs),
                         "tokens": sum(r["tokens"] or 0 for r in rs) / len(rs),
                         "approx": any(r["tokens_approx"] for r in rs)}
            b = min(rs, key=lambda r: (-r["overall"], r["minutes"]))  # best run; on a tie the faster one
            best[su] = {"score": b["overall"], "runs": len(rs), "minutes": b["minutes"],
                        "tokens": b["tokens"] or 0, "approx": b["tokens_approx"]}
            problems.append(ms.problem_text(rs, kinds=False))
        rows.append({"model": model, "quant": quant, "backend": backend, "effort": effort, "cells": cells,
                     "problems": "; ".join(p for p in problems if p),
                     "best": best, "n": len(cells),
                     "mean": sum(c["score"] for c in cells.values()) / len(cells),
                     "best_mean": sum(c["score"] for c in best.values()) / len(best)})
    by_mean = sorted(rows, key=lambda r: (-r["n"], -r["mean"]))
    by_best = sorted(rows, key=lambda r: (-r["n"], -r["best_mean"]))
    return by_mean, by_best


def family_table(rows, key, mean_key, time_note):
    e = html.escape
    suites = list(ms.SUITES)
    body = []
    for i, r in enumerate(rows, 1):
        tds = []
        for su in suites:
            c = r[key].get(su)
            tds.append(f'<td>{bar(c["score"])}<div class="meta">{c["runs"]}× · {c["minutes"]:.0f} min · '
                       f'{"~" if c["approx"] else ""}{c["tokens"] / 1000:.0f}k tok</div></td>'
                       if c else '<td class="none">–</td>')
        body.append(f"""<tr>
<td class="rank">{i}</td>
<td><div class="model">{e(r['quant'])} · {e(r['backend'])}</div><div class="sub">{e(r['model'])}</div>{warn(r['problems']) if key == "cells" else ""}</td>
<td>{e(r['effort'])}</td>{''.join(tds)}
<td class="avg">{bar(r[mean_key])}<div class="meta">{r['n']} of {len(suites)} suites</div></td>
</tr>""")
    return f"""<table><thead><tr>
<th>#</th><th>Variant<small>quant · engine</small></th><th>Effort</th>
<th>Base<small>10 tasks</small></th><th>Hard<small>6 tasks</small></th><th>Practical<small>6 tasks</small></th>
<th>Tools<small>7 tasks</small></th><th>Mean<small>of the suites run</small></th>
</tr></thead><tbody>{''.join(body)}</tbody></table>
<p class="tnote">Under each score: runs × {time_note}.</p>"""


def build_family_html(by_mean, by_best, title, lede):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}
.wrap {{ width:1640px; }}
.meta {{ font-size:12px; color:var(--muted); margin-top:4px; }}
td.none {{ color:var(--muted); text-align:center; }}
h2 {{ font-size:21px; margin:26px 0 2px; }}
.h2note {{ font-size:14px; color:var(--text2); margin:0 0 10px; }}
.tnote {{ font-size:12px; color:var(--muted); margin:6px 0 0; }}
tr:nth-child(3) td {{ background:none; }}
</style></head><body><div class="wrap">
<h1>{title}</h1>
<p class="lede">{lede} {date.today():%d %b %Y}.</p>
<h2>By mean of all runs</h2><p class="h2note">What to expect from a setting on a typical run.</p>
{family_table(by_mean, "cells", "mean", "mean minutes · mean tokens per run")}
<h2>By best run</h2><p class="h2note">What a setting can do on a good run: the best single run per suite.</p>
{family_table(by_best, "best", "best_mean", "minutes · tokens of that best run")}
<div class="notes">
Bars span 50–100%. Both rankings are sorted by the number of suites run, then by the mean, so the first rows are the
best-tested; settings with one run per suite score the same in both. Maya, ExLlamaV3 and llama.cpp are inference engines;
"derisked" is the model file GLM-5.3 Maya-M derisked. Runs started with "medium" ran at "high" (the GLM chat template has
no medium) and are listed as high. {PROBLEM_NOTE} ~ = tokens partly estimated. Temperature 1.0, RTX 5090 32 GB + 128 GB RAM. Details: RESULTS_TABLE_GLM.md, SUMMARY.md.
</div></div></body></html>"""


def short(g):
    """'Flash-Next GSQ-RCO IQ3_S · Strata (5090) `medium`' for the README tables."""
    model = g["model"].replace("Qwen3.8-", "").replace("GLM-5.3-Flash", "GLM").replace("27B", "27B")
    eng = "" if g["backend"] == "llama.cpp" and not model.startswith("GLM") else f" · {g['backend']}"
    return f"{model} {g['quant']}{eng} ({g['gpu'].split()[1]}) `{g['effort']}`"


def tok(x, approx):
    return f"{'~' if approx else ''}{x / 1000:.0f}k"


def readme_hard(by_best, by_mean):
    """Markdown version of top10_hard.jpg: both rankings, with time, tokens and the tasks a setting keeps failing."""
    out = ["| # | By best run | Best | Mean | Time (min) | Tokens | Runs | Often fails |",
           "|---|---|---|---|---|---|---|---|"]
    for i, g in enumerate(by_best, 1):
        b = g["best"]
        out.append(f"| {i} | {short(g)} | {b['overall']:.1f}% | {g['mean']:.1f}% | {b['minutes']:.1f} "
                   f"| {tok(b['tokens'] or 0, b['tokens_approx'])} | {len(g['runs'])} | {g['problems'] or '–'} |")
    out += ["", "| # | By mean of all runs | Mean | Worst | Mean time (min) | Mean tokens | Runs | Often fails |",
            "|---|---|---|---|---|---|---|---|"]
    for i, g in enumerate(by_mean, 1):
        out.append(f"| {i} | {short(g)} | {g['mean']:.1f}% | {g['worst']:.0f}% | {g['mean_minutes']:.1f} "
                   f"| {tok(g['mean_tokens'], g['tokens_approx'])} | {len(g['runs'])} | {g['problems'] or '–'} |")
    return out


def readme_family(by_mean):
    """Markdown version of the 'by mean' table in glm_flash.jpg."""
    suites = list(ms.SUITES)
    out = ["| Variant | Effort | " + " | ".join(su.capitalize() for su in suites) + " | Often fails |",
           "|---|---|" + "---|" * len(suites) + "---|"]
    for r in by_mean:
        cells = []
        for su in suites:
            c = r["cells"].get(su)
            cells.append(f"**{c['score']:.1f}%** ({c['runs']}×, {c['minutes']:.0f} min, {tok(c['tokens'], c['approx'])})"
                         if c else "–")
        name = r["model"].replace("GLM-5.3-Flash", "").strip()
        out.append(f"| {(name + ' ') if name else ''}{r['quant']} · {r['backend']} | {r['effort']} | "
                   + " | ".join(cells) + f" | {r['problems'] or '–'} |")
    return out


def update_readme(blocks):
    """Replace the text between <!-- name:start --> and <!-- name:end --> in README.md."""
    path = HERE / "README.md"
    text = path.read_text(encoding="utf-8")
    for name, lines in blocks.items():
        a, b = f"<!-- {name}:start -->", f"<!-- {name}:end -->"
        if a in text and b in text:
            text = text[:text.index(a) + len(a)] + "\n" + "\n".join(lines) + "\n" + text[text.index(b):]
    path.write_text(text, encoding="utf-8")


def main():
    from playwright.sync_api import sync_playwright
    rows, n = collect()
    by_best, by_mean, n_hard = collect_hard()
    with sync_playwright() as pw:
        # CHROMIUM_PATH: use a specific Chromium build if Playwright's own is not installed
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = browser.new_page(viewport={"width": 1960, "height": 900}, device_scale_factor=2)
        glm = build_family_html(*collect_family("GLM-5.3-Flash"), "GLM-5.3-Flash: every variant, every suite",
                                "GLM-5.3-Flash with different quants, engines and reasoning levels, on the base, hard, "
                                "practical and tool-calling suites.")
        for page_html, out in ((build_html(rows, n), OUT), (build_hard_html(by_best, by_mean, n_hard), OUT_HARD),
                               (glm, OUT_GLM)):
            page.set_content(page_html)
            page.locator(".wrap").screenshot(path=str(out), type="jpeg", quality=92)
            print(f"wrote {out.name}")
        browser.close()
    update_readme({"hard-ranking": readme_hard(by_best, by_mean),
                   "glm-table": readme_family(collect_family("GLM-5.3-Flash")[0])})
    for i, r in enumerate(rows, 1):
        print(f"{i:2} {r['avg']:5.1f}  {r['model']} {r['quant']} ({r['backend']}, {r['gpu']}) {r['effort']}")


if __name__ == "__main__":
    main()
