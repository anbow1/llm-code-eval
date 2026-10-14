Write straightforward code. Balls: plain objects with x,y,z,vx,vy,vz,r,m. step(dt) with substeps. Elastic collisions.

Implementation: substep size ~ 0.002? Use n = ceil(dt / 0.005). Positions updated each substep; wall collision clamp. Ball-ball: relative velocity along normal, impulse for elastic with masses: standard.

Also separate overlapping pairs positionally: push apart along normal.

Write code:

```ts
import * as THREE from 'three';

const BOX = 5;
interface Ball { x,y,z,vx,vy,vz,r,m:number }
```

Initial placement: 20 balls, random positions within [-5+r, 5-r] margins, ensure no overlap (dist > 2r). Retry loop.

Meshes: SphereGeometry(0.4, 24, 16), MeshStandardMaterial random color.

Lights: AmbientLight, DirectionalLight.

Camera: PerspectiveCamera at (10,8,12) looking at origin.

__sim.expose balls array (same objects), step, paused.

First frame ready flag: use renderer.setAnimationLoop with function; set __ready after first render.

Write the file.