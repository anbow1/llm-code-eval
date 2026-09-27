import * as THREE from 'three';

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

const vertexShader: string = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    float wave =
      sin(position.x * 1.5 + uTime) * 0.30 +
      cos(position.y * 1.2 + uTime * 0.8) * 0.25 +
      sin((position.x + position.y) * 0.8 + uTime * 1.2) * 0.20;

    vec3 newPos = position;
    newPos.z += wave;
    vHeight = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const fragmentShader: string = /* glsl */ `
  varying float vHeight;

  void main() {
    float t = clamp((vHeight + 0.75) / 1.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.00, 0.05, 0.20);
    vec3 midBlue  = vec3(0.00, 0.30, 0.60);
    vec3 foam     = vec3(1.00, 1.00, 1.00);

    vec3 color;
    if (t < 0.5) {
      color = mix(deepBlue, midBlue, t * 2.0);
    } else {
      color = mix(midBlue, foam, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0.0 },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop((): void => {
  const elapsed: number = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
