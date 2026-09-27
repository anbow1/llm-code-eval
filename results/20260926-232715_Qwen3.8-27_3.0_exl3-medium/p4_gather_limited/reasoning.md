Let me think through this carefully.

We need `async def gather_limited(funcs, limit: int) -> list` where:
- `funcs` is a list of zero-argument callables that each return an awaitable
- At most `limit` running at the same time
- Start next one as soon as any slot frees up (not batched)
- Return results in same order as funcs
- If any call raises: cancel all still-running, don't start new ones, re-raise the first exception
- Raise ValueError if limit < 1
- Empty list returns []
- Use asyncio only

Let me think about the design:

1. Validate limit >= 1, else ValueError
2. If funcs is empty, return []
3. We need to track results by index
4. We need a semaphore or manual slot management
5. We need to handle the first exception and cancel everything

Approach:
- Use a semaphore with `limit` capacity
- Create tasks for each function
- But we need to start them "as soon as a slot frees up" - this means we shouldn't create all tasks upfront (well, we can create them but they'll wait on the semaphore)

Actually, let me think more carefully. The key requirements:
- At most `limit` running simultaneously
- Start next as soon as a slot frees up (not fixed batches)
- Results in order
- On first exception: cancel all running, don't start new, re-raise

One approach:
- Use `asyncio.Semaphore(limit)`
- For each func, create a coroutine that acquires the semaphore, calls the func, awaits the result, releases the semaphore
- Create all tasks at once (they'll block on semaphore)
- Use `asyncio.gather` with `return_exceptions=True`? No, because we need to cancel on first error.

Actually, let me think differently. If I use a semaphore approach:
- Create a wrapper coroutine for each func that acquires semaphore, runs, releases
- Wrap each in a task
- Use `asyncio.gather(*tasks)` - but this waits for all. If one raises, gather will propagate the first exception but won't cancel others automatically... actually in Python 3.11+, `asyncio.gather` with default `return_exceptions=False` will raise the first exception but the other tasks keep running.

So I need a different approach. Let me think...

Better approach:
- Use a semaphore
- Create tasks that use the semaphore
- Use `asyncio.TaskGroup` (Python 3.11+)? No, TaskGroup cancels all on first exception but it also raises ExceptionGroup, not the original exception.

Let me think of a manual approach:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    cancelled = False
    
    async def run_one(index, func):
        nonlocal first_exception, cancelled
        if cancelled:
            return
        async with semaphore:
            if cancelled:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                cancelled = True
                # We need to cancel other tasks... but how?
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # Wait for all
    for task in tasks:
        await task
    
    if first_exception is not None:
        raise first_exception
    return results
```

Wait, this has issues. When `cancelled` is set, the tasks that haven't started yet will skip, but tasks that are currently running (past the semaphore) won't be cancelled. Also, the `async with semaphore` - if we set `cancelled` and then try to acquire the semaphore, we'll wait for a slot that might never free up.

Let me reconsider. I need to actually cancel the running tasks.

Better approach:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    all_tasks = []
    
    async def run_one(index, func):
        nonlocal first_exception
        async with semaphore:
            if first_exception is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    all_tasks = tasks
    
    # We need to wait but also detect the first exception
    # We can use a future or just wait for all and check
    
    # Actually, the problem is: if one task raises, we need to cancel the others.
    # But if we cancel them, they'll raise CancelledError.
    
    # Let me think of another approach.
```

Hmm, let me think about this differently. 

The key challenge: when one task raises, we need to:
1. Cancel all still-running tasks
2. Not start any new ones
3. Re-raise the first exception

If I use a semaphore, tasks waiting on the semaphore need to be cancelled too.

Approach with manual task management:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    exception_event = asyncio.Event()
    
    async def run_one(index, func):
        nonlocal first_exception
        async with semaphore:
            if first_exception is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                    exception_event.set()
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # Wait for either all tasks to complete or first exception
    # But we need to cancel tasks on exception...
    
    # Actually, let me use a different strategy:
    # Wait for all tasks. If any raised, the results will be partially filled.
    # But we need to CANCEL running tasks, not just let them finish.
```

The problem is: if task 3 raises, tasks 5, 6, 7 might still be running. We need to cancel them. But if we just wait for all tasks, they'll keep running.

Let me try a different approach: use a "cancellation" mechanism.

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    error_event = asyncio.Event()
    
    async def run_one(index, func):
        nonlocal first_exception
        try:
            await semaphore.acquire()
        except asyncio.CancelledError:
            raise
        try:
            if first_exception is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                    error_event.set()
        finally:
            semaphore.release()
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # Now we need to wait. We want to:
    # - If all succeed, return results
    # - If one fails, cancel all others, re-raise
    
    # Strategy: wait for error_event or all tasks done
    # Actually, simpler: just await all tasks. The ones that haven't started yet
    # will check first_exception and return early. The ones running will finish.
    # But the requirement says "cancel all still-running calls" - so we MUST cancel them.
    
    # Hmm, so we need to actively cancel.
    
    # Let me try: await all tasks, but use a wrapper that cancels on error.
```

OK let me think about this more carefully. The requirement is explicit: "cancel all still-running calls, do not start any new ones, and re-raise that first exception."

So I need to actively cancel. Let me try:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    error_event = asyncio.Event()
    
    async def run_one(index, func):
        nonlocal first_exception
        async with semaphore:
            if first_exception is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                    error_event.set()
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # Wait for first error or all completion
    # We can't easily do "wait for either" with a simple loop...
    
    # Alternative: use asyncio.wait with FIRST_EXCEPTION
    # But asyncio.wait works on futures, and our tasks are futures.
    
    # Actually, let me just wait for all tasks. The key insight:
    # - Tasks waiting on semaphore: when first_exception is set, they'll check and return
    #   But they're BLOCKED on semaphore.acquire()! They won't check until they get the semaphore.
    # - Tasks running: they'll finish (or be cancelled)
    
    # The problem: tasks blocked on semaphore.acquire() won't check first_exception.
    # We need to cancel them.
    
    # So the approach should be:
    # 1. Create all tasks
    # 2. Wait for any task to complete (using asyncio.wait with FIRST_COMPLETED)
    # 3. If a task raised, cancel all others
    # 4. If a task succeeded, go back to step 2
    # 5. When all done, return results
```

Wait, but this is getting complex. Let me think of a cleaner approach.

Actually, here's a cleaner approach:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    error_event = asyncio.Event()
    
    async def run_one(index, func):
        nonlocal first_exception
        try:
            await semaphore.acquire()
            if first_exception is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                    error_event.set()
            finally:
                semaphore.release()
        except asyncio.CancelledError:
            semaphore.release()  # Hmm, but if we were cancelled before acquiring...
            raise
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # Wait for all, but on error, cancel the rest
    # Use asyncio.wait in a loop? Or just wait for all and rely on the error_event?
    
    # Problem: if task 0 raises, tasks 5-9 are waiting on semaphore. They won't
    # check first_exception until they acquire. We need to cancel them.
    
    # Solution: after error_event is set, cancel all pending tasks.
    # But how do we "wait for error_event OR all tasks done"?
    
    # We can create a task that waits for error_event, and race it against waiting for all tasks.
    
    # Actually, simpler: just await all tasks. But in run_one, after acquiring semaphore,
    # check if error_event is set. If so, return immediately.
    # The problem is tasks stuck on semaphore.acquire().
    
    # Better: use a different synchronization. Instead of semaphore, use a queue or manual counting.
```

Let me try yet another approach. What if I don't use a semaphore but instead manage the pool manually?

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    first_exception = None
    error_event = asyncio.Event()
    
    # We'll use a worker pool approach
    # Actually no, let me think about this differently.
    
    # The simplest correct approach:
    # 1. Create all tasks wrapped with semaphore
    # 2. Await all of them
    # 3. In the wrapper, after acquiring semaphore, check if error occurred -> return
    # 4. For tasks stuck on semaphore: we need to cancel them
    
    # The cleanest way: after an error, cancel all tasks.
    # We can do this by racing: wait for (all tasks done) OR (error event set)
    
    async def wait_all():
        for t in tasks:
            await t
    
    # Hmm, but if I cancel tasks, wait_all will get CancelledError.
    
    # Let me try a different structure:
    
    # Use a single "supervisor" coroutine:
    # - It awaits tasks one by one using asyncio.wait(FIRST_COMPLETED)
    # - When a task completes with an exception, it cancels all remaining
    # - When a task completes successfully, it continues
```

Actually, I think the cleanest approach is:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    error_event = asyncio.Event()
    
    async def run_one(index, func):
        nonlocal first_exception
        await semaphore.acquire()
        try:
            if first_exception is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                    error_event.set()
        finally:
            semaphore.release()
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # Wait for error or all completion
    # Create a task that just waits for error_event
    async def wait_error():
        await error_event.wait()
    
    error_waiter = asyncio.ensure_future(wait_error())
    
    # Wait for either all tasks done or error
    done, pending = await asyncio.wait(
        set(tasks) | {error_waiter},
        return_when=asyncio.FIRST_COMPLETED
    )
    
    # Hmm, this doesn't work well because we need to wait for ALL tasks if no error.
```

This is getting complicated. Let me think of a simpler approach.

What if I just:
1. Create all tasks
2. Await all of them (they'll all complete - either successfully or by returning early due to first_exception check)
3. If first_exception is set, we still need to cancel running ones

Wait, the issue is: if task 0 raises, task 5 is currently awaiting `func()`. It will continue to run to completion. The requirement says we must CANCEL it.

So I really do need to actively cancel. Let me try:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    error_event = asyncio.Event()
    
    async def run_one(index, func):
        nonlocal first_exception
        await semaphore.acquire()
        try:
            if first_exception is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                    error_event.set()
        finally:
            semaphore.release()
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # We need to wait for all tasks, but if an error occurs, cancel the rest.
    # Strategy: wait for all tasks to complete. The error_event approach won't
    # cancel running tasks.
    
    # Alternative: use a wrapper that awaits the func but also watches for cancellation.
    # If we cancel the task, it will propagate CancelledError into the func's await.
    
    # So the plan:
    # 1. Await all tasks
    # 2. But we need to detect the error early to cancel others
    
    # Let me use asyncio.wait in a loop:
    remaining = set(tasks)
    while remaining:
        done, remaining = await asyncio.wait(remaining, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            if t.exception() is not None:  # Hmm, but our tasks catch exceptions internally
                ...
```

Wait, I'm overcomplicating this. The tasks catch exceptions internally (they set first_exception and don't re-raise). So all tasks will complete normally (no exception from the task itself). The tasks that are "running" when the error occurs will simply finish their current func() call.

But the requirement says: "cancel all still-running calls". So I MUST cancel them.

OK here's my revised plan:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_exception = None
    error_event = asyncio.Event()
    
    async def run_one(index, func):
        nonlocal first_exception
        await semaphore.acquire()
        try:
            if first_exception is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if first_exception is None:
                    first_exception = e
                    error_event.set()
        finally:
            semaphore.release()
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # Wait for either: all tasks done, or error_event set
    # If error: cancel all non-done tasks, wait for them to be cancelled, re-raise
    # If all done: return results
    
    # I'll use a "monitor" approach:
    # - Wait for all tasks to complete
    # - But in parallel, watch for error_event
    # - If error_event fires first, cancel all tasks
    
    # Actually, the simplest correct approach:
    # Just await all tasks. They will all complete (since we catch exceptions internally).
    # Tasks waiting on semaphore will eventually get a slot, check first_exception, and return.
    # Tasks running will finish their func().
    # But this violates "cancel all still-running calls"!
    
    # So I MUST cancel. Let me do it properly:
    
    # Use asyncio.wait to wait for the first task to complete, check if it was an error...
    # But our tasks don't raise (they catch internally).
    
    # New approach: make the tasks actually raise, and handle it at the gather level.
```

Let me restart with a cleaner design:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    
    async def run_one(index, func):
        async with semaphore:
            return await func()
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    
    # Now wait for all, but on first exception, cancel the rest
    # Use asyncio.wait in a loop:
    remaining = set(tasks)
    first_exc = None
    while remaining:
        done, remaining = await asyncio.wait(remaining, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            try:
                results[tasks.index(t)] = t.result()
            except Exception as e:
                if first_exc is None:
                    first_exc = e
        if first_exc is not None:
            # Cancel all remaining
            for t in remaining:
                t.cancel()
            # Wait for them to be cancelled
            if remaining:
                await asyncio.wait(remaining)
            raise first_exc
    
    return results
```

Wait, there's an issue with `tasks.index(t)` - that's O(n) and also might not work correctly if there are duplicate task objects (unlikely but let's be safe). Let me use a dict mapping task to index.

Also, there's a subtlety: when we cancel tasks that are waiting on the semaphore, they'll get CancelledError. When we cancel tasks that are running func(), they'll get CancelledError inside func(). The `asyncio.wait` after cancellation should handle this.

But wait - when we call `t.cancel()` on a task that's waiting on `semaphore.acquire()`, the CancelledError will be raised at the `await semaphore.acquire()` point. The `async with semaphore` won't have acquired, so no release needed. Good.

When we cancel a task that's inside `await func()`, the CancelledError propagates into func(). The `async with semaphore` will release in its `__aexit__`. Good.

Let me also handle the case where multiple tasks complete in the same "batch" from `asyncio.wait`. We should check all of them for exceptions.

Also, I need to be careful: `t.result()` will raise if the task was cancelled. But we only call `t.result()` on tasks in `done`, and we only cancel tasks in `remaining`. So `done` tasks should be either successful or have raised an exception.

Wait, actually there's a subtle issue. If we call `t.cancel()` on a task in `remaining`, and then `await asyncio.wait(remaining)`, those tasks will be in the done set of that wait. But we don't check their results, which is fine.

But what about the semaphore? If a task is cancelled while holding the semaphore, the `async with` will release it. Good.

Let me also think about: what if `limit >= len(funcs)`? Then all tasks start immediately. The semaphore never blocks. This should work fine.

What about `limit == 1`? Tasks run one at a time. The semaphore ensures only one runs at a time. When one finishes, the next acquires. Good.

Let me also consider: what if the exception is a BaseException (like KeyboardInterrupt)? The requirement says "if any call raises" - I'll catch Exception (not BaseException) to be safe. Actually, re-reading: "re-raise that first exception" - so I should catch Exception.

Wait, but what about CancelledError? In Python 3.9+, CancelledError is a BaseException, not Exception. So `except Exception` won't catch it. That's probably fine - if a task is cancelled by external means, that's different from our internal cancellation.

Actually, in our flow, we only cancel tasks ourselves when an error occurs. So CancelledError from our cancellation won't be caught by `except Exception`. But we don't need to catch it - we just need to wait for the cancelled tasks to finish being cancelled.

Let me refine:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    
    async def run_one(index, func):
        async with semaphore:
            return await func()
    
    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    task_to_index = {t: i for i, t in enumerate(tasks)}
    
    remaining = set(tasks)
    first_exc = None
    
    while remaining:
        done, remaining = await asyncio.wait(remaining, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            idx = task_to_index[t]
            try:
                results[idx] = t.result()
            except Exception as e:
                if first_exc is None:
                    first_exc = e
        if first_exc is not None:
            for t in remaining:
                t.cancel()
            if remaining:
                await asyncio.wait(remaining)
            raise first_exc
    
    return results
```

Hmm wait, there's a problem. When I do `await asyncio.wait(remaining)` after cancelling, the remaining tasks will be done (cancelled). But what if one of them had already acquired the semaphore and is running? The cancel will interrupt it. The `async with semaphore` will release. Good.

But what about tasks that haven't acquired the semaphore yet? They're waiting on `semaphore.acquire()`. When cancelled, they get CancelledError at that point. The `async with` hasn't started its body, so no release needed. Actually wait - `async with semaphore` calls `__aenter__` which calls `acquire()`. If cancelled during `acquire()`, the `__aenter__` raises CancelledError, and `__aexit__` is never called. But since we never acquired, there's nothing to release. Good.

Actually, let me double-check: `asyncio.Semaphore.__aenter__` calls `await self.acquire()`. If that's cancelled, it raises CancelledError. The `async with` statement would try to call `__aexit__` on exception... actually no. If `__aenter__` raises, `__aexit__` is NOT called. This is standard Python behavior. So we're fine.

One more thing: what if `t.result()` raises `asyncio.CancelledError`? This could happen if... actually no, we only call `t.result()` on tasks in `done` from the first `asyncio.wait`. Those tasks completed normally (either returned a value or raised an exception). They weren't cancelled by us (we only cancel `remaining`). So `t.result()` will either return a value or raise the exception that the task raised. Good.

Wait, but what if a task was cancelled by an external source (not by us)? Then `t.result()` would raise CancelledError. Since CancelledError is a BaseException (not Exception) in 3.9+, our `except Exception` won't catch it. So it would propagate out of the function. Is that OK? I think so - if an external cancellation happens, it's reasonable to propagate it.

Actually, hmm. Let me reconsider. If a task is externally cancelled, `t.result()` raises CancelledError. Since we don't catch it (it's not an Exception), it propagates out of `gather_limited`. That seems reasonable.

But wait - what if the task raised a regular Exception, and `t.result()` raises it. We catch it with `except Exception`. Good.

I think this solution is correct. Let me also handle the edge case where `done` might contain a task that was cancelled (externally). In that case, `t.result()` raises CancelledError, which is not caught by `except Exception`, so it propagates. That's fine.

Actually, I realize there might be an issue with `asyncio.wait` and cancelled tasks. If a task in `remaining` gets cancelled externally while we're in `await asyncio.wait(remaining, ...)`, it will appear in `done`. Then `t.result()` raises CancelledError. Since it's not caught by `except Exception`, it propagates. Fine.

Let me also think about: after we cancel all remaining tasks and do `await asyncio.wait(remaining)`, could there be an issue? The tasks will be cancelled, they'll clean up (release semaphore if held), and complete. `asyncio.wait` will return with all of them in `done`. We don't inspect their results. Then we `raise first_exc`. Good.

One more consideration: the `raise first_exc` - this re-raises the exception. In Python, `raise first_exc` will set the traceback to the current frame. If we want to preserve the original traceback, we could use `raise first_exc` (which actually does preserve the traceback in CPython). Actually, `raise exc` where exc is an exception instance - the traceback is preserved if the exception already has one. Let me verify: yes, when you do `raise some_exception`, Python uses the exception's existing `__traceback__` if it has one. Since the exception was caught from `t.result()`, it should have the original traceback. Good.

Wait, actually I need to double-check. `t.result()` re-raises the exception that was stored in the task. The traceback should be preserved. Yes, I believe so.

Let me finalize the solution:

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)

    async def run_one(index, func):
        async with semaphore:
            return await func()

    tasks = [asyncio.ensure_future(run_one(i, f)) for i, f in enumerate(funcs)]
    task_to_index = {t: i for i, t in enumerate(tasks)}

    remaining = set(tasks)
    first_exc = None

    while remaining:
        done, remaining = await asyncio.wait(remaining, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            idx = task_to_index[t]
            try:
                results[idx] = t.result()
            except Exception as e:
                if first_exc is None:
                    first_exc = e
        if first_exc is not None:
            for t in remaining:
                t.cancel()
            if remaining:
                await asyncio.wait(remaining)
            raise first_exc

    return results
```

Wait, I want to double-check the "start the next one as soon as any slot frees up (not in fixed batches)" requirement. With the semaphore approach, all tasks are created upfront. They all try to acquire the semaphore. The first `limit` acquire immediately. The rest wait. When one releases, the next waiter acquires. This is exactly "start the next one as soon as any slot frees up." No batching. ✓

"Return the results in the same order as funcs" - we use `task_to_index` to place results at the correct index. ✓

"If any call raises: cancel all still-running calls, do not start any new ones, and re-raise that first exception" - we cancel remaining tasks, don't start new ones (all were already created but blocked on semaphore), re-raise first_exc. ✓

"Raise ValueError if limit < 1" ✓
"An empty list returns []" ✓
"Use asyncio only" ✓

I think this is correct. Let me also consider: what if `funcs` contains something that's not callable or doesn't return an awaitable? The problem statement says they are zero-argument callables returning awaitables, so I don't need to validate that.

One more thought: should I handle the case where `limit > len(funcs)`? The semaphore would just never block, all tasks run concurrently. That's fine and correct.

I'm satisfied with this solution. Let me write the final version.
