import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3e6);
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x6b6250, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(300, 500, 200);
scene.add(sun);

/* ---- sky dome driven by altitude, stars above ~70 km ------------------------------------------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uAlt: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform float uAlt; varying vec3 vDir;
    void main(){
      float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 day = mix(vec3(0.75,0.85,0.95), vec3(0.18,0.42,0.85), h);
      float space = smoothstep(10000.0, 100000.0, uAlt);
      gl_FragColor = vec4(mix(day, vec3(0.0,0.0,0.02), space), 1.0);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1e6, 32, 16), skyMat);
scene.add(sky);
const starPos: number[] = [];
for (let i = 0; i < 4000; i++) {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(9e5);
  starPos.push(v.x, v.y, v.z);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

/* ---- ground, pad, tower ------------------------------------------------------------------------ */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: 0x6f7a55, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const pad = new THREE.Mesh(new THREE.BoxGeometry(80, 2, 80), new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.9 }));
pad.position.y = 1;
scene.add(pad);
const MOUNT = 15; // launch mount: the engines sit 15 m above the pad, over the flame trench
const mount = new THREE.Mesh(new THREE.BoxGeometry(14, MOUNT, 4), new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.8 }));
mount.position.set(0, MOUNT / 2 + 2, -6);
scene.add(mount);
const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 90, 8), new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.7 }));
tower.position.set(-14, 45, 0);
scene.add(tower);

/* ---- rocket (origin at the engines) -------------------------------------------------------------- */
const rocket = new THREE.Group();
const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
const body = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 60, 24), white);
body.position.y = 32;
const nose = new THREE.Mesh(new THREE.ConeGeometry(1.85, 10, 24), white);
nose.position.y = 67;
const plume = new THREE.Mesh(new THREE.ConeGeometry(4, 40, 24, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: 0.95 }));
plume.position.y = -18;
plume.rotation.x = Math.PI;
const core = new THREE.Mesh(new THREE.ConeGeometry(2, 18, 16), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }));
core.position.y = -8;
core.rotation.x = Math.PI;
rocket.add(body, nose, plume, core);
scene.add(rocket);

/* smoke clouds at the pad */
const smoke: THREE.Mesh[] = [];
const smokeMat = new THREE.MeshStandardMaterial({ color: 0xdedbd6, transparent: true, opacity: 0.8, roughness: 1 });
for (let i = 0; i < 40; i++) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), smokeMat);
  s.userData.dir = new THREE.Vector3(Math.random() * 2 - 1, 0.15, Math.random() * 2 - 1).normalize();
  smoke.push(s);
  scene.add(s);
}

/* trail */
const MAXTRAIL = 4000;
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MAXTRAIL * 3), 3));
const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
trailLine.frustumCulled = false;
scene.add(trailLine);

/* ---- physics -------------------------------------------------------------------------------------- */
const G0 = 9.81, R = 6371000, M0 = 550000, MDRY = 220000, BURN = 200, THRUST = 1.3 * M0 * G0;
let t = 0, x = 0, y = 0, vx = 0, vy = 0, acc = 0;
const trail: { x: number; y: number; z: number }[] = [];
const gAt = (h: number) => G0 * (R / (R + h)) ** 2;
const pitchAt = (time: number) => (time < 10 ? 0 : Math.min(0.5, (0.5 * (time - 10)) / 140));
function massAt(time: number) { return M0 - (M0 - MDRY) * Math.min(time / BURN, 1); }
function sub(dt: number) {
  const m = massAt(t);
  const thrust = t < BURN ? Math.min(THRUST, 3 * m * G0) : 0;
  const p = pitchAt(t);
  const ax = (thrust * Math.sin(p)) / m;
  let ay = (thrust * Math.cos(p)) / m - gAt(y);
  if (y <= 0 && ay < 0) ay = 0;
  vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt;
  if (y < 0) { y = 0; vy = Math.max(vy, 0); }
  acc = ay;
  t += dt;
}
const hook = {
  paused: false,
  trail,
  reset() { t = 0; x = 0; y = 0; vx = 0; vy = 0; acc = 0; trail.length = 0; },
  step(dt: number) {
    const n = Math.max(1, Math.ceil(dt / 0.02));
    for (let i = 0; i < n; i++) sub(dt / n);
    trail.push({ x, y, z: 0 });
  },
  state() { return { t, alt: y, vel: Math.hypot(vx, vy), acc, pitch: pitchAt(t) }; },
};
(window as any).__rocket = hook;

function updateView() {
  rocket.position.set(x, y + 2 + MOUNT, 0);
  rocket.rotation.z = -pitchAt(t);
  const burning = t < BURN;
  plume.visible = core.visible = burning;
  skyMat.uniforms.uAlt.value = y;
  starMat.opacity = THREE.MathUtils.smoothstep(y, 70000, 100000);
  smoke.forEach((s, i) => {
    const age = Math.min(t, 40);
    const r = 4 + age * (1.5 + (i % 5) * 0.4);
    s.position.copy((s.userData.dir as THREE.Vector3).clone().multiplyScalar(18 + r * 2)).setY(3 + age * 0.6 + (i % 4));
    s.scale.setScalar(4 + age * 0.8);
  });
  smokeMat.opacity = Math.max(0, 0.8 - t / 60);
  const pos = trailGeo.attributes.position as THREE.BufferAttribute;
  const n = Math.min(trail.length, MAXTRAIL);
  const start = trail.length - n;
  for (let i = 0; i < n; i++) pos.setXYZ(i, trail[start + i].x, trail[start + i].y, trail[start + i].z);
  pos.needsUpdate = true;
  trailGeo.setDrawRange(0, n);
  // camera: from the ground first, then following the rocket upward
  const follow = THREE.MathUtils.smoothstep(y, 50, 2000);
  camera.position.set(x - 90, THREE.MathUtils.lerp(20, y + 20, follow), THREE.MathUtils.lerp(150, 260, follow));
  camera.lookAt(x, y + 30, 0);
  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let first = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (!hook.paused) hook.step(dt);
  updateView();
  renderer.render(scene, camera);
  if (first) { first = false; (window as any).__ready = true; }
});
