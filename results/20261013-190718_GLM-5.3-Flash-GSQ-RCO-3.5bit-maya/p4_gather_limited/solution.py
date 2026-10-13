import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    n = len(funcs)
    results = [None] * n
    indices = iter(range(n))
    failed = False
    first_exc = None

    async def worker():
        nonlocal failed, first_exc
        while True:
            # Check for a failure before claiming the next index.
            # There is no await between this check and next(), so no
            # other coroutine can slip in and change `failed` mid-step.
            if failed:
                return
            try:
                i = next(indices)
            except StopIteration:
                return
            try:
                results[i] = await funcs[i]()
            except asyncio.CancelledError:
                # If we were cancelled because another call failed, that's
                # the expected shutdown path: exit quietly. Otherwise the
                # cancellation came from outside and must propagate.
                if failed:
                    return
                raise
            except BaseException as exc:
                if not failed:
                    failed = True
                    first_exc = exc
                # Stop the other workers; cancelling them also cancels the
                # user coroutines they are currently awaiting.
                current = asyncio.current_task()
                for t in tasks:
                    if t is not current:
                        t.cancel()
                return

    tasks = [asyncio.ensure_future(worker()) for _ in range(min(limit, n))]
    try:
        await asyncio.gather(*tasks, return_exceptions=True)
    except asyncio.CancelledError:
        # If gather_limited itself is cancelled, shut down the workers.
        for t in tasks:
            t.cancel()
        raise

    if failed:
        raise first_exc
    return results
