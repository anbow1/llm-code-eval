

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    next_index = 0
    first_error = None
    lock = asyncio.Lock()
    tasks = []

    async def worker():
        nonlocal next_index, first_error
        while True:
            async with lock:
                if first_error is not None:
                    return
                if next_index >= len(funcs):
                    return
                idx = next_index
                next_index += 1

            try:
                results[idx] = await funcs[idx]()
            except Exception as e:
                async with lock:
                    if first_error is None:
                        first_error = e
                for t in tasks:
                    if t is not asyncio.current_task() and not t.done():
                        t.cancel()
                raise

    num_workers = min(limit, len(funcs))
    tasks = [asyncio.create_task(worker()) for _ in range(num_workers)]

    await asyncio.gather(*tasks, return_exceptions=True)

    if first_error is not None:
        raise first_error

    return results
```