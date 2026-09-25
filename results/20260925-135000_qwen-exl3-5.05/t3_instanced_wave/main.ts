import * as THREE from 'three';

document.body.style.margin = '0';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 70, 80);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(60, 100, 40);
scene.add(directionalLight);

const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.0;
const CUBE_SIZE = 0.8;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({
  roughness: 0.55,
  metalness: 0.15,
});

const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mesh.frustumCulled = false;
scene.add(mesh);

const distances = new Float32Array(COUNT);
const xs = new Float32Array(COUNT);
const zs = new Float32Array(COUNT);

const dummy = new THREE.Object3D();
const color = new THREE.Color();

let id = 0;

for (let gz = 0; gz < GRID; gz++) {
  const z = (gz - (GRID - 1) / 2) * SPACING;
  const zNorm = gz / (GRID - 1);

  for (let gx = 0; gx < GRID; gx++) {
    const x = (gx - (GRID - 1) / 2) * SPACING;
    const xNorm = gx / (GRID - 1);

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(id, dummy.matrix);

    xs[id] = x;
    zs[id] = z;
    distances[id] = Math.sqrt(x * x + z * z);

    color.setHSL(0.08 + xNorm * 0.72, 0.7, 0.35 + zNorm * 0.35);
    mesh.setColorAt(id, color);

    id++;
  }
}

mesh.instanceMatrix.needsUpdate = true;
if (mesh.instanceColor !== null) {
  mesh.instanceColor.needsUpdate = true;
}

const amplitude = 3.5;
const waveK = 0.25;
const waveSpeed = 3.0;

let ready = false;

const animate = (time: number): void => {
  const elapsed = time * 0.001;

  for (let i = 0; i < COUNT; i++) {
    const y = Math.sin(distances[i] * waveK - elapsed * waveSpeed) * amplitude;
    dummy.position.set(xs[i], y, zs[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
};

renderer.setAnimationLoop(animate);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const onResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener('resize', onResize);
