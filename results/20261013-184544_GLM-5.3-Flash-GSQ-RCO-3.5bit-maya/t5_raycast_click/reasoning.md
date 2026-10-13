The user wants a static scene — no camera movement, no cube animation. Just a 5x5 grid of cubes in XY plane facing camera, raycaster click selection. Write strict TypeScript.

Grid in XY plane: cubes spaced along X and Y, camera at positive Z looking at origin. Use raycaster with pointer NDC from event.clientX/Y relative to canvas rect.

Each cube own MeshStandardMaterial 0x4488ff. Selection: set selected material color to 0xff0000, previous back. Background click clears.

Expose window globals, __ready after first frame.

Code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0,0,0);

renderer setup, antialias true.

Lights: AmbientLight, DirectionalLight.

Grid: size 5, spacing 2 (cube size 1.2, gap 0.8). cube geometry shared. Positions x = (i-2)*2, y = (j-2)*2.

Compute camera z so whole grid visible with margin. FOV 50 vertical: half-height 5 + margin. z = 6 / tan(25°) ≈ 12.86. Use 13. Horizontal aspect fine for typical windows; but to be safe could compute based on aspect. Simpler: compute distance so vertical fits, also check horizontal: needed half-width 6 / (aspect * tan(hfov/2)). Just compute required distance for both. Let me compute dynamic:

const halfH = 5 + 1; // margin 1
const halfW = halfH; // square grid
const vFov = camera.fov * Math.PI/180;
const distV = halfH / Math.tan(vFov/2);
const hFov = 2 * Math.atan(Math.tan(vFov/2) * camera.aspect);
const distH = halfW / Math.tan(hFov/2);
camera.position.z = Math.max(distV, distH);

Raycasting: raycaster.setFromCamera(ndc, camera); intersectObjects(cubes). If hit, select. Else clear.

Click vs drag? Just pointerdown or click event on renderer.domElement. Use 'click'.

__ready after first render: in animation loop, render then set flag once. Since static, setAnimationLoop still required by spec. Use elapsed not needed but fine.

Type: use non-null assertions where needed. renderer.domElement exists. cubes array typed THREE.Mesh.

Material per cube: new MeshStandardMaterial({color: 0x4488ff}) each.

Selection function with selected: THREE.Mesh | null.

Store cubes in array; mesh.userData maybe not needed since material per mesh unique — just set mesh.material.color.setHex.

Write code.