import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    semaphore = asyncio.Semaphore(limit)
    results: list = [None] * len(funcs)
    first_exc: BaseException | None = None
    failed = False

    async def _worker(index: int) -> None:
        nonlocal first_exc, failed
        async with semaphore:
            # After a failure, never start new work; slots free up but stay idle.
            if failed:
                return
            try:
                results[index] = await funcs[index]()
            except asyncio.CancelledError:
                # Cancellation of still-running tasks after a failure,
                # or external cancellation: not a "first exception" candidate.
                raise
            except BaseException as exc:
                failed = True
                if first_exc is None:
                    first_exc = exc
                raise

    tasks = [asyncio.ensure_future(_worker(i)) for i in range(len(funcs))]

    # Returns as soon as one task completes with an exception,
    # or when all tasks have completed successfully.
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)

    if first_exc is not None:
        # Cancel all still-running (and queued) tasks, then reap them.
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
        raise first_exc

    return results
