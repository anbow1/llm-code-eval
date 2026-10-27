import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const HAZE = new THREE.Color(0xc9d3dc);
scene.fog = new THREE.FogExp2(HAZE.getHex(), 0.00011);
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 3e6);
scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x5d6648, 1.1));
const sun = new THREE.DirectionalLight(0xfff4e2, 2.4);
sun.position.set(-400, 600, 500);
scene.add(sun);
const plumeLight = new THREE.PointLight(0xffb060, 0, 900, 1.6);   // the flame lights the pad and the rocket
scene.add(plumeLight);

/* ---- sky dome driven by altitude: pale haze at the horizon, blue above, black in space -------------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uAlt: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform float uAlt; varying vec3 vDir;
    void main(){
      float h = clamp(vDir.y, 0.0, 1.0);
      vec3 day = mix(vec3(0.80,0.84,0.88), vec3(0.30,0.52,0.84), pow(h, 0.45));
      float space = smoothstep(8000.0, 100000.0, uAlt);
      vec3 high = mix(vec3(0.10,0.18,0.40), vec3(0.0,0.0,0.015), smoothstep(0.0, 0.6, h));
      gl_FragColor = vec4(mix(day, high, space), 1.0);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1e6, 32, 16), skyMat);
scene.add(sky);
const starPos: number[] = [];
for (let i = 0; i < 5000; i++) {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(9e5);
  starPos.push(v.x, v.y, v.z);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

/* ---- Florida coast: scrub land, beach, the Atlantic behind the pad ------------------------------ */
const hash = (x: number, z: number) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
const landGeo = new THREE.PlaneGeometry(9000, 6000, 180, 120);
landGeo.rotateX(-Math.PI / 2);
landGeo.translate(0, 0, 1500);
const lc: number[] = [];
const lp = landGeo.attributes.position as THREE.BufferAttribute;
for (let i = 0; i < lp.count; i++) {
  const x = lp.getX(i), z = lp.getZ(i);
  const n = 0.5 * hash(Math.floor(x / 40), Math.floor(z / 40)) + 0.5 * hash(Math.floor(x / 9), Math.floor(z / 9));
  const beach = THREE.MathUtils.smoothstep(z, -1500, -1420);
  const green = new THREE.Color().setRGB(0.20 + 0.12 * n, 0.30 + 0.14 * n, 0.14 + 0.06 * n);
  const sand = new THREE.Color(0xd9cfae);
  const c = sand.lerp(green, beach);
  lc.push(c.r, c.g, c.b);
}
landGeo.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
const land = new THREE.Mesh(landGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
scene.add(land);
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(400000, 200000),
  new THREE.MeshStandardMaterial({ color: 0x3f6378, roughness: 0.25, metalness: 0.1 }));
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(0, -0.5, -101500);
scene.add(ocean);
// roads and low buildings
const asphalt = new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 0.95 });
for (const [x, z, w, d] of [[0, 300, 14, 1200], [-500, 700, 1600, 12], [420, -300, 900, 10], [-260, -120, 10, 600]]) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), asphalt);
  r.position.set(x, 0.1, z);
  scene.add(r);
}
const bldg = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.8 });
for (const [x, z, w, h, d] of [[-260, 160, 40, 14, 26], [-300, 210, 22, 9, 18], [380, 120, 60, 20, 30], [900, 900, 120, 60, 80], [-1100, 600, 30, 12, 50]]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldg);
  b.position.set(x, h / 2, z);
  scene.add(b);
}
// low scrub bushes near the pad
const bushGeo = new THREE.IcosahedronGeometry(1, 0);
const bushes = new THREE.InstancedMesh(bushGeo, new THREE.MeshStandardMaterial({ color: 0x3f5a2a, roughness: 1, flatShading: true }), 1500);
const dm = new THREE.Object3D();
for (let i = 0; i < 1500; i++) {
  let x = 0, z = 0;
  do { x = (Math.random() - 0.5) * 1600; z = (Math.random() - 0.5) * 1400; } while (Math.hypot(x, z) < 110 || Math.hypot(x + 70, z - 220) < 160);
  dm.position.set(x, 0.6, z);
  dm.scale.set(1.5 + Math.random() * 2, 0.8 + Math.random(), 1.5 + Math.random() * 2);
  dm.rotation.y = Math.random() * 6;
  dm.updateMatrix();
  bushes.setMatrixAt(i, dm.matrix);
}
scene.add(bushes);

/* ---- pad: concrete, flame trench, lattice tower and lightning masts ------------------------------ */
const concrete = new THREE.MeshStandardMaterial({ color: 0xb4b2ab, roughness: 0.95 });
const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(105, 110, 3, 48), concrete);
padMesh.position.y = 1.5;
scene.add(padMesh);
const trench = new THREE.Mesh(new THREE.BoxGeometry(90, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 1 }));
trench.position.set(0, 3.05, 0);
scene.add(trench);
const MOUNT = 15; // launch mount: the engines sit 15 m above the pad, over the flame trench
const mountMat = new THREE.MeshStandardMaterial({ color: 0x6a6c6e, roughness: 0.7, metalness: 0.3 });
for (const sx of [-1, 1]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(3, MOUNT, 10), mountMat);
  leg.position.set(sx * 7, 3 + MOUNT / 2, 0);
  scene.add(leg);
}
const deck = new THREE.Mesh(new THREE.BoxGeometry(17, 1.5, 10), mountMat);
deck.position.set(0, 3 + MOUNT - 0.75, 0);
scene.add(deck);

function lattice(h: number, w: number, color: number, thick: number, levels: number) {
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const top = (y: number) => w * (1 - 0.35 * y / h);
  for (let l = 0; l < levels; l++) {
    const y0 = (l / levels) * h, y1 = ((l + 1) / levels) * h;
    for (let k = 0; k < 4; k++) {
      const a = c[k], b = c[(k + 1) % 4];
      const A0 = new THREE.Vector3(a[0] * top(y0) / 2, y0, a[1] * top(y0) / 2);
      const B0 = new THREE.Vector3(b[0] * top(y0) / 2, y0, b[1] * top(y0) / 2);
      const A1 = new THREE.Vector3(a[0] * top(y1) / 2, y1, a[1] * top(y1) / 2);
      const B1 = new THREE.Vector3(b[0] * top(y1) / 2, y1, b[1] * top(y1) / 2);
      segs.push([A0, A1], [A0, B0], [l % 2 ? A0 : B0, l % 2 ? B1 : A1]);
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4 }), segs.length);
  const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  segs.forEach(([a, b], i) => {
    const d = b.clone().sub(a);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(up, d.clone().normalize());
    o.scale.set(thick, d.length(), thick);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  return mesh;
}
const tower = lattice(95, 10, 0x9a9da0, 0.45, 24);
tower.position.set(-17, 3, 0);
scene.add(tower);
for (let i = 0; i < 6; i++) {           // swing arms to the rocket
  const armMesh = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 2.4), mountMat);
  armMesh.position.set(-9.5, 3 + MOUNT + 12 + i * 11, 0);
  scene.add(armMesh);
}
const mastPos: [number, number][] = [[-120, -90], [120, -90], [-120, 110], [125, 105]];
for (const [x, z] of mastPos) {
  const m = lattice(135, 4.5, 0xa8aaa8, 0.3, 30);
  m.position.set(x, 0, z);
  scene.add(m);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 25, 6), mountMat);
  rod.position.set(x, 147, z);
  scene.add(rod);
}

/* ---- rocket (origin at the engines) -------------------------------------------------------------- */
function markings() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 2048;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 512, 2048);
  g.save(); g.translate(300, 1500); g.rotate(-Math.PI / 2);
  g.fillStyle = '#1b2333'; g.font = 'bold 110px sans-serif'; g.fillText('U N I T E D   S T A T E S', 0, 0);
  g.restore();
  // a small flag
  for (let s = 0; s < 7; s++) { g.fillStyle = s % 2 ? '#ffffff' : '#b22234'; g.fillRect(80, 300 + s * 14, 140, 14); }
  g.fillStyle = '#3c3b6e'; g.fillRect(80, 300, 60, 56);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const rocket = new THREE.Group();
const white = new THREE.MeshStandardMaterial({ map: markings(), roughness: 0.45, metalness: 0.05 });
const plainWhite = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.45 });
const dark = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6 });
const engineMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.4, metalness: 0.8 });
const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 44, 40), white);
stage1.position.y = 3 + 22;
const inter = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 5, 40), dark);
inter.position.y = 3 + 44 + 2.5;
const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 12, 40), plainWhite);
stage2.position.y = 3 + 49 + 6;
const fairingPts: THREE.Vector2[] = [];
for (let i = 0; i <= 20; i++) { const u = i / 20; fairingPts.push(new THREE.Vector2(2.6 * Math.sqrt(1 - u * u * 0.98) * (u < 0.55 ? 1 : 1 - (u - 0.55) * 1.6), u * 13)); }
const fairing = new THREE.Mesh(new THREE.LatheGeometry(fairingPts, 40), plainWhite);
fairing.position.y = 3 + 61;
const boattail = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.0, 3, 40), dark);
boattail.position.y = 1.5;
rocket.add(stage1, inter, stage2, fairing, boattail);
for (let i = 0; i < 9; i++) {
  const a = (i / 8) * Math.PI * 2, r = i === 8 ? 0 : 1.25;
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.4, 16, 1, true), engineMat);
  nz.position.set(Math.cos(a) * r, -0.6, Math.sin(a) * r);
  rocket.add(nz);
}
// plume: an unlit white-hot core and an orange outer flame (not tone mapped, so it stays blinding)
const plume = new THREE.Mesh(new THREE.ConeGeometry(4.2, 46, 32, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xff9030, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false }));
plume.position.y = -23;
plume.rotation.x = Math.PI;
const core = new THREE.Mesh(new THREE.ConeGeometry(2.0, 14, 24), new THREE.MeshBasicMaterial({ color: 0xfffbe8, toneMapped: false }));
core.position.y = -7.5;
core.rotation.x = Math.PI;
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,220,150,0.8)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
glow.scale.set(14, 14, 1);
glow.position.y = -3;
rocket.add(plume, core, glow);
scene.add(rocket);

/* ---- steam and smoke: many soft sprites rolling out of the flame trench, then rising -------------- */
function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  for (let k = 0; k < 14; k++) {          // a lumpy cloud from overlapping soft blobs
    const x = 64 + (hash(k, 1) - 0.5) * 50, y = 64 + (hash(k, 2) - 0.5) * 50, r = 22 + hash(k, 3) * 20;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}
const puff = puffTex();
const N_PUFF = 480;
const puffs: { s: THREE.Sprite; born: number; dir: THREE.Vector3; speed: number; spin: number }[] = [];
for (let i = 0; i < N_PUFF; i++) {
  const side = i % 2 ? 1 : -1;
  const dir = new THREE.Vector3(side, 0, (hash(i, 7) - 0.5) * 0.9).normalize();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: 0xf3f1ec, transparent: true, depthWrite: false, opacity: 0 }));
  scene.add(s);
  puffs.push({ s, born: (i / N_PUFF) * 30, dir, speed: 16 + hash(i, 9) * 14, spin: hash(i, 11) * 6 });
}

/* contrail */
const MAXTRAIL = 4000;
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MAXTRAIL * 3), 3));
const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff, fog: false }));
trailLine.frustumCulled = false;
scene.add(trailLine);

/* ---- physics -------------------------------------------------------------------------------------- */
const G0 = 9.81, R = 6371000, M0 = 550000, MDRY = 220000, BURN = 200, THRUST = 1.3 * M0 * G0;
let t = 0, x = 0, y = 0, vx = 0, vy = 0, acc = 0;
const trail: { x: number; y: number; z: number }[] = [];
const trailT: number[] = [];
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
  reset() { t = 0; x = 0; y = 0; vx = 0; vy = 0; acc = 0; trail.length = 0; trailT.length = 0; },
  step(dt: number) {
    const n = Math.max(1, Math.ceil(dt / 0.02));
    for (let i = 0; i < n; i++) sub(dt / n);
    trail.push({ x, y: y + 3 + MOUNT, z: 0 });
    trailT.push(t);
  },
  state() { return { t, alt: y, vel: Math.hypot(vx, vy), acc, pitch: pitchAt(t) }; },
};
(window as any).__rocket = hook;

function updateView() {
  rocket.position.set(x, y + 3 + MOUNT, 0);
  rocket.rotation.z = -pitchAt(t);
  const burning = t < BURN;
  const flicker = 0.9 + 0.1 * Math.sin(t * 61) * Math.sin(t * 37);
  const thin = 1 + Math.min(y / 15000, 3);        // the plume widens as the air thins
  plume.visible = core.visible = glow.visible = burning;
  plume.scale.set(thin * flicker, (1 + Math.min(y / 25000, 2)) * flicker, thin * flicker);
  (plume.material as THREE.MeshBasicMaterial).opacity = 0.92 - 0.6 * THREE.MathUtils.smoothstep(y, 20000, 80000);
  plumeLight.position.set(x, y + MOUNT - 8, 0);
  plumeLight.intensity = burning ? 9000 * flicker / (1 + y / 300) : 0;

  skyMat.uniforms.uAlt.value = y;
  starMat.opacity = THREE.MathUtils.smoothstep(y, 70000, 100000);
  (scene.fog as THREE.FogExp2).density = 0.00011 * (1 - THREE.MathUtils.smoothstep(y, 3000, 40000));

  for (const p of puffs) {
    const age = t - p.born;
    if (age < 0 || t > 60) { p.s.visible = false; continue; }
    p.s.visible = true;
    const out = p.speed * 6 * (1 - Math.exp(-age / 5));            // rolls out of the trench, slowing down
    const rise = Math.max(0, age - 3) * (1.2 + (p.speed - 16) * 0.08);
    p.s.position.set(p.dir.x * (40 + out), 3 + 4 + rise + p.spin, p.dir.z * (10 + out));
    const size = 18 + age * 4 + p.spin * 2;
    p.s.scale.set(size, size, 1);
    p.s.material.opacity = Math.min(1, age * 1.5) * Math.max(0, 1 - age / 45) * 0.9;
    p.s.material.rotation = p.spin + age * 0.05;
  }

  const pos = trailGeo.attributes.position as THREE.BufferAttribute;
  const n = Math.min(trail.length, MAXTRAIL);
  const start = trail.length - n;
  for (let i = 0; i < n; i++) {
    const drift = (t - trailT[start + i]) * 3;                   // wind drifts the contrail slowly
    pos.setXYZ(i, trail[start + i].x + drift, trail[start + i].y, trail[start + i].z + drift * 0.4);
  }
  pos.needsUpdate = true;
  trailGeo.setDrawRange(0, n);

  // camera: a low camera near the pad looking up, then a long lens tracking the rocket, then a chase view
  const ry = y + 3 + MOUNT + 35;
  if (y < 3000) {
    const u = THREE.MathUtils.smoothstep(y, 60, 600);
    camera.position.set(THREE.MathUtils.lerp(-70, -900, u), THREE.MathUtils.lerp(4, 25, u), THREE.MathUtils.lerp(220, 2400, u));
    camera.fov = THREE.MathUtils.lerp(48, 12, u);
  } else {
    const u = THREE.MathUtils.smoothstep(y, 3000, 9000);
    camera.position.set(THREE.MathUtils.lerp(-900, x - 140, u), THREE.MathUtils.lerp(25, y - 60, u), THREE.MathUtils.lerp(2400, 260, u));
    camera.fov = THREE.MathUtils.lerp(12, 40, u);
  }
  camera.updateProjectionMatrix();
  camera.lookAt(x, ry, 0);
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
