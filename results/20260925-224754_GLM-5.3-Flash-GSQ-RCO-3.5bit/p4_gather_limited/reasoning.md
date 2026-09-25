Implement gather with semaphore-like slot control, ordered results, cancellation on first exception.

Approach: create tasks for all funcs? No — "do not start any new ones" — must not create tasks eagerly. Use a scheduler loop.

Implementation:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    results = [None] * len(funcs)
    pending: set[asyncio.Task] = set()
    next_index = 0
    first_exc = None
    try:
        while True:
            # fill slots
            while next_index < len(funcs) and len(pending) < limit:
                idx = next_index
                task = asyncio.ensure_future(funcs[idx]())
                task._gather_idx = idx  # attribute may fail? Task allows attribute setting? Tasks support arbitrary attributes yes.
                pending.add(task)
                next_index += 1
            if not pending:
                break
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for t in done:
                idx = t._gather_idx
                results[idx] = t.result()  # raises if exception
    except BaseException as exc:
        # cancel remaining
        for t in pending:
            t.cancel()
        if pending:
            await asyncio.wait(pending)
        raise
    return results
```

Issue: exception propagation — when a done task raised, t.result() raises; but if multiple tasks completed, first exception should be "that first exception" — the first one raised. Ambiguous; using done set order is fine but we should cancel all running and not start new ones. The loop above: exception from t.result() propagates, caught by except BaseException, cancels pending. But note next tasks already started in this iteration stay; fine.

But subtle: if exception occurs in one task, other completed tasks' exceptions lost — acceptable; "re-raise that first exception" — the first exception to occur. If multiple tasks raised concurrently, hard to determine. Fine.

Also attribute setting on Task: Tasks allow setting arbitrary attributes (they have __dict__)? Yes, asyncio.Task instances support attribute assignment. Safer: use dict mapping task->index.

Also need to handle case where funcs[i]() itself raises synchronously (not awaitable). ensure_future would... calling funcs[idx]() raises before ensure_future. That exception should propagate too — caught by except, cancels running. Good.

Also should we await cancelled tasks to let them finish cancellation — asyncio.wait on them. But cancelled tasks: awaiting asyncio.wait with cancelled tasks is fine. Suppress exceptions from cancellation? asyncio.wait doesn't raise; tasks hold exceptions unretrieved — could warn. Retrieve results after wait to avoid "exception was never retrieved" warnings? CancelledError retrieved? We can iterate and call t.exception() or result with suppress. Let's do:

```python
for t in pending: t.cancel()
if pending:
    await asyncio.wait(pending)
    for t in pending:
        t.cancelled() or t.exception()
```

t.exception() raises CancelledError if cancelled... guard with cancelled() check. Actually if task was cancelled, exception() raises CancelledError. Check `if not t.cancelled(): t.exception()`.

Also the except clause catches CancelledError of gather_limited itself — fine, cancels children and re-raises.

Edge: results ordering via index map. Use dict task_to_idx.

Write final code.