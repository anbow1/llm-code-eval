import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    total = len(funcs)
    results: list = [None] * total
    # Maps asyncio.Task -> index into results
    running: dict[asyncio.Task, int] = {}
    next_idx = 0

    while next_idx < total or running:
        # Fill available slots.
        while len(running) < limit and next_idx < total:
            try:
                coro = funcs[next_idx]()
            except BaseException as exc:
                # Synchronous failure calling the callable itself.
                for t in running:
                    t.cancel()
                for t in running:
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass
                raise
            task = asyncio.create_task(coro)
            running[task] = next_idx
            next_idx += 1

        if not running:
            break

        # Wait until *any* one of the running tasks finishes.
        done, not_done = await asyncio.wait(
            running.keys(),
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Process every task that just completed.
        for task in done:
            idx = running[task]
            del running[task]

            if task.cancelled():
                continue

            exc = task.exception()
            if exc is not None:
                # Cancel everything still running and consume the
                # CancelledErrors so they don't leak out.
                for t in not_done:
                    t.cancel()
                for t in not_done:
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass
                raise exc

            results[idx] = task.result()

        # Keep only the still-running tasks, mapped to their indices.
        running = {t: running[t] for t in not_done}

    return results
