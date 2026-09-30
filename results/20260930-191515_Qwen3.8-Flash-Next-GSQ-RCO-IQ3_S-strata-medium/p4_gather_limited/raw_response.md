```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results = [None] * len(funcs)

    async def run(i: int) -> None:
        async with sem:
            results[i] = await funcs[i]()

    tasks = [asyncio.create_task(run(i)) for i in range(len(funcs))]
    try:
        await asyncio.gather(*tasks)
    except BaseException:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    return results
```