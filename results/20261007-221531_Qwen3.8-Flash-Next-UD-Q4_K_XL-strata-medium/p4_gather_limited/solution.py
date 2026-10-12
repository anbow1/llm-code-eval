import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    errored = False

    async def _run(index, func):
        nonlocal errored
        async with semaphore:
            # Prevent starting new work once an error has been recorded.
            if errored:
                return
            try:
                results[index] = await func()
            except BaseException:
                errored = True
                raise

    tasks = [asyncio.create_task(_run(i, f)) for i, f in enumerate(funcs)]

    try:
        await asyncio.gather(*tasks)
    except BaseException:
        # Signal all pending tasks to not start new work.
        errored = True
        # Cancel every task that hasn't finished yet.
        for t in tasks:
            if not t.done():
                t.cancel()
        # Wait for all cancellations to propagate (swallow CancelledError / etc.)
        await asyncio.gather(*tasks, return_exceptions=True)
        raise

    return results
