```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    """Run callables returning awaitables with bounded concurrency.

    Results are returned in the same order as `funcs`. At most `limit`
    coroutines run at once; a new one starts as soon as a slot frees up.
    On the first failure, all still-running calls are cancelled, no new
    calls are started, and the first exception is re-raised.
    """
    if limit < 1:
        raise ValueError("limit must be at least 1")

    funcs = list(funcs)
    if not funcs:
        return []

    semaphore = asyncio.Semaphore(limit)

    async def _run(fn):
        # The callable is only invoked once a slot is acquired, so a call
        # that is queued behind the semaphore has not started yet.
        async with semaphore:
            return await fn()

    tasks = [asyncio.create_task(_run(fn)) for fn in funcs]

    try:
        # gather preserves the input order and raises the first exception
        # that occurs (in time) among the tasks.
        return list(await asyncio.gather(*tasks))
    except BaseException:
        # Cancel every task that is still running (or still queued behind
        # the semaphore, which prevents it from ever starting).
        for task in tasks:
            task.cancel()
        # Wait until all cancellations have settled so nothing is left
        # running when we propagate the exception; outcomes are discarded.
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
```