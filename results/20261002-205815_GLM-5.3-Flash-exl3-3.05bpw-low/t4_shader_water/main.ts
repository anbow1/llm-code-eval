import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 6, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';

const uniforms = {
  uTime: { value: 0.0 }
} as { uTime: { value: number } };

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 1.2 + uTime * 1.5) * 0.4;
    float wave2 = cos(pos.y * 1.0 + uTime * 1.1) * 0.35;
    float wave3 = sin((pos.x + pos.y) * 2.0 + uTime * 2.0) * 0.15;

    float height = wave1 + wave2 + wave3;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalize height roughly into [0, 1]
    float h = clamp(vHeight / 0.9 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.13, 0.42);
    vec3 midBlue  = vec3(0.05, 0.42, 0.70);
    vec3 turquoise = vec3(0.15, 0.68, 0.75);
    vec3 foam = vec3(0.95, 0.98, 1.0);

    vec3 color;
    if (h < 0.4) {
      color = mix(deepBlue, midBlue, h / 0.4);
    } else if (h < 0.75) {
      color = mix(midBlue, turquoise, (h - 0.4) / 0.35);
    } else {
      color = mix(turquoise, foam, (h - 0.75) / 0.25);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// PlaneGeometry lies in the XY plane; rotate -90° about X to lay flat in XZ.
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  uniforms.uTime.value += delta;

  renderer.render(scene, camera);

  if (!ready) {
    (window as any).__ready = true;
    ready = true;
  }
});
