The user wants a single TypeScript file. Note winding: faces point up. With standard indices, for triangles (a, b, d) and (b, c, d) with grid... Let me think. Grid index i = z * size + x. Vertices: x from -10 to 10, z from -10 to 10. Triangle winding for +Y facing: counter-clockwise when viewed from above (+Y looking down). For a quad with a=(x,z), b=(x,z+1), c=(x+1,z+1), d=(x+1,z): triangles (a, c, b) and (a, d, c)? Let me compute: viewed from above with x right, z toward viewer... Actually easier: upward normal requires cross product edge1 × edge2 positive Y.

Take quad corners: p00 (x,z), p10 (x+1,z), p01 (x,z+1), p11 (x+1,z+1). Triangle (p00, p11, p10): edges e1 = p11-p00 = (+1,?,+1), e2 = p10-p00 = (+1,0,0). Cross e1×e2 = (e1.y*e2.z - e1.z*e2.y, e1.z*e2.x - e1.x*e2.z, e1.x*e2.y - e1.y*e2.x) = (0*0 - 1*0, 1*1 - 1*0, 1*0 - 0*1) = (0,1,0). Up. Good.

So triangles: (a, b+d, b) i.e. (i, i+size+1, i+size) and (i, i+1, i+size+1)? Check (p00, p11, p01): e1=(1,0,1), e2 = p01-p00 = (0,0,1). cross = (0*1-1*0, 1*0-1*1, 1*0-0*0) = (0,-1,0). Down. Hmm.

Let me use standard: for each cell, triangles (a, b, c) where a=i, b=i+size, c=i+size+1... wait let me define indices with x varying fastest: index = z*size + x. Then i+1 is +x neighbor, i+size is +z neighbor.

Triangle 1: (i, i+size, i+size+1)? corners p00, p01, p11. e1 = p01-p00 = (0,0,1), e2 = p11-p00 = (1,0,1). cross y = e1.z*e2.x - e1.x*e2.z = 1*1 - 0 = 1. Up. Good.

Triangle 2: (i, i+size+1, i+1): p00, p11, p10. e1=(1,0,1), e2=(1,0,0). y = e1.z*e2.x - e1.x*e2.z = 1*1 - 1*0 = 1. Up. Good.

So triangles (i, i+size, i+size+1) and (i, i+size+1, i+1).

Grid 128x128 vertices means size=128, cells 127x127.

Height function: sum of 3 sine/cosine layers, amplitude ~2.

Terrain 20x20 units centered.

Colors: green low, brown middle, white high. Normalize height.

Camera above at angle, terrain visible: position like (14, 12, 14), lookAt origin, controls target origin.

MeshStandardMaterial side: can be double-sided or front. Fine with default; normals up.

Write value-noise? The prompt allows sine layers — I'll do layered sines with a hash-based value noise? Keep it simple with sin/cos layers but add slight value noise? "or a small value-noise function you write yourself" — either is fine. I'll do 3 sine/cosine layers.

Code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky

const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
camera.position.set(14, 10, 16);
camera.lookAt(0, 0, 0);

lights...

terrain build... computeVertexNormals.

Material vertexColors.

Controls with damping.

resize handler.

animation loop with clock delta; controls.update(); renderer.render; set __ready after first frame.
```

Expose __scene, __camera, __renderer, __controls.

Write height function:

```ts
function terrainHeight(x: number, z: number): number {
  let y = 0;
  y += Math.sin(x * 0.35) * Math.cos(z * 0.28) * 1.2;
  y += Math.sin(x * 0.72 + 1.3) * Math.cos(z * 0.85 + 2.1) * 0.55;
  y += Math.cos(x * 1.45 - 0.7) * Math.sin(z * 1.2 + 0.4) * 0.25;
  return y;
}
```

Sum amplitudes ~2.

Colors: low green (0.2,0.6,0.25), mid brown (0.55,0.4,0.2), high white. Interpolate based on normalized height relative to min/max. Compute min/max over grid, then t = (h - min)/(max-min). Blend: t<0.5 green->brown, else brown->white. Maybe add snow line: t > 0.7 blend to white. Keep simple three-band interpolation using smoothstep.

Also add subtle rotation of scene? Not needed. Maybe subtle movement required? "Motion must use delta/elapsed time" — motion doesn't require anything; but to be safe, controls.update() uses delta. I could add a gentle directional light? No motion needed. But to justify using dt, pass delta to controls.update(). Actually controls.update(deltaTime) optionally. Fine.

Strict TS: careful with typed arrays and possibly-null elements (renderer.domElement appendChild fine).

Full code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GRID = 128;          // vertices per side
const WORLD_SIZE = 20;     // units in X and Z
const STEP = WORLD_SIZE / (GRID - 1);
const HALF = WORLD_SIZE / 2;

function heightAt(x: number, z: number): number {
  let y = 0;
  y += Math.sin(x * 0.35) * Math.cos(z * 0.28) * 1.2;
  y += Math.sin(x * 0.72 + 1.3) * Math.cos(z * 0.85 + 2.1) * 0.55;
  y += Math.cos(x * 1.45 - 0.7) * Math.sin(z * 1.2 + 0.4) * 0.25;
  // small ripple for texture
  y += Math.sin((x + z) * 2.1) * 0.05;
  return y;
}
```

That sums to about 2 amplitude.

Colors per vertex, computed after heights known so normalize.

Buffer:

```ts
const vertices = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);
const indices = new Uint32Array((GRID - 1) * (GRID - 1) * 6);
```

Fill. Then compute normals. Colors depend on normalized height using actual min/max after computing heights — do two passes: first heights array, find min/max, then fill positions and colors.

Color mixing with THREE.Color lerp.

Set geometry attributes and index. computeVertexNormals.

Mesh material: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0 });

Lights: ambient 0.5, directional (10,20,8) intensity 1.2.

Renderer: outputColorSpace default fine.

Resize:

```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Loop:

```ts
const clock = new THREE.Clock();
let ready = false;
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);
  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});
```

Expose window vars early.

Camera: position (13, 12, 13), lookAt (0,0,0). Terrain max height ~2, so fine. fov 55.

Type of window casting: `(window as unknown as Record<string, unknown>)` or `(window as any)` — with strict, `any` allowed (noImplicitAny only bans implicit). Fine.

Double-check triangle winding for +Y normals — computed above: (i, i+size, i+size+1) and (i, i+size+1, i+1) both give +Y normals with x-right, z-forward left-handed... Let me re-verify with three.js coordinate: x right, y up, z toward viewer. Normal = cross(vB - vA, vC - vA).

Triangle (i, i+size, i+size+1): A=p00=(0,0,0), B=p01=(0,0,1) [+z], C=p11=(1,0,1). e1 = B-A = (0,0,1), e2 = C-A = (1,0,1). cross(e1,e2) = (e1.y*e2.z - e1.z*e2.y, e1.z*e2.x - e1.x*e2.z, e1.x*e2.y - e1.y*e2.x) = (0-0, 1-0, 0-0) = (0,1,0). Up.

Triangle (i, i+size+1, i+1): A=p00, B=p11=(1,0,1), C=p10=(1,0,0). e1=(1,0,1), e2=(1,0,0). cross y = e1.z*e2.x - e1.x*e2.z = 1*1 - 1*0 = 1. Up. ✓

Vertex positions: x = -HALF + col*STEP, z = -HALF + row*STEP, y = height.

Colors: define palette as THREE.Color objects and lerp manually via helper:

```ts
const cLow = new THREE.Color(0.18, 0.55, 0.22);
const cMid = new THREE.Color(0.52, 0.38, 0.18);
const cHigh = new THREE.Color(0.95, 0.96, 0.98);
```

t normalized; if t < 0.45: lerp low→mid t/0.45; else lerp mid→high (t-0.45)/0.55.

Actually spec: green low, brown middle, white high — that mapping works.

Use Color.lerpColors.

Also maybe water? Not requested. Skip.

Add fog? Not needed.

Also maybe slow camera orbit? No, user controls.

One more: strict tsc — `indices` Uint32Array fine with setIndex.

Write final code.