import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    sem = asyncio.Semaphore(limit)
    first_error = [None]
    error_event = asyncio.Event()

    async def wrapper(idx: int, func) -> None:
        async with sem:
            if error_event.is_set():
                return
            try:
                results[idx] = await func()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                if first_error[0] is None:
                    first_error[0] = e
                error_event.set()

    tasks = [asyncio.create_task(wrapper(i, f)) for i, f in enumerate(funcs)]

    async def _cancel_on_error() -> None:
        await error_event.wait()
        for t in tasks:
            if not t.done():
                t.cancel()

    cancel_task = asyncio.create_task(_cancel_on_error())
    try:
        await asyncio.gather(*tasks, return_exceptions=True)
    finally:
        cancel_task.cancel()
        try:
            await cancel_task
        except asyncio.CancelledError:
            pass

    if first_error[0] is not None:
        raise first_error[0]

    return results
