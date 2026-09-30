import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results = [None] * len(funcs)

    async def run(index: int, func) -> None:
        async with sem:
            results[index] = await func()

    tasks = [asyncio.create_task(run(i, func)) for i, func in enumerate(funcs)]

    try:
        await asyncio.gather(*tasks)
    except BaseException as exc:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise exc

    return results
