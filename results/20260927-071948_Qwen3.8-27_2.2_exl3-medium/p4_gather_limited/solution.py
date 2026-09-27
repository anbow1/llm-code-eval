import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    first_error: Exception | None = None
    next_idx = 0
    cancelled = False
    worker_tasks: list[asyncio.Task] = []

    async def worker() -> None:
        nonlocal first_error, cancelled, next_idx
        while True:
            if cancelled:
                return
            if next_idx >= len(funcs):
                return
            idx = next_idx
            next_idx += 1
            try:
                results[idx] = await funcs[idx]()
            except asyncio.CancelledError:
                return
            except Exception as e:
                if first_error is None:
                    first_error = e
                cancelled = True
                for t in worker_tasks:
                    if t is not asyncio.current_task() and not t.done():
                        t.cancel()
                return

    num_workers = min(limit, len(funcs))
    for _ in range(num_workers):
        worker_tasks.append(asyncio.create_task(worker()))

    await asyncio.gather(*worker_tasks)

    if first_error is not None:
        raise first_error

    return results
