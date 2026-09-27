import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    sem = asyncio.Semaphore(limit)

    async def _run(i: int, func):
        async with sem:
            results[i] = await func()

    tasks = [asyncio.create_task(_run(i, f)) for i, f in enumerate(funcs)]

    try:
        await asyncio.gather(*tasks)
    except BaseException:
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise

    return results
