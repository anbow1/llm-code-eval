```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    sem = asyncio.Semaphore(limit)
    first_exc: list[BaseException] = []
    tasks: list[asyncio.Task] = []

    async def run(i: int, func) -> None:
        async with sem:
            if first_exc:
                return
            try:
                results[i] = await func()
            except asyncio.CancelledError:
                raise
            except BaseException as e:
                if not first_exc:
                    first_exc.append(e)
                for t in tasks:
                    if not t.done():
                        t.cancel()

    for i, func in enumerate(funcs):
        tasks.append(asyncio.create_task(run(i, func)))

    await asyncio.gather(*tasks, return_exceptions=True)

    if first_exc:
        raise first_exc[0]

    return results
```