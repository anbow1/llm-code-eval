```python
import asyncio
from typing import Awaitable, Callable, List


async def gather_limited(
    funcs: List[Callable[[], Awaitable]],
    limit: int,
) -> list:
    """Run awaitable-producing callables with at most `limit` running concurrently.

    Results are returned in the same order as `funcs`. On the first failure,
    all still-running calls are cancelled, no new ones are started, and that
    first exception is re-raised.
    """
    if limit < 1:
        raise ValueError("limit must be >= 1")

    n = len(funcs)
    if n == 0:
        return []

    results: list = [None] * n
    next_index = 0
    first_exc: BaseException | None = None

    async def worker() -> None:
        nonlocal next_index, first_exc
        while True:
            if first_exc is not None or next_index >= n:
                return
            i = next_index
            next_index += 1
            try:
                results[i] = await funcs[i]()
            except BaseException as e:
                # Only the chronologically first failure is recorded.
                if first_exc is None:
                    first_exc = e
                raise

    num_workers = min(limit, n)
    workers = [asyncio.create_task(worker()) for _ in range(num_workers)]

    try:
        done, pending = await asyncio.wait(
            workers, return_when=asyncio.FIRST_EXCEPTION
        )
    except asyncio.CancelledError:
        # gather_limited itself was cancelled: shut down the workers cleanly.
        for w in workers:
            w.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        raise

    # Cancel any workers still running (this happens only on failure).
    if pending:
        for w in pending:
            w.cancel()
        await asyncio.gather(*pending, return_exceptions=True)

    if first_exc is not None:
        raise first_exc

    return results
```