```ts
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Layered sine waves moving through the XZ plane.
    // plane is in XY before rotation; local Y becomes world height.
    float wave1 = sin(pos.x * 0.8 + uTime * 1.2) * cos(pos.y * 0.6 + uTime * 0.9);
    float wave2 = sin((pos.x + pos.y) * 1.4 + uTime * 1.8) * 0.5;
    float wave3 = sin(length(pos.xy) * 1.1 - uTime * 2.0) * 0.35;

    float height = wave1 * 0.5 + wave2 + wave3;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // vHeight roughly ranges from -1.85 to 1.85; normalize to 0..1
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);

    // Deep blue -> mid blue -> white foam, with a nonlinear boost near crests
    vec3 deepBlue = vec3(0.02, 0.10, 0.35);
    vec3 midBlue  = vec3(0.10, 0.45, 0.75);
    vec3 foam     = vec3(0.98, 0.99, 1.00);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.6, t));
    color = mix(color, foam, smoothstep(0.55, 0.95, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(8, 6, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const uniforms = {
  uTime: { value: 0.0 }
};

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2; // lay flat in the XZ plane
scene.add(plane);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  uniforms.uTime.value = elapsedTime;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```