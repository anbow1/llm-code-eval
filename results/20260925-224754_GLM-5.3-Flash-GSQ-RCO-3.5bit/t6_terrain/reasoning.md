Write a complete TypeScript file. Hand-made BufferGeometry, 128x128 vertices (positions grid), index buffer, height function sum of sines, vertex colors, MeshStandardMaterial, lights, OrbitControls.

Vertex count 128x128 = 16384 vertices. Indices: 127*127*6.

Camera position e.g. (18, 14, 18) looking at origin, terrain 20x20.

Set __ready after first render — set a flag on first animation loop callback after render.

Colors: low green, mid brown, high white. Height range roughly -2..2. Normalize t = (y+2)/4, lerp green->brown->white. Use THREE.Color lerp.

Code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 200);
camera.position.set(16, 12, 16);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// terrain geometry
const GRID = 128;
const SIZE = 20;
const positions = new Float32Array(GRID*GRID*3);
const colors = new Float32Array(GRID*GRID*3);

function height(x: number, z: number): number {
  return (
    Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.9 +
    Math.sin(x * 0.9 + 1.3) * Math.cos(z * 0.7) * 0.5 +
    Math.cos(x * 1.7) * Math.sin(z * 1.9 + 2.1) * 0.25
  );
}
```

Amplitude sum ~1.65, fine, "about 2".

Colors: t from minH to maxH computed per vertex: hMin=-1.65, hMax=1.65 approx. Use actual min/max scan.

Indices Uint32Array since 16384 vertices > 65535? 16384 < 65535, so Uint16 fine, but Uint32Array is fine too. Actually Uint16Array max 65535, vertex index max 16383, ok. Use Uint32Array for safety—fine either way.

Winding for +Y facing: with x increasing east, z increasing... For a triangle (a, b, c), front face counter-clockwise when viewed from +Y (looking down -Y direction, CCW in the XZ plane as seen from above means... ). Standard PlaneGeometry: for a cell with vertices a=(x,z), b=(x,z+dz), c=(x+dx,z), d=(x+dx,z+dz), indices [a, c, b] and [b, c, d]? Let me verify: viewed from above (+Y looking down), x to the right, z toward viewer (screen down). CCW in screen coords (x right, z down): going a=(0,0) -> c=(1,0)? Hmm.

Normal via cross product: triangle (v0, v1, v2), normal = (v1-v0) × (v2-v0). Take v0=(0,0,0), v1=(0,0,1) (a->b, +z), v2=(1,0,0) (c, +x). (v1-v0)=(0,0,1), (v2-v0)=(1,0,0). Cross = (0,0,1)×(1,0,0) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0). Yes +Y. So triangle [a, b, c] where a=(x,z), b=(x,z+dz), c=(x+dx,z) gives up normal.

Second triangle: [b, d, c]: v0=b=(x, z+dz), v1=d=(x+dx, z+dz), v2=c=(x+dx, z). (v1-v0)=(dx,0,0), (v2-v0)=(dx,0,-dz). Cross = (0*(-dz)-0*0, 0*dx - dx*(-dz), dx*0-0*dx) = (0, dx*dz, 0) → +Y. Good.

So per cell (row j, col i): a = j*GRID + i, b = (j+1)*GRID + i, c = j*GRID + i+1, d = (j+1)*GRID + i+1. Indices [a,b,c],[b,d,c].

Position layout: x = -SIZE/2 + i/(GRID-1)*SIZE, z = -SIZE/2 + j/(GRID-1)*SIZE.

Colors by height: define low color 0x3a7d32 (green), mid 0x8b5a2b (brown), high 0xffffff. t = (y - hMin)/(hMax - hMin). If t < 0.5: lerp green->brown with t*2; else brown->white.

Lights: AmbientLight(0xffffff, 0.5), DirectionalLight(0xffffff, 1.2) at (10, 15, 5).

OrbitControls: controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.target.set(0,0,0); controls.update() each frame.

Resize handler.

Animation loop: delta from clock, controls.update(), renderer.render. First frame: after render, if !readyFlag set __ready = true.

Also expose __scene, __camera, __renderer, __controls.

Maybe slight animation: nothing required; motion uses delta — but no motion needed. Could rotate nothing. Fine, just render. Maybe add a subtle directional light? Keep simple.

tsc strict: window as any casts fine.

Write final code.