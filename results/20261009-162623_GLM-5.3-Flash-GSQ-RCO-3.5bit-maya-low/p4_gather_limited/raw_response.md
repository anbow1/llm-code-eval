```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    queue: asyncio.Queue[int | None] = asyncio.Queue()
    for i in range(len(funcs)):
        queue.put_nowait(i)
    for _ in range(limit):
        queue.put_nowait(None)  # sentinel to stop workers

    first_error: list[BaseException] = []

    async def worker() -> None:
        while True:
            idx = await queue.get()
            if idx is None or first_error:
                return
            try:
                results[idx] = await funcs[idx]()
            except BaseException as exc:
                first_error.append(exc)
                # drain remaining slots so other workers exit promptly
                while not queue.empty():
                    if queue.get_nowait() is None:
                        queue.put_nowait(None)
                return

    workers = [asyncio.create_task(worker()) for _ in range(min(limit, len(funcs)))]
    try:
        await asyncio.gather(*workers)
    finally:
        if first_error:
            exc = first_error[0]
            raise exc
    return results
```