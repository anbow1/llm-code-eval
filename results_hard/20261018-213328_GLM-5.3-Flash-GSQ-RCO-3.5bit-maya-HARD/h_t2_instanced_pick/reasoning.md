 straightforward. Grid 30x30, centered: offset = (30-1)/2 = 14.5. Box size 0.8, spacing 1.0.

Raycaster with instancedmesh: raycaster.intersectObject(mesh) gives instanceId. Note: raycasting instanced mesh works with MeshBasicMaterial. Need mesh.computeBoundingSphere? InstancedMesh raycast uses boundingSphere computed from geometry and instance matrices — it computes automatically in newer versions. Fine.

Colors: mesh.instanceColor needs flags: needsUpdate = true after change.

Camera position z such that whole grid visible with margin: grid width 30 (from -14.5-0.4 to 14.5+0.4 ≈ 29.8). PerspectiveCamera fov 50, aspect depends on window. Compute distance to fit: fit height 30: dist = (15 + margin)/tan(fov/2). Use margin 2. Also consider horizontal fit given aspect; but simplest: compute needed distance for both vertical and horizontal at init and on resize? Requirement says "whole grid visible with a margin" — could compute at init; resize keeps aspect handled. To be safe, recompute camera distance on resize to fit both axes. But "No camera movement" — just initial positioning; recomputing on resize is fine, but simpler: set distance once with margin accounting for typical aspect? I'll compute on init and on resize to guarantee visibility. Actually "no camera movement" refers to animation; adjusting on resize is standard. I'll compute fit distance = max(fitVertical, fitHorizontal) with margin 1.25 factor.

fitVertical: halfHeight = 15 / tan(fov/2). fitHorizontal: halfWidth = 15 / tan(fovH/2) where tan(fovH/2)=tan(fov/2)*aspect.

Click handling: listen on renderer.domElement 'click' or 'pointerdown'. Use rect of canvas.

Also need pointer events; use raycaster.setFromCamera with pointer NDC.

instanceColor: after setColorAt first time, instanceColor is created. Set mesh.instanceColor.needsUpdate = true.

Code:

import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

camera fov 50, near 0.1 far 200.

const renderer = new THREE.WebGLRenderer(); setSize; document.body.appendChild(renderer.domElement). Maybe body margin 0 via style.

Geometry: BoxGeometry(0.8,0.8,0.8). Material MeshBasicMaterial({color: 0xffffff}).

mesh = new THREE.InstancedMesh(geo, mat, 900);

Loop i 0..899: x = i%30 - 14.5, y = floor(i/30) - 14.5; matrix setPosition; setMatrixAt; setColorAt(i, gray).

instanceMatrix.needsUpdate not needed at init? It defaults; setting before first render fine but set anyway.

State array: boolean[] colors.

Raycaster: const raycaster = new THREE.Raycaster();

pointer NDC: rect = renderer.domElement.getBoundingClientRect(); x = ((clientX - rect.left)/rect.width)*2-1; y = -(...)*2+1.

intersectObject(mesh, false) — first intersection instanceId. Toggle: if gray -> red etc. mesh.setColorAt(id, new color); mesh.instanceColor!.needsUpdate = true.

Fit camera:

function fitCamera() {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const margin = 1.1; // 10% margin
  const halfV = 15 * margin / Math.tan(fov/2);
  const halfH = 15 * margin / (Math.tan(fov/2)*camera.aspect);
  camera.position.z = Math.max(halfV, halfH);
}

Grid half extent ~15 (14.5 + 0.4 = 14.9). Use 15.

window resize: update aspect, renderer size, fitCamera.

Animation loop: renderer.setAnimationLoop(() => { renderer.render(scene, camera); after first frame set __ready }). Use a flag.

Expose __scene, __camera, __renderer, __mesh.

Compile strict: instanceColor possibly null — use non-null assertion or guard.

Click vs drag: just use 'click' event.

Write code.