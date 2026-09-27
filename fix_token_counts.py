#!/usr/bin/env python3
"""Correct token counts that the server under-reported, in results/*/summary.json.

    python fix_token_counts.py

TabbyAPI (ExLlamaV3) reports far too few completion tokens on long answers (e.g. 2,222 tokens
for 181,000 characters of text). For every task whose count implies more than 5 characters per
token (llama.cpp runs never go above 4.7), the count is re-estimated from the saved text
(reasoning.md + raw_response.md), using the characters-per-token ratio measured on llama.cpp
runs of the same model family and task. Decode speed is recomputed from the new count.

The server's numbers are kept as tokens_reported / reasoning_tokens_reported, the task is marked
tokens_approx, and running the script again changes nothing. report.md files are not rewritten.
"""
import json
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAX_CPT = 5.0


def family(run):
    return "glm" if "glm" in run.lower() else "qwen"


def chars(task_dir):
    return {f: len((task_dir / f).read_text(encoding="utf-8", errors="replace"))
            if (task_dir / f).exists() else 0 for f in ("reasoning.md", "raw_response.md")}


def main():
    runs = [(f, json.loads(f.read_text(encoding="utf-8"))) for f in sorted(HERE.glob("results/*/summary.json"))]

    # characters per token, measured where the server counts correctly (llama.cpp)
    ratios, fam_ratios = {}, {}
    for f, d in runs:
        if "exl3" in f.parent.name.lower():
            continue
        for r in d["results"]:
            tok = r.get("tokens_reported", r.get("tokens"))
            if tok and not r.get("tokens_approx"):
                c = sum(chars(f.parent / r["id"]).values())
                if c:
                    ratios.setdefault((family(f.parent.name), r["id"]), []).append(c / tok)
                    fam_ratios.setdefault(family(f.parent.name), []).append(c / tok)
    med = {k: statistics.median(v) for k, v in ratios.items()}
    fam_med = {k: statistics.median(v) for k, v in fam_ratios.items()}

    for f, d in runs:
        changed = []
        for r in d["results"]:
            if "tokens_reported" in r or not r.get("tokens"):
                continue
            c = chars(f.parent / r["id"])
            total = sum(c.values())
            if total / r["tokens"] <= MAX_CPT:
                continue
            fam = family(f.parent.name)
            cpt = med.get((fam, r["id"]), fam_med[fam])
            r["tokens_reported"], r["reasoning_tokens_reported"] = r["tokens"], r.get("reasoning_tokens")
            r["tokens"] = round(total / cpt)
            r["reasoning_tokens"] = round(r["tokens"] * c["reasoning.md"] / total)
            r["answer_tokens"] = r["tokens"] - r["reasoning_tokens"]
            r["tokens_approx"] = True
            decode_s = (r.get("gen_seconds") or 0) - (r.get("ttft_s") or 0)
            if decode_s > 0:
                r["tok_per_s"] = round(r["tokens"] / decode_s, 1)
            changed.append(f"{r['id']} {r['tokens_reported']}->{r['tokens']}")
        if not changed:
            continue
        S, res = d["summary"], d["results"]
        S["tokens_total"] = sum(r.get("tokens") or 0 for r in res)
        S["reasoning_tokens_total"] = sum(r.get("reasoning_tokens") or 0 for r in res)
        tps = [r["tok_per_s"] for r in res if r.get("tok_per_s")]
        S["tok_per_s"] = round(sum(tps) / len(tps), 1) if tps else None
        crlf = b"\r\n" in f.read_bytes()  # keep the file's line endings
        out = json.dumps(d, indent=2, ensure_ascii=False)
        f.write_bytes((out.replace("\n", "\r\n") if crlf else out).encode("utf-8"))
        print(f"{f.parent.name}: " + ", ".join(changed))


if __name__ == "__main__":
    main()
