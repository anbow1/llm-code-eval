import * as THREE from 'three';

// ---------- Basic setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(40, 60, 30);
scene.add(directionalLight);

// ---------- Grid configuration ----------
const GRID_SIZE = 100;      // 100 x 100 = 10,000 instances
const SPACING = 1.2;        // distance between cube centers
const AMPLITUDE = 2.5;      // wave height
const WAVE_NUMBER = 0.55;   // k: spatial frequency by distance from center
const SPEED = 2.2;          // wave speed

const halfExtent = ((GRID_SIZE - 1) * SPACING) / 2;

// Camera at an angle so the whole grid and wave are visible
camera.position.set(halfExtent * 1.1, halfExtent * 1.2, halfExtent * 1.9);
camera.lookAt(0, 0, 0);

// ---------- InstancedMesh ----------
const cubeGeometry = new THREE.BoxGeometry(0.85, 0.85, 0.85);
const cubeMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.45,
  metalness: 0.15,
});

const instancedMesh = new THREE.InstancedMesh(
  cubeGeometry,
  cubeMaterial,
  GRID_SIZE * GRID_SIZE
);

// Reusable objects — allocated once, never inside the render loop
const dummy = new THREE.Object3D();
const reusableMatrix = new THREE.Matrix4();

// Precompute instance positions and colors (gradient by grid position)
// These arrays are also allocated outside of the loop.
const basePositions = new Float32Array(GRID_SIZE * GRID_SIZE * 2); // x, z pairs

{
  const color = new THREE.Color();
  const colorA = new THREE.Color(0x1e3fa8); // deep blue edge
  const colorB = new THREE.Color(0x7cf5c8); // mint center
  let i = 0;
  let index = 0;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = col * SPACING - halfExtent;
      const z = row * SPACING - halfExtent;

      basePositions[index * 2] = x;
      basePositions[index * 2 + 1] = z;

      // Set static (X/Z) part of the matrix; Y will be animated each frame.
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index, dummy.matrix);

      // Radial gradient: 0 at center -> 1 at corners
      const dist = Math.sqrt(x * x + z * z);
      const maxDist = halfExtent * Math.SQRT2;
      const t = Math.min(dist / maxDist, 1);
      color.copy(colorB).lerp(colorA, t);
      instancedMesh.setColorAt(index, color);

      index++;
      i++;
    }
  }
  void i; // loop counter kept for clarity
}

// The color buffer was created by setColorAt — flag it once for upload.
if (instancedMesh.instanceColor !== null) {
  instancedMesh.instanceColor.needsUpdate = true;
}

scene.add(instancedMesh);

// ---------- Animation ----------
const clock = new THREE.Clock();

function updateWave(time: number): void {
  let index = 0;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = basePositions[index * 2];
      const z = basePositions[index * 2 + 1];

      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * WAVE_NUMBER - time * SPEED) * AMPLITUDE;

      // Update the translation column of the matrix directly,
      // reusing the shared Matrix4 (no per-frame allocations).
      reusableMatrix.makeTranslation(x, y, z);
      instancedMesh.setMatrixAt(index, reusableMatrix);

      index++;
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
}

renderer.setAnimationLoop(() => {
  const deltaTime = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  void deltaTime; // elapsed time drives the wave; delta available for physics

  updateWave(elapsed);
  renderer.render(scene, camera);

  // Mark readiness after the first frame has actually been rendered.
  (window as any).__ready = true;
});

// ---------- Resize handling ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
