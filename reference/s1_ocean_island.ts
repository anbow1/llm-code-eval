import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd4e6, 80, 320);
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

// sky + sun
const sky = new Sky();
sky.scale.setScalar(1000);
scene.add(sky);
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(60), THREE.MathUtils.degToRad(70));
const su = sky.material.uniforms;
su['turbidity'].value = 6; su['rayleigh'].value = 1.5; su['mieCoefficient'].value = 0.005; su['mieDirectionalG'].value = 0.8;
su['sunPosition'].value.copy(sunDir);
const sun = new THREE.DirectionalLight(0xfff1dd, 2.5);
sun.position.copy(sunDir).multiplyScalar(80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 200;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbcd7ff, 0x6a7a5a, 1.2));

// waves: same function in GLSL and TS
const WAVES: [number, number, number, number, number][] = [
  // dirX, dirZ, amplitude, wavelength, speed
  [1, 0.3, 0.45, 22, 1.6], [-0.4, 1, 0.3, 14, 1.3], [0.7, -0.7, 0.18, 8, 1.1], [0.2, 0.9, 0.1, 5, 0.9],
];
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const [dx, dz, a, l, s] of WAVES) {
    const len = Math.hypot(dx, dz), k = (2 * Math.PI) / l;
    h += a * Math.sin(k * ((dx / len) * x + (dz / len) * z) - s * k * t * 0.5);
  }
  return h;
}
const clock = new THREE.Clock();
let waveTime = 0;
const glslWaves = WAVES.map(([dx, dz, a, l, s]) => {
  const len = Math.hypot(dx, dz), k = (2 * Math.PI) / l;
  return `{ float ph = ${k.toFixed(6)} * (${(dx / len).toFixed(6)} * p.x + ${(dz / len).toFixed(6)} * p.z) - ${(s * k * 0.5).toFixed(6)} * uTime;
    h += ${a.toFixed(6)} * sin(ph);
    gx += ${(a * k * dx / len).toFixed(6)} * cos(ph); gz += ${(a * k * dz / len).toFixed(6)} * cos(ph); }`;
}).join('\n');
const waterMat = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uSun: { value: sunDir.clone() }, uCam: { value: camera.position.clone() },
  }]),
  fog: true,
  vertexShader: `
    uniform float uTime; varying vec3 vN; varying vec3 vW; varying float vH;
    #include <fog_pars_vertex>
    void main() {
      vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
      float h = 0.0, gx = 0.0, gz = 0.0;
      ${glslWaves}
      p.y += h; vH = h;
      vN = normalize(vec3(-gx, 1.0, -gz)); vW = p;
      vec4 mvPosition = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: `
    uniform vec3 uSun; uniform vec3 uCam; varying vec3 vN; varying vec3 vW; varying float vH;
    #include <fog_pars_fragment>
    void main() {
      vec3 n = normalize(vN); vec3 v = normalize(uCam - vW);
      float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
      vec3 deep = vec3(0.01, 0.12, 0.2), shallow = vec3(0.05, 0.45, 0.5), skyc = vec3(0.55, 0.72, 0.9);
      float d = length(vW.xz);
      vec3 col = mix(shallow, deep, smoothstep(18.0, 40.0, d));
      col = mix(col, skyc, fres);
      vec3 hlf = normalize(normalize(uSun) + v);
      col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, hlf), 0.0), 180.0) * 3.0;
      col += vec3(0.9) * smoothstep(0.55, 0.8, vH) * 0.4;
      col += vec3(0.9) * (1.0 - smoothstep(17.0, 20.0, d)) * 0.35;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});
const waterGeo = new THREE.PlaneGeometry(400, 400, 200, 200);
waterGeo.rotateX(-Math.PI / 2);
const water = new THREE.Mesh(waterGeo, waterMat);
scene.add(water);
(window as any).__ocean = { heightAt, time: () => waveTime };

// island
const islGeo = new THREE.CircleGeometry(22, 96, 0, Math.PI * 2);
const big = new THREE.PlaneGeometry(48, 48, 120, 120);
big.rotateX(-Math.PI / 2);
const pos = big.attributes.position as THREE.BufferAttribute;
const cols: number[] = [];
const sand = new THREE.Color(0xd8c38f), grass = new THREE.Color(0x3f7a35), rock = new THREE.Color(0x6b6256);
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i);
  const r = Math.hypot(x, z) / 20;
  let y = 9 * Math.exp(-r * r * 2.2) - 2.5 + 0.6 * Math.sin(x * 0.5) * Math.cos(z * 0.4);
  pos.setY(i, y);
  const c = y < 0.8 ? sand : y < 6 ? grass : rock;
  cols.push(c.r, c.g, c.b);
}
islGeo.dispose();
big.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
big.computeVertexNormals();
const island = new THREE.Mesh(big, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
island.receiveShadow = true;
scene.add(island);
(window as any).__island = island;

// palms
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5b3a, roughness: 1 });
const leafGeo = new THREE.PlaneGeometry(0.9, 4, 1, 4);
leafGeo.translate(0, 2, 0);
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8a2f, side: THREE.DoubleSide, roughness: 0.8 });
const palms: { top: THREE.Vector3; phase: number }[] = [];
const spots: [number, number][] = [[4, 3], [-6, 2], [2, -7], [-3, -4], [8, -2], [-8, -6]];
for (const [x, z] of spots) {
  const r = Math.hypot(x, z) / 20;
  const ground = 9 * Math.exp(-r * r * 2.2) - 2.5;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, ground, z), new THREE.Vector3(x + 0.6, ground + 3, z + 0.3), new THREE.Vector3(x + 1.4, ground + 6, z + 0.6),
  ]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.22, 8), trunkMat);
  trunk.castShadow = true;
  scene.add(trunk);
  palms.push({ top: new THREE.Vector3(x + 1.4, ground + 6, z + 0.6), phase: Math.random() * 6 });
}
const LEAVES_PER = 8;
const leaves = new THREE.InstancedMesh(leafGeo, leafMat, palms.length * LEAVES_PER);
leaves.castShadow = true;
scene.add(leaves);
(window as any).__leaves = leaves;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
function updateLeaves(t: number) {
  let i = 0;
  for (const p of palms) for (let k = 0; k < LEAVES_PER; k++) {
    const sway = 0.12 * Math.sin(t * 1.7 + p.phase + k);
    e.set(-1.1 + sway, (k / LEAVES_PER) * Math.PI * 2, 0, 'YXZ');
    q.setFromEuler(e);
    m4.compose(p.top, q, one);
    leaves.setMatrixAt(i++, m4);
  }
  leaves.instanceMatrix.needsUpdate = true;
}

// boat
const boat = new THREE.Group();
const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.7 });
const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 0.7, 1.5), wood);
hull.position.y = 0.2;
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.0), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
cabin.position.set(-0.6, 0.9, 0);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4), wood);
mast.position.set(0.6, 2.4, 0);
const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3), new THREE.MeshStandardMaterial({ color: 0xfaf6ea, side: THREE.DoubleSide }));
sail.position.set(1.4, 2.6, 0);
for (const m of [hull, cabin, mast, sail]) { m.castShadow = true; boat.add(m); }
scene.add(boat);
(window as any).__boat = boat;
(window as any).__sun = sun;
const bx = 12, bz = 14;
function updateBoat(t: number) {
  const h = heightAt(bx, bz, t);
  boat.position.set(bx, h, bz);
  const f = heightAt(bx + 2, bz, t), b = heightAt(bx - 2, bz, t), l = heightAt(bx, bz + 0.8, t), r = heightAt(bx, bz - 0.8, t);
  boat.rotation.set(Math.atan2(l - r, 1.6), 0.4, Math.atan2(f - b, 4), 'YXZ');
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
let first = true;
renderer.setAnimationLoop(() => {
  waveTime = clock.getElapsedTime();
  waterMat.uniforms['uTime'].value = waveTime;
  updateBoat(waveTime);
  updateLeaves(waveTime);
  renderer.render(scene, camera);
  if (first) { first = false; (window as any).__ready = true; }
});
