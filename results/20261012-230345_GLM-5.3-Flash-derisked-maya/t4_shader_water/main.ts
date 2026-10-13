import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Moving wave pattern: combination of directional waves based on position and time
    float wave1 = sin(pos.x * 0.8 + uTime * 1.5) * 0.35;
    float wave2 = sin(pos.y * 0.6 - uTime * 1.2) * 0.30;
    float wave3 = sin((pos.x + pos.y) * 0.4 + uTime * 0.9) * 0.25;
    float wave4 = sin(pos.x * 2.2 - pos.y * 1.7 + uTime * 2.4) * 0.08;

    float height = wave1 + wave2 + wave3 + wave4;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height to 0..1 range (approximate given wave amplitudes)
    float h = clamp((vHeight + 1.0) / 2.0, 0.0, 1.0);

    // Low = deep blue, high = white foam
    vec3 deepBlue = vec3(0.008, 0.08, 0.30);
    vec3 midBlue  = vec3(0.05, 0.30, 0.55);
    vec3 foam     = vec3(1.0, 1.0, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.55, h));
    color = mix(color, foam, smoothstep(0.75, 1.0, h));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(8, 7, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Ocean plane ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2); // lie flat in the XZ plane

const uniforms = {
  uTime: { value: 0.0 }
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms
});

const ocean = new THREE.Mesh(geometry, material);
scene.add(ocean);

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;

// --- Render loop ---
renderer.setAnimationLoop((time) => {
  const elapsedSeconds = time / 1000;
  material.uniforms.uTime.value = elapsedSeconds;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
