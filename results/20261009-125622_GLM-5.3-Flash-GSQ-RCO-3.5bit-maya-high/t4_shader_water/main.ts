import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(7, 6, 9);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Shaders ----------

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Two overlapping sine waves moving in different directions
    float wave1 = sin(pos.x * 0.8 + uTime * 1.5) * cos(pos.z * 0.6 + uTime * 1.1);
    float wave2 = sin((pos.x + pos.z) * 0.5 + uTime * 2.0);
    float height = wave1 * 0.6 + wave2 * 0.35;

    pos.z += height; // plane is rotated -PI/2 about X, so local Z is world Y

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height from roughly [-0.95, 0.95] to [0, 1]
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);

    // Deep blue -> mid blue -> teal -> foam white
    vec3 deep = vec3(0.02, 0.09, 0.35);
    vec3 mid  = vec3(0.05, 0.35, 0.60);
    vec3 teal = vec3(0.25, 0.65, 0.75);
    vec3 foam = vec3(0.95, 0.98, 1.00);

    vec3 color = mix(deep, mid, smoothstep(0.0, 0.4, t));
    color = mix(color, teal, smoothstep(0.4, 0.7, t));
    color = mix(color, foam, smoothstep(0.75, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------- Water mesh ----------

const uniforms = {
  uTime: { value: 0.0 },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const water = new THREE.Mesh(geometry, material);
water.rotation.x = -Math.PI / 2;
scene.add(water);

// ---------- Render loop ----------

const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  void delta;

  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// ---------- Test hooks ----------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
