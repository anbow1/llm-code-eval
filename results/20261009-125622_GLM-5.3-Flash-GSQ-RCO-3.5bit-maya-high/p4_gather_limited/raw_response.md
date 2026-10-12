```python
import asyncio
from collections import deque
from typing import Awaitable, Callable, List


async def gather_limited(funcs: List[Callable[[], Awaitable]], limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")

    n = len(funcs)
    if n == 0:
        return []

    results: list = [None] * n
    pending_indices: deque = deque(range(n))
    first_exc: BaseException | None = None

    async def worker() -> None:
        nonlocal first_exc
        while True:
            if first_exc is not None:
                return
            try:
                i = pending_indices.popleft()
            except IndexError:
                return
            try:
                results[i] = await funcs[i]()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                if first_exc is None:
                    first_exc = exc
                raise

    workers = [asyncio.create_task(worker()) for _ in range(min(limit, n))]
    try:
        to_wait = set(workers)
        while to_wait:
            done, to_wait = await asyncio.wait(to_wait, return_when=asyncio.FIRST_COMPLETED)
            for t in done:
                if not t.cancelled():
                    t.exception()
            if first_exc is not None:
                for t in to_wait:
                    t.cancel()
                if to_wait:
                    await asyncio.gather(*to_wait, return_exceptions=True)
                raise first_exc
    except BaseException:
        for t in workers:
            if not t.done():
                t.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        raise

    return results
```