```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080b);
scene.fog = new THREE.FogExp2(0x07080b, 0.006);

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(1.8, 32, 25);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#07080b';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(1.0, 0.7, 4.4);
controls.minDistance = 12;
controls.maxDistance = 85;
controls.maxPolarAngle = Math.PI * 0.53;
controls.update();

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.05).texture;
scene.environment = envTexture;
pmremGenerator.dispose();

const moduleSize = 0.1;

/* ----------------------------------------------------------------------------
   Procedural textures
---------------------------------------------------------------------------- */
function makePerlageTexture(): THREE.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    ctx.fillStyle = '#8c8068';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 900; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 2 + Math.random() * 7.5;
        ctx.strokeStyle = 'rgba(48, 42, 33, 0.28)';
        ctx.lineWidth = 0.8 + Math.random() * 1.8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 238, 205, 0.055)';
        ctx.beginPath();
        ctx.arc(x + r * 0.25, y - r * 0.25, r * 0.58, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 245, 220, 0.07)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 120; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + Math.random() * 2.2, 0, Math.PI * 2);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.anisotropy = 8;
    return tex;
}

function makeGenevaStripesTexture(): THREE.Texture {
    const w = 1024;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d7d8da');
    grad.addColorStop(0.5, '#b4b8bd');
    grad.addColorStop(1, '#e8e9ea');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 2;
    for (let i = -h; i < w + h; i += 18) {
        ctx.strokeStyle = i % 36 === 0 ? 'rgba(255,255,255,0.42)' : 'rgba(35,38,42,0.18)';
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.8;
    for (let i = -h; i < w + h; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.5, 1.5);
    tex.anisotropy = 8;
    return tex;
}

function makeEngravingTexture(): THREE.Texture {
    const w = 1024;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '42px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#15161a';
    ctx.fillText('UNITAS 6497 17 JEWELS SWISS MADE', w / 2, h / 2);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.24)';
    ctx.fillText('UNITAS 6497 17 JEWELS SWISS MADE', w / 2, h / 2 + 18);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
}

function makeLabelTexture(text: string): THREE.Texture {
    const w = 512;
    const h = 128;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    ctx.fillStyle = 'rgba(5, 6, 8, 0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(220, 216, 205, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6e1d6';
    ctx.fillText(text, w / 2, h / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
}

const perlageTexture = makePerlageTexture();
const genevaTexture = makeGenevaStripesTexture();
const engravingTexture = makeEngravingTexture();

/* ----------------------------------------------------------------------------
   Materials
---------------------------------------------------------------------------- */
const steelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb9bec6,
    metalness: 1.0,
    roughness: 0.18,
    envMap: envTexture,
    clearcoat: 0.55,
    clearcoatRoughness: 0.16
});

const polishedSteelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd8dce2,
    metalness: 1.0,
    roughness: 0.12,
    envMap: envTexture,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08
});

const brassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb88d4c,
    metalness: 0.96,
    roughness: 0.23,
    envMap: envTexture,
    clearcoat: 0.4,
    clearcoatRoughness: 0.22
});

const goldMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd3a94f,
    metalness: 1.0,
    roughness: 0.14,
    envMap: envTexture,
    clearcoat: 0.7,
    clearcoatRoughness: 0.1
});

const blueSteelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1b3b6b,
    metalness: 1.0,
    roughness: 0.28,
    envMap: envTexture,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2
});

const rubyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xa10720,
    metalness: 0.05,
    roughness: 0.06,
    transmission: 0.92,
    ior: 1.55,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    transparent: true,
    opacity: 0.92,
    envMap: envTexture
});

const plateMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x77746c,
    map: perlageTexture,
    metalness: 0.9,
    roughness: 0.36,
    envMap: envTexture,
    clearcoat: 0.22,
    clearcoatRoughness: 0.3
});

const bridgeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc5c9cd,
    map: genevaTexture,
    metalness: 1.0,
    roughness: 0.18,
    envMap: envTexture,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1
});

const engravingMaterial = new THREE.MeshStandardMaterial({
    color: 0x202126,
    map: engravingTexture,
    metalness: 0.55,
    roughness: 0.3,
    transparent: true,
    depthWrite: false,
    envMap: envTexture
});

const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x050607,
    roughness: 0.92,
    metalness: 0.0
});

/* ----------------------------------------------------------------------------
   Geometry helpers
---------------------------------------------------------------------------- */
function makeToothedGearGeometry(
    teeth: number,
    radius: number,
    toothDepth: number,
    innerRadius: number,
    thickness: number,
    bevel: number
): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const step = Math.PI * 2 / teeth;
    const pts: THREE.Vector2[] = [];

    for (let i = 0; i < teeth; i++) {
        const tipAngle = i * step;
        const valleyAngle = tipAngle + step * 0.5;

        pts.push(new THREE.Vector2(Math.cos(tipAngle) * radius, Math.sin(tipAngle) * radius));
        pts.push(new THREE.Vector2(Math.cos(valleyAngle) * (radius - toothDepth), Math.sin(valleyAngle) * (radius - toothDepth)));
    }

    shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
    shape.closePath();

    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        steps: 1,
        curveSegments: 8
    });
    geo.rotateX(-Math.PI / 2);
    return geo;
}

function makePinionGeometry(leaves: number, radius: number, thickness: number): THREE.BufferGeometry {
    return makeToothedGearGeometry(leaves, radius, moduleSize * 0.65, radius * 0.38, thickness, moduleSize * 0.18);
}

function makeBridgeGeometry(width: number, depth: number, height: number, radius: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -depth / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + depth - radius);
    shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
    shape.lineTo(x + radius, y + depth);
    shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 3,
        curveSegments: 8
    });
    geo.rotateX(-Math.PI / 2);
    return geo;
}

/* ----------------------------------------------------------------------------
   Scene helper
---------------------------------------------------------------------------- */
const parts: THREE.Object3D[] = [];

function addPart(obj: THREE.Object3D, name: string): THREE.Object3D {
    obj.name = name;
    obj.castShadow = true;
    obj.receiveShadow = true;
    parts.push(obj);
    scene.add(obj);
    return obj;
}

function addMesh(name: string, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return addPart(mesh, name) as THREE.Mesh;
}

function addChildMesh(parent: THREE.Object3D, name: string, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

/* ----------------------------------------------------------------------------
   Floor and plate
---------------------------------------------------------------------------- */
const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.0;
floor.receiveShadow = true;
scene.add(floor);

const mainPlate = addMesh(
    'main_plate',
    new THREE.BoxGeometry(30, 0.42, 30),
    plateMaterial,
    0, -0.52, 0
);

/* ----------------------------------------------------------------------------
   Bridges
---------------------------------------------------------------------------- */
const bridgeTrain = addMesh(
    'bridge_going_train',
    makeBridgeGeometry(17, 5.2, 0.36, 1.1),
    bridgeMaterial,
    -0.7, 0.02, 2.9
);

const bridgeEscapement = addMesh(
    'bridge_escapement',
    makeBridgeGeometry(8.8, 4.6, 0.34, 1.0),
    bridgeMaterial,
    3.3, 0.02, 7.2
);

const balanceCock = addMesh(
    'balance_cock',
    makeBridgeGeometry(8.8, 5.4, 0.36, 1.0),
    bridgeMaterial,
    -3.2, 0.03, 6.9
);

const bridgeBalancePlate = addMesh(
    'bridge_balance',
    makeBridgeGeometry(9.2, 2.4, 0.22, 0.8),
    bridgeMaterial,
    -3.2, 0.08, 8.9
);

const bridgeEngraving = addMesh(
    'bridge_engraving',
    new THREE.PlaneGeometry(10.2, 3.8),
    engravingMaterial,
    3.3, 0.42, 7.2
);
bridgeEngraving.rotation.x = -Math.PI / 2;

/* ----------------------------------------------------------------------------
   Mainspring barrel + mainspring + arbor
---------------------------------------------------------------------------- */
const barrelRadius = moduleSize * 72 / 2;
const barrelCenterX = -4.2;

const barrel = addMesh(
    'mainspring_barrel',
    makeToothedGearGeometry(72, barrelRadius, 0.18, barrelRadius - 0.36, 0.52, 0.055),
    brassMaterial,
    barrelCenterX, 0.12, 0
);
barrel.userData = { teeth: 72, pinion: 0, radius: barrelRadius, pinionRadius: 0 };

const mainspringCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 180 }, (_, i) => {
        const s = i / 179;
        const r = 0.7 + s * 2.65;
        const a = s * Math.PI * 7.5;
        return new THREE.Vector3(
            barrelCenterX + Math.cos(a) * r,
            0.33,
            Math.sin(a) * r
        );
    })
);
const mainspring = addMesh(
    'mainspring',
    new THREE.TubeGeometry(mainspringCurve, 220, 0.035, 8, false),
    polishedSteelMaterial,
    0, 0, 0
);
mainspring.castShadow = true;

const arbor = addMesh(
    'arbor',
    new THREE.CylinderGeometry(0.14, 0.14, 1.5, 20),
    polishedSteelMaterial,
    0, 0.72, 0
);

/* ----------------------------------------------------------------------------
   Going train wheels and pinions
---------------------------------------------------------------------------- */
const centerData = {
    teeth: 80,
    pinion: 12,
    radius: moduleSize * 80 / 2,
    pinionRadius: moduleSize * 12 / 2
};

const thirdData = {
    teeth: 75,
    pinion: 10,
    radius: moduleSize * 75 / 2,
    pinionRadius: moduleSize * 10 / 2
};

const fourthData = {
    teeth: 80,
    pinion: 10,
    radius: moduleSize * 80 / 2,
    pinionRadius: moduleSize * 10 / 2
};

const escapeData = {
    teeth: 15,
    pinion: 8,
    radius: moduleSize * 15 / 2,
    pinionRadius: moduleSize * 8 / 2
};

const centerPos = new THREE.Vector3(0, 0.34, 0);
const thirdPos = new THREE.Vector3(0, 0.60, 4.5);
const fourthPos = new THREE.Vector3(4.5, 0.88, 4.5);
const escapePos = new THREE.Vector3(4.5, 1.12, 8.9);

const centerWheel = addMesh(
    'center_wheel',
    makeToothedGearGeometry(centerData.teeth, centerData.radius, 0.11, centerData.radius * 0.55, 0.15, 0.035),
    polishedSteelMaterial,
    centerPos.x, centerPos.y, centerPos.z
);
centerWheel.userData = centerData;

const thirdWheel = addMesh(
    'third_wheel',
    makeToothedGearGeometry(thirdData.teeth, thirdData.radius, 0.11, thirdData.radius * 0.55, 0.15, 0.035),
    polishedSteelMaterial,
    thirdPos.x, thirdPos.y, thirdPos.z
);
thirdWheel.userData = thirdData;

const fourthWheel = addMesh(
    'fourth_wheel',
    makeToothedGearGeometry(fourthData.teeth, fourthData.radius, 0.11, fourthData.radius * 0.55, 0.15, 0.035),
    polishedSteelMaterial,
    fourthPos.x, fourthPos.y, fourthPos.z
);
fourthWheel.userData = fourthData;

const escapeWheel = addMesh(
    'escape_wheel',
    makeToothedGearGeometry(escapeData.teeth, escapeData.radius, 0.07, escapeData.radius * 0.42, 0.13, 0.025),
    polishedSteelMaterial,
    escapePos.x, escapePos.y, escapePos.z
);
escapeWheel.userData = escapeData;

const centerPinion = addMesh(
    'center_pinion',
    makePinionGeometry(centerData.pinion, centerData.pinionRadius, 0.12),
    polishedSteelMaterial,
    centerPos.x, 0.12, centerPos.z
);
centerPinion.userData = { teeth: centerData.pinion, pinion: 0, radius: centerData.pinionRadius, pinionRadius: 0 };

const thirdPinion = addMesh(
    'third_pinion',
    makePinionGeometry(thirdData.pinion, thirdData.pinionRadius, 0.12),
    polishedSteelMaterial,
    thirdPos.x, 0.35, thirdPos.z
);
thirdPinion.userData = { teeth: thirdData.pinion, pinion: 0, radius: thirdData.pinionRadius, pinionRadius: 0 };

const fourthPinion = addMesh(
    'fourth_pinion',
    makePinionGeometry(fourthData.pinion, fourthData.pinionRadius, 0.12),
    polishedSteelMaterial,
    fourthPos.x, 0.60, fourthPos.z
);
fourthPinion.userData = { teeth: fourthData.pinion, pinion: 0, radius: fourthData.pinionRadius, pinionRadius: 0 };

const escapePinion = addMesh(
    'escape_pinion',
    makePinionGeometry(escapeData.pinion, escapeData.pinionRadius, 0.12),
    polishedSteelMaterial,
    escapePos.x, 0.88, escapePos.z
);
escapePinion.userData = { teeth: escapeData.pinion, pinion: 0, radius: escapeData.pinionRadius, pinionRadius: 0 };

/* spokes/crossings */
function addSpokes(parent: THREE.Object3D, length: number, prefix: string): void {
    const spokeThickness = 0.055;
    const spokeHeight = 0.06;

    const spokeX = new THREE.Mesh(
        new THREE.BoxGeometry(length, spokeHeight, spokeThickness),
        polishedSteelMaterial
    );
    spokeX.name = prefix + '_spoke_x';
    spokeX.position.y = 0.06;
    spokeX.castShadow = true;
    spokeX.receiveShadow = true;
    parent.add(spokeX);

    const spokeZ = new THREE.Mesh(
        new THREE.BoxGeometry(spokeThickness, spokeHeight, length),
        polishedSteelMaterial
    );
    spokeZ.name = prefix + '_spoke_z';
    spokeZ.position.y = 0.06;
    spokeZ.castShadow = true;
    spokeZ.receiveShadow = true;
    parent.add(spokeZ);
}

addSpokes(centerWheel, centerData.radius * 1.7, 'center');
addSpokes(thirdWheel, thirdData.radius * 1.7, 'third');
addSpokes(fourthWheel, fourthData.radius * 1.7, 'fourth');
addSpokes(escapeWheel, escapeData.radius * 1.6, 'escape');
addSpokes(centerPinion, centerData.pinionRadius * 1.5, 'center_pinion');
addSpokes(thirdPinion, thirdData.pinionRadius * 1.5, 'third_pinion');
addSpokes(fourthPinion, fourthData.pinionRadius * 1.5, 'fourth_pinion');
addSpokes(escapePinion, escapeData.pinionRadius * 1.5, 'escape_pinion');

/* ----------------------------------------------------------------------------
   Escapement: balance wheel, pallet fork, hairspring, stud
---------------------------------------------------------------------------- */
const balancePos = new THREE.Vector3(-3.0, 0.92, 7.0);

const balanceWheel = addMesh(
    'balance_wheel',
    new THREE.TorusGeometry(2.55, 0.13, 16, 64),
    polishedSteelMaterial,
    balancePos.x, balancePos.y, balancePos.z
);
balanceWheel.rotation.x = Math.PI / 2;

const balanceSpokeA = addChildMesh(
    balanceWheel,
    'balance_wheel_spoke_a',
    new THREE.BoxGeometry(5.0, 0.08, 0.09),
    polishedSteelMaterial,
    0, 0, 0
);
balanceSpokeA.rotation.y = 0.0;

const balanceSpokeB = addChildMesh(
    balanceWheel,
    'balance_wheel_spoke_b',
    new THREE.BoxGeometry(0.09, 0.08, 5.0),
    polishedSteelMaterial,
    0, 0, 0
);
balanceSpokeB.rotation.y = 0.0;

for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const screw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12),
        blueSteelMaterial
    );
    screw.name = `balance_rim_screw_${i + 1}`;
    screw.position.set(Math.cos(a) * 2.45, 0.12, Math.sin(a) * 2.45);
    screw.castShadow = true;
    screw.receiveShadow = true;
    balanceWheel.add(screw);

    const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.025, 0.035),
        polishedSteelMaterial
    );
    slot.name = `balance_rim_screw_${i + 1}_slot`;
    slot.position.set(Math.cos(a) * 2.45, 0.195, Math.sin(a) * 2.45);
    slot.castShadow = true;
    balanceWheel.add(slot);
}

const palletFork = addMesh(
    'pallet_fork',
    new THREE.ExtrudeGeometry(
        (() => {
            const shape = new THREE.Shape();
            shape.moveTo(-0.24, -0.85);
            shape.lineTo(0.24, -0.85);
            shape.lineTo(0.24, -0.25);
            shape.lineTo(0.72, 0.5);
            shape.lineTo(0.48, 0.78);
            shape.lineTo(0.18, 0.18);
            shape.lineTo(0.0, -0.28);
            shape.lineTo(-0.18, 0.18);
            shape.lineTo(-0.48, 0.78);
            shape.lineTo(-0.72, 0.5);
            shape.lineTo(-0.24, -0.25);
            shape.closePath();
            return shape;
        })(),
        {
            depth: 0.08,
            bevelEnabled: true,
            bevelThickness: 0.035,
            bevelSize: 0.035,
            bevelSegments: 2
        }
    ),
    polishedSteelMaterial,
    0.55, 0.92, 7.75
);
palletFork.geometry.rotateX(-Math.PI / 2);

const stud = addMesh(
    'stud',
    new THREE.CylinderGeometry(0.16, 0.18, 0.38, 18),
    brassMaterial,
    balancePos.x, 1.22, balancePos.z
);

const hairspringCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 140 }, (_, i) => {
        const s = i / 139;
        const r = 0.55 + s * 2.0;
        const a = s * Math.PI * 6.0;
        return new THREE.Vector3(
            balancePos.x + Math.cos(a) * r,
            1.36,
            balancePos.z + Math.sin(a) * r
        );
    })
);
const hairspring = addMesh(
    'hairspring',
    new THREE.TubeGeometry(hairspringCurve, 180, 0.022, 8, false),
    blueSteelMaterial,
    0, 0, 0
);

/* ----------------------------------------------------------------------------
   Motion works: cannon pinion, minute wheel, hour wheel
---------------------------------------------------------------------------- */
const cannonPinion = addMesh(
    'cannon_pinion',
    new THREE.CylinderGeometry(0.24, 0.26, 0.24, 20),
    brassMaterial,
    0, 1.03, 0
);

const minuteWheel = addMesh(
    'minute_wheel',
    makeToothedGearGeometry(36, 1.15, 0.07, 0.6, 0.12, 0.025),
    polishedSteelMaterial,
    2.1, 0.62, -1.65
);
minuteWheel.userData = { teeth: 36, pinion: 0, radius: 1.15, pinionRadius: 0 };

const hourWheel = addMesh(
    'hour_wheel',
    makeToothedGearGeometry(24, 0.95, 0.06, 0.52, 0.12, 0.025),
    polishedSteelMaterial,
    -1.7, 0.62, -1.25
);
hourWheel.userData = { teeth: 24, pinion: 0, radius: 0.95, pinionRadius: 0 };

/* ----------------------------------------------------------------------------
   Winding mechanism: crown, stem, setting lever, click, ratchet wheel
---------------------------------------------------------------------------- */
const crown = addMesh(
    'crown',
    new THREE.CylinderGeometry(1.25, 1.35, 0.55, 28),
    brassMaterial,
    0, 0.45, -12.2
);

const stem = addMesh(
    'stem',
    new THREE.CylinderGeometry(0.28, 0.32, 1.3, 20),
    polishedSteelMaterial,
    0, 1.15, -12.2
);

const settingLever = addMesh(
    'setting_lever',
    new THREE.BoxGeometry(1.45, 0.22, 0.55),
    polishedSteelMaterial,
    -4.15, 0.38, 1.55
);

const click = addMesh(
    'click',
    new THREE.CylinderGeometry(0.34, 0.34, 0.15, 18),
    blueSteelMaterial,
    -4.15, 0.46, 2.25
);

const ratchetWheel = addMesh(
    'ratchet_wheel',
    makeToothedGearGeometry(30, 1.25, 0.07, 0.62, 0.12, 0.025),
    polishedSteelMaterial,
    -3.25, 0.66, 0.85
);
ratchetWheel.userData = { teeth: 30, pinion: 0, radius: 1.25, pinionRadius: 0 };

/* ----------------------------------------------------------------------------
   Hands
---------------------------------------------------------------------------- */
function makeHandGeometry(length: number, width: number, height: number): THREE.BufferGeometry {
    const geo = new THREE.BoxGeometry(width, height, length);
    geo.translate(0, 0, length / 2);
    return geo;
}

const hourHand = addMesh(
    'hour_hand',
    makeHandGeometry(5.0, 0.16, 0.08),
    polishedSteelMaterial,
    0, 2.0, 0
);

const minuteHand = addMesh(
    'minute_hand',
    makeHandGeometry(6.8, 0.12, 0.08),
    polishedSteelMaterial,
    0, 2.02, 0
);

const secondHand = addMesh(
    'second_hand',
    makeHandGeometry(3.5, 0.07, 0.06),
    blueSteelMaterial,
    fourthPos.x, 2.05, fourthPos.z
);

/* ----------------------------------------------------------------------------
   17 jewels with golden chatons
---------------------------------------------------------------------------- */
const jewelPositions: THREE.Vector3[] = [
    new THREE.Vector3(0.0, 1.1, 0.0),
    new THREE.Vector3(0.0, 1.25, 4.5),
    new THREE.Vector3(4.5, 1.28, 4.5),
    new THREE.Vector3(4.5, 1.34, 8.9),
    new THREE.Vector3(-4.2, 0.66, 0.0),
    new THREE.Vector3(-3.0, 1.28, 7.0),
    new THREE.Vector3(0.55, 1.18, 7.75),
    new THREE.Vector3(-3.45, 1.44, 7.35),
    new THREE.Vector3(0.0, 0.82, -12.2),
    new THREE.Vector3(-4.15, 0.58, 1.55),
    new THREE.Vector3(-3.25, 0.96, 0.85),
    new THREE.Vector3(0.55, 1.16, 0.25),
    new THREE.Vector3(-0.55, 1.16, -0.35),
    new THREE.Vector3(2.1, 0.90, -1.65),
    new THREE.Vector3(-4.15, 0.62, 2.25),
    new THREE.Vector3(-3.2, 1.28, 8.0),
    new THREE.Vector3(0.0, 1.18, -2.0),
    new THREE.Vector3(1.25, 1.05, 5.65)
];

for (let i = 0; i < jewelPositions.length; i++) {
    const p = jewelPositions[i];

    const jewel = addMesh(
        `jewel_${i + 1}`,
        new THREE.IcosahedronGeometry(0.21, 2),
        rubyMaterial,
        p.x, p.y, p.z
    );
    jewel.scale.set(1.0, 0.65, 1.0);

    const chaton = addMesh(
        `chaton_${i + 1}`,
        new THREE.TorusGeometry(0.27, 0.045, 12, 28),
        goldMaterial,
        p.x, p.y - 0.03, p.z
    );
    chaton.rotation.x = Math.PI / 2;
}

/* ----------------------------------------------------------------------------
   Heat-blued screws
---------------------------------------------------------------------------- */
const screwPositions: THREE.Vector3[] = [
    new THREE.Vector3(-7.8, 0.34, -2.0),
    new THREE.Vector3(7.2, 0.34, -2.2),
    new THREE.Vector3(-6.4, 0.34, 7.0),
    new THREE.Vector3(7.1, 0.34, 7.2),
    new THREE.Vector3(1.0, 0.34, -8.8),
    new THREE.Vector3(7.8, 0.34, 1.0)
];

for (let i = 0; i < screwPositions.length; i++) {
    const p = screwPositions[i];

    const screwBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.19, 0.24, 18),
        blueSteelMaterial
    );
    screwBody.name = `screw_${i + 1}`;
    screwBody.position.copy(p);
    screwBody.castShadow = true;
    screwBody.receiveShadow = true;
    parts.push(screwBody);
    scene.add(screwBody);

    const screwSlot = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.035, 0.055),
        polishedSteelMaterial
    );
    screwSlot.name = `screw_${i + 1}_slot`;
    screwSlot.position.copy(p);
    screwSlot.position.y += 0.13;
    screwSlot.castShadow = true;
    screwSlot.receiveShadow = true;
    screwBody.add(screwSlot);
}

/* ----------------------------------------------------------------------------
   Labels
---------------------------------------------------------------------------- */
function addLabel(text: string, x: number, y: number, z: number, width: number): THREE.Sprite {
    const tex = makeLabelTexture(text);
    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(width, width * 0.25, 1);
    sprite.name = `label_${text.replace(/[^a-zA-Z0-9]/g, '_')}`;
    scene.add(sprite);
    return sprite;
}

addLabel('MAIN SPRING', -7.6, 2.0, 0.0, 3.2);
addLabel('CENTER WHEEL', -0.6, 2.9, 0.0, 3.1);
addLabel('THIRD WHEEL', 0.0, 2.9, 4.5, 3.0);
addLabel('FOURTH WHEEL', 4.5, 2.9, 4.5, 3.2);
addLabel('ESCAPE WHEEL', 4.6, 2.9, 8.9, 2.8);
addLabel('BALANCE', -3.2, 2.8, 7.0, 2.8);
addLabel('PALLET FORK', 0.65, 2.8, 7.75, 2.8);
addLabel('HAIRSPRING', -3.4, 2.8, 6.5, 2.5);
addLabel('HOUR / MINUTE', 0.0, 3.3, -1.0, 3.5);

/* ----------------------------------------------------------------------------
   Lighting
---------------------------------------------------------------------------- */
const keyLight = new THREE.DirectionalLight(0xfff1df, 4.2);
keyLight.position.set(7, 16, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 80;
keyLight.shadow.camera.left = -25;
keyLight.shadow.camera.right = 25;
keyLight.shadow.camera.top = 25;
keyLight.shadow.camera.bottom = -25;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.radius = 3.0;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9fc8ff, 1.4);
fillLight.position.set(-12, 8, -7);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffcf9a, 2.2);
rimLight.position.set(0, 7, -14);
scene.add(rimLight);

const ambientLight = new THREE.AmbientLight(0x1a1d22, 0.45);
scene.add(ambientLight);

/* ----------------------------------------------------------------------------
   Simulation / watch interface
---------------------------------------------------------------------------- */
type WatchState = {
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
};

const watch = {
    t: 0,
    paused: false,

    reset(): void {
        watch.t = 0;
        applyStateAngles(0);
        applyStateRotations(watch.state());
    },

    step(dt: number): void {
        watch.t += dt;
    },

    state(): WatchState {
        const t = watch.t;
        const k = Math.floor(5 * t);
        const tau = k / 5;

        const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
        const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
        const escape = -k * (2 * Math.PI / 30);
        const fourth = 2 * Math.PI * tau / 60;
        const third = -fourth * fourthData.pinion / thirdData.teeth;
        const center = 2 * Math.PI * tau / 3600;
        const barrel = -center * centerData.pinion / barrelDataTeeth;
        const second = fourth;
        const minute = center;
        const hour = minute / 12;

        return {
            t,
            balance,
            pallet,
            escape,
            fourth,
            third,
            center,
            barrel,
            second,
            minute,
            hour
        };
    },

    explode(f: number): void {
        const ff = THREE.MathUtils.clamp(f, 0, 1);
        const amount = ff * 4.4;

        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            p.position.copy(basePositions[i]);
            p.position.addScaledVector(baseDirections[i], amount);
        }
    },
};

const barrelDataTeeth = 72;

/* ----------------------------------------------------------------------------
   Base positions for exploded view
---------------------------------------------------------------------------- */
const basePositions: THREE.Vector3[] = [];
const baseDirections: THREE.Vector3[] = [];

for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    basePositions[i] = p.position.clone();

    const d = new THREE.Vector3(p.position.x, 0, p.position.z);
    if (d.lengthSq() < 1e-8) {
        const a = i * 2.399;
        d.set(Math.cos(a), 0, Math.sin(a));
    } else {
        d.normalize();
    }
    baseDirections[i] = d;
}

/* ----------------------------------------------------------------------------
   Animation application
---------------------------------------------------------------------------- */
function applyStateRotations(s: WatchState): void {
    centerWheel.rotation.y = s.center;
    centerPinion.rotation.y = s.center;

    thirdWheel.rotation.y = s.third;
    thirdPinion.rotation.y = s.third;

    fourthWheel.rotation.y = s.fourth;
    fourthPinion.rotation.y = s.fourth;

    escapeWheel.rotation.y = s.escape;
    escapePinion.rotation.y = s.escape;

    barrel.rotation.y = s.barrel;

    balanceWheel.rotation.y = s.balance;
    palletFork.rotation.y = s.pallet;

    hourHand.rotation.y = s.hour;
    minuteHand.rotation.y = s.minute;
    secondHand.rotation.y = s.second;

    cannonPinion.rotation.y = s.minute;
    minuteWheel.rotation.y = s.minute * 12.0;
    hourWheel.rotation.y = s.hour;
    ratchetWheel.rotation.y = s.barrel * 0.5;

    const breathe = Math.abs(s.balance) / (1.2 * Math.PI);
    const hscale = 1.0 + 0.055 * breathe;
    hairspring.scale.set(hscale, 1.0, hscale);
}

function applyStateAngles(_ignored: number): void {
    // Reset helper: zeroes visible moving parts, while the formula state is computed separately.
    centerWheel.rotation.y = 0;
    centerPinion.rotation.y = 0;
    thirdWheel.rotation.y = 0;
    thirdPinion.rotation.y = 0;
    fourthWheel.rotation.y = 0;
    fourthPinion.rotation.y = 0;
    escapeWheel.rotation.y = 0;
    escapePinion.rotation.y = 0;
    barrel.rotation.y = 0;
    balanceWheel.rotation.y = 0;
    palletFork.rotation.y = 0;
    hourHand.rotation.y = 0;
    minuteHand.rotation.y = 0;
    secondHand.rotation.y = 0;
    cannonPinion.rotation.y = 0;
    minuteWheel.rotation.y = 0;
    hourWheel.rotation.y = 0;
    ratchetWheel.rotation.y = 0;
    hairspring.scale.set(1.0, 1.0, 1.0);
}

/* ----------------------------------------------------------------------------
   Explode interaction
---------------------------------------------------------------------------- */
let explodeValue = 0;
let explodeTarget = 0;

const explodeButton = document.createElement('button');
explodeButton.textContent = 'Explode';
explodeButton.style.position = 'fixed';
explodeButton.style.left = '18px';
explodeButton.style.bottom = '18px';
explodeButton.style.padding = '8px 12px';
explodeButton.style.background = 'rgba(20, 22, 28, 0.78)';
explodeButton.style.color = '#e8e1d5';
explodeButton.style.border = '1px solid rgba(220, 210, 190, 0.35)';
explodeButton.style.borderRadius = '6px';
explodeButton.style.fontFamily = 'sans-serif';
explodeButton.style.fontSize = '14px';
explodeButton.style.cursor = 'pointer';
explodeButton.style.zIndex = '10';
document.body.appendChild(explodeButton);

explodeButton.addEventListener('click', () => {
    explodeTarget = explodeTarget === 0 ? 1 : 0;
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'E' || event.key === 'e') {
        explodeTarget = explodeTarget === 0 ? 1 : 0;
    }
});

/* ----------------------------------------------------------------------------
   Public testing hooks
---------------------------------------------------------------------------- */
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;

/* ----------------------------------------------------------------------------
   Render loop
---------------------------------------------------------------------------- */
const clock = new THREE.Clock();
let readySet = false;

renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1);

    if (!watch.paused) {
        watch.step(Math.min(delta, 1 / 30));
    }

    if (Math.abs(explodeValue - explodeTarget) > 0.0005) {
        explodeValue = THREE.MathUtils.lerp(explodeValue, explodeTarget, 0.075);
        watch.explode(explodeValue);
    }

    applyStateRotations(watch.state());
    controls.update();

    renderer.render(scene, camera);

    if (!readySet) {
        readySet = true;
        (window as any).__ready = true;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
});
```