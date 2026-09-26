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
    """Readable model / quant / backend from the run label and model path (case-insensitive)."""
    m = f"{label} {model}".replace("\\", "/").lower()
    backend = "ExLlamaV3" if "exl3" in m else "llama.cpp"
    bit = re.search(r"(\d\.\d+)\s*-?bit", m)
    bpw = re.search(r"(\d\.\d+)\s*-?bpw|exl3-(\d)(\d{2})", m)
    if "27b" in m:
        return "Qwen3.8-27B", "UD-Q6_K_M" if "q6" in m or "27b" in m else "?", backend
    if "glm" in m:
        if "exl3" in m:
            quant = "EXL3 3.05 bpw"
        elif bit:
            quant = f"GSQ-RCO {bit.group(1)}-bit"
        else:
            quant = "?"
        return "GLM-5.3-Flash", quant, backend
    if "flash-next" in m or "qwen" in m:
        if "exl3" in m:
            quant = "EXL3 5.05 bpw"
        elif "iq3_xxs" in m:
            quant = "GSQ-RCO IQ3_XXS"
        elif "q4_k_xl" in m:
            quant = "UD-Q4_K_XL"
        else:
            quant = "?"
        return "Qwen3.8-Flash-Next", quant, backend
    return label, "?", backend


def main():
    runs = []
    for f in sorted(HERE.glob("results/*/summary.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        s, S, R = d.get("settings", {}), d.get("summary", {}), d.get("resources", {})
        name, quant, backend = describe(d["name"], d.get("model", ""))
        gen_s = sum(r.get("gen_seconds") or 0 for r in d["results"])
        effort = s.get("reasoning_effort") or "domyślny (xhigh)"
        runs.append({
            "run": f.parent.name, "suite": s.get("suite", "base"), "model": name, "quant": quant, "backend": backend, "effort": effort,
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

    cols = ["run", "suite", "model", "quant", "backend", "effort", "temperature", "overall", "python", "three",
            "finished_only", "answered", "minutes", "gen_minutes", "tokens", "thinking", "answer_tokens",
            "tokens_approx", "tok_s_time", "tok_s", "vram_gb", "ram_gb", "disk_read_gb"]
    all_ids = sorted({t for r in runs for t in r["tasks"]}, key=lambda t: (t.startswith("h_"), t[0] != "t", t))
    with open(HERE / "results" / "results_table.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(cols + all_ids)
        for r in runs:
            w.writerow([r[c] for c in cols] + [r["tasks"].get(t, ("", ""))[0] for t in all_ids])

    lines = ["# Tabela wyników", ""]
    titles = {
        "hard": ("## Zestaw trudny (--suite hard)",
                 "6 zadań (3 × TypeScript + Three.js, 3 × Python), temperatura 1.0, limit 65 536 tokenów i 60 min "
                 "na zadanie. Jeden przebieg na ustawienie."),
        "base": ("## Zestaw podstawowy",
                 "10 zadań (6 × TypeScript + Three.js, 4 × Python), temperatura 1.0, limit 65 536 tokenów i 60 min "
                 "na zadanie. Jeden przebieg na ustawienie."),
    }
    for suite in ("hard", "base"):
        rs = [r for r in runs if r["suite"] == suite]
        if rs:
            lines += section(rs, *titles[suite])
    lines += ["- **Śr. tok/s (z czasu)** = wszystkie wygenerowane tokeny ÷ łączny czas generowania wszystkich "
              "zadań (razem z czytaniem promptu i czekaniem na pierwszy token). To realna szybkość pracy.",
              "- **tok/s (generowanie)** = średnia z zadań, liczona od pierwszego tokena do końca (sama szybkość "
              "pisania).",
              "- `~` = liczba tokenów częściowo szacowana (serwer nie podał jej dla części zadań, np. przerwanych "
              "albo zapętlonych).",
              "- (limit) = skończył się limit tokenów, (czas) = przekroczony limit 60 min, "
              "(brak) = model skończył w trakcie myślenia bez odpowiedzi.", ""]
    (HERE / "RESULTS_TABLE.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


def section(runs, title, note):
    k = lambda x: f"{x / 1000:.1f}k" if isinstance(x, (int, float)) else "n/a"
    n = lambda x, p=1: f"{x:.{p}f}" if isinstance(x, (int, float)) else "n/a"
    lines = [title, "", note, "",
             "| # | Model | Kwantyzacja | Backend | Poziom myślenia | Wynik | Python | Three.js | Czas (min) "
             "| Tokeny razem | w tym myślenie | Odpowiedź | Śr. tok/s (z czasu) | tok/s (generowanie) "
             "| VRAM GB | RAM GB |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for i, r in enumerate(runs, 1):
        ap = "~" if r["tokens_approx"] else ""
        lines.append(f"| {i} | {r['model']} | {r['quant']} | {r['backend']} | {r['effort']} | **{n(r['overall'])}%** "
                     f"| {n(r['python'])} | {n(r['three'])} | {n(r['minutes'])} | {ap}{k(r['tokens'])} | "
                     f"{ap}{k(r['thinking'])} | {ap}{k(r['answer_tokens'])} | **{n(r['tok_s_time'])}** | "
                     f"{n(r['tok_s'], 0)} | {n(r['vram_gb'])} | {n(r['ram_gb'])} |")
    task_ids = sorted({t for r in runs for t in r["tasks"]}, key=lambda t: (t.split("_")[1][0] != "t", t))
    lines += ["", "Wynik na zadanie (%):", "",
              "| Model / poziom | " + " | ".join(task_ids) + " |",
              "|---|" + "---|" * len(task_ids)]
    mark = {"max_tokens": " (limit)", "task_timeout": " (czas)", "no_answer": " (brak)"}
    for r in runs:
        cells = [f"{r['tasks'].get(t, ('', ''))[0]}{mark.get(r['tasks'].get(t, ('', ''))[1], '')}" for t in task_ids]
        lines.append(f"| {r['model']} {r['quant']} / {r['effort']} | " + " | ".join(cells) + " |")
    return lines + [""]


if __name__ == "__main__":
    main()
