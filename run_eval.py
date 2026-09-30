#!/usr/bin/env python3
"""
Local LLM code eval: 4 Python tasks + 6 TypeScript/Three.js tasks, ~30 min max.

Works with any OpenAI-compatible server:
  llama.cpp  --base-url http://localhost:8080/v1
  LM Studio  --base-url http://localhost:1234/v1
  Ollama     --base-url http://localhost:11434/v1

Example:
  python run_eval.py --model qwen3-27b --label qwen27b-Q4_K_M
  python run_eval.py --label glm-exl3-3.05 --think off      (thinking off)
"""
import argparse
import datetime as dt
import io
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import tasks as T
import tasks_hard as TH

HERE = Path(__file__).resolve().parent
TS_ENV = HERE / "ts_env"

SNAPSHOT_JS = r"""
() => {
  const s = window.__scene;
  if (!s || !s.traverse) return null;
  s.updateMatrixWorld(true);
  const out = [];
  s.traverse(o => {
    let meshAncestors = 0;
    for (let p = o.parent; p; p = p.parent) if (p.isMesh) meshAncestors++;
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    const rec = {
      type: o.isInstancedMesh ? 'InstancedMesh' : o.type, uuid: o.uuid, isMesh: !!o.isMesh, meshAncestors,
      mw: o.isMesh ? Array.from(o.matrixWorld.elements) : [],
      mats: mats.map(m => ({
        type: m.type, uuid: m.uuid,
        color: m.color ? m.color.getHex() : null,
        emissive: m.emissive ? m.emissive.getHex() * (m.emissiveIntensity ?? 1) : null,
        vertexColors: !!m.vertexColors,
        uniforms: m.uniforms ? Object.fromEntries(Object.entries(m.uniforms).map(
          ([k, u]) => [k, (u && typeof u.value === 'number') ? u.value : null])) : null,
      })),
      geom: null,
    };
    if (o.isInstancedMesh) {
      rec.count = o.count;
      rec.hasInstanceColor = !!o.instanceColor;
      const a = o.instanceMatrix.array; let sum = 0;
      for (let i = 0; i < a.length; i += 7) sum += a[i];
      rec.imSum = sum;
    }
    const g = o.geometry;
    if (g && g.attributes) {
      const pos = g.attributes.position, nor = g.attributes.normal;
      let avgNy = 0;
      if (nor && nor.count) {
        const step = Math.max(1, Math.floor(nor.count / 2000)); let n = 0;
        for (let i = 0; i < nor.count; i += step) { avgNy += nor.getY(i); n++; }
        avgNy /= n;
      }
      let sizeY = 0;
      if (pos && pos.count) {
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < lo) lo = y; if (y > hi) hi = y; }
        sizeY = hi - lo;
      }
      rec.geom = { type: g.type, indexed: !!g.index, vcount: pos ? pos.count : 0,
                   hasNormal: !!nor, hasColor: !!g.attributes.color, avgNy, sizeY };
    }
    out.push(rec);
  });
  return out;
}
"""

PROJECT_JS = r"""
(uuid) => {
  let m = null;
  window.__scene.traverse(o => { if (o.uuid === uuid) m = o; });
  if (!m) return null;
  const v = m.position.clone();
  m.getWorldPosition(v);
  v.project(window.__camera);
  const r = window.__renderer.domElement.getBoundingClientRect();
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height];
}
"""

PACKAGE_JSON = {
    "name": "llm-code-eval-ts-env",
    "private": True,
    "dependencies": {"three": "latest"},
    "devDependencies": {"@types/three": "latest", "typescript": "^5.8.0", "esbuild": "^0.25.0"},
}

BUILD_JS = """
const [,, entry, outfile] = process.argv;
require('esbuild').build({ entryPoints: [entry], bundle: true, format: 'iife',
  outfile, logLevel: 'silent', target: 'es2020' })
  .then(() => process.exit(0))
  .catch(e => { console.error(String(e.message || e).slice(0, 2000)); process.exit(1); });
"""


# ---------------------------------------------------------------- model
# Vendor-recommended sampling (from the model cards)
PRESETS = {
    "qwen-think": {"temperature": 1.0, "top_p": 0.95, "top_k": 20, "min_p": 0.0,
                   "presence_penalty": 0.0, "repetition_penalty": 1.0},
    "qwen-instruct": {"temperature": 0.7, "top_p": 0.80, "top_k": 20, "min_p": 0.0,
                      "presence_penalty": 1.5, "repetition_penalty": 1.0},
    "glm": {"temperature": 1.0, "top_p": 1.0},
}
SAMPLING_KEYS = ("top_p", "top_k", "min_p", "presence_penalty", "repetition_penalty")


class ServerDown(Exception):
    pass


def chat(args, system, prompt, timeout):
    """Streaming call. Returns a dict with answer, reasoning, timings and token counts."""
    body = {
        "model": args.model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        "temperature": args.temperature,
        "max_tokens": args.max_tokens,
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    for k in SAMPLING_KEYS:
        v = getattr(args, k)
        if v is not None:
            body[k] = v
    ctk = {}
    if args.think == "off":
        ctk["enable_thinking"] = False
    elif args.think == "on":
        ctk["enable_thinking"] = True
    if args.reasoning_effort:
        body["reasoning_effort"] = args.reasoning_effort  # OpenAI-style field
        ctk["reasoning_effort"] = args.reasoning_effort   # Qwen/GLM chat templates read it here
    if ctk:
        body["chat_template_kwargs"] = ctk
    req = urllib.request.Request(
        args.base_url.rstrip("/") + "/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {args.api_key}",
                 "Accept": "text/event-stream"},
    )
    t0 = time.perf_counter()
    first = first_answer = None
    answer, reasoning = [], []
    chunks = think_chunks = 0
    usage, finish = {}, None
    timed_out = False
    try:
        r = urllib.request.urlopen(req, timeout=min(timeout, 300))
    except urllib.error.URLError as e:
        if isinstance(getattr(e, "reason", None), ConnectionRefusedError) or "10061" in str(e):
            raise ServerDown(str(e))
        raise
    with r:
        for raw in r:
            if time.perf_counter() - t0 > timeout:
                timed_out = True
                break
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            try:
                ev = json.loads(data)
            except json.JSONDecodeError:
                continue
            if ev.get("usage"):
                usage = ev["usage"]
            for ch in ev.get("choices") or []:
                d = ch.get("delta") or {}
                rc = d.get("reasoning_content") or d.get("reasoning") or ""
                c = d.get("content") or ""
                if rc or c:
                    chunks += 1
                    now = time.perf_counter()
                    first = first or now
                    if rc:
                        think_chunks += 1
                        reasoning.append(rc)
                    if c:
                        first_answer = first_answer or now
                        answer.append(c)
                if ch.get("finish_reason"):
                    finish = ch["finish_reason"]
    end = time.perf_counter()
    text = "".join(answer)
    think = "".join(reasoning)
    # some servers leave <think> inside content
    m = re.match(r"\s*<think>(.*?)(</think>|$)", text, flags=re.S)
    if m:
        think += m.group(1)
        text = text[m.end():]
    comp = usage.get("completion_tokens")
    rtok = (usage.get("completion_tokens_details") or {}).get("reasoning_tokens")
    chars = len(think) + len(text)
    # Some servers (TabbyAPI / ExLlamaV3) report far too few completion tokens on long answers.
    # Code and English run at ~3-4.7 characters per token, so more than 6 means the count is wrong.
    approx = not comp or chars / comp > 6
    if approx:
        # one streamed chunk is ~one token; a server that sends several tokens per chunk is
        # covered by the length estimate (~3.5 characters per token)
        comp = max(chunks, round(chars / 3.5))
        rtok = round(comp * len(think) / chars) if chars else 0
    if rtok is None and comp:
        if chunks:  # split by streamed chunks (about one token each)
            rtok = round(comp * think_chunks / chunks)
        else:
            rtok = 0
    decode_s = (end - first) if first else None
    return {
        "text": text, "reasoning": think, "finish": "timeout" if timed_out else finish,
        "secs": end - t0,
        "ttft": (first - t0) if first else None,
        "think_secs": ((first_answer or end) - first) if first and think else 0.0,
        "prompt_tokens": usage.get("prompt_tokens"),
        "tokens": comp, "reasoning_tokens": rtok, "tokens_approx": approx,
        "decode_tps": (comp / decode_s) if comp and decode_s and decode_s > 0 else None,
    }


# ---------------------------------------------------------------- resources
class ResourceMonitor:
    """Samples GPU memory (nvidia-smi), system RAM and disk reads once per second."""

    def __init__(self, interval=1.0):
        import threading
        self.interval = interval
        self.stop_evt = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.peak_vram = self.peak_ram = None
        self.base_vram = self.base_ram = None
        self.disk0 = self.disk1 = None
        self.has_smi = shutil.which("nvidia-smi") is not None
        try:
            import psutil
            self.psutil = psutil
        except ImportError:
            self.psutil = None

    def _vram_mib(self):
        if not self.has_smi:
            return None
        try:
            out = subprocess.run(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
                                 capture_output=True, text=True, timeout=5).stdout
            return sum(int(x) for x in out.split() if x.strip().isdigit())
        except Exception:
            return None

    def _gpu_name(self):
        if not self.has_smi:
            return None
        try:
            out = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                                 capture_output=True, text=True, timeout=5).stdout
            gpus = []
            for line in out.strip().splitlines():
                name, _, mib = line.rpartition(",")
                gpus.append(f"{name.strip().replace('NVIDIA GeForce ', '')} {round(int(mib) / 1024)} GB")
            return " + ".join(gpus) or None
        except Exception:
            return None

    def _ram_gib(self):
        if not self.psutil:
            return None
        return self.psutil.virtual_memory().used / 2 ** 30

    def _disk_read(self):
        if not self.psutil:
            return None
        try:
            return self.psutil.disk_io_counters().read_bytes
        except Exception:
            return None

    def _run(self):
        while not self.stop_evt.is_set():
            v, r = self._vram_mib(), self._ram_gib()
            if v is not None:
                self.peak_vram = max(self.peak_vram or 0, v)
            if r is not None:
                self.peak_ram = max(self.peak_ram or 0, r)
            self.stop_evt.wait(self.interval)

    def start(self):
        self.base_vram, self.base_ram = self._vram_mib(), self._ram_gib()
        self.disk0 = self._disk_read()
        self.thread.start()
        return self

    def stop(self):
        self.stop_evt.set()
        self.thread.join(timeout=10)
        self.disk1 = self._disk_read()
        gb = lambda mib: round(mib / 1024, 1) if mib is not None else None
        return {
            "gpu": self._gpu_name(),
            "vram_peak_gb": gb(self.peak_vram),
            "ram_peak_gb": round(self.peak_ram, 1) if self.peak_ram is not None else None,
            "ram_at_start_gb": round(self.base_ram, 1) if self.base_ram is not None else None,
            "disk_read_gb": round((self.disk1 - self.disk0) / 1e9, 1)
            if self.disk0 is not None and self.disk1 is not None else None,
            "note": None if self.psutil else "pip install psutil for RAM and disk numbers",
        }


def extract_code(text, langs):
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    blocks = re.findall(r"```([\w+-]*)[^\n]*\n(.*?)```", text, flags=re.S)
    good = [b for lang, b in blocks if lang.lower() in langs]
    pool = good or [b for _, b in blocks]
    if pool:
        return max(pool, key=len)
    return text.strip()


# ---------------------------------------------------------------- python tasks
PY_HARNESS = r'''
import json, sys, traceback
sys.path.insert(0, ".")
TESTS = []
try:
    import solution as S
except Exception as e:
    S = None
    IMPORT_ERR = f"{type(e).__name__}: {e}"
else:
    IMPORT_ERR = None
__TESTS__
res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
'''


def run_python_task(task, code, workdir):
    workdir.mkdir(parents=True, exist_ok=True)
    (workdir / "solution.py").write_text(code, encoding="utf-8")
    (workdir / "tests.py").write_text(PY_HARNESS.replace("__TESTS__", task["tests"]), encoding="utf-8")
    try:
        p = subprocess.run([sys.executable, "tests.py"], cwd=workdir, capture_output=True,
                           text=True, timeout=90)
    except subprocess.TimeoutExpired:
        return {"timeout": False}, ["tests timed out (90 s)"]
    m = re.search(r"@@RESULT@@(.*)", p.stdout)
    if not m:
        return {"harness_crashed": False}, [p.stderr[-800:]]
    res = json.loads(m.group(1))
    return {n: ok for n, ok, _ in res}, [f"{n}: {msg}" for n, ok, msg in res if not ok]


# ---------------------------------------------------------------- three tasks
def node_ok():
    return shutil.which("node") is not None and shutil.which("npm") is not None


def setup_ts_env():
    TS_ENV.mkdir(exist_ok=True)
    (TS_ENV / "build.cjs").write_text(BUILD_JS, encoding="utf-8")
    pj = TS_ENV / "package.json"
    if not pj.exists():
        pj.write_text(json.dumps(PACKAGE_JSON, indent=2), encoding="utf-8")
    if not (TS_ENV / "node_modules" / "three").exists():
        print("Installing three / typescript / esbuild (one time)...")
        subprocess.run("npm install --no-audit --no-fund", shell=True, cwd=TS_ENV, check=True)


def tsc(src):
    tsc_js = TS_ENV / "node_modules" / "typescript" / "lib" / "tsc.js"
    p = subprocess.run(
        ["node", str(tsc_js), "--noEmit", "--strict", "--target", "es2022", "--module", "esnext",
         "--moduleResolution", "bundler", "--lib", "es2022,dom", "--skipLibCheck", str(src)],
        cwd=TS_ENV, capture_output=True, text=True, timeout=120)
    errs = [l for l in p.stdout.splitlines() if "error TS" in l]
    return p.returncode == 0, errs


def bundle(src, out_js):
    p = subprocess.run(["node", "build.cjs", str(src), str(out_js)], cwd=TS_ENV,
                       capture_output=True, text=True, timeout=120)
    return p.returncode == 0, p.stderr.strip()


def distinct_colors(png):
    from PIL import Image
    img = Image.open(io.BytesIO(png)).convert("RGB").resize((80, 60))
    return len(img.getcolors(80 * 60) or [])


def img_diff(a, b):
    from PIL import Image, ImageChops
    ia = Image.open(io.BytesIO(a)).convert("RGB")
    ib = Image.open(io.BytesIO(b)).convert("RGB")
    return ImageChops.difference(ia, ib).getbbox() is not None


class Ctx:
    def __init__(self, page):
        self.page = page
        self.s0 = self.s1 = None
        self.img_changed = False

    def eval(self, js, arg=None):
        try:
            return self.page.evaluate(js, arg) if arg is not None else self.page.evaluate(js)
        except Exception:
            return None

    def snapshot(self):
        return self.eval(SNAPSHOT_JS) or []

    def click_xy(self, x, y):
        self.page.mouse.click(x, y)
        self.page.wait_for_timeout(250)

    def click_object(self, uuid):
        xy = self.eval(PROJECT_JS, uuid)
        if xy:
            self.click_xy(*xy)


def run_three_task(task, code, workdir, browser):
    workdir.mkdir(parents=True, exist_ok=True)
    src = TS_ENV / "src" / f"{task['id']}.ts"
    src.parent.mkdir(exist_ok=True)
    src.write_text(code, encoding="utf-8")
    (workdir / "main.ts").write_text(code, encoding="utf-8")
    notes = []

    compiles, errs = tsc(src)
    notes += errs[:10]
    res = {"compiles_strict": compiles}
    out_js = workdir / "bundle.js"
    built, berr = bundle(src, out_js)
    if not built:
        notes.append("esbuild: " + berr[:500])
        for k in ("loads", "no_console_errors", "renders", "resize"):
            res[k] = False
        return res, notes

    html = workdir / "index.html"
    html.write_text('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;'
                    'overflow:hidden}</style></head><body><script src="bundle.js"></script>'
                    '</body></html>', encoding="utf-8")

    page = browser.new_page(viewport={"width": 800, "height": 600})
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console.error: {m.text}")
            if m.type == "error" else None)
    ctx = Ctx(page)
    try:
        page.goto(html.as_uri())
        try:
            page.wait_for_function("window.__ready === true", timeout=15000)
            ready = True
        except Exception:
            ready = False
            notes.append("__ready never became true")
        page.wait_for_timeout(300)
        ctx.s0 = ctx.snapshot()
        shot0 = page.screenshot()
        page.wait_for_timeout(800)
        ctx.s1 = ctx.snapshot()
        shot1 = page.screenshot()
        (workdir / "screenshot.png").write_bytes(shot1)
        ctx.img_changed = img_diff(shot0, shot1)
        ctx.shot = shot1

        res["loads"] = ready and bool(ctx.s0)
        res["renders"] = distinct_colors(shot1) > 4

        specific = {}
        if ctx.s0:
            try:
                specific = task["check"](ctx)
            except Exception as e:
                notes.append(f"check crashed: {type(e).__name__}: {e}")
        res.update(specific or {})

        page.set_viewport_size({"width": 500, "height": 400})
        page.wait_for_timeout(400)
        size = ctx.eval("[window.__renderer?.domElement?.clientWidth, window.__camera?.aspect]")
        res["resize"] = bool(size) and size[0] == 500 and abs((size[1] or 0) - 1.25) < 0.01
        res["no_console_errors"] = ready and not errors
        notes += errors[:5]
    finally:
        page.close()
    return res, notes



# ---------------------------------------------------------------- thinking levels
PROBES = {
    "easy": ("How many times does the digit 7 appear when you write all whole numbers from 1 to 1000? "
             "Reply with just the number.", "300"),
    "hard": ("How many whole numbers from 1 to 10000 (inclusive) have digits that add up to exactly 20? "
             "Reply with just the number.", "633"),
}
# Levels each chat template understands (GLM-5.3: low / high, anything else = max; Qwen card: low / medium / xhigh)
PROBE_LEVELS = {"glm": "off,low,high,max", "qwen": "off,low,medium,xhigh"}


def probe_effort(args):
    """Ask one small question several times at each thinking level and show how much the model thinks."""
    if args.probe_effort == "auto":
        args.probe_effort = PROBE_LEVELS.get(args.preset.split("-")[0], "off,low,medium,high,xhigh")
    levels = [x.strip() for x in args.probe_effort.split(",") if x.strip()]
    if args.preset == "glm":
        odd = [lv for lv in levels if lv not in ("off", "low", "high", "max")]
        if odd:
            print(f"Note: the GLM-5.3 chat template only knows low and high; {', '.join(odd)} "
                  "will run as max.\n")
    reps = max(1, args.probe_repeats)
    PROBE_PROMPT, PROBE_ANSWER = PROBES[args.probe_question]
    base_think, base_effort = args.think, args.reasoning_effort
    args.max_tokens = min(args.max_tokens, 16384)
    print(f"Probe: {PROBE_PROMPT}\n(correct answer {PROBE_ANSWER}; {reps} tries per level, "
          f"max {args.max_tokens} tokens, 10 min per try)\n")
    print(f"{'level':<8} {'try':>3} {'answer':>8} {'ok':>3} {'tokens':>8} {'thinking':>9} {'time s':>7} {'tok/s':>6}")
    means, spans = {}, {}
    for lv in levels:
        args.think, args.reasoning_effort = ("off", "") if lv == "off" else (base_think, lv)
        got, oks = [], []
        for i in range(reps):
            try:
                g = chat(args, "You are a careful assistant.", PROBE_PROMPT, timeout=600)
            except ServerDown as e:
                print(f"{lv:<8} server down: {e}")
                args.think, args.reasoning_effort = base_think, base_effort
                return
            except Exception as e:
                print(f"{lv:<8} {i + 1:>3} request failed: {e}")
                continue
            ans = re.findall(r"\d+", g["text"].replace(",", ""))
            ans = ans[-1] if ans else "-"
            got.append(g["reasoning_tokens"] or 0)
            oks.append(ans == PROBE_ANSWER)
            tok = f"{g['tokens']}{'~' if g['tokens_approx'] else ''}" if g["tokens"] else "?"
            tps = f"{g['decode_tps']:.0f}" if g["decode_tps"] else "n/a"
            print(f"{lv:<8} {i + 1:>3} {ans:>8} {'yes' if ans == PROBE_ANSWER else 'no':>3} {tok:>8} "
                  f"{g['reasoning_tokens'] or 0:>9} {g['secs']:>7.0f} {tps:>6}")
        if got:
            means[lv] = sum(got) / len(got)
            print(f"{lv:<8} avg thinking {means[lv]:.0f} tokens (min {min(got)}, max {max(got)}), "
                  f"correct {sum(oks)}/{len(oks)}")
            spans[lv] = (min(got), max(got))
    args.think, args.reasoning_effort = base_think, base_effort

    print()
    order = [lv for lv in levels if lv != "off" and lv in means]  # the order the user gave
    if len(order) >= 2:
        vals = [means[lv] for lv in order]
        rising = all(vals[i + 1] >= vals[i] * 0.9 for i in range(len(vals) - 1))
        spread = vals[-1] >= 2 * max(vals[0], 1)
        if max(vals) == 0:
            print("Verdict: the model did not think at any level.")
        elif rising and spread:
            print("Verdict: thinking grows with the level (" + " < ".join(order) +
                  "), so reasoning_effort seems to work on this server.")
        elif spans[order[-1]][1] < spans[order[0]][0]:
            print(f"Verdict: the level DOES change behaviour, but the other way round: every {order[-1]} try "
                  f"thought less than every {order[0]} try. The chat template probably turns the level into an "
                  "instruction (e.g. 'validate assumptions') that makes thinking more focused, not longer. "
                  "Compare the 'correct' counts to pick a level.")
        else:
            print("Verdict: NO clear effect. Thinking does not grow steadily from " + order[0] + " to " +
                  order[-1] + ". Two possible reasons: the server or chat template ignores reasoning_effort, "
                  "or the question is too easy to need more thinking at any level.")
            if args.probe_question == "easy":
                print("Next: run again with --probe-question hard, and check that the chat template "
                      "mentions reasoning_effort.")
    if "off" in means:
        if means["off"] > 0:
            print("'off' still thinks: this server ignores enable_thinking=false.")
        else:
            print("'off' works: the model answered without thinking.")
    if reps < 3:
        print(f"Only {reps} tries per level at temperature {args.temperature}: add --probe-repeats 3 "
              "for a surer answer.")


def sweep_effort(levels):
    """Run the full test once per thinking level, each as its own run with its own report."""
    argv = sys.argv[1:]
    out = []
    skip = False
    label = ""
    for i, a in enumerate(argv):  # drop the effort list and the label, keep everything else
        if skip:
            skip = False
            continue
        if a in ("--reasoning-effort", "--label"):
            if a == "--label" and i + 1 < len(argv):
                label = argv[i + 1]
            skip = True
            continue
        if a.startswith("--reasoning-effort=") or a.startswith("--label="):
            if a.startswith("--label="):
                label = a.split("=", 1)[1]
            continue
        out.append(a)
    label = label or "model"
    for lv in levels:
        print(f"\n######## thinking level: {lv} ########\n", flush=True)
        cmd = [sys.executable, str(Path(__file__).resolve())] + out + ["--label", f"{label}-{lv}"]
        cmd += ["--think", "off"] if lv == "off" else ["--reasoning-effort", lv]
        subprocess.run(cmd, cwd=HERE)
    print("\nAll levels done. Run:  python compare.py")


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base-url", default="http://localhost:8080/v1")
    ap.add_argument("--model", default="local")
    ap.add_argument("--label", default="", help="short name for the report, e.g. qwen-flash-iq3xxs")
    ap.add_argument("--api-key", default="sk-local")
    ap.add_argument("--preset", choices=sorted(PRESETS), default="",
                    help="vendor sampling settings; explicit flags below override it")
    ap.add_argument("--temperature", type=float, default=None, help="default 1.0")
    ap.add_argument("--top-p", type=float, default=None)
    ap.add_argument("--top-k", type=int, default=None)
    ap.add_argument("--min-p", type=float, default=None)
    ap.add_argument("--presence-penalty", type=float, default=None)
    ap.add_argument("--repetition-penalty", type=float, default=None)
    ap.add_argument("--max-tokens", type=int, default=98304,
                    help="thinking + answer; thinking models need a lot (default 98304)")
    ap.add_argument("--task-timeout-min", type=float, default=60.0, help="max time for one task (default 60)")
    ap.add_argument("--budget-min", type=float, default=0,
                    help="hard limit for the whole run, 0 = no limit (default)")
    ap.add_argument("--think", choices=["default", "on", "off"], default="default",
                    help="off sends enable_thinking=false (Qwen/GLM chat templates)")
    ap.add_argument("--reasoning-effort", default="",
                    help="e.g. low / medium / high / xhigh; a comma list (off,low,xhigh) runs the test once per level")
    ap.add_argument("--probe-effort", nargs="?", const="auto", default=None,
                    help="quick check: ask one small question at each thinking level and show how much the model "
                         "thinks. Levels are compared in the order you give them, weakest first. "
                         "Default: off,low,high,max for --preset glm, off,low,medium,xhigh for qwen presets, "
                         "otherwise off,low,medium,high,xhigh")
    ap.add_argument("--probe-repeats", type=int, default=3, help="tries per level for --probe-effort (default 3)")
    ap.add_argument("--probe-question", choices=["easy", "hard"], default="easy",
                    help="easy = count the 7s from 1 to 1000; hard = digit sums (needs real thinking)")
    ap.add_argument("--suite", choices=["base", "hard"], default="base",
                    help="base = 10 original tasks, hard = 6 harder tasks")
    ap.add_argument("--only", choices=["python", "three"], default=None)
    ap.add_argument("--tasks", default="", help="comma list of task ids, e.g. t5_raycast_click,p1_parse_duration")
    ap.add_argument("--headed", action="store_true", help="show the browser window")
    args = ap.parse_args()
    for k, v in PRESETS.get(args.preset, {}).items():
        if getattr(args, k) is None:
            setattr(args, k, v)
    if args.temperature is None:
        args.temperature = 1.0
    if args.probe_effort is not None:
        return probe_effort(args)
    levels = [x.strip() for x in args.reasoning_effort.split(",") if x.strip()]
    if len(levels) > 1:
        return sweep_effort(levels)
    if levels == ["off"]:
        args.think, args.reasoning_effort = "off", ""

    start = time.perf_counter()
    deadline = start + args.budget_min * 60 if args.budget_min > 0 else float("inf")
    name = args.label or Path(args.model).stem
    if args.suite == "hard" and not name.endswith("-HARD"):
        name += "-HARD"
    safe = re.sub(r"[^\w.-]+", "_", name)[:80]
    results_dir = "results_hard" if args.suite == "hard" else "results"
    run_dir = HERE / results_dir / f"{dt.datetime.now():%Y%m%d-%H%M%S}_{safe}"
    run_dir.mkdir(parents=True)

    # interleave Python and Three.js so a stop does not wipe out one whole part
    S_ = TH if args.suite == "hard" else T
    py = [("python", t) for t in S_.PY_TASKS] if args.only != "three" else []
    th = [("three", t) for t in S_.THREE_TASKS] if args.only != "python" else []
    jobs = []
    for i in range(max(len(py), len(th))):
        jobs += th[i:i + 1] + py[i:i + 1]
    if args.tasks:
        want = {x.strip() for x in args.tasks.split(",") if x.strip()}
        jobs = [(k, t) for k, t in jobs if t["id"] in want]

    pw = browser = None
    if any(kind == "three" for kind, _ in jobs):
        if not node_ok():
            sys.exit("Node.js + npm not found. Install Node 20+ or use --only python.")
        setup_ts_env()
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        browser = pw.chromium.launch(
            headless=not args.headed,
            args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])

    mon = ResourceMonitor().start()
    results = []
    server_down = False
    try:
        for kind, task in jobs:
            base = {"id": task["id"], "kind": kind, "score": 0.0, "checks": {}, "notes": [],
                    "status": "ok"}
            left = deadline - time.perf_counter()
            if server_down:
                print(f"[skip] {task['id']}: server is down")
                results.append({**base, "status": "server_down", "notes": ["skipped: server down"]})
                continue
            if left < 20:
                print(f"[skip] {task['id']}: time budget used up")
                results.append({**base, "status": "budget", "notes": ["skipped: time budget"]})
                continue
            print(f"[gen ] {task['id']} ...", flush=True)
            system = T.PY_SYSTEM if kind == "python" else T.THREE_SYSTEM
            try:
                g = chat(args, system, task["prompt"], timeout=min(args.task_timeout_min * 60, left))
            except ServerDown as e:
                server_down = True
                print("       server refused the connection: stopping (restart the server and rerun)")
                results.append({**base, "status": "server_down", "notes": [f"server down: {e}"]})
                continue
            except Exception as e:
                msg = str(e)
                if any(k in msg for k in ("10054", "Connection reset", "RemoteDisconnected", "closed connection")):
                    status = "server_crash"
                    print(f"       server dropped the connection (crash?): {e}")
                else:
                    status = "error"
                    print(f"       request failed: {e}")
                results.append({**base, "status": status, "notes": [f"request failed: {e}"]})
                continue

            wd = run_dir / task["id"]
            wd.mkdir()
            (wd / "raw_response.md").write_text(g["text"], encoding="utf-8")
            if g["reasoning"]:
                (wd / "reasoning.md").write_text(g["reasoning"], encoding="utf-8")
            notes = []
            if g["finish"] == "length":
                notes.append(f"hit max_tokens ({args.max_tokens}) "
                             f"{'while still thinking, no answer' if not g['text'].strip() else 'answer may be cut'}")
            if g["finish"] == "timeout":
                notes.append(f"stopped after {args.task_timeout_min:g} min task timeout")
            if kind == "python":
                code = extract_code(g["text"], {"python", "py"})
                checks, n2 = run_python_task(task, code, wd)
            else:
                code = extract_code(g["text"], {"ts", "typescript", "tsx"})
                if code.strip():
                    checks, n2 = run_three_task(task, code, wd, browser)
                else:  # an empty file compiles, so do not give it credit
                    checks = {k: False for k in ("compiles_strict", "loads", "renders", "resize",
                                                 "no_console_errors")}
                    n2 = ["no code in the answer"]
            score = sum(checks.values()) / max(1, len(checks))
            status = {"length": "max_tokens", "timeout": "task_timeout"}.get(g["finish"], "ok")
            if status == "ok" and not g["text"].strip():
                status = "no_answer"  # stream ended while the model was still thinking
                notes.append("model stopped inside its thinking and never wrote an answer")
            tail = (g["reasoning"] or g["text"])[-400:]
            if tail and re.search(r"(.)\1{150,}|(.{2,40})\2{8,}", tail, flags=re.S):
                notes.append("generation got stuck repeating the same text (loop)")
            results.append({
                **base, "score": score, "checks": checks, "notes": notes + n2, "status": status,
                "finish": g["finish"], "gen_seconds": round(g["secs"], 1),
                "ttft_s": round(g["ttft"], 1) if g["ttft"] is not None else None,
                "think_seconds": round(g["think_secs"], 1),
                "prompt_tokens": g["prompt_tokens"], "tokens": g["tokens"],
                "reasoning_tokens": g["reasoning_tokens"],
                "answer_tokens": (g["tokens"] - (g["reasoning_tokens"] or 0)) if g["tokens"] else None,
                "tokens_approx": g["tokens_approx"],
                "tok_per_s": round(g["decode_tps"], 1) if g["decode_tps"] else None,
            })
            tok = f"{g['tokens']}{'~' if g['tokens_approx'] else ''} tok" if g["tokens"] else "? tok"
            think = f" (think {g['reasoning_tokens']})" if g["reasoning_tokens"] else ""
            spd = f", {g['decode_tps']:.0f} tok/s" if g["decode_tps"] else ""
            flag = f"  [{status}]" if status != "ok" else ""
            print(f"       {score * 100:5.1f}%  ({sum(checks.values())}/{len(checks)})  "
                  f"{g['secs']:.0f}s, {tok}{think}{spd}{flag}")
    finally:
        res = mon.stop()
        if browser:
            browser.close()
        if pw:
            pw.stop()

    total = time.perf_counter() - start
    write_report(run_dir, name, args, results, total, res)


def summarize(results):
    def avg(rs):
        return 100 * sum(r["score"] for r in rs) / len(rs) if rs else None

    out = {}
    for kind in ("python", "three"):
        rs = [r for r in results if r["kind"] == kind]
        out[kind] = avg(rs)
    parts = [x for x in (out["python"], out["three"]) if x is not None]
    out["overall"] = sum(parts) / len(parts) if parts else 0.0
    done = [r for r in results if r["status"] in ("ok", "max_tokens", "task_timeout")]
    out["answered_score"] = avg([r for r in done if r["status"] == "ok"])
    out["tasks_total"] = len(results)
    out["tasks_answered"] = sum(r["status"] == "ok" for r in results)
    out["hit_max_tokens"] = sum(r["status"] == "max_tokens" for r in results)
    out["timeouts"] = sum(r["status"] == "task_timeout" for r in results)
    out["not_run"] = sum(r["status"] in ("budget", "server_down", "server_crash", "error") for r in results)
    toks = [r.get("tokens") or 0 for r in results]
    out["tokens_total"] = sum(toks)
    out["reasoning_tokens_total"] = sum(r.get("reasoning_tokens") or 0 for r in results)
    tps = [r["tok_per_s"] for r in results if r.get("tok_per_s")]
    out["tok_per_s"] = round(sum(tps) / len(tps), 1) if tps else None
    ttft = [r["ttft_s"] for r in results if r.get("ttft_s") is not None]
    out["ttft_avg_s"] = round(sum(ttft) / len(ttft), 1) if ttft else None
    gen = [r["gen_seconds"] for r in results if r.get("gen_seconds")]
    out["gen_minutes"] = round(sum(gen) / 60, 1)
    return out


def write_report(run_dir, name, args, results, total, res):
    S = summarize(results)
    f = lambda x, suf="": f"{x}{suf}" if x is not None else "n/a"
    pct = lambda x: f"{x:.1f}%" if x is not None else "n/a"
    lines = [f"# {name}", "",
             f"- Date: {dt.datetime.now():%Y-%m-%d %H:%M}",
             f"- Model: {args.model}",
             f"- Endpoint: {args.base_url} (preset {args.preset or 'none'}, temperature {args.temperature}, "
             + "".join(f"{k} {getattr(args, k)}, " for k in SAMPLING_KEYS if getattr(args, k) is not None)
             + f"max_tokens {args.max_tokens}, think {args.think}"
             + (f", effort {args.reasoning_effort}" if args.reasoning_effort else "") + ")",
             f"- Total time: {total / 60:.1f} min (generation {S['gen_minutes']} min)",
             f"- Tokens: {S['tokens_total']} total, {S['reasoning_tokens_total']} of them thinking",
             f"- Speed: {f(S['tok_per_s'], ' tok/s')} decode, first token after {f(S['ttft_avg_s'], ' s')} on average",
             f"- Peak VRAM: {f(res['vram_peak_gb'], ' GB')} | Peak RAM: {f(res['ram_peak_gb'], ' GB')} "
             f"(at start {f(res['ram_at_start_gb'], ' GB')}) | Disk read: {f(res['disk_read_gb'], ' GB')}",
             f"- Tasks: {S['tasks_answered']}/{S['tasks_total']} answered, {S['hit_max_tokens']} hit max_tokens, "
             f"{S['timeouts']} timed out, {S['not_run']} not run",
             "", "| Part | Score |", "|---|---|"]
    if res.get("note"):
        lines.insert(9, f"- Note: {res['note']}")
    if S["python"] is not None:
        lines.append(f"| Python | {pct(S['python'])} |")
    if S["three"] is not None:
        lines.append(f"| TypeScript + Three.js | {pct(S['three'])} |")
    lines += [f"| **Overall** | **{pct(S['overall'])}** |",
              f"| Only tasks it finished | {pct(S['answered_score'])} |", ""]
    lines += ["| Task | Score | Status | Time s | Tokens | Thinking | tok/s |", "|---|---|---|---|---|---|---|"]
    for r in results:
        lines.append(f"| {r['id']} | {r['score'] * 100:.0f}% | {r['status']} | {f(r.get('gen_seconds'))} | "
                     f"{f(r.get('tokens'))}{'~' if r.get('tokens_approx') else ''} | "
                     f"{f(r.get('reasoning_tokens'))} | {f(r.get('tok_per_s'))} |")
    lines.append("")
    for r in results:
        lines.append(f"## {r['id']} — {r['score'] * 100:.0f}%")
        for k, v in r["checks"].items():
            lines.append(f"- {'PASS' if v else 'FAIL'} {k}")
        for n in r["notes"]:
            lines.append(f"  - note: {n}")
        lines.append("")
    (run_dir / "report.md").write_text("\n".join(lines), encoding="utf-8")
    (run_dir / "summary.json").write_text(json.dumps(
        {"name": name, "model": args.model, "python": S["python"], "three": S["three"],
         "overall": S["overall"], "summary": S, "resources": res,
         "settings": {"preset": args.preset, "max_tokens": args.max_tokens, "temperature": args.temperature,
                      **{k: getattr(args, k) for k in SAMPLING_KEYS},
                      "think": args.think, "reasoning_effort": args.reasoning_effort,
                      "task_timeout_min": args.task_timeout_min, "budget_min": args.budget_min,
                      "suite": args.suite},
         "minutes": round(total / 60, 1), "results": results}, indent=2), encoding="utf-8")

    print("\n" + "=" * 60)
    if S["python"] is not None:
        print(f"Python:                {pct(S['python']):>7}")
    if S["three"] is not None:
        print(f"TypeScript + Three.js: {pct(S['three']):>7}")
    print(f"Overall:               {pct(S['overall']):>7}   ({total / 60:.1f} min)")
    print(f"Finished tasks only:   {pct(S['answered_score']):>7}   "
          f"({S['tasks_answered']}/{S['tasks_total']} answered, {S['hit_max_tokens']} hit max_tokens)")
    print(f"Tokens: {S['tokens_total']} ({S['reasoning_tokens_total']} thinking), "
          f"{f(S['tok_per_s'], ' tok/s')}, VRAM peak {f(res['vram_peak_gb'], ' GB')}, "
          f"RAM peak {f(res['ram_peak_gb'], ' GB')}")
    print(f"Report: {run_dir / 'report.md'}")


if __name__ == "__main__":
    main()
