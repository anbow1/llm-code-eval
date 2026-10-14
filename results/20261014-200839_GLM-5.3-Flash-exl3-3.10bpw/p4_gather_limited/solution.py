import asyncio


async def gather_limited(funcs, limit: int) -> list:
    """
    Run zero-argument callables (returning awaitables) with at most `limit`
    running concurrently, returning results in order.

    On the first exception, cancels all still-running calls, does not start
    new ones, and re-raises that first exception.
    """
    if limit < 1:
        raise ValueError("limit must be at least 1")

    funcs = list(funcs)
    n = len(funcs)
    results: list = [None] * n
    if n == 0:
        return results

    queue: asyncio.Queue = asyncio.Queue()
    for i in range(n):
        queue.put_nowait(i)

    first_exc: BaseException | None = None
    tasks: list[asyncio.Task] = []

    async def worker() -> None:
        nonlocal first_exc
        while True:
            try:
                i = queue.get_nowait()
            except asyncio.QueueEmpty:
                # No more work: let this slot free for nothing else to pick up.
                return
            try:
                results[i] = await funcs[i]()
            except asyncio.CancelledError:
                # We were cancelled because another call failed; propagate.
                raise
            except BaseException as exc:
                # First failure wins; cancel every other still-running call
                # without awaiting in between, so no new call can start.
                if first_exc is None:
                    first_exc = exc
                me = asyncio.current_task()
                for t in tasks:
                    if t is not me:
                        t.cancel()
                return

    for _ in range(min(limit, n)):
        tasks.append(asyncio.create_task(worker()))

    # Wait for all workers to finish (normally, or via cancellation of peers).
    await asyncio.gather(*tasks, return_exceptions=True)

    if first_exc is not None:
        raise first_exc

    return results
