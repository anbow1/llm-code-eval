

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    stop_event = asyncio.Event()

    async def run_one(i: int, func) -> None:
        async with semaphore:
            if stop_event.is_set():
                return
            try:
                results[i] = await func()
            except Exception:
                if not stop_event.is_set():
                    stop_event.set()
                raise

    tasks = [asyncio.create_task(run_one(i, f)) for i, f in enumerate(funcs)]

    pending: set[asyncio.Task] = set(tasks)

    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_EXCEPTION)
        if done:
            for t in done:
                exc = t.exception()
                if exc is not None:
                    for t in pending:
                        t.cancel()
                    await asyncio.gather(*pending, return_exceptions=True)
                    raise exc

    return results
```