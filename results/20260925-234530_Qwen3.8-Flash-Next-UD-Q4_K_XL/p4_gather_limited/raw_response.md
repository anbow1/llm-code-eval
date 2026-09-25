```python
import asyncio
from collections.abc import Awaitable, Callable


async def gather_limited(funcs: list[Callable[[], Awaitable]], limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results: list = [None] * len(funcs)
    first_exc: BaseException | None = None

    async def _run(func: Callable[[], Awaitable], index: int) -> None:
        nonlocal first_exc
        async with sem:
            if first_exc is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exc is None:
                    first_exc = e
                raise

    tasks = [asyncio.create_task(_run(f, i)) for i, f in enumerate(funcs)]

    pending = set(tasks)
    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            try:
                exc = t.exception()
            except asyncio.CancelledError:
                exc = None
            if exc is not None:
                for p in pending:
                    p.cancel()
                if pending:
                    await asyncio.wait(pending)
                raise first_exc  # type: ignore[misc]

    return results
```