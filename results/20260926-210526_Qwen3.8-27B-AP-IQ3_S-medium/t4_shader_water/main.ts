import * as THREE from 'three';

const scene = new THREE.Scene();

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

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.3;
    float wave2 = cos(pos.y * 3.0 + uTime * 1.0) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.5 + uTime * 2.0) * 0.15;

    float displacement = wave1 + wave2 + wave3;
    pos.z += displacement;

    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float t = clamp((vHeight + 0.65) / 1.3, 0.0, 1.0);

    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 midBlue  = vec3(0.0, 0.3, 0.6);
    vec3 white    = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (t < 0.5) {
      color = mix(deepBlue, midBlue, t * 2.0);
    } else {
      color = mix(midBlue, white, (t - 0.5) * 2.0);
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

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let lastTime: number = 0;
let elapsed: number = 0;
let firstFrame: boolean = true;

renderer.setAnimationLoop((time: number): void => {
  if (lastTime === 0) {
    lastTime = time;
  }
  const delta: number = (time - lastTime) / 1000;
  lastTime = time;
  elapsed += delta;

  material.uniforms['uTime'].value = elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
