import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    float wave = sin(position.x * 2.0 + uTime * 1.2) * 0.35
               + cos(position.y * 3.0 + uTime * 1.8) * 0.25
               + sin((position.x + position.y) * 1.5 + uTime * 0.7) * 0.15;

    position.z += wave;
    vHeight = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height: min ~ -0.75, max ~ 0.75
    float t = smoothstep(-0.75, 0.75, vHeight);

    vec3 deepBlue = vec3(0.02, 0.08, 0.25);
    vec3 midBlue  = vec3(0.10, 0.40, 0.70);
    vec3 white    = vec3(1.0, 1.0, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.6, t));
    color = mix(color, white, smoothstep(0.6, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

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

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
  side: THREE.DoubleSide,
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let ready = false;

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
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
