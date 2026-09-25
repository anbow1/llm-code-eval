import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 7, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    vec3 pos = position;
    float x = pos.x;
    float y = pos.y;

    float wave1 = sin(x * 1.8 + uTime * 1.4) * 0.35;
    float wave2 = cos(y * 2.2 + uTime * 1.1) * 0.30;
    float wave3 = sin((x + y) * 1.2 + uTime * 0.9) * 0.20;
    float wave4 = sin(length(vec2(x, y)) * 2.5 - uTime * 2.0) * 0.15;

    float displacement = wave1 + wave2 + wave3 + wave4;
    pos.z += displacement;

    vHeight = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height from roughly [-1.0, 1.0] to [0.0, 1.0]
    float h = clamp((vHeight + 1.0) / 2.0, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.05, 0.25);
    vec3 midBlue  = vec3(0.05, 0.25, 0.55);
    vec3 lightBlue = vec3(0.30, 0.60, 0.85);
    vec3 foam     = vec3(0.95, 0.98, 1.0);

    vec3 color;
    if (h < 0.4) {
      color = mix(deepBlue, midBlue, h / 0.4);
    } else if (h < 0.75) {
      color = mix(midBlue, lightBlue, (h - 0.4) / 0.35);
    } else {
      color = mix(lightBlue, foam, (h - 0.75) / 0.25);
    }

    // Add subtle foam sparkle near peaks
    float sparkle = smoothstep(0.85, 1.0, h) * 0.4;
    color += sparkle;

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

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

const clock = new THREE.Clock();
let ready = false;

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
