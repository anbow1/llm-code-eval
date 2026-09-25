Implement with semaphore? But need first-exception cancel + re-raise. Implement with worker tasks and a queue, capturing exceptions; simpler: dynamic scheduling with tasks list and a coroutine per func, each waiting on a semaphore, with shared exception state.

Standard approach:

async def _run(f): async with sem: return await f()

Create tasks; also tasks that finish with exception should cancel others and re-raise first. Implement with a done callback? Simpler: track first_exception variable; each task wraps: async with sem: if exc: set event... Use asyncio.wait loop.

Alternative: workers pulling from deque — cleaner.

Implementation:

from asyncio import Queue? Use deque with tasks.

def gather_limited: validate limit; if not funcs: return [].

Approach: create semaphore(limit). async def worker(f): async with sem: if failure_event.is_set(): ... but we still need to re-raise first exception. Simplest: create tasks for all funcs; each worker first acquires semaphore, then checks failure; if failed, raise the stored exception (or return placeholder). Then wrap each: gather results manually.

But creating tasks lazily: with semaphore, all tasks exist but acquire only limit — fine, semaphore naturally gives dynamic slots. However "cancel all still-running" — cancel tasks including those waiting on semaphore.

Code:

sem = asyncio.Semaphore(limit); fail = False; first_exc = None
async def run(i, f):
  await sem.acquire()
  try: return await f()
  except Exception as e: handle first: record, set stop, raise
  finally: sem.release()

Then after creating all tasks, use wait loop with FIRST_EXCEPTION? Wait loop: done,pending = wait(tasks, return_when=FIRST_EXCEPTION); if any exception → cancel pending, then re-raise that exception (first raised = FIRST_COMPLETED... FIRST_EXCEPTION returns when first exception occurs among tasks). But if exception stored inside task, wait(FIRST_EXCEPTION) handles. However if an exception occurs after some succeed, FIRST_EXCEPTION triggers. First exception: the one that triggered is the first. Gather done tasks... Actually simpler: loop wait FIRST_EXCEPTION; when done, check each task for exception and propagate.

But there is a subtlety: FIRST_EXCEPTION returns only when a task raises; but tasks that acquire later keep acquiring until canceled — fine.

async def gather_limited(funcs, limit):
 if limit < 1: raise ValueError
 if not funcs: return []
 sem = asyncio.Semaphore(limit)
 async def run(f):
   return await f()
 tasks = [asyncio.create_task(_worker(f)) for f in funcs]
 async def _worker(f):
   async with sem:
     return await f()
 Then wait loop:

 done,pending = await asyncio.wait(tasks, return_when=asyncio.exceptions.FIRST_EXCEPTION)
 cancelled = False
 while pending:
   for t in done: if t.exception(): cancel pending; cancelled=True; break
   ...
 Actually if exception occurred, cancel pending and gather them (return_exceptions), then re-raise. Also must consume exceptions of other tasks to avoid warnings — gather with return_exceptions=True on pending.

Loop:
 done, pending = await wait(...)
 exc = first exception among done (in order of funcs? "re-raise that first exception" — the earliest raised; hard to determine precisely; FIRST_EXCEPTION fires at the first one raised, so find it in done... but done may contain multiple; pick by task order in tasks? Better: pick the first exception recorded. Use a mutable holder: in worker except block: nonlocal set first_exc if None. Then re-raise first_exc.

Also must cancel pending even without exception? No—wait FIRST_EXCEPTION only returns early with exception; else wait returns when all done. So:

done,pending = wait(...); check first_exc; if set: cancel, await gather(pending, return_exceptions=True), raise first_exc. Loop while pending and no exc.

Also tasks done without exception: no warnings.

Edge: Exception vs BaseException — use Exception.

Return [t.result() for t in tasks] — note tasks complete in worker; result returned.