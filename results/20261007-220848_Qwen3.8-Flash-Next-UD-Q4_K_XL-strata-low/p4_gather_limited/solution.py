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
