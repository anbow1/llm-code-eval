Classic semaphore-based approach won't handle "cancel all still-running" cleanly — need worker tasks. Approach: create N worker coroutines pulling from an index counter, each storing results in results[i]. On exception, signal cancellation.

Better approach: create tasks for all funcs upfront? No — that starts all immediately. Instead use workers.

Implementation:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError(...)
    n = len(funcs)
    results = [None] * n
    next_index = itertools.count()
    stop = False
    first_exc = None

    async def worker():
        nonlocal ...
        while True:
            try:
                idx = next(counter)
            except StopIteration:
                return
            ...
```

Use a shared iterator over indices; workers grab indices with a lock-free approach — single-threaded asyncio so `next` on an iterator is safe (no await between check and use). Careful: after awaiting, must re-check stop flag.

On exception: set first_exc if None, set flag, and cancel other workers. But canceling workers only cancels workers, not the awaited coroutines inside them... actually canceling the worker task cancels the coroutine it's awaiting inside it. Good. Then re-raise first exception after gathering workers.

Race: exception happens in task A while task B also in flight — B gets canceled; if B also raised, first exception recorded should be "that first exception" — the first one that raised. Ambiguous ordering; use whichever records first (temporal order of exception occurrence). Fine.

Need to distinguish a worker finishing normally vs canceled. Use asyncio.gather(*workers, return_exceptions=True), then if first_exc, raise it.

Edge: worker cancellation — when we cancel workers, awaiting `gather` will wait for them. Workers awaiting user coroutines get CancelledError, which propagates; we catch CancelledError? If worker is canceled, CancelledError should propagate out of worker (don't swallow). But careful: if the user's coroutine raises CancelledError for its own reasons... ignore that nuance.

Code:

```python
import asyncio
import itertools

async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    n = len(funcs)
    results = [None] * n
    indices = iter(range(n))
    state = {"failed": False, "exc": None}

    async def worker():
        while True:
            if state["failed"]:
                return
            try:
                i = next(indices)
            except StopIteration:
                return
            try:
                results[i] = await funcs[i]()
            except asyncio.CancelledError:
                raise
            except BaseException as e:
                if not state["failed"]:
                    state["failed"] = True
                    state["exc"] = e
                raise  # propagate? Or return?
    ...
```

If a worker raises, asyncio.gather with return_exceptions=True collects it; we then check state. Workers raise but other workers continue? We need to cancel them. So after detecting failure, cancel remaining worker tasks. But which workers are still running? We hold a list of worker tasks created upfront (min(limit, n) tasks). When exception occurs in one, we need to cancel the others — but the failing worker itself may be the current one. We could just cancel all worker tasks including self — canceling self raises CancelledError in self, which would propagate; but we're in except handler... Simpler: create tasks, then in worker, on exception, iterate tasks and cancel others (task.cancel()), then return instead of raising (we stored exception in state). But the failing task's exception: gather(return_exceptions=True) won't see it if we return normally. We check state["exc"] afterward anyway.

But CancelledError in workers: when we cancel a worker that's awaiting user coroutine, CancelledError propagates into worker. Catch it: if state["failed"], treat as expected cancellation — return normally (or just let it propagate? gather(return_exceptions=True) handles it). But we shouldn't swallow cancellation when gather_limited itself is canceled (e.g., outer cancellation). Then state["failed"] is False and CancelledError should propagate. So:

```python
    except asyncio.CancelledError:
        if state["failed"]:
            return  # canceled as part of cleanup
        raise
```

Hmm, but if worker canceled due to failure cleanup, returning normally is fine since state["exc"] holds the exception.

But wait: what if the user coroutine itself raises CancelledError without being canceled? Then state["failed"] False, we re-raise — treated as cancellation of the worker, which propagates to gather and then out of gather_limited. Edge case, acceptable.

Alternative cleaner: catch CancelledError, mark as failed too? No — first exception should be re-raised; CancelledError is BaseException. Keep simple.

Also canceling tasks: in worker's except BaseException branch, cancel all other tasks. But we don't know which task is self — can use asyncio.current_task(). Iterate tasks, skip current, cancel each.

Actually we don't even need to cancel in worker — could cancel after gather returns? No: gather waits for all workers; a worker stuck in a long await would block. Must cancel promptly. Do cancellation in the except handler.

But another subtlety: worker cancels others; a canceled worker might be in the middle of `await funcs[i]()` — cancellation propagates; its result not recorded — fine.

Also: after canceling, the failing worker returns; other workers finish quickly with CancelledError → caught → state["failed"] True → return. gather completes.

Then: if state["failed"], raise state["exc"].

Also outer cancellation of gather_limited: tasks created with asyncio.ensure_future; if the awaiting gather is canceled, tasks keep running. Should we cancel workers in finally? Use try/finally around await gather: on CancelledError, cancel all workers, re-raise. Let's add:

```python
    tasks = [asyncio.ensure_future(worker()) for _ in range(min(limit, n))]
    try:
        await asyncio.gather(*tasks, return_exceptions=True)
    except asyncio.CancelledError:
        for t in tasks:
            t.cancel()
        # wait for them? best-effort: await asyncio.gather(*tasks, return_exceptions=True)
        raise
    if state["failed"]:
        raise state["exc"]
    return results
```

Hmm, but if outer cancellation happens, canceling tasks and awaiting them inside except CancelledError... awaiting inside cancellation handler may immediately get canceled again? Once we catch CancelledError, subsequent awaits can still work unless cancel requested again. Usually fine. Simpler: just cancel and re-raise without awaiting.

Race in worker: check state["failed"] then next(indices) — no await between, safe.

One more: exception in `funcs[i]()` call itself (sync raise before await) — caught by same except.

Write final code with itertools.count or range iterator.

Also worker raising: if worker raises its exception (propagating), gather(return_exceptions=True) collects; we ignore since state holds it. But should worker return or raise? If it raises, gather still fine. But it also needs to cancel others — do cancellation inside handler. Let's finalize.

Edge: exception recorded — "re-raise that first exception" — the first exception that occurs temporally. Setting only if not already failed gives temporal order. Good.

Final code:

```python
import asyncio

async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    n = len(funcs)
    results = [None] * n
    indices = iter(range(n))
    failed = False
    first_exc = None

    async def worker():
        nonlocal failed, first_exc
        while True:
            if failed:
                return
            try:
                i = next(indices)
            except StopIteration:
                return
            try:
                results[i] = await funcs[i]()
            except asyncio.CancelledError:
                if failed:
                    return
                raise
            except BaseException as exc:
                if not failed:
                    failed = True
                    first_exc = exc
                for t in tasks:
                    if t is not asyncio.current_task():
                        t.cancel()
                return

    tasks = [asyncio.ensure_future(worker()) for _ in range(min(limit, n))]
    try:
        await asyncio.gather(*tasks, return_exceptions=True)
    except asyncio.CancelledError:
        for t in tasks:
            t.cancel()
        raise

    if failed:
        raise first_exc
    return results
```

Wait: worker references `tasks` which is defined after worker's definition — fine due to closure at call time, but tasks are created via ensure_future(worker()) — the first worker may start immediately? ensure_future schedules; doesn't run until await. So tasks list is fully built before any worker runs. But ensure_future inside list comprehension: coroutine created, scheduled; execution deferred. Fine.

One issue: worker cancels tasks including potentially... skip current task. Good. But `current_task()` inside worker — correct.

Another subtlety: worker returns after canceling others; others get CancelledError, check failed=True, return normally. gather completes.

What about a worker between grabbing index and awaiting — canceled at await point, results[i] stays None. Fine.

Also: what if funcs[i]() returns awaitable that is a coroutine — never awaited if canceled? Cancellation at await point means coroutine was awaited already. OK.

Done.