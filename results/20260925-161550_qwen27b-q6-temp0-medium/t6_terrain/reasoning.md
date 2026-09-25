Requirements summary:
- One TS file, strict mode, import * as THREE from 'three', OrbitControls from addons.
- Build BufferGeometry for a 128x128 vertex grid, 20x20 units, centered at origin.
- Height: sum of 3 sine/cosine layers, amplitude ~2.
- Index via setIndex, two triangles per cell, up-facing winding.
- computeVertexNormals().
- Vertex colors by height: green at low, brown mid, white high.
- MeshStandardMaterial vertexColors: true.
- AmbientLight + DirectionalLight.
- OrbitControls, damping, update each frame, expose __controls.
- Camera placed above terrain, whole terrain visible.
- Renderer, resize handler, setAnimationLoop, delta-time motion, expose __scene/__camera/__renderer, set __ready = true after first frame.

Winding: with XZ plane and +Y as up, the face normal from cross((v1-v0),(v2-v0)) needs to be +Y. For cell (i,j): vertices v00, v10, v01, v11. Triangle 1: (v00, v01, v11) and triangle 2: (v00, v11, v10) gives +Y? Let me verify: v00=(0,0,0), v01=(0,0,1), v11=(1,0,1). a = v01-v00 = (0,0,1), b = v11-v00=(1,0,1). a×b = (0*1-1*0, 1*1-0*1, 0*0-0*1) = (0,1,0). Yes, upward. So the indices are (v00, v01, v11) and (v00, v11, v10).

Grid: N=128 vertices, 127 cells per axis. Position x = (i/(N-1) - 0.5)*20, z likewise.

Height function: y = A1*sin(...)*cos(...) etc. Amplitude ~2 total.

Height range: normalize h from min to max, or just clamp (h - minH)/(maxH-minH) to compute color. Compute actual min/max after generation. Color: green at low (0.15, 0.5, 0.15), brown mid (0.45, 0.32, 0.2), white high. Simple lerp between 3 stops.

Animation: rotate the directional light slightly, or subtle — motion using delta time. Rotate the directional light slowly around the terrain.

Ready flag: inside the loop, after the first render, set __ready = true.

Code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5e0);
scene.fog = new THREE.Fog(0x87b5e0, 40, 90);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 200);
camera.position.set(18, 14, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1, 0);

// Terrain
const N = 128;
const SIZE = 20;
const count = N*N;
const positions = new Float32Array(count*3);
const colors = new Float32Array(count*3);

function heightAt(x: number, z: number): number {
  const h =
    0.9 * Math.sin(x * 0.7) * Math.cos(z * 0.5) +
    0.55 * Math.sin(x * 1.9 + 1.3) * Math.sin(z * 1.6 + 0.7) +
    0.35 * Math.cos(x * 3.7 - 0.4) * Math.cos(z * 4.1 + 2.1);
  return h; // amplitude sums to ~1.8, close to ~2
}
```

Amplitude ~2: 0.9+0.55+0.35 = 1.8, fine, or bump to 1.0+0.6+0.4=2.0.

Fill in positions, track minH/maxH. Then a 2nd pass or store heights to compute colors. Either store heights in an array, or recompute via heightAt.

Indices: N*N-? cells (N-1)^2 * 6 indices = 127*127*6 = 96894.

Materials, lights, directional light with a rotation animation.

Loop with Clock:

```ts
const clock = new THREE.Clock();
let readySet = false;
const lightPivot = new THREE.Object3D(); // or just rotate the directional light's angle
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  sunLight.position.set(Math.cos(t*0.1)*20, 15, Math.sin(t*0.1)*20);
  controls.update();
  renderer.render(scene, camera);
  if (!readySet) { readySet = true; (window as any).__ready = true; }
});
```

Resize handler.

Colors: lerp3. Write a helper:

```ts
function lerpColor(t: number, out: {r:number,g:number,b:number}): void
```

Use a simple approach: t in [0,1]; if t<0.5 then lerp(green, brown, t*2), else lerp(brown, white, (t-0.5)*2).

Strict TS: fine.

Write out the full file.
