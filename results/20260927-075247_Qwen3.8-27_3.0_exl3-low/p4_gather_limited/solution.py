import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results = [None] * len(funcs)
    first_exception = None

    async def wrapper(i: int, func):
        nonlocal first_exception
        async with sem:
            if first_exception is not None:
                return
            try:
                results[i] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                raise

    tasks = [asyncio.create_task(wrapper(i, f)) for i, f in enumerate(funcs)]

    try:
        await asyncio.gather(*tasks)
    except Exception:
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise first_exception

    return results
