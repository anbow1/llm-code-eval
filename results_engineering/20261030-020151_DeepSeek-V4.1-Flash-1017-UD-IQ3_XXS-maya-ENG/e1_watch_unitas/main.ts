/* =========================================================================
   ETA / Unitas 6497-1  —  functional mechanical movement model
   1 unit = 1 mm, movement lies in the x/z plane, all axes vertical (y).
   ========================================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ *
 *  RENDERER / SCENE / CAMERA
 * ------------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#05070a';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);

const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 400);
camera.position.set(0, 44, 50);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, -1.5);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 12;
controls.maxDistance = 190;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

/* ------------------------------------------------------------------ *
 *  PROCEDURAL ENVIRONMENT (studio soft-boxes, no external assets)
 * ------------------------------------------------------------------ */
function makeEnvTexture(): THREE.CanvasTexture {
    const w = 1024, h = 512;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (!g) throw new Error('canvas 2d unavailable');

    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0.0, '#1a2633');
    base.addColorStop(0.42, '#0a0e14');
    base.addColorStop(0.52, '#07090c');
    base.addColorStop(1.0, '#14181f');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);

    const spot = (x: number, y: number, rx: number, ry: number, col: string, a: number) => {
        g.save();
        g.translate(x, y);
        g.scale(rx, ry);
        const grd = g.createRadialGradient(0, 0, 0, 0, 0, 1);
        grd.addColorStop(0, col);
        grd.addColorStop(0.55, col);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = a;
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, 1, 0, TAU, false);
        g.fill();
        g.restore();
    };

    spot(190, 120, 250, 110, 'rgba(255,246,228,1)', 0.95);
    spot(700, 90, 190, 80, 'rgba(214,232,255,1)', 0.65);
    spot(880, 300, 130, 170, 'rgba(255,236,205,1)', 0.45);
    spot(400, 420, 320, 110, 'rgba(120,140,170,1)', 0.30);
    spot(60, 330, 120, 90, 'rgba(255,220,180,1)', 0.28);

    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

const pmrem = new THREE.PMREMGenerator(renderer);
const envRT = pmrem.fromEquirectangular(makeEnvTexture());
scene.environment = envRT.texture;
pmrem.dispose();

/* ------------------------------------------------------------------ *
 *  LIGHTS
 * ------------------------------------------------------------------ */
const key = new THREE.DirectionalLight(0xfff3e0, 3.1);
key.position.set(-26, 46, 30);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -32;
key.shadow.camera.right = 32;
key.shadow.camera.top = 32;
key.shadow.camera.bottom = -32;
key.shadow.camera.near = 1;
key.shadow.camera.far = 160;
key.shadow.bias = -0.0009;
key.shadow.radius = 3;
scene.add(key);

const fill = new THREE.DirectionalLight(0xbfd4ff, 1.0);
fill.position.set(34, 18, 22);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffe9c9, 1.7);
rim.position.set(6, 20, -44);
scene.add(rim);

const hemi = new THREE.HemisphereLight(0x9fb4d0, 0x1a1408, 0.28);
scene.add(hemi);

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x0a0d11, roughness: 0.55, metalness: 0.35 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3.2;
floor.receiveShadow = true;
scene.add(floor);

/* ------------------------------------------------------------------ *
 *  PROCEDURAL TEXTURES
 * ------------------------------------------------------------------ */
function makeGenevaTexture(): THREE.CanvasTexture {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    if (!g) throw new Error('canvas 2d unavailable');
    const img = g.createImageData(size, size);
    const d = img.data;
    const stripes = 13;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const s = v * stripes + 0.55 * Math.sin(u * 3.1) + 0.12 * Math.sin(u * 7.7);
            const f = s - Math.floor(s);
            let sh = 0.5 + 0.5 * Math.cos(f * TAU);
            sh = Math.pow(sh, 2.4);
            const b = 0.24 + 1.10 * sh;
            const i = (y * size + x) * 4;
            d[i] = Math.min(255, 238 * b);
            d[i + 1] = Math.min(255, 200 * b);
            d[i + 2] = Math.min(255, 122 * b);
            d[i + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

function makePerlageTexture(): THREE.CanvasTexture {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    if (!g) throw new Error('canvas 2d unavailable');
    const img = g.createImageData(size, size);
    const d = img.data;
    const cell = size / 9;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const gx = Math.floor(x / cell);
            const gy = Math.floor(y / cell);
            let best = 1e9;
            for (let j = -1; j <= 1; j++) {
                for (let i = -1; i <= 1; i++) {
                    const ox = (gy + j) & 1 ? cell * 0.5 : 0;
                    const cx = (gx + i + 0.5) * cell + ox;
                    const cy = (gy + j + 0.5) * cell;
                    const dd = Math.hypot(x - cx, y - cy);
                    if (dd < best) best = dd;
                }
            }
            let sh = 0.5 + 0.5 * Math.cos(best * 0.62);
            sh = Math.pow(sh, 1.35);
            const b = 0.32 + 0.95 * sh;
            const i4 = (y * size + x) * 4;
            d[i4] = Math.min(255, 226 * b);
            d[i4 + 1] = Math.min(255, 182 * b);
            d[i4 + 2] = Math.min(255, 104 * b);
            d[i4 + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

function makeTextTexture(text: string): THREE.CanvasTexture {
    const w = 1024, h = 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (!g) throw new Error('canvas 2d unavailable');
    g.clearRect(0, 0, w, h);
    let fs = 92;
    g.font = `600 ${fs}px Helvetica, Arial, sans-serif`;
    while (g.measureText(text).width > w * 0.94 && fs > 20) {
        fs -= 4;
        g.font = `600 ${fs}px Helvetica, Arial, sans-serif`;
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,244,214,0.55)';
    g.fillText(text, w / 2 + 2, h / 2 + 3);
    g.fillStyle = 'rgba(46,28,6,0.95)';
    g.fillText(text, w / 2, h / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

const texGeneva = makeGenevaTexture();
const texPerlage = makePerlageTexture();
const texEngraving = makeTextTexture('UNITAS 6497  17 JEWELS  SWISS MADE');

/* ------------------------------------------------------------------ *
 *  MATERIALS
 * ------------------------------------------------------------------ */
const matBridgeTop = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: texGeneva, metalness: 1, roughness: 0.30,
    clearcoat: 0.35, clearcoatRoughness: 0.22, envMapIntensity: 1.25
});
const matBridgeEdge = new THREE.MeshStandardMaterial({ color: 0xffe6b4, metalness: 1, roughness: 0.06 });
const matPlateTop = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: texPerlage, metalness: 1, roughness: 0.40, envMapIntensity: 1.05
});
const matPlateEdge = new THREE.MeshStandardMaterial({ color: 0xd7ab5d, metalness: 1, roughness: 0.13 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xffcf7a, metalness: 1, roughness: 0.18 });
const matGoldSoft = new THREE.MeshStandardMaterial({ color: 0xe8bd6c, metalness: 1, roughness: 0.30 });
const matSteelTop = new THREE.MeshStandardMaterial({ color: 0xe6ebf1, metalness: 1, roughness: 0.13 });
const matSteelEdge = new THREE.MeshStandardMaterial({ color: 0xc3ccd6, metalness: 1, roughness: 0.05 });
const matSteel = new THREE.MeshStandardMaterial({ color: 0xd7dde5, metalness: 1, roughness: 0.20 });
const matSteelRough = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 1, roughness: 0.38 });
const matBlue = new THREE.MeshPhysicalMaterial({
    color: 0x2a4b96, metalness: 1, roughness: 0.10,
    iridescence: 0.85, iridescenceIOR: 1.9, envMapIntensity: 1.5
});
const matHairspring = new THREE.MeshPhysicalMaterial({
    color: 0x25468f, metalness: 1, roughness: 0.16,
    iridescence: 0.7, iridescenceIOR: 1.8, side: THREE.DoubleSide, envMapIntensity: 1.6
});
const matRuby = new THREE.MeshPhysicalMaterial({
    color: 0xc4132c, metalness: 0.0, roughness: 0.04, transmission: 0.72,
    thickness: 0.75, ior: 1.76, transparent: true, clearcoat: 1.0,
    clearcoatRoughness: 0.02, attenuationColor: new THREE.Color(0x7a0010),
    attenuationDistance: 1.5, envMapIntensity: 2.2
});
const matDark = new THREE.MeshStandardMaterial({ color: 0x121519, metalness: 0.7, roughness: 0.45 });
const matMainspring = new THREE.MeshPhysicalMaterial({
    color: 0x35558f, metalness: 1, roughness: 0.18, iridescence: 0.4,
    side: THREE.DoubleSide, envMapIntensity: 1.4
});
const matDial = new THREE.MeshStandardMaterial({ color: 0xf2e4c4, metalness: 0.1, roughness: 0.6 });

/* ------------------------------------------------------------------ *
 *  GEOMETRY HELPERS
 * ------------------------------------------------------------------ */
type GearKind = 'wheel' | 'pinion' | 'escape';

function makeGearShape(teeth: number, mod: number, kind: GearKind): THREE.Shape {
    const rp = mod * teeth / 2;
    const step = TAU / teeth;
    let ra: number, rd: number;
    let profile: [number, number][];

    if (kind === 'pinion') {
        ra = rp * 1.24; rd = rp * 0.72;
        profile = [[0.00, rd], [0.13, rd], [0.26, ra], [0.43, ra], [0.54, rp * 0.98], [0.62, rd], [0.81, rd]];
    } else if (kind === 'escape') {
        ra = rp + mod * 1.15; rd = rp - mod * 0.85;
        profile = [[0.00, rd], [0.42, rd], [0.58, ra], [0.77, ra], [0.84, ra * 0.87], [0.89, rd], [0.95, rd]];
    } else {
        ra = rp + mod * 1.15; rd = rp - mod * 1.15;
        profile = [[0.00, rd], [0.09, rd], [0.18, rp], [0.25, ra], [0.36, ra],
        [0.43, rp], [0.50, rd], [0.63, rd], [0.77, rd], [0.90, rd]];
    }

    const shape = new THREE.Shape();
    let first = true;
    for (let i = 0; i < teeth; i++) {
        const a0 = i * step;
        for (let p = 0; p < profile.length; p++) {
            const f = profile[p][0];
            const r = profile[p][1];
            const a = a0 + f * step;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (first) { shape.moveTo(x, y); first = false; }
            else shape.lineTo(x, y);
        }
    }
    shape.closePath();
    return shape;
}

function addSpokeHoles(shape: THREE.Shape, teeth: number, mod: number, spokes: number): void {
    const rp = mod * teeth / 2;
    const rOut = rp - mod * 3.0;
    const rIn = rp * 0.20;
    if (rOut <= rIn + 0.2) return;
    const gap = 0.34 * (TAU / spokes);
    for (let i = 0; i < spokes; i++) {
        const a0 = (i / spokes) * TAU + gap * 0.5;
        const a1 = ((i + 1) / spokes) * TAU - gap * 0.5;
        const p = new THREE.Path();
        p.absarc(0, 0, rOut, a0, a1, false);
        p.absarc(0, 0, rIn, a1, a0, true);
        p.closePath();
        shape.holes.push(p);
    }
}

function extrudeFlat(shape: THREE.Shape, thickness: number, bevel: number): THREE.ExtrudeGeometry {
    const b = Math.min(bevel, thickness * 0.4);
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.001, thickness - 2 * b),
        bevelEnabled: b > 0,
        bevelThickness: b,
        bevelSize: b,
        bevelSegments: 2,
        curveSegments: 64,
        steps: 1
    });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, thickness / 2 - b, 0);
    return geo;
}

function circleShape(r: number): THREE.Shape {
    const s = new THREE.Shape();
    s.absarc(0, 0, r, 0, TAU, false);
    return s;
}

function ringShape(ro: number, ri: number): THREE.Shape {
    const s = circleShape(ro);
    const h = new THREE.Path();
    h.absarc(0, 0, ri, 0, TAU, true);
    s.holes.push(h);
    return s;
}

function convexHull(points: THREE.Vector2[]): THREE.Vector2[] {
    const p = points.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
    if (p.length < 3) return p;
    const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): number =>
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: THREE.Vector2[] = [];
    for (const q of p) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
        lower.push(q);
    }
    const upper: THREE.Vector2[] = [];
    for (let i = p.length - 1; i >= 0; i--) {
        const q = p[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
        upper.push(q);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function blobShape(points: THREE.Vector2[], radius: number): THREE.Shape {
    const shape = new THREE.Shape();
    if (points.length === 1) {
        shape.absarc(points[0].x, points[0].y, radius, 0, TAU, false);
        return shape;
    }
    const hull = convexHull(points);
    const n = hull.length;
    const normals: THREE.Vector2[] = [];
    for (let i = 0; i < n; i++) {
        const a = hull[i], b = hull[(i + 1) % n];
        const dx = b.x - a.x, dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 1;
        normals.push(new THREE.Vector2(dy / l, -dx / l));
    }
    let started = false;
    for (let i = 0; i < n; i++) {
        const cur = hull[i];
        const nPrev = normals[(i - 1 + n) % n];
        const nCur = normals[i];
        const px = cur.x + nPrev.x * radius;
        const py = cur.y + nPrev.y * radius;
        const a0 = Math.atan2(nPrev.y, nPrev.x);
        const a1raw = Math.atan2(nCur.y, nCur.x);
        let turn = a1raw - a0;
        while (turn < 0) turn += TAU;
        while (turn >= TAU) turn -= TAU;
        if (!started) { shape.moveTo(px, py); started = true; }
        else shape.lineTo(px, py);
        if (turn > 1e-4 && turn < Math.PI * 1.5) {
            shape.absarc(cur.x, cur.y, radius, a0, a0 + turn, false);
        }
    }
    shape.closePath();
    return shape;
}

/* ribbon spiral (mainspring / hairspring) */
function spiralRibbonGeometry(
    turns: number, r0: number, r1: number, halfW: number, halfH: number, segs: number
): THREE.BufferGeometry {
    const pos = new Float32Array((segs + 1) * 4 * 3);
    const idx: number[] = [];
    for (let i = 0; i < segs; i++) {
        const a = i * 4, b = (i + 1) * 4;
        const faces = [[0, 1], [1, 2], [2, 3], [3, 0]];
        for (const [f0, f1] of faces) {
            idx.push(a + f0, a + f1, b + f1);
            idx.push(a + f0, b + f1, b + f0);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.userData.segs = segs;
    geo.userData.turns = turns;
    geo.userData.r0 = r0;
    geo.userData.r1 = r1;
    geo.userData.halfW = halfW;
    geo.userData.halfH = halfH;
    writeSpiral(geo, 0);
    geo.computeVertexNormals();
    return geo;
}

function writeSpiral(geo: THREE.BufferGeometry, balanceAngle: number): void {
    const segs = geo.userData.segs as number;
    const turns = geo.userData.turns as number;
    const r0 = geo.userData.r0 as number;
    const r1 = geo.userData.r1 as number;
    const hw = geo.userData.halfW as number;
    const hh = geo.userData.halfH as number;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const b = balanceAngle / (1.2 * Math.PI);
    for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const ang = u * turns * TAU + b * 0.75 * (1 - u) * (1 - u);
        const breathe = 1 + 0.045 * b * Math.sin(u * Math.PI * 6.0);
        const r = (r0 + (r1 - r0) * u) * breathe;
        const cx = Math.cos(ang), sx = Math.sin(ang);
        const o = i * 12;
        // A
        arr[o + 0] = (r - hw) * cx; arr[o + 1] = hh; arr[o + 2] = (r - hw) * sx;
        // B
        arr[o + 3] = (r + hw) * cx; arr[o + 4] = hh; arr[o + 5] = (r + hw) * sx;
        // C
        arr[o + 6] = (r + hw) * cx; arr[o + 7] = -hh; arr[o + 8] = (r + hw) * sx;
        // D
        arr[o + 9] = (r - hw) * cx; arr[o + 10] = -hh; arr[o + 11] = (r - hw) * sx;
    }
    attr.needsUpdate = true;
}

/* ------------------------------------------------------------------ *
 *  MOVEMENT LAYOUT  (module 0.1 mm)
 * ------------------------------------------------------------------ */
const MODULE = 0.1;
const T_BARREL = 72, T_CENTER = 80, T_THIRD = 75, T_FOURTH = 80, T_ESCAPE = 15;
const P_CENTER = 12, P_THIRD = 10, P_FOURTH = 10, P_ESCAPE = 8;

const R_BARREL = MODULE * T_BARREL / 2;
const R_CENTER = MODULE * T_CENTER / 2;
const R_THIRD = MODULE * T_THIRD / 2;
const R_FOURTH = MODULE * T_FOURTH / 2;
const R_ESCAPE = MODULE * T_ESCAPE / 2;
const PR_CENTER = MODULE * P_CENTER / 2;
const PR_THIRD = MODULE * P_THIRD / 2;
const PR_FOURTH = MODULE * P_FOURTH / 2;
const PR_ESCAPE = MODULE * P_ESCAPE / 2;

const polar = (r: number, a: number): THREE.Vector2 => new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);

const P_CEN = new THREE.Vector2(0, 0);
const P_BAR = polar(R_BARREL + PR_CENTER, 160 * DEG);
const P_THI = P_CEN.clone().add(polar(R_CENTER + PR_THIRD, 20 * DEG));
const P_FOU = P_THI.clone().add(polar(R_THIRD + PR_FOURTH, -80 * DEG));
const P_ESC = P_FOU.clone().add(polar(R_FOURTH + PR_ESCAPE, -150 * DEG));
const DIR_PB = new THREE.Vector2(-0.6, -0.8);
const P_PAL = P_ESC.clone().addScaledVector(DIR_PB, 2.35);
const P_BAL = P_PAL.clone().addScaledVector(DIR_PB, 3.0);

/* vertical stack (mm) */
const Y_A = 0.55;      // first wheel level
const Y_B = 1.45;      // second wheel level
const Y_C = 2.75;      // third (center wheel) level
const Y_BRIDGE = 3.35;
const Y_COCK = 3.95;
const Y_HOURW = 3.90;
const Y_MINW = 4.60;
const Y_HAND = 5.25;

/* motion works */
const MW_MODULE = 0.12;
const CANNON_T = 10, MINUTE_T = 30, MINPIN_T = 8, HOUR_T = 32;
const R_CANNON = MW_MODULE * CANNON_T / 2;
const R_MINUTE = MW_MODULE * MINUTE_T / 2;
const R_MINPIN = MW_MODULE * MINPIN_T / 2;
const R_HOUR = MW_MODULE * HOUR_T / 2;
const P_MINW = polar(R_CANNON + R_MINUTE, 100 * DEG);

const FORK_BASE = Math.atan2(-0.8, 0.6);

/* ------------------------------------------------------------------ *
 *  PART REGISTRY
 * ------------------------------------------------------------------ */
const parts: THREE.Object3D[] = [];
const exList: { o: THREE.Object3D; home: THREE.Vector3; dir: THREE.Vector3 }[] = [];

function attach(o: THREE.Object3D, name: string, x: number, y: number, z: number): THREE.Object3D {
    o.name = name;
    o.position.set(x, y, z);
    o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    scene.add(o);
    parts.push(o);
    return o;
}

function meshOf(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[]): THREE.Mesh {
    return new THREE.Mesh(geo, mat);
}

/* ------------------------------------------------------------------ *
 *  MAIN PLATE
 * ------------------------------------------------------------------ */
const plateGeo = extrudeFlat(circleShape(17.6), 1.6, 0.12);
const plate = meshOf(plateGeo, [matPlateTop, matPlateEdge]);
plateGeo.attributes.uv.array.forEach(() => { /* keep uv */ });
attach(plate, 'main_plate', 0, -0.8, 0);

/* engraved text plate on the barrel bridge */
const engrGeo = new THREE.PlaneGeometry(9.2, 2.3);
const engr = meshOf(engrGeo, new THREE.MeshStandardMaterial({
    map: texEngraving, transparent: true, metalness: 0.55, roughness: 0.35,
    color: 0xffffff, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
}));
engr.rotation.x = -Math.PI / 2;
engr.castShadow = false;
engr.receiveShadow = false;

/* ------------------------------------------------------------------ *
 *  BARREL + MAINSPRING
 * ------------------------------------------------------------------ */
const barrelGroup = new THREE.Group();

const barrelDrum = meshOf(
    new THREE.CylinderGeometry(R_BARREL - 0.16, R_BARREL - 0.16, 2.2, 72, 1, true),
    matGoldSoft
);
barrelDrum.position.y = 1.35;
barrelDrum.material = new THREE.MeshStandardMaterial({
    color: 0xe2b96a, metalness: 1, roughness: 0.28, side: THREE.DoubleSide
});
barrelGroup.add(barrelDrum);

const barrelGearShape = makeGearShape(T_BARREL, MODULE, 'wheel');
const barrelHole = new THREE.Path();
barrelHole.absarc(0, 0, R_BARREL - 0.42, 0, TAU, true);
barrelGearShape.holes.push(barrelHole);
const barrelGearGeo = extrudeFlat(barrelGearShape, 0.5, 0.02);
const barrelGear = meshOf(barrelGearGeo, [matSteelTop, matSteelEdge]);
barrelGear.position.y = Y_A;
barrelGroup.add(barrelGear);

const barrelLid = meshOf(extrudeFlat(ringShape(R_BARREL - 0.18, 0.55), 0.22, 0.04), [matGold, matGold]);
barrelLid.position.y = 2.45;
barrelGroup.add(barrelLid);

barrelGroup.userData = { teeth: T_BARREL, pinion: 0, radius: R_BARREL, pinionRadius: 0 };
barrelGear.userData = { teeth: T_BARREL, pinion: 0, radius: R_BARREL, pinionRadius: 0 };
attach(barrelGroup, 'mainspring_barrel', P_BAR.x, 0, P_BAR.y);

const springGeo = spiralRibbonGeometry(9.0, 0.72, R_BARREL - 0.55, 0.055, 0.95, 420);
const mainspring = meshOf(springGeo, matMainspring);
attach(mainspring, 'mainspring', P_BAR.x, 1.35, P_BAR.y);

const arborGeo = new THREE.CylinderGeometry(0.34, 0.34, 4.4, 20);
const arbor = meshOf(arborGeo, matSteel);
attach(arbor, 'arbor', P_BAR.x, 1.9, P_BAR.y);

/* ratchet wheel + crown wheel on the barrel arbor (winding side) */
const ratchetShape = makeGearShape(30, 0.16, 'wheel');
const ratchetGeo = extrudeFlat(ratchetShape, 0.36, 0.03);
const ratchet = meshOf(ratchetGeo, [matSteelTop, matSteelEdge]);
attach(ratchet, 'ratchet_wheel', P_BAR.x, 4.05, P_BAR.y);

const crownWheelShape = makeGearShape(26, 0.16, 'wheel');
const crownWheelGeo = extrudeFlat(crownWheelShape, 0.34, 0.03);
const crownWheel = meshOf(crownWheelGeo, [matSteelTop, matSteelEdge]);
attach(crownWheel, 'crown_wheel', P_BAR.x + 2.35, 4.05, P_BAR.y + 1.6);

/* click + spring */
const clickShape = new THREE.Shape();
clickShape.moveTo(-0.25, -0.55);
clickShape.lineTo(2.05, -0.12);
clickShape.lineTo(2.55, 0.16);
clickShape.lineTo(1.95, 0.52);
clickShape.lineTo(-0.30, 0.42);
clickShape.closePath();
const clickGeo = extrudeFlat(clickShape, 0.34, 0.04);
const click = meshOf(clickGeo, [matSteelTop, matSteelEdge]);
attach(click, 'click', P_BAR.x + 3.1, 4.1, P_BAR.y + 2.9);
click.rotation.y = -0.6;

const clickSpringGeo = new THREE.TorusGeometry(1.05, 0.075, 8, 40, Math.PI * 1.25);
const clickSpring = meshOf(clickSpringGeo, matSteel);
clickSpring.rotation.x = Math.PI / 2;
attach(clickSpring, 'click_spring', P_BAR.x + 4.6, 4.1, P_BAR.y + 1.4);

/* ------------------------------------------------------------------ *
 *  GOING TRAIN
 * ------------------------------------------------------------------ */
function makeTrainWheel(
    name: string, teeth: number, pinion: number, mod: number,
    pos: THREE.Vector2, y: number, thickness: number, spokes: number
): THREE.Mesh {
    const shape = makeGearShape(teeth, mod, 'wheel');
    if (spokes > 0) addSpokeHoles(shape, teeth, mod, spokes);
    const geo = extrudeFlat(shape, thickness, 0.012);
    const m = meshOf(geo, [matSteelTop, matSteelEdge]);
    m.userData = {
        teeth,
        pinion,
        radius: mod * teeth / 2,
        pinionRadius: mod * pinion / 2
    };
    attach(m, name, pos.x, y, pos.y);
    return m;
}

function makePinion(
    name: string, leaves: number, mod: number, pos: THREE.Vector2, y: number
): THREE.Mesh {
    const shape = makeGearShape(leaves, mod, 'pinion');
    const geo = extrudeFlat(shape, 0.95, 0.008);
    const m = meshOf(geo, [matSteelEdge, matSteelEdge]);
    m.userData = { teeth: 0, pinion: leaves, radius: 0, pinionRadius: mod * leaves / 2 };
    attach(m, name, pos.x, y, pos.y);
    return m;
}

const centerWheel = makeTrainWheel('center_wheel', T_CENTER, P_CENTER, MODULE, P_CEN, Y_C, 0.28, 5);
const centerPinion = makePinion('center_pinion', P_CENTER, MODULE, P_CEN, Y_A);

const thirdWheel = makeTrainWheel('third_wheel', T_THIRD, P_THIRD, MODULE, P_THI, Y_A, 0.26, 5);
const thirdPinion = makePinion('third_pinion', P_THIRD, MODULE, P_THI, Y_B);

const fourthWheel = makeTrainWheel('fourth_wheel', T_FOURTH, P_FOURTH, MODULE, P_FOU, Y_B, 0.26, 5);
const fourthPinion = makePinion('fourth_pinion', P_FOURTH, MODULE, P_FOU, Y_A);

const escapeWheelShape = makeGearShape(T_ESCAPE, MODULE, 'escape');
const escapeSpokes = new THREE.Path();
escapeSpokes.absarc(0, 0, R_ESCAPE * 0.55, 0, TAU, true);
escapeWheelShape.holes.push(escapeSpokes);
const escapeWheelGeo = extrudeFlat(escapeWheelShape, 0.22, 0.01);
const escapeWheel = meshOf(escapeWheelGeo, [matSteelTop, matSteelEdge]);
escapeWheel.userData = {
    teeth: T_ESCAPE, pinion: P_ESCAPE,
    radius: MODULE * T_ESCAPE / 2, pinionRadius: MODULE * P_ESCAPE / 2
};
attach(escapeWheel, 'escape_wheel', P_ESC.x, Y_A, P_ESC.y);

const escapePinion = makePinion('escape_pinion', P_ESCAPE, MODULE, P_ESC, Y_B);

/* ------------------------------------------------------------------ *
 *  PALLET FORK
 * ------------------------------------------------------------------ */
const forkGroup = new THREE.Group();

const forkOutline: [number, number][] = [
    [1.55, 0.60], [0.85, 0.42], [0.30, 0.50], [-0.10, 0.52],
    [-0.55, 0.26], [-1.85, 0.30], [-2.35, 0.20], [-2.55, 0.00],
    [-2.35, -0.20], [-1.85, -0.30], [-0.55, -0.26], [-0.10, -0.52],
    [0.30, -0.50], [0.85, -0.42], [1.55, -0.60],
    [1.40, -0.34], [1.00, -0.10], [0.80, 0.00], [1.00, 0.10], [1.40, 0.34]
];
const forkShape = new THREE.Shape();
forkShape.moveTo(forkOutline[0][0], forkOutline[0][1]);
for (let i = 1; i < forkOutline.length; i++) forkShape.lineTo(forkOutline[i][0], forkOutline[i][1]);
forkShape.closePath();
const forkBody = meshOf(extrudeFlat(forkShape, 0.24, 0.03), [matSteelTop, matSteelEdge]);
forkGroup.add(forkBody);

const forkBoss = meshOf(extrudeFlat(circleShape(0.46), 0.42, 0.04), [matSteelTop, matSteelEdge]);
forkGroup.add(forkBoss);

const stoneGeo = new THREE.BoxGeometry(0.30, 0.26, 0.20);
const stone1 = meshOf(stoneGeo, matRuby);
stone1.position.set(1.46, 0, 0.42);
forkGroup.add(stone1);
const stone2 = meshOf(stoneGeo, matRuby);
stone2.position.set(1.46, 0, -0.42);
forkGroup.add(stone2);

const guardPin = meshOf(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 8), matSteel);
guardPin.position.set(-1.95, 0, 0);
forkGroup.add(guardPin);

attach(forkGroup, 'pallet_fork', P_PAL.x, Y_A, P_PAL.y);
forkGroup.rotation.y = FORK_BASE;

/* ------------------------------------------------------------------ *
 *  BALANCE
 * ------------------------------------------------------------------ */
const balanceGroup = new THREE.Group();

const rimGeo = new THREE.TorusGeometry(4.05, 0.24, 14, 96);
const balanceRim = meshOf(rimGeo, matGold);
balanceRim.rotation.x = Math.PI / 2;
balanceRim.position.y = 2.30;
balanceGroup.add(balanceRim);

const armGeo = new THREE.BoxGeometry(3.95, 0.20, 0.42);
for (let i = 0; i < 3; i++) {
    const arm = meshOf(armGeo, matGold);
    arm.position.set(Math.cos(i * TAU / 3) * 2.0, 2.30, Math.sin(i * TAU / 3) * 2.0);
    arm.rotation.y = -i * TAU / 3;
    balanceGroup.add(arm);
}

const bHubGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.34, 20);
const bHub = meshOf(bHubGeo, matGold);
bHub.position.y = 2.30;
balanceGroup.add(bHub);

const bScrewGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.30, 10);
for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * TAU / 8;
    const s = meshOf(bScrewGeo, matGold);
    s.position.set(Math.cos(a) * 4.05, 2.30, Math.sin(a) * 4.05);
    balanceGroup.add(s);
}

attach(balanceGroup, 'balance_wheel', P_BAL.x, 0, P_BAL.y);

const staffGeo = new THREE.CylinderGeometry(0.20, 0.20, 4.6, 16);
const staff = meshOf(staffGeo, matSteel);
attach(staff, 'balance_staff', P_BAL.x, 2.0, P_BAL.y);

const rollerGroup = new THREE.Group();
const rollerDisc = meshOf(extrudeFlat(circleShape(0.62), 0.14, 0.02), [matSteelTop, matSteelEdge]);
rollerGroup.add(rollerDisc);
const impulsePin = meshOf(new THREE.CylinderGeometry(0.10, 0.10, 0.55, 10), matRuby);
impulsePin.position.set(0.36, 0, 0);
rollerGroup.add(impulsePin);
attach(rollerGroup, 'roller_table', P_BAL.x, Y_A, P_BAL.y);

/* hairspring */
const hairspringGeo = spiralRibbonGeometry(11.5, 0.42, 2.32, 0.035, 0.085, 300);
const hairspring = meshOf(hairspringGeo, matHairspring);
hairspring.castShadow = false;
attach(hairspring, 'hairspring', P_BAL.x, 3.18, P_BAL.y);

const stud = meshOf(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 10), matSteel);
attach(stud, 'stud', P_BAL.x + 2.30, 3.30, P_BAL.y);

/* ------------------------------------------------------------------ *
 *  BRIDGES & COCK
 * ------------------------------------------------------------------ */
function makeBridge(name: string, pts: THREE.Vector2[], width: number, y: number, thick: number): THREE.Mesh {
    const shape = blobShape(pts, width);
    const geo = extrudeFlat(shape, thick, 0.09);
    const m = meshOf(geo, [matBridgeTop, matBridgeEdge]);
    attach(m, name, 0, y, 0);
    return m;
}

const barrelBridge = makeBridge(
    'barrel_bridge',
    [P_BAR.clone(), P_CEN.clone(), new THREE.Vector2(-13.2, 5.2)],
    2.15, Y_BRIDGE, 0.6
);

const trainBridge = makeBridge(
    'train_bridge',
    [P_THI.clone(), P_FOU.clone(), new THREE.Vector2(12.4, -4.4)],
    1.85, Y_BRIDGE, 0.6
);

const palletBridge = makeBridge(
    'pallet_bridge',
    [P_PAL.clone(), P_ESC.clone(), new THREE.Vector2(7.2, -11.4)],
    0.85, Y_BRIDGE, 0.55
);

const balanceCock = makeBridge(
    'balance_cock',
    [P_BAL.clone(), new THREE.Vector2(-6.1, -15.1)],
    2.45, Y_COCK, 0.55
);

/* engraving on the barrel bridge */
engr.position.set((P_BAR.x + P_CEN.x) / 2 - 1.2, Y_BRIDGE + 0.32, (P_BAR.y + P_CEN.y) / 2 + 1.0);
engr.name = 'engraving';
scene.add(engr);
parts.push(engr);

/* ------------------------------------------------------------------ *
 *  JEWELS  (17) + CHATONS
 * ------------------------------------------------------------------ */
const jewelSpots: [number, number, number][] = [
    [P_CEN.x, 0.06, P_CEN.y],
    [P_THI.x, 0.06, P_THI.y],
    [P_FOU.x, 0.06, P_FOU.y],
    [P_ESC.x, 0.06, P_ESC.y],
    [P_PAL.x, 0.06, P_PAL.y],
    [P_BAL.x, 0.06, P_BAL.y],
    [P_BAR.x, 0.06, P_BAR.y],
    [P_CEN.x, Y_BRIDGE + 0.31, P_CEN.y],
    [P_THI.x, Y_BRIDGE + 0.31, P_THI.y],
    [P_FOU.x, Y_BRIDGE + 0.31, P_FOU.y],
    [P_ESC.x, Y_BRIDGE + 0.29, P_ESC.y],
    [P_PAL.x, Y_BRIDGE + 0.29, P_PAL.y],
    [P_BAL.x, Y_COCK + 0.29, P_BAL.y],
    [P_BAR.x, Y_BRIDGE + 0.31, P_BAR.y],
    [P_MINW.x, Y_MINW + 0.18, P_MINW.y],
    [P_BAL.x + 0.0, Y_COCK + 0.44, P_BAL.y],
    [P_PAL.x + 0.0, Y_BRIDGE + 0.44, P_PAL.y]
];

const jewelGeo = extrudeFlat(ringShape(0.50, 0.16), 0.13, 0.02);
const chatonGeo = new THREE.TorusGeometry(0.62, 0.11, 8, 26);

for (let i = 0; i < 17; i++) {
    const [jx, jy, jz] = jewelSpots[i];
    const j = meshOf(jewelGeo, matRuby);
    j.castShadow = false;
    attach(j, `jewel_${i + 1}`, jx, jy, jz);

    const ch = meshOf(chatonGeo, matGold);
    ch.rotation.x = Math.PI / 2;
    attach(ch, `chaton_${i + 1}`, jx, jy - 0.02, jz);
}

/* ------------------------------------------------------------------ *
 *  MOTION WORKS + HANDS
 * ------------------------------------------------------------------ */
const cannonPinion = meshOf(
    extrudeFlat(makeGearShape(CANNON_T, MW_MODULE, 'pinion'), 0.55, 0.01),
    [matSteelEdge, matSteelEdge]
);
attach(cannonPinion, 'cannon_pinion', 0, Y_MINW, 0);

const cannonTube = meshOf(new THREE.CylinderGeometry(0.24, 0.24, 1.6, 14), matSteel);
attach(cannonTube, 'cannon_tube', 0, Y_MINW + 0.55, 0);

const minuteWheelGroup = new THREE.Group();
const mwShape = makeGearShape(MINUTE_T, MW_MODULE, 'wheel');
addSpokeHoles(mwShape, MINUTE_T, MW_MODULE, 4);
const mwWheel = meshOf(extrudeFlat(mwShape, 0.24, 0.012), [matSteelTop, matSteelEdge]);
minuteWheelGroup.add(mwWheel);
const mwPinion = meshOf(extrudeFlat(makeGearShape(MINPIN_T, MW_MODULE, 'pinion'), 0.6, 0.01),
    [matSteelEdge, matSteelEdge]);
mwPinion.position.y = Y_HOURW - Y_MINW;
minuteWheelGroup.add(mwPinion);
attach(minuteWheelGroup, 'minute_wheel', P_MINW.x, Y_MINW, P_MINW.y);

const hourWheelShape = makeGearShape(HOUR_T, MW_MODULE, 'wheel');
addSpokeHoles(hourWheelShape, HOUR_T, MW_MODULE, 4);
const hourWheel = meshOf(extrudeFlat(hourWheelShape, 0.26, 0.012), [matSteelTop, matSteelEdge]);
attach(hourWheel, 'hour_wheel', 0, Y_HOURW, 0);

const hourTube = meshOf(new THREE.CylinderGeometry(0.36, 0.36, 1.9, 14), matSteel);
attach(hourTube, 'hour_wheel_tube', 0, Y_HOURW + 0.9, 0);

/* hands ---------------------------------------------------------- */
function makeHandShape(length: number, width: number, tail: number): THREE.Shape {
    const s = new THREE.Shape();
    s.moveTo(tail, -width * 0.55);
    s.lineTo(tail, width * 0.55);
    s.lineTo(length * 0.55, width * 0.42);
    s.lineTo(length * 0.9, width * 0.22);
    s.lineTo(length, 0);
    s.lineTo(length * 0.9, -width * 0.22);
    s.lineTo(length * 0.55, -width * 0.42);
    s.closePath();
    return s;
}

const hourHand = meshOf(extrudeFlat(makeHandShape(9.0, 1.05, -1.4), 0.16, 0.02), matBlue);
attach(hourHand, 'hour_hand', 0, Y_HAND - 0.22, 0);

const minuteHand = meshOf(extrudeFlat(makeHandShape(13.6, 0.85, -1.8), 0.16, 0.02), matBlue);
attach(minuteHand, 'minute_hand', 0, Y_HAND, 0);

const secArbor = meshOf(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 10), matSteel);
attach(secArbor, 'second_arbor', P_FOU.x, Y_HAND - 0.6, P_FOU.y);

const secondHand = meshOf(extrudeFlat(makeHandShape(3.2, 0.30, -0.7), 0.11, 0.015), matBlue);
attach(secondHand, 'second_hand', P_FOU.x, Y_HAND - 0.05, P_FOU.y);

/* ------------------------------------------------------------------ *
 *  WINDING / SETTING
 * ------------------------------------------------------------------ */
const crownGeo = new THREE.CylinderGeometry(1.75, 1.75, 2.2, 40, 1);
const crown = meshOf(crownGeo, matGold);
crown.rotation.z = Math.PI / 2;
attach(crown, 'crown', 23.4, 1.9, 0);

/* knurling ring on the crown */
const knurlGeo = new THREE.TorusGeometry(1.72, 0.14, 6, 44);
const knurl = meshOf(knurlGeo, matGoldSoft);
knurl.rotation.y = Math.PI / 2;
attach(knurl, 'crown_knurl', 23.4, 1.9, 0);

const stem = meshOf(new THREE.CylinderGeometry(0.42, 0.42, 11.0, 16), matSteel);
stem.rotation.z = Math.PI / 2;
attach(stem, 'stem', 18.2, 1.6, 0);

const settingLeverShape = new THREE.Shape();
settingLeverShape.moveTo(-1.4, -0.28);
settingLeverShape.lineTo(1.5, -0.55);
settingLeverShape.lineTo(2.2, -0.15);
settingLeverShape.lineTo(1.4, 0.34);
settingLeverShape.lineTo(-1.4, 0.28);
settingLeverShape.closePath();
const settingLever = meshOf(extrudeFlat(settingLeverShape, 0.3, 0.03), [matSteelTop, matSteelEdge]);
attach(settingLever, 'setting_lever', 13.6, 2.35, -1.6);
settingLever.rotation.y = -0.35;

const setSpring = meshOf(new THREE.TorusGeometry(0.9, 0.06, 6, 30, Math.PI * 1.3), matSteel);
setSpring.rotation.x = Math.PI / 2;
attach(setSpring, 'setting_lever_spring', 15.6, 2.35, -3.3);

/* ------------------------------------------------------------------ *
 *  SCREWS (blued, slotted)
 * ------------------------------------------------------------------ */
function addScrew(name: string, x: number, y: number, z: number, r: number, rot: number): void {
    const head = meshOf(new THREE.CylinderGeometry(r, r * 0.92, 0.34, 26), matBlue);
    attach(head, name, x, y, z);
    head.rotation.y = rot;
    const slot = meshOf(new THREE.BoxGeometry(r * 1.9, 0.06, r * 0.30), matDark);
    attach(slot, name + '_slot', x, y + 0.18, z);
    slot.rotation.y = rot;
    slot.castShadow = false;
}

addScrew('screw_1', -13.2, Y_BRIDGE + 0.32, 5.2, 0.72, 0.3);
addScrew('screw_2', 12.4, Y_BRIDGE + 0.32, -4.4, 0.72, 1.1);
addScrew('screw_3', 7.2, Y_BRIDGE + 0.29, -11.4, 0.62, 2.0);
addScrew('screw_4', -6.1, Y_COCK + 0.30, -15.1, 0.72, 0.8);
addScrew('screw_5', P_BAR.x + 1.2, Y_BRIDGE + 0.32, P_BAR.y - 0.4, 0.55, 1.7);
addScrew('screw_6', P_THI.x - 0.6, Y_BRIDGE + 0.32, P_THI.y + 0.3, 0.50, 0.15);
addScrew('screw_7', -2.6, 0.06, 6.2, 0.62, 2.4);
addScrew('screw_8', 4.0, 0.06, 7.4, 0.62, 1.25);

/* ------------------------------------------------------------------ *
 *  EXPLODE SETUP
 * ------------------------------------------------------------------ */
function initExplode(): void {
    exList.length = 0;
    parts.forEach((o, i) => {
        const home = o.position.clone();
        const d = new THREE.Vector3(home.x, 0, home.z);
        const len = d.length();
        if (len < 0.6) {
            const a = i * 2.39996323;
            d.set(Math.cos(a), 0, Math.sin(a));
        } else {
            d.multiplyScalar(1 / len);
        }
        d.y = 0.55 + (i % 5) * 0.14;
        d.normalize();
        exList.push({ o, home, dir: d });
    });
}
initExplode();

let explodeAmount = 0;
let explodeTarget = 0;

function applyExplode(f: number): void {
    for (const e of exList) {
        const dist = 7.5 + Math.hypot(e.home.x, e.home.z) * 0.75;
        e.o.position.copy(e.home).addScaledVector(e.dir, f * dist);
    }
}
applyExplode(0);

/* ------------------------------------------------------------------ *
 *  SIMULATION
 * ------------------------------------------------------------------ */
interface WatchState {
    t: number;
    balance: number;
    pallet: number;
    escape: number;
    fourth: number;
    third: number;
    center: number;
    barrel: number;
    second: number;
    minute: number;
    hour: number;
}

let simTime = 0;

function computeState(): WatchState {
    const t = simTime;
    const k = Math.floor(5 * t);
    const tau = k / 5;

    const balance = 1.2 * Math.PI * Math.sin(TAU * 2.5 * t);
    const pallet = 0.2 * ((k % 2 === 0) ? 1 : -1);
    const escape = -k * TAU / 30;
    const fourth = TAU * tau / 60;
    const third = -fourth * P_FOURTH / T_THIRD;
    const center = TAU * tau / 3600;
    const barrel = -center * P_CENTER / T_BARREL;

    return {
        t,
        balance,
        pallet,
        escape,
        fourth,
        third,
        center,
        barrel,
        second: fourth,
        minute: center,
        hour: center / 12
    };
}

function applyState(s: WatchState): void {
    centerWheel.rotation.y = s.center;
    centerPinion.rotation.y = s.center;
    thirdWheel.rotation.y = s.third;
    thirdPinion.rotation.y = s.third;
    fourthWheel.rotation.y = s.fourth;
    fourthPinion.rotation.y = s.fourth;
    escapeWheel.rotation.y = s.escape;
    escapePinion.rotation.y = s.escape;

    barrelGroup.rotation.y = s.barrel;
    mainspring.rotation.y = s.barrel;
    ratchet.rotation.y = s.barrel * 0.25;

    forkGroup.rotation.y = FORK_BASE + s.pallet;
    balanceGroup.rotation.y = s.balance;
    rollerGroup.rotation.y = s.balance;

    cannonPinion.rotation.y = s.minute;
    minuteWheelGroup.rotation.y = -s.minute * (CANNON_T / MINUTE_T);
    hourWheel.rotation.y = s.hour;

    minuteHand.rotation.y = s.minute;
    hourHand.rotation.y = s.hour;
    secondHand.rotation.y = s.second;

    writeSpiral(hairspringGeo, s.balance);
}

applyState(computeState());

/* ------------------------------------------------------------------ *
 *  PUBLIC API
 * ------------------------------------------------------------------ */
interface WatchAPI {
    parts: THREE.Object3D[];
    paused: boolean;
    readonly t: number;
    reset(): void;
    step(dt: number): void;
    state(): WatchState;
    explode(f: number): void;
}

const watch: WatchAPI = {
    parts,
    paused: false,
    get t(): number { return simTime; },
    reset(): void {
        simTime = 0;
        applyState(computeState());
    },
    step(dt: number): void {
        if (!isFinite(dt)) return;
        simTime += dt;
        applyState(computeState());
    },
    state(): WatchState {
        return computeState();
    },
    explode(f: number): void {
        const v = Math.max(0, Math.min(1, f));
        explodeAmount = v;
        explodeTarget = v;
        applyExplode(v);
    }
};

(window as any).__watch = watch;
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

/* ------------------------------------------------------------------ *
 *  UI: button + labels
 * ------------------------------------------------------------------ */
const btn = document.createElement('button');
btn.textContent = 'EXPLODE (E)';
btn.style.cssText =
    'position:fixed;left:18px;bottom:18px;z-index:20;padding:10px 16px;border-radius:6px;' +
    'border:1px solid rgba(230,200,140,0.5);background:rgba(20,18,12,0.82);color:#f0dcae;' +
    'font:600 12px Helvetica,Arial,sans-serif;letter-spacing:1.4px;cursor:pointer;';
btn.addEventListener('click', () => {
    explodeTarget = explodeTarget > 0.5 ? 0 : 1;
});
document.body.appendChild(btn);

const btnPause = document.createElement('button');
btnPause.textContent = 'PAUSE (SPACE)';
btnPause.style.cssText = btn.style.cssText.replace('left:18px', 'left:150px');
btnPause.addEventListener('click', () => {
    watch.paused = !watch.paused;
    btnPause.textContent = watch.paused ? 'RESUME (SPACE)' : 'PAUSE (SPACE)';
});
document.body.appendChild(btnPause);

window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'KeyE') {
        explodeTarget = explodeTarget > 0.5 ? 0 : 1;
    } else if (e.code === 'Space') {
        e.preventDefault();
        watch.paused = !watch.paused;
        btnPause.textContent = watch.paused ? 'RESUME (SPACE)' : 'PAUSE (SPACE)';
    }
});

const labelDefs: { text: string; obj: THREE.Object3D }[] = [
    { text: 'barrel + mainspring', obj: barrelGroup },
    { text: 'center wheel (1/h)', obj: centerWheel },
    { text: 'third wheel', obj: thirdWheel },
    { text: 'fourth wheel (1/min)', obj: fourthWheel },
    { text: 'escape wheel 15t', obj: escapeWheel },
    { text: 'pallet fork', obj: forkGroup },
    { text: 'balance 2.5 Hz', obj: balanceGroup },
    { text: 'ratchet + click', obj: ratchet },
    { text: 'crown', obj: crown },
    { text: 'motion works', obj: minuteWheelGroup }
];

const labelEls: HTMLDivElement[] = labelDefs.map((d) => {
    const el = document.createElement('div');
    el.textContent = d.text;
    el.style.cssText =
        'position:fixed;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;' +
        'font:500 10px Helvetica,Arial,sans-serif;letter-spacing:0.8px;color:#e8d9b4;' +
        'text-shadow:0 0 6px #000,0 0 2px #000;white-space:nowrap;padding:1px 4px;' +
        'border-left:1px solid rgba(232,217,180,0.55);z-index:10;';
    document.body.appendChild(el);
    return el;
});

const tmpV = new THREE.Vector3();
function updateLabels(): void {
    for (let i = 0; i < labelDefs.length; i++) {
        labelDefs[i].obj.getWorldPosition(tmpV);
        tmpV.project(camera);
        const x = (tmpV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-tmpV.y * 0.5 + 0.5) * window.innerHeight;
        const el = labelEls[i];
        if (tmpV.z > 1 || x < -200 || x > window.innerWidth + 200 || y < -200 || y > window.innerHeight + 200) {
            el.style.display = 'none';
        } else {
            el.style.display = 'block';
            el.style.transform = `translate(${x}px, ${y}px) translate(-50%,-140%)`;
        }
    }
}

/* ------------------------------------------------------------------ *
 *  RESIZE + RENDER LOOP
 * ------------------------------------------------------------------ */
window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

let ready = false;
let lastTime = performance.now();

renderer.setAnimationLoop(() => {
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    /* explode view animation (independent of the movement clock) */
    if (Math.abs(explodeAmount - explodeTarget) > 1e-4) {
        const stepAmt = Math.min(1, delta / 0.9);
        explodeAmount += Math.sign(explodeTarget - explodeAmount) * stepAmt;
        if ((explodeTarget - explodeAmount) * Math.sign(explodeTarget - explodeAmount) < 0) {
            explodeAmount = explodeTarget;
        }
        applyExplode(explodeAmount);
    }

    if (!watch.paused) {
        watch.step(Math.min(delta, 1 / 30));
    }

    controls.update();
    renderer.render(scene, camera);
    updateLabels();

    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
