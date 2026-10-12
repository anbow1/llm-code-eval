import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1420);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(8, 6, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const vertexShader = /* glsl */ `
  uniform float uTime;

  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Moving wave pattern: two directional sine waves + a smaller ripple
    float wave1 = sin(pos.x * 1.2 + uTime * 1.5) * cos(pos.z * 0.8 + uTime * 1.0);
    float wave2 = sin(pos.z * 1.5 - uTime * 1.2 + pos.x * 0.5);
    float ripple = sin((pos.x + pos.z) * 3.0 + uTime * 2.0) * 0.15;

    float height = wave1 * 0.4 + wave2 * 0.3 + ripple;
    pos.y += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height into 0..1 range (max wave amplitude ~0.85)
    float t = clamp(vHeight / 0.85 * 0.5 + 0.5, 0.0, 1.0);

    // Deep blue -> mid blue -> white foam
    vec3 deepBlue = vec3(0.02, 0.10, 0.35);
    vec3 midBlue  = vec3(0.10, 0.40, 0.75);
    vec3 foam     = vec3(0.95, 0.98, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.55, t));
    color = mix(color, foam, smoothstep(0.65, 1.0, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
});

const ocean = new THREE.Mesh(geometry, material);
scene.add(ocean);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
