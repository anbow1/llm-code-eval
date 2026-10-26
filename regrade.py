#!/usr/bin/env python3
"""Re-grade saved runs after a test was fixed, without asking the model again.

    python regrade.py --suite practical --tasks w_json,w_refactor
    python regrade.py --suite tools --tasks t_agent_fix
    python regrade.py --suite scene --tasks s1_ocean_island

Python tasks: the hidden tests are run again on the saved solution.py / answer.json.
Three.js tasks: the saved main.ts is built and checked again in the browser (screenshots are retaken).
t_agent_fix: the checks on the saved repository are run again (visible and hidden tests, test file unchanged).
Updates summary.json (scores, parts, overall) and appends a note to report.md. Safe to run again.
"""
import argparse
import datetime as dt
import json
import types
from pathlib import Path

import run_eval as R
import tasks_tools as TT

HERE = Path(__file__).resolve().parent


def regrade_agent(wd, old):
    """Re-run the repository checks of t_agent_fix; keep the checks that need the call log."""
    env = types.SimpleNamespace(repo=wd / "repo", test_hash=TT.test_file_hash(TT.TEST_CART_PY.encode("utf-8")),
                                calls=[])
    log = {"bad_json": 0, "text_tool_calls": 0, "notes": [], "calls_per_turn": [], "turns": 0}
    new = TT.grade_agent(env, log, "")
    keep = {k: v for k, v in old.items() if k not in ("visible_tests_pass", "hidden_tests_pass", "tests_not_modified")}
    return {**keep, **{k: new[k] for k in ("visible_tests_pass", "hidden_tests_pass", "tests_not_modified")}}, log["notes"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--suite", choices=list(R.SUITES), required=True)
    ap.add_argument("--tasks", required=True, help="comma list of task ids")
    args = ap.parse_args()
    mod, folder, _ = R.SUITES[args.suite]
    want = {t.strip() for t in args.tasks.split(",") if t.strip()}
    defs = {t["id"]: t for t in getattr(mod, "PY_TASKS", []) + getattr(mod, "TASKS", []) + getattr(mod, "THREE_TASKS", [])}
    browser = pw = None
    if any(t.get("check") for t in defs.values() if t["id"] in want):  # Three.js tasks need the browser
        import os
        from playwright.sync_api import sync_playwright
        R.setup_ts_env()
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None,
                                     args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                                           "--ignore-gpu-blocklist"])
    for f in sorted((HERE / folder).glob("*/summary.json")):
        raw = f.read_bytes()
        d = json.loads(raw)
        changed = []
        for r in d["results"]:
            if r["id"] not in want or r["status"] in ("server_down", "budget", "error", "server_crash"):
                continue
            wd = f.parent / r["id"]
            if not wd.is_dir():
                continue
            if r["id"] == "t_agent_fix":
                checks, notes = regrade_agent(wd, r["checks"])
            elif r["kind"] == "three":
                ts = wd / "main.ts"
                if not ts.is_file() or not ts.read_text(encoding="utf-8").strip():
                    continue
                checks, notes = R.run_three_task(defs[r["id"]], ts.read_text(encoding="utf-8"), wd, browser)
            elif r["kind"] == "python":
                sol = wd / "solution.py"
                saved = sol.read_bytes() if sol.is_file() else b""
                checks, notes = R.run_python_task(defs[r["id"]], saved.decode("utf-8"), wd)
                sol.write_bytes(saved)  # keep the model's file exactly as it was
            else:
                continue
            score = sum(checks.values()) / max(1, len(checks))
            if checks != r["checks"]:
                changed.append(f"{r['id']} {r['score'] * 100:.0f}% -> {score * 100:.0f}%")
                old_notes = [n for n in r["notes"] if not n.startswith("re-graded")]
                r.update(checks=checks, score=score,
                         notes=[n for n in old_notes if n in notes or ":" not in n or n.startswith("tool calls")]
                         + notes + [f"re-graded {dt.date.today()} after a test fix"])
        if not changed:
            continue
        S = R.summarize(d["results"])
        d["summary"].update({k: S[k] for k in ("python", "three", "tools", "overall", "answered_score")})
        for k in ("python", "three", "tools", "overall"):
            d[k] = S[k]
        out = json.dumps(d, indent=2, ensure_ascii=False)
        f.write_bytes((out.replace("\n", "\r\n") if b"\r\n" in raw else out).encode("utf-8"))
        rep = f.parent / "report.md"
        if rep.is_file():
            rep.write_text(rep.read_text(encoding="utf-8").rstrip() + f"\n\n## Re-graded {dt.date.today()}\n\n"
                           "A test was fixed after this run; the saved answers were graded again: "
                           + ", ".join(changed) + f". New overall: {S['overall']:.1f}%.\n", encoding="utf-8")
        print(f"{f.parent.name}: " + ", ".join(changed) + f"  (overall {S['overall']:.1f}%)")
    if browser:
        browser.close()
        pw.stop()


if __name__ == "__main__":
    main()
