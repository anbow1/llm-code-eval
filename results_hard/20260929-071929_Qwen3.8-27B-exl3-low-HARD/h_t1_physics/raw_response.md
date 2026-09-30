

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Box edges
const boxSize = 10;
const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const boxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
scene.add(boxEdges);

// Ball data
interface Ball {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    r: number;
    m: number;
}

const NUM_BALLS = 20;
const RADIUS = 0.4;
const BOX_MIN = -5;
const BOX_MAX = 5;

const balls: Ball[] = [];

// Generate non-overlapping positions
function generatePosition(): { x: number; y: number; z: number } {
    const min = BOX_MIN + RADIUS;
    const max = BOX_MAX - RADIUS;
    for (let attempt = 0; attempt < 100000; attempt++) {
        const x = min + Math.random() * (max - min);
        const y = min + Math.random() * (max - min);
        const z = min + Math.random() * (max - min);
        let valid = true;
        for (const b of balls) {
            const dx = x - b.x;
            const dy = y - b.y;
            const dz = z - b.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq < RADIUS * 2 * RADIUS * 2) {
                valid = false;
                break;
            }
        }
        if (valid) return { x, y, z };
    }
    // Fallback grid placement (shouldn't happen)
    const idx = balls.length;
    const gridSize = 3;
    const spacing = 2 * RADIUS + 0.5;
    const gx = BOX_MIN + RADIUS + (idx % gridSize) * spacing;
    const gy = BOX_MIN + RADIUS + (Math.floor(idx / gridSize) % gridSize) * spacing;
    const gz = BOX_MIN + RADIUS + (Math.floor(idx / (gridSize * gridSize)) % gridSize) * spacing;
    return { x: gx, y: gy, z: gz };
}

// Initialize balls
for (let i = 0; i < NUM_BALLS; i++) {
    const pos = generatePosition();
    const m = 1 + Math.random() * 2; // mass in [1, 3]
    const speed = 2 + Math.random() * 2; // speed in [2, 4]
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    balls.push({ x: pos.x, y: pos.y, z: pos.z, vx, vy, vz, r: RADIUS, m });
}

// Create meshes
const sphereGeometry = new THREE.SphereGeometry(RADIUS, 32, 32);
const meshes: THREE.Mesh[] = [];

for (let i = 0; i < NUM_BALLS; i++) {
    const color = new THREE.Color().setHSL(i / NUM_BALLS, 0.8, 0.5);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.2,
    });
    const mesh = new THREE.Mesh(sphereGeometry, material);
    scene.add(mesh);
    meshes.push(mesh);
}

// Physics step with substeps
function step(dt: number): void {
    const SUBSTEPS = 8;
    const subDt = dt / SUBSTEPS;

    for (let s = 0; s < SUBSTEPS; s++) {
        // Integrate positions
        for (const b of balls) {
            b.x += b.vx * subDt;
            b.y += b.vy * subDt;
            b.z += b.vz * subDt;
        }

        // Ball-ball collisions
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                const a = balls[i];
                const b = balls[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dz = b.z - a.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                const minDist = a.r + b.r;

                if (distSq < minDist * minDist && distSq > 1e-12) {
                    const dist = Math.sqrt(distSq);
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const nz = dz / dist;

                    // Separate overlapping balls (weighted by inverse mass)
                    const overlap = minDist - dist;
                    const totalMass = a.m + b.m;
                    const sepA = overlap * (b.m / totalMass);
                    const sepB = overlap * (a.m / totalMass);
                    a.x -= nx * sepA;
                    a.y -= ny * sepA;
                    a.z -= nz * sepA;
                    b.x += nx * sepB;
                    b.y += ny * sepB;
                    b.z += nz * sepB;

                    // Elastic collision impulse
                    const dvx = a.vx - b.vx;
                    const dvy = a.vy - b.vy;
                    const dvz = a.vz - b.vz;
                    const dvDotN = dvx * nx + dvy * ny + dvz * nz;

                    if (dvDotN > 0) {
                        const impulse = (2 * dvDotN) / (1 / a.m + 1 / b.m);
                        a.vx -= (impulse / a.m) * nx;
                        a.vy -= (impulse / a.m) * ny;
                        a.vz -= (impulse / a.m) * nz;
                        b.vx += (impulse / b.m) * nx;
                        b.vy += (impulse / b.m) * ny;
                        b.vz += (impulse / b.m) * nz;
                    }
                }
            }
        }

        // Wall collisions (clamp and reflect)
        for (const b of balls) {
            if (b.x - b.r < BOX_MIN) {
                b.x = BOX_MIN + b.r;
                b.vx = Math.abs(b.vx);
            } else if (b.x + b.r > BOX_MAX) {
                b.x = BOX_MAX - b.r;
                b.vx = -Math.abs(b.vx);
            }
            if (b.y - b.r < BOX_MIN) {
                b.y = BOX_MIN + b.r;
                b.vy = Math.abs(b.vy);
            } else if (b.y + b.r > BOX_MAX) {
                b.y = BOX_MAX - b.r;
                b.vy = -Math.abs(b.vy);
            }
            if (b.z - b.r < BOX_MIN) {
                b.z = BOX_MIN + b.r;
                b.vz = Math.abs(b.vz);
            } else if (b.z + b.r > BOX_MAX) {
                b.z = BOX_MAX - b.r;
                b.vz = -Math.abs(b.vz);
            }
        }
    }
}

// Simulation object
const sim: { balls: Ball[]; step: (dt: number) => void; paused: boolean } = {
    balls,
    step,
    paused: false,
};
(window as any).__sim = sim;

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 1 / 30);

    if (!sim.paused) {
        step(delta);
    }

    // Sync meshes with physics state
    for (let i = 0; i < balls.length; i++) {
        meshes[i].position.set(balls[i].x, balls[i].y, balls[i].z);
    }

    renderer.render(scene, camera);

    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```