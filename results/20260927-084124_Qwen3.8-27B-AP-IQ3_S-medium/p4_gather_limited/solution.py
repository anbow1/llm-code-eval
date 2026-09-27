import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    semaphore = asyncio.Semaphore(limit)
    first_exc: Exception | None = None
    tasks: list[asyncio.Task] = []

    async def _run(i: int, func) -> None:
        nonlocal first_exc
        async with semaphore:
            if first_exc is not None:
                return
            try:
                results[i] = await func()
            except Exception as e:
                if first_exc is None:
                    first_exc = e
                    for t in tasks:
                        if t is not asyncio.current_task() and not t.done():
                            t.cancel()

    for i, func in enumerate(funcs):
        tasks.append(asyncio.create_task(_run(i, func)))

    await asyncio.gather(*tasks, return_exceptions=True)

    if first_exc is not None:
        raise first_exc
    return results
