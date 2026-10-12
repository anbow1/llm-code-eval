Standard semaphore approach with exception handling: on exception, cancel tasks and re-raise first exception. Use tasks created via loop of workers pulling from queue, or create all tasks with semaphore but need to not start new ones after failure — semaphore-acquired tasks that haven't started will still start unless we set a flag. Better: worker pool pulling from an iterator.

Approach: create N workers, each pulls index from a shared iterator/queue, runs func, stores result in results[i]. On exception: set a flag (event), cancel running tasks, propagate first exception.

Implementation:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    n = len(funcs)
    if n == 0:
        return []
    results = [None] * n
    queue = asyncio.Queue()
    for i in range(n):
        queue.put_nowait(i)
    failure: list = []  # holds first exception
    stop = asyncio.Event()

    async def worker():
        while not failure and not stop.is_set():
            try:
                i = queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            try:
                results[i] = await funcs[i]()
            except BaseException as exc:
                if not failure:
                    failure.append(exc)
                stop.set()
                return
            finally:
                queue.task_done()

    workers = [asyncio.create_task(worker()) for _ in range(min(limit, n))]
    try:
        await asyncio.gather(*workers)
    except BaseException:
        raise
    if failure:
        raise failure[0]
    return results
```

Wait: need to cancel still-running calls on failure. Workers that are awaiting a coroutine — when one fails, others are still awaiting their funcs. We need to cancel those tasks. After gather returns (workers exit), running tasks... Actually each worker IS running a task. If worker A raises, we set stop and return, but other workers are still awaiting their coroutines — gather(*workers) will wait for them to finish naturally, not cancel. So we need to cancel them.

Better: use a done callback / exception handling: on failure, cancel remaining worker tasks. But workers created inside — we can gather with return_exceptions and cancel.

Alternative approach: create one task per func, use a semaphore for concurrency, but guard with a "cancelled" flag checked before starting. On first exception, cancel all tasks (those that haven't started yet will be cancelled; those awaiting semaphore... cancelling a task waiting on semaphore raises CancelledError inside, fine).

But "do not start any new ones" — a task waiting on semaphore acquire that gets cancelled: CancelledError raised at acquire point; the func hasn't been called. Good. But there's a subtle race: task acquires semaphore, then before calling func, cancellation arrives? CancelledError would be raised at the await point — but between acquire and calling func there's no await, so if cancel happens during acquire, exception raised there; func not called. Actually the call happens right after acquire succeeds; if cancellation delivered after acquire completes but before func call — cancellation is delivered at next await point, which is inside the func... Hmm, the await on the coroutine. If cancellation happens between semaphore release and calling func()... Python delivers cancellation at await points. There's no await between acquire() returning and func() being invoked? Actually `await sem.acquire()` — when it completes, control returns. Then `results[i] = await func()`. If cancel was requested during that window, cancellation is delivered at the next await — inside func's coroutine. That means func was started. Minor race but acceptable? To be safe, use the worker-pool approach and cancel worker tasks explicitly.

Worker pool with cancellation:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError(...)
    if not funcs:
        return []
    results = [None]*len(funcs)
    next_index = 0
    failure = []
    lock = asyncio.Lock()  # or use queue

    async def worker():
        nonlocal next_index
        while True:
            async with lock:
                if failure or next_index >= len(funcs):
                    return
                i = next_index
                next_index += 1
            try:
                results[i] = await funcs[i]()
            except BaseException as exc:
                if not failure:
                    failure.append(exc)
                return
```

Main:

```python
    workers = [asyncio.create_task(worker()) for _ in range(min(limit, len(funcs)))]
    done, pending = await asyncio.wait(workers, return_when=asyncio.FIRST_EXCEPTION)
    if failure:
        for w in workers:
            if not w.done():
                w.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        raise failure[0]
```

But asyncio.wait with FIRST_EXCEPTION: workers themselves catch exceptions and store in failure, so workers don't raise. FIRST_EXCEPTION won't trigger. Hmm.

Alternative: workers don't catch; they let exceptions propagate. Then asyncio.wait(FIRST_EXCEPTION) returns when a worker raises. But we need first exception and results ordering. If worker raises, gather of workers via wait captures exception in the task. Then:

```python
    try:
        done, pending = await asyncio.wait(workers, return_when=asyncio.FIRST_EXCEPTION)
    finally:
        ...
```

After wait returns, check pending: if any pending and some done task has exception → cancel pending, await gather pending return_exceptions, then raise exception. But FIRST_EXCEPTION waits until first exception OR all complete. If all complete without exception, done = all. If exception occurred, done contains the failed task (and maybe others finished concurrently); pending are still running.

Edge: multiple workers could raise nearly simultaneously; FIRST_EXCEPTION returns after first. We pick the exception from any done task with exception — "re-raise that first exception". Fine.

But there's a subtlety: exception in worker means func raised. But also, cancelling workers when we cancel — CancelledError in pending workers, we swallow via return_exceptions=True.

Also, a worker that raises should record index? Results order maintained since each worker writes results[i].

Also need: worker raising — the exception propagates out of worker task; asyncio.wait returns with that task done with exception. We retrieve via task.exception().

Race: two workers fail simultaneously; FIRST_EXCEPTION returns once first completes with exception; the other may still be running — we cancel it. The "first" exception — ambiguous but fine; pick the one that triggered return. Actually if both done at wait return, we should pick... order of completion. Just pick exception from the first done task that has one? Hard to know truly first. Acceptable: iterate done set, find one with exception. But to ensure determinism-ish, prefer the one whose exception triggered? Can't tell. Fine.

Also cancellation of pending workers: when cancelled while awaiting funcs[i], CancelledError propagates into the coroutine — asyncio cancels the inner coroutine properly. Good. But the func's coroutine is awaited directly (await funcs[i]()); cancelling the worker task cancels the awaited coroutine. Good.

Also need to ensure that after cancelling pending, we await them to finish (gather return_exceptions=True) so cancellation completes cleanly. Also handle case where worker raised but there could be an await during cancel.

Another subtlety: asyncio.wait deprecation? Passing coroutines deprecated but tasks fine. FIRST_EXCEPTION still valid.

What about a worker finishing normally while another raised? done set contains both; we check done tasks for exceptions; pending workers get cancelled. But what if pending workers completed their func but exception happened... they'd be in done. Fine.

Edge: exception raised but all workers done (exception was the last one) — pending empty, just raise.

Also: what if funcs[i]() returns non-awaitable? Not our concern.

Also worker loop: after finishing a task, continue to next index. Use simple counter with no lock needed? Multiple workers incrementing shared counter — asyncio is single-threaded; no await between read and increment, so no lock needed actually. Between `if failure or next_index >= n` check and `next_index += 1` there is no await, so safe without lock. Good.

Code:

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    next_index = 0
    state = {"failure": None}

    async def worker():
        nonlocal next_index
        while state["failure"] is None:
            if next_index >= n:
                return
            i = next_index
            next_index += 1
            results[i] = await funcs[i]()

    workers = [asyncio.create_task(worker()) for _ in range(min(limit, n))]
    try:
        done, pending = await asyncio.wait(workers, return_when=asyncio.FIRST_EXCEPTION)
        failed_task = next((t for t in done if not t.cancelled() and t.exception() is not None), None)
        if failed_task is not None:
            state["failure"] = failed_task.exception()
            for t in workers:
                if not t.done():
                    t.cancel()
            if pending:
                await asyncio.gather(*pending, return_exceptions=True)
            raise state["failure"]
    except BaseException:
        # ensure no worker left running if wait itself raised (e.g., outer cancellation)
        for t in workers:
            if not t.done():
                t.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        raise
    return results
```

Hmm, the except block re-cancels and awaits workers — including done ones (gather on done tasks is fine). But careful: after we already awaited pending in the try, the except for a raised exception (our own raise) would re-cancel all and gather — that's fine, they're done or cancelled-complete. Actually when we `raise state["failure"]`, except catches it, cancels remaining (already done), gathers all with return_exceptions — done tasks return immediately; pending were already awaited so done. Fine. Slight redundancy but correct. Also, if outer cancellation hits asyncio.wait (CancelledError), except cancels workers, awaits them (swallowing their CancelledErrors via return_exceptions), then re-raises CancelledError. Good.

Wait — one issue: `t.exception()` on a task raises CancelledError if task cancelled; I check `not t.cancelled()` first. Good.

Another issue: worker's `while state["failure"] is None` — workers check flag at loop start, so after a failure, other workers that finish their current coroutine won't start new ones. But we also cancel them anyway; cancellation while awaiting the coroutine is the primary mechanism. The flag prevents starting between completion and cancellation delivery... actually cancellation is delivered at next await; after `results[i] = await ...` completes, loop continues to check `state["failure"]` — if set, return without starting new. Good, handles the race where cancellation hasn't been delivered yet.

But: when failure occurs, done/pending: worker raising is done. Others pending get cancelled. But could a worker be in the "check flag" state (not awaiting) when cancelled? Cancellation of a task that's not blocked — CancelledError delivered at next await or via cancel() it throws into current await... if task is running (scheduled), cancel() schedules CancelledError to be thrown. Task will handle. With our flag check it may return before. Either way fine.

Also `results[i] = await funcs[i]()` — if funcs[i]() raises synchronously when called (before returning awaitable)? Then exception in worker, caught as failure. Good.

One more: exception() returns the exception; if worker raised CancelledError itself (e.g., cancelled by outer)... handled.

Also `asyncio.wait` requires non-empty set — workers non-empty since n>=1. Good.

Final code.