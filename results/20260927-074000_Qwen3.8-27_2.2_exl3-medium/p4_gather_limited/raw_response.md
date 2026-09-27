

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_error: Exception | None = None

    async def run(idx: int) -> None:
        nonlocal first_error
        async with semaphore:
            if first_error is not None:
                return
            try:
                results[idx] = await funcs[idx]()
            except Exception as e:
                if first_error is None:
                    first_error = e
                raise

    tasks = [asyncio.create_task(run(i)) for i in range(len(funcs))]

    for task in tasks:
        try:
            await task
        except Exception as e:
            for t in tasks:
                if not t.done():
                    t.cancel()
            for t in tasks:
                if not t.done():
                    try:
                        await t
                    except (asyncio.CancelledError, Exception):
                        pass
            raise

    return results
```