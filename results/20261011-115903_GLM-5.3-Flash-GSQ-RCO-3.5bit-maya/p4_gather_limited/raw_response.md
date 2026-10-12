```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    next_index = 0
    # Holds the first exception, if any. Workers check it before starting
    # a new call so no new work is started after a failure.
    state: dict = {"failure": None}

    async def worker() -> None:
        nonlocal next_index
        while state["failure"] is None:
            if next_index >= n:
                return
            i = next_index
            next_index += 1  # no await between check and increment: safe
            results[i] = await funcs[i]()

    workers = [asyncio.create_task(worker()) for _ in range(min(limit, n))]
    try:
        done, pending = await asyncio.wait(
            workers, return_when=asyncio.FIRST_EXCEPTION
        )
        failed_task = next(
            (
                t
                for t in done
                if not t.cancelled() and t.exception() is not None
            ),
            None,
        )
        if failed_task is not None:
            state["failure"] = failed_task.exception()
            # Cancel every still-running call; none of them will start new work.
            for t in workers:
                if not t.done():
                    t.cancel()
            if pending:
                await asyncio.gather(*pending, return_exceptions=True)
            raise state["failure"]
    except BaseException:
        # Covers both the re-raise above and external cancellation/errors
        # while waiting: make sure no worker is left running.
        for t in workers:
            if not t.done():
                t.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        raise

    return results
```