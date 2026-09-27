

```ts
import * as THREE from 'three';

const vertexShader: string = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.3;
    float wave2 = sin(pos.y * 2.0 + uTime * 1.5) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.0 + uTime * 1.0) * 0.15;
    float wave4 = cos(pos.x * 0.8 - pos.y * 1.2 + uTime * 0.7) * 0.1;

    float height = wave1 + wave2 + wave3 + wave4;
    pos.z += height;

    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader: string = /* glsl */ `
  varying float vHeight;

  void main() {
    float t = clamp((vHeight + 0.75) / 1.5, 0.0, 1.0);

    vec3 deepBlue = vec3(0.0, 0.04, 0.18);
    vec3 midBlue = vec3(0.05, 0.35, 0.65);
    vec3 lightBlue = vec3(0.4, 0.7, 0.9);
    vec3 white = vec3(1.0, 1.0, 1.0);

    vec3 color;
    if (t < 0.3) {
      color = mix(deepBlue, midBlue, t / 0.3);
    } else if (t < 0.7) {
      color = mix(midBlue, lightBlue, (t - 0.3) / 0.4);
    } else {
      color = mix(lightBlue, white, (t - 0.7) / 0.3);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x080818);

const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5, 9);
camera.lookAt(0, 0, 0);

const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const material: THREE.ShaderMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 }
  }
});

const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock: THREE.Clock = new THREE.Clock();
let isReady: boolean = false;

renderer.setAnimationLoop((): void => {
  const elapsed: number = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);

  if (!isReady) {
    isReady = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```