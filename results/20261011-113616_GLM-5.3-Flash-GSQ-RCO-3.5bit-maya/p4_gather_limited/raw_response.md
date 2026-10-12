```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")

    n = len(funcs)
    if n == 0:
        return []

    results: list = [None] * n
    first_exc = None
    next_index = 0
    running: set = set()

    async def _run(i: int) -> None:
        nonlocal first_exc
        try:
            results[i] = await funcs[i]()
        except asyncio.CancelledError:
            raise
        except BaseException as exc:
            if first_exc is None:
                first_exc = exc

    async def _cancel_running() -> None:
        tasks = list(running)
        running.clear()
        for t in tasks:
            t.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    try:
        while next_index < n or running:
            if first_exc is not None:
                break
            while len(running) < limit and next_index < n:
                t = asyncio.create_task(_run(next_index))
                running.add(t)
                next_index += 1
            if not running:
                break
            done, _pending = await asyncio.wait(
                running, return_when=asyncio.FIRST_COMPLETED
            )
            running.difference_update(done)
            for t in done:
                if not t.cancelled():
                    t.exception()  # retrieve to suppress warnings
            if first_exc is not None:
                break
    except asyncio.CancelledError:
        await _cancel_running()
        raise

    if first_exc is not None:
        await _cancel_running()
        raise first_exc

    return results
```