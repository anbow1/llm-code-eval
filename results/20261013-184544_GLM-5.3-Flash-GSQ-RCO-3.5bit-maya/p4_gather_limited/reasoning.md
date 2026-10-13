Classic semaphore-based approach won't handle "cancel all still-running" cleanly — need worker tasks. Standard implementation: create tasks via workers pulling from queue, or use semaphore with wrapper tasks that check a cancellation flag.

Simplest robust: create coroutines wrapped, use asyncio.Semaphore(limit), gather tasks; on exception, cancel all tasks, gather with return_exceptions to wait, re-raise. But "first exception" — need to track which exception occurred first. With gather(..., return_exceptions=True), we get exceptions, but "first" in temporal order — we can capture the first exception raised by storing it in a flag when a wrapper catches. But we don't want to swallow; use tasks and asyncio.wait with FIRST_EXCEPTION.

Approach: create all tasks immediately? No — with semaphore, tasks are created but await semaphore inside; cancelling tasks that haven't started semaphore acquire... If task hasn't run yet, cancelling it is fine — it becomes cancelled. That satisfies "cancel all still-running calls, do not start any new ones."

Implementation:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError(...)
    if not funcs:
        return []
    sem = asyncio.Semaphore(limit)
    async def run(fn, idx, results):
        async with sem:
            results[idx] = await fn()
    tasks = [asyncio.ensure_future(run(f, i, results)) for i, f in enumerate(funcs)]
    try:
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
        # find first exception in temporal order
        first_exc = None
        for t in tasks:  # need order? asyncio.wait doesn't give temporal order
            ...
```

Problem: identifying the *first* exception temporally. asyncio.wait FIRST_EXCEPTION returns when first task raises; the exception is in `done` set. But which one raised first? Could check done tasks in completion order — asyncio.done set is unordered. Alternative: use a shared holder: first exception recorded by a wrapper that catches and stores timestamp, then re-raises? But if we re-raise inside task, fine.

Better: wrapper records exception in a list (append) and re-raises; the first element of that list is the temporally first exception. Then:

```python
async def run(fn, idx, results):
    async with sem:
        try:
            results[idx] = await fn()
        except BaseException as e:
            errors.append(e)
            raise
```

After wait FIRST_EXCEPTION, cancel pending tasks, await asyncio.gather(*pending, return_exceptions=True) to await cancellation (suppress CancelledError). Then if errors: raise errors[0]. If no errors, all done — but wait FIRST_EXCEPTION returns only when all done or first exception, so if no errors, all done, results complete.

Edge: if fn raises CancelledError itself... treat as exception? "re-raise that first exception" — catching BaseException includes CancelledError. Acceptable.

Also pending tasks awaiting semaphore: cancel → CancelledError propagates inside `run`, outside the try (since acquire happens before try). Actually `async with sem:` — CancelledError during acquire propagates; task cancelled, fine. If task cancelled while awaiting fn(), CancelledError caught by `except BaseException`, appended to errors! That would pollute errors and errors[0] might be a cancellation rather than real exception. But since real exception already appended first (it triggered the cancel), errors[0] is still the real one. However, if the CancelledError from external cancellation... gather_limited itself isn't cancelled externally presumably. Still, to be safe, don't catch CancelledError when it's from cancellation. Simpler: catch Exception only (re-raise). If fn raises BaseException like KeyboardInterrupt... use Exception is fine for typical usage. But "first exception" — use Exception. Hmm, safer: catch BaseException but skip CancelledError? If fn itself raises CancelledError (weird), it'd propagate uncaught, and errors wouldn't record it; wait FIRST_EXCEPTION catches BaseException too — asyncio.wait treats any exception including CancelledError as completion? CancelledError would make the task cancelled, not "exception" in wait's terms... Actually a task that raises CancelledError becomes cancelled, and FIRST_EXCEPTION returns only when at least one task raised a non-cancel exception OR all complete. Cancelled tasks count as done, but not as "raised exception" — so wait would keep waiting. Edge case; keep it simple: catch Exception.

Then cancel pending, await them with return_exceptions=True to silence.

Also handle: tasks cancelled while in `run`'s semaphore acquire — after cancellation, gather pending with return_exceptions=True gives CancelledError, fine.

Code:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    results = [None] * len(funcs)
    errors = []
    sem = asyncio.Semaphore(limit)

    async def run(index, fn):
        async with sem:
            try:
                results[index] = await fn()
            except Exception as exc:
                errors.append(exc)
                raise

    tasks = [asyncio.ensure_future(run(i, fn)) for i, fn in enumerate(funcs)]
    try:
        await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
    finally:
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    if errors:
        raise errors[0]
    return results
```

Wait — if gather_limited itself cancelled externally, finally cancels tasks; fine.

One subtlety: errors[0] — errors appended in temporal order since append is synchronous within task execution. Yes.

But note: if a task raises exception, wait returns; but other tasks may also complete concurrently and append errors — errors[0] is still temporally first? Appends happen as exceptions occur. The first exception to occur triggers wait return, but another task's exception might be appended before we read errors... could a later-occurring exception be appended before the first? No — first exception occurs first temporally, so appended first. Appends happen in temporal order regardless.

Hmm — but exceptions in tasks: `raise` after append; the task exception is set. Fine.

Also, tasks completed with exception that we never retrieve before re-raising — we retrieve via gather with return_exceptions=True, so no "exception never retrieved" warnings.

Also "do not start any new ones": cancelled tasks waiting on semaphore acquire — when cancelled while waiting, they never start. But could a waiting task acquire semaphore between the exception and our cancel loop? Possible race: exception raised, task done, another task acquires sem and starts fn before we cancel. To strictly prevent, use a shared "abort" flag checked after acquiring sem: if aborted, skip calling fn (raise CancelledError or just return without setting). Let's add an event/flag.

```python
    abort = False  # via nonlocal
```

Use a simple flag list or asyncio.Event. In run:

```python
    async def run(index, fn):
        async with sem:
            if aborted[0]:
                raise asyncio.CancelledError()
            ...
```

Raising CancelledError inside makes task cancelled — but then it's not "started". Alternatively just return without setting results... then results[index] stays None and no error → results incomplete if exception occurred — but we re-raise anyway so results discarded. Simplest: check flag, and if aborted, don't call fn (return without setting result). Since we re-raise errors[0], results irrelevant. But if no errors, flag never set. Good.

Use a mutable holder: `state = {"aborted": False}` or use event: `stop = asyncio.Event()`; in finally set stop.set(). Check `if stop.is_set(): return`. But wait — in finally we set stop even in success case? If all done, no pending tasks, harmless. Actually set stop in exception path only. Cleaner: in finally, cancel pending; but also set stop flag first to prevent races. Set stop before cancelling in all cases — safe.

Final code:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    results = [None] * len(funcs)
    errors = []
    stop = asyncio.Event()
    sem = asyncio.Semaphore(limit)

    async def run(index, fn):
        async with sem:
            if stop.is_set():
                return
            try:
                results[index] = await fn()
            except Exception as exc:
                errors.append(exc)
                raise

    tasks = [asyncio.ensure_future(run(i, fn)) for i, fn in enumerate(funcs)]
    try:
        await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
    finally:
        stop.set()
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    if errors:
        raise errors[0]
    return results
```

Note asyncio.wait deprecation warnings about passing coroutines — we pass Tasks, fine.

One more: errors list may contain exceptions appended before stop set — errors[0] correct.

Also if fn returns awaitable from lambda — `await fn()` correct.