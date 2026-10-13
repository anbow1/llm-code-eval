Need to implement gather with semaphore, but need first exception re-raised and cancellation of others. Also need to preserve order of results.

Approach: use a semaphore and wrap each coroutine. But "cancel all still-running calls, do not start any new ones" — with semaphore, tasks waiting on semaphore are not started yet; cancel all tasks. First exception re-raised.

Careful: if a task raises while others running, cancel running tasks and await them. Also, tasks waiting on semaphore that haven't started shouldn't be started. Cancel all tasks.

Implementation:

```python
import asyncio

async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    n = len(funcs)
    if n == 0:
        return []

    sem = asyncio.Semaphore(limit)
    results: list = [None] * n
    first_exc: BaseException | None = None

    async def run(i):
        nonlocal first_exc
        async with sem:
            if first_exc is not None:
                # don't start new work after failure
                raise _Cancelled sentinel? Actually we should just return without running
            try:
                results[i] = await funcs[i]()
            except BaseException as e:
                if first_exc is None:
                    first_exc = e
                raise
```

Hmm, need to distinguish "cancelled because of failure" from normal. Simpler: use an event `failed`. Workers check event before starting; if failed, don't call func, just return/raise nothing.

Then gather all tasks with return_exceptions=True, then if first_exc, raise it.

But careful: cancellation — requirement says "cancel all still-running calls". Using cancellation is more faithful. Alternative approach: create tasks, use asyncio.wait with FIRST_EXCEPTION, then cancel remaining, await them, raise exception.

But tasks waiting on semaphore aren't "running" — they're queued; cancelling them is fine and prevents starting new ones. Actually a cleaner design: a scheduler loop.

Scheduler approach:
- Wrap each func call in a task but gate with semaphore inside a wrapper task. Then use asyncio.wait(tasks, return_when=FIRST_EXCEPTION). When done, cancel all pending tasks and await them with return_exceptions=True, suppress CancelledError, then raise first exception.

But FIRST_EXCEPTION with semaphore-gated tasks: waiting tasks are pending, fine.

Edge: exceptions raised inside semaphore-gated wrapper: if func raises, wrapper raises; wait returns with that exception. Get it via task.exception() — but if task was cancelled, exception() raises CancelledError. Handle: iterate done tasks, collect exception via try task.exception() except CancelledError pass.

Also the wrapper should not catch CancelledError from cancellation. When we cancel pending tasks, those inside `async with sem` awaiting func get CancelledError; tasks waiting on sem acquire also get CancelledError. Fine.

Also need: when exception occurs, tasks already done normally keep results; pending ones get cancelled. Then re-raise first exception. Which is "first"? The FIRST_EXCEPTION wait returns as soon as any task finishes with exception — but multiple could finish around same time; we should pick the earliest one to complete. asyncio.wait returns set of done tasks; order ambiguous. To get truly first exception by time, we could record exceptions as they happen via a done callback with a counter. Simpler: use wait FIRST_EXCEPTION; among done tasks that raised, pick... hmm. Could use a done callback appending to list of exceptions in completion order — callbacks fire in completion order roughly. Alternative: use asyncio.Event and a monitor.

Simplest robust: record first_exc in wrapper via nonlocal, set in except block (before re-raise). Completion order: the wrapper's except block runs synchronously upon exception, so first_exc records the first exception chronologically among those processed. Since coroutines run on the same loop, exceptions are processed sequentially, so first_exc is truly first. Then we don't even need FIRST_EXCEPTION — but we need to stop waiting promptly. Use asyncio.wait(tasks, return_when=FIRST_EXCEPTION) — when a task raises, wait returns. Then cancel pending, gather with return_exceptions to reap, then raise first_exc.

But subtlety: if exception occurs, but wait FIRST_EXCEPTION triggers only when a task *completes* with exception. Yes wrapper completes with exception. Good.

Another subtlety: after failure, queued tasks waiting on semaphore get cancelled — good, no new ones start. Running ones get cancelled — good.

Also if funcs[i]() returns an awaitable, we must await it. If func itself raises synchronously (not returning awaitable), calling funcs[i]() raises — that counts as a call raising. Wrap in try:

```python
async def worker(i):
    async with sem:
        try:
            results[i] = await funcs[i]()
        except BaseException:
            ...
```

Wait, funcs[i]() called inside worker — if it raises synchronously, exception caught. Good.

Handle first_exc recording: in worker except block set first_exc if None. Then re-raise so wait sees it. Actually we could avoid re-raising and instead use a failure event... but cancellation approach: wait returns FIRST_EXCEPTION because task raises.

But if first_exc was set but task also catches... fine.

Edge: if a worker is cancelled after setting... not an issue.

Also need to handle: after wait, cancel pending tasks; asyncio.gather(*pending, return_exceptions=True) — but tasks might raise CancelledError; gather with return_exceptions captures it. But if a pending task actually completed normally between wait and cancel (race: tasks done set... wait returns done set; tasks that completed are in done). Pending ones are truly pending. Cancel them, await reap.

Also there could be a race where a pending task's exception is second — first_exc already set.

Also what if all tasks complete successfully: wait returns when all done (FIRST_EXCEPTION waits for all if no exception). Then results filled.

But careful: results[i] assigned inside worker; if worker cancelled after func completed but before... assignment happens right after await; once await returns, assignment is immediate (no yield between). Actually `results[i] = await funcs[i]()` — after await completes, assignment executes without yielding. But cancellation could arrive... cancellation delivered at await points; once await returns and assignment happens, done. If cancel delivered just as func finishes: await raises CancelledError, func's result lost — but that's a failure path anyway, we raise first_exc.

Hmm, but wait: cancellation delivered while awaiting a completed future — the CancelledError may be raised even if the awaitable completed. That's fine because we're in failure path.

Actually subtle issue: suppose task A raises exception at t1, wait returns; we cancel pending task B which had *already completed successfully* but... no, completed tasks are in done set, not pending.

But there's a race: between wait returning and us cancelling, a pending task may complete normally. We then cancel it — cancelling a done task is a no-op, fine. But its result assignment already done. Then first_exc still raised. Fine — "do not start any new ones" — a completed one wasn't newly started.

Actually wait — could a pending task start a *new* func after failure? Between wait return and cancel, a worker waiting on semaphore could acquire and call func. Tiny race. To be safe, add a `failed` flag check inside worker after acquiring semaphore:

```python
async def worker(i):
    async with sem:
        if failed:  # don't start new work
            return
        try:
            results[i] = await funcs[i]()
        except BaseException as exc:
            if first_exc is None:
                first_exc = exc
            raise
```

Set failed = True in except before raise. Good.

Also handle KeyboardInterrupt/SystemExit? BaseException catch — re-raise anyway. Requirement says exceptions; catching Exception is enough but BaseException with re-raise is fine. But CancelledError: if worker itself is cancelled externally (we cancel), the except catches CancelledError and sets first_exc! That would overwrite the real first exception? No — first_exc already set by the failing task before we cancel, since wait returned due to exception... but what if the first task to raise was cancelled for another reason? External cancellation isn't part of spec. But our own cancels happen after failure detected. However: CancelledError in worker due to our cancel — first_exc already non-None, so no overwrite. But what if wait returned because ALL done (no exception), then we cancel... no pending then.

Hmm, but one more: CancelledError raised while a worker is in `async with sem` acquire due to our cancellation — caught in except? No — the try block only wraps funcs call, not the sem acquire. Acquire cancellation propagates out of worker, task ends cancelled. Fine. But actually I should not catch CancelledError into first_exc at all, to be safe: catch Exception for recording, but re-raise everything. But BaseException like KeyboardInterrupt from func — spec says "if any call raises". Let me catch BaseException but exclude CancelledError:

```python
except asyncio.CancelledError:
    raise
except BaseException as exc:
    ...
```

But then a worker cancelled while running func raises CancelledError — wait FIRST_EXCEPTION doesn't return on cancelled tasks? Actually asyncio.wait treats cancelled tasks... In Python 3.8+, asyncio.wait with FIRST_EXCEPTION: a task that raises CancelledError — does it count as exception? Task cancelled → done with CancelledError; wait's FIRST_EXCEPTION checks `f.exception()` which raises CancelledError... Let me recall implementation: FIRST_EXCEPTION: done if any future is done and not cancelled and f.exception() is not None. Cancelled futures are excluded. So cancelled tasks don't trigger FIRST_EXCEPTION. Fine — we only cancel after failure anyway.

Also, wait could return when all tasks complete. Then check first_exc — could a task have set first_exc but be... no, if it set first_exc it raised, task done with exception, wait triggers. Unless exception happened in a task and also all others complete — same moment; wait returns anyway. So after wait: if first_exc is not None → cancel pending, reap, raise first_exc. Else return results.

Hmm, wait FIRST_EXCEPTION returns done set possibly containing only some done tasks. If first_exc set but the failing task... always in done set. OK.

Actually simpler alternative without wait: since first_exc is set synchronously when exception occurs, I could just check after each completion... but need to wake up the main coroutine. Use an event: worker sets first_exc and event.set(). Main awaits event or all-done. wait FIRST_EXCEPTION is simpler.

Reaping pending: 
```python
pending = [t for t in tasks if not t.done()]
for t in pending: t.cancel()
await asyncio.gather(*pending, return_exceptions=True)
```
But gather with return_exceptions may raise? No, return_exceptions=True captures everything including CancelledError. Actually in newer Python, awaiting a cancelled task with return_exceptions=True returns CancelledError instance. Fine.

Wait — one more subtlety: tasks that completed normally but were cancelled between done-check... they're done, excluded.

Also `asyncio.wait` deprecation: passing coroutines deprecated but tasks fine. In 3.11 passing tasks OK.

Also: worker tasks created with asyncio.create_task? We need a running loop — we're in async def, fine.

Another subtlety: first_exc could also be set by a worker that raises Exception, and wait returns; but suppose two tasks raise nearly simultaneously — first_exc records chronological first. 

Also the failed flag check: workers queued on sem acquire after failure → return immediately without running → they complete normally. Good, they don't add exceptions.

Also should worker check failed before acquiring? Not needed.

Ordering of results: results list indexed — fine. For failed runs, results[i] stays None but we raise anyway.

Empty list: return [].

Let me also ensure funcs results: `await funcs[i]()` — awaitable returned. Good.

Also need to guard: what if worker task itself gets cancelled while inside `except` handling? Edge irrelevant.

One more: after successful completion of all (no exception), wait returns when all done. But wait FIRST_EXCEPTION with all success → returns when all complete. 

Also handle the case where a func raises immediately and tasks not yet started... fine.

Also: what about `limit` larger than len? Fine.

Write final code:

```python
import asyncio
from typing import Any, Awaitable, Callable, List


async def gather_limited(funcs, limit: int) -> list:
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not funcs:
        return []

    semaphore = asyncio.Semaphore(limit)
    results: list = [None] * len(funcs)
    first_exc: BaseException | None = None
    failed = False

    async def _worker(index: int) -> None:
        nonlocal first_exc, failed
        async with semaphore:
            if failed:
                return
            try:
                results[index] = await funcs[index]()
            except asyncio.CancelledError:
                raise
            except BaseException as exc:
                failed = True
                if first_exc is None:
                    first_exc = exc
                raise

    tasks = [asyncio.ensure_future(_worker(i)) for i in range(len(funcs))]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)

    if first_exc is not None:
        for t in pending:
            t.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
        raise first_exc

    return results
```

Edge: what if first_exc set but wait returned with all done... raise anyway. Also if first_exc is None but some done task has exception that's CancelledError (external cancel)? Ignore.

Wait — one issue: `except BaseException` catches e.g. GeneratorExit? Unlikely in coroutine. Also should it catch KeyboardInterrupt? Spec: "If any call raises... re-raise that first exception." BaseException OK.

Another subtlety: `asyncio.wait` in 3.11: passing tasks is fine; deprecation was for coroutines. Also wait requires non-empty set — tasks non-empty since funcs non-empty.

Potential race: FIRST_EXCEPTION triggers when the failing task completes, but other tasks might complete with exceptions at the "same" loop iteration — done set contains them; first_exc reflects true first. Good.

Also: `results[index] = await funcs[index]()` — if funcs[index]() raises synchronously (e.g., TypeError), caught. Good.

One more consideration: the failed check inside semaphore — worker acquires semaphore even after failure, but then returns; that's fine.

Also: should we also set failed on CancelledError? No — our cancels happen post-failure only.

Done. Return code.