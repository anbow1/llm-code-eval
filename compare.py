#!/usr/bin/env python3
"""Compare runs:  python compare.py         base suite (results/)
                python compare.py --hard  hard suite (results_hard/)
Add --all to show every run of a model, not only the newest."""
import json
import sys
from pathlib import Path

rows = []
folder = "results_hard" if "--hard" in sys.argv else "results"
for f in sorted(Path(__file__).resolve().parent.glob(f"{folder}/*/summary.json")):
    d = json.loads(f.read_text(encoding="utf-8"))
    S = d.get("summary") or {}
    R = d.get("resources") or {}
    res = d["results"]
    tps = [r["tok_per_s"] for r in res if r.get("tok_per_s")]
    rows.append({
        "name": f.parent.name[16:],  # folder name without the date; folders may be renamed to fix a label
        "py": d.get("python"), "th": d.get("three"), "ov": d["overall"],
        "fin": S.get("answered_score"),
        "done": f"{S.get('tasks_answered', sum(1 for r in res if r.get('gen_seconds')))}/{len(res)}",
        "min": d["minutes"],
        "tok": S.get("tokens_total", sum(r.get("tokens") or 0 for r in res)),
        "think": S.get("reasoning_tokens_total"),
        "tps": S.get("tok_per_s") or (sum(tps) / len(tps) if tps else None),
        "vram": R.get("vram_peak_gb"), "ram": R.get("ram_peak_gb"),
        "date": f.parent.name[:15],
    })

if "--all" not in sys.argv:  # keep only the newest run per name
    latest = {}
    for r in rows:
        latest[r["name"]] = r
    rows = list(latest.values())

n = lambda x, w=5, p=1: f"{x:{w}.{p}f}" if isinstance(x, (int, float)) else f"{'n/a':>{w}}"
print(f"{'run':<34} {'python':>6} {'three':>6} {'total':>6} {'fin.':>6} {'done':>5} {'min':>5} "
      f"{'tokens':>7} {'think':>7} {'tok/s':>6} {'VRAM':>5} {'RAM':>5}  date")
for r in sorted(rows, key=lambda r: -r["ov"]):
    print(f"{r['name'][:34]:<34} {n(r['py'], 6)} {n(r['th'], 6)} {n(r['ov'], 6)} {n(r['fin'], 6)} "
          f"{r['done']:>5} {n(r['min'])} {r['tok']:>7} {n(r['think'], 7, 0)} {n(r['tps'], 6)} "
          f"{n(r['vram'])} {n(r['ram'])}  {r['date']}")
print("\nfin. = average score over tasks the model finished (no max_tokens, no timeout, not skipped)")
