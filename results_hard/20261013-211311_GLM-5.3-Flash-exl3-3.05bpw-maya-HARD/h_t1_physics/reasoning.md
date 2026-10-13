Build a single TS file. Standard elastic collision physics. Need to expose __sim with balls plain objects whose properties are live numbers updated by step — so I should keep the ball state as plain objects and reference them directly (mesh position synced each frame).

Substeps: e.g. fixed substep size, divide dt into n substeps where n = ceil(dt / (0.004)) or something ensuring no tunneling: max speed ~ maybe higher after collisions but elastic conserves energy so speeds bounded ~ initial max * sqrt... fine. Use substep ~ 0.002s.

Collision handling: for pair (i,j): overlap if dist < r1+r2 (0.8). If approaching (relative velocity along normal < 0), apply elastic impulse: j = -(1+e)*vn / (1/m1+1/m2), e=1. Then positional correction: separate overlapping pairs — push apart along normal proportional to inverse mass.

Walls: if x - r < -5 and vx < 0 → vx = -vx, clamp position. Perfectly elastic.

Non-overlap start: grid placement 20 balls, jitter positions slightly? Grid 3x3x3 = 27 slots, take 20, positions at spacing > 0.8. Use slots spaced 2.5 apart? Box -5..5, grid coords -3.3, 0, 3.3 with spacing 3.3 > 0.8, fully inside (radius 0.4). Add small random offset < (3.3-0.8)/2 to keep separation. Or just place at grid points without jitter, simpler and guaranteed. Slight jitter: offset up to 1.0 still keeps min separation 3.3-2.0=1.3 > 0.8. Fine.

Masses random 1..3. Velocities random direction, speed 2..4.

Camera: perspective at (10, 8, 12) looking at origin, fov such that box fits. Distance ~ sqrt(100+64+144)=~17.6. fov 50 fine.

Render loop: clock delta clamped to 1/30, if !paused step(dt). Sync meshes. Set __ready after first frame rendered — use a flag set after renderer.render call in first iteration.

step function exposed uses same physics as internal; internal loop calls __sim.step? Simplest: define step(dt) function, expose it. paused boolean exposed as property of sim object.

Write code.

Substep: const MAX_SUBSTEP = 0.002; n = Math.max(1, Math.ceil(dt / MAX_SUBSTEP)); h = dt/n.

Ball interface plain: { x,y,z,vx,vy,vz,r,m }.

Physics step(h): integrate positions, wall collisions, pair collisions (with separation). Order: move, then resolve walls (clamp), then pairs: for each pair check overlap, impulse if approaching, then positional separation always (split overlap evenly weighted by inverse mass, but ensure fully separated: move each by half the overlap along normal? For masses equal-ish fine). Also after separation re-check walls clamp.

To guarantee "never stay overlapping": after impulse, push apart by overlap amount: overlap = (r1+r2) - dist; move each along normal by overlap * (invMi/(invMi+invMj)) etc. That fully separates. Then clamp inside box again.

tsc strict: careful with types.

Edges: new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(10,10,10)), new THREE.LineBasicMaterial({color:0xffffff})).

Lights: AmbientLight(0xffffff, 0.4), DirectionalLight(0xffffff, 1) at (8,12,10).

Materials: MeshStandardMaterial with random colors, metalness 0.1, roughness 0.4.

Code:

```ts
import * as THREE from 'three';

interface Ball { x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;m:number; }

const BOX = 5;
const R = 0.4;

function createBalls(): Ball[] { ... grid ... }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11131a);
camera...
renderer...
lights...
box edges...
balls, meshes...

function step(dt: number): void {
  const maxSpeed = ... just fixed: const SUB = 1/240? 0.0041667. speeds up to maybe 6 after elastic exchanges? Elastic collisions conserve energy; with 20 balls total KE fixed; max single-ball speed bounded by total KE: KE_total = sum 0.5 m v^2, m up to 3, v up to 4 → KE up to 24 per ball, total maybe ~300; lightest ball m=1 could get v = sqrt(2*300/1) ≈ 24. Unlikely but possible. Use substep h such that h * v_max < R: with v_max ~ 25, h < 0.016. Use SUB = 0.004 → safe enough. Actually to be robust compute substeps dynamically based on current max speed: n = ceil(dt*h_max... Let's do: const vmax = max current speed; const hMax = Math.min(0.005, R*0.5 / Math.max(vmax, 1)); n = ceil(dt/hMax). Fine.

  const n = ...; const h = dt/n;
  for (let s=0; s<n; s++) substep(h);
}

substep(h): 
  for each ball: x += vx*h etc.
  walls: for each axis: if (b.x - R < -BOX) { b.x = -BOX + R; if (b.vx < 0) b.vx = -b.vx; } similarly +.
  pairs: double loop i<j: dx etc, distSq < (0.8)^2 → dist = sqrt (guard dist>1e-9 else random normal). nx=dx/dist.
    vn = (vi - vj)·n where n points from j to i? Define n from i to j: dx = xj - xi. rel velocity along n: vrel = (vj - vi)·n; if vrel < 0 (approaching): impulse scalar p = -(1+e)*vrel / (1/mi + 1/mj)... elastic: j = 2 * vrel / (1/mi+1/mj)? Standard: impulse magnitude J = -(1+e) * vrel_n / (invM1+invM2) where vrel_n = (v2-v1)·n, n from 1 to 2, e=1 → J = -2*vrel_n/(invM1+invM2). Then v1 -= J*invM1 * n; v2 += J*invM2 * n. Check: vrel_n < 0 (approaching) → J positive... -2*negative/pos = positive; v1 -= positive*invM1*n → v1 moves away from 2 (opposite n). Good.
    Separation: overlap = (R*2) - dist; total inv = invMi+invMj; b.x -= n.x * overlap * (invMi/total); b.xj += n.x * overlap * (invMj/total). Then re-clamp walls.

  Also after pair loop clamp walls again (cheap).

paused: const sim = { balls, step, paused: false }; render loop: const dt = Math.min(clock.getDelta(), 1/30); if (!sim.paused) sim.step(dt); sync meshes; renderer.render; if first frame set __ready.

Sync: mesh.position.set(b.x,b.y,b.z).

Resize handler.

Expose __scene etc.

Write final.