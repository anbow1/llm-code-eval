import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results = [None] * len(funcs)

    async def _wrapped(i, func):
        async with sem:
            results[i] = await func()

    async with asyncio.TaskGroup() as tg:
        for i, f in enumerate(funcs):
            tg.create_task(_wrapped(i, f))

    return results
