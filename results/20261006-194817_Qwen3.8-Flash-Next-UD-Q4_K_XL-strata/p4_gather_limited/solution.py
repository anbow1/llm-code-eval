import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    error: list = []
    tasks: list[asyncio.Task] = []

    async def worker(i: int, func) -> None:
        async with semaphore:
            if error:
                return
            try:
                results[i] = await func()
            except asyncio.CancelledError:
                raise
            except BaseException as e:
                if not error:
                    error.append(e)
                for t in tasks:
                    if t is not asyncio.current_task() and not t.done():
                        t.cancel()

    for i, func in enumerate(funcs):
        tasks.append(asyncio.create_task(worker(i, func)))

    try:
        await asyncio.wait(tasks)
    except BaseException:
        for t in tasks:
            if not t.done():
                t.cancel()
        raise

    if error:
        raise error[0]

    return results
