```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(5, 6, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.3;
    float wave2 = sin(pos.y * 3.0 + uTime * 2.0) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.5 + uTime * 0.8) * 0.25;
    float wave4 = cos(pos.x * 4.0 - pos.y * 3.0 + uTime * 2.5) * 0.15;
    float wave5 = sin(length(pos.xy - vec2(1.0, -1.0)) * 5.0 - uTime * 3.0) * 0.1;

    float h = wave1 + wave2 + wave3 + wave4 + wave5;

    pos.z += h;

    vHeight = h;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height roughly in [-1, 1] to [0, 1]
    float t = clamp(vHeight * 0.7 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.05, 0.35);
    vec3 midBlue  = vec3(0.1, 0.3, 0.7);
    vec3 foamWhite = vec3(0.95, 0.97, 1.0);

    vec3 color;
    if (t < 0.45) {
      color = mix(deepBlue, midBlue, smoothstep(0.0, 0.45, t));
    } else {
      color = mix(midBlue, foamWhite, smoothstep(0.45, 1.0, t));
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0 },
};

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```