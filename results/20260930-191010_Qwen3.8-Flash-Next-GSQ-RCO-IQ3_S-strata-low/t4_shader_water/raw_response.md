```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(6, 5, 6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0 }
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 2.0 + uTime * 2.0) * 0.5;
    float wave2 = sin(pos.z * 3.0 + uTime * 1.5) * 0.3;
    float wave3 = sin((pos.x + pos.z) * 1.5 + uTime * 3.0) * 0.4;
    float wave4 = sin(pos.x * 4.0 - pos.z * 2.0 + uTime * 2.5) * 0.2;

    float h = wave1 + wave2 + wave3 + wave4;
    pos.y += h;

    vHeight = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float t = clamp((vHeight + 1.4) / 2.8, 0.0, 1.0);

    vec3 deepBlue = vec3(0.01, 0.02, 0.15);
    vec3 oceanBlue = vec3(0.0, 0.25, 0.55);
    vec3 shallowCyan = vec3(0.1, 0.6, 0.8);
    vec3 foamWhite = vec3(0.95, 1.0, 1.0);

    vec3 color;
    if (t < 0.33) {
      color = mix(deepBlue, oceanBlue, t / 0.33);
    } else if (t < 0.66) {
      color = mix(oceanBlue, shallowCyan, (t - 0.33) / 0.33);
    } else {
      color = mix(shallowCyan, foamWhite, (t - 0.66) / 0.34);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const clock = new THREE.Clock();
let firstFrame = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);

  if (!firstFrame) {
    firstFrame = true;
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