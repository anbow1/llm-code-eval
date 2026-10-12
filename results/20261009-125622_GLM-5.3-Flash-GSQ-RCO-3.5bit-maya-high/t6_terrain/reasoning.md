Hand-made BufferGeometry: 128x128 vertices, indices for 127x127 cells. Height sum of 3 sine layers, amplitude ~2. Vertex colors by height. Write the code.

Colors: normalize height between min/max of the layers (amplitude 2 → range roughly -2..2). Use smooth interpolation: green low, brown middle, white high.

Winding: for cell with corners a (i,j), b (i+1,j), c (i,j+1), d (i+1,j+1) with positions x = (i/(n-1)-0.5)*size, z = (j/(n-1)-0.5)*size. Up-facing triangles need counter-clockwise when viewed from +Y. Viewed from above (+Y looking down), CCW in standard screen coordinates... For a triangle with vertices in XZ plane, normal = (B-A)×(C-A). Take A=(0,0,0), B=(0,0,1), C=(1,0,0): (0,0,1)×(1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0). Up. So order A(x,z), B(x, z+dz), C(x+dx, z) gives up normal. So triangles: (a, c, b) and (b, c, d) where a=(i,j), b=(i+1,j), c=(i,j+1), d=(i+1,j+1) in grid indices (j indexes z).

Check second triangle: b=(x+dx, z), c=(x, z+dz), d=(x+dx, z+dz). b,c,d: (C-B)=(−dx,0,dz), (D−B)=(0,0,dz). Cross (C-B)×(D-B) = |i j k; -dx 0 dz; 0 0 dz| = i(0*dz - dz*0) - j(-dx*dz - dz*0) + k(0) = (0, dx*dz, 0). Up. Good.

Height function: y = 1.2*sin(x*0.55)*cos(z*0.5) + 0.6*sin(x*1.3 + z*0.9) + 0.35*cos(x*2.1 - z*1.7) roughly amplitude ~2.15. Normalize with maxH ≈ 2.15, minH ≈ -2.15.

Color mapping: t = (y - min)/(max-min). Use smoothstep blend: t<0.5: mix green→brown; t>0.5: brown→white. Use THREE.Color lerp.

Camera position e.g. (14, 12, 16), looking at origin. controls.target = (0,0,0).

After first render, set __ready: use a flag; in animate, after renderer.render, if !ready flag set __ready = true.

Value noise option — I'll use sine layers, simpler.

Code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fbcd4);

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 200);
camera.position.set(16, 13, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// geometry
const GRID = 128; // vertices per side
const SIZE = 20;
const SEG = GRID - 1;

positions, colors Float32Array GRID*GRID*3.
indices Uint32Array (SEG*SEG*6) — 127*127*6 = 96774 < 65536? No, 96774 > 65536 but index values max 16383 < 65536, so Uint16Array works. Use Uint16Array safe since vertex count 16384 < 65537. Actually three setIndex with array auto-detects. I'll use Uint32Array to be safe? Vertex index max is 16383, fits in Uint16. Use Uint16Array.

height function:
function terrainHeight(x: number, z: number): number {
  return 1.1 * Math.sin(x * 0.5) * Math.cos(z * 0.45)
       + 0.6 * Math.sin(x * 1.3 + z * 0.9)
       + 0.3 * Math.cos(x * 2.1 - z * 1.7);
}
max amplitude 2.0.

Colors: minH = -2.0, maxH = 2.0. t = (y+2)/4.
green (0.30,0.55,0.20), brown (0.55,0.40,0.22), white (0.95,0.95,0.97).
Blend: t<0.5 lerp(green,brown, smoothstep t*2), else lerp(brown,white, smoothstep (t-0.5)*2). Maybe push white threshold higher: use t' mapping so white only at peaks: color stops at 0.45 and 0.75.

Simple: 
const stops: use THREE.Color objects and helper.

Material: MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0, flatShading: false }). Side default.

Lights: AmbientLight(0xffffff, 0.5); DirectionalLight(0xffffff, 1.2) at (10, 20, 8).

Controls: OrbitControls(camera, renderer.domElement); enableDamping = true; dampingFactor 0.08; maxPolarAngle maybe; target (0,1,0).

Resize handler.

Animate loop: delta from clock, but terrain static; maybe gentle controls update only. Requirement: motion uses delta — could add subtle directional light orbit? Keep simple: controls.update() every frame. Maybe slow rotation of light? Not necessary. I'll add a slight camera-independent idle motion? Keep static terrain, just controls.update with damping uses delta implicitly. Fine. Maybe use clock.getDelta and elapsed for a subtle sun movement — I'll skip; but the rule says motion must use delta/elapsed time. Add gentle directional light drift using elapsed to be safe? That could change shading. I'll just keep static; no motion besides controls. That's acceptable. Actually to be safe I could pass delta nowhere. Fine.

__ready after first frame.

Export nothing. Write final code.
