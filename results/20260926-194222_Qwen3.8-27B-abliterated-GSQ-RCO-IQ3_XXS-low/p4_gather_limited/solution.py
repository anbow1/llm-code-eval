import asyncio


async def gather_limited(funcs: list, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")

    n = len(funcs)
    if n == 0:
        return []

    results: list = [None] * n
    first_exc: list = [None]
    stop: list = [False]
    sem = asyncio.Semaphore(limit)
    tasks: list[asyncio.Task] = []

    async def run(i: int) -> None:
        if stop[0]:
            return
        async with sem:
            if stop[0]:
                return
            try:
                results[i] = await funcs[i]()
            except BaseException as e:
                if first_exc[0] is None:
                    first_exc[0] = e
                stop[0] = True
                current = asyncio.current_task()
                for t in tasks:
                    if t is not current and not t.done():
                        t.cancel()
                raise

    for i in range(n):
        tasks.append(asyncio.ensure_future(run(i)))

    await asyncio.gather(*tasks, return_exceptions=True)

    if first_exc[0] is not None:
        raise first_exc[0]

    return results
