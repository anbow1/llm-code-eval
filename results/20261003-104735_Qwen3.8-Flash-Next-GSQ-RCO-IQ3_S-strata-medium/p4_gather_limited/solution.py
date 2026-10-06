import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n

    async def _run(idx: int) -> None:
        results[idx] = await funcs[idx]()

    running: set[asyncio.Task] = set()
    next_idx = 0
    first_exc: BaseException | None = None

    # Seed the first window of tasks
    initial = min(limit, n)
    for i in range(initial):
        running.add(asyncio.ensure_future(_run(i)))
    next_idx = initial

    while running:
        done, running = await asyncio.wait(running, return_when=asyncio.FIRST_COMPLETED)

        # Detect the first exception among completed tasks
        if first_exc is None:
            for task in done:
                if task.cancelled():
                    continue
                exc = task.exception()
                if exc is not None:
                    first_exc = exc
                    break

        # Propagate failure: cancel remaining, don't start new ones
        if first_exc is not None:
            for t in running:
                t.cancel()
            if running:
                await asyncio.wait(running)
            raise first_exc

        # Fill freed slots with the next queued callables
        for _ in done:
            if next_idx < n:
                running.add(asyncio.ensure_future(_run(next_idx)))
                next_idx += 1

    return results
