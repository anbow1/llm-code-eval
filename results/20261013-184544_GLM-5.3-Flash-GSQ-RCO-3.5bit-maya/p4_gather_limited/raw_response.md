```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    """Run zero-argument callables returning awaitables with a concurrency cap.

    Results are returned in the same order as ``funcs``. If any call raises,
    all still-running calls are cancelled, no new calls are started, and the
    first exception is re-raised.
    """
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    errors: list = []  # exceptions appended in temporal order
    stop = asyncio.Event()
    sem = asyncio.Semaphore(limit)

    async def run(index: int, fn):
        async with sem:
            # An earlier failure may have occurred while this task was
            # waiting for a free slot; do not start new work after that.
            if stop.is_set():
                return
            try:
                results[index] = await fn()
            except Exception as exc:
                errors.append(exc)
                raise

    tasks = [asyncio.ensure_future(run(i, fn)) for i, fn in enumerate(funcs)]

    try:
        await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
    finally:
        # Stop scheduling new work and cancel anything still in flight.
        stop.set()
        for task in tasks:
            if not task.done():
                task.cancel()
        # Wait for cancellations to finish so no task is left dangling;
        # retrieve their exceptions to avoid "never retrieved" warnings.
        await asyncio.gather(*tasks, return_exceptions=True)

    if errors:
        raise errors[0]
    return results
```