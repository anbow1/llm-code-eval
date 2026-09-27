import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 6, 8);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
const body = document.body;
if (body) {
  body.appendChild(renderer.domElement);
}

// --- Shaders ---
const vertexShader: string = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float w1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.30;
    float w2 = cos(pos.y * 1.0 + uTime * 1.5) * 0.20;
    float w3 = sin((pos.x + pos.y) * 0.8 + uTime * 3.0) * 0.15;

    float displacement = w1 + w2 + w3;
    pos.z += displacement;

    vHeight = displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader: string = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height from roughly [-0.65, 0.65] to [0, 1]
    float h = vHeight * 0.5 + 0.5;
    h = clamp(h, 0.0, 1.0);

    vec3 deepBlue = vec3(0.0, 0.08, 0.35);
    vec3 foam     = vec3(1.0);

    vec3 color = mix(deepBlue, foam, h);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Geometry & Material ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader,
  fragmentShader,
});

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
let elapsed: number = 0;
let ready: boolean = false;

renderer.setAnimationLoop(() => {
  const delta: number = clock.getDelta();
  elapsed += delta;

  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
