Implement a concurrency-limited gather that raises the first exception and cancels others. "first exception" — re-raise that first exception. With TaskGroup semantics, the first task that fails. Need care: "first exception" likely means the first exception to occur chronologically. Implementation: use workers pulling from a queue? But results ordering and first-failure.

Simple approach: use an async worker pool with a shared queue of indices, but canceling workers cleanly when exception occurs.

Approach: create tasks for each func but throttled via a semaphore, wrapping in tasks that swallow exceptions, then check results. But requirement: cancel still-running calls and don't start new ones when exception occurs, and re-raise first exception.

A classic implementation:

```python
async def gather_limited(funcs, limit):
    if limit < 1: raise ValueError
    n = len(funcs)
    results = [None]*n
    exception = None
    tasks = set()
    sem = asyncio.Semaphore(limit)
    ...
```

But with semaphore we need to detect first exception and cancel. Use an event `done_event` set on first exception; each task acquires semaphore then checks event, if set, skip (don't start). Exceptions recorded — the first one to set event wins... but ordering: multiple tasks may raise nearly simultaneously; "first exception" = whichever sets first.

But "cancel all still-running calls" — with semaphore approach, tasks not started just skip; running ones we cancel their underlying awaitable. The wrapper tasks themselves are awaiting; we need to cancel wrappers. Easier: after detecting exception, cancel all wrapper tasks.

Alternative cleaner: maintain own sliding window using task-done callbacks.

Implementation plan:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []
    results = [None] * len(funcs)
    first_exc = None
    running = {}  # task -> index? 

    semaphore-free approach:
    next_index = 0
    done_count = 0
    ...
```

Let me write a scheduler with a loop: start up to `limit` tasks (each task runs func(i) and stores result). When a task completes, start the next one. If a task raises, store exception (the first chronologically), cancel all running tasks, and propagate.

Implementation:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    total = len(funcs)
    if total == 0:
        return []

    results: list = [None] * total
    first_exc: BaseException | None = None
    running: dict[asyncio.Task, int] = {}
    pending_start = total

    loop = asyncio.get_running_loop()
    next_index = 0
    completed = 0
    finished = asyncio.Event()

    def start(index):
        nonlocal next_index
        ...
```

Careful with exception handling and task cancellation — need to shield or handle CancelledError.

Write:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if not funcs:
        return []

    total = len(funcs)
    results = [None] * total
    first_exc = None
    running: set[asyncio.Task] = set()
    next_index = 0
    all_done = asyncio.Event()

    async def runner(index):
        result = await funcs[index]()
        results[index] = result

    async def on_task_done(task):
        nonlocal next_index, first_exc
        if task.cancelled():
            return
        exc = task.exception()
        if exc is not None:
            if first_exc is None:
                first_exc = exc
                # cancel others
                for t in running:
                    t.cancel()
            return
        if first_exc is None and next_index < total:
            i = next_index
            next_index += 1
            t = asyncio.create_task(runner(i))
            running.add(t)
            t.add_done_callback(done_cb)
        # check completion
        if first_exc is None and next_index == total and not running:
            all_done.set()
```

Hmm, need to be careful about done callbacks vs the waiting main coroutine. Using callbacks that launch new tasks: the newly created task's callback ordering with running set removal. Let me structure: remove task from running before processing.

```python
    def done_cb(task):
        nonlocal next_index, first_exc, failed
        running.discard(task)
        if task.cancelled():
            maybe_set()
            return
        exc = task.exception()
        if exc is not None:
            if first_exc is None:
                first_exc = exc
                for t in list(running):
                    t.cancel()
            maybe_set()
            return
        idx = index_of[task]
        results[idx] = task.result()
        maybe_set()
```

Simpler: since callback runs in event loop, starting new tasks is fine.

Track which index each task corresponds: pass index to runner and use task → index mapping via closure attribute? Use dict task->index and add after create_task. But callback might fire before we add? create_task then add_done_callback — callbacks scheduled via call_soon, so done callback fires after add_done_callback is registered, since task can't complete until at least the loop runs a step. Actually task created doesn't run until loop yields; add_done_callback called synchronously right after create_task within same coroutine step—safe.

Also completion check: "next_index == total and not running" — but when last task completes synchronously? Tasks always complete asynchronously. Fine.

Wait for completion: main coroutine: await all_done.wait(), then await gathering of remaining tasks (to reap cancellations), then raise first_exc if set.

Also handle case: main coroutine waiting; when exception occurs, callbacks cancel running tasks; last cancellation triggers completion → set all_done. Define maybe_set:

```python
    def maybe_set():
        if all_started and not running: all_done.set()
```

But when failed, we want all_done once running empty. Condition: (next_index == total and not running) or (first_exc is not None and not running).

Edge: an exception occurs while tasks still to start — we don't start new ones. The cancellation of running tasks: their callbacks run with cancelled() True → discard, maybe_set.

Also must ensure tasks cancelled actually finish awaiting cancellation — they will, callbacks handle.

Main loop:

```python
    # start initial batch
    for _ in range(min(limit, total)):
        launch()
```

where launch increments next_index, creates task with index, adds to running and callback.

Then `await all_done.wait()`. Then: after cancel, tasks might still be in running set briefly? All done callbacks fire before all_done set, so running empty. But to be safe, if running: await asyncio.gather(*running, return_exceptions=True).

Then `if first_exc is not None: raise first_exc`. Return results.

One subtlety: task.exception() raises CancelledError if task was cancelled — handled by cancelled() check first.

Another subtlety: if task raised CancelledError (not via external cancel) — task.cancelled() returns True only if cancel was requested; a coroutine raising CancelledError itself → task cancelled True too actually? In Python, if coroutine raises CancelledError, task is marked cancelled. Yes, since 3.8 Task treats CancelledError as cancellation. Edge acceptable.

Also need to store index: dict `index_map = {}` or use closures: define runner taking index, and launch(i). Use map from task to index.

Also results for cancelled tasks stay None — but we raise anyway.

Race: two tasks fail nearly "simultaneously" — callbacks run sequentially in loop, first sets first_exc.

Write final code.