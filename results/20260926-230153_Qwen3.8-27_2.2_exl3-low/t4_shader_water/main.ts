import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
varying float vHeight;

void main() {
  float wave1 = sin(position.x * 1.5 + uTime * 1.2) * 0.30;
  float wave2 = sin(position.z * 1.0 + uTime * 0.8) * 0.25;
  float wave3 = sin((position.x + position.z) * 0.7 + uTime * 0.5) * 0.15;
  float displacement = wave1 + wave2 + wave3;

  vec3 pos = position;
  pos.y += displacement;

  vHeight = displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
varying float vHeight;

void main() {
  float normalized = (vHeight + 0.7) / 1.4;
  vec3 deepBlue = vec3(0.0, 0.05, 0.25);
  vec3 white = vec3(1.0, 1.0, 1.0);
  vec3 color = mix(deepBlue, white, normalized);
  gl_FragColor = vec4(color, 1.0);
}
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let firstFrame = true;

renderer.setAnimationLoop((time: number) => {
  material.uniforms.uTime.value = time;

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
