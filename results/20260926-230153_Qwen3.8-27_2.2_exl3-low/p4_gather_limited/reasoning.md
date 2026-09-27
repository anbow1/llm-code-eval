Let me think through this carefully.

We need `async def gather_limited(funcs, limit: int) -> list` that:
1. Runs coroutines with at most `limit` concurrent
2. Starts next as soon as a slot frees up (not fixed batches)
3. Returns results in same order as `funcs`
4. If any call raises: cancel all still-running, don't start new ones, re-raise the first exception
5. ValueError if limit < 1, empty list returns []

Approach:
- Use a semaphore-like pattern, but with "start next as soon as a slot frees up" - this is essentially a sliding window.
- I'll use an asyncio.Semaphore to control concurrency, and process tasks as they complete.

Actually, let me think about this more carefully. The key requirement is:
- At most `limit` running at once
- Start next as soon as any slot frees up (not fixed batches)
- Results in order
- On error: cancel all running, don't start new, re-raise first exception

One clean approach:
- Create tasks for all funcs, but use a semaphore to limit concurrency
- Use `asyncio.gather` with `return_exceptions=True` to get all results
- But this doesn't work well because gather starts all tasks immediately...

Better approach: Use a worker pool pattern.
- Have `limit` workers
- Each worker pulls the next task from a queue/iterator
- Collect results in order

Actually, the simplest approach that satisfies "start next as soon as a slot frees up":

Use an asyncio.Semaphore. For each func, acquire the semaphore before running it. This way, at most `limit` are running at once, and the next one starts as soon as a slot frees up.

But with semaphore + gather, all tasks are created but they block on the semaphore. That works for concurrency limiting.

However, the error handling is tricky. If one task raises, we need to:
1. Cancel all still-running tasks
2. Not start new ones
3. Re-raise the first exception

Let me think of a different approach:

Use a manual approach with a task queue:
- Create all tasks upfront, but wrap each in a semaphore acquisition
- Use `asyncio.gather` with `return_exceptions=True`
- After gather completes, check results for exceptions
- If any exception found, we need to handle the cancellation

Wait, but if we use gather with return_exceptions=True, it waits for ALL tasks to complete. That's fine - it will wait for all of them. But if one raises, the others will still complete (or we need to cancel them).

Actually, let me reconsider. The requirement says "cancel all still-running calls, do not start any new ones, and re-raise that first exception."

So the behavior is:
- If task i raises an exception, we should:
  - Cancel tasks that are still running (tasks j > i that haven't completed yet, or tasks that are in-flight)
  - Not start tasks that haven't been started yet
  - Re-raise that exception

Let me think about this with a worker pool approach:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    exceptions = []
    
    # Use a queue of task indices and worker pool
    # Each worker grabs the next index, runs it, stores result
    
    import asyncio
    
    task_queue = asyncio.Queue()
    for i in range(len(funcs)):
        await task_queue.put(i)
    
    # Or better, use a simple counter/iterator
    
    async def worker():
        while True:
            try:
                idx = task_queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            try:
                results[idx] = await funcs[idx]()
            except Exception as e:
                exceptions.append(e)
                # Signal to stop
                # But we need to handle this atomically
    
    # Hmm, this gets complicated with the error handling
```

Let me think differently. A cleaner approach:

Use asyncio.Semaphore + gather, but handle errors:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    sem = asyncio.Semaphore(limit)
    
    async def run(idx):
        async with sem:
            return await funcs[idx]()
    
    # Create all tasks, gather with return_exceptions
    tasks = [asyncio.ensure_future(run(i)) for i in range(len(funcs))]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Check for exceptions
    for i, r in enumerate(results):
        if isinstance(r, BaseException):
            # Cancel all not-yet-done tasks
            for t in tasks:
                if not t.done():
                    t.cancel()
            raise r
    
    return results
```

Wait, but there's a subtlety. With `asyncio.gather(*tasks, return_exceptions=True)`, ALL tasks will run to completion (or be cancelled). If one raises, the others will still complete because gather waits for all. That's fine - we cancel the ones that are still running after gather returns.

But actually, if a task raises, the others might still be running when gather returns. We cancel them. But we should also NOT start new ones. With the semaphore approach, all tasks are already created (they're just waiting on the semaphore). So "not start new ones" is a bit ambiguous - they're all created but gated by the semaphore.

Hmm, actually the requirement says "do not start any new ones" - meaning if task 3 raises, tasks 4, 5, 6 that haven't started yet should not start. With the semaphore approach, if we cancel the tasks, they won't start.

Let me reconsider: when gather returns with return_exceptions=True, it means all tasks have completed (either successfully or with exception). So by the time we check results, all tasks are done. The "cancel all still-running" part is actually already handled because gather waited for all of them.

Wait no - gather with return_exceptions=True waits for ALL tasks. So by the time it returns, all tasks are done. There's nothing to cancel.

But the requirement says "cancel all still-running calls, do not start any new ones." This implies that when an error occurs, we should stop the pipeline. With gather, all tasks run to completion. That might not be what we want.

Let me re-read: "If any call raises: cancel all still-running calls, do not start any new ones, and re-raise that first exception."

I think the intent is:
- As soon as one task raises, stop everything else
- Don't let other tasks continue
- Don't start tasks that haven't been started yet

So the approach should be more reactive. Let me use a different pattern:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    next_idx = 0
    running = {}  # task -> idx
    error = None
    
    # Use a condition/queue approach
    # Actually, let me use a simpler approach with asyncio primitives
    
    # Let me use a different pattern:
    # - Maintain a set of running tasks
    # - When a task completes (success or error), start the next one
    # - If error, cancel all running and stop
    
    import asyncio
    
    pending = set()
    results = [None] * len(funcs)
    first_error = None
    next_idx = 0
    
    # We need to start tasks and handle their completion
    # This is essentially a sliding window
    
    # Let me use a different approach:
    # Create a "runner" that manages the pool
    
    # Actually, the cleanest approach might be:
    # Use a queue of coroutines, with limit workers
    
    async def worker(idx):
        nonlocal first_error
        result = await funcs[idx]()
        return result
    
    # Hmm, let me think about this differently.
    
    # Approach: Use asyncio.TaskGroup (3.11+)
    # But TaskGroup cancels all on first exception, which is what we want!
    
    # Wait, but TaskGroup doesn't limit concurrency. We need a semaphore.
    
    # Let me use TaskGroup + Semaphore:
    
    async with asyncio.TaskGroup() as tg:
        sem = asyncio.Semaphore(limit)
        for i in range(len(funcs)):
            async def run(i=i):
                async with sem:
                    return await funcs[i]()
            tg.create_task(run())
    
    # But TaskGroup will cancel all tasks on first exception, which is exactly what we want!
    # And it re-raises the first exception.
    # But we need results in order...
```

Hmm, TaskGroup cancels all tasks when one fails. That's the error behavior we want. But we need to collect results in order.

With TaskGroup, if one task raises, all others are cancelled. The cancelled tasks will raise CancelledError. We need to handle that.

Actually, let me reconsider. With TaskGroup:
- All tasks are created (but gated by semaphore)
- If one raises, TaskGroup cancels all others
- TaskGroup re-raises the first exception
- But we can't easily get partial results

Let me try a manual approach:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    next_idx = 0
    running = {}  # task -> idx
    error = None
    
    # We need a way to await completion of running tasks
    # and start new ones as slots free up
    
    # Use a queue for completion notification
    done_queue = asyncio.Queue()
    
    async def run_task(idx):
        nonlocal error
        try:
            result = await funcs[idx]()
            return ('ok', idx, result)
        except Exception as e:
            return ('err', idx, e)
    
    # Start initial batch
    for _ in range(min(limit, len(funcs))):
        idx = next_idx
        next_idx += 1
        task = asyncio.ensure_future(run_task(idx))
        running[task] = idx
    
    # Wait for completions
    while running:
        # Wait for any task to complete
        done, _ = await asyncio.wait(set(running.keys()))
        for task in done:
            idx = running.pop(task)
            status, idx, value = task.result()
            if status == 'ok':
                results[idx] = value
            else:
                error = value
                # Cancel all still running
                for t in running:
                    t.cancel()
                running.clear()
                break
            # Start next if available
            if next_idx < len(funcs) and error is None:
                new_idx = next_idx
                next_idx += 1
                task = asyncio.ensure_future(run_task(new_idx))
                running[task] = new_idx
    
    if error is not None:
        raise error
    
    return results
```

Wait, there's an issue. When I call `task.result()`, if the task was cancelled, it will raise CancelledError. But I'm only calling result() on tasks that completed successfully (they're in the `done` set from asyncio.wait). Actually, `asyncio.wait` returns tasks that are done (finished or cancelled). So a cancelled task would be in `done`. But in the normal flow, tasks aren't cancelled until we hit an error.

Let me reconsider. The `run_task` function catches exceptions internally and returns a tuple. So the task itself won't raise (unless it's cancelled). If it's cancelled, `task.result()` will raise CancelledError.

Actually, let me restructure:

```python
async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    
    results = [None] * len(funcs)
    next_idx = 0
    running = {}  # task -> idx
    first_error = None
    
    async def run_task(idx):
        return await funcs[idx]()
    
    # Start initial batch
    for _ in range(min(limit, len(funcs))):
        idx = next_idx
        next_idx += 1
        task = asyncio.ensure_future(run_task(idx))
        running[task] = idx
    
    while running:
        done, _ = await asyncio.wait(set(running.keys()))
        for task in done:
            idx = running.pop(task)
            try:
                results[idx] = task.result()
            except Exception as e:
                first_error = e
                # Cancel all still running
                for t in running:
                    t.cancel()
                running.clear()
                break
            # Start next
            if next_idx < len(funcs) and first_error is None:
                new_idx = next_idx
                next_idx += 1
                task = asyncio.ensure_future(run_task(new_idx))
                running[task] = new_idx
        if first_error is not None:
            break
    
    if first_error is not None:
        raise first_error
    
    return results
```

Wait, there's a subtle issue. When we process multiple `done` tasks in the for loop, we might start new tasks within the same iteration. That's fine - we're maintaining the sliding window.

But there's another issue: if multiple tasks complete in the same `asyncio.wait` call, and one of them has an error, we should cancel the others that are still running. But tasks in `done` are already done, so we don't need to cancel them. We only cancel tasks still in `running` (not yet done).

Let me trace through:
- Say limit=3, funcs has 5 items
- Start tasks 0, 1, 2
- asyncio.wait returns, say task 1 completes first
- results[1] = value
- Start task 3
- asyncio.wait returns, task 0 completes
- results[0] = value
- Start task 4
- asyncio.wait returns, task 3 raises
- first_error = exception
- Cancel tasks 2 and 4 (still running)
- running is cleared
- break
- raise first_error

That looks correct!

But wait - what if task 3 raises AND task 4 also raises in the same batch? We process them in order. If task 3 is processed first and raises, we cancel task 4. But task 4 is in `done` already... Actually no, if both are in `done`, they both completed. So we'd process task 3 first (it's in the done set), hit the error, then we'd try to process task 4 but running is cleared. Actually, the `for task in done` loop would continue to task 4, but `running.pop(task)` would... wait, we already cleared running. Hmm.

Let me fix this:

```python
while running:
    done, _ = await asyncio.wait(set(running.keys()))
    if first_error is not None:
        break
    for task in done:
        idx = running.pop(task)
        try:
            results[idx] = task.result()
        except Exception as e:
            first_error = e
            for t in running:
                t.cancel()
            running.clear()
            break
        if next_idx < len(funcs):
            new_idx = next_idx
            next_idx += 1
            task = asyncio.ensure_future(run_task(new_idx))
            running[task] = new_idx
```

Actually, if `first_error` is set, we break out of the for loop, and then check `if first_error is not None: break` at the top of the while loop. So we exit the while loop.

But there's still the issue: if multiple tasks complete in the same wait, and the first one we process raises, we cancel the rest. But the other completed tasks are already done - they're in `done`. We don't need to cancel them. We just don't start new ones.

Actually wait - if task A and task B both complete in the same batch, and task A raises:
- We process task A: error found, cancel all in `running` (which at this point includes task B? No, task B is in `done`, not in `running` anymore since we popped it... wait, we haven't popped task B yet).

Let me re-trace:
- `done` = {taskA, taskB}
- `running` = {taskA: 0, taskB: 1, taskC: 2}
- Process taskA: `running.pop(taskA)` → running = {taskB: 1, taskC: 2}
- taskA.result() raises → first_error set
- Cancel taskB and taskC (they're in running)
- running.clear()
- break for loop
- taskB is NOT processed (we broke out)

But taskB already completed! We just didn't record its result. That's fine because we're raising the error anyway.

Actually, is it a problem that we cancelled taskB even though it already completed? No - cancelling a completed task is a no-op.

OK, I think the logic is correct. Let me also handle the edge case where `funcs` is empty (returns []) and `limit < 1` (raises ValueError).

One more thing: the `run_task` function is a closure that captures `funcs` and `idx`. Since we're using `asyncio.ensure_future`, each call creates a new coroutine. That's fine.

Let me also make sure we handle the case where `limit >= len(funcs)` - we just start all of them at once.

Let me also consider: what if `funcs[i]()` returns something that's not a coroutine? The problem says "each return an awaitable", so it should be awaitable. `await funcs[idx]()` should work.

Let me write the final version:

```python
import asyncio


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    next_idx = 0
    running = {}
    first_error = None

    async def run_task(idx):
        return await funcs[idx]()

    # Start initial batch
    for _ in range(min(limit, len(funcs))):
        idx = next_idx
        next_idx += 1
        task = asyncio.ensure_future(run_task(idx))
        running[task] = idx

    while running:
        done, _ = await asyncio.wait(set(running.keys()))
        for task in done:
            idx = running.pop(task)
            try:
                results[idx] = task.result()
            except Exception as e:
                first_error = e
                for t in running:
                    t.cancel()
                running.clear()
                break
            if next_idx < len(funcs):
                new_idx = next_idx
                next_idx += 1
                task = asyncio.ensure_future(run_task(new_idx))
                running[task] = new_idx
        if first_error is not None:
            break

    if first_error is not None:
        raise first_error

    return results
```

Hmm wait, I need to double-check: when we `break` out of the for loop after an error, and then `if first_error is not None: break` exits the while loop. Then we raise. Good.

But what about the `done` set - if we break out of the for loop, there might be other tasks in `done` that we didn't process. That's fine because we're raising the error.

One potential issue: `asyncio.wait` with an empty set. But we only enter the while loop when `running` is non-empty, so the set is never empty.

Another issue: what if `funcs` has items but `limit` is larger than `len(funcs)`? We start all of them. That's fine.

I think this is correct. Let me also make sure the function signature matches: `async def gather_limited(funcs, limit: int) -> list`.

Actually, I realize I should double-check one thing: the problem says "Start the next one as soon as any slot frees up (not in fixed batches)." My implementation does this correctly - as soon as a task completes, we immediately start the next one.

Let me also verify: the `asyncio.wait` call - we pass `set(running.keys())`. This is the set of currently running tasks. When any one completes, `asyncio.wait` returns. Then we process it and start the next. This is the sliding window behavior.

I'm satisfied with this solution. Let me write it up cleanly.
