import asyncio
from typing import Callable, Awaitable, Any


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results = [None] * n
    tasks = {}
    next_index = 0
    exception = None

    async def run_one(index: int, fn: Callable[[], Awaitable[Any]]) -> None:
        nonlocal exception
        results[index] = await fn()

    running = set()

    try:
        while next_index < min(limit, n):
            tasks[next_index] = asyncio.create_task(run_one(next_index, funcs[next_index]))
            running.add(tasks[next_index])
            next_index += 1

        while tasks:
            done, _pending = await asyncio.wait(
                running, return_when=asyncio.FIRST_EXCEPTION
            )
            for t in done:
                running.discard(t)
                if t.exception() is not None and exception is None:
                    exception = t.exception()
            if exception is not None:
                break
            while next_index < n and len(running) < limit:
                tasks[next_index] = asyncio.create_task(run_one(next_index, funcs[next_index]))
                running.add(tasks[next_index])
                next_index += 1
    except asyncio.CancelledError:
        pass
    finally:
        for t in running:
            if not t.done():
                t.cancel()
        if running:
            await asyncio.gather(*running, return_exceptions=True)

    if exception is not None:
        raise exception

    return results
