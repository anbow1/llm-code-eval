```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 8, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position; // plane geometry lies in XY before rotation

    float wave1 = sin(pos.x * 0.8 + uTime * 1.5) * 0.5;
    float wave2 = sin(pos.y * 1.1 - uTime * 2.0) * 0.35;
    float wave3 = sin((pos.x + pos.y) * 0.5 + uTime * 1.2) * 0.4;
    float height = wave1 + wave2 + wave3;

    pos.z += height; // becomes Y after rotating -90deg around X
    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height roughly to 0..1 (waves sum to max ~1.25)
    float h = clamp((vHeight + 1.25) / 2.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.08, 0.35);
    vec3 midBlue  = vec3(0.10, 0.40, 0.65);
    vec3 foam     = vec3(1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.6, h));
    color = mix(color, foam, smoothstep(0.75, 1.0, h));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const waveMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 }
  }
});

const planeGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const plane = new THREE.Mesh(planeGeometry, waveMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let firstFrame = true;

renderer.setAnimationLoop((elapsedMs: number) => {
  const elapsedSeconds = elapsedMs / 1000;
  waveMaterial.uniforms.uTime.value = elapsedSeconds;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```