```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    n = len(funcs)
    results = [None] * n
    sem = asyncio.Semaphore(limit)
    first_exc = None
    cancelled = False
    all_outer_tasks: list[asyncio.Task] = []

    async def run_one(i: int) -> None:
        nonlocal first_exc, cancelled
        await sem.acquire()
        if cancelled:
            sem.release()
            return
        try:
            results[i] = await funcs[i]()
        except BaseException as e:
            if first_exc is None:
                first_exc = e
                cancelled = True
                for t in all_outer_tasks:
                    if t is not asyncio.current_task() and not t.done():
                        t.cancel()
        finally:
            sem.release()

    all_outer_tasks = [asyncio.create_task(run_one(i)) for i in range(n)]
    await asyncio.gather(*all_outer_tasks, return_exceptions=True)

    if first_exc is not None:
        raise first_exc

    return results
```