#!/usr/bin/env python3
"""Build results tables from results/*/summary.json.

    python make_summary.py

Writes:
  RESULTS_TABLE.md        - main table + per-task table
  results/results_table.csv
"""
import csv
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent


def describe(label, model):
    """Readable model / quant / backend from the run label and model path."""
    m = f"{label} {model}".replace("\\", "/")
    if "27b" in m.lower():
        name, quant = "Qwen3.8-27B", "UD-Q6_K_M"
    elif "GLM" in m:
        name = "GLM-5.3-Flash"
        quant = ("EXL3 3.05 bpw" if "exl3" in m.lower()
                 else "GSQ-RCO " + (re.search(r"(\d\.\d)bit", m).group(1) + "-bit" if re.search(r"(\d\.\d)bit", m) else "?"))
    else:
        name = "Qwen3.8-Flash-Next"
        if "exl3" in m.lower():
            quant = "EXL3 5.05 bpw"
        elif "GSQ-RCO-IQ3_XXS" in m:
            quant = "GSQ-RCO IQ3_XXS"
        elif "UD-Q4_K_XL" in m:
            quant = "UD-Q4_K_XL"
        else:
            quant = "?"
    backend = "ExLlamaV3" if "exl3" in m.lower() else "llama.cpp"
    return name, quant, backend


def main():
    runs = []
    for f in sorted(HERE.glob("results/*/summary.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        s, S, R = d.get("settings", {}), d.get("summary", {}), d.get("resources", {})
        name, quant, backend = describe(d["name"], d.get("model", ""))
        effort = s.get("reasoning_effort") or "domyślny (xhigh)"
        runs.append({
            "run": f.parent.name, "model": name, "quant": quant, "backend": backend, "effort": effort,
            "temperature": s.get("temperature"),
            "overall": round(d["overall"], 1), "python": round(d["python"], 1), "three": round(d["three"], 1),
            "finished_only": round(S["answered_score"], 1) if S.get("answered_score") is not None else None,
            "answered": f"{S.get('tasks_answered')}/{S.get('tasks_total')}",
            "minutes": d["minutes"], "tokens": S.get("tokens_total"), "thinking": S.get("reasoning_tokens_total"),
            "tok_s": S.get("tok_per_s"), "vram_gb": R.get("vram_peak_gb"), "ram_gb": R.get("ram_peak_gb"),
            "disk_read_gb": R.get("disk_read_gb"),
            "tasks": {r["id"]: (round(r["score"] * 100), r["status"]) for r in d["results"]},
        })
    runs.sort(key=lambda r: (-r["overall"], r["minutes"]))

    cols = ["run", "model", "quant", "backend", "effort", "temperature", "overall", "python", "three",
            "finished_only", "answered", "minutes", "tokens", "thinking", "tok_s", "vram_gb", "ram_gb", "disk_read_gb"]
    task_ids = sorted({t for r in runs for t in r["tasks"]}, key=lambda t: (t[0] != "t", t))
    with open(HERE / "results" / "results_table.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(cols + task_ids)
        for r in runs:
            w.writerow([r[c] for c in cols] + [r["tasks"].get(t, ("", ""))[0] for t in task_ids])

    k = lambda x: f"{x / 1000:.1f}k" if isinstance(x, (int, float)) else "n/a"
    n = lambda x, p=1: f"{x:.{p}f}" if isinstance(x, (int, float)) else "n/a"
    lines = ["# Tabela wyników", "",
             "Wszystkie przebiegi: temperatura 1.0, limit 65 536 tokenów i 60 min na zadanie, 10 zadań "
             "(6 × TypeScript + Three.js, 4 × Python). Jeden przebieg na ustawienie.", "",
             "| # | Model | Kwantyzacja | Backend | Poziom myślenia | Wynik | Python | Three.js | Czas (min) "
             "| Tokeny | Myślenie | tok/s | VRAM GB | RAM GB |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for i, r in enumerate(runs, 1):
        lines.append(f"| {i} | {r['model']} | {r['quant']} | {r['backend']} | {r['effort']} | **{n(r['overall'])}%** "
                     f"| {n(r['python'])} | {n(r['three'])} | {n(r['minutes'])} | {k(r['tokens'])} | "
                     f"{k(r['thinking'])} | {n(r['tok_s'], 0)} | {n(r['vram_gb'])} | {n(r['ram_gb'])} |")
    lines += ["", "## Wynik na zadanie (%)", "",
              "| Model / poziom | " + " | ".join(task_ids) + " |",
              "|---|" + "---|" * len(task_ids)]
    mark = {"max_tokens": " (limit)", "task_timeout": " (czas)", "no_answer": " (brak)"}
    for r in runs:
        cells = []
        for t in task_ids:
            sc, st = r["tasks"].get(t, ("", ""))
            cells.append(f"{sc}{mark.get(st, '')}")
        lines.append(f"| {r['model']} {r['quant']} / {r['effort']} | " + " | ".join(cells) + " |")
    lines += ["", "(limit) = skończył się limit tokenów, (czas) = przekroczony limit 60 min, "
                  "(brak) = model skończył w trakcie myślenia bez odpowiedzi.", ""]
    (HERE / "RESULTS_TABLE.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
