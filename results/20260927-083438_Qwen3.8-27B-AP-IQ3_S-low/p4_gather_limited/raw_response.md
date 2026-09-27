```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    n = len(funcs)
    if n == 0:
        return []

    results: list = [None] * n
    semaphore = asyncio.Semaphore(limit)

    async def run_one(index: int) -> None:
        async with semaphore:
            results[index] = await funcs[index]()

    tasks = [asyncio.ensure_future(run_one(i)) for i in range(n)]

    try:
        await asyncio.gather(*tasks)
    except BaseException as e:
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise e

    return results
```