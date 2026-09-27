

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)

    async def run_one(index: int, func):
        async with semaphore:
            results[index] = await func()

    tasks = [asyncio.create_task(run_one(i, f)) for i, f in enumerate(funcs)]

    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)

    if pending:
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)

    for i, task in enumerate(tasks):
        if task in done:
            exc = task.exception()
            if exc is not None:
                raise exc

    return results
```