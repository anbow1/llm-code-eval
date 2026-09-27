

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)

    async def run_one(index, func):
        async with semaphore:
            return await func()

    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    task_to_index = {t: i for i, t in enumerate(tasks)}

    remaining = set(tasks)
    first_exc = None

    while remaining:
        done, remaining = await asyncio.wait(remaining, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            idx = task_to_index[t]
            try:
                results[idx] = t.result()
            except Exception as e:
                if first_exc is None:
                    first_exc = e
        if first_exc is not None:
            for t in remaining:
                t.cancel()
            if remaining:
                await asyncio.wait(remaining)
            raise first_exc

    return results
```