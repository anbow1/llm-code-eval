import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 1.5 + uTime * 2.0) * cos(pos.y * 1.5 + uTime * 1.5) * 0.3;
    wave += sin(pos.x * 3.0 - uTime * 1.0) * 0.15;
    wave += cos(pos.y * 2.0 + uTime * 0.8) * 0.1;
    pos.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Wave range is roughly [-0.55, 0.55], normalize to [0, 1]
    float h = (vHeight + 0.55) / 1.1;
    h = clamp(h, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.25);
    vec3 midBlue = vec3(0.1, 0.3, 0.6);
    vec3 foam = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (h < 0.5) {
      color = mix(deepBlue, midBlue, h * 2.0);
    } else {
      color = mix(midBlue, foam, (h - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Plane geometry: 10x10, 128x128 segments
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Custom ShaderMaterial
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
});

const mesh = new THREE.Mesh(geometry, material);
// Rotate to lie flat in the XZ plane (local Z becomes world Y)
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize handling
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Animation loop
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  (material.uniforms.uTime.value as number) = elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
