import * as THREE from "three";

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera – angled view so waves are clearly visible
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(6, 4, 6);
camera.lookAt(0, 0, 0);

// Geometry – PlaneGeometry rotated flat in XZ
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2); // now lies in XZ, normals point +Y

// Shader material
const uniforms: { uTime: { value: number } } = {
  uTime: { value: 0.0 },
};

const vertexShader = /* glsl */ `
uniform float uTime;
varying float vHeight;

void main() {
  vec3 pos = position;

  float wave = 0.0;
  wave += sin(pos.x * 2.0 + uTime * 1.5) * 0.45;
  wave += sin(pos.z * 3.0 + uTime * 1.1) * 0.35;
  wave += sin((pos.x + pos.z) * 1.5 + uTime * 0.8) * 0.3;
  wave += sin((pos.x - pos.z) * 2.5 + uTime * 1.7) * 0.15;

  pos.y += wave;
  vHeight = wave;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying float vHeight;

void main() {
  vec3 deepBlue  = vec3(0.0, 0.06, 0.35);
  vec3 midBlue   = vec3(0.05, 0.25, 0.65);
  vec3 lightBlue = vec3(0.4, 0.7, 0.95);
  vec3 white     = vec3(1.0);

  // Map height (-1.25 .. 1.25) to (0 .. 1)
  float t = clamp((vHeight + 1.25) / 2.5, 0.0, 1.0);

  vec3 color;
  if (t < 0.33) {
    color = mix(deepBlue, midBlue, t / 0.33);
  } else if (t < 0.66) {
    color = mix(midBlue, lightBlue, (t - 0.33) / 0.33);
  } else {
    color = mix(lightBlue, white, (t - 0.66) / 0.34);
  }

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

// Clock for elapsed time
const clock = new THREE.Clock();
let firstFrame = true;

// Resize handler
function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", onResize);

// Render loop
renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
