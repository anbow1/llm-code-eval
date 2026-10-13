```python
import asyncio
from typing import Awaitable, Callable, List


async def gather_limited(funcs: List[Callable[[], Awaitable]], limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    total = len(funcs)
    results: list = [None] * total
    next_index = 0
    first_exception = None
    lock = asyncio.Lock()

    async def worker() -> None:
        nonlocal next_index, first_exception
        while True:
            # Grab the next index under a lock so no index is skipped or duplicated.
            async with lock:
                if first_exception is not None or next_index >= total:
                    return
                idx = next_index
                next_index += 1
            results[idx] = await funcs[idx]()

    tasks = [asyncio.create_task(worker()) for _ in range(min(limit, total))]

    try:
        await asyncio.gather(*tasks)
    except Exception as exc:
        # First exception observed; record it and stop scheduling new work.
        if first_exception is None:
            first_exception = exc
    finally:
        # Cancel all still-running workers; do not start any new calls.
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    if first_exception is not None:
        raise first_exception
    return results
```