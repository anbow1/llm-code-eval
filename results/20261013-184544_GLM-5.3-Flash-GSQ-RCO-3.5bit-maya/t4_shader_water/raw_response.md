```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1d3a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(7, 5, 7);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Shaders ----------
const vertexShader = /* glsl */ `
  uniform float uTime;

  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Layered moving waves based on world position and time
    float wave1 = sin(pos.x * 1.2 + uTime * 1.5) * cos(pos.y * 1.1 + uTime * 1.1);
    float wave2 = sin(pos.y * 2.3 - uTime * 2.0 + pos.x * 0.8) * 0.5;
    float wave3 = sin((pos.x + pos.y) * 0.5 + uTime * 0.7) * 0.7;

    float displacement = (wave1 + wave2 + wave3) * 0.35;

    pos.z += displacement;
    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height from roughly [-1.5, 1.5] to [0, 1]
    float t = clamp(vHeight * 0.35 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.12, 0.38);
    vec3 midBlue  = vec3(0.05, 0.35, 0.65);
    vec3 foam     = vec3(0.95, 0.98, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.6, t));
    color = mix(color, foam, smoothstep(0.6, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const uniforms = {
  uTime: { value: 0.0 }
};

const material = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vertexShader,
  fragmentShader: fragmentShader
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const plane = new THREE.Mesh(geometry, material);
// PlaneGeometry is built in the XY plane; rotate it flat into the XZ plane.
// After this rotation, the geometry's local Y axis points along world Z,
// so displacing position.z in the shader raises/lowers vertices vertically.
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;

renderer.setAnimationLoop((time) => {
  const elapsedSeconds = time / 1000;
  (uniforms.uTime as { value: number }).value = elapsedSeconds;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```