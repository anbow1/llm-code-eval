import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")

    n = len(funcs)
    if n == 0:
        return []

    results: list = [None] * n
    next_idx = 0
    running: dict[asyncio.Task, int] = {}

    # Start the initial batch (up to `limit` tasks)
    for _ in range(min(limit, n)):
        task = asyncio.create_task(funcs[next_idx]())
        running[task] = next_idx
        next_idx += 1

    first_exception: BaseException | None = None

    while running:
        done, _ = await asyncio.wait(
            list(running.keys()), return_when=asyncio.FIRST_COMPLETED
        )

        for task in done:
            idx = running.pop(task)
            try:
                results[idx] = task.result()
            except Exception as e:
                if first_exception is None:
                    first_exception = e

        if first_exception is not None:
            # Cancel all still-running tasks and wait for them to finish
            for t in list(running.keys()):
                t.cancel()
            if running:
                await asyncio.wait(list(running.keys()))
            break

        # Fill freed slots immediately (not in fixed batches)
        while next_idx < n and len(running) < limit:
            task = asyncio.create_task(funcs[next_idx]())
            running[task] = next_idx
            next_idx += 1

    if first_exception is not None:
        raise first_exception

    return results
