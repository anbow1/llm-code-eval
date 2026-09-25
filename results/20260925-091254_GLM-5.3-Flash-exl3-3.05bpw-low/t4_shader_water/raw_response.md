```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1a2f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 7, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const uniforms = { uTime: { value: 0.0 } };

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;
  varying vec2 vUv;

  float wave(vec2 p, float t) {
    float w = sin(p.x * 0.8 + t * 1.2) * 0.35;
    w += sin(p.y * 0.6 + t * 0.9) * 0.3;
    w += sin((p.x + p.y) * 0.5 + t * 1.6) * 0.25;
    w += sin(length(p) * 1.1 - t * 2.0) * 0.15;
    return w;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    float h = wave(pos.xy, uTime);
    pos.z += h;
    vHeight = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  varying vec2 vUv;

  void main() {
    float h = vHeight;
    vec3 deepBlue = vec3(0.0, 0.1, 0.35);
    vec3 midBlue = vec3(0.0, 0.35, 0.65);
    vec3 foam = vec3(0.95, 0.98, 1.0);
    vec3 color;
    if (h < 0.0) {
      color = mix(deepBlue, midBlue, clamp(h + 1.0, 0.0, 1.0));
    } else {
      color = mix(midBlue, foam * 0.7, clamp(h, 0.0, 1.0));
    }
    float crest = smoothstep(0.85, 1.0, h);
    color = mix(color, foam, crest);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let firstFrame = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  uniforms.uTime.value += delta;
  renderer.render(scene, camera);
  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```