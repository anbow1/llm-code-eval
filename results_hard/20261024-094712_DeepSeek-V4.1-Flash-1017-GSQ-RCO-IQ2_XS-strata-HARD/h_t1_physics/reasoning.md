We need write one TS file. Need careful strict compile. Use three import. Need expose sim balls plain objects live state, step(dt), paused. Physics elastic wall and ball collisions with masses, conserve momentum & kinetic energy. Need non-overlap start and never overlapping. Substep stability.

Let's design.

Scene, camera PerspectiveCamera at maybe (9,7,11) looking at origin. Box -5..5. Ball radius 0.4. 20 balls.

Ball state objects { x,y,z,vx,vy,vz,r,m }. r=0.4, m random 1..3.

Create meshes with SphereGeometry(0.4, 32,16), MeshStandardMaterial color based on mass maybe HSL.

Physics step(dt): break into substeps, maybe fixed max 1/120 or adaptive. For each substep:
- Integrate positions x += vx*h etc.
- Wall collisions: box bounds [-5,5], ball must remain fully inside: coordinate range [-4.6,4.6]. For each axis if x > limit: x=limit; vx=-vx (perfect elastic wall, wall infinite mass). similarly lower.
- Ball-ball collisions: detect distance <= 2r (0.8). Need resolve. Since discrete substeps may produce overlaps. Approach iterate pair collision handling. For pair, vector n = pos difference. If distance < 2r, correct positions to avoid overlap (separate proportional to inverse mass) and perform elastic collision using masses if approaching. But if not approaching, just positional separation. Position correction may push into wall; then clamp walls. Could cause subsequent overlap. Iterate a few times.

For elastic collision with masses: 1D along normal:
velocities along normal v1n = v1·n, v2n = v2·n. Relative approaching if (v1-v2)·n >? Let n = (p2-p1)/d direction from 1 to 2. If v1n > v2n they approach (1 moving toward 2). For elastic: 
v1n' = ((m1 - m2)/(m1+m2)) v1n + (2 m2/(m1+m2)) v2n
v2n' = (2 m1/(m1+m2)) v1n + ((m2-m1)/(m1+m2)) v2n
Tangential unchanged. This conserves momentum and kinetic energy. For equal masses swap normal comps.

But walls in discrete steps might allow overlap before detection. We check collisions each substep after integration. Since h small enough (e.g. 1/120, max velocity 4 => move 0.033) ball diameter .8, fine. But collision pair position correction.

Need guarantee "never stay overlapping" after step. We can do iterative separation at end. Also during step substeps. We can implement robust.

Potential issue: positional separation changes velocities? In physical elastic collision, balls at contact. If overlapping due to discrete, we separate along normal to exact contact and then collision. Need avoid energy loss. Position correction not affect velocities. Fine.

Need wall clamp after pair separation. But positional separation could push ball outside; clamp to wall, which may reintroduce overlap. Iterate until no overlaps. Could use sequential pair separation + wall clamp. With 20 balls, space plenty. Iterate maybe 10-20.

Need consider if balls start near walls but inside. Start positions random with margin r + small. Ensure non-overlap with distance > 2r + maybe 0.05. Use rejection sampling.

Random velocities speed 2..4: choose random direction (unit) times speed.

Need maybe deterministic? not required. Testing may inspect. Fine.

Need first frame ready. Set after renderer.render in loop first time. Use let firstFrame = true; after render if firstFrame set __ready. But must set __ready after first frame rendered. Use animation loop, render then set.

Need `step(dt)` exposed and updates live ball states. Need substeps. Could implement function step(dt: number) { if dt <=0 return; const maxSub = 1/240? We want stable. Compute substeps = Math.ceil(dt / (1/120)); cap dt? The render loop clamps 1/30. Testing may call step with various. Could internally clamp? Requirement step(dt) advances physics by dt seconds. Use substeps stable; if huge dt could many substeps but okay with cap maybe. Better: const h = Math.min(1/120, dt / Math.ceil(dt/(1/120)))? Actually substep count = Math.ceil(dt / 0.005?) Use fixed maxSub = 1/240? For speed 4 and radius .4, collision detection. Could use h = dt / n with n = Math.max(1, Math.ceil(dt / (1/120))). If dt huge 10 => 1200 substeps, fine maybe. For render dt <=1/30 => n<=4. Good. Testing likely dt small.

Need perhaps implement continuous collision? Discrete with substeps fine.

Need include velocities after wall collision. Let's think conservation of kinetic energy for ball-ball. The formula preserves total KE if no positional correction? Yes.

Implementation details:

const BOX = 5; const R = 0.4; const LIMIT = BOX - R; // 4.6
const balls: Ball[] = [];
type Ball = { x,y,z,vx,vy,vz,r,m }

Random placements: for each i, attempts up to e.g. 10000:
p random in [-LIMIT + maybe 0.1? ensure fully inside: x in [-LIMIT, LIMIT]. Should avoid exactly boundary? okay]
Check against existing balls distance > 2R + 0.02. If none accept.
Potential 20 balls in 9.2^3 volume, sphere radius .4, packing fine. Rejection sampling likely works.
Mass random 1+2*Math.random()? e.g. 1..3. Could be distinct? "use at least two different masses (e.g. random 1..3)" random has chance all same extremely low but could. Guarantee: assign alternating or random then force first two different. Better i<2 choose 1 and 3, rest random 1..3. Or mass = 1 + 2 * random, okay but guarantee use at least two by first mass 1, second 2. Maybe use `const m = i === 0 ? 1 : i === 1 ? 2.5 : 1 + 2*Math.random()`. Fine.

Colors based on mass, e.g. hue.

Mesh sync after each step? Need update meshes every render after step. Could either update in render loop. Use ballMeshes array. In loop after step, set mesh.position. Initial set too. But step may be called externally; expose live state only. Render loop syncs. For testing maybe scene mesh positions perhaps not checked. Fine. Could also sync inside step? But step doesn't know meshes? It can. We can define syncMeshes function and call in render and after step? But if external step and no render, not necessary. It says keep meshes in sync with physics. In render loop sync after step. Also call initial.

Need line segs edges visible. Use BoxGeometry(10,10,10), EdgesGeometry, LineSegments with LineBasicMaterial color 0xffffff maybe. BoxGeometry centered at origin. Edges. Maybe add a faint transparent box? They ask draw edges. No need.

Lighting: AmbientLight + DirectionalLight. DirectionalLight position (10,15,10). Maybe add one more? only needed. Use MeshStandardMaterial. Renderer antialias, color.

Camera placed so whole box visible. Set position maybe (12, 9, 14), lookAt(0,0,0). Update aspect. FOV 50. Distance enough. Box corners radius ~8.66. At distance ~20 maybe. Use (14,10,16) length >20. FOV 50 => vertical extent at distance? need visible. Or (13,9,15) distance ~21.6. Good.

Need handle window resize camera aspect renderer size.

Need strict TS. Avoid implicit any. Add types. `window as any`. Use `const win = window as any`. Fine.

Need import * as THREE from 'three'; no addons needed.

Potential strict issues: `renderer.setAnimationLoop((time: number) => { ... })` type callback? setAnimationLoop signature `(time: number, frame?: XRFrame) => void`. Accept. Use time. But need delta. `let lastTime = performance.now();` Or in callback `time` param in ms. Use elapsed. Use `const elapsed = time / 1000`? Need delta. Use `let last = 0;` initialize? First callback time maybe. `if (last === 0) last = time; const dt = Math.min(1/30, (time - last)/1000); last = time;`. But first delta 0. Fine.

Alternatively use `const clock = new THREE.Clock();` Clock getDelta. But animation loop uses time. Use lastTime = performance.now() before. In callback: now = performance.now(); dt = Math.min((now-last)/1000, 1/30); last=now. This uses real elapsed. Fine.

Need expose __sim as object. Type? `(window as any).__sim = { balls, step, paused: false };` But paused property must be mutable and reflect simulation loop. If we store an object `const sim = { balls, step, paused: false };` Then loop checks `if (!sim.paused)`. Expose `(window as any).__sim = sim;`. But requirement __sim = { balls, step, paused }. Good. The paused boolean property. Need when user sets `__sim.paused = true`, loop sees same object. Yes.

But we need `paused` initial false. Good.

Step function closure uses balls.

Implementation physics robust.

Let's design step in detail.

function step(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const maxSubDt = 1/120;
  const substeps = Math.max(1, Math.ceil(dt / maxSubDt));
  const h = dt / substeps;
  for (let s=0; s<substeps; s++) {
    // integrate
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }

    // wall collisions
    for (const b of balls) {
      // maybe check below -LIMIT or above LIMIT
      if (b.x < -LIMIT) { b.x = -LIMIT; if (b.vx < 0) b.vx = -b.vx; } else if (b.x > LIMIT) { b.x = LIMIT; if (b.vx > 0) b.vx = -b.vx; }
      similar. But if vx points outward? Use b.vx = -b.vx always when clamp? If at boundary and moving inward no clamp. If position beyond, velocity should be outward, so flip. But we can `b.vx = -b.vx` only if (b.x < -LIMIT && b.vx < 0)`. If position beyond lower due to integration, vx negative. Good. If pos beyond due to positive? no. But if pos exactly? okay. Use simple.

    // ball-ball collisions: iterate pair; only one pass per substep maybe. Need handle new overlaps. Could iterate 4 times.
    // To avoid multiple collision handling causing energy issues, for each substep, do pair detection and resolve.
    resolveCollisions();
  }
  // after all substeps, ensure no overlaps:
  separateAll();
}

Need resolveCollisions function. Pair:

for i<j:
 dx = b.x - a.x? Let's define a = balls[i], b=balls[j], dx=b.x-a.x, dy, dz; d2 = dx^2+...; minD = a.r+b.r =0.8.
If d2 < minD^2:
  if d2 < 1e-12: choose arbitrary normal (1,0,0) and d=0.
  else d=sqrt(d2); nx=dx/d...
  // separate positions to avoid overlap. Need mass-weighted. Since balls equal radii but masses differ. Physically impulse? Position correction relative to center of mass with weights inverse mass? If balls are rigid and overlap, to resolve inelastic geometrically, move along normal proportional to inverse mass (lighter moves more), preserving center of mass (mass-weighted). Compute overlap = minD - d. Correction along n from a to b: a moves - n * overlap * (m_b/(m_a+m_b))? Let's derive: Want new distance minD. Move a by -n*deltaA, b by +n*deltaB, deltaA+deltaB=overlap. Center of mass displacement m_a(-deltaA)+m_b(deltaB)=0 => -m_a deltaA + m_b deltaB=0 => deltaB = (m_a/m_b) deltaA. deltaA + (m_a/m_b) deltaA = overlap => deltaA = overlap * m_b/(m_a+m_b). deltaB = overlap * m_a/(m_a+m_b). Good. Then a -= n*deltaA; b += n*deltaB.
  // But if d=0, set positions maybe a -= n*(minD*m_b/(sum)); b += n*(minD*m_a/(sum)). overlap minD. fine.

  // collision velocities: compute along normal (a to b). approach condition? Need if relative velocity along n (v_rel = v_b - v_a) dot n? Let's derive. n points a->b. If a moving toward b, v_a·n >0; b moving away? Actually relative velocity v_a - v_b along n >0 means approaching (a catching b). In earlier v1n = v_a·n, v2n = v_b·n; if v1n > v2n they approach. So condition v_a·n > v_b·n. We can compute both.
  // Even after position correction, if positions separated at contact, any impulse? If balls are separating (v_a·n < v_b·n), no impulse needed. But if overlapping due to prior penetration, maybe collision should apply regardless? Physically if overlap and velocities separating, they may have already collided? However discrete step detection could see overlapping after they cross; if approaching condition false (separating), they might already be past collision. But overlapping requires separation; no velocity change. Fine.
  // Apply elastic collision along normal only if approaching: 
    const va = a.vx*nx + a.vy*ny + a.vz*nz;
    const vb = b.vx*nx + b.vy*ny + b.vz*nz;
    if (va > vb) {
      const ma=a.m, mb=b.m;
      const va2 = ((ma - mb)*va + 2*mb*vb)/(ma+mb);
      const vb2 = (2*ma*va + (mb-ma)*vb)/(ma+mb);
      // change normal comps
      a.vx += (va2 - va)*nx; ...
      b.vx += (vb2 - vb)*nx;
    }

This is elastic collision with masses. Does it conserve momentum? Let's test formula for p = ma*va + mb*vb. ma*va2 + mb*vb2 = ma[(ma-mb)va+2mb vb]/sum + mb[2ma va+(mb-ma)vb]/sum = (ma^2 -ma mb +2ma mb)va/sum + (2ma mb + mb^2 -ma mb)vb/sum = (ma^2 + ma mb)va/sum + (ma mb+mb^2)vb/sum = ma va + mb vb. yes. KE? yes.

But we apply position correction before velocity. If they were approaching and d<minD, okay.

Potential issue: if d very small, n arbitrary. Use deterministic based on i/j? If d2<1e-12, choose n from maybe difference of velocity? Could choose (1,0,0). Fine.

After resolving, walls may clamp. Need separateAll repeatedly. Let's structure:

function clampToBox(b: Ball) {
  const lim = BOX - b.r;
  if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
  else if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
  // Actually if exactly lim and vx>0, next integrate goes beyond and then flip. Fine.
  ...
}

Maybe wall collisions better:
if (b.x - r < -BOX) { b.x = -BOX + r; if (b.vx < 0) b.vx = -b.vx; }...
Same.

Need ensure no ball leaves box after separation. We call clamp after separation. But separation may move a ball beyond boundary; clamp. Then another iteration may separate again. Need final condition all inside and nonoverlap. Implement `settle()` with for iterations up to e.g. 50:
 for each ball clampToBox(b)
 let any = false;
 for pair if overlap: resolve (position separation and velocity collision)
 any true
 if !any break
But collision resolution inside settle may change velocities repeatedly? If we resolve same pair multiple times across iterations after clamping. If they remain overlap due to clamp, we may apply velocity collision only if approaching. If separating no velocity. Fine.

But we should integrate + clamp, then collision. At end settle all.

Potential tunneling? With substep h <= 1/120 and speed max 4, displacement 0.033 << diameter 0.8. Good. But if dt huge and we use substeps ceil(dt/(1/120)) h <= 1/120. okay.

However collisions between balls at high relative speed (max 8) displacement per substep .066, fine.

Now start non-overlap. Use rejection. Need ensure fully inside: LIMIT = 4.6; if start at exactly 4.6, radius touches wall, inside. fine. But perhaps avoid boundary by margin 0.05: `const placementLimit = BOX - R - 0.05;` We can use 4.55. Then balls not overlap.

Randomization: no seed, okay.

Maybe 20 balls at radius .4 in box, fine.

Need maybe expose balls exactly plain objects. Use `const balls: Ball[] = ...` and objects. `__sim.balls` is same. Good. Do not use Vector3 in ball state. Good.

Need perhaps `__sim.step` function typed. Good.

Potential strict TS with `window as any` fine. Need no unused variables? tsc strict doesn't error on unused unless noUnusedLocals, not part of strict. But avoid.

Need if `THREE` types? `LineSegments` etc. fine.

Let's write code.

```ts
import * as THREE from 'three';

type Ball = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; m: number;
};

const BOX_HALF = 5;
const RADIUS = 0.4;
const LIMIT = BOX_HALF - RADIUS;

const balls: Ball[] = [];

function dist2(a: Ball, b: Ball): number {
  const dx = b.x - a.x;
...
}

// Generate
const startLimit = BOX_HALF - RADIUS - 0.05;
for (let i=0; i<20; i++) {
  let x=0,y=0,z=0;
  let ok = false;
  for (let attempt=0; attempt<10000; attempt++) {
    x = (Math.random()*2 - 1) * startLimit;
    y = ...
    z = ...
    ok = true;
    for (const b of balls) {
      const dx = x-b.x...;
      if (dx*dx+... < (2*RADIUS + 0.02)^2) { ok=false; break; }
    }
    if (ok) break;
  }
  if (!ok) { // unlikely, still set? maybe skip. Need all 20.
  }
  const speed = 2 + Math.random()*2;
  // random unit vector. To avoid zero, use spherical
  const u = Math.random()*2 -1; // cos theta? 
  const phi = Math.random()*Math.PI*2;
  const sinTheta = Math.sqrt(1-u*u);
  const vx = speed * sinTheta * Math.cos(phi);
  const vy = speed * u;
  const vz = speed * sinTheta * Math.sin(phi);
  const m = i === 0 ? 1 : i === 1 ? 2.5 : 1 + Math.random()*2; // 1..3
  balls.push({ x,y,z,vx,vy,vz,r:RADIUS,m});
}
```

If no ok after 10000, we still push potentially overlapping. But practically no. Could fallback grid. Better robust: construct placements via jittered grid? 20 balls in box 9.2^3 with spacing. A 3x3x3 grid maybe 27 positions, use first 20, spacing about 2.3 >0.8. But start positions random? Not specified. Could use random rejection. 10000 enough. But to guarantee, perhaps implement systematic fallback. We can create grid positions with random jitter. Or simply do rejection and if fails, generate deterministic grid. We need guarantee no overlap. Let's do robust fallback if cannot place: find unused grid cell. But code simpler.

Use rejection then if !ok: Use grid: compute candidate positions on 3x3x3 grid: positions -3,0,3 in x, y, z (within box), each cell. But balls placed already? Could choose an unused grid slot not overlapping existing. Since existing random might overlap grid? Need check. Could just after loop if not ok, add position and rely? Better ensure with `while` attempt many and if fails, throw? But no.

Maybe pre-place using grid with random jitter? Since box huge, grid spacing 3, 27 slots. Start 20 balls at distinct grid slots with jitter ±0.5. Min spacing 3-1=2 >0.8. Fully inside if grid coords -3,0,3 plus jitter 0.5 => [-3.5,3.5] within 4.55. This guarantees non-overlap. But start positions not random? "Start positions must not overlap and fully inside"; not necessarily random positions. Velocities random. We can use grid+jitter, simpler robust. But balls in a box maybe look arranged somewhat. Could random shuffle slots and jitter. Need 20 balls. Use 3x3x3=27 positions, shuffle, pick 20. Jitter random ±0.4 maybe min distance between adjacent grid centers 3 - 0.8 = 2.2 >0.8. Guaranteed. Nice.

But if x coords -3,0,3 and jitter ±0.4 => max 3.4 < 4.55. Good. Use spacing 3? Box -5..5. radius 0.4, margin. yes.

Let's use positions:
const slots: {x,y,z}[] = [];
for ix of [-3,0,3], iy, iz push. Shuffle (Fisher-Yates). Pick first 20. For each slot add jitter of ±0.45 in each coordinate? Adjacent min coordinate difference 3 - 0.9 = 2.1 >0.8. Fine. Maybe jitter ±0.8 to look more random; min diff 3-1.6=1.4 >0.8. Fine. Use ±0.7. Max coordinate 3.7 inside 4.6. Good. Use 2*0.7. Min spacing 1.6 >0.8. Good. This ensures non-overlap. We can also add random velocities. Nice.

But "start positions must not overlap and fully inside", grid jitter satisfies. Need balls at least maybe within box. yes.

Need `balls.length === 20`. Good.

Alternative random rejection more natural but fallback. Grid is fine.

Now meshes. `const ballMeshes: THREE.Mesh[] = [];`

Geometry shared? Requirement "Render every ball as its own Mesh with SphereGeometry and MeshStandardMaterial". Can share geometry? "own Mesh with SphereGeometry and MeshStandardMaterial" Could use one geometry shared? It says every ball as its own Mesh with SphereGeometry and MeshStandardMaterial. Sharing is okay but to be safe each mesh own SphereGeometry. Could create each. Use `new THREE.SphereGeometry(0.4, 32, 16)` per ball. Material per ball. We'll do per ball.

Color by mass:
`const hue = (i / balls.length) * 0.8 + 0.1;` or based on m. Use HSV. `new THREE.Color().setHSL((i / 20) * 0.9, 0.65, 0.5)`. Strict okay.
`const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });`
Mesh castShadow? Not needed.

Scene background dark blue. Add ambient light `new THREE.AmbientLight(0xffffff, 0.6)`. Dir `new THREE.DirectionalLight(0xffffff, 1.2)` position (8,12,10). Maybe also not.

Box edges:
```
const boxGeo = new THREE.BoxGeometry(BOX_HALF*2, BOX_HALF*2, BOX_HALF*2);
const edges = new THREE.EdgesGeometry(boxGeo);
const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x88aaff }));
scene.add(line);
```
Could add a very faint transparent box material? Not required. No.

Camera:
```
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(12, 9, 14);
camera.lookAt(0,0,0);
```
Check visibility: Box corners [-5,5]. Camera at distance sqrt(144+81+196)=20.5. FOV 50 => vertical half-angle 25°, at center distance 20.5, vertical extent 9.6? Actually box half diagonal projected maybe 8.66. Need ensure. If camera looks at origin, bounding sphere radius 8.66. The angular size ~2*asin(8.66/20.5) = 50.0°? Exactly maybe fov 50 is tight. Need more distance. Use camera position (14,10,16), distance sqrt(196+100+256)=23.5, angular 2*asin(8.66/23.5)=43.2° < 50. Good. Aspect? width maybe > height. Fine. Could use fov 55. Use (13,9,15) distance 21.6, angular 46.9 <50. okay. Let's use (14,10,16), fov 50. Good. Or set camera fov 55 to be safe. Use 50 and distance 24. The bounding radius 8.66, half fov 25 => tan25*23.5=10.96 > 8.66. Good.

Renderer:
```
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // optional
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0'; // maybe
```
No other HTML. Body style can be via CSS? We can set style. Fine.

Resize:
```
window.addEventListener('resize', () => {
 camera.aspect = window.innerWidth / window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Physics functions.

Let's define `const minDist = 2 * RADIUS;` but balls radius exactly same. Use b.r + a.r maybe same. Use sum.

clamp:
```
function applyWallBounce(b: Ball): void {
  const lim = BOX_HALF - b.r;
  if (b.x < -lim) { b.x = -lim; b.vx = Math.abs(b.vx); }
  else if (b.x > lim) { b.x = lim; b.vx = -Math.abs(b.vx); }
...
}
```
Wait careful: If b.x < -lim (outside lower), its velocity should be negative (moving outward), flip to positive. `b.vx = Math.abs(b.vx)` sets positive, fine. If b.x > lim, sets negative. If velocity was already inward but clamped due to positional correction from collision? Suppose ball pushed beyond lower wall while velocity positive (inward). Then setting vx = Math.abs(vx) keeps positive, no flip. Good. If velocity negative, flips. So using direction by wall sign is correct: at lower wall outward velocity negative => abs; upper outward positive => -abs. This handles positional correction. Use:
```
if (b.x < -lim) { b.x = -lim; if (b.vx < 0) b.vx = -b.vx; }
else if (b.x > lim) { b.x = lim; if (b.vx > 0) b.vx = -b.vx; }
```
Wait if pushed outside lower with positive velocity (inward), no flip; good. If velocity at boundary moving outward? It would be outside and vx<0 then flip. Good. Need if exactly limit but moving outward, integration next step moves outside then flips. Fine.

Same for y,z.

Collision function:
```
function resolvePair(a: Ball, b: Ball): boolean {
  let dx = b.x - a.x; ...
  let d2 = ...
  const minD = a.r + b.r;
  if (d2 >= minD*minD) return false;
  let d = Math.sqrt(d2);
  let nx, ny, nz;
  if (d < 1e-9) {
    nx = 1; ny=0; nz=0; d=0;
  } else {
    nx = dx/d; ny=dy/d; nz=dz/d;
  }
  const overlap = minD - d;
  const sum = a.m + b.m;
  const moveA = overlap * (b.m / sum);
  const moveB = overlap * (a.m / sum);
  a.x -= nx * moveA; ...
  b.x += nx * moveB; ...
  // velocity impulse
  const va = a.vx*nx + ...
  const vb = ...
  if (va > vb) {
    const ma = a.m, mb = b.m;
    const vaNew = ((ma - mb)*va + 2*mb*vb) / (ma+mb);
    const vbNew = (2*ma*va + (mb - ma)*vb) / (ma+mb);
    const dva = vaNew - va;
    const dvb = vbNew - vb;
    a.vx += dva*nx; ...
    b.vx += dvb*nx; ...
  }
  return true;
}
```
Need consider if d=0: overlap = minD. Move a left, b right. Good.

But applying position separation before velocity and using n. If d=0, normal arbitrary. Could produce weird but extremely unlikely.

Settle:
```
function resolveOverlapsAndWalls(): void {
  for (let iter=0; iter<30; iter++) {
    for (const b of balls) applyWallBounce(b);
    let changed = false;
    for (let i=0; i<balls.length; i++) {
      for (let j=i+1; j<balls.length; j++) {
        if (resolvePair(balls[i], balls[j])) changed = true;
      }
    }
    if (!changed) {
      // ensure walls again? Already at start of iteration. If no pair changed, done.
      break;
    }
  }
  // final clamp
  for (const b of balls) applyWallBounce(b);
}
```
But if resolvePair changes positions causing walls, next iter clamp. Good. Need guarantee no overlaps after final clamp. Final clamp might reintroduce overlap? Suppose after last iteration changed false, we clamp; clamping at start of last iteration occurred before pair resolution. Wait in loop: clamp all, then resolve pairs. If no pair changes, break. Then final clamp. Since no pair changed, positions are nonoverlap and within walls (clamped). Final clamp no effect. If changed true in last iteration and loop ends at max 30, final clamp might reintroduce? unlikely. Could do more iterations. Use 50. Fine.

Potential issue: Wall bounce sets velocity components to abs/neg; pair collision may change velocities. In each substep, integrate then call resolveOverlapsAndWalls. But if pair collision occurs and velocity change results in ball moving toward wall, next substep handles. Good.

Important: Applying position separation changes positions but not velocities. In a substep, after integration and clamp, then resolve. Fine. But after resolveOverlapsAndWalls, velocities may have been flipped by wall clamps due to separation. If a ball is pushed into wall and clamped, its velocity may be altered even if it wasn't moving toward wall. The `applyWallBounce` flips only outward components. Fine. But the collision impulse may have made it outward; that should be reflected. Good.

However, in `resolveOverlapsAndWalls`, pair collision may happen multiple times with same pair across iterations because positions after separation exactly at contact and d2 >= minD? If we set distance exactly minD, then `d2 >= minD*minD` true (with floating) so no further. Good. But if clamp reduces distance? e.g. ball pushed wall and clamped, distance becomes smaller; next iteration resolves. Good.

Need no ball "stay overlapping". After step all pairs distance >= 2R maybe exactly. Floating tolerance. We can check with `d2 < minD*minD - 1e-9`? But if exactly equal, okay. Use resolution threshold `if (d2 >= minD*minD) return false`. If floating slightly less, resolve. Fine.

Now step substeps. Should we call resolve after integration each substep. Need if dt large, many substeps. We can cap maximum substeps maybe 200 to avoid excessive? But step should advance dt. Could use `const maxSub = Math.max(1, Math.ceil(dt / (1/120)))`; if dt huge 1000 -> 120k loops, okay maybe not test. But user may call step(1) test. Fine. Maybe cap substep dt to 1/120 and cap number? Requirement step advances by dt. Keep.

Could optimize by maxSubDt = 1/180. 1/120 fine.

Potential subtlety: For collision detection with substeps, balls can collide and separate at contact; if they are overlapping at start of step due to some prior? __sim balls may be modified by test? Not likely. But step should settle.

Need render loop sync meshes:
```
function syncMeshes(): void {
  for (let i=0; i<balls.length; i++) {
    const b = balls[i]; ballMeshes[i].position.set(b.x,b.y,b.z);
  }
}
```
Initial sync after creation before loop? Call after meshes created.

Animation loop:
```
const sim = { balls, step, paused: false };
(window as any).__sim = sim;

let lastTime = performance.now();
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const now = performance.now();
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 1/30);
  if (!sim.paused && dt > 0) step(dt);
  syncMeshes();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```
Need note if first frame delta maybe huge; clamp 1/30. Good. `sim` has type inferred `paused: boolean`. `(window as any).__sim = sim;`.

Need expose scene camera renderer before/after. Do:
```
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```
Do before animation.

Need `__ready` after first frame. Good.

Strict TS: `document.body.style.margin = '0';` fine. `document.body.style.overflow = 'hidden';`

Need `THREE.Color.setHSL` returns Color. fine.

Potential issue with `renderer.setAnimationLoop` callback param `time: number`; if we ignore, use performance.now. fine.

Now think about the physics more deeply: Does the ball-ball collision conserve energy with masses if applying position separation and then velocity impulse? Yes.

But if pair overlaps and is approaching, we separate positions first. The impulse formula assumes normal velocities at contact. Good.

But in a substep, after integrating positions, if a pair is overlapping, we separate and apply impulse. However if the pair had already collided in a previous substep and is at exact contact moving apart, we don't apply impulse. If they remain overlapping due to numerical, we separate with no impulse. Fine.

Could we miss a collision entirely if they cross within substep? With substep small and diameter large, positions overlap after integration if they crossed. They can't cross and separate without detection because maximum displacement per substep 0.033, diameter 0.8. Good.

What if dt is called with small e.g. 1/60. substeps 2, h=1/120. fine.

Wall collisions: no loss. Perfect.

Need maybe include "no gravity": velocities constant except collisions. yes.

Could add grid floor? No.

Let's consider test harness: They might do `__sim.paused = true; const before = ...; step?` They may call step(0.1) and inspect balls. We expose plain numbers. Good. They may inspect `balls.length === 20`, radii .4. Good. They may set paused true and rely on loop not calling step. Our loop checks `sim.paused`. Good.

They might test balls inside: min coordinate >= -5? Our LIMIT = 4.6 so positions within [-4.6,4.6], plus radius -> [-5,5]. Good.

They might test no overlaps: distance >= 0.8. Our separation exact. Floating maybe. Good.

They might test masses at least two distinct. We assign first 1, second 2.5, rest random. Good.

They might test render meshes sync; scene contains meshes. Good.

Potential issue: "Every ball has radius exactly 0.4 and a mass; use at least two different masses (e.g. random 1..3)." We set r=0.4. Good.

Now, one concern: `applyWallBounce` using `if (b.vx < 0) b.vx = -b.vx` only if outside lower. But if a ball is clamped by positional correction to lower wall while velocity is positive (moving inward), no flip. Good. If clamped at lower wall while velocity zero? no. If clamped upper while velocity positive, flip. If velocity negative, no. Good.

But what about ball exactly at boundary and velocity outward but not yet integrated? Next substep integration moves outside then flips. Good.

Initial positions from grid jitter: x values could be -3.7 etc. Inside. Need ensure if jitter ±0.7 and slot 3, max 3.7; min -3.7. Within 4.6. Good. Min distance between adjacent slots along an axis: 3 - 2*0.7 = 1.6. But diagonal? If both jitter opposite in all axes, distance sqrt(1.6^2+1.6^2+1.6^2)=2.77; if same axis adjacent only 1.6. >0.8. Good. However, slots at coordinates -3,0,3; jitter per slot independent ±0.7. Two slots in different axes e.g. (-3,-3,-3) and (-3,-3,0) difference z 3 ±1.4 = 1.6 min. Good. No overlap. But our code doesn't check; okay.

Shuffle slots:
```
const slots: [number,number,number][] = [];
for (const x of [-3,0,3]) for (const y of [-3,0,3]) for (const z of [-3,0,3]) slots.push([x,y,z]);
for (let i=slots.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
```
Strict TS destructuring okay. Then use first 20. But if `slots[i]` type? tuple. `[slots[i], slots[j]] = [slots[j], slots[i]]` okay. Could use temp to avoid possible noUncheckedIndexedAccess? Strict doesn't include noUncheckedIndexedAccess by default? Actually `tsc --strict` includes strictNullChecks but not noUncheckedIndexedAccess. `slots[i]` type tuple, okay. If noUncheckedIndexedAccess not in strict. Fine. But to be safe use temp.

Could avoid shuffle complexity:
```
const shuffled = slots.sort(() => Math.random() - 0.5);
```
Sort randomness not ideal but fine. Use Fisher-Yates.

Then:
```
for (let i=0; i<20; i++) {
  const slot = slots[i];
  const x = slot[0] + (Math.random()*2-1)*0.7;
...
}
```

Mass assignment:
```
const m = i === 0 ? 1 : i === 1 ? 3 : 1 + Math.random()*2;
```
At least two distinct.

Velocities:
Use random unit:
```
const theta = Math.random() * Math.PI * 2;
const u = Math.random() * 2 - 1;
const s = Math.sqrt(1 - u*u);
const speed = 2 + Math.random() * 2;
const vx = speed * s * Math.cos(theta);
const vy = speed * u;
const vz = speed * s * Math.sin(theta);
```
Speed exactly in [2,4). Good.

Need maybe `const m = ...` but if i=1 m=3, rest 1+random*2 gives [1,3). Fine.

Now scene meshes and materials. We can color based on mass: 
```
const color = new THREE.Color();
color.setHSL((i / balls.length) * 0.85, 0.75, 0.55);
```
Maybe hue with mass for visual. Use i.

Mesh:
```
for (let i=0; i<balls.length; i++) {
  const b = balls[i];
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(b.r, 24, 16),
    new THREE.MeshStandardMaterial({ color: ..., roughness: 0.35, metalness: 0.15 })
  );
  mesh.position.set(b.x,b.y,b.z);
  scene.add(mesh);
  ballMeshes.push(mesh);
}
```
Need `ballMeshes` declared before. Good.

Lights. Directional light maybe target default origin. `dir.position.set(8,12,10)`. `scene.add(dir);` It defaults target at origin, so good.

Add maybe a small point? Not needed.

Camera lookAt. `camera.lookAt(0,0,0);`

Resize handler: `camera.aspect = window.innerWidth / window.innerHeight;` Strict if innerHeight zero? no.

Potential issue: `THREE.SRGBColorSpace` exists in r152+. Three latest. We can set `renderer.outputColorSpace = THREE.SRGBColorSpace;`. If tsc types version includes. likely. Could omit to avoid version. But not needed. Use `renderer.toneMapping = THREE.ACESFilmicToneMapping;`? Maybe not. Keep simple. `renderer.setPixelRatio`. Good.

Need no addons. Import only THREE. The rule says addons from `three/addons/...` if used; no use. Fine.

Need one code block only.

Let's verify strict compile potential issues:
- `const slots: [number, number, number][] = [];` pushing `[x,y,z]` inferred as number[]? Actually `[x,y,z]` contextual type to tuple because slots push expects tuple. Fine.
- `const slot = slots[i];` if `i` maybe undefined? type tuple. fine.
- `new THREE.Color().setHSL(...)` returns Color. fine.
- `MeshStandardMaterial({ color })` color can be THREE.Color. fine.
- `window as any` fine.
- `performance.now()` DOM types. Good.
- Type `Ball` fields all numbers.
- `const sim = { balls, step, paused: false };` step function declaration hoisted? `function step` later? We define step before sim? If `step` function declaration, hoisted. `balls` defined earlier. Good. We can define step before sim. `sim` object paused property inferred boolean (not literal? with false, type boolean? In TS, object literal `paused: false` infers boolean? Actually property type is boolean, not literal false, so can set true. Good.)
- In animation loop, `sim.paused` boolean. good.
- `renderer.setAnimationLoop(() => { ... });` return type void. fine.
- `document.body.style.margin = '0';` fine.

Let's think about `resolveOverlapsAndWalls` and velocity changes during separation. Could applying velocity impulse multiple times for same pair across iterations happen if positions not exactly minD due to wall clamp? Suppose pair separated to contact, then a wall clamp moves one away from wall but distance remains >= minD? If clamp moves a ball inward (away from wall) because it was outside, separation distance can increase or stay. It won't decrease? If a was pushed outside lower, clamp moves it right (inward), which could move it closer to b if b is to the right. Yes could reduce distance. Then next iteration resolves again and may apply another impulse if still approaching. But after first collision impulse, velocities likely separating, so no second impulse. If still approaching due to wall? Hmm if a velocity was outward and flipped, it becomes inward toward b, causing second collision. But that's physically plausible: ball hits wall and then hits neighbor. It could happen within same substep if positions overlapping? But wall clamp is instantaneous. We might apply multiple impulses in one substep due to resolution iterations. This could alter energy? Each elastic collision conserves energy. But repeated collisions in same substep might be physically weird but acceptable. Energy conserved. No overlap. Good.

However, there is a subtle issue: Position separation with mass weighting followed by wall clamp can move balls without velocity adjustment, potentially injecting/removing energy? Position correction doesn't affect KE. It's geometric. The velocities after wall bounce reflect walls. Fine.

Could there be an endless loop where positions oscillate? Limit 50. Fine.

Need maybe separate at the end after all substeps to ensure no overlap. Our resolve after each substep includes final clamp. Good.

Potential issue: balls may be overlapping at start of step? no.

Let's maybe add a final `settle()` after loop to be safe:
```
for (let s=0; s<substeps; s++) { integrate; resolveOverlapsAndWalls(); }
resolveOverlapsAndWalls();
```
But resolveOverlapsAndWalls after last substep already called. Extra doesn't hurt. Maybe not.

Now consider if dt is very small, e.g. 0.001. substeps = ceil(0.001/0.00833)=1, h=0.001. Fine.

Need no gravity. yes.

Let's maybe use `const MAX_SUBSTEP = 1/120;` etc.

Let's write final code carefully.

Potential hidden test: They might call `__sim.step(1/60)` repeatedly and then inspect all balls within box and not overlapping. Our step function uses substeps. Good.

They might check `paused` property exists and can be set. yes.

They might check `__ready` after some frames. yes.

They might check renderer canvas appended. yes.

Let's ensure `__scene`, `__camera`, `__renderer` set before animation loop. yes.

Now, maybe they expect `__sim.balls` live state updates by step. Our balls objects mutated. yes.

Let's produce code.

One more consideration: `Box` edges visible. Using `BoxGeometry(10,10,10)` and EdgesGeometry. LineSegments. Good. Could add `line.position` at center origin. yes.

Camera visibility: With camera at (14,10,16), fov 50, aspect typical. The box corners projected. Vertical half extent needed 8.66? Actually bounding sphere radius 8.66. At distance 23.5, half-angle needed asin(8.66/23.5)=21.6°, fov half 25°, good. Horizontal fov if aspect >1 bigger. If aspect <1 (portrait), horizontal half angle smaller but bounding sphere uses vertical; vertical half angle still 25. Good. If aspect very narrow, horizontal half angle < vertical but needed horizontal extent maybe also 8.66; with aspect 0.5, horizontal half-angle = atan(tan25*0.5)=13.1°, at distance 23.5 => 5.5, not enough. But typical. Requirement camera placed so whole box visible. Could ensure by using fov 60 and position further. For any aspect, if narrow portrait, horizontal could be issue. Maybe use camera at (16,12,18) distance 27.5. fov 55. For aspect .5 horizontal half-angle ~ atan(tan27.5*.5)=14.5° -> half width 7.1, still less than 8.66. But browser window likely aspect > 1. Could dynamically fit? Not necessary. But to be robust, set camera position farther: (18,14,20), distance ~30.4. fov 60: vertical half 30°, horizontal at aspect 0.5 -> atan(tan30*0.5)=16.1°, half width 8.8 at distance 30.4. Good. At aspect 1, fov 60 half 30 -> half height 17.6 >. So use camera position (16,12,18)? distance 27.5, fov 60, half height 15.9, enough. At aspect 0.5 half width 7.9 <8.66. Use (18,14,20) distance 30.4, half width 8.8. Good. But camera far makes box smaller. Fine.

Use fov 50 and position (18,14,20): distance sqrt(324+196+400)=30.4. half vertical tan25*30.4=14.2 >8.66, horizontal at aspect .5 = tan25*.5*30.4=7.1 <8.66. Use fov 55: half vertical 0.52, distance 30.4 -> 15.8; horizontal aspect .5 ->7.9. Still less. Use fov 60: horizontal .5 ->8.8. Good. So fov 60 position (18,14,20). At aspect 1 vertical 17.6, box fits. Good.

But camera at (18,14,20) distance 30.4, box appears smaller but visible. Good. Use fov 60.

Maybe set camera at (14,11,16) distance 24, fov 65? half vertical tan32.5*24=15.3, horizontal .5 ->7.6. Not. Use (18,14,20) fov 60. Good.

Alternatively dynamically compute camera distance based on aspect? Overkill. Fine.

Now final code. Ensure no trailing weird.

Let's write step function:

```
function step(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const maxSub = 1 / 120;
  const n = Math.max(1, Math.ceil(dt / maxSub));
  const h = dt / n;

  for (let s = 0; s < n; s++) {
    for (const b of balls) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.z += b.vz * h;
    }
    resolveOverlapsAndWalls();
  }
}
```

Need `resolveOverlapsAndWalls` defined before step? Function declarations hoisted. fine.

But there is an issue: If dt is extremely large, `n` can be huge and loop slow. Could cap n at maybe 5000? But step must advance dt. For testing, dt likely small. We can set `const n = Math.max(1, Math.min(1000, Math.ceil(dt / maxSub)));` but then h = dt/n could be >1/120, less stable. Not good. Leave.

Potential optimization: compute h as `Math.min(maxSub, dt)`? No. Better.

Now `resolveOverlapsAndWalls`:

```
function resolveOverlapsAndWalls(): void {
  for (let iter = 0; iter < 40; iter++) {
    for (const b of balls) clampToBox(b);
    let any = false;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (resolvePair(balls[i], balls[j])) any = true;
      }
    }
    if (!any) break;
  }
  for (const b of balls) clampToBox(b);
}
```
But note: clampToBox at start of each iteration and final clamp after break. If any false, positions nonoverlap and clamped. Final clamp no effect. Good.

Potential issue: In resolvePair, if d2 < minD^2, we apply. If pair non-overlap but still at distance exactly minD, returns false. If `any` false but some overlap due to floating? no.

Could there be a case where resolvePair returns true, but after resolving all pairs, some pair that was already resolved became overlapping due to another pair's separation? Next iteration handles. Good.

Now, `clampToBox` final could reintroduce overlap if the last iteration changed true, then loop reaches 40 and exits, final clamp might move balls and overlap. But 40 iterations likely enough. Could instead after final clamp, do a final separation loop that includes wall clamp every iteration, and ensure after final iteration we check. We can use 60. Probably fine. To be robust, use 100 iterations maybe. 20 balls, cheap. Use 64. Fine.

Maybe final clamp should be inside loop and after loop no need? We have clamp at start of each iteration, and after break. If max iterations reached with any true, final clamp might reintroduce. 64 enough. Fine.

Now, one subtlety: In `resolvePair`, after separating positions, if `va > vb`, we apply impulse. But what if the pair is overlapping and relative normal velocity is zero? va == vb, no impulse. They remain at contact after separation, moving parallel. They might continue overlapping? We set distance exactly minD, so no. If both velocities have same normal component, they stay at same distance if moving parallel? Actually if same normal component, relative normal zero, distance remains similar. fine.

But what if va < vb (separating), we separate positions but no impulse. That can increase distance to minD. Fine. It could give an outward geometric separation but velocities separating. Good.

Now, should the impulse condition be `va > vb` even if they are not approaching because one is behind? Yes.

Let's verify formula with n from a to b. Suppose equal masses, va=1, vb=0 (a moving toward b). Formula: va2 = ((1-1)*1+2*0)/(2)=0; vb2=(2*1+0)/2=1. swap. Good. If va=0, vb=1 (b moving away), va<vb no impulse. Good.

For unequal masses, test ma=1, mb=3, va=2, vb=0. va2 = ((1-3)*2 + 0)/(4) = -1; vb2=(2*1*2 + (3-1)*0)/4=1. Momentum before 2, after -1+3=2. KE before 0.5*1*4=2, after .5*1*1 + .5*3*1=0.5+1.5=2. Good.

Now, `resolvePair` position separation weights. For a light ball a (m=1) and heavy b (m=3), overlap 0.1: moveA=0.1*3/4=0.075 (light moves more), moveB=0.1*1/4=0.025. Good.

Potential issue: Position separation with weights can move heavy ball toward wall less. Good.

Now, initial mesh sync. We can call `syncMeshes()` after creating meshes. But `syncMeshes` function defined later? Function declarations hoisted. Or just set positions in mesh creation with b.x. Already set. Fine.

In loop, sync before render after step.

Now, use `renderer.setAnimationLoop`. Need maybe check `__ready` first frame after render. good.

One concern: The test harness may set `(window as any).__sim.paused = true` after our loop starts. We check `sim.paused`. yes.

Let's write.

Wait, rule: "The render loop calls step() with the frame delta (clamp it to at most 1/30 s) when not paused." We use performance.now difference, clamped. Good.

"After the first frame is rendered, set __ready = true." We do after render. Good.

"Expose for testing __scene, __camera, __renderer". yes.

"Box: the cube from -5 to +5 on every axis. Draw its edges..." yes.

"Every ball has radius exactly 0.4..." yes.

"Start positions must not overlap and must be fully inside the box" yes.

"Start velocities random, speed about 2..4 units/s." yes.

"Physics perfectly elastic collisions with walls and between balls (use masses, conserve momentum and kinetic energy). Balls must never leave box and never stay overlapping (separate overlapping pairs)." yes.

"Render every ball as own Mesh..." yes.

No external assets. yes.

Let's final code.