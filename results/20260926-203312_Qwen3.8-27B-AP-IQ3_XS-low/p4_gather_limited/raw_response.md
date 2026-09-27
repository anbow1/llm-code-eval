```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results = [None] * len(funcs)

    async def runner(index: int, func):
        async with sem:
            results[index] = await func()

    tasks = [asyncio.create_task(runner(i, f)) for i, f in enumerate(funcs)]
    await asyncio.gather(*tasks)
    return results
```

**How it works:**

- **Concurrency limiting:** An `asyncio.Semaphore(limit)` gates how many coroutines can be inside the actual `await func()` at the same time. Each `runner` acquires the semaphore before invoking the callable and releases it after (via `async with`), so the next waiting runner starts immediately when a slot frees up — no fixed batches.

- **Order preservation:** Results are written into `results[index]` by position, so the returned list always matches the input order regardless of completion order.

- **First-error propagation:** `asyncio.gather(*tasks)` with its default `return_exceptions=False` behaviour cancels all remaining tasks as soon as any one raises, then re-raises that first exception. The `async with sem` ensures the semaphore is released even for tasks that are cancelled mid-flight, so no slots leak.

- **Edge cases:** `limit < 1` raises `ValueError`; an empty list short-circuits to `[]`.