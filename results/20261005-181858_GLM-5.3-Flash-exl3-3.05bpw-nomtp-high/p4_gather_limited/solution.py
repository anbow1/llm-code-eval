import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")

    total = len(funcs)
    if total == 0:
        return []

    results: list = [None] * total
    first_exc: BaseException | None = None
    running: dict[asyncio.Task, int] = {}
    next_index = 0
    all_done = asyncio.Event()

    def maybe_finish() -> None:
        nonlocal next_index, first_exc
        if not running and (next_index >= total or first_exc is not None):
            all_done.set()

    def done_cb(task: asyncio.Task) -> None:
        nonlocal first_exc
        index = running.pop(task, None)
        if index is None:
            return

        if task.cancelled():
            maybe_finish()
            return

        exc = task.exception()
        if exc is not None:
            if first_exc is None:
                first_exc = exc
                for t in list(running):
                    t.cancel()
            maybe_finish()
            return

        results[index] = task.result()
        maybe_finish()

        if first_exc is None and next_index < total:
            # A slot freed up before anything new could start.
            launch(next_index)
            next_index += 1

    def launch(index: int) -> None:
        task = asyncio.get_running_loop().create_task(_run(index))
        running[task] = index
        task.add_done_callback(done_cb)

    async def _run(index: int):
        return await funcs[index]()

    # Start the initial batch up to the concurrency limit.
    for _ in range(min(limit, total)):
        launch(next_index)
        next_index += 1

    try:
        await all_done.wait()
    finally:
        # Make sure nothing is left running; propagate cancellation cleanly.
        if running:
            for t in list(running):
                t.cancel()
            await asyncio.gather(*running, return_exceptions=True)
            running.clear()

    if first_exc is not None:
        raise first_exc

    return results
