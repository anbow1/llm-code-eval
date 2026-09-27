

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)

    async def run_task(index):
        async with semaphore:
            results[index] = await funcs[index]()

    tasks = [asyncio.create_task(run_task(i)) for i in range(len(funcs))]

    pending = set(tasks)
    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            if task.cancelled():
                continue
            exc = task.exception()
            if exc is not None:
                for t in pending:
                    t.cancel()
                if pending:
                    await asyncio.gather(*pending, return_exceptions=True)
                raise exc

    return results
```