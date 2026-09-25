import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    queue: asyncio.Queue = asyncio.Queue()
    for i, f in enumerate(funcs):
        queue.put_nowait((i, f))

    first_exception: BaseException | None = None
    workers: list[asyncio.Task] = []

    async def worker() -> None:
        nonlocal first_exception
        while True:
            try:
                index, func = queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            try:
                result = await func()
                results[index] = result
            except Exception as exc:
                if first_exception is None:
                    first_exception = exc
                    for w in workers:
                        if w is not asyncio.current_task():
                            w.cancel()
                return

    workers = [
        asyncio.create_task(worker())
        for _ in range(min(limit, len(funcs)))
    ]

    await asyncio.gather(*workers, return_exceptions=True)

    if first_exception is not None:
        raise first_exception

    return results
