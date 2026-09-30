```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(8, 6, 8);
camera.lookAt(0, 0, 0);

// --- ShaderMaterial ---
const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0.0 },
};

const vertexShader = /* glsl */ `
uniform float uTime;
varying float vHeight;

void main() {
  vec3 pos = position;

  // Displace Y (which becomes height in world space) based on X and Z
  float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.4;
  float wave2 = sin(pos.z * 3.0 + uTime * 2.0) * 0.3;
  float wave3 = sin((pos.x + pos.z) * 1.5 + uTime * 1.0) * 0.25;
  float wave4 = sin(length(pos.xz) * 4.0 - uTime * 3.0) * 0.2;

  float displacement = wave1 + wave2 + wave3 + wave4;
  pos.y += displacement;

  vHeight = displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying float vHeight;

void main() {
  // Map height to color: deep blue (low) -> cyan -> white foam (high)
  float h = vHeight;

  // Normalize to 0-1 range roughly
  float t = clamp((h + 1.2) / 2.4, 0.0, 1.0);

  vec3 deepBlue  = vec3(0.0, 0.05, 0.2);
  vec3 midBlue   = vec3(0.0, 0.3, 0.6);
  vec3 lightBlue = vec3(0.2, 0.6, 0.8);
  vec3 foamWhite = vec3(0.95, 0.97, 1.0);

  vec3 color;
  if (t < 0.33) {
    color = mix(deepBlue, midBlue, t / 0.33);
  } else if (t < 0.7) {
    color = mix(midBlue, lightBlue, (t - 0.33) / 0.37);
  } else {
    color = mix(lightBlue, foamWhite, (t - 0.7) / 0.3);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
});

// --- Plane geometry, rotated to lie in XZ ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// --- Render loop ---
let firstFrameDone = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```