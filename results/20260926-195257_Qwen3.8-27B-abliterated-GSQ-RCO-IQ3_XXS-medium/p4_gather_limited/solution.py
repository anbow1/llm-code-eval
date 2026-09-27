import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    semaphore = asyncio.Semaphore(limit)

    async def run(i: int) -> None:
        async with semaphore:
            results[i] = await funcs[i]()

    tasks = [asyncio.ensure_future(run(i)) for i in range(n)]

    try:
        await asyncio.gather(*tasks)
        return results
    except BaseException:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
