#!/usr/bin/env python3
"""Render the top-10 summary tables as images.

    python make_top10.py

top10.jpg       top 10 settings (model + quant + backend + GPU + reasoning effort): overall (the average of
                the base and hard suites), base suite and hard suite, each ranked by best run and by mean
top10_hard.jpg  hard suite only, two rankings side by side: by each setting's best run, and by the mean
                of all its runs
glm_flash.jpg   every GLM-5.3-Flash variant in all four suites
deepseek.jpg    every DeepSeek-V4 variant in all four suites
tasks_base.jpg  per task of the base suite: the top 5 settings by fewest tokens and by shortest time (solved runs only)
tasks_hard.jpg  the same for the hard suite
rtx4080.jpg     the RTX 4080 16 GB only: overall (both suites), base suite and hard suite

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
OUT_DS = HERE / "deepseek.jpg"
OUT_TASKS = {"base": HERE / "tasks_base.jpg", "hard": HERE / "tasks_hard.jpg"}
TASK_TOP = 5
OUT_4080 = HERE / "rtx4080.jpg"
TOP = 10


def collect(gpu=None, top=TOP):
    groups = defaultdict(lambda: {"base": [], "hard": []})
    for suite in ("base", "hard"):  # the image ranks by these two; the newer suites have their own tables
        folder = ms.SUITES[suite][0]
        for r in ms.load_runs(folder):
            if gpu is None or r["gpu"] == gpu:
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
    return rows[:top], len(rows)


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


def build_rows_table(rows):
    """The table of top10.jpg: average of both suites, each suite, speed, time, tokens, runs."""
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
    return f"""<table><thead><tr>
<th>#</th><th>Model<small>quant · backend</small></th><th>GPU</th><th>Effort</th>
<th>Average<small>of both suites</small></th><th>Base suite</th><th>Hard suite</th>
<th class="num">Speed<small>tok/s</small></th><th class="num">Time, min<small>base / hard</small></th>
<th class="num">Tokens<small>base / hard</small></th><th class="num">Runs<small>base + hard</small></th>
</tr></thead><tbody>
{''.join(body)}
</tbody></table>"""


def build_html(rows, n_settings):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}</style></head><body><div class="wrap">
<h1>Local LLM coding test: top {len(rows)} settings</h1>
<p class="lede">Ranked by the average of the base suite (10 tasks) and the hard suite (6 tasks):
TypeScript + Three.js in a real browser and Python with hidden tests. {date.today():%d %b %Y}.</p>
{build_rows_table(rows)}
<div class="notes">
Scores, time and tokens are means over the runs of each setting; bars span 50–100%.
Speed = all generated tokens ÷ all generation time over both suites (prompt processing included).
Time and tokens are per full suite, thinking included. ~ = token count partly estimated from the text length
(ExLlamaV3 under-reports it). Only settings run on both suites are ranked ({n_settings} so far).
Token limit per task 65,536 (98,304 from 30 Sep). Temperature 1.0; with 1–3 runs per setting, differences under
~5 points are noise. RTX 5090 32 GB + 128 GB RAM, RTX 4080 16 GB + 32 GB RAM.
{PROBLEM_NOTE} Details: SUMMARY.md, RESULTS_TABLE.md, RESULTS_TABLE_HARD.md.
</div></div></body></html>"""


def overall_table(rows, best, show_gpu=False):
    """Settings run on both suites: the average of the two suites, by best runs or by means."""
    e = html.escape
    body = []
    for i, r in enumerate(rows, 1):
        x = r["best"] if best else r["mean"]
        body.append(f"""<tr>
<td class="rank">{i}</td>
<td><div class="model">{e(r['model'])}</div><div class="sub">{e(r['quant'])} · {e(r['backend'])}</div>{warn(r['problems'])}</td>
{f"<td>{e(ms.gpu_short(r['gpu']))}</td>" if show_gpu else ""}<td>{e(r['effort'])}</td><td class="avg">{bar(x['avg'])}</td>
<td class="num">{x['base']:.1f}% <span class="sep">/</span> {x['hard']:.1f}%</td>
<td class="num">{x['min_base']:.1f} <span class="sep">/</span> {x['min_hard']:.1f}</td>
<td class="num">{x['tok_base']} <span class="sep">/</span> {x['tok_hard']}</td>
<td class="num">{x['speed']:.0f}</td><td class="num muted">{r['runs']}</td>
</tr>""")
    what = "of that run" if best else "mean"
    return f"""<table><thead><tr>
<th>#</th><th>Model<small>quant · backend</small></th>{"<th>GPU</th>" if show_gpu else ""}<th>Effort</th>
<th>{"Best runs" if best else "Mean"}<small>average of both suites</small></th>
<th class="num">Base / hard<small>{"best run" if best else "mean"}</small></th>
<th class="num">Time, min<small>base / hard, {what}</small></th><th class="num">Tokens<small>base / hard, {what}</small></th>
<th class="num">tok/s</th><th class="num">Runs<small>base + hard</small></th>
</tr></thead><tbody>{''.join(body)}</tbody></table>"""


def build_split_html(title, lede, d, details, show_gpu=False):
    pair = lambda title, note, left, right: f"""<h2>{title}</h2><p class="h2note">{note}</p>
<div class="cols"><div><h3>By best run</h3>{left}</div><div><h3>By mean of all runs</h3>{right}</div></div>"""
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}
.wrap {{ width:{2440 if show_gpu else 2300}px; }}
.cols {{ display:grid; grid-template-columns:1fr 1fr; gap:36px; align-items:start; }}
h2 {{ font-size:23px; margin:30px 0 2px; border-top:3px solid var(--text); padding-top:14px; }}
h3 {{ font-size:17px; margin:8px 0 8px; color:var(--text2); }}
.h2note {{ font-size:14px; color:var(--text2); margin:0 0 6px; }}
table {{ font-size:15px; }}
td {{ padding:9px 7px; }} th {{ padding:0 7px 10px; }}
.score {{ min-width:96px; }}
</style></head><body><div class="wrap">
<h1>{title}</h1>
<p class="lede">{lede}
Each part is ranked two ways: by the setting's best run (what it can do) and by the mean of all its runs (what to expect).
{date.today():%d %b %Y}.</p>
{pair("Overall: both suites", d["note_overall"],
      overall_table(d["overall_best"], True, show_gpu), overall_table(d["overall_mean"], False, show_gpu))}
{pair("Base suite (10 tasks)", d["note_base"], hard_table(d["base_best"], True),
      hard_table(d["base_mean"], False))}
{pair("Hard suite (6 tasks)", d["note_hard"], hard_table(d["hard_best"], True),
      hard_table(d["hard_mean"], False))}
<div class="notes">
Bars span 50–100%. Settings with one run score the same in both rankings; only repeated ones can move. Ties are broken by time.
Time and tokens per full suite, thinking included; tok/s = all generated tokens ÷ all generation time; ~ = partly estimated
(ExLlamaV3 under-reports tokens). {PROBLEM_NOTE} Temperature 1.0; with 1–3 runs per setting, differences under ~5 points are
noise. {details}
</div></div></body></html>"""


def collect_split(gpu=None, top=None):
    """Overall, base and hard rankings, each by best run and by mean; one GPU or all, all settings or the top N."""
    d, ranked = {}, {}
    for suite in ("base", "hard"):
        ranked[suite] = ms.rank_settings([r for r in ms.load_runs(ms.SUITES[suite][0]) if gpu is None or r["gpu"] == gpu])
        d[f"{suite}_best"] = sorted(ranked[suite], key=lambda g: (-g["best"]["overall"], g["best"]["minutes"]))[:top]
        d[f"{suite}_mean"] = sorted(ranked[suite], key=lambda g: (-g["mean"], g["mean_minutes"]))[:top]
    key = lambda g: (g["model"], g["quant"], g["backend"], g["gpu"], g["effort"])
    hard = {key(g): g for g in ranked["hard"]}
    rows = []
    for b in ranked["base"]:
        h = hard.get(key(b))
        if not h:
            continue
        rb, rh = b["best"], h["best"]
        rows.append({
            "model": b["model"], "quant": b["quant"], "backend": b["backend"], "effort": b["effort"], "gpu": b["gpu"],
            "runs": f"{len(b['runs'])} + {len(h['runs'])}",
            "problems": "; ".join(t for t in (b["problems"], h["problems"]) if t),
            "best": {"avg": (rb["overall"] + rh["overall"]) / 2, "base": rb["overall"], "hard": rh["overall"],
                     "min_base": rb["minutes"], "min_hard": rh["minutes"],
                     "tok_base": tok(rb["tokens"] or 0, rb["tokens_approx"]),
                     "tok_hard": tok(rh["tokens"] or 0, rh["tokens_approx"]), "speed": ms.speed([rb, rh]) or 0},
            "mean": {"avg": (b["mean"] + h["mean"]) / 2, "base": b["mean"], "hard": h["mean"],
                     "min_base": b["mean_minutes"], "min_hard": h["mean_minutes"],
                     "tok_base": tok(b["mean_tokens"], b["tokens_approx"]),
                     "tok_hard": tok(h["mean_tokens"], h["tokens_approx"]),
                     "speed": ms.speed(b["runs"] + h["runs"]) or 0}})
    d["overall_best"] = sorted(rows, key=lambda r: (-r["best"]["avg"], r["best"]["min_base"] + r["best"]["min_hard"]))[:top]
    d["overall_mean"] = sorted(rows, key=lambda r: (-r["mean"]["avg"], r["mean"]["min_base"] + r["mean"]["min_hard"]))[:top]
    what = f"top {top} of {{}} settings" if top else "every setting, {} in all"
    d["note_overall"] = ("Settings run on both the base and the hard suite, ranked by the average of the two suites ("
                         + what.format(len(rows)) + ").")
    d["note_base"] = "Settings run on the base suite (" + what.format(len(ranked["base"])) + ")."
    d["note_hard"] = "Settings run on the hard suite (" + what.format(len(ranked["hard"])) + ")."
    return d


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
        tps = g["best"]["tok_s_time"] if best else g["tok_s"]
        other = (f"{g['mean']:.1f}%" if len(g["runs"]) > 1 else "–") if best else \
            (f"{g['worst']:.0f}%" if len(g["runs"]) > 1 else "–")
        body.append(f"""<tr>
<td class="rank">{i}</td>
<td><div class="model">{e(g['model'])}</div><div class="sub">{e(g['quant'])} · {e(g['backend'])}</div>{warn(g['problems'])}</td>
<td>{e(ms.gpu_short(g['gpu']))}</td><td>{e(g['effort'])}</td>
<td class="avg">{bar(score)}</td><td class="num muted">{other}</td>
<td class="num">{minutes:.1f}</td><td class="num">{"~" if approx else ""}{tokens / 1000:.0f}k</td>
<td class="num">{tps or 0:.0f}</td>
<td class="num muted">{len(g['runs'])}</td>
</tr>""")
    head = ("Best run", "Mean<small>of all runs</small>", "Time, min<small>of that run</small>",
            "Tokens<small>of that run</small>", "tok/s<small>of that run</small>") if best else \
        ("Mean", "Worst<small>run</small>", "Time, min<small>mean</small>", "Tokens<small>mean</small>",
         "tok/s<small>mean</small>")
    return f"""<table><thead><tr>
<th>#</th><th>Model<small>quant · backend</small></th><th>GPU</th><th>Effort</th>
<th>{head[0]}</th><th class="num">{head[1]}</th><th class="num">{head[2]}</th><th class="num">{head[3]}</th>
<th class="num">{head[4]}</th><th class="num">Runs</th>
</tr></thead><tbody>{''.join(body)}</tbody></table>"""


def build_hard_html(by_best, by_mean, n_settings):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}
.wrap {{ width:2160px; }}
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
RTX 4080 16 GB + 32 GB RAM. Time and tokens per full suite, thinking included; tok/s = all generated tokens ÷ all generation time; ~ = partly estimated (ExLlamaV3
under-reports tokens). {PROBLEM_NOTE} Details: RESULTS_TABLE_HARD.md, SUMMARY.md.
</div></div></body></html>"""


def collect_family(prefix):
    """Every setting of one model family, with its mean per suite."""
    by = defaultdict(lambda: defaultdict(list))
    for suite, (folder, *_r) in ms.SUITES.items():
        for r in ms.load_runs(folder):
            if r["model"].startswith(prefix):
                by[(r["model"], r["quant"], r["backend"], r["gpu"], r["effort"])][suite].append(r)
    rows = []
    for (model, quant, backend, gpu, effort), suites in by.items():
        cells = {}
        best = {}
        problems = []
        for su, rs in suites.items():
            cells[su] = {"score": sum(r["overall"] for r in rs) / len(rs), "runs": len(rs),
                         "minutes": sum(r["minutes"] for r in rs) / len(rs),
                         "tokens": sum(r["tokens"] or 0 for r in rs) / len(rs),
                         "approx": any(r["tokens_approx"] for r in rs), "tok_s": ms.speed(rs)}
            b = min(rs, key=lambda r: (-r["overall"], r["minutes"]))  # best run; on a tie the faster one
            best[su] = {"score": b["overall"], "runs": len(rs), "minutes": b["minutes"],
                        "tokens": b["tokens"] or 0, "approx": b["tokens_approx"], "tok_s": b["tok_s_time"]}
            problems.append(ms.problem_text(rs, kinds=False))
        rows.append({"model": model, "quant": quant, "backend": backend, "gpu": gpu, "effort": effort, "cells": cells,
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
                       f'{"~" if c["approx"] else ""}{c["tokens"] / 1000:.0f}k tok · {c["tok_s"] or 0:.0f} tok/s</div></td>'
                       if c else '<td class="none">–</td>')
        body.append(f"""<tr>
<td class="rank">{i}</td>
<td><div class="model">{e(r['quant'])} · {e(r['backend'])}</div><div class="sub">{e(r['model'])} · {e(ms.ram_of(r['gpu']))} RAM</div>{warn(r['problems']) if key == "cells" else ""}</td>
<td>{e(r['effort'])}</td>{''.join(tds)}
<td class="avg">{bar(r[mean_key])}<div class="meta">{r['n']} of {len(suites)} suites</div></td>
</tr>""")
    return f"""<table><thead><tr>
<th>#</th><th>Variant<small>quant · engine</small></th><th>Effort</th>
<th>Base<small>10 tasks</small></th><th>Hard<small>6 tasks</small></th><th>Practical<small>6 tasks</small></th>
<th>Tools<small>7 tasks</small></th><th>Mean<small>of the suites run</small></th>
</tr></thead><tbody>{''.join(body)}</tbody></table>
<p class="tnote">Under each score: runs × {time_note}.</p>"""


def task_matrix(prefix, suite):
    """Every setting of one family on one suite: per task the mean score, tokens and minutes over its runs."""
    settings = ms.rank_settings([r for r in ms.load_runs(ms.SUITES[suite][0]) if r["model"].startswith(prefix)])
    if not settings:
        return ""
    settings.sort(key=lambda g: (-g["mean"], g["mean_minutes"]))
    tasks = sorted({t for g in settings for r in g["runs"] for t in r["tasks"]}, key=ms.task_order)
    e = html.escape
    # per task the lowest token count and time among the settings, to mark the best cell in each column
    stats = {}
    for g in settings:
        for t in tasks:
            rs = [r for r in g["runs"] if t in r["tasks"]]
            if rs:
                stats[(id(g), t)] = (sum(r["tasks"][t][0] for r in rs) / len(rs),
                                     sum(r["task_stats"][t][0] for r in rs) / len(rs),
                                     sum(r["task_stats"][t][1] for r in rs) / len(rs) / 60)
    low_tok = {t: min((v[1] for (gid, tt), v in stats.items() if tt == t), default=0) for t in tasks}
    low_min = {t: min((v[2] for (gid, tt), v in stats.items() if tt == t), default=0) for t in tasks}
    body = []
    for g in settings:
        cells = []
        for t in tasks:
            v = stats.get((id(g), t))
            if not v:
                cells.append('<td class="none">–</td>')
                continue
            sc, tk, mn = v
            cls = "ok" if sc >= 99.5 else "part" if sc >= FAIL else "bad"
            tk_s = f"{tk / 1000:.1f}k"
            mn_s = f"{mn:.1f} min"
            cells.append(f'<td class="cell"><span class="sc {cls}">{sc:.0f}%</span>'
                         f'<div>{"<b>" + tk_s + "</b>" if abs(tk - low_tok[t]) < 1 else tk_s} tok</div>'
                         f'<div>{"<b>" + mn_s + "</b>" if abs(mn - low_min[t]) < 0.05 else mn_s}</div></td>')
        body.append(f"""<tr><td><div class="model">{e(g['quant'])} · {e(g['backend'])}</div>
<div class="sub">{e(g['model'])} · {e(ms.ram_of(g['gpu']))} RAM · {e(g['effort'])} · {len(g['runs'])}×</div></td>
{''.join(cells)}<td class="cell tot"><span class="sc">{g['mean']:.1f}%</span><div>{g['mean_tokens'] / 1000:.0f}k tok</div>
<div>{g['mean_minutes']:.0f} min · {g['tok_s'] or 0:.0f} tok/s</div></td></tr>""")
    head = "".join(f"<th>{e(t)}</th>" for t in tasks)
    return f"""<h2>{suite.capitalize()} suite: per task</h2><p class="h2note">Mean over each setting's runs: score, tokens
(thinking included) and generation time per task. Bold = fewest tokens / shortest time in that column. Last column: the whole
suite.</p>
<table class="matrix"><thead><tr><th>Variant<small>quant · engine</small></th>{head}<th>Suite<small>score · tokens · time</small></th></tr></thead>
<tbody>{''.join(body)}</tbody></table>"""


FAIL = ms.FAIL_BELOW


def build_family_html(by_mean, by_best, title, lede, prefix, notes, details, extra=""):
    """All suites side by side (by best run | by mean), then each suite on its own, also by best run | by mean."""
    pair = lambda title_, note, left, right: f"""<h2>{title_}</h2><p class="h2note">{note}</p>
<div class="cols"><div><h3>By best run</h3>{left}</div><div><h3>By mean of all runs</h3>{right}</div></div>"""
    suites = []
    for suite, (folder, *_r) in ms.SUITES.items():
        g = ms.rank_settings([r for r in ms.load_runs(folder) if r["model"].startswith(prefix)])
        if g:
            n_tasks = g[0]["runs"][0]["n_tasks"]
            suites.append(pair(f"{suite.capitalize()} suite ({n_tasks} tasks)", f"Every variant run on the {suite} suite.",
                               hard_table(sorted(g, key=lambda x: (-x["best"]["overall"], x["best"]["minutes"])), True),
                               hard_table(sorted(g, key=lambda x: (-x["mean"], x["mean_minutes"])), False)))
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}
.wrap {{ width:3000px; }}
.cols {{ display:grid; grid-template-columns:1fr 1fr; gap:36px; align-items:start; }}
.meta {{ font-size:12px; color:var(--muted); margin-top:4px; }}
td.none {{ color:var(--muted); text-align:center; }}
h2 {{ font-size:23px; margin:30px 0 2px; border-top:3px solid var(--text); padding-top:14px; }}
h3 {{ font-size:17px; margin:8px 0 8px; color:var(--text2); }}
.h2note {{ font-size:14px; color:var(--text2); margin:0 0 6px; }}
.tnote {{ font-size:12px; color:var(--muted); margin:6px 0 0; }}
table {{ font-size:15px; }}
td {{ padding:9px 7px; }} th {{ padding:0 7px 10px; }}
.score {{ min-width:96px; }}
table.matrix {{ font-size:14px; }}
table.matrix td.cell {{ font-variant-numeric:tabular-nums; color:var(--text2); line-height:1.35; }}
table.matrix td.tot {{ border-left:2px solid var(--rule); }}
.sc {{ font-weight:700; color:var(--text); font-size:15px; }}
.sc.part {{ color:#a3480f; }} .sc.bad {{ color:#b42318; }}
table.matrix b {{ color:#1c5cab; }}
</style></head><body><div class="wrap">
<h1>{title}</h1>
<p class="lede">{lede} Each part is ranked two ways: by the setting's best run (what it can do) and by the mean of all its
runs (what to expect). {date.today():%d %b %Y}.</p>
{pair("All suites", "Sorted by the number of suites run, then by the mean of the suites, so the first rows are the best-tested.",
      family_table(by_best, "best", "best_mean", "minutes · tokens · tok/s of that best run"),
      family_table(by_mean, "cells", "mean", "mean minutes · mean tokens · tok/s (all tokens ÷ all generation time)"))}
{''.join(suites)}
{extra}
<div class="notes">
Bars span 50–100%. Settings with one run per suite score the same in both rankings. {notes} Time and tokens per full suite,
thinking included; tok/s = all generated tokens ÷ all generation time. {PROBLEM_NOTE} ~ = tokens partly estimated.
Temperature 1.0, RTX 5090 32 GB + 128 GB RAM (192 GB from 23 Oct). Details: {details}.
</div></div></body></html>"""


def collect_tasks(suite):
    """Per task: every setting that solved it (100%) at least once, with its mean tokens and minutes over the solved
    runs, ranked by fewest tokens and by shortest time."""
    settings = ms.rank_settings(ms.load_runs(ms.SUITES[suite][0]))
    tasks = sorted({t for g in settings for r in g["runs"] for t in r["tasks"]}, key=ms.task_order)
    out = {}
    for t in tasks:
        rows = []
        for g in settings:
            done = [r for r in g["runs"] if t in r["tasks"]]
            ok = [r for r in done if r["tasks"][t][0] == 100]
            if not ok:
                continue
            rows.append({**{k: g[k] for k in ("model", "quant", "backend", "gpu", "effort")},
                         "tokens": sum(r["task_stats"][t][0] for r in ok) / len(ok),
                         "minutes": sum(r["task_stats"][t][1] for r in ok) / len(ok) / 60,
                         "approx": any(r["task_stats"][t][2] for r in ok), "solved": f"{len(ok)}/{len(done)}"})
        out[t] = {"tokens": sorted(rows, key=lambda x: (x["tokens"], x["minutes"]))[:TASK_TOP],
                  "time": sorted(rows, key=lambda x: (x["minutes"], x["tokens"]))[:TASK_TOP],
                  "n": len(rows), "settings": len([g for g in settings if any(t in r["tasks"] for r in g["runs"])])}
    return out


def task_table(rows, by):
    e = html.escape
    body = []
    for i, r in enumerate(rows, 1):
        tok_ = f'{"~" if r["approx"] else ""}{r["tokens"] / 1000:.1f}k'
        mins = f'{r["minutes"]:.1f}'
        body.append(f"""<tr><td class="rank">{i}</td>
<td><div class="model">{e(r['model'])}</div><div class="sub">{e(r['quant'])} · {e(r['backend'])} · {e(ms.gpu_short(r['gpu']))} · {e(r['effort'])}</div></td>
<td class="num">{f"<b>{tok_}</b>" if by == "tokens" else tok_}</td><td class="num">{f"<b>{mins}</b>" if by == "time" else mins}</td>
<td class="num muted">{r['solved']}</td></tr>""")
    return f"""<table><thead><tr><th>#</th><th>Model<small>quant · backend · GPU · effort</small></th>
<th class="num">Tokens<small>mean</small></th><th class="num">Time, min<small>mean</small></th>
<th class="num">Solved<small>runs</small></th></tr></thead><tbody>{''.join(body)}</tbody></table>"""


def build_tasks_html(suite, data):
    blocks = []
    for t, d in data.items():
        blocks.append(f"""<div class="task"><h2>{html.escape(t)}</h2>
<p class="h2note">Solved (100%) by {d['n']} of {d['settings']} settings.</p>
<div class="cols"><div><h3>Fewest tokens</h3>{task_table(d['tokens'], 'tokens')}</div>
<div><h3>Shortest time</h3>{task_table(d['time'], 'time')}</div></div></div>""")
    n_tasks = len(data)
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{STYLE}
.wrap {{ width:2600px; }}
.grid {{ display:grid; grid-template-columns:1fr 1fr; gap:26px 44px; }}
.cols {{ display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }}
.task {{ border-top:3px solid var(--text); padding-top:10px; }}
h2 {{ font-size:21px; margin:0 0 2px; font-family:ui-monospace,"DejaVu Sans Mono",monospace; }}
h3 {{ font-size:15px; margin:6px 0 6px; color:var(--text2); }}
.h2note {{ font-size:13px; color:var(--text2); margin:0 0 4px; }}
table {{ font-size:13px; }}
td {{ padding:6px 5px; }} th {{ padding:0 5px 8px; font-size:11px; }}
.rank {{ font-size:15px; width:22px; }}
.sub {{ font-size:12px; }}
tr:nth-child(-n+3) td {{ background:none; }}
tr:first-child td {{ background:#f4f7fc; }}
</style></head><body><div class="wrap">
<h1>Local LLM coding test: {suite} suite, top {TASK_TOP} per task by tokens and by time</h1>
<p class="lede">For each of the {n_tasks} tasks, the settings that solved it (100%) with the fewest tokens and in the shortest
time. Only solved runs count, so a fast wrong answer does not win. {date.today():%d %b %Y}.</p>
<div class="grid">{''.join(blocks)}</div>
<div class="notes">
A setting = model + quant + backend + GPU + reasoning effort. Tokens and time are means over the setting's solved runs of
that task, thinking included; time = generation time of the task (prompt processing included). Solved = runs with 100% /
runs of that task. ~ = tokens partly estimated (ExLlamaV3 under-reports them). Temperature 1.0. Few tokens and a short time
mean the setting solved the task without long thinking; speed in tok/s decides how the two rankings differ.
Details: RESULTS_TABLE{"_HARD" if suite == "hard" else ""}.md.
</div></div></body></html>"""


def short(g):
    """'Flash-Next GSQ-RCO IQ3_S · Strata (5090) `medium`' for the README tables."""
    model = g["model"].replace("Qwen3.8-", "").replace("GLM-5.3-Flash", "GLM").replace("27B", "27B")
    eng = "" if g["backend"] == "llama.cpp" and not model.startswith("GLM") else f" · {g['backend']}"
    return f"{model} {g['quant']}{eng} ({ms.gpu_short(g['gpu'])}) `{g['effort']}`"


def tok(x, approx):
    return f"{'~' if approx else ''}{x / 1000:.0f}k"


def readme_hard(by_best, by_mean):
    """Markdown version of top10_hard.jpg: both rankings, with time, tokens and the tasks a setting keeps failing."""
    out = ["| # | By best run | Best | Mean | Time (min) | Tokens | tok/s | Runs | Often fails |",
           "|---|---|---|---|---|---|---|---|---|"]
    for i, g in enumerate(by_best, 1):
        b = g["best"]
        out.append(f"| {i} | {short(g)} | {b['overall']:.1f}% | {g['mean']:.1f}% | {b['minutes']:.1f} "
                   f"| {tok(b['tokens'] or 0, b['tokens_approx'])} | {b['tok_s_time'] or 0:.0f} | {len(g['runs'])} | {g['problems'] or '–'} |")
    out += ["", "| # | By mean of all runs | Mean | Worst | Mean time (min) | Mean tokens | tok/s | Runs | Often fails |",
            "|---|---|---|---|---|---|---|---|---|"]
    for i, g in enumerate(by_mean, 1):
        out.append(f"| {i} | {short(g)} | {g['mean']:.1f}% | {g['worst']:.0f}% | {g['mean_minutes']:.1f} "
                   f"| {tok(g['mean_tokens'], g['tokens_approx'])} | {g['tok_s'] or 0:.0f} | {len(g['runs'])} | {g['problems'] or '–'} |")
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
            cells.append(f"**{c['score']:.1f}%** ({c['runs']}×, {c['minutes']:.0f} min, {tok(c['tokens'], c['approx'])}, {c['tok_s'] or 0:.0f} tok/s)"
                         if c else "–")
        name = r["model"].replace("GLM-5.3-Flash", "").strip()
        ram = " (192 GB RAM)" if "192 GB" in r["gpu"] else ""
        out.append(f"| {(name + ' ') if name else ''}{r['quant']} · {r['backend']}{ram} | {r['effort']} | "
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
                                "practical and tool-calling suites.", "GLM-5.3-Flash",
                                'Maya, ExLlamaV3 and llama.cpp are inference engines; "derisked" is the model file GLM-5.3 '
                                'Maya-M derisked. Runs started with "medium" ran at "high" (the GLM chat template has no '
                                'medium) and are listed as high.', "RESULTS_TABLE_GLM.md, SUMMARY.md")
        pages = [(glm, OUT_GLM)]
        if collect_family("DeepSeek")[0]:
            pages.append((build_family_html(
                *collect_family("DeepSeek"), "DeepSeek-V4: every variant, every suite",
                "DeepSeek-V4 / V4.1 with different files, engines and reasoning levels (--preset ds4).", "DeepSeek",
                'Maya is an inference engine; "Maya-S" is a model file made for it. Levels: none (thinking off), low, '
                'high (the default) and max, sent as a top-level reasoning_effort. RAM: the RTX 5090 PC had 128 GB until '
                '23 Oct and 192 GB after; with more experts in RAM the large MoE models run faster.',
                "RESULTS_TABLE_DEEPSEEK.md, SUMMARY.md",
                task_matrix("DeepSeek", "base") + task_matrix("DeepSeek", "hard")), OUT_DS))
        for suite in ("base", "hard"):
            pages.append((build_tasks_html(suite, collect_tasks(suite)), OUT_TASKS[suite]))
        top10 = build_split_html(
            f"Local LLM coding test: top {TOP}", "Every model, quant, backend, GPU and reasoning level tested: the base "
            "suite (10 tasks) and the hard suite (6 tasks), TypeScript + Three.js in a real browser and Python with hidden "
            "tests. RTX 5090 32 GB + 128 GB RAM and RTX 4080 16 GB + 32 GB RAM.", collect_split(top=TOP),
            "Details: SUMMARY.md, RESULTS_TABLE.md, RESULTS_TABLE_HARD.md; the RTX 4080 alone: rtx4080.jpg.", show_gpu=True)
        gpu4080 = build_split_html(
            "Local LLM coding test: RTX 4080 16 GB only", "Every setting run on the RTX 4080 16 GB + 32 GB DDR5: "
            "Qwen3.8-27B at 2–3 bits, in llama.cpp and ExLlamaV3.", collect_split("RTX 4080 16 GB"),
            "Details: RESULTS_TABLE.md, RESULTS_TABLE_HARD.md, SUMMARY.md (Parts 2 and 6).")
        for page_html, out in ((top10, OUT), (build_hard_html(by_best, by_mean, n_hard), OUT_HARD),
                               (gpu4080, OUT_4080), *pages):
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
