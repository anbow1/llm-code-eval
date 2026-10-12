```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    first_exc = None
    sem = asyncio.Semaphore(limit)
    tasks: list = []

    async def run(index: int, func):
        nonlocal first_exc
        async with sem:
            if first_exc is not None:
                return
            try:
                results[index] = await func()
            except Exception as exc:
                if first_exc is None:
                    first_exc = exc
                    current = asyncio.current_task()
                    for t in tasks:
                        if t is not current:
                            t.cancel()
                raise

    tasks = [asyncio.ensure_future(run(i, f)) for i, f in enumerate(funcs)]
    await asyncio.gather(*tasks, return_exceptions=True)

    if first_exc is not None:
        raise first_exc
    return results
```