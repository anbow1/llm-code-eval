import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 60, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.5);
dir.position.set(30, 50, 20);
scene.add(dir);

const GRID = 100;
const SPACING = 1;
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });

const mesh = new THREE.InstancedMesh(geometry, material, GRID * GRID);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

// initial colors: gradient by position
const color = new THREE.Color();
let idx = 0;
for (let x = 0; x < GRID; x++) {
  for (let z = 0; z < GRID; z++) {
    color.setHSL((x / GRID) * 0.3 + (z / GRID) * 0.3, 0.7, 0.55);
    mesh.setColorAt(idx, color);
    idx++;
  }
}
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

const reusable = new THREE.Object3D();
const offset = (GRID - 1) * SPACING / 2;
const k = 0.35, speed = 2.5, amplitude = 5;

renderer.setAnimationLoop((timeMs: number) => {
  const t = timeMs / 1000;
  let i = 0;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const px = x * SPACING - offset;
      const pz = z * SPACING - offset;
      const dist = Math.sqrt(px * px + pz * pz);
      reusable.position.set(px, Math.sin(dist * k - t * speed) * amplitude, pz);
      reusable.updateMatrix();
      mesh.setMatrixAt(i, reusable.matrix);
      i++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
renderer.setAnimationLoop((timeMs: number) => {
  const t = timeMs / 1000;
  let i = 0;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const px = x * SPACING - offset;
      const pz = z * SPACING - offset;
      const dist = Math.sqrt(px * px + pz * pz);
      reusable.position.set(px, Math.sin(dist * k - t * speed) * amplitude, pz);
      reusable.updateMatrix();
      mesh.setMatrixAt(i, reusable.matrix);
      i++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
  if (!ready) { (window as any).__ready = true; ready = true; }
});
