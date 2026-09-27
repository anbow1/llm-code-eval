import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    next_index = 0
    running: dict[asyncio.Task, int] = {}

    for i in range(min(limit, len(funcs))):
        task = asyncio.create_task(funcs[i]())
        running[task] = i
        next_index = i + 1

    while running:
        done, _ = await asyncio.wait(running.keys(), return_when=asyncio.FIRST_COMPLETED)

        error = None
        for task in done:
            idx = running.pop(task)
            try:
                results[idx] = task.result()
            except Exception as e:
                error = e
                break

        if error is not None:
            for t in list(running.keys()):
                t.cancel()
            if running:
                await asyncio.wait(list(running.keys()))
            raise error

        while next_index < len(funcs) and len(running) < limit:
            task = asyncio.create_task(funcs[next_index]())
            running[task] = next_index
            next_index += 1

    return results
