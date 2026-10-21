```python
import asyncio
from collections.abc import Awaitable, Callable, Sequence
from typing import Any


async def gather_limited(
    funcs: Sequence[Callable[[], Awaitable[Any]]],
    limit: int,
) -> list[Any]:
    if limit < 1:
        raise ValueError("limit must be at least 1")

    funcs = list(funcs)
    n = len(funcs)
    if n == 0:
        return []

    results: list[Any] = [None] * n
    running: set[asyncio.Future[Any]] = set()
    task_index: dict[asyncio.Future[Any], int] = {}
    next_index = 0

    async def await_any(awaitable: Awaitable[Any]) -> Any:
        return await awaitable

    async def cancel_running() -> None:
        tasks = list(running)
        running.clear()
        task_index.clear()
        if tasks:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    try:
        while next_index < n or running:
            while len(running) < limit and next_index < n:
                index = next_index
                next_index += 1

                awaitable = funcs[index]()
                task = asyncio.ensure_future(awaitable)

                if task in running:
                    task = asyncio.create_task(await_any(awaitable))

                running.add(task)
                task_index[task] = index

            if not running:
                break

            done, _ = await asyncio.wait(
                running,
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in done:
                running.discard(task)
                index = task_index.pop(task)
                results[index] = task.result()

        return results
    except BaseException:
        await cancel_running()
        raise
```