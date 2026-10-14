#!/usr/bin/env python3
"""Build results tables for every suite from <results folder>/*/summary.json.

    python make_summary.py

Writes:
  RESULTS_TABLE.md, results/results_table.csv                          - base suite
  RESULTS_TABLE_HARD.md, results_hard/results_table.csv                - hard suite
  RESULTS_TABLE_PRACTICAL.md, results_practical/results_table.csv      - practical suite
  RESULTS_TABLE_TOOLS.md, results_tools/results_table.csv              - tool-calling suite
"""
import hashlib
import csv
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent


def describe(label, model):
    """Readable model / quant / backend from the run label and model path (case-insensitive)."""
    m = f"{label} {model}".replace("\\", "/").lower()
    # the engine label wins over the file format: an EXL3 file run in Maya is a Maya run
    backend = ("Maya" if re.search(r"[_-]maya(?![a-z0-9])", m) else "Strata" if re.search(r"[_-]strata(?![a-z0-9])", m)
               else "ExLlamaV3" if "exl3" in m else "llama.cpp")
    bit = re.search(r"(\d\.\d+)\s*-?bit", m)
    bpw = re.search(r"(\d\.\d+)\s*-?bpw|(\d\.\d+)_exl3|exl3-(\d)(\d{2})", m)
    if re.search(r"27b|3\.8-27[_-]", m):
        name = "Qwen3.8-27B abliterated" if "abliterated" in m else "Qwen3.8-27B"
        gguf = re.search(r"(ud-)?i?q\d_[a-z0-9]+(_[a-z]{1,2})?", m)
        if "exl3" in m and bpw:
            quant = f"EXL3 {bpw.group(1) or bpw.group(2) or bpw.group(3) + '.' + bpw.group(4)} bpw"
        elif gguf:
            quant = gguf.group(0).upper()
        elif "q6" in m:
            quant = "UD-Q6_K_M"  # the 25 Sep runs, labelled only "q6"
        elif bit:
            quant = f"{bit.group(1)}-bit"
        else:
            quant = "?"
        prefix = "GSQ-RCO " if "gsq-rco" in m else "AP " if "-ap-" in m else ""
        suffix = "".join(f" {x}" for x in ("MTP", "qv44") if re.search(rf"[_-]{x.lower()}(?![a-z0-9])", m))
        return name, prefix + quant + suffix, backend
    if "glm" in m:
        if "exl3" in m:
            bpw = re.search(r"(\d+\.\d+)bpw", m)
            quant = f"EXL3 {bpw.group(1) if bpw else '3.05'} bpw"
        elif bit:
            quant = f"GSQ-RCO {bit.group(1)}-bit"
        else:
            quant = "?"
        if re.search(r"[_-]nomtp(?![a-z0-9])", m):
            quant += " no MTP"
        if "derisked" in m and quant == "?":
            quant = "Maya-M"  # GLM-5.3 Maya-M derisked: a model file made for the Maya engine
        name = "GLM-5.3-Flash derisked" if "derisked" in m else "GLM-5.3-Flash"
        return name, quant, backend
    if "flash-next" in m or "qwen" in m:
        gguf = re.search(r"(ud-)?i?q\d_[a-z0-9]+(_[a-z]{1,2})?", m)
        if "exl3" in m:
            quant = "EXL3 5.05 bpw"
        elif gguf:
            quant = ("GSQ-RCO " if "gsq-rco" in m else "") + gguf.group(0).upper()
        else:
            quant = "?"
        return "Qwen3.8-Flash-Next", quant, backend
    return label, "?", backend


def gpu_of(resources, model, quant):
    """GPU the run was made on. Newer runs record it. Of the older ones, the 2-3-bit Qwen3.8-27B
    runs were made on a second PC (RTX 4080 16 GB + 32 GB RAM), everything else on the RTX 5090 32 GB."""
    if resources.get("gpu"):
        return resources["gpu"]
    if model.startswith("Qwen3.8-27B") and "Q6" not in quant:
        return "RTX 4080 16 GB"
    return "RTX 5090 32 GB"


def task_order(t):
    """Base tasks before hard ones, Three.js (t*) before Python (p*) within each suite."""
    base = t[2:] if t.startswith("h_") else t
    return t.startswith("h_"), base[0] != "t", base


SUITES = {
    "base": ("results", "RESULTS_TABLE.md", "# Results table: base suite",
             "10 tasks (6 × TypeScript + Three.js, 4 × Python). Hard-suite results are in "
             "[RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md)."),
    "hard": ("results_hard", "RESULTS_TABLE_HARD.md", "# Results table: hard suite (--suite hard)",
             "6 tasks (3 × TypeScript + Three.js, 3 × Python). Base-suite results are in "
             "[RESULTS_TABLE.md](RESULTS_TABLE.md)."),
    "practical": ("results_practical", "RESULTS_TABLE_PRACTICAL.md",
                  "# Results table: practical suite (--suite practical)",
                  "6 everyday tasks: edit a module, fix a bug from a failing test, refactor, SQL, JSON extraction, "
                  "and a bug hunt in a ~24k-token module (long context)."),
    "tools": ("results_tools", "RESULTS_TABLE_TOOLS.md", "# Results table: tool-calling suite (--suite tools)",
              "7 tasks against a fake shop backend: pick the right tool, fill the arguments, chain calls, parallel "
              "calls, recover from an error, answer without a tool, and a small coding agent that fixes a repo."),
}
# "practical" limits, applied after the fact to runs made with the older, lenient ones
PRACTICAL_SECONDS, PRACTICAL_TOKENS = 600, 32768
BROKEN_STATUS = ("max_tokens", "task_timeout", "no_answer", "max_turns")


def is_broken(r):
    """Broken generation (not wrong code): out of tokens or time, stopped mid-thought, a loop, no final answer."""
    return r.get("status") in BROKEN_STATUS or any("loop" in n for n in r.get("notes", []))


def practical_score(results):
    """Overall score if every task had to finish within 10 minutes and 32k tokens (later ones count as 0)."""
    parts = {}
    for r in results:
        ok = (r.get("gen_seconds") or 0) <= PRACTICAL_SECONDS and (r.get("tokens") or 0) <= PRACTICAL_TOKENS
        parts.setdefault(r["kind"], []).append(r["score"] if ok else 0.0)
    return 100 * sum(sum(v) / len(v) for v in parts.values()) / len(parts) if parts else 0.0


def answer_hash(task_dir):
    """Hash of what the model produced for a task: the code if any, else the raw answer."""
    for name in ("solution.py", "main.ts", "answer.json", "raw_response.md"):
        p = task_dir / name
        if p.is_file() and p.read_bytes().strip():
            return hashlib.sha1(p.read_bytes()).hexdigest()
    return None


def load_runs(folder):
    runs = []
    for f in sorted((HERE / folder).glob("*/summary.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        s, S, R = d.get("settings", {}), d.get("summary", {}), d.get("resources", {})
        # the folder name, not d["name"]: folders are sometimes renamed afterwards to fix a label
        label = re.sub(r"^\d{8}-\d{6}_", "", f.parent.name)
        name, quant, backend = describe(label, d.get("model", ""))
        gen_s = sum(r.get("gen_seconds") or 0 for r in d["results"])
        effort = s.get("reasoning_effort") or "default (xhigh)"
        if name.startswith("GLM") and effort == "medium":
            # GLM-5.3-Flash's chat template has no "medium": the runs labelled medium actually ran at high
            effort = "high"
        if s.get("temperature") not in (None, 1.0):  # keep e.g. temperature-0 repeats apart from the usual runs
            effort += f", temp {s['temperature']:g}"
        runs.append({
            "run": f.parent.name, "suite": s.get("suite", "base"), "model": name, "quant": quant, "backend": backend,
            "gpu": gpu_of(R, name, quant),
            "effort": effort,
            "temperature": s.get("temperature"),
            "overall": round(d["overall"], 1),
            "python": round(d["python"], 1) if d.get("python") is not None else None,
            "three": round(d["three"], 1) if d.get("three") is not None else None,
            "finished_only": round(S["answered_score"], 1) if S.get("answered_score") is not None else None,
            "answered": f"{S.get('tasks_answered')}/{S.get('tasks_total')}",
            "minutes": d["minutes"], "tokens": S.get("tokens_total"), "thinking": S.get("reasoning_tokens_total"),
            "answer_tokens": (S.get("tokens_total") or 0) - (S.get("reasoning_tokens_total") or 0),
            "gen_minutes": round(gen_s / 60, 1),
            # average speed from time: all generated tokens / total generation time (incl. prompt + first token)
            "tok_s_time": round(S["tokens_total"] / gen_s, 1) if gen_s and S.get("tokens_total") else None,
            "tokens_approx": any(r.get("tokens_approx") for r in d["results"]),
            "tok_s": S.get("tok_per_s"), "vram_gb": R.get("vram_peak_gb"), "ram_gb": R.get("ram_peak_gb"),
            "disk_read_gb": R.get("disk_read_gb"),
            "tasks": {r["id"]: (round(r["score"] * 100), r["status"]) for r in d["results"]},
            "tools": round(d["tools"], 1) if d.get("tools") is not None else None,
            "n_tasks": len(d["results"]),
            "broken": sum(is_broken(r) for r in d["results"]),
            "practical": round(practical_score(d["results"]), 1),
            "limits": s.get("limits") or ("lenient" if (s.get("max_tokens") or 0) > PRACTICAL_TOKENS else "practical"),
            "answers": {r["id"]: answer_hash(f.parent / r["id"]) for r in d["results"]},
        })
    runs.sort(key=lambda r: (-r["overall"], r["minutes"]))
    return runs


def main():
    cols = ["run", "suite", "model", "quant", "backend", "gpu", "effort", "temperature", "overall", "python", "three",
            "finished_only", "answered", "minutes", "gen_minutes", "tokens", "thinking", "answer_tokens",
            "tokens_approx", "tok_s_time", "tok_s", "vram_gb", "ram_gb", "disk_read_gb", "tools", "broken",
            "practical", "limits"]
    for folder, table, title, note in SUITES.values():
        runs = load_runs(folder)
        if not runs:
            continue
        all_ids = sorted({t for r in runs for t in r["tasks"]}, key=task_order)
        with open(HERE / folder / "results_table.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(cols + all_ids)
            for r in runs:
                w.writerow([r[c] for c in cols] + [r["tasks"].get(t, ("", ""))[0] for t in all_ids])

        lines = [title, "", note, "",
                 "Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says "
                 "which). All runs: temperature 1.0, sampling preset recommended by the model maker, 60-minute and "
                 "65,536-token limit per task (98,304 tokens in the runs from 30 Sep). Settings that were run more than once "
                 "are averaged under \"Mean per setting\"" + (", and ranked by their best run under \"Best run per "
                 "setting\"" if folder == "results_hard" else "") + "; every single run is listed under \"Every run\".", ""]
        lines += section(runs, best_table=folder == "results_hard")
        lines += ["- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks "
                  "(including prompt processing and waiting for the first token). This is the real working speed.",
                  "- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing "
                  "speed).",
                  "- `~` = token count partly estimated: the server did not report it for some tasks, or "
                  "under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text "
                  "length (see `fix_token_counts.py`).",
                  "- (limit) = ran out of tokens, (time) = hit the 60-minute limit, "
                  "(none) = stopped while still thinking, no answer.", ""]
        (HERE / table).write_text("\n".join(lines), encoding="utf-8")
        print("\n".join(lines))
    write_family_table(
        "GLM-5.3-Flash", "RESULTS_TABLE_GLM.md", "# Results table: GLM-5.3-Flash",
        "Every GLM-5.3-Flash variant that has been run, in all four suites. GLM-5.3-Flash is a large MoE model; on "
        "the RTX 5090 + 128 GB RAM most experts sit in system RAM, so it runs at 11–24 tok/s. The chat template "
        "knows the levels `low`, `high` and `max`; runs started with `medium` actually ran at `high` and are listed as `high`.")


FAIL_BELOW = 90  # a task scored below this counts as failed; small partial misses (a strict-mode TS error) do not
FAIL_KIND = {"task_timeout": "time", "max_tokens": "limit", "no_answer": "none", "max_turns": "turns"}


def problem_tasks(rs, limit=2):
    """Tasks a setting run 2+ times keeps failing: below 90% in at least 2 runs and in at least half of them.

    Returns [(task, failed, runs, kinds)], worst first; kinds counts how the generation broke
    (time / limit / none), the rest were wrong answers."""
    if len(rs) < 2:
        return []
    out = []
    for t in sorted({t for r in rs for t in r["tasks"]}, key=task_order):
        done = [r["tasks"][t] for r in rs if t in r["tasks"]]
        bad = [st for sc, st in done if sc < FAIL_BELOW]
        if len(bad) >= 2 and 2 * len(bad) >= len(done):
            kinds = {}
            for st in bad:
                k = FAIL_KIND.get(st, "wrong")
                kinds[k] = kinds.get(k, 0) + 1
            out.append((t, len(bad), len(done), kinds, sum(sc for sc, _ in done) / len(done)))
    out.sort(key=lambda x: (-x[1] / x[2], x[4]))
    return out[:limit]


def problem_text(rs, limit=2, kinds=True):
    """'h_p3_line_diff 4/6 (wrong 3, time 1)' for the tasks from problem_tasks, or '' if there are none."""
    parts = []
    for t, bad, n_, ks, _m in problem_tasks(rs, limit):
        how = ", ".join(f"{k} {v}" for k, v in sorted(ks.items(), key=lambda kv: -kv[1]))
        parts.append(f"{t} {bad}/{n_}" + (f" ({how})" if kinds else ""))
    return "; ".join(parts)


def rank_settings(runs):
    """One entry per setting (model + quant + backend + GPU + effort): its runs, mean, worst and best run."""
    groups = {}
    for r in runs:
        groups.setdefault((r["model"], r["quant"], r["backend"], r["gpu"], r["effort"]), []).append(r)
    out = []
    for (model, quant, backend, gpu, effort), rs in groups.items():
        out.append({"model": model, "quant": quant, "backend": backend, "gpu": gpu, "effort": effort, "runs": rs,
                    "mean": sum(r["overall"] for r in rs) / len(rs), "worst": min(r["overall"] for r in rs),
                    "mean_minutes": sum(r["minutes"] for r in rs) / len(rs),
                    "mean_tokens": sum(r["tokens"] or 0 for r in rs) / len(rs),
                    "tokens_approx": any(r["tokens_approx"] for r in rs),
                    "problems": problem_text(rs, kinds=False),
                    # best run; on a tie the faster one
                    "best": min(rs, key=lambda r: (-r["overall"], r["minutes"]))})
    return out


def write_family_table(prefix, path, title, intro):
    """One file for one model family (e.g. GLM-5.3-Flash): every variant in every suite, side by side."""
    mean = lambda xs: sum(xs) / len(xs) if xs else None
    per_suite = {}
    for suite, (folder, *_r) in SUITES.items():
        per_suite[suite] = [r for r in load_runs(folder) if r["model"].startswith(prefix)]
    keys = []
    for rs in per_suite.values():
        for r in rs:
            k = (r["model"], r["quant"], r["backend"], r["gpu"], r["effort"])
            if k not in keys:
                keys.append(k)
    if not keys:
        return

    def cell(suite, k):
        rs = [r for r in per_suite[suite] if (r["model"], r["quant"], r["backend"], r["gpu"], r["effort"]) == k]
        if not rs:
            return "–", None
        sc = mean([r["overall"] for r in rs])
        ap = "~" if any(r["tokens_approx"] for r in rs) else ""
        return (f"**{sc:.1f}%** ({len(rs)}×, {mean([r['minutes'] for r in rs]):.0f} min, "
                f"{ap}{mean([r['tokens'] or 0 for r in rs]) / 1000:.0f}k tok)"), sc

    rows = []
    for k in keys:
        cells = [cell(su, k) for su in SUITES]
        done = [c[1] for c in cells if c[1] is not None]
        rows.append((k, cells, mean(done), len(done)))
    rows.sort(key=lambda x: (-x[3], -(x[2] or 0)))
    problems = {}
    for k in keys:
        txt = [problem_text([r for r in per_suite[su] if (r["model"], r["quant"], r["backend"], r["gpu"], r["effort"]) == k])
               for su in SUITES]
        problems[k] = "; ".join(t for t in txt if t)
    lines = [title, "", intro, "",
             "## All suites", "",
             "Mean score per suite, with the number of runs, the mean time and the mean tokens of one run. Settings "
             "are sorted by how many suites they were run on, then by the mean of their suite scores. **Problem tasks** "
             "= tasks a setting scored below 90% on in at least half of its runs (and at least twice), in any suite.", "",
             "| # | Model | Quant | Backend | Effort | " + " | ".join(s_.capitalize() for s_ in SUITES) + " | Mean of suites | Problem tasks |",
             "|---|---|---|---|---|" + "---|" * len(SUITES) + "---|---|"]
    for i, (k, cells, m, nsu) in enumerate(rows, 1):
        model, quant, backend, gpu, effort = k
        lines.append(f"| {i} | {model} | {quant} | {backend} | {effort} | " + " | ".join(c[0] for c in cells)
                     + f" | {m:.1f}% ({nsu} of {len(SUITES)}) | {problems[k] or '–'} |")
    for suite, rs in per_suite.items():
        if not rs:
            continue
        groups = {}
        for r in rs:
            groups.setdefault((r["model"], r["quant"], r["backend"], r["gpu"], r["effort"]), []).append(r)
        lines += ["", f"## {suite.capitalize()} suite", "",
                  "| Model | Quant | Backend | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) "
                  "| Mean tokens | Avg tok/s (from time) | Problem tasks |",
                  "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
        for (model, quant, backend, gpu, effort), g in sorted(groups.items(), key=lambda kv: -mean([r["overall"] for r in kv[1]])):
            sc = [r["overall"] for r in g]
            tok = [r["tokens"] for r in g if r["tokens"]]
            gen = sum(r["gen_minutes"] for r in g)
            broken = 100 * sum(r["broken"] for r in g) / max(1, sum(r["n_tasks"] for r in g))
            ap = "~" if any(r["tokens_approx"] for r in g) else ""
            lines.append(f"| {model} | {quant} | {backend} | {effort} | {len(g)} | **{mean(sc):.1f}%** "
                         f"| {f'{min(sc):.0f}–{max(sc):.0f}' if len(g) > 1 else '–'} "
                         f"| {mean([r['practical'] for r in g]):.1f}% | {broken:.0f}% | {mean([r['minutes'] for r in g]):.1f} "
                         f"| {ap}{mean(tok) / 1000:.1f}k | {sum(tok) / (gen * 60):.1f} | {problem_text(g) or '–'} |")
    lines += ["", "Score @10 min/32k = the score if every task had to finish within 10 minutes and 32,768 tokens. "
              "Broken = share of tasks where generation itself failed (out of tokens or time, stopped mid-thought, "
              "looped, no final answer). `~` = token count partly estimated. All other suites' tables: "
              "RESULTS_TABLE*.md.", ""]
    (HERE / path).write_text("\n".join(lines), encoding="utf-8")


def when(run):
    """'26.09 19:42' from the run folder name."""
    return f"{run[6:8]}.{run[4:6]} {run[9:11]}:{run[11:13]}"


def stability_table(groups):
    """Settings run 2+ times: spread, tasks solved every time, broken generations, identical answers."""
    rows = []
    for (model, quant, backend, gpu, effort), rs in groups.items():
        if len(rs) < 2:
            continue
        scores = [r["overall"] for r in rs]
        m = sum(scores) / len(scores)
        sd = (sum((x - m) ** 2 for x in scores) / (len(scores) - 1)) ** 0.5
        ids = sorted(set.intersection(*(set(r["tasks"]) for r in rs)))
        solid = sum(all(r["tasks"][t][0] == 100 for r in rs) for t in ids)
        same = sum(len({r["answers"].get(t) for r in rs}) == 1 and rs[0]["answers"].get(t) is not None for t in ids)
        broken = 100 * sum(r["broken"] for r in rs) / max(1, sum(r["n_tasks"] for r in rs))
        temps = sorted({r["temperature"] for r in rs if r["temperature"] is not None})
        rows.append((m, sd, model, quant, backend, gpu, effort, len(rs), min(scores), solid, len(ids), broken, same,
                     "/".join(f"{t:g}" for t in temps), problem_text(rs) or "–"))
    if not rows:
        return []
    out = ["", "## Stability (settings run 2+ times)", "",
           "**Solved every run** = tasks with 100% in all runs. **Identical answers** = tasks where every run produced "
           "exactly the same code or answer; expect 0 at temperature 1.0, and close to all at temperature 0 on a "
           "deterministic backend. **Problem tasks** = tasks scored below 90% in at least half of the runs (and at least twice): "
           "failed/runs, then how (wrong = wrong answer; time, limit, none = out of time or tokens, or stopped "
           "mid-thought).", "",
           "| Model | Quant | Backend | GPU | Effort | Temp. | Runs | Mean | Std dev | Worst | Solved every run "
           "| Broken | Identical answers | Problem tasks |",
           "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for m, sd, model, quant, backend, gpu, effort, nr, worst, solid, nt, broken, same, temps, prob in sorted(
            rows, key=lambda x: (-x[0], x[1])):
        out.append(f"| {model} | {quant} | {backend} | {gpu} | {effort} | {temps} | {nr} | **{m:.1f}%** | {sd:.1f} "
                   f"| {worst:.1f}% | {solid}/{nt} | {broken:.0f}% | {same}/{nt} | {prob} |")
    return out


def section(runs, best_table=False):
    k = lambda x: f"{x / 1000:.1f}k" if isinstance(x, (int, float)) else "n/a"
    n = lambda x, p=1: f"{x:.{p}f}" if isinstance(x, (int, float)) else "n/a"
    mean = lambda xs: sum(xs) / len(xs) if xs else None

    groups = {}
    for r in runs:
        groups.setdefault((r["model"], r["quant"], r["backend"], r["gpu"], r["effort"]), []).append(r)
    agg = []
    for key, rs in groups.items():
        tok = [r["tokens"] for r in rs if r["tokens"]]
        gen = sum(r["gen_minutes"] for r in rs)
        agg.append((key, rs, mean([r["overall"] for r in rs]), mean([r["minutes"] for r in rs]), mean(tok),
                    sum(tok) / (gen * 60) if gen and len(tok) == len(rs) else None,
                    max((r["vram_gb"] for r in rs if r["vram_gb"] is not None), default=None)))
    agg.sort(key=lambda a: (-a[2], a[3]))
    lines = ["## Mean per setting", "",
             "**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens "
             "(the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where "
             "generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.",
             "",
             "| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k "
             "| Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for i, ((model, quant, backend, gpu, effort), rs, sc, mins, tok, tps, vram) in enumerate(agg, 1):
        lo, hi = min(r["overall"] for r in rs), max(r["overall"] for r in rs)
        ap = "~" if any(r["tokens_approx"] for r in rs) else ""
        rng = f"{n(lo, 0)}–{n(hi, 0)}" if len(rs) > 1 else "–"
        prac = mean([r["practical"] for r in rs])
        broken = 100 * sum(r["broken"] for r in rs) / max(1, sum(r["n_tasks"] for r in rs))
        lines.append(f"| {i} | {model} | {quant} | {backend} | {gpu} | {effort} | {len(rs)} | **{n(sc)}%** "
                     f"| {rng} | {n(prac)}% | {n(broken, 0)}% | {n(mins)} | {ap}{k(tok)} | {n(tps)} | {n(vram)} |")

    lines += stability_table(groups)

    if best_table:
        ranked = sorted(rank_settings(runs), key=lambda g: (-g["best"]["overall"], g["best"]["minutes"]))
        lines += ["", "## Best run per setting", "",
                  "Ranked by each setting's single best run (on a tie, the faster one). Compare with the mean above: "
                  "a setting that is high here but lower there is good on a lucky run, not every run.", "",
                  "| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Best score | Best run | Time (min) "
                  "| Tokens | Avg tok/s (from time) | Mean of all runs |",
                  "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
        for i, g in enumerate(ranked, 1):
            b = g["best"]
            ap = "~" if b["tokens_approx"] else ""
            lines.append(f"| {i} | {g['model']} | {g['quant']} | {g['backend']} | {g['gpu']} | {g['effort']} "
                         f"| {len(g['runs'])} | **{n(b['overall'])}%** | {when(b['run'])} | {n(b['minutes'])} "
                         f"| {ap}{k(b['tokens'])} | {n(b['tok_s_time'])} | {n(g['mean'])}% |")
    lines += ["", "## Every run", "",
              "| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) "
              "| Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) "
              "| VRAM GB | RAM GB |",
              "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for i, r in enumerate(runs, 1):
        ap = "~" if r["tokens_approx"] else ""
        lines.append(f"| {i} | {when(r['run'])} | {r['model']} | {r['quant']} | {r['backend']} | {r['gpu']} "
                     f"| {r['effort']} | **{n(r['overall'])}%** "
                     f"| {n(r['python'])} | {n(r['three'])} | {n(r['minutes'])} | {ap}{k(r['tokens'])} | "
                     f"{ap}{k(r['thinking'])} | {ap}{k(r['answer_tokens'])} | **{n(r['tok_s_time'])}** | "
                     f"{n(r['tok_s'], 0)} | {n(r['vram_gb'])} | {n(r['ram_gb'])} |")
    task_ids = sorted({t for r in runs for t in r["tasks"]}, key=task_order)
    lines += ["", "## Score per task (%)", "",
              "| Run | Model / effort | " + " | ".join(task_ids) + " |",
              "|---|---|" + "---|" * len(task_ids)]
    mark = {"max_tokens": " (limit)", "task_timeout": " (time)", "no_answer": " (none)"}
    for r in runs:
        cells = [f"{r['tasks'].get(t, ('', ''))[0]}{mark.get(r['tasks'].get(t, ('', ''))[1], '')}" for t in task_ids]
        lines.append(f"| {when(r['run'])} | {r['model']} {r['quant']} ({r['backend']}) / {r['effort']} | "
                     + " | ".join(cells) + " |")
    return lines + [""]


if __name__ == "__main__":
    main()
