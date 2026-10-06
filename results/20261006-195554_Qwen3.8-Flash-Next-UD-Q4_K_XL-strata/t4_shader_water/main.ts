import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(6, 7, 8);
camera.lookAt(0, 0, 0);

// Geometry: PlaneGeometry 10x10 with 128x128 segments
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// Shader Material
const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Multi-layered wave displacement along local Z (becomes Y after rotation)
    float wave = 0.0;
    wave += 0.4 * sin(pos.x * 1.5 + uTime * 1.2);
    wave += 0.3 * sin(pos.y * 2.0 + uTime * 0.9);
    wave += 0.2 * sin((pos.x + pos.y) * 1.0 + uTime * 1.5);
    wave += 0.15 * sin(pos.x * 3.0 - pos.y * 2.0 + uTime * 2.0);
    wave += 0.1 * cos(pos.x * 4.0 + pos.y * 3.0 + uTime * 1.7);

    pos.z += wave;
    vHeight = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height to roughly [0, 1]
    float t = clamp((vHeight + 1.0) / 2.0, 0.0, 1.0);

    // Color stops: deep blue -> mid blue -> teal -> light blue -> white foam
    vec3 deepBlue = vec3(0.02, 0.05, 0.35);
    vec3 midBlue  = vec3(0.05, 0.25, 0.65);
    vec3 teal     = vec3(0.0,  0.55, 0.70);
    vec3 light    = vec3(0.7,  0.85, 1.0);
    vec3 foam     = vec3(1.0,  1.0,  1.0);

    vec3 color;
    if (t < 0.35) {
      color = mix(deepBlue, midBlue, t / 0.35);
    } else if (t < 0.55) {
      color = mix(midBlue, teal, (t - 0.35) / 0.20);
    } else if (t < 0.8) {
      color = mix(teal, light, (t - 0.55) / 0.25);
    } else {
      color = mix(light, foam, (t - 0.8) / 0.2);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

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
mesh.rotation.x = -Math.PI / 2; // Lie flat in XZ plane
scene.add(mesh);

// Clock for elapsed time
const clock = new THREE.Clock();

// Animation loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// Resize handler
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
