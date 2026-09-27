

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    sem = asyncio.Semaphore(limit)

    async def wrapped(i):
        async with sem:
            return (i, await funcs[i]())

    tasks = [asyncio.ensure_future(wrapped(i)) for i in range(len(funcs))]

    pending = set(tasks)
    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            if t.cancelled():
                continue
            try:
                idx, value = t.result()
                results[idx] = value
            except Exception as e:
                for t in pending:
                    t.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
                raise e
    return results
```