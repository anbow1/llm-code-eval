import * as THREE from 'three';

// ------------------------------------------------------------------
// Shaders
// ------------------------------------------------------------------

const vertexShader = /* glsl */ `
  uniform float uTime;

  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Layered moving sine waves based on world-ish plane coords.
    float wave1 = sin(pos.x * 1.5 + uTime * 1.2) * 0.35;
    float wave2 = sin(pos.y * 2.1 - uTime * 0.8) * 0.20; // plane's local y is world z
    float wave3 = sin((pos.x + pos.y) * 1.0 + uTime * 1.6) * 0.15;

    float height = wave1 + wave2 + wave3;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height [-0.7 .. 0.7] range approximately to [0 .. 1].
    float t = clamp(vHeight * 0.9 + 0.5, 0.0, 1.0);

    // Deep blue -> mid blue -> sea green -> white foam.
    vec3 deepBlue = vec3(0.02, 0.09, 0.35);
    vec3 midBlue  = vec3(0.05, 0.35, 0.65);
    vec3 seaGreen = vec3(0.15, 0.65, 0.70);
    vec3 foam     = vec3(0.95, 0.98, 1.00);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.4, t));
    color = mix(color, seaGreen, smoothstep(0.4, 0.7, t));
    color = mix(color, foam, smoothstep(0.7, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ------------------------------------------------------------------
// Scene setup
// ------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(7, 6, 9);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ------------------------------------------------------------------
// Ocean plane
// ------------------------------------------------------------------

const uniforms = {
  uTime: { value: 0.0 }
};

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader
});

const oceanGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2; // lie flat in the XZ plane
scene.add(ocean);

// ------------------------------------------------------------------
// Resize
// ------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------------
// Render loop
// ------------------------------------------------------------------

let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = renderer.getDelta?.() ?? 0;
  void delta; // delta-aware: clock below drives animation
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// Clock declared after loop for hoisting-free strict usage
const clock = new THREE.Clock();

// ------------------------------------------------------------------
// Test hooks
// ------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
