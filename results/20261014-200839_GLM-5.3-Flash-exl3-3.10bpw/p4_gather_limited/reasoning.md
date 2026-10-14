Implement a semaphore-free manual scheduler using asyncio.TaskGroup? TaskGroup cancels others and raises ExceptionGroup — need first exception re-raised. Better to implement manually.

Approach: create tasks dynamically. Use a queue of indices and worker coroutines. Workers pull indices, run funcs[i], store results. On exception, cancel everything and record exception.

Implementation:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    results = [None] * len(funcs)
    first_exc = None
    running = set()  # tasks

    queue = asyncio.Queue()
    for i in range(len(funcs)):
        queue.put_nowait(i)

    async def worker():
        nonlocal first_exc
        try:
            i = queue.get_nowait()
        except asyncio.QueueEmpty:
            return
        try:
            results[i] = await funcs[i]()
        except BaseException as exc:
            if first_exc is None:
                first_exc = exc
            # signal stop
        ...
```

Simpler: use a semaphore per task created eagerly? Tasks created eagerly with semaphore: all tasks created, but only `limit` acquire semaphore — but tasks awaiting semaphore are "running" in a sense but not executing func. The requirement "at most limit running at the same time" and "start next as soon as slot frees" — semaphore handles that; tasks waiting on semaphore aren't running the callable. Cancellation: if func raises, exception propagates where? With eager task creation, we need to collect exception from the first failing task and cancel all others.

But a task waiting on semaphore hasn't called its func yet — cancelling those is fine. However, we must not let semaphore approach start new funcs after a failure. Sequence: create all tasks that do `async with sem: results[i] = await funcs[i]()`. Wait for completion; if any raises, cancel remaining. But tasks holding semaphore might start even while we're cancelling — small race but acceptable? The spec says cancel all still-running and don't start new ones. With manual worker approach it's cleaner: workers exit early when first_exc set.

Let me do manual approach with N worker coroutines (min(limit, len(funcs))) pulling from queue:

```python
async def gather_limited(funcs, limit):
    if limit < 1:
        raise ValueError("limit must be >= 1")
    n = len(funcs)
    if n == 0:
        return []

    results = [None] * n
    first_exc = None
    stopped = asyncio.Event()

    work = asyncio.Queue()
    for i in range(n):
        work.put_nowait(i)

    async def worker():
        nonlocal first_exc
        while not stopped.is_set():
            try:
                i = work.get_nowait()
            except asyncio.QueueEmpty:
                break
            try:
                results[i] = await funcs[i]()
            except asyncio.CancelledError:
                raise
            except BaseException as exc:
                if first_exc is None:
                    first_exc = exc
                stopped.set()
                return

    workers = [asyncio.create_task(worker()) for _ in range(min(limit, n))]
    await asyncio.gather(*workers)

    if first_exc is not None:
        raise first_exc
    return results
```

Issue: when stopped is set, other workers currently running their func keep running; we need cancellation of still-running calls. Spec: "cancel all still-running calls, do not start any new ones". So the failing worker should cancel others... but workers themselves: a worker awaiting funcs[i]() — cancellation propagates. We need the main flow to cancel workers after first failure. But we can't know when failure happens until we await workers. Solution: a monitor: when exception occurs, worker cancels other workers' current tasks? Worker can't cancel itself's peer tasks directly without references... it can via a shared list of worker tasks—but tasks are created after worker coroutine is created; workers list populated. Actually inside worker we can reference a list `tasks` if we append after creation — workers are created then appended; loop runs later, so by the time any worker runs, list is complete? Not exactly: create_task schedules; the first worker could start running before all creates (only at awaits). create_task only schedules; it runs at next await. If we append in a loop without awaits, the appends all happen before any worker runs. So safe.

But careful: worker cancelling other workers: CancelledError in target worker awaiting func — the func may raise CancelledError; we re-raise as CancelledError in that worker (we don't treat it as first_exc). Then main `await asyncio.gather(*workers)` collects... but wait, a cancelled worker raising CancelledError is fine — gather... we await each? If a worker is cancelled, `await asyncio.gather(*workers, return_exceptions=True)` returns CancelledError instances for those. Fine.

But there's a subtlety: worker A fails, sets stopped, cancels workers B and C and returns. But who cancels? Worker cancels its peers. After cancelling, worker A returns. Worker A shouldn't cancel itself. Then main gathers all workers.

Also the worker that got cancelled while awaiting `funcs[i]()` — its own try/except CancelledError re-raise. Good.

Another subtlety: worker that fails and returns normally — no problem, it's done.

If worker A failed and then workers B gets queued item before being cancelled? Queue get happens synchronously in loop; cancellation via task.cancel() sets pending cancellation delivered at next await. If worker B is at `work.get_nowait()` (no await), then checks stopped — after being cancelled, it proceeds: gets next item, checks stopped... Actually it should check `if stopped.is_set(): break` before starting. But cancellation is pending: the CancelledError will be raised at the next await point — inside `await funcs[i]()`... but we already got the item. Hmm, we should check stopped before and after get. If cancelled, at `await funcs[i]()` a CancelledError may be raised immediately? asyncio task cancellation only applies if the task hasn't already started handling it; once cancellation is delivered, next await raises CancelledError — actually task.cancel() before the task runs raises CancelledError at the next suspension. If the task is currently running (in the await funcs) — wait, cancellation delivered at next awaits. If pending cancel and task calls get_nowait and then hits `await funcs[i]()`, CancelledError raised there — which our except handles: re-raise. But we'd have consumed an item — fine, that func never runs. Actually CancelledError raised at first await inside funcs[i]() — if funcs[i]() returns an awaitable whose __await__ raises CancelledError immediately... it's fine.

But wait: `except BaseException as exc` catching CancelledError then re-raise — we handle separately. Also careful: if a worker is cancelled but was already in `while` loop after getting item, it does `await funcs[i]()` → raises CancelledError → we re-raise → worker ends cancelled. Good.

One more issue: worker B gets an item legitimately (no stop, no cancel) while worker A just set stopped between B's stopped-check and... B checks stopped, gets item, awaits func — but the failure already happened; B started a new call anyway. Is that a violation? Slight race: stopped set before B gets item → B checks stopped and breaks. If B already got item and is awaiting, then it's already running — cancellation covers it. The race window: B checks stopped (not set), gets item, awaits func — meanwhile A sets stopped and cancels B — B gets CancelledError at await. Fine because A cancels all workers. So no race for "start new ones" as long as worker A cancels peers after setting stopped. Between `stopped.set()` and cancels, peers may start funcs briefly — then cancelled. Acceptable? "do not start any new ones" — with cooperative async, the cancellation happens in A's synchronous-ish code (task.cancel() doesn't await), so peers won't actually run between A setting stopped and A issuing cancels, since A doesn't await in between. Within the same event loop iteration, B can't run. So: set stopped, then cancel all other tasks — no awaits in between → deterministic. Good.

So structure:

```python
tasks: list[asyncio.Task] = []

async def worker():
    while True:
        if stopped.is_set():
            return
        try:
            i = work.get_nowait()
        except asyncio.QueueEmpty:
            return
        try:
            results[i] = await funcs[i]()
        except asyncio.CancelledError:
            raise
        except BaseException as exc:
            if first_exc is None:
                first_exc = exc
            stopped.set()
            for t in tasks:
                if t is not asyncio.current_task():
                    t.cancel()
            raise ...? no, return
```

Hmm — should the failing worker return or raise? It can return; exception stored. But wait: what if exception is CancelledError from a peer cancellation — we re-raise. If it's CancelledError from... only peers cancel workers; main never cancels until after gather. Actually main might get cancelled itself (outer cancellation). Then gather propagates CancelledError into main; workers still running as separate tasks — they'd be orphaned. That's a known issue with this pattern but standard library approach... Actually if the calling task gets cancelled, `await asyncio.gather(*workers)` raises CancelledError inside main coroutine, but workers keep running detached. Better: shield or try/finally cancel workers. Add try/finally: on any exit with pending exception, cancel workers and await them. Let me add:

```python
try:
    await asyncio.gather(*tasks)
finally:
    # ensure no worker keeps running if gathering was interrupted
    ...
```

Simplest: wrap:

```python
cancelled_outer = False
try:
    await asyncio.gather(*tasks)
except asyncio.CancelledError:
    ... 
```

Keep it reasonably simple but robust: use try/finally that cancels stragglers if we exit early. Actually gather(*tasks, return_exceptions=True) swallows CancelledError of workers but outer cancellation would... outer cancellation: cancellation propagates into the `await asyncio.gather(...)` — gather (non-return_exceptions) doesn't cancel children... Actually when the awaiting task is cancelled, gather raises CancelledError; with return_exceptions=True, gather when outer-cancel: the gather future is cancelled, and children? In gather(return_exceptions=True), if the gather itself is cancelled, children are cancelled too? Historically, gather with return_exceptions=True did not cancel children on outer cancel, but the current implementation... Let me just use try/finally with explicit cleanup:

```python
try:
    await asyncio.gather(*tasks, return_exceptions=True)
finally:
    if first_exc is not None or any(t for t in tasks if t.cancelled()) ... 
```

Hmm, get complicated. In finally: if we exited due to outer cancellation, workers might still be alive if they haven't finished; but if first_exc is set, peers were already cancelled by the failing worker — but cancelled tasks might still be finishing (cancellation delivered at next await; peers awaiting func will be cancelled but we should await them to ensure cleanup before re-raising). So:

```python
if first_exc is not None:
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    raise first_exc
```

That ensures all running calls get cancelled and awaited before re-raising. The failing worker itself: it returned after storing exc; but peers already cancelled by worker. This extra loop also awaits pending cancellations... peers may themselves be waiting on queue get? They use get_nowait in a loop — if a peer is executing `t.cancel()` loop in another worker... Workers don't await except in funcs[i](). A worker that returned is done. A worker awaiting funcs[i]() gets cancelled and finishes. So gather completes.

But could a worker be stuck in a func that swallows CancelledError? Then cancellation doesn't finish it — await gather hangs. That's inherent; acceptable (same as TaskGroup). CancelledError is BaseException; my except clause re-raises CancelledError, so workers don't swallow. Good.

Handle outer cancellation cleanly: wrap the final `await asyncio.gather(*tasks, return_exceptions=True)` — if outer cancel happens during cleanup... fine, don't over-engineer.

Full code:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    funcs = list(funcs)
    n = len(funcs)
    results: list = [None] * n
    if n == 0:
        return results

    queue: asyncio.Queue = asyncio.Queue()
    for i in range(n):
        queue.put_nowait(i)

    first_exc: BaseException | None = None
    stopped = asyncio.Event()  # not strictly needed
    tasks: list[asyncio.Task] = []
    current = asyncio.current_task

    async def worker() -> None:
        nonlocal first_exc
        while True:
            try:
                i = queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            try:
                results[i] = await funcs[i]()
            except asyncio.CancelledError:
                raise
            except BaseException as exc:
                if first_exc is None:
                    first_exc = exc
                me = current()
                for t in tasks:
                    if t is not me:
                        t.cancel()
                return

    for _ in range(min(limit, n)):
        tasks.append(asyncio.create_task(worker()))

    await asyncio.gather(*tasks, return_exceptions=True)

    if first_exc is not None:
        raise first_exc
    return results
```

Wait: with return_exceptions=True in the final gather, the failing worker returns normally (no raise), cancelled workers produce CancelledError results — swallowed fine. But if a worker raises CancelledError because it was cancelled while inside func, and no first_exc (e.g., outer cancellation)? If outer task is cancelled during gather with return_exceptions=True: the outer cancellation propagates into the await — the gather future gets cancelled; children... In modern Python (3.11), gather with return_exceptions=True: when the gather's await is cancelled, cancellation is delivered to children too? Since 3.9? Let me recall: In Python ≥3.9? The change: "If gather() is cancelled, all submitted awaitables (that have not completed yet) are also cancelled." — that has been true for a long time... Actually historically there was a bug where return_exceptions=True prevented child cancellation on outer cancel; fixed in 3.9? I believe since 3.9 (bpo-42168? no). The known behavior: outer cancellation of gather cancels children regardless since 3.9? There was an accepted change: gather cancels children when it is cancelled, even with return_exceptions=True, since Python 3.9. Hmm, I think the fix landed in 3.9 (bpo-42168 involved TaskGroup... no). Actually bpo-42168: "When awaiting asyncio.gather(...) with return_exceptions=True, if the outer task is cancelled, gather should cancel children" — the fix went into 3.8.? I'll not rely on that; it's out of scope anyway. The spec only about exceptions from funcs.

Also should the failing worker also cancel tasks in `tasks` list that haven't been picked up... peers already include only workers, no pending task-per-item approach, so fine.

One subtlety: `stopped`/Event not needed; removing it. But a peer between `queue.get_nowait()` and `await funcs[i]()` — no awaits between, so deterministic; the peer can only be at an await if it's running a call, and then it'll be cancelled. Actually there's a subtlety: worker cancelled while it hasn't started yet? create_task schedules; if cancel happens before worker's first run... can't happen because failing worker only runs after starts.

Another point: worker's queue empty return — but what if all items were consumed and a worker returns while others still running — fine, gather waits for all.

Also should workers exit when queue empty even if stopped set — same thing.

Edge: funcs returning non-awaitable — will TypeError inside await, treated as exception from call. Fine/spec ambiguous.

Also `first_exc` — need `nonlocal`. Done.

Write final code with comments.