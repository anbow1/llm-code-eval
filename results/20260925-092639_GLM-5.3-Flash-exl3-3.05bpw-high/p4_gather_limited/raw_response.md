```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")

    n = len(funcs)
    if n == 0:
        return []

    results: list = [None] * n
    next_index = 0
    running: dict[asyncio.Task, int] = {}

    async def _runner(index: int):
        return await funcs[index]()

    try:
        while next_index < n or running:
            # Fill free slots as they become available.
            while next_index < n and len(running) < limit:
                task = asyncio.create_task(_runner(next_index))
                running[task] = next_index
                next_index += 1

            done, _pending = await asyncio.wait(
                list(running),
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Process completions in the order they were reported.
            for task in done:
                index = running.pop(task)
                exc = task.exception()
                if exc is not None:
                    raise exc
                results[index] = task.result()
    except BaseException:
        # Cancel everything still running and wait for cancellation to finish.
        tasks_to_cancel = list(running)
        for task in tasks_to_cancel:
            task.cancel()
        if tasks_to_cancel:
            await asyncio.gather(*tasks_to_cancel, return_exceptions=True)
        raise

    return results
```