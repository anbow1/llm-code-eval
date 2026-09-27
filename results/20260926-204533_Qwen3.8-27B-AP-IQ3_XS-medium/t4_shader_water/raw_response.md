```ts
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 4, 7);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Geometry: Plane 10x10 with 128x128 segments
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Rotate flat into XZ plane (local Z becomes world Y)
geometry.rotateX(-Math.PI / 2);

// Shaders
const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Multiple overlapping waves for organic motion
    float w1 = sin(pos.x * 1.8 + uTime * 1.2) * 0.25;
    float w2 = cos(pos.y * 2.4 + uTime * 1.6) * 0.2;
    float w3 = sin((pos.x + pos.y) * 1.4 + uTime * 0.9) * 0.15;
    float w4 = cos(length(pos.xy) * 2.0 - uTime * 1.1) * 0.1;

    float height = w1 + w2 + w3 + w4;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Approximate range of combined waves: [-0.7, 0.7]
    float t = clamp((vHeight + 0.7) / 1.4, 0.0, 1.0);

    // Deep blue for low, white foam for high
    vec3 deepBlue = vec3(0.0, 0.04, 0.25);
    vec3 midBlue = vec3(0.05, 0.3, 0.65);
    vec3 whiteFoam = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (t < 0.5) {
      color = mix(deepBlue, midBlue, t * 2.0);
    } else {
      color = mix(midBlue, whiteFoam, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Material
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
  side: THREE.DoubleSide,
});

// Mesh
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Clock for delta/elapsed time
const clock = new THREE.Clock();
let readySet = false;

// Resize handler
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Animation loop
renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!readySet) {
    readySet = true;
    (window as any).__ready = true;
  }
});
```