
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

import asyncio, time
def run(coro):
    return asyncio.run(asyncio.wait_for(coro, 10))
def t():
    async def main():
        async def job(i):
            await asyncio.sleep(0.01 * ((i * 7) % 5))
            return i * i
        return await S.gather_limited([lambda i=i: job(i) for i in range(12)], 3)
    assert run(main()) == [i * i for i in range(12)]
TESTS.append(("results in order", t))
def t():
    state = {"now": 0, "peak": 0}
    async def main():
        async def job():
            state["now"] += 1
            state["peak"] = max(state["peak"], state["now"])
            await asyncio.sleep(0.02)
            state["now"] -= 1
        await S.gather_limited([job for _ in range(20)], 4)
    run(main())
    assert state["peak"] == 4, f"peak concurrency {state['peak']}, want 4"
TESTS.append(("respects limit", t))
def t():
    async def main():
        async def job(d):
            await asyncio.sleep(d)
        funcs = [lambda: job(0.30)] + [lambda: job(0.05) for _ in range(6)]
        t0 = time.perf_counter()
        await S.gather_limited(funcs, 2)
        return time.perf_counter() - t0
    dt = run(main())
    assert dt < 0.40, f"took {dt:.2f}s: looks like fixed batches"
TESTS.append(("sliding window, not batches", t))
def t():
    state = {"started": 0, "cancelled": 0, "finished": 0}
    class Boom(Exception):
        pass
    async def main():
        async def bad():
            state["started"] += 1
            await asyncio.sleep(0.01)
            raise Boom("x")
        async def slow():
            state["started"] += 1
            try:
                await asyncio.sleep(0.3)
                state["finished"] += 1
            except asyncio.CancelledError:
                state["cancelled"] += 1
                raise
        try:
            await S.gather_limited([bad] + [slow for _ in range(9)], 2)
        except Boom:
            await asyncio.sleep(0.4)
            return "raised"
        return "no exception"
    assert run(main()) == "raised"
    assert state["started"] <= 3, f"started {state['started']} after failure"
    assert state["finished"] == 0 and state["cancelled"] >= 1, state
TESTS.append(("error: cancel + stop", t))
def t():
    async def main():
        assert await S.gather_limited([], 3) == []
        async def one():
            return 1
        assert await S.gather_limited([one, one], 10) == [1, 1]
        try:
            await S.gather_limited([one], 0)
        except ValueError:
            return True
        return False
    assert run(main()), "limit=0 should raise ValueError"
TESTS.append(("edge cases", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
