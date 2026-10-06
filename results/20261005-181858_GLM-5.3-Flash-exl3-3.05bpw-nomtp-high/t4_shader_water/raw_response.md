```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1a2a);

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
    vec3 pos = position;

    // Layered moving waves based on local XZ-plane position (plane is rotated flat)
    float wave1 = sin(pos.x * 1.2 + uTime * 1.5) * cos(pos.y * 1.0 + uTime * 1.1);
    float wave2 = sin(pos.x * 2.3 - uTime * 2.0 + pos.y * 1.7) * 0.5;
    float wave3 = sin((pos.x + pos.y) * 3.1 + uTime * 2.8) * 0.25;
    float height = wave1 + wave2 + wave3;

    // PlaneGeometry lies in local XY; rotate displacement into local Z (world up after rotation)
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height (-1.75..1.75) to 0..1
    float t = clamp(vHeight * 0.25 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.10, 0.35);
    vec3 midBlue  = vec3(0.05, 0.35, 0.65);
    vec3 shallow  = vec3(0.20, 0.65, 0.80);
    vec3 foam     = vec3(0.95, 0.98, 1.00);

    vec3 color;
    if (t < 0.4) {
      color = mix(deepBlue, midBlue, t / 0.4);
    } else if (t < 0.75) {
      color = mix(midBlue, shallow, (t - 0.4) / 0.35);
    } else {
      color = mix(shallow, foam, (t - 0.75) / 0.25);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const uniforms = {
  uTime: { value: 0.0 },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  const elapsed = time * 0.001; // ms -> seconds
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```