import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e14);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(8, 7, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 0.8 + uTime * 1.2) * cos(pos.y * 0.6 + uTime * 0.9);
    float wave2 = sin((pos.x + pos.y) * 0.45 + uTime * 1.7);
    float wave3 = sin(length(pos.xy) * 1.1 - uTime * 2.1);

    float height = wave1 * 0.35 + wave2 * 0.25 + wave3 * 0.15;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // vHeight roughly in [-0.75, 0.75]; normalize to 0..1
    float t = clamp(vHeight * 0.6 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.02, 0.09, 0.35);
    vec3 midBlue  = vec3(0.05, 0.35, 0.65);
    vec3 teal     = vec3(0.15, 0.65, 0.75);
    vec3 foam     = vec3(0.95, 0.98, 1.0);

    vec3 color;
    if (t < 0.4) {
      color = mix(deepBlue, midBlue, t / 0.4);
    } else if (t < 0.8) {
      color = mix(midBlue, teal, (t - 0.4) / 0.4);
    } else {
      color = mix(teal, foam, (t - 0.8) / 0.2);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader,
  fragmentShader,
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// PlaneGeometry is built in the XY plane; rotate -90 deg about X so it lies
// flat in the XZ plane (mesh.rotation won't affect the shader's local coords,
// so the displacement along local +Z becomes world +Y).
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

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
