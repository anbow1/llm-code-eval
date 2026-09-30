```ts
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(7, 6, 7);
camera.lookAt(0, 0, 0);

const uniforms = {
  uTime: { value: 0.0 as number },
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float h = sin(pos.x * 1.5 + uTime * 2.0) * 0.5
            + sin(pos.y * 2.0 + uTime * 1.5) * 0.3
            + sin((pos.x + pos.y) * 1.2 - uTime * 2.5) * 0.2
            + sin(pos.x * 0.8 - pos.y * 1.3 + uTime * 1.0) * 0.25;

    pos.z += h;
    vHeight = h;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float t = smoothstep(-1.0, 1.2, vHeight);
    vec3 deepBlue = vec3(0.0, 0.05, 0.45);
    vec3 midBlue  = vec3(0.0, 0.25, 0.7);
    vec3 white    = vec3(1.0, 1.0, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.5, t));
    color = mix(color, white, smoothstep(0.7, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
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