```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results = [None] * len(funcs)

    async def _wrapped(i, func):
        async with sem:
            results[i] = await func()

    async with asyncio.TaskGroup() as tg:
        for i, f in enumerate(funcs):
            tg.create_task(_wrapped(i, f))

    return results
```

**How it works:**

- **Concurrency limit:** An `asyncio.Semaphore(limit)` gates access — at most `limit` coroutines execute `func()` simultaneously. As soon as one releases the semaphore, the next waiting task acquires it immediately (no fixed batching).

- **Order preservation:** Results are stored by index into a pre-allocated list, so the return value matches the input order regardless of completion order.

- **Failure handling:** `asyncio.TaskGroup` (Python 3.11+) automatically cancels all sibling tasks when one raises, then re-raises that exception. Tasks blocked on `sem.acquire()` receive `CancelledError` and never invoke `func()` — satisfying "do not start any new ones." Tasks mid-execution are cancelled at their `await` point.

- **Edge cases:** `ValueError` for `limit < 1`; empty input short-circuits to `[]`.