Requirements:
- 5x5 grid of 25 cubes, Mesh objects, in the XY plane facing the camera, with gaps.
- Each cube has its own MeshStandardMaterial, color 0x4488ff.
- Click to select: color 0xff0000, only one at a time, previously selected reverts.
- Click on empty space clears selection.
- Raycaster using NDC from canvas bounding rect.
- PerspectiveCamera looking straight at the grid, entire grid visible with margin.
- AmbientLight + DirectionalLight.
- No camera movement, no cube animation.

Compile in strict TS. Import three. Handle resize. setAnimationLoop. Expose __scene, __camera, __renderer, __ready after first frame.

Compute the camera's z position so that the entire grid is visible with margin. Grid: 5 cells, spacing s, cube size a. Let cube size = 1, gap 0.5, spacing 1.5. Grid width = 4*1.5 + 1 = 7. Vertical FOV is 45 degrees. Distance z such that half height >= (3.5 + margin). half height = 3.5. margin 0.5 => need 4. halfH = z * tan(fov/2). At fov 50, tan(25deg)=0.4663. z = 4/0.4663 ≈ 8.58. Also consider the aspect ratio: on wide screens half-width is not the constraint, but if the window is portrait, width could become the constraint. To be safe, compute z so that half-width is also covered: halfW = halfH * aspect; required halfW >= 4 => z >= 4/(tan*aspect). Use max. Recompute on resize? The requirement is a static camera; on resize, either keep z as is, or recompute to keep it visible. Recomputing z on resize to keep the grid visible with margin is fine, and it's not camera movement. Actually "no camera movement" — it's reasonable to recompute z on resize to maintain visibility; it's not animation. I'll do that.

Click handling: pointerdown or click? Use 'click' on the canvas. Compute rect, ndc x,y, raycaster, intersect with cubes. If there's a hit: deselect the previous one, set the hit one to red. Otherwise, deselect.

Use color.set(0xff0000). Materials are unique per cube, so no problem.

Write the code.

Strict mode: all variables have types. Event listener types are fine.

First frame: use a flag, set __ready inside the loop.

Code:

import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
const renderer = new THREE.WebGLRenderer({antialias:true});
document.body.appendChild(renderer.domElement);
Renderer size settings, probably pixel ratio too.

Grid:
const GRID = 5, CUBE = 1, GAP = 0.5, SPACING = CUBE + GAP;
geometry = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
for i,j: x = (i - 2)*SPACING, y = (j - 2)*SPACING; material = new THREE.MeshStandardMaterial({color:0x4488ff}); mesh.

Lighting: ambient 0xffffff, 0.6; directional (5,5,10) intensity 1.

Camera fit function:
const HALF = (GRID-1)*SPACING/2 + CUBE/2; // 3.5
const MARGIN = 0.5;
function fitCamera(){
  const aspect = window.innerWidth/window.innerHeight;
  const halfH = (HALF + MARGIN) * 1; // required half height
  const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  let z = halfH / vTan;
  z = Math.max(z, halfH/(vTan*aspect));
  camera.position.set(0,0,z);
  camera.lookAt(0,0,0);
}
camera.fov is a number; no problem.

Click handler:
let selected: THREE.Mesh | null = null;
canvas.addEventListener('click', (e: MouseEvent) => { ... });

raycaster = new THREE.Raycaster();
ndc = new THREE.Vector2();

intersects = raycaster.intersectObjects(cubes, false);
if (intersects.length > 0) { const hit = intersects[0].object as THREE.Mesh; if (hit !== selected) { if (selected) selected.material.color.setHex(0x4488ff); selected = hit; hit.material.color.setHex(0xff0000); } }
else { if (selected) selected.material.color.setHex(0x4488ff); selected = null; }

Animation loop: renderer.setAnimationLoop(() => { if (!ready) { ready = true; (window as any).__ready = true; } renderer.render(scene, camera); });

Resize: set camera.aspect, updateProjectionMatrix, renderer.setSize, fitCamera().

Write the final code block.
