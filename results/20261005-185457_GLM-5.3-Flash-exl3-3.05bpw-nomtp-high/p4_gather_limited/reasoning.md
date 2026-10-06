Implement worker-based semaphore pattern with tasks, gather with return_exceptions, cancel on first exception, raise first exception in time order... "re-raise that first exception" — the first one that occurred.

Approach: index-based dispatcher with slots. Classic implementation:

```python
async def gather_limited(funcs, limit):
    if limit < 1: raise ValueError
    n = len(funcs)
    if n == 0: return []
    results = [None]*n
    sem = asyncio.Semaphore(limit)
    tasks = [asyncio.create_task(worker(i, f)) for ...]
```

But starting all tasks immediately means the callable isn't called until semaphore acquired — that's fine since calling the callable creates the awaitable; with semaphore acquired inside worker before calling func, concurrency is bounded at the call level.

Exception handling: wrap the func call in try; on exception, cancel all other tasks and re-raise. Use asyncio.gather with return_exceptions to collect, then find first exception by original index.

Simpler:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    tasks = []
    sem = asyncio.Semaphore(limit)

    async def run(i, fn):
        async with sem:
            return await fn()

    tasks = [asyncio.create_task(run(i, fn)) for i, fn in enumerate(funcs)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for r in results:
        if isinstance(r, BaseException):
            raise r
    return results
```

With semaphore, when an exception occurs the gather cancels? No — gather with return_exceptions=True does NOT cancel other tasks; it waits for all to complete. But requirement says cancel all still-running calls and not start new ones. So we must handle manually.

Better approach without gather: use a done-callback that on failure cancels everything.

Implementation:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be at least 1")
    n = len(funcs)
    if n == 0:
        return []
    sem = asyncio.Semaphore(limit)

    async def run(fn):
        async with sem:
            return await fn()

    tasks = [asyncio.create_task(run(fn)) for fn in funcs]

    first_exc = None
    def on_done(task):
        nonlocal first_exc
        if first_exc is not None:
            return
        if task.cancelled():
            return
        exc = task.exception()
        if exc is not None:
            first_exc = exc
            for t in tasks:
                if t is not task and not t.done():
                    t.cancel()
    for t in tasks:
        t.add_done_callback(on_done)
    try:
        return await asyncio.gather(*tasks)
    except BaseException:
        # if first_exc, tasks already cancelled; wait for cleanup
        if first_exc is not None:
            raise first_exc
        raise
```

Wait: when tasks are cancelled, gather would raise CancelledError. We need to await tasks to finish cleanup. After gather raising, tasks are cancelled and we should await them (shielded, suppress). But we're inside the same coroutine; awaiting cancelled tasks after catching is fine (they're already done or finishing).

Edge: cancellation of tasks awaiting semaphore won't start new ones — good.

But subtle: when we catch CancelledError from gather (due to cancelled tasks), we should suppress it but wait for all tasks to finish so their cancellations propagate. Let me restructure:

```python
    try:
        results = await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        if first_exc is not None:
            # ensure cancellations complete
            await asyncio.gather(*tasks, return_exceptions=True)
            raise first_exc
        raise
```

But gather with return_exceptions=True returns CancelledError instances for cancelled tasks — fine. However if the outer task itself is cancelled (genuine cancellation), first_exc is None, re-raise — but we should also cancel tasks? If outer cancelled, children tasks... gather cancels children when itself is cancelled? Actually if the task running gather is cancelled, gather raises CancelledError and the child tasks are cancelled by gather? In modern asyncio, when gather is cancelled it cancels all children. Actually asyncio.gather: cancelling gather cancels... hmm, "If gather() is cancelled, all submitted awaitables (that have not completed yet) are also cancelled." Yes. But here tasks are Task objects created separately; gather cancelled does cancel children. OK.

But there's another issue: the except clause awaiting gather(*tasks, return_exceptions=True) — those tasks may be cancelled; gathering cancelled tasks with return_exceptions returns CancelledError objects but also... if a task is cancelled during this await? They're already being cancelled; awaiting them should complete. Fine.

Also, if an exception occurs but the task with exception... first_exc set, we cancel others. gather then raises CancelledError (since a child was cancelled). Then we re-raise first_exc.

Alternative simpler approach without callback: poll each task... I'll go with callback approach but also handle non-cancelled error path generally: gather raises first child exception directly. Actually gather without return_exceptions raises the first exception that occurs (propagates). Then we still need to cancel others. So:

```python
    try:
        return await asyncio.gather(*tasks)
    except BaseException as exc:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        if first_exc is not None:
            raise first_exc from exc.__cause__
        raise
```

Hmm, but gather raising an exception gives us the exception already; we don't even need callbacks. Without callbacks:

```python
    try:
        return await asyncio.gather(*tasks)
    except BaseException:
        for t in tasks:
            if not t.done():
                t.cancel()
        # swallow cancellation results while waiting for cleanup
        with contextlib... no, just:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        # find first exception by order? Not time order.
        raise
```

But the semantics: "re-raise that first exception" — gather re-raises the first exception encountered (the first that finishes with exception, which corresponds to earliest). Actually asyncio.gather's behavior: it raises the exception of the first awaitable that failed... the outer future gets the exception of whichever child fails first in time. Yes, gather returns/raises based on completion order for errors — the first exception in time. Good enough.

But issue: while gathering with return_exceptions=True for cleanup, could an exception from a not-yet-cancelled task occur? Doesn't matter, we ignore results, just wait for all to finish.

However, there's a subtlety: awaiting cancelled tasks via gather(return_exceptions=True) works fine.

One more subtlety: if the outer coroutine (the one running gather_limited) is genuinely cancelled, except BaseException catches CancelledError, cancels tasks, waits for cleanup, then re-raises CancelledError via `raise`. Good — preserves cancellation.

But careful: during "await asyncio.gather(*tasks, return_exceptions=True)" inside exception handler, if another CancelledError arrives it would propagate — acceptable.

Also need to ensure tasks not started: tasks created with create_task all scheduled, but run acquires semaphore before calling fn. Cancelled tasks that never acquired semaphore never call fn. However, a cancelled task that is at `async with sem` exit... fine.

Edge case: what if cancel happens before task even started running (it's scheduled but semaphore has free slots)? Task cancelled before first step → never calls fn. Good.

Also need to check BaseException catch: catching BaseException catches CancelledError (which is BaseException in 3.8+). Good.

The `raise` bare inside except re-raises the current exception — but we did awaits inside the except block, which... bare `raise` re-raises the original exception correctly even after awaits (the exception context is the caught one, sys.exc_info preserved? Actually bare raise re-raises the exception currently being handled, which persists across awaits within the handler). Yes.

But wait — with gather(*tasks, return_exceptions=True), if some task raised CancelledError due to our cancel, that's captured in results. If a task raises during the cleanup await — result. Fine.

One concern: `first_exc` approach vs plain raise. Plain raise of the caught exception: is it "the first exception"? If multiple tasks fail nearly simultaneously, asyncio.gather propagates the first one whose exception arrives — effectively first in time. Good.

Final code with docstrings minimal. Also handle funcs being a general iterable? Spec says list; but I'll convert to list. Zero-argument callables returning awaitables.

Also protect: awaiting inside except uses a nested try in case cleanup gather itself is interrupted? Keep simple.

Also need: tasks cancelled in the exception path but if the exception came from a task whose cancellation... fine.

Let me also consider: results order — gather preserves order. Good.

Also ValueError raised for limit<1 before running — even if funcs empty? Spec: raise ValueError if limit<1; empty list returns []. Check limit first, then empty.

Actually should empty list return [] regardless of limit? "Raise ValueError if limit < 1. An empty list returns []" — I'll check limit first.

Also don't create semaphore unnecessarily for empty list.

Write final code:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    funcs = list(funcs)
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)

    async def _run(fn):
        async with sem:
            return await fn()

    tasks = [asyncio.ensure_future(_run(fn)) for fn in funcs]

    try:
        return await asyncio.gather(*tasks)
    except BaseException:
        for t in tasks:
            t.cancel()
        # Wait for cancellations to settle, ignoring all outcomes.
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
```

One issue: `await asyncio.gather(*tasks, return_exceptions=True)` — if awaiting cancelled task... gather handles CancelledError as result with return_exceptions=True? Yes, it treats cancellations as results. Actually there was a subtlety: gather(return_exceptions=True) with cancelled children — CancelledError instances appear in results. Yes, supported.

But another subtle problem: if the current task gets cancelled during that cleanup await (spurious), it would propagate — but then the cleanup wouldn't be complete. Fine.

Another subtle issue: a task cancelled while awaiting `fn()` — cancellation propagates properly since we cancel via task.cancel(). Good.

Also consider: exception occurs in task but gather's outer raises; other tasks may also have completed successfully — results lost, we raise. Correct per spec.

Should I use asyncio.Task instead of ensure_future — create_task is fine (3.11+).

Edge: what if one of `funcs` itself raises synchronously when called (e.g., calling fn() raises before awaitable)? That exception is raised inside _run coroutine, becoming task exception. Handled. But careful — if fn() raises, the semaphore is released? Inside `async with sem: return await fn()` — if fn() raises synchronously, sem.__aexit__ runs since body raises inside the with. Yes.

Done.