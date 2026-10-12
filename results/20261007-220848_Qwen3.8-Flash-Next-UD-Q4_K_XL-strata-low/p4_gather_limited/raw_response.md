```python
import asyncio
from typing import Any, Callable, Coroutine, TypeVar

T = TypeVar("T")


async def gather_limited(
    funcs: list[Callable[[], Coroutine[Any, Any, T]]], limit: int
) -> list[T]:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    results: list[T] = [None] * len(funcs)  # type: ignore[assignment]

    async def run(i: int, func: Callable[[], Coroutine[Any, Any, T]]) -> None:
        async with sem:
            results[i] = await func()

    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]

    pending = set(tasks)
    while pending:
        done_now, pending = await asyncio.wait(
            pending, return_when=asyncio.FIRST_EXCEPTION
        )
        for t in done_now:
            if not t.cancelled() and t.exception() is not None:
                # Cancel all still-running tasks
                for other in pending:
                    other.cancel()
                if pending:
                    await asyncio.wait(pending)
                # Re-raise the first exception encountered
                for t in tasks:
                    if not t.cancelled() and t.exception() is not None:
                        raise t.exception()

    return results
```

**How it works:**

1. **Concurrency limiting:** A `Semaphore(limit)` gates entry into `func()`. Each `run()` coroutine acquires the semaphore before awaiting the callable and releases it after (via `async with`). This gives a sliding-window pattern — the next task starts the instant any slot frees up.

2. **Ordering:** Results are written into a pre-sized list at index `i`, so order is preserved regardless of completion order.

3. **Exception handling:** `asyncio.wait(..., FIRST_EXCEPTION)` returns as soon as *any* task finishes with an exception. On detecting that, we `cancel()` every still-pending task (both those mid-execution and those waiting on the semaphore), wait for the cancellations to settle, then walk the full task list to find and re-raise the first non-`CancelledError` exception.

4. **Edge cases:** `ValueError` for `limit < 1`; immediate `[]` for an empty input.