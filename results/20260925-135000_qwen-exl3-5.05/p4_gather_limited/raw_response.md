

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")

    funcs = list(funcs)
    n = len(funcs)
    if n == 0:
        return []

    results = [None] * n
    pending = {}
    active = 0
    completed = asyncio.Queue()
    error = None
    next_index = 0

    def on_done(fut):
        completed.put_nowait(fut)

    def handle(fut):
        nonlocal active, error

        indices = pending.pop(fut, None)
        if not indices:
            return True

        active -= len(indices)

        try:
            value = fut.result()
        except BaseException as exc:
            error = exc
            return False

        for i in indices:
            results[i] = value
        return True

    async def cleanup():
        if not pending:
            return

        for fut in pending:
            fut.cancel()

        try:
            await asyncio.gather(*pending, return_exceptions=True)
        except BaseException:
            for fut in pending:
                if fut.done():
                    try:
                        fut.result()
                    except BaseException:
                        pass

    try:
        while True:
            while not completed.empty():
                if not handle(completed.get_nowait()):
                    break

            if error is not None:
                break

            while next_index < n and active < limit:
                i = next_index
                next_index += 1

                try:
                    fut = asyncio.ensure_future(funcs[i]())
                except BaseException as exc:
                    error = exc
                    break

                if fut in pending:
                    pending[fut].append(i)
                else:
                    pending[fut] = [i]
                    if not fut.done():
                        fut.add_done_callback(on_done)

                active += 1

                if fut.done():
                    if not handle(fut):
                        break

            if error is not None:
                break

            if active == 0:
                break

            fut = await completed.get()
            if not handle(fut):
                break

    except BaseException as exc:
        if error is None:
            error = exc

    if error is not None:
        await cleanup()
        raise error

    return results
```