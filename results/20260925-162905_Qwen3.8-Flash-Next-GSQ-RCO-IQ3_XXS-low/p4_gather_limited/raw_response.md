```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    n = len(funcs)
    results: list = [None] * n
    running: dict[asyncio.Task, int] = {}
    next_idx = 0

    try:
        while next_idx < n or running:
            # Start new tasks to fill available slots
            while next_idx < n and len(running) < limit:
                task = asyncio.ensure_future(funcs[next_idx]())
                running[task] = next_idx
                next_idx += 1

            # Wait until at least one running task finishes
            done, _ = await asyncio.wait(
                list(running.keys()), return_when=asyncio.FIRST_COMPLETED
            )

            # Process completed tasks: store results, detect first exception
            first_exc: BaseException | None = None
            for task in done:
                idx = running.pop(task)
                try:
                    results[idx] = task.result()
                except BaseException as e:
                    if first_exc is None:
                        first_exc = e

            if first_exc is not None:
                raise first_exc

        return results

    except BaseException:
        # Cancel every still-running task
        for task in running:
            task.cancel()
        # Await cancellations so no "task destroyed while pending" warnings appear
        if running:
            await asyncio.wait(list(running.keys()), return_when=asyncio.ALL_COMPLETED)
        raise
```