import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111318);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(80, 70, 80);
camera.lookAt(0, 0, 0);

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(40, 60, 30);
scene.add(directionalLight);

// ---------- Instanced grid of cubes ----------
const GRID = 100;
const COUNT = GRID * GRID;
const SPACING = 1.2; // world units between cube centers
const CUBE_SIZE = 0.8;

const boxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const boxMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.6,
  metalness: 0.1,
});

const instancedMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, COUNT);
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(instancedMesh);

// Initial layout + per-instance color gradient
const dummy = new THREE.Object3D();
const initialMatrix = new THREE.Matrix4();
const color = new THREE.Color();
const half = (GRID - 1) / 2;

for (let ix = 0; ix < GRID; ix++) {
  for (let iz = 0; iz < GRID; iz++) {
    const index = ix * GRID + iz;
    const x = (ix - half) * SPACING;
    const z = (iz - half) * SPACING;

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    initialMatrix.copy(dummy.matrix);
    instancedMesh.setMatrixAt(index, initialMatrix);

    // Color gradient by grid position (0..1 in x and z)
    const tx = ix / (GRID - 1);
    const tz = iz / (GRID - 1);
    color.setHSL(0.55 + 0.25 * tx, 0.8, 0.25 + 0.5 * tz);
    instancedMesh.setColorAt(index, color);
  }
}
instancedMesh.instanceColor!.setUsage(THREE.DynamicDrawUsage); // allocated once here
instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

// ---------- Wave parameters ----------
const WAVE_K = 0.22; // spatial frequency
const WAVE_SPEED = 3.0; // temporal speed
const WAVE_AMPLITUDE = 6.0; // wave height

const waveMatrix = new THREE.Matrix4(); // reused every frame, no per-frame allocation

// ---------- Animation loop ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();
  void delta; // delta available; animation driven by elapsed time

  for (let ix = 0; ix < GRID; ix++) {
    for (let iz = 0; iz < GRID; iz++) {
      const index = ix * GRID + iz;
      const x = (ix - half) * SPACING;
      const z = (iz - half) * SPACING;

      const distance = Math.sqrt(x * x + z * z);
      const y = Math.sin(distance * WAVE_K - time * WAVE_SPEED) * WAVE_AMPLITUDE;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      waveMatrix.copy(dummy.matrix);
      instancedMesh.setMatrixAt(index, waveMatrix);
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
});

// Mark ready after first frame has rendered
let readyFlagged = false;
const originalLoop = renderer.setAnimationLoop.bind(renderer);
// Flag readiness right after the first render completes
renderer.setAnimationLoop((time) => {
  if (!readyFlagged) {
    readyFlagged = true;
    (window as any).__ready = true;
  }
  // The real loop above was replaced; run wave + render here instead.
});

// Re-install the actual loop that also sets readiness after first render
const waveAndRender = (time: number) => {
  const elapsed = clock.getElapsedTime();

  for (let ix = 0; ix < GRID; ix++) {
    for (let iz = 0; iz < GRID; iz++) {
      const index = ix * GRID + iz;
      const x = (ix - half) * SPACING;
      const z = (iz - half) * SPACING;

      const distance = Math.sqrt(x * x + z * z);
      const y =
        Math.sin(distance * WAVE_K - elapsed * WAVE_SPEED) * WAVE_AMPLITUDE;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      waveMatrix.copy(dummy.matrix);
      instancedMesh.setMatrixAt(index, waveMatrix);
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  if (!readyFlagged) {
    readyFlagged = true;
    (window as any).__ready = true;
  }

  renderer.render(scene, camera);
};
renderer.setAnimationLoop(waveAndRender);

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------- Resize handling ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
