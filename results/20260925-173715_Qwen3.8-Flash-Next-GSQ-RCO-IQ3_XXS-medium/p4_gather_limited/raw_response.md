```python
import asyncio
from typing import Any, Awaitable, Callable


async def gather_limited(
    funcs: list[Callable[[], Awaitable[Any]]], limit: int
) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list[Any] = [None] * n
    active: dict[asyncio.Task, int] = {}
    next_index = 0
    first_exception: BaseException | None = None

    def _start_next() -> None:
        nonlocal next_index, first_exception
        while len(active) < limit and next_index < n:
            idx = next_index
            next_index += 1
            try:
                awaitable = funcs[idx]()
            except BaseException as exc:
                first_exception = exc
                return
            task = asyncio.ensure_future(awaitable)
            active[task] = idx

    _start_next()

    while active:
        done, _ = await asyncio.wait(
            list(active.keys()), return_when=asyncio.FIRST_COMPLETED
        )

        for task in done:
            idx = active.pop(task)
            if task.cancelled():
                continue
            exc = task.exception()
            if exc is not None:
                if first_exception is None:
                    first_exception = exc
            else:
                results[idx] = task.result()

        if first_exception is not None:
            break

        _start_next()
        if first_exception is not None:
            break

    if first_exception is not None:
        for task in active:
            task.cancel()
        if active:
            await asyncio.wait(list(active.keys()))
        raise first_exception

    return results
```