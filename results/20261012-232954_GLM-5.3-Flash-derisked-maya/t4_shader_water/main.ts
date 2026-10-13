import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Custom GLSL shaders
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  uniform float uTime;

  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Sum of a few sine waves travelling in different directions to get a
    // more natural, moving water surface.
    float wave = 0.0;
    wave += 0.50 * sin(pos.x * 1.6 + uTime * 1.9);
    wave += 0.30 * sin(pos.y * 2.3 + uTime * 2.7);
    wave += 0.20 * sin((pos.x + pos.y) * 3.1 - uTime * 3.4);

    // Displace along the plane's local +Z axis. Because the mesh is rotated
    // flat onto the XZ plane, local +Z maps to world +Y (vertical).
    pos.z += wave;

    // Pass the displaced height to the fragment shader for coloring.
    vHeight = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Map height (roughly -1..1) into 0..1.
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.01, 0.05, 0.30);
    vec3 midBlue  = vec3(0.05, 0.35, 0.65);
    vec3 foam     = vec3(0.98, 0.99, 1.00);

    // Low troughs -> deep blue, mid heights -> lighter blue,
    // high crests -> white foam.
    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.55, t));
    color = mix(color, foam, smoothstep(0.62, 0.90, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1e);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
// Angled, elevated view so the waves are clearly visible.
camera.position.set(4.5, 5.0, 8.0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// PlaneGeometry lies in the local XY plane facing +Z by default; rotating it
// by -PI/2 about X lays it flat in the world XZ plane.
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
  },
});

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Minimal page reset so the canvas fills the viewport cleanly.
const style = document.createElement('style');
style.textContent = 'html, body { margin: 0; overflow: hidden; }';
document.head.appendChild(style);

// Expose for testing.
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

function animate(): void {
  // Drive the wave motion from elapsed time (seconds), not frame counts.
  material.uniforms.uTime.value = clock.getElapsedTime();

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
