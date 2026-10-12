 straightforward. Grid 30x30, spacing 1, so extent 30*1=30 wide, centered → from -14.6 to 14.6 roughly (offsets -14.5 to 14.5 since spacing 1 centered). Actually positions: (i - 14.5) * 1.0 for i in 0..29 → -14.5..14.5. Box size 0.8 gives gaps.

Camera: need whole grid visible with margin. Distance z such that both horizontal and vertical fit. fov default 50? Use PerspectiveCamera(50). Aspect varies with resize; but camera must fit at resize too? Requirement says handle resize for camera aspect + renderer size. To keep grid visible with margin regardless of aspect, adjust camera distance on resize: distance = max based on aspect. Grid half-size ~14.5 plus margin. Use vertical fov: halfHeight = 15 * margin factor... compute distance = (15 / tan(fov/2)) for vertical fit, and for horizontal: 15/(tan(fov/2)*aspect), take max. Use 15 (half extent + margin).

Raycaster with instanceId: InstancedMesh raycast works. Note MeshBasicMaterial with vertexColors? InstancedMesh color works with setColorAt automatically (material needs to support instance color — three handles it via USE_INSTANCING_COLOR when instanceColor set). No need vertexColors flag.

Toggle: keep array of states or read current color. Use a boolean array toggled.

After setColorAt changes, set mesh.instanceColor.needsUpdate = true.

Canvas bounding rect: renderer.domElement.getBoundingClientRect().

First frame: set __ready after render inside loop (first invocation).

Code:

import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 1000);
camera.position.z = computeDistance(innerWidth/innerHeight);
camera.position.z = dist; camera.lookAt(0,0,0);

renderer, resize handler recalculates camera.position.z.

const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mesh = new THREE.InstancedMesh(geometry, material, 900);
mesh.instanceMatrix... set positions via matrix.

const dummy = new THREE.Object3D();
for i,j: dummy.position.set((i-14.5)*1.0, (14.5-j)*1.0, 0); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
const gray = new THREE.Color(0x808080);
for k: mesh.setColorAt(k, gray);

mesh.instanceColor.needsUpdate = true? initial fine.

Click handler on renderer.domElement (pointerdown or click). Compute ndc: x = ((e.clientX - rect.left)/rect.width)*2-1; y = -( ... )*2+1.

raycaster.setFromCamera; intersectObject(mesh). If instanceId defined and intersections[0] — should take nearest intersection; a box could be intersected multiple times? Each instance one box; ray could hit front and back faces of same box — intersectObject returns entries per face hit, instanceId same. Take intersections[0].instanceId.

Toggle boolean array: if red → set gray, else red.

Note: material raycast — fine.

Also mesh.instanceColor may be typed as InstancedBufferAttribute | null in strict TS; use non-null assertion after setColorAt calls. Actually setColorAt creates instanceColor if null. So after loop, mesh.instanceColor!.needsUpdate = true.

Raycast on InstancedMesh before instanceColor set? We set at start.

Write code.