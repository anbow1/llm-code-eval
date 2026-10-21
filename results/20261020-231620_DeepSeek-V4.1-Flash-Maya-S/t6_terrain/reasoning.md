Let me write the file carefully.

Key details:
- 128x128 vertices grid, 20x20 units in XZ, centered.
- Height y = sum of 3 layers, amplitude ~2.
- Index buffer, winding so faces point up (+Y). For a grid with vertices in row-major order (ix, iz), triangles: (a, b, c) etc. Let's derive.

Vertex index i = iz * N + ix, where x = -10 + ix*step, z = -10 + iz*step. In Three.js, default front faces are counter-clockwise when viewed from the front. For a face pointing +Y (up), viewed from above (+Y looking down, i.e., looking in -Y direction), counter-clockwise in screen space... Let's compute with cross product: normal = (b-a) × (c-a) should be +Y.

Take a = (x, y, z), b = (x+step, y, z), c = (x, y, z+step). Then b-a = (step,0,0), c-a = (0,0,step). Cross product (step,0,0) × (0,0,step) = (0*step - 0*0, 0*0 - step*step, 0) = (0, -step², 0). That's -Y. So ordering a, b, c with b = +x and c = +z gives downward normal. So use a, c, b for up: (0,0,step) × (step,0,0) = (0*0 - step*0, 0*step - 0*0... let me compute properly.

u = c - a = (0,0,step), v = b - a = (step,0,0). u × v = (u_y*v_z - u_z*v_y, u_z*v_x - u_x*v_z, u_x*v_y - u_y*v_x) = (0*0 - step*0, step*step - 0*0, 0*0 - 0*step) = (0, step², 0). +Y. Good.

So triangles per cell: (i00, i01, i10) where i01 = i + N? Careful with naming. Let idx(ix, iz) = iz*N + ix. Neighbors: +x → +1, +z → +N.

Quad corners: a = idx(ix, iz), b = idx(ix+1, iz) (+x), c = idx(ix, iz+1) (+z), d = idx(ix+1, iz+1).

Triangle 1 up-facing: a, c, b (as derived: a, then +z, then +x). Wait I derived with u = c-a (+z) and v = b-a (+x) giving +Y, so the triangle order (a, c, b) has normal u × v = +Y? The normal for triangle (p0,p1,p2) is (p1-p0) × (p2-p0). With p0=a, p1=c, p2=b: (c-a) × (b-a) = +Y. Yes.

Triangle 2: (b, c, d). Check: (c-b) × (d-b). c-b = (-step, 0, step), d-b = (0,0,step). Cross = (u_y v_z - u_z v_y, u_z v_x - u_x v_z, u_x v_y - u_y v_x) = (0*step - step*0, step*0 - (-step)*step, 0) = (0, step², 0). +Y. 

Now vertex colors. Height range roughly -2..2, maybe up to 2.5. Normalize t = (y - minY)/(maxY - minY), then color: green low, brown middle, white high. Use THREE.Color lerp.

Compute normals after setting position; the index must be set too before computeVertexNormals (it uses the index).

Also set material side? Default front side is fine since winding is up.

OrbitControls with damping, update every frame with delta.

Camera: e.g. position (16, 14, 16), lookAt (0, 0, 0). Terrain is 20x20 so radius ~14.2. FOV 60. Distance ~27, fine. Set target (0,0,0), controls.update().

Fog? Not needed.

Renderer: antialias, setPixelRatio, setSize. Also set tone mapping maybe not needed.

Let's write.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
renderer.domElement.style.display = 'block';
```

Scene, camera, lights.

Terrain build:

```ts
const GRID = 128;
const SIZE = 20;
const half = SIZE / 2;
const step = SIZE / (GRID - 1);

const positions = new Float32Array(GRID * GRID * 3);
const colors = new Float32Array(GRID * GRID * 3);

function heightAt(x: number, z: number): number {
  return (
    1.0 * Math.sin(x * 0.35) * Math.cos(z * 0.4) +
    0.6 * Math.sin(x * 0.9 + 1.7) * Math.cos(z * 0.75 + 0.5) +
    0.35 * Math.cos(x * 1.9 - 0.4) * Math.sin(z * 2.1 + 2.2)
  );
}
```
Amplitude sum = 1 + 0.6 + 0.35 = 1.95 ≈ 2. Good.

But the "height by height" color mapping: use actual min/max of computed heights.

Loop:

```ts
let minH = Infinity, maxH = -Infinity;
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const x = -half + ix * step;
    const z = -half + iz * step;
    const y = heightAt(x, z);
    ...
  }
}
```

Set colors after computing min/max — two passes, or store heights. Let's compute heights array first.

Colors: low green (0.18, 0.45, 0.15), mid brown (0.45, 0.32, 0.18), high white (0.95,0.95,0.98). t normalized. if t < 0.5 → lerp(green, brown, t*2), else lerp(brown, white, (t-0.5)*2).

Index: use Uint32Array (128*128 vertices = 16384 < 65536, so Uint16 works, but use Uint32 to be safe... actually 16384 fits fine in Uint16). Use Uint16Array? setIndex accepts both. I'll use Uint32Array for safety.

Number of triangles: (GRID-1)^2 * 2 = 127*127*2 = 32258. indices count 96774.

computeVertexNormals after index set.

Material: MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0, flatShading: false }).

Lights: AmbientLight(0xffffff, 0.35), DirectionalLight(0xffffff, 2.0)? For MeshStandardMaterial with default lighting (no physicallyCorrectLights changes in r150+; intensity ~1.5 is fine). Use 1.2 or so. Let's use DirectionalLight intensity 2.0? In recent three versions lights use physical units... Actually in r155+, WebGLRenderer.useLegacyLights default is false, so directional light intensity 1 is roughly ok but a bit dim. I'll use 2.5 for directional + ambient 0.6. Hmm, with standard material and env nothing, intensity ~3 gives good. Let's set directional 2.5, ambient 0.7.

Animation loop with clock.

Also ready flag after first render.

Let's write the loop:

```ts
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  controls.update(delta);
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

Hmm, __ready should be set after first frame rendered — set right after render call. Fine.

Maybe use elapsed for a subtle animation? Not required, but motion must use delta/elapsed time. Requirement says "Motion must use delta/elapsed time" — controls damping update uses delta. Fine. I could add a subtle rotation but no.

Resize handler.

Controls: enableDamping = true, dampingFactor = 0.08, target set to (0,0,0), maxPolarAngle maybe 1.5 to prevent going under terrain. Keep simple.

Camera position: (18, 16, 18) looking at origin. Terrain spans -10..10 in x and z. Distance = sqrt(324+256+324)=~30. FOV 60 vertical → visible height at distance 30 = 2*30*tan(30°)=34.6. Terrain diagonal extent 28.3 projected... should be fine, whole terrain visible. Actually the terrain width 20 in each direction; at 45° azimuth the projected width is 28.3. With aspect 16:9 horizontal fov larger. Should be fine. Let's use camera at (20, 18, 20) → distance ~33.

Also set camera near/far: 0.1, 200.

Let me verify TS strictness: arrays typed Float32Array; heightAt fine; THREE.Color lerp usage: c1.clone().lerp(...) fine.

Write colors:

```ts
const cLow = new THREE.Color(0x2f7a2a); // green
const cMid = new THREE.Color(0x8a5a2b); // brown
const cHigh = new THREE.Color(0xf2f4f8); // white
```

Use tmp color.

Note: vertex colors in three use sRGB by default? With Color.setHex and default color management, Color stores linear-sRGB working values. Setting colors to a Float32Array attribute — three assumes vertex colors are in linear working space. That's fine.

Colors may look dark; fine.

Let me also make sure the terrain geometry attributes are set before computeVertexNormals:

```ts
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
geometry.computeVertexNormals();
geometry.computeBoundingSphere();
```

setIndex with a BufferAttribute is fine, or setIndex(indices) directly. Use setIndex(new THREE.BufferAttribute(indices, 1)) — typed as number[] | BufferAttribute. Fine.

Also need renderer output color space default is sRGB in recent three. OK.

Write full file.

Also expose __scene, __camera, __renderer, __controls.

Double check TS strict: no implicit anys. In loop I use let variables declared with types. Fine.

Potential issue: `renderer.setAnimationLoop` callback with no args — fine.

Let me write it out.

One more consideration on the grid: 128x128 vertices → step = 20/127 ≈ 0.1575.

Full code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GRID = 128;
const SIZE = 20;
const HALF = SIZE / 2;
const STEP = SIZE / (GRID - 1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(20, 18, 20);
camera.lookAt(0, 0, 0);

...
```

Lights, terrain, controls, resize, loop, expose.

For the sky background maybe a nicer color, 0x87b8e8? Keep darkish blue-gray.

Also add fog? No.

Now writing heightAt with amplitude about 2 — max sum ~1.95, but actual sampled range will be less. Fine.

Two-pass: heights Float32Array(GRID*GRID), then min/max, then positions/colors.

Let me finalize.

Also to make sure the terrain looks nicer with smooth normals, fine.

I'll write it.