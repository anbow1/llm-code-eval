import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results = [None] * n
    in_flight = {}  # task -> index
    next_idx = 0

    def _make_task(i):
        async def _wrapper():
            return await funcs[i]()
        return asyncio.create_task(_wrapper())

    # Start initial batch (up to `limit` tasks)
    for i in range(min(limit, n)):
        in_flight[_make_task(i)] = i
    next_idx = min(limit, n)

    while in_flight:
        done, _ = await asyncio.wait(
            list(in_flight.keys()), return_when=asyncio.FIRST_COMPLETED
        )

        for task in done:
            idx = in_flight.pop(task)
            try:
                results[idx] = task.result()
            except Exception as e:
                # Cancel all still-running tasks
                for t in list(in_flight.keys()):
                    t.cancel()
                if in_flight:
                    await asyncio.gather(*in_flight.keys(), return_exceptions=True)
                in_flight.clear()
                raise e

        # Fill freed slots with the next pending calls
        while next_idx < n and len(in_flight) < limit:
            in_flight[_make_task(next_idx)] = next_idx
            next_idx += 1

    return results
