```python
import asyncio
from typing import Awaitable, Callable, List


async def gather_limited(funcs: List[Callable[[], Awaitable]], limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results: list = [None] * len(funcs)
    pending: set[asyncio.Future] = set()
    task_to_index: dict[asyncio.Future, int] = {}
    next_index = 0

    try:
        while True:
            # Fill free slots with the next unstarted callables.
            while next_index < len(funcs) and len(pending) < limit:
                coro = funcs[next_index]()
                task = asyncio.ensure_future(coro)
                task_to_index[task] = next_index
                pending.add(task)
                next_index += 1

            if not pending:
                break

            done, pending = await asyncio.wait(
                pending, return_when=asyncio.FIRST_COMPLETED
            )
            for task in done:
                index = task_to_index.pop(task)
                # .result() re-raises the task's exception, if any.
                results[index] = task.result()
    except BaseException:
        # Cancel all still-running tasks and do not start any new ones.
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.wait(pending)
            for task in pending:
                if not task.cancelled():
                    # Retrieve exception to avoid "never retrieved" warnings.
                    task.exception()
        raise

    return results
```