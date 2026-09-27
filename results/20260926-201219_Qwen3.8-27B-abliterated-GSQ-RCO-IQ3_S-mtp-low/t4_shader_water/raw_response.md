```typescript
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.3;
    float wave2 = sin(pos.y * 3.0 + uTime * 2.0) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.5 + uTime * 1.0) * 0.25;
    float wave4 = cos(pos.x * 1.2 - pos.y * 0.8 + uTime * 0.7) * 0.15;

    float height = wave1 + wave2 + wave3 + wave4;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float normalized = vHeight * 0.9 + 0.5;
    normalized = clamp(normalized, 0.0, 1.0);

    vec3 deepBlue = vec3(0.0, 0.05, 0.35);
    vec3 midBlue = vec3(0.1, 0.45, 0.85);
    vec3 foam = vec3(1.0);

    vec3 color;
    if (normalized < 0.5) {
      color = mix(deepBlue, midBlue, normalized * 2.0);
    } else {
      color = mix(midBlue, foam, (normalized - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 7, 10);
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```