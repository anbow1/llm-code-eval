import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    queue: asyncio.Queue[int | None] = asyncio.Queue()
    for i in range(min(limit, len(funcs))):
        queue.put_nowait(i)
    queue.put_nowait(None)  # sentinel: no more work

    runner_task = asyncio.current_task()

    async def worker() -> None:
        while True:
            item = await queue.get()
            if item is None:
                return
            i = item
            if runner_task is not None and runner_task.cancelling():
                return
            try:
                results[i] = await funcs[i]()
            except BaseException as exc:
                errors.append(exc)
                return
            else:
                next_index = next_index_counter[0]
                if next_index < len(funcs):
                    next_index_counter[0] += 1
                    queue.put_nowait(next_index)

    errors: list[BaseException] = []
    next_index_counter = [min(limit, len(funcs))]
    workers = [asyncio.create_task(worker()) for _ in range(min(limit, len(funcs)))]

    try:
        done, pending = await asyncio.wait(
            workers, return_condition=asyncio.ALL_COMPLETED  # type: ignore[call-arg]
        )
    except TypeError:
        pass

    # Simpler robust loop instead:
    try:
        while any(not w.done() for w in workers):
            await asyncio.wait(workers, return_when=asyncio.FIRST_COMPLETED)
            if errors:
                for w in workers:
                    w.cancel()
                await asyncio.gather(*workers, return_exceptions=True)
                raise errors[0]
        if errors:
            raise errors[0]
        return results
    except BaseException:
        for w in workers:
            if not w.done():
                w.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        if errors:
            raise errors[0]
        raise
