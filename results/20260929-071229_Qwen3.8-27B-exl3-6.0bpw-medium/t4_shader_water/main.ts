import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 7, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.30;
    float wave2 = cos(pos.y * 2.0 + uTime * 1.5) * 0.20;
    float wave3 = sin((pos.x + pos.y) * 1.0 + uTime * 1.0) * 0.15;
    float wave4 = cos(pos.x * 3.0 - pos.y * 2.5 + uTime * 3.0) * 0.08;

    float height = wave1 + wave2 + wave3 + wave4;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Max possible height is roughly 0.30 + 0.20 + 0.15 + 0.08 = 0.73
    float t = clamp(vHeight / 0.73 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.0, 0.04, 0.18);
    vec3 midBlue  = vec3(0.05, 0.25, 0.55);
    vec3 foam     = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (t < 0.5) {
      color = mix(deepBlue, midBlue, t * 2.0);
    } else {
      color = mix(midBlue, foam, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
  side: THREE.DoubleSide,
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

const clock = new THREE.Clock();
let ready = false;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
