import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    n = len(funcs)
    if n == 0:
        return []

    results = [None] * n
    next_idx = 0
    lock = asyncio.Lock()
    first_exc: Exception | None = None
    failed = False

    async def worker():
        nonlocal next_idx, failed, first_exc
        while True:
            if failed:
                return
            async with lock:
                if failed:
                    return
                if next_idx >= n:
                    return
                idx = next_idx
                next_idx += 1
            try:
                results[idx] = await funcs[idx]()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                failed = True
                if first_exc is None:
                    first_exc = e
                raise

    num_workers = min(limit, n)
    workers = [asyncio.create_task(worker()) for _ in range(num_workers)]

    try:
        await asyncio.gather(*workers)
    except Exception:
        for w in workers:
            if not w.done():
                w.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        if first_exc is not None:
            raise first_exc
        raise

    return results
