import asyncio
from collections import deque
from typing import Any


async def gather_limited(funcs: list, limit: int) -> list:
    """Run zero-argument callables with at most *limit* concurrent, return results in order.

    On the first exception the remaining running tasks are cancelled, no new tasks
    are started, and that exception is re-raised.
    """
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n: int = len(funcs)
    results: list[Any] = [None] * n
    next_to_start: int = 0

    # Running tasks mapped to their original index.
    running: dict[asyncio.Future, int] = {}

    def _fill_slots() -> None:
        nonlocal next_to_start
        while next_to_start < n and len(running) < limit:
            i = next_to_start
            next_to_start += 1
            task: asyncio.Future = asyncio.ensure_future(funcs[i]())
            running[task] = i

    _fill_slots()

    first_exception: BaseException | None = None

    while running:
        done, _ = await asyncio.wait(
            set(running.keys()), return_when=asyncio.FIRST_COMPLETED
        )

        for task in done:
            idx = running.pop(task)

            # A task that was externally cancelled (e.g. by us cancelling on failure)
            # should not overwrite a meaningful exception.
            if task.cancelled():
                continue

            exc = task.exception()
            if exc is not None:
                if first_exception is None:
                    first_exception = exc
            else:
                results[idx] = task.result()

        if first_exception is not None:
            # Cancel every task that is still in flight.
            for t in running:
                t.cancel()
            if running:
                await asyncio.wait(set(running.keys()))
            raise first_exception

        # Fill freed slots with the next pending tasks.
        _fill_slots()

    return results
