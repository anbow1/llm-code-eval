Implement semaphore-based gather with error propagation. Careful: with semaphore, when a task fails we must cancel others. Use done callback or wrap each coroutine to catch exception and cancel others. Also "first exception" ordering — use the exception recorded first (time of raise).

Simple approach: create tasks; each worker acquires semaphore, calls func, stores result by index. On exception, record exception if none recorded, cancel all tasks, re-raise at end via awaiting tasks (which will raise CancelledError for cancelled ones). Better: main loop with asyncio.as_completed or just await tasks sequentially? Await each task in order... but tasks might be cancelled due to another failure; awaiting a cancelled task raises CancelledError. We need to re-raise the first exception.

Approach:

```python
async def gather_limited(funcs, limit):
    if limit < 1: raise ValueError
    n = len(funcs)
    results = [None]*n
    first_exc = None
    sem = asyncio.Semaphore(limit)
    tasks = []

    async def run(i, f):
        nonlocal first_exc
        async with sem:
            if first_exc is not None:
                return
            try:
                results[i] = await f()
            except Exception as exc:
                if first_exc is None:
                    first_exc = exc
                    for t in tasks:
                        if t is not asyncio.current_task():
                            t.cancel()
                raise

    tasks = [asyncio.ensure_future(run(i,f)) for i,f in enumerate(funcs)]
    # await, ignoring exceptions
    await asyncio.gather(*tasks, return_exceptions=True)
    if first_exc is not None:
        raise first_exc
    return results
```

Wait: tasks list used inside run before assignment — closure captures variable, but tasks assigned after list comprehension; run only executes later so fine. But cancel in except: cancelling tasks that haven't started yet — cancelled before running raises CancelledError when awaited later; gather with return_exceptions handles. Also cancelling tasks already awaiting semaphore — fine. But cancelled tasks holding semaphore release? Semaphore context manager releases on cancel exit — fine.

Edge: if first task fails, cancel others; tasks cancelled while inside semaphore release it, then... cancelled tasks won't run further. Tasks not yet started that get cancel before first run: run coroutine raises CancelledError at start; fine. But could a cancelled-before-start task still acquire sem? No — cancel raises CancelledError at first await point; if cancelled before starting, when scheduled, it just raises CancelledError without running body? Actually task.cancel() before first step: the coroutine is never started. Good — "do not start any new ones".

Also exception check `if first_exc is not None: return` — after cancel, tasks that already passed sem acquire... they can't acquire because cancelled. But a task waiting on sem whose cancel happens... cancel raises CancelledError. OK. The check inside is redundant but safe for tasks that acquired sem just before failure. Hmm, a task could acquire sem right before failure, then run. The check prevents starting new await? Actually its body awaits f() — we want not to start new calls. The check handles tasks that acquired sem but haven't reached `await f()` yet? They passed sem, then check first_exc — if failure already happened, skip. Good.

BaseException? Only Exception per spec.

await asyncio.gather(..., return_exceptions=True) — this suppresses. Also should we handle CancelledError of the outer? Fine.