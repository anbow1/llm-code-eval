```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")

    funcs = list(funcs)
    n = len(funcs)
    if n == 0:
        return []

    results = [None] * n
    active: dict[asyncio.Task, int] = {}
    next_idx = 0
    first_error: BaseException | None = None
    events = asyncio.Queue()

    def cancel_active() -> None:
        for task in list(active):
            task.cancel()

    def on_done(task: asyncio.Task) -> None:
        nonlocal first_error

        idx = active.pop(task, None)
        if idx is None:
            return

        if task.cancelled():
            exc = asyncio.CancelledError()
        else:
            exc = task.exception()

        if exc is not None:
            if first_error is None:
                first_error = exc
                cancel_active()
        else:
            results[idx] = task.result()

        events.put_nowait(idx)

    def schedule() -> None:
        nonlocal next_idx, first_error

        while next_idx < n and len(active) < limit and first_error is None:
            idx = next_idx
            next_idx += 1

            try:
                awaitable = funcs[idx]()
                task = asyncio.ensure_future(awaitable)
            except BaseException as exc:
                first_error = exc
                cancel_active()
                return

            active[task] = idx
            task.add_done_callback(on_done)

    schedule()

    try:
        while active or (first_error is None and next_idx < n):
            await events.get()
            if first_error is None:
                schedule()
    finally:
        cancel_active()

    if first_error is not None:
        raise first_error

    return results
```