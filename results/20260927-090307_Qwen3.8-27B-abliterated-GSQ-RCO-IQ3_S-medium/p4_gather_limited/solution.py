import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    semaphore = asyncio.Semaphore(limit)

    async def run_one(i: int) -> None:
        async with semaphore:
            results[i] = await funcs[i]()

    tasks = [asyncio.create_task(run_one(i)) for i in range(n)]

    try:
        remaining = set(tasks)
        while remaining:
            done, remaining = await asyncio.wait(
                remaining, return_when=asyncio.FIRST_EXCEPTION
            )
            for t in done:
                exc = t.exception()
                if exc is not None:
                    # Cancel all tasks that have not yet completed
                    for t2 in remaining:
                        t2.cancel()
                    if remaining:
                        await asyncio.wait(remaining)
                    raise exc
    finally:
        # Safety net: ensure no task is left running
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    return list(results)
