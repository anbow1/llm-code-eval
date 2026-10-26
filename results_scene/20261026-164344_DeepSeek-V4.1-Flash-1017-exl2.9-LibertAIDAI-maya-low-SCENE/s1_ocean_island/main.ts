import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Renderer / Scene / Camera                                          */
/* ------------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 8000);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);

/* ------------------------------------------------------------------ */
/*  Colour palette & atmosphere                                        */
/* ------------------------------------------------------------------ */

const horizonColor = new THREE.Color(0xbcd8ef);
const topColor = new THREE.Color(0x2f6bb5);
const sunColor = new THREE.Color(0xfff0d2);

scene.fog = new THREE.Fog(horizonColor, 80, 300);

/* Sun direction (also used by the sky dome) */
const sunDirection = new THREE.Vector3();
{
  const elevation = 28;
  const azimuth = 208;
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  sunDirection.setFromSphericalCoords(1, phi, theta).normalize();
}

/* ------------------------------------------------------------------ */
/*  Sky dome                                                           */
/* ------------------------------------------------------------------ */

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDirection.clone() },
    uTopColor: { value: topColor },
    uHorizonColor: { value: horizonColor },
    uSunColor: { value: sunColor }
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vDir;
    uniform vec3 uSunDir;
    uniform vec3 uTopColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uSunColor;

    void main() {
      vec3 d = normalize( vDir );
      float y = clamp( d.y, 0.0, 1.0 );
      vec3 col = mix( uHorizonColor, uTopColor, pow( y, 0.55 ) );
      col = mix( col, uHorizonColor * 0.92, smoothstep( 0.0, -0.25, d.y ) );

      vec3 s = normalize( uSunDir );
      float sd = max( dot( d, s ), 0.0 );
      col += uSunColor * pow( sd, 2400.0 ) * 9.0;
      col += uSunColor * pow( sd, 90.0 ) * 0.55;
      col += uSunColor * pow( sd, 8.0 ) * 0.16;

      gl_FragColor = vec4( col, 1.0 );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMaterial);
sky.renderOrder = -1000;
sky.frustumCulled = false;
scene.add(sky);

/* ------------------------------------------------------------------ */
/*  Lights                                                             */
/* ------------------------------------------------------------------ */

const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
sun.position.copy(sunDirection).multiplyScalar(140);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 340;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.04;
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xc6e0f5, 0x35502e, 1.15);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x8fb4d0, 0.25);
scene.add(ambient);

/* ------------------------------------------------------------------ */
/*  Waves (shared between GLSL and JS)                                 */
/* ------------------------------------------------------------------ */

interface WaveDef {
  angle: number;
  wavelength: number;
  amplitude: number;
  speed: number;
  phase: number;
}

const WAVES: WaveDef[] = [
  { angle: 0.15, wavelength: 54, amplitude: 0.42, speed: 1.0, phase: 0.0 },
  { angle: 0.95, wavelength: 32, amplitude: 0.25, speed: 1.0, phase: 1.9 },
  { angle: -0.65, wavelength: 19, amplitude: 0.14, speed: 1.0, phase: 4.2 },
  { angle: 2.2, wavelength: 12, amplitude: 0.065, speed: 1.0, phase: 2.7 }
];

interface WaveData {
  amp: number;
  k: number;
  omega: number;
  dx: number;
  dz: number;
  phase: number;
}

const waveData: WaveData[] = WAVES.map((w) => {
  const k = (2 * Math.PI) / w.wavelength;
  const omega = w.speed * Math.sqrt(9.8 * k);
  return {
    amp: w.amplitude,
    k,
    omega,
    dx: Math.cos(w.angle),
    dz: Math.sin(w.angle),
    phase: w.phase
  };
});

function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (let i = 0; i < waveData.length; i++) {
    const w = waveData[i];
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
  }
  return h;
}

const num = (n: number): string => n.toFixed(8);

const waveGLSL = /* glsl */ `
  float waveHeight( vec2 p, float t ) {
    float h = 0.0;
    ${waveData
      .map(
        (w) =>
          `h += ${num(w.amp)} * sin( ${num(w.k)} * ( ${num(w.dx)} * p.x + ${num(w.dz)} * p.y ) - ${num(
            w.omega
          )} * t + ${num(w.phase)} );`
      )
      .join('\n    ')}
    return h;
  }

  vec2 waveSlope( vec2 p, float t ) {
    vec2 s = vec2( 0.0 );
    ${waveData
      .map(
        (w) =>
          `s += ${num(w.amp * w.k)} * vec2( ${num(w.dx)}, ${num(w.dz)} ) * cos( ${num(w.k)} * ( ${num(
            w.dx
          )} * p.x + ${num(w.dz)} * p.y ) - ${num(w.omega)} * t + ${num(w.phase)} );`
      )
      .join('\n    ')}
    return s;
  }
`;

/* ------------------------------------------------------------------ */
/*  Ocean                                                              */
/* ------------------------------------------------------------------ */

const OCEAN_SIZE = 700;
const OCEAN_SEGMENTS = 256;

const oceanGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGMENTS, OCEAN_SEGMENTS);
oceanGeometry.rotateX(-Math.PI / 2);

const oceanMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSunDir: { value: sunDirection.clone() },
    uSunColor: { value: sunColor },
    uSkyColor: { value: topColor },
    uHorizonColor: { value: horizonColor },
    uDeepColor: { value: new THREE.Color(0x0b3f57) },
    uShallowColor: { value: new THREE.Color(0x2bb0b4) },
    uFoamColor: { value: new THREE.Color(0xdfeef5) },
    uFogColor: { value: horizonColor },
    uFogNear: { value: 80 },
    uFogFar: { value: 300 },
    uCameraPos: { value: new THREE.Vector3() },
    uIslandRadius: { value: 21 }
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorldPos;

    ${waveGLSL}

    void main() {
      vec3 pos = position;
      pos.y += waveHeight( pos.xz, uTime );
      vec4 wp = modelMatrix * vec4( pos, 1.0 );
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uSkyColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFoamColor;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform vec3 uCameraPos;
    uniform float uIslandRadius;

    varying vec3 vWorldPos;

    ${waveGLSL}

    float hash21( vec2 p ) {
      p = fract( p * vec2( 123.34, 456.21 ) );
      p += dot( p, p + 45.32 );
      return fract( p.x * p.y );
    }

    float vnoise( vec2 p ) {
      vec2 i = floor( p );
      vec2 f = fract( p );
      f = f * f * ( 3.0 - 2.0 * f );
      float a = hash21( i );
      float b = hash21( i + vec2( 1.0, 0.0 ) );
      float c = hash21( i + vec2( 0.0, 1.0 ) );
      float d = hash21( i + vec2( 1.0, 1.0 ) );
      return mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y );
    }

    void main() {
      vec2 p = vWorldPos.xz;
      float t = uTime;

      float h = waveHeight( p, t );
      vec2 slope = waveSlope( p, t );

      vec3 N = normalize( vec3( -slope.x, 1.0, -slope.y ) );
      vec3 V = normalize( uCameraPos - vWorldPos );
      vec3 L = normalize( uSunDir );
      vec3 H = normalize( L + V );

      float NdV = max( dot( N, V ), 0.0 );
      float fresnel = 0.028 + 0.972 * pow( 1.0 - NdV, 5.0 );

      float distIsland = length( p );
      float shallow = 1.0 - smoothstep( 12.0, 42.0, distIsland );

      vec3 bodyColor = mix( uDeepColor, uShallowColor, shallow * 0.85 );
      float diffuse = max( dot( N, L ), 0.0 );
      vec3 body = bodyColor * ( 0.30 + 0.85 * diffuse );

      /* sky reflection */
      vec3 R = reflect( -V, N );
      float upness = clamp( R.y * 1.4 + 0.08, 0.0, 1.0 );
      vec3 skyReflection = mix( uHorizonColor, uSkyColor, upness );

      /* specular sparkle */
      float specDot = max( dot( N, H ), 0.0 );
      float specular = pow( specDot, 380.0 ) * 4.2 + pow( specDot, 28.0 ) * 0.35;

      vec3 color = mix( body, skyReflection, fresnel ) + uSunColor * specular;

      /* crest foam */
      float crest = smoothstep( 0.42, 0.82, h );
      float n1 = vnoise( p * 0.85 + vec2( t * 0.22, -t * 0.17 ) );
      float n2 = vnoise( p * 2.1 - vec2( t * 0.31, t * 0.12 ) );
      float foam = smoothstep( 0.55, 0.95, crest * ( 0.55 + 0.75 * n1 ) + 0.12 * n2 );

      /* shore foam around the island */
      float shoreBand = 1.0 - smoothstep( uIslandRadius - 1.5, uIslandRadius + 8.0, distIsland );
      float shoreFoam = shoreBand * smoothstep( 0.35, 0.85, n2 * 0.8 + 0.35 * sin( t * 1.3 + distIsland * 2.0 ) );

      float foamMask = clamp( foam + shoreFoam * 0.75, 0.0, 1.0 );
      color = mix( color, uFoamColor, foamMask );

      /* fog towards the horizon */
      float dist = length( uCameraPos - vWorldPos );
      float fogFactor = smoothstep( uFogNear, uFogFar, dist );
      color = mix( color, uFogColor, fogFactor );

      gl_FragColor = vec4( color, 1.0 );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
});

const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.frustumCulled = false;
scene.add(ocean);

/* ------------------------------------------------------------------ */
/*  Island                                                             */
/* ------------------------------------------------------------------ */

const ISLAND_RADIUS = 21;
const ISLAND_RIM = ISLAND_RADIUS * 1.35;

function islandHeight(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z);
  let h: number;
  if (r <= ISLAND_RADIUS) {
    const t = r / ISLAND_RADIUS;
    h = 8.6 * Math.pow(1 - t, 1.6);
  } else {
    const t = (r - ISLAND_RADIUS) / (ISLAND_RADIUS * 0.35);
    h = -5.0 * Math.min(1, t) - 0.5 * t;
  }
  const n =
    Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.19 - 0.7) * 1.7 +
    Math.sin(x * 0.53 - 0.4) * Math.sin(z * 0.47 + 2.1) * 0.75 +
    Math.sin(x * 1.05 + z * 0.92) * 0.28;
  const fade = Math.min(1, Math.max(0, (ISLAND_RADIUS * 1.05 - r) / 8));
  h += n * fade * 0.75;
  return h;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const cWetSand = new THREE.Color(0xa2946c);
const cDrySand = new THREE.Color(0xe8d9a8);
const cGrass = new THREE.Color(0x4f8036);
const cRock = new THREE.Color(0x7d7365);
const tmpColor = new THREE.Color();

function islandColor(x: number, y: number, z: number): THREE.Color {
  const t1 = smoothstep(-2.2, 0.5, y);
  const t2 = smoothstep(1.0, 2.8, y);
  const t3 = smoothstep(5.5, 8.8, y);

  tmpColor.copy(cWetSand).lerp(cDrySand, t1);
  tmpColor.lerp(cGrass, t2);
  tmpColor.lerp(cRock, t3);

  const variation = 0.9 + 0.2 * (0.5 + 0.5 * Math.sin(x * 1.71 + z * 2.36));
  tmpColor.multiplyScalar(variation);
  return tmpColor.clone();
}

function buildIsland(): THREE.Mesh {
  const rings = 72;
  const segs = 144;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const cy = islandHeight(0, 0);
  const cc = islandColor(0, cy, 0);
  positions.push(0, cy, 0);
  colors.push(cc.r, cc.g, cc.b);

  for (let i = 1; i <= rings; i++) {
    const r = (i / rings) * ISLAND_RIM;
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = islandHeight(x, z);
      positions.push(x, y, z);
      const c = islandColor(x, y, z);
      colors.push(c.r, c.g, c.b);
    }
  }

  const vIndex = (ring: number, j: number): number => 1 + (ring - 1) * segs + (j % segs);

  /* centre fan */
  for (let j = 0; j < segs; j++) {
    indices.push(0, vIndex(1, j + 1), vIndex(1, j));
  }

  /* ring quads */
  for (let i = 1; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = vIndex(i, j);
      const b = vIndex(i, j + 1);
      const c = vIndex(i + 1, j + 1);
      const d = vIndex(i + 1, j);
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const island = buildIsland();
const islandGroup = new THREE.Group();
islandGroup.add(island);
scene.add(islandGroup);

/* ------------------------------------------------------------------ */
/*  Palm trees                                                         */
/* ------------------------------------------------------------------ */

let seed = 1337;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

interface LeafData {
  pos: THREE.Vector3;
  yaw: number;
  droop: number;
  scale: number;
  phase: number;
}

const leafData: LeafData[] = [];
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 });
const palmCount = 8;

for (let i = 0; i < palmCount; i++) {
  const angle = (i / palmCount) * Math.PI * 2 + 0.55 + rand() * 0.25;
  const radius = 6.5 + rand() * 7.0;
  const bx = Math.cos(angle) * radius;
  const bz = Math.sin(angle) * radius;
  const by = islandHeight(bx, bz);

  const height = 5.6 + rand() * 2.2;
  const bendAngle = rand() * Math.PI * 2;
  const bendAmount = 1.1 + rand() * 0.9;

  const points: THREE.Vector3[] = [];
  for (let j = 0; j <= 10; j++) {
    const t = j / 10;
    const bend = bendAmount * t * t;
    points.push(
      new THREE.Vector3(
        bx + Math.cos(bendAngle) * bend,
        by + height * t,
        bz + Math.sin(bendAngle) * bend
      )
    );
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const trunkGeo = new THREE.TubeGeometry(curve, 20, 0.2, 6, false);
  const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  islandGroup.add(trunk);

  const top = points[points.length - 1];

  const leafCount = 9;
  for (let k = 0; k < leafCount; k++) {
    leafData.push({
      pos: top.clone(),
      yaw: (k / leafCount) * Math.PI * 2 + rand() * 0.35,
      droop: 0.35 + rand() * 0.6,
      scale: 0.85 + rand() * 0.35,
      phase: rand() * Math.PI * 2
    });
  }
}

function makeLeafGeometry(): THREE.BufferGeometry {
  const segs = 9;
  const length = 2.7;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const y = t * length;
    const w = 0.46 * Math.sin(Math.PI * Math.pow(t, 0.65));
    const curl = -0.65 * t * t;
    const edgeDrop = w * 0.35;
    positions.push(-w, y, curl - edgeDrop);
    positions.push(0, y, curl);
    positions.push(w, y, curl - edgeDrop);
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    indices.push(a, b, a + 1);
    indices.push(a + 1, b, b + 1);
    indices.push(a + 1, a + 2);
    indices.push(a + 1, b + 2, a + 2);
    indices.push(a + 2, b + 1, b + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const leafGeometry = makeLeafGeometry();
const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0x3f8b34,
  roughness: 0.8,
  side: THREE.DoubleSide
});

const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, leafData.length);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
leaves.castShadow = true;
leaves.receiveShadow = false;
leaves.frustumCulled = false;
islandGroup.add(leaves);

const leafDummy = new THREE.Object3D();
leafDummy.rotation.order = 'YXZ';

function updateLeaves(elapsed: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const L = leafData[i];
    const sway =
      Math.sin(elapsed * 1.6 + L.phase) * 0.17 +
      Math.sin(elapsed * 2.7 + L.phase * 1.9) * 0.06;

    leafDummy.position.copy(L.pos);
    leafDummy.rotation.set(0, 0, 0);
    leafDummy.rotation.y = L.yaw + sway * 0.45;
    leafDummy.rotation.x = L.droop + sway;
    leafDummy.rotation.z = sway * 0.35;
    leafDummy.scale.setScalar(L.scale);
    leafDummy.updateMatrix();
    leaves.setMatrixAt(i, leafDummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
updateLeaves(0);

/* ------------------------------------------------------------------ */
/*  Boat                                                               */
/* ------------------------------------------------------------------ */

const boat = new THREE.Group();
boat.position.set(12, 0, 14);
scene.add(boat);

const hullMaterial = new THREE.MeshStandardMaterial({
  color: 0x9e3d2e,
  roughness: 0.45,
  metalness: 0.12
});
const deckMaterial = new THREE.MeshStandardMaterial({ color: 0xb98d58, roughness: 0.75 });
const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xece7db, roughness: 0.6 });
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x7d5a38, roughness: 0.85 });
const sailMaterial = new THREE.MeshStandardMaterial({
  color: 0xf7f2e4,
  roughness: 0.85,
  side: THREE.DoubleSide
});

{
  const hullGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  hullGeo.scale(0.85, 0.62, 2.0);
  const hull = new THREE.Mesh(hullGeo, hullMaterial);
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const deckGeo = new THREE.CircleGeometry(1, 48);
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.scale(0.8, 1, 1.9);
  const deck = new THREE.Mesh(deckGeo, deckMaterial);
  deck.position.y = 0.015;
  deck.receiveShadow = true;
  deck.castShadow = true;
  boat.add(deck);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.85), cabinMaterial);
  cabin.position.set(0, 0.28, -0.45);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  boat.add(cabin);

  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.95), woodMaterial);
  cabinRoof.position.set(0, 0.56, -0.45);
  cabinRoof.castShadow = true;
  boat.add(cabinRoof);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 3.3, 8), woodMaterial);
  mast.position.set(0, 1.65, 0.35);
  mast.castShadow = true;
  boat.add(mast);

  const boomGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6);
  boomGeo.rotateX(Math.PI / 2);
  const boom = new THREE.Mesh(boomGeo, woodMaterial);
  boom.position.set(0, 1.0, -0.35);
  boom.castShadow = true;
  boat.add(boom);

  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0.98);
  sailShape.lineTo(0, 3.15);
  sailShape.quadraticCurveTo(1.05, 2.3, 1.35, 1.05);
  sailShape.lineTo(0, 0.98);

  const sailGeo = new THREE.ShapeGeometry(sailShape, 16);
  sailGeo.rotateY(Math.PI / 2);
  const sail = new THREE.Mesh(sailGeo, sailMaterial);
  sail.position.set(0, 0, 0.35);
  sail.castShadow = true;
  boat.add(sail);
}

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let waveTime = 0;
let ready = false;

function animate(): void {
  const elapsed = clock.getElapsedTime();
  waveTime = elapsed;

  /* sky follows the camera */
  sky.position.copy(camera.position);

  /* ocean */
  oceanMaterial.uniforms.uTime.value = waveTime;
  (oceanMaterial.uniforms.uCameraPos.value as THREE.Vector3).copy(camera.position);

  /* leaves sway */
  updateLeaves(elapsed);

  /* boat drift */
  const bx = 12 + Math.sin(elapsed * 0.15) * 1.3;
  const bz = 14 + Math.cos(elapsed * 0.11) * 1.0;

  boat.position.x = bx;
  boat.position.z = bz;
  boat.position.y = heightAt(bx, bz, waveTime) + 0.26;

  const hBow = heightAt(bx, bz + 2.0, waveTime);
  const hStern = heightAt(bx, bz - 2.0, waveTime);
  const hStarboard = heightAt(bx + 0.9, bz, waveTime);
  const hPort = heightAt(bx - 0.9, bz, waveTime);

  boat.rotation.x = -Math.atan2(hBow - hStern, 4.0);
  boat.rotation.z = Math.atan2(hStarboard - hPort, 1.8);

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

/* ------------------------------------------------------------------ */
/*  Resize                                                             */
/* ------------------------------------------------------------------ */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------------------------------------------ */
/*  Test hooks                                                         */
/* ------------------------------------------------------------------ */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__island = island;
(window as any).__boat = boat;
(window as any).__leaves = leaves;
(window as any).__ocean = {
  heightAt: (x: number, z: number, t: number): number => heightAt(x, z, t),
  time: (): number => waveTime
};
