import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    semaphore = asyncio.Semaphore(limit)
    first_error: BaseException | None = None
    failed = False
    all_tasks: list[asyncio.Task] = []

    async def worker(i: int, func) -> None:
        nonlocal first_error, failed
        await semaphore.acquire()
        try:
            if failed:
                return
            try:
                results[i] = await func()
            except Exception as e:
                if first_error is None:
                    first_error = e
                    failed = True
                    current = asyncio.current_task()
                    for t in all_tasks:
                        if t is not current and not t.done():
                            t.cancel()
        finally:
            semaphore.release()

    for i, f in enumerate(funcs):
        all_tasks.append(asyncio.create_task(worker(i, f)))

    await asyncio.gather(*all_tasks, return_exceptions=True)

    if first_error is not None:
        raise first_error

    return results
