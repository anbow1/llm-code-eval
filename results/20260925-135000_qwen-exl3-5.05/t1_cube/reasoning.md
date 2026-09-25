We need answer user wants single ts code block only. We need produce final code. Need ensure TypeScript strict compiles, imports three. Need no other text. Let's think through implementation.

File:
import * as THREE from 'three';

Maybe no addons needed. Create scene, camera, renderer. BoxGeometry + MeshStandardMaterial. Lights. Background color different. Use clock getDelta. setAnimationLoop. Expose window. __ready after first frame. Need types: (window as any) ok. Strict: window might not have properties, any ok. THREE Clock. 

Potential issue with module imports in browser? They say import Three.js as 'three'. Could be import maps. Fine.

Code:
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101820);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0,0,3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness:0.3, roughness:0.6 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(2,3,4);
scene.add(directional);

const clock = new THREE.Clock();
let ready = false;
function animate() {
 const delta = clock.getDelta();
 cube.rotation.x += 0.7 * delta;
 cube.rotation.y += 1.1 * delta;
 renderer.render(scene, camera);
 if (!ready) { (window as any).__ready = true; ready = true; }
}
renderer.setAnimationLoop(animate);

(window as any).__scene = scene; etc.

Need ensure __ready after first frame rendered. setAnimationLoop callback first frame after render? In callback after render. Fine.

Strict: unused variables? noUnusedLocals maybe in tsconfig? They may compile with strict but not necessarily noUnusedLocals. But to be safe, no unused variables. Could omit named lights if unused? If const ambient = new... scene.add(ambient); variable used. directional used. geometry used.

Need handle resize:
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

Potential strict DOM: document.body maybe null? In browser TS DOM, document.body is HTMLElement? It's nullable? In lib.dom, document.body is HTMLElement | null? I think HTMLElement | null? Let's recall: Document.body: HTMLElement | null? Actually TypeScript lib.dom.d.ts: body: HTMLElement | null? Yes maybe. Need handle: if (document.body) document.body.appendChild. But if no body? page has no other HTML but body exists. Could do document.body!.appendChild or if. For strict, if document.body could be null, use if. But if body null, no append. fine.
const container = document.body; if (container) container.appendChild(renderer.domElement);

Maybe renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); devicePixelRatio number. Fine.

Need no external assets.

Could include cleanup? not needed.

Potential issue: (window as any).__ready assignment with let ready boolean. Good.

Need final only ```ts block. Ensure no explanation.

Double-check import 'three/addons' not needed. If no addons, okay.

Could use import * as THREE from 'three'; If tsc strict with module resolution, need import map, but as per request.

Need final.
