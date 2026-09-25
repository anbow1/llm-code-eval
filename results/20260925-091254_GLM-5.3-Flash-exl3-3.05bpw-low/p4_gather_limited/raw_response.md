```python
import asyncio


def gather_limited(funcs, limit: int):
    return _gather(funcs, limit)


async def _gather(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    sem = asyncio.Semaphore(limit)
    state = {"exception": None}

    async def worker(f):
        async with sem:
            return await f()

    tasks = [asyncio.create_task(worker(f)) for f in funcs]

    def first_error(ts):
        for t in tasks:
            if t in ts and t.done() and t.exception() is not None:
                return t.exception()
        return None

    while True:
        done, pending = await asyncio.wait(
            tasks, return_when=asyncio.exceptions.FIRST_EXCEPTION
        )
        exc = None
        for t in tasks:
            if t.done() and t.exception() is not None:
                exc = t.exception()
                break
        if exc is not None:
            for t in pending:
                t.cancel()
            if pending:
                await asyncio.gather(*pending, return_exceptions=True)
            raise exc
        if not pending:
            break

    return [t.result() for t in tasks]
```