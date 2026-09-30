import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)

    async def _run(func):
        async with sem:
            return await func()

    tasks = [asyncio.create_task(_run(f)) for f in funcs]

    try:
        return list(await asyncio.gather(*tasks))
    except BaseException:
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
