Direct implementation. Physics: elastic collisions, masses. Wall collision: reflect velocity along axis, push ball back inside. Ball-ball: elastic collision impulse formula. Substeps: e.g. fixed dt of 1/240 or substeps count based on dt.

Write step(dt) with substeps: n = Math.ceil(dt / (1/240)) or fixed number like 8; sub = dt/n.

Ball-ball collision: if dist < 2r, separate along normal proportional to inverse mass, and if moving toward each other apply impulse: j = -(1+e)*(vrel·n)/(1/m1+1/m2), e=1. Update velocities.

Wall: if x - r < -5: x = -5 + r; vx = |vx|. Similarly others.

Render loop: delta = clock.getDelta(), clamp to 1/30, if !paused step(delta). Set __ready after first render — use a flag set after renderer.render first time; simplest: after first frame in loop set __ready = true (render happens inside loop). Use renderer.setAnimationLoop(callback); first call renders then sets flag.

Start positions: place on grid to avoid overlap, e.g. random within [-4.5,4.5] with rejection sampling. 20 balls, r=0.4. Use rejection sampling with min distance 1.0, keep positions within [-4.6, 4.6] maybe [-4.5,4.5].

Code:

import * as THREE from 'three';

scene, camera perspective at (12,10,12) lookAt origin. renderer with antialias. EdgesGeometry(BoxGeometry(10,10,10)) line segments.

Balls array plain objects; meshes with random color materials.

step function:

function step(dt: number) {
  const sub = 4? Let's do: const maxSub = 1/240; n = Math.max(1, Math.ceil(dt/maxSub)); h = dt/n;
  loop: integrate positions, wall collisions, ball-ball.
}

Ball-ball elastic with equal radii:

for i<j: dx..., d2 = dx²+dy²+dz²; if d2 < (0.8)² and d2 > 0: d = sqrt; n = d; relative velocity along normal vn = (vi - vj)·n; if vn > 0? Sign: normal from i to j. vi·n - vj·n > 0 means approaching? If normal points from i to j, approaching when (vi - vj)·n > 0. Then impulse j = 2*vn/(1/mi+1/mj) (for e=1, impulse magnitude = (1+e)*vn / invMassSum = 2vn/invSum). vi -= j/mi * n; vj += j/mj * n. Separation: overlap = 0.8 - d; move i by -n*overlap*(mj/(mi+mj))? push each by inverse mass proportion: i moves -n * overlap * (invI/(invI+invJ))... simpler: equal split.

Wall: for each axis: pos - r < -5 → pos = -5+r, vel = abs(vel); pos + r > 5 → pos = 5-r, vel = -abs(vel).

Camera: fov 50, position (10, 8, 14)? distance ~ sqrt(100+64+196)=~18.6; box half diag ~8.66; fov 50 → visible distance ~ 8.66/tan(25°)=18.6. Tight. Use fov 55 or distance ~22: (12,10,16)? length sqrt(144+100+256)=21.9. Fine with fov 50.

Lights: ambient + directional.

Write the code.