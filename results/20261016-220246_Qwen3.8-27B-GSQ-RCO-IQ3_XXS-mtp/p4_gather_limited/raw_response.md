```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results = [None] * n
    sem = asyncio.Semaphore(limit)

    async def run_one(i):
        async with sem:
            results[i] = await funcs[i]()

    tasks = [asyncio.create_task(run_one(i)) for i in range(n)]
    try:
        await asyncio.gather(*tasks)
    except BaseException:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    return results
```