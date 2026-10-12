Let me write an async function `gather_limited` that:

1. Takes a list of zero-argument callables returning awaitables, and a limit
2. Runs them with at most `limit` concurrent tasks
3. Starts next task as soon as a slot frees (not batched)
4. Returns results in original order
5. On exception: cancels all running, doesn't start new, re-raises first exception
6. Raises ValueError if limit < 1
7. Empty list returns []

Approach: I'll use an asyncio.Semaphore to limit concurrency, but actually a semaphore won't easily give me "start next as soon as one finishes" while maintaining order and cancellation semantics.

Better approach: Use a queue of tasks with manual slot management. Or use a semaphore-based approach with proper cancellation.

Actually, let me think about this more carefully. The semaphore approach:
- Acquire semaphore before starting
- Release when done
- This naturally gives "start next as soon as one finishes"

But for cancellation on error, I need to track all running tasks and cancel them when one fails.

Let me think about the design:

1. Create a list of results (pre-allocated)
2. Use a semaphore to limit concurrency
3. For each task, acquire semaphore, create task, when done release semaphore
4. Track all tasks for cancellation
5. On first exception, cancel all remaining tasks and re-raise

Actually, a cleaner approach:

- Create all tasks upfront? No, that would start them all at once.
- Use a worker pool pattern or semaphore-based approach.

Let me use the semaphore approach:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    tasks = []
    
    async def run(index, func):
        async with semaphore:
            results[index] = await func()
    
    # Create tasks for all funcs, but they'll be gated by semaphore
    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]
    
    # Wait for all, but if one fails, cancel others
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
    
    # Check if any task raised
    for task in done:
        if task.exception():
            # Cancel all pending and other done tasks
            for t in pending:
                t.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            raise task.exception()
    
    return results
```

Wait, there's a subtlety. `asyncio.wait` with `FIRST_EXCEPTION` - if a task raises, it will be in `done` with an exception. But other tasks might also complete (successfully) while we're waiting. We need to cancel ALL still-running tasks.

Actually, when a task raises an exception, the `async with semaphore` block will release the semaphore. Other waiting tasks (waiting on semaphore) will then proceed. But we want to NOT start new ones.

Hmm, this is tricky with the semaphore approach. If task 0 fails, tasks waiting on the semaphore will acquire it and start. We need to prevent that.

Better approach: Use an Event to signal "stop" when an error occurs, and check it in the run function.

Actually, let me reconsider. The `asyncio.wait` with FIRST_EXCEPTION - once one task raises, we cancel the rest. But the issue is that between the exception and our cancellation, other tasks might have already acquired the semaphore and started.

Wait no - `asyncio.wait` returns as soon as one task finishes (with exception). At that point, we cancel all pending tasks. The pending tasks include those waiting on the semaphore. When we cancel a task that's waiting on `semaphore.acquire()`, it will raise CancelledError in that task, which will propagate through `async with semaphore` without acquiring.

But what about tasks that already acquired the semaphore and are running? We cancel them too, which will raise CancelledError in their `await func()` call.

Actually, I think there's a race condition: between `asyncio.wait` returning and us cancelling, a waiting task might acquire the semaphore and start. But since we're in a single-threaded event loop, once `asyncio.wait` returns, no other coroutine can run until we yield control. So cancelling immediately after should be safe.

Wait, actually `asyncio.wait` with `FIRST_EXCEPTION` returns when the first task completes (successfully or with exception). But multiple tasks might complete at the same time. The `done` set contains all completed tasks. We need to check if ANY of them raised.

Let me also handle the case where a task is cancelled vs raises an exception. `asyncio.CancelledError` is a BaseException in Python 3.9+, not caught by regular exception handling.

Let me refine:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    
    async def run(index, func):
        async with semaphore:
            results[index] = await func()
    
    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]
    
    # Use FIRST_COMPLETED to handle exceptions early
    # Actually, let me use a different approach
    
    # Wait for all tasks, but handle first exception
    try:
        await asyncio.gather(*tasks)
    except (Exception, asyncio.CancelledError):
        # Cancel remaining tasks
        for t in tasks:
            if not t.done():
                t.cancel()
        # Wait for cancellations to complete
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    
    return results
```

Hmm, but `asyncio.gather` without `return_exceptions=True` will raise the first exception. But by the time it raises, other tasks might still be running. And we need to cancel them.

Actually wait - when `gather` raises, does it cancel the other tasks? Let me check... No! `asyncio.gather` does NOT cancel other tasks when one fails (unless you use `return_exceptions=True` in which case it waits for all). Without `return_exceptions=True`, it raises the first exception but the other tasks continue running.

So I need to manually cancel. Let me use this approach:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    
    async def run(index, func):
        async with semaphore:
            results[index] = await func()
    
    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]
    
    try:
        await asyncio.gather(*tasks)
    except BaseException:
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    
    return results
```

Wait, but there's an issue. When `gather` raises the first exception, other tasks are still running. We cancel them. But what if another task already completed with an exception before we cancel? The `gather` call will only re-raise the first one. That's fine per the spec.

But there's another issue: when a task raises inside `async with semaphore`, the semaphore is released. Then a waiting task acquires it and starts. Between the exception propagating up through `gather` and our `cancel()` calls, the event loop might run those waiting tasks. 

Actually no - in asyncio, when `gather` catches the exception, it doesn't yield to the event loop before returning. The exception propagates immediately. Then our `except` block runs, cancels tasks, and awaits. During that `await asyncio.gather(*tasks, return_exceptions=True)`, the cancelled tasks will process their cancellations.

But wait - between the task raising and `gather` catching it, does the event loop get a chance to run? Let me think...

When task A raises, it calls its done callback. `gather` has a done callback that catches the exception and raises it in the gathering coroutine. This all happens synchronously within the event loop's handling of task A's completion. No other task gets to run between A's exception and gather's catch.

Actually, I'm not 100% sure about this. Let me think about it differently.

When `asyncio.wait(tasks, return_when=FIRST_EXCEPTION)` is used, it returns as soon as one task completes with an exception. But actually, `FIRST_EXCEPTION` means it returns when any task completes (not just exception). No wait - `FIRST_EXCEPTION` waits until the first task that ends (completed or raised) triggers. Hmm, actually looking at the docs: "Wait until the first exception is raised." But in practice, it returns when any task completes if it's an exception, or when all complete successfully.

Actually I just looked it up: `FIRST_EXCEPTION` - "Return when the first exception is raised (or all tasks finish if none raise)." So it waits for all to finish if no exception.

Hmm, let me just go with the `gather` approach which is simpler:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    
    async def run(index, func):
        async with semaphore:
            results[index] = await func()
    
    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]
    
    try:
        await asyncio.gather(*tasks)
    except BaseException:
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    
    return results
```

Wait, but there's still the issue of tasks that might start after an exception. Let me think again...

When task 0 raises an exception:
1. Task 0's coroutine finishes with exception
2. The semaphore is released (because `async with` exits)
3. The task's done callback fires
4. `gather`'s internal callback fires, storing the exception
5. `gather` schedules the parent coroutine to resume with the exception

Now, between step 2 and step 5, can another task acquire the semaphore and start? In CPython's asyncio, when a semaphore is released, it wakes up a waiter by calling `waiter.set_result(None)`. This makes the waiting `acquire()` coroutine ready. But it doesn't immediately run - it's scheduled as a callback. Then the task A's exception propagates to gather.

Actually, I think the issue is: when the semaphore is released, it calls `self._wake_up_next()` which does `self._waiters.pop(0).set_result(None)`. This marks the future as done, which schedules the awaiting coroutine to resume. But resuming happens when the event loop gets to it.

The sequence in the event loop:
1. Task 0's `await func()` raises
2. `async with semaphore` releases the semaphore → wakes up task 1's `acquire()`
3. Task 0 finishes with exception → `gather` is notified
4. Event loop processes ready callbacks...

At this point, both task 1 (now unblocked) and the gather exception handler are ready. The order depends on the event loop implementation. In CPython, it's FIFO order of the ready callbacks.

Actually, step 2 creates a ready callback for task 1. Step 3 also creates a ready callback for the gather parent. Since step 2 happened first, task 1 might get to run first!

So there IS a race condition where task 1 could start executing after task 0's failure but before gather processes the exception.

To handle this properly, I should use a flag:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    first_error = None
    
    async def run(index, func):
        nonlocal first_error
        async with semaphore:
            if first_error is not None:
                return  # or raise CancelledError
            results[index] = await func()
    
    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]
    
    try:
        await asyncio.gather(*tasks)
    except BaseException as exc:
        first_error = exc
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    
    return results
```

Hmm, but this still has issues. The `first_error` check inside `async with semaphore` - after acquiring the semaphore, we check if there's an error. But what about the `await func()` - it's already started.

Actually, a simpler approach: use `asyncio.Event` or a flag, and also cancel tasks properly. But the cancellation approach should work:

When we cancel a task that's waiting on `semaphore.acquire()`, the `async with semaphore` will raise CancelledError, and the task won't start. The semaphore won't be acquired.

The race condition I identified: after task 0 fails, the semaphore is released, task 1 acquires it. Then before task 1 can actually start executing `func()`, it needs to yield. If task 1's code is:
```python
async with semaphore:  # acquires here
    results[index] = await func()  # yields here
```

After acquiring the semaphore, `await func()` yields. At this point, the gather exception handler can run and cancel task 1. The cancellation will be delivered at the next `await` point, which is inside `func()`. So `func()` gets cancelled.

But what if `func()` doesn't have an `await` immediately? Like if it's `lambda: asyncio.sleep(0)`. Then `await func()` → `await asyncio.sleep(0)` → yields → gets cancelled. OK that works.

What if the func returns a coroutine that doesn't yield immediately? Like `lambda: some_coroutine()` where `some_coroutine` does `return 42` without any await? Then it runs to completion before getting a chance to be cancelled. But that's fine - it completed successfully, and we already have results[index] set. The gather will still raise the first exception.

I think the cancel approach is actually fine in practice. The semaphore release happens as part of task 0's cleanup, and the cancellation in our except block will catch task 1 at its next await point.

But wait - there's another subtle issue. If task 1 acquires the semaphore and then task 1's `func()` immediately raises a DIFFERENT exception (without yielding), then both task 0 and task 1 have exceptions. `gather` will re-raise the first one (task 0's), which is what we want.

Let me also think about: what if we cancel a task that's already completed (successfully)? `task.cancel()` on a completed task is a no-op. Good.

What about `asyncio.gather(*tasks, return_exceptions=True)` after cancellation - this waits for all tasks to finish (including cancelled ones). CancelledError is returned as a value rather than raised. This is correct cleanup.

One more thing: the `except BaseException` catches CancelledError too. If the `gather_limited` coroutine itself is cancelled, we want to clean up and re-raise. But we also cancel all child tasks. The `await asyncio.gather(*tasks, return_exceptions=True)` might itself raise CancelledError if the outer task is cancelled again. Hmm, this is an edge case.

Actually, for the outer cancellation case, we might want:
```python
except BaseException as exc:
    for t in tasks:
        if not t.done():
            t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    raise
```

If the outer is cancelled, `asyncio.gather(*tasks, return_exceptions=True)` should not propagate the cancellation (since return_exceptions=True). Actually, I'm not sure about this. Let me think...

With `return_exceptions=True`, `gather` waits for all futures to complete and returns a list of results/exceptions. If the gather coroutine itself is cancelled while waiting, it will raise CancelledError. But at this point we're already handling an exception, and we're trying to clean up. This is a tricky edge case.

For a robust solution, I could use a try/finally or shield, but let's keep it simple and handle the main cases. The problem statement says "If any call raises: cancel all still-running calls" - this is about the child calls raising, not the outer function being cancelled.

Let me also consider: should I catch `Exception` or `BaseException`? The problem says "if any call raises" - I'll use `BaseException` to be safe (catches CancelledError from child tasks too, though normally child tasks shouldn't raise CancelledError unless we cancel them).

Actually, `asyncio.CancelledError` inherits from `BaseException` in Python 3.9+. If a child task is cancelled by the user (not by us), `gather` without `return_exceptions` will raise it. We should catch it and re-raise.

Let me also make sure: when we `await asyncio.gather(*tasks)` and a task raises, does `gather` immediately raise or does it wait for all? Without `return_exceptions=True`, it raises the first exception immediately (other tasks continue running). That's what we want - raise quickly, then we cancel the rest.

Wait, actually I need to double-check this. From Python docs: "If gather() is cancelled, all submitted awaitables (that have not completed yet) are also cancelled." And: "If any child is cancelled, it is treated as if it raised CancelledError – in this case, gather() will raise a CancelledError if return_exceptions is False."

"By default, if any child task raises an exception, it is immediately propagated to the task that awaits on gather(). Other awaitables in the aws sequence won't be cancelled and will continue to run."

So yes, `gather` without `return_exceptions` raises the first exception immediately, other tasks continue. Then we cancel them. Good.

I think my solution is correct. Let me finalize it.

Actually, one more thought: the problem says "do not start any new ones". With the semaphore approach, tasks that haven't acquired the semaphore haven't started yet (they're waiting in `acquire()`). When we cancel them, they never call `func()`. Tasks that already acquired the semaphore and are in `await func()` - those are "still running". So "do not start any new ones" means don't let tasks acquire the semaphore and start. Cancellation handles this because `async with semaphore` will raise CancelledError at the acquire point.

But what about the race: semaphore released by failed task → next task's acquire returns → next task starts func() → THEN we cancel it. The func() was already called. Is that "starting a new one"? Technically yes, the func was invoked. 

To truly prevent starting new ones, I need the flag approach. Let me add that:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    error = None  # will be set when first error occurs
    
    async def run(index, func):
        nonlocal error
        async with semaphore:
            if error is not None:
                return
            try:
                results[index] = await func()
            except Exception as e:
                if error is None:
                    error = e
                raise
    
    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]
    
    try:
        await asyncio.gather(*tasks)
    except BaseException:
        error = ...  # hmm, how to set error here?
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    
    return results
```

Hmm, this gets complicated. Let me think differently.

The issue: between task 0 failing and our cancel() running, task 1 might start. To prevent this, I need the flag check. But setting the flag...

Actually, the flag IS set by the task that fails (before the exception propagates to gather). Let me restructure:

```python
async def run(index, func):
    nonlocal first_exception
    async with semaphore:
        if first_exception is not None:
            return
        try:
            result = await func()
            results[index] = result
        except Exception as e:
            if first_exception is None:
                first_exception = e
            raise
```

When task 0 fails: it sets `first_exception = e`, then raises. The exception propagates, semaphore is released. Task 1 wakes up, acquires semaphore, checks `first_exception is not None` → True → returns without calling func. 

But wait - task 1 returning normally (not raising) means gather sees it as successful. Then gather raises task 0's exception. Good.

What about CancelledError? Should I also check for that? If the outer gather_limited is cancelled, tasks might get CancelledError. Let me also handle that:

```python
async def run(index, func):
    nonlocal first_exception
    async with semaphore:
        if first_exception is not None:
            return
        try:
            results[index] = await func()
        except BaseException as e:
            if first_exception is None:
                first_exception = e
            raise
```

Actually, let me simplify. The `gather` will raise the first exception. I'll use a flag just to prevent new starts:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    errored = False
    
    async def run(index, func):
        nonlocal errored
        async with semaphore:
            if errored:
                return
            try:
                results[index] = await func()
            except Exception:
                errored = True
                raise
    
    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]
    
    try:
        await asyncio.gather(*tasks)
    except BaseException:
        errored = True
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    
    return results
```

Wait, but `errored` is set inside the task before the exception propagates to gather. And the semaphore release and gather's exception handling happen after. The flag check in other tasks will see `errored = True` before they call `func()`. But there's still a tiny window:

1. Task 0: `errored = True` (set in except)
2. Task 0: raise → propagates through `async with semaphore` → semaphore released → task 1's `acquire()` returns
3. Task 1: checks `if errored:` → True → returns

Wait, steps 1-3 happen... when? Step 1 and the raise happen in the same synchronous block (the except clause). The `async with` `__aexit__` (which releases the semaphore) happens as part of the exception propagation, still synchronous. Then the task is marked as done with exception. Then gather's callback fires.

But task 1's `acquire()` returning - when does task 1 actually resume execution? It was suspended at `await semaphore.acquire()`. The `set_result` on the future schedules it. It won't run until the event loop processes it.

The sequence:
- Task 0 is running, hits `await func()` which raises
- except: sets `errored = True`, re-raises
- `async with` exits: `semaphore.release()` → `self._wake_up_next()` → task 1's future `set_result(None)` → task 1 is added to ready queue
- Task 0 finishes (with exception) → task's done callbacks fire → gather's callback stores exception, schedules parent to raise
- Event loop's next iteration: processes ready queue. Task 1 or gather parent? Both are ready.

In CPython asyncio, `call_soon` adds to a deque. Task 1 was added first (during semaphore.release), then gather's callback. So task 1 might run first!

But task 1 will check `if errored:` which is already True (set in step 1, which is synchronous before the yield). So task 1 won't call `func()`. 

What about a task that was ALREADY past the `errored` check and is in `await func()`? That's a task that already started, so it's "still running". We'll cancel it. That's correct behavior.

What about a task that acquired the semaphore in the same event loop iteration but hasn't yet checked `errored`? If it's suspended at `await semaphore.acquire()` and gets woken up, it will resume at the line after `acquire()`, which is `if errored: return`. Since `errored` is already True, it returns. Good.

But wait - what if multiple tasks are waiting on the semaphore? When task 0 releases, only ONE waiter is woken. If task 1 is woken and checks `errored` → True → returns. The semaphore is released again (since `async with` exits without an error... wait, task 1 just returns from the `async with` block normally. `__aexit__` releases the semaphore. Then the next waiter is woken.

Hmm, so after task 1 returns (having not done work), the semaphore is released again, waking task 2. Task 2 checks `errored` → True → returns. And so on until all tasks have cycled through. Then gather completes.

This is O(n) unnecessary cycles but is correct. For a cleaner approach, I could skip the semaphore entirely for tasks after the error. But for correctness, this works.

Actually wait - there's a problem. Task 1 does `return` inside `async with semaphore`. This means `__aexit__` is called, which calls `semaphore.release()`. This releases an extra permit! The semaphore was acquired in task 1's `acquire()`, then task 1 returns (releasing it via `__aexit__`). Net effect: one acquire + one release = no change. Actually that's correct - the semaphore count goes back.

Wait no. Task 1 did:
```
async with semaphore:  # acquire() → semaphore count decreases
    if errored:
        return  # exits the with block → __aexit__ → release() → semaphore count increases
```
Net: acquire + release = no change. The semaphore is in the same state as before task 1 acquired it. Then the next waiter gets woken by the release. Correct.

OK but this cascading release and wake-up could be an issue performance-wise for large lists, but functionally correct.

Actually, I realize there might be an issue. When task 1 returns from `async with semaphore`, `__aexit__` releases the semaphore. This calls `_wake_up_next()` which wakes task 2. Task 2 will acquire, check errored, return, release, wake task 3... This creates a chain of releases and wake-ups. Each one is processed in a separate event loop iteration. So for N tasks, it takes N event loop iterations to drain. But functionally correct.

Alternatively, after the error, I could just cancel all tasks immediately and not worry about this. Let me go with the simpler approach: just rely on cancellation.

Actually, let me reconsider. The problem says "do not start any new ones". With pure cancellation:
1. Task 0 fails
2. Semaphore released, task 1 acquires it
3. Task 1 calls `await func()` - this "starts" func
4. Before func yields, gather raises
5. We cancel task 1 - but func was already called!

With the flag:
1. Task 0 fails, sets `errored = True`
2. Semaphore released, task 1 acquires it  
3. Task 1 checks `errored` → True → returns WITHOUT calling func

The flag approach truly prevents "starting" new calls. I'll go with it.

Let me also handle the case where `errored` might need to be set in the outer except too (for edge cases like CancelledError on the gather itself).

Final version:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    semaphore = asyncio.Semaphore(limit)
    errored = False

    async def run(index, func):
        nonlocal errored
        async with semaphore:
            if errored:
                return
            try:
                results[index] = await func()
            except BaseException:
                errored = True
                raise

    tasks = [asyncio.create_task(run(i, f)) for i, f in enumerate(funcs)]

    try:
        await asyncio.gather(*tasks)
    except BaseException:
        errored = True
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise

    return results
```

Hmm, I'm using `BaseException` for catching. In Python 3.9+, `CancelledError` is `BaseException`. If a child task is cancelled (by us), `gather` without `return_exceptions` will raise `CancelledError`. But we're in the `try` block calling `gather` for the first time - at that point, no child has been cancelled by us yet. So `CancelledError` from `gather` would only happen if an external cancel reaches a child task. Let me keep `BaseException` for safety.

Wait, actually there's a subtle issue with `await asyncio.gather(*tasks, return_exceptions=True)` in the except block. If the `gather_limited` function itself is cancelled during this cleanup await, the `return_exceptions=True` gather will... hmm. Actually, if the outer coroutine is cancelled, the `await` on the cleanup gather will raise CancelledError. But we're in an except block re-raising... Actually the `raise` at the end won't execute if the cleanup await raises CancelledError.

This is getting into very edge-case territory. For the purpose of this problem, I'll keep it simple. The problem says "If any call raises: cancel all still-running calls, do not start any new ones, and re-raise that first exception." This implies the function itself isn't being cancelled - a child call raised.

Let me also double-check: "re-raise that first exception" - `gather` without `return_exceptions` raises the first exception that occurs. Then we `raise` in the except block. Good.

One more thing: should `errored` be set to `True` only for "real" exceptions, or also for the cleanup? I'll set it in the except of `run` (so it's set before the exception propagates) and also in the outer except (belt and suspenders for edge cases).

I think this solution is correct. Let me finalize it.
