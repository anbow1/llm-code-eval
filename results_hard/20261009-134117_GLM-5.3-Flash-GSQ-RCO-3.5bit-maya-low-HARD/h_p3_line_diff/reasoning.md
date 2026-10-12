Write Myers diff with linear-space? Simpler: standard Myers O((N+M)D) storing V arrays per D for backtracking. For 1000 completely different lines: N+M=2000, D≈2000, so V arrays total O(D²)=~4M ints — fine. For 20000 lines differing in 50 places: D≈100, fine.

But memory for backtrack: store V snapshots per d. D=2000 → 2001 lists of ~4000 entries → ~8M ints, OK.

Preprocess: trim common prefix/suffix, unique line IDs via dict.

Implement Myers:

def diff_lines(a,b):
    trim prefix/suffix; if empty cases.
    map lines to ints.
    classic Myers with V per d stored.

Standard implementation:

N=len(a),M=len(b), max=N+M
if max==0: return []
v = {1:0} or list with offset.
trace = []
for d in range(max+1):
    v_list = [0]*(2*max+1) each iteration? Store snapshot per d: memory O(D^2). For D=2000: 2001*4001 ≈ 8M ints ~ fine but 64MB lists of Python ints... 8M ints in lists → ~64MB+ object overhead, ints small cached maybe not all. Could be ~300MB. Risky. Alternative: use array module 'i' snapshots → 8M*4 bytes = 32MB, fine.

Implement with list v indexed by k+offset, snapshot via list(v) converted to array('i', v)? Copying per d is O(max) each → O(D*max)=4M ops fine.

Backtrack: standard.

Code:

def diff_lines(a, b):
    # trim
    i=0
    while i<len(a) and i<len(b) and a[i]==b[i]: i+=1
    j=0
    while j < len(a)-? compute suffix: end comparisons.
    pre = i; 
    sa = a[i:len(a)-suf]; sb = b[i:len(b)-suf] where suf computed on tails.

Compute suffix:
    suf=0
    while suf < len(a)-i and suf < len(b)-i and a[len(a)-1-suf]==b[len(b)-1-suf]: suf+=1

Then core diff on sa,sb. Result: "="*pre + core + "="*suf.

Core Myers:

n,m=len(sa),len(sb)
if n==0: return [("+",l) for l in sb] plus? Actually need order: with only sb, script is "+" for each. But ordering: script items in order must reconstruct b via "=" and "+" — since all "+", fine. If m==0: all "-".

ids: map line->int via dict.

Myers:
max_d = n+m
if (n+m) odd offset... Use offset = max_d.
v = [0]*(2*max_d+1)? indices k from -m..n? use -max_d..max_d.
trace = []
found=False
for d in range(max_d+1):
    vcur = v[:]  # snapshot
    trace.append(vcur)
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and v[k-1+offset] < v[k+1+offset]):
            x = v[k+1+offset]
        else:
            x = v[k-1+offset]+1
        y = x - k
        while x<n and y<m and sa[x]==sb[y]: x+=1; y+=1
        v[k+offset]=x
        if x>=n and y>=m: found=True; break outer
    if found: break

Backtrack:
x,y = n,m
script=[]
for d in range(len(trace)-1, 0, -1):
    vprev = trace[d]
    k = x-y
    if k == -d or (k != d and trace[d-1][k-1+off] < trace[d-1][k+1+off]):
        prevk = k+1
    else:
        prevk = k-1
    prevx = trace[d-1][prevk+off]
    prevy = prevx - prevk
    while x>prevx and y>prevy:
        script.append(("=", sa[x-1])); x-=1; y-=1
    if d>0:
        if prevk == k+1: script.append(("+", sb[y-1])); y-=1
        else: script.append(("-", sa[x-1])); x-=1
Wait careful: after loop d=0 handled? Trace includes d=0 snapshot. Loop range(d_final,0,-1) handles d>=1; after loop x==y==0? At d=0, x=y=0 since no common prefix trimmed. Remaining diagonal matches: while x>prevx... at d=0, prevx=0,prevy=0, diagonal additions consumed by loop. Actually final script loop: for d from D down to 1, then after loop handle diagonal from (x,y) to (0,0): while x>0 and y>0: append "=",x-=1,y-=1. Yes since at d=0, k=0, prevx=0.

Wait the backtrack loop: for d in range(D,0,-1): uses trace[d] conceptually? Actually we only need trace[d-1] and k=x-y. The condition uses trace[d-1]. Fine. But careful the choice condition must mirror forward: prevk chosen same way as forward at step d. In forward at step d, for k: if k==-d or (k!=d and v_prev[k-1]<v_prev[k+1]): came from k+1 (down, "+") else from k-1 (right, "-"). But at d, forward x for k... In backtrack x,y are at end of diagonal k=x-y after snake. So prevk decided by trace[d-1] values. Good.

Also the diagonal snake between prev point and (x,y): append "=" lines.

Note: for k == -d edge, v_prev[k-1] might be out of range index k-1+off = -d-1+off; off=max_d so fine unless d=max_d and k=-d → index -2*max_d-1+off = -max_d-1 <0 → negative index wraps. But condition short-circuits k==-d first. Similarly k==d. Good. But condition "k != d" needed when k==d: then must come from k-1. In my condition: if k==-d or (k != d and trace[d-1][k-1+off] < trace[d-1][k+1+off]). Good.

Also handle case n+m==0 already handled by trimming (pre+suf covers). But if both sa,sb empty: return "="*pre+suf. Handle: if not sa and not sb: return [("="...)...]. Actually just early: if n==0 return pre "="s + "+" for sb + suf "="s; similarly m==0. But careful when m==0 and sa nonempty: script "-" items; but order: taking "=" and "-" gives a exactly: "=" prefix, "-"s, "=" suffix — yes equals a. And b: "=" prefix + "=" suffix = b. Good.

Memory concern: trace of arrays. For d loop each snapshot list(v) of size 2*max_d+1 = 2(n+m)+1. For n=m=1000: 4001 ints * 2001 d's = 8M → use array('i')? list of Python ints 8M * ~8bytes pointer + small ints mostly >256 not cached... could be ~300MB. Use array module: trace.append(array('i', v)) — copying 4001 ints per d, 2001 d's = 8M ops, fine; memory 32MB. Good. Backtrack indexing works on arrays.

Actually can avoid copying full v each d: only need k in range... but fine, O(D*max) = 2000*4000=8M ops OK under 6s.

For 20000 lines differing 50 places: n+m≈100 (after trim maybe still large? trim leaves differing middle, could be large-ish but D small... if differs in 50 places scattered, trim may leave large middle with small D, e.g., 50 edits each single-line → middle n+m ≈ 20000? No — trim removes only prefix/suffix; middle could be full 40000 with D~100 → D iterations 100, each copying 40001 ints → 4M ops fine. But v size 2*(n+m)+1=40001, loop d up to ~100: fine.

Edge: if a==b fully, trim covers everything → return all "=".

Also need offset when n+m=0 skip.

Forward loop break out of both loops: use flag.

Write final.