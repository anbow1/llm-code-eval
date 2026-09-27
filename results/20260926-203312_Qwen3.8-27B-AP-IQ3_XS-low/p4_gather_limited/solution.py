import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results = [None] * len(funcs)

    async def runner(index: int, func):
        async with sem:
            results[index] = await func()

    tasks = [asyncio.create_task(runner(i, f)) for i, f in enumerate(funcs)]
    await asyncio.gather(*tasks)
    return results
