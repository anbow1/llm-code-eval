

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    next_idx = 0
    running: dict[asyncio.Task, int] = {}
    first_error: Exception | None = None

    async def run_task(idx: int):
        return await funcs[idx]()

    # Start the initial batch (up to `limit` tasks)
    for _ in range(min(limit, len(funcs))):
        idx = next_idx
        next_idx += 1
        task = asyncio.ensure_future(run_task(idx))
        running[task] = idx

    # Sliding-window loop: start the next task as soon as any slot frees up
    while running:
        done, _ = await asyncio.wait(set(running))
        for task in done:
            idx = running.pop(task)
            try:
                results[idx] = task.result()
            except Exception as e:
                first_error = e
                # Cancel every task still in flight
                for t in running:
                    t.cancel()
                running.clear()
                break
            # Start the next task if there are more to run
            if next_idx < len(funcs):
                new_idx = next_idx
                next_idx += 1
                task = asyncio.ensure_future(run_task(new_idx))
                running[task] = new_idx
        if first_error is not None:
            break

    if first_error is not None:
        raise first_error

    return results
```