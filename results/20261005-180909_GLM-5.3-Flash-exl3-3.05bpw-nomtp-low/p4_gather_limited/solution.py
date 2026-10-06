import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    tasks: dict[int, asyncio.Task] = {}
    next_index = 0
    failure: BaseException | None = None
    loop = asyncio.get_running_loop()

    async def run_one(i: int):
        coro = funcs[i]()
        if not asyncio.iscoroutine(coro):
            awaitable = coro
        else:
            awaitable = coro
        results[i] = await _await(awaitable)

    async def _await(a):
        return await asyncio.ensure_future(a) if not hasattr(a, "__await__") else a

    async def spawn(i: int) -> asyncio.Task:
        return asyncio.ensure_future(_call(i))

    async def _call(i: int):
        result = funcs[i]()
        if asyncio.iscoroutine(result) or asyncio.isfuture(result):
            return await result
        return result

    async def worker():
        nonlocal next_index, failure
        while True:
            async with sem:
                i = -1
                while True:
                    if failure is not None or failed_event.is_set():
                        return
                    async with lock:
                        if next_index < n and failure is None and not failed_event.is_set():
                            i = next_index
                            next_index += 1
                        else:
                            i = -1
                    if i >= 0:
                        break
                    await asyncio.sleep(0)
                    if failure is not None or failed_event.is_set():
                        return
                try:
                    results[i] = await _call(i)
                except BaseException as exc:
                    if failure is None:
                        failure = exc
                    failed_event.set()
                    return

    sem = asyncio.Semaphore(limit)
    failed_event = asyncio.Event()
    lock = asyncio.Lock()

    workers = [asyncio.create_task(worker()) for _ in range(min(limit, n))]
    try:
        await asyncio.gather(*workers)
    except BaseException:
        raise

    if failure is not None:
        raise failure
    return results
