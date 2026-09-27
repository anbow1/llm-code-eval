```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results = [None] * len(funcs)

    async def run_one(i: int, func) -> None:
        async with sem:
            results[i] = await func()

    tasks = [asyncio.create_task(run_one(i, f)) for i, f in enumerate(funcs)]

    try:
        await asyncio.gather(*tasks)
    except Exception:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise

    return results
```