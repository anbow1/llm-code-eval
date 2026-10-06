```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1522);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(6, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position; // plane is XY before rotation; wave uses local coords

    float wave1 = sin(pos.x * 1.5 + uTime * 1.2) * 0.35;
    float wave2 = cos(pos.y * 1.8 + uTime * 0.9) * 0.25;
    float wave3 = sin((pos.x + pos.y) * 0.8 + uTime * 1.6) * 0.15;

    pos.z += wave1 + wave2 + wave3;
    vHeight = pos.z;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // local z ranges roughly [-0.75, 0.75]
    float t = clamp(vHeight / 0.75 * 0.5 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.15, 0.45);
    vec3 midBlue  = vec3(0.05, 0.45, 0.75);
    vec3 foam     = vec3(0.95, 0.98, 1.00);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.6, t));
    color = mix(color, foam, smoothstep(0.6, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 }
  }
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  material.uniforms.uTime.value = elapsed;

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
```