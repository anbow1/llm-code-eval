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
        results = await asyncio.gather(*tasks)
    except BaseException:
        # gather already cancels remaining tasks, but ensure no stragglers
        for t in tasks:
            if not t.done():
                t.cancel()
        # Let all cancelled tasks finish their cleanup
        await asyncio.gather(*tasks, return_exceptions=True)
        raise

    return list(results)
