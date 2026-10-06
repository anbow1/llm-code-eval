import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    first_exc: BaseException | None = None
    next_index = 0
    running: dict[int, asyncio.Task] = {}

    async def _runner(index: int):
        coro = funcs[index]()
        results[index] = await coro

    while True:
        # Fill free slots
        while next_index < n and len(running) < limit and first_exc is None:
            idx = next_index
            next_index += 1
            running[idx] = asyncio.create_task(_runner(idx))
        if not running:
            break

        done, _ = await asyncio.wait(
            running.values(),
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in done:
            idx = next(i for i, t in running.items() if t is task)
            del running[idx]
            exc = task.exception()
            if exc is not None:
                if first_exc is None:
                    first_exc = exc
                else:
                    return
            else:
                results[idx] = task.result()
                break
        else:
            for task in done:
                pass

    if first_exc is None:
        return results
    raise first_exc
