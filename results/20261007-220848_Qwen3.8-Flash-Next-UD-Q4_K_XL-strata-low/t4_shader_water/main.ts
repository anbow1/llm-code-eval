import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(5, 6, 8);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Geometry
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

// Shader Material
const uniforms = {
  uTime: { value: 0.0 },
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.3;
    float wave2 = sin(pos.z * 1.5 + uTime * 1.2) * 0.25;
    float wave3 = sin((pos.x + pos.z) * 1.0 + uTime * 0.8) * 0.2;
    float wave4 = sin(pos.x * 4.0 - uTime * 2.0) * cos(pos.z * 3.0 + uTime * 1.7) * 0.1;

    float height = wave1 + wave2 + wave3 + wave4;
    pos.y += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height from [-0.85, 0.85] to [0, 1]
    float h = clamp((vHeight + 0.85) / 1.7, 0.0, 1.0);

    // Deep blue at low, white foam at high
    vec3 deepBlue = vec3(0.02, 0.05, 0.3);
    vec3 midBlue = vec3(0.05, 0.3, 0.6);
    vec3 foam = vec3(0.95, 0.98, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.5, h));
    color = mix(color, foam, smoothstep(0.6, 1.0, h));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

// Mesh
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Clock
const clock = new THREE.Clock();
let firstFrameRendered = false;

// Render loop
renderer.setAnimationLoop(() => {
  uniforms.uTime.value = clock.getElapsedTime();

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
