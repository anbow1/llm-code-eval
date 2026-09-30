#!/usr/bin/env python3
"""Build results tables from results/*/summary.json (base suite) and results_hard/*/summary.json (hard suite).

    python make_summary.py

Writes:
  RESULTS_TABLE.md, results/results_table.csv                - base suite
  RESULTS_TABLE_HARD.md, results_hard/results_table.csv      - hard suite
"""
import csv
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent


def describe(label, model):
    """Readable model / quant / backend from the run label and model path (case-insensitive)."""
    m = f"{label} {model}".replace("\\", "/").lower()
    backend = "ExLlamaV3" if "exl3" in m else "Strata" if re.search(r"[_-]strata([_-]|$)", m) else "llama.cpp"
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
        suffix = "".join(f" {x}" for x in ("MTP", "qv44") if re.search(rf"[_-]{x.lower()}([_-]|$)", m))
        return name, prefix + quant + suffix, backend
    if "glm" in m:
        if "exl3" in m:
            quant = "EXL3 3.05 bpw"
        elif bit:
            quant = f"GSQ-RCO {bit.group(1)}-bit"
        else:
            quant = "?"
        return "GLM-5.3-Flash", quant, backend
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
}


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
        })
    runs.sort(key=lambda r: (-r["overall"], r["minutes"]))
    return runs


def main():
    cols = ["run", "suite", "model", "quant", "backend", "gpu", "effort", "temperature", "overall", "python", "three",
            "finished_only", "answered", "minutes", "gen_minutes", "tokens", "thinking", "answer_tokens",
            "tokens_approx", "tok_s_time", "tok_s", "vram_gb", "ram_gb", "disk_read_gb"]
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
                 "65,536-token limit per task (98,304 tokens in the runs from 30 Sep). Settings that were run more than once are averaged in the first "
                 "table; every single run is listed in the second.", ""]
        lines += section(runs)
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


def when(run):
    """'26.09 19:42' from the run folder name."""
    return f"{run[6:8]}.{run[4:6]} {run[9:11]}:{run[11:13]}"


def section(runs):
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
             "| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Mean time (min) "
             "| Mean tokens | Avg tok/s (from time) | VRAM GB |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for i, ((model, quant, backend, gpu, effort), rs, sc, mins, tok, tps, vram) in enumerate(agg, 1):
        lo, hi = min(r["overall"] for r in rs), max(r["overall"] for r in rs)
        ap = "~" if any(r["tokens_approx"] for r in rs) else ""
        lines.append(f"| {i} | {model} | {quant} | {backend} | {gpu} | {effort} | {len(rs)} | **{n(sc)}%** "
                     f"| {n(lo, 0)}–{n(hi, 0)} | {n(mins)} | {ap}{k(tok)} | {n(tps)} | {n(vram)} |"
                     if len(rs) > 1 else
                     f"| {i} | {model} | {quant} | {backend} | {gpu} | {effort} | 1 | **{n(sc)}%** "
                     f"| – | {n(mins)} | {ap}{k(tok)} | {n(tps)} | {n(vram)} |")

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
