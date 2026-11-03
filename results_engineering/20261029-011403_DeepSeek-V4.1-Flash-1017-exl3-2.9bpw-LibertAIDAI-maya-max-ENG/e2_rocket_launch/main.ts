import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ */
/*  Physics                                                            */
/* ------------------------------------------------------------------ */

const G0 = 9.81;
const EARTH_RADIUS = 6_371_000;
const LIFTOFF_MASS = 550_000;
const DRY_MASS = 220_000;
const BURN_TIME = 200;
const LIFTOFF_THRUST = 1.3 * LIFTOFF_MASS * G0;
const PAD_TOP = 6;
const ROCKET_BASE_Y = 10;

interface TrailPoint {
    x: number;
    y: number;
    z: number;
}

interface PublicRocketState {
    t: number;
    alt: number;
    vel: number;
    acc: number;
    pitch: number;
    speed: number;
}

class LaunchSimulation {
    t = 0;
    alt = 0;
    x = 0;
    z = 0;
    vx = 0;
    vy = 0;
    viewerSpeed: number | null = null;
    trail: TrailPoint[] = [];
    trailTimes: number[] = [];

    reset(): void {
        this.t = 0;
        this.alt = 0;
        this.x = 0;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.viewerSpeed = null;
        this.trail.length = 0;
        this.trailTimes.length = 0;
    }

    private massAt(time: number): number {
        if (time >= BURN_TIME) {
            return DRY_MASS;
        }
        const clamped = Math.max(0, time);
        return LIFTOFF_MASS + (DRY_MASS - LIFTOFF_MASS) * (clamped / BURN_TIME);
    }

    private gravityAt(altitude: number): number {
        const h = Math.max(0, altitude);
        const ratio = EARTH_RADIUS / (EARTH_RADIUS + h);
        return G0 * ratio * ratio;
    }

    private pitchAt(time: number): number {
        if (time <= 10) {
            return 0;
        }
        const u = Math.min(1, (time - 10) / 140);
        return 0.5 * u * u * (3 - 2 * u);
    }

    private thrustAt(time: number, mass: number): number {
        if (time >= BURN_TIME) {
            return 0;
        }
        return Math.min(LIFTOFF_THRUST, 3 * mass * G0);
    }

    private integrate(dt: number): void {
        const time = this.t;
        const mass = this.massAt(time);
        const pitch = this.pitchAt(time);
        const gravity = this.gravityAt(this.alt);
        const thrust = this.thrustAt(time, mass);

        const horizontalAcceleration = (thrust * Math.sin(pitch)) / mass;
        const verticalAcceleration = (thrust * Math.cos(pitch)) / mass - gravity;

        this.vx += horizontalAcceleration * dt;
        this.vy += verticalAcceleration * dt;

        this.x += this.vx * dt;
        this.alt += this.vy * dt;

        if (this.alt < 0) {
            this.alt = 0;
            if (this.vy < 0) {
                this.vy = 0;
            }
        }

        if (this.alt === 0 && this.vy < 0) {
            this.vy = 0;
        }

        this.t += dt;
    }

    step(dt: number): void {
        const total = Math.max(0, dt);
        const startTime = this.t;
        let remaining = total;

        while (remaining > 1e-9) {
            const substep = Math.min(0.02, remaining);
            this.integrate(substep);
            remaining -= substep;
        }

        this.t = startTime + total;

        this.trail.push({
            x: this.x,
            y: ROCKET_BASE_Y + this.alt,
            z: this.z,
        });
        this.trailTimes.push(this.t);
    }

    currentSpeed(): number {
        if (this.viewerSpeed !== null) {
            return this.viewerSpeed;
        }
        return this.t < 10 ? 1 : 10;
    }

    getState(): PublicRocketState {
        const mass = this.massAt(this.t);
        const pitch = this.pitchAt(this.t);
        const gravity = this.gravityAt(this.alt);
        const thrust = this.thrustAt(this.t, mass);
        const verticalAcceleration = (thrust * Math.cos(pitch)) / mass - gravity;

        return {
            t: this.t,
            alt: this.alt,
            vel: this.vy,
            acc: verticalAcceleration,
            pitch,
            speed: this.currentSpeed(),
        };
    }

    getPhysicalSpeed(): number {
        return Math.hypot(this.vx, this.vy);
    }
}

/* ------------------------------------------------------------------ */
/*  Renderer / scene                                                   */
/* ------------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: 'high-performance',
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000000';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbcd4e6, 0.00005);

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    20_000_000,
);

const padCameraPosition = new THREE.Vector3(58, 4.2, 100);
const padCameraTarget = new THREE.Vector3(0, ROCKET_BASE_Y + 35, 0);
camera.position.copy(padCameraPosition);
camera.lookAt(padCameraTarget);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

/* ------------------------------------------------------------------ */
/*  Environment reflection                                             */
/* ------------------------------------------------------------------ */

const envCanvas = document.createElement('canvas');
envCanvas.width = 1024;
envCanvas.height = 512;
const envContext = envCanvas.getContext('2d');

if (envContext) {
    const skyGradient = envContext.createLinearGradient(0, 0, 0, 512);
    skyGradient.addColorStop(0, '#3a74a8');
    skyGradient.addColorStop(0.45, '#9ec7df');
    skyGradient.addColorStop(0.55, '#e3edf1');
    skyGradient.addColorStop(0.72, '#48563b');
    skyGradient.addColorStop(1, '#253024');
    envContext.fillStyle = skyGradient;
    envContext.fillRect(0, 0, 1024, 512);

    const sunGlow = envContext.createRadialGradient(780, 125, 0, 780, 125, 90);
    sunGlow.addColorStop(0, 'rgba(255,255,235,1)');
    sunGlow.addColorStop(0.25, 'rgba(255,233,190,0.8)');
    sunGlow.addColorStop(1, 'rgba(255,233,190,0)');
    envContext.fillStyle = sunGlow;
    envContext.fillRect(0, 0, 1024, 512);
}

const envTexture = new THREE.CanvasTexture(envCanvas);
envTexture.mapping = THREE.EquirectangularReflectionMapping;
envTexture.colorSpace = THREE.SRGBColorSpace;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const environmentTarget = pmremGenerator.fromEquirectangular(envTexture);
scene.environment = environmentTarget.texture;
envTexture.dispose();
pmremGenerator.dispose();

/* ------------------------------------------------------------------ */
/*  Lighting                                                           */
/* ------------------------------------------------------------------ */

const sunDirection = new THREE.Vector3(0.55, 0.38, 0.74).normalize();

const hemisphereLight = new THREE.HemisphereLight(0xbfddff, 0x46512d, 1.05);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xfff3de, 2.8);
sunLight.position.copy(sunDirection).multiplyScalar(900);
sunLight.target.position.set(0, 30, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -170;
sunLight.shadow.camera.right = 170;
sunLight.shadow.camera.top = 170;
sunLight.shadow.camera.bottom = -170;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 2200;
sunLight.shadow.bias = -0.0002;
scene.add(sunLight);
scene.add(sunLight.target);

/* ------------------------------------------------------------------ */
/*  Procedural texture helpers                                         */
/* ------------------------------------------------------------------ */

function makeCanvasTexture(
    width: number,
    height: number,
    draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Unable to create canvas 2D context');
    }

    draw(context, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function makeGroundTexture(): THREE.CanvasTexture {
    const texture = makeCanvasTexture(1024, 1024, (ctx, w, h) => {
        const base = ctx.createLinearGradient(0, 0, 0, h);
        base.addColorStop(0, '#42512d');
        base.addColorStop(0.5, '#4b5932');
        base.addColorStop(1, '#394825');
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);

        const colors = [
            '#344020',
            '#53643a',
            '#657047',
            '#2d381d',
            '#7d7956',
            '#586d35',
            '#485b2a',
        ];

        for (let i = 0; i < 22_000; i += 1) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const radius = 1 + Math.random() * 7;
            ctx.globalAlpha = 0.08 + Math.random() * 0.22;
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 0.25;
        for (let i = 0; i < 400; i += 1) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const length = 8 + Math.random() * 45;
            ctx.strokeStyle = Math.random() > 0.5 ? '#788052' : '#2d371d';
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + length * (Math.random() - 0.5), y + length);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    });

    texture.repeat.set(28, 28);
    return texture;
}

function makeConcreteTexture(): THREE.CanvasTexture {
    const texture = makeCanvasTexture(1024, 1024, (ctx, w, h) => {
        ctx.fillStyle = '#989890';
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 28_000; i += 1) {
            const value = 90 + Math.floor(Math.random() * 95);
            ctx.fillStyle = `rgba(${value},${value},${value - 4},${0.08 + Math.random() * 0.25})`;
            const size = 1 + Math.random() * 4;
            ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
        }

        ctx.strokeStyle = 'rgba(62,62,58,0.45)';
        ctx.lineWidth = 3;
        for (let x = 0; x <= w; x += 256) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y <= h; y += 256) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(45,45,40,0.35)';
        for (let i = 0; i < 24; i += 1) {
            let x = Math.random() * w;
            let y = Math.random() * h;
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let j = 0; j < 5; j += 1) {
                x += (Math.random() - 0.5) * 80;
                y += (Math.random() - 0.5) * 80;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    });

    texture.repeat.set(4, 4);
    return texture;
}

function makeRoadTexture(): THREE.CanvasTexture {
    const texture = makeCanvasTexture(512, 128, (ctx, w, h) => {
        ctx.fillStyle = '#303034';
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 1600; i += 1) {
            const value = 35 + Math.floor(Math.random() * 35);
            ctx.fillStyle = `rgba(${value},${value},${value + 3},0.45)`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }

        ctx.fillStyle = '#c8c4aa';
        for (let x = 0; x < w; x += 96) {
            ctx.fillRect(x, h * 0.5 - 3, 48, 6);
        }

        ctx.strokeStyle = 'rgba(15,15,16,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(w, 12);
        ctx.moveTo(0, h - 12);
        ctx.lineTo(w, h - 12);
        ctx.stroke();
    });

    texture.repeat.set(80, 1);
    return texture;
}

function makeSoftCircleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)');
        gradient.addColorStop(0.62, 'rgba(255,255,255,0.28)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function makeRocketBodyTexture(): THREE.CanvasTexture {
    const texture = makeCanvasTexture(2048, 2048, (ctx, w, h) => {
        ctx.fillStyle = '#f4f2ec';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(190,190,184,0.55)';
        ctx.lineWidth = 2;
        for (let y = 128; y < h; y += 128) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        for (let x = 0; x < w; x += 256) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(210,210,204,0.35)';
        ctx.fillRect(0, 0, w, 16);
        ctx.fillRect(0, h - 18, w, 18);

        const drawFlag = (x: number, y: number, width: number, height: number): void => {
            const stripeHeight = height / 13;
            for (let i = 0; i < 13; i += 1) {
                ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#f7f7f2';
                ctx.fillRect(x, y + i * stripeHeight, width, stripeHeight + 1);
            }
            const cantonWidth = width * 0.42;
            const cantonHeight = stripeHeight * 7;
            ctx.fillStyle = '#3c3b6e';
            ctx.fillRect(x, y, cantonWidth, cantonHeight);
            ctx.fillStyle = '#ffffff';
            for (let row = 0; row < 4; row += 1) {
                for (let col = 0; col < 5; col += 1) {
                    const starX = x + cantonWidth * (0.12 + col * 0.18);
                    const starY = y + cantonHeight * (0.13 + row * 0.22);
                    ctx.beginPath();
                    ctx.arc(starX, starY, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        };

        drawFlag(180, 720, 300, 150);
        drawFlag(1340, 720, 300, 150);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#202020';
        ctx.font = 'bold 178px Arial, sans-serif';
        ctx.fillText('SPACEX', 512, 390);
        ctx.fillText('SPACEX', 1536, 390);

        ctx.font = 'bold 86px Arial, sans-serif';
        ctx.fillText('FALCON 9', 1024, 1510);

        ctx.fillStyle = 'rgba(80,80,78,0.8)';
        ctx.font = 'bold 44px Arial, sans-serif';
        ctx.fillText('REUSABLE LAUNCH SYSTEM', 1024, 1640);

        ctx.fillStyle = 'rgba(110,110,106,0.5)';
        for (let i = 0; i < 2200; i += 1) {
            ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
    });

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

const groundTexture = makeGroundTexture();
const concreteTexture = makeConcreteTexture();
const roadTexture = makeRoadTexture();
const softCircleTexture = makeSoftCircleTexture();
const rocketBodyTexture = makeRocketBodyTexture();

/* ------------------------------------------------------------------ */
/*  Sky, stars and atmosphere                                          */
/* ------------------------------------------------------------------ */

const skyUniforms = {
    uAltitude: { value: 0 },
    uSunDir: { value: sunDirection.clone() },
    uTime: { value: 0 },
};

const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
        varying vec3 vDirection;
        void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAltitude;
        uniform vec3 uSunDir;
        uniform float uTime;
        varying vec3 vDirection;

        void main() {
            vec3 direction = normalize(vDirection);
            float upward = clamp(direction.y, 0.0, 1.0);
            float downward = clamp(-direction.y, 0.0, 1.0);

            float space = smoothstep(60000.0, 100000.0, uAltitude);
            float high = smoothstep(8000.0, 55000.0, uAltitude);

            vec3 groundHorizon = vec3(0.77, 0.86, 0.92);
            vec3 groundZenith = vec3(0.09, 0.32, 0.68);
            vec3 highHorizon = mix(groundHorizon, vec3(0.36, 0.48, 0.6), high);
            vec3 highZenith = mix(groundZenith, vec3(0.01, 0.035, 0.09), high);

            vec3 horizon = mix(highHorizon, vec3(0.0), space);
            vec3 zenith = mix(highZenith, vec3(0.0), space);

            vec3 color = mix(horizon, zenith, pow(upward, 0.52));
            vec3 groundColor = mix(vec3(0.20, 0.24, 0.19), vec3(0.0), space);
            color = mix(color, groundColor, downward * (1.0 - space) * 0.55);

            vec3 sunDirection = normalize(uSunDir);
            float sunDot = max(dot(direction, sunDirection), 0.0);
            float disc = smoothstep(0.99945, 0.9999, sunDot);
            float glow = pow(sunDot, 160.0) * 0.9 + pow(sunDot, 9.0) * 0.10;
            color += vec3(1.0, 0.84, 0.58) * (disc * 4.2 + glow * (1.0 - space * 0.85));

            float horizonGlow = exp(-abs(direction.y) * 13.0);
            color = mix(color, mix(vec3(0.88, 0.92, 0.94), vec3(0.0), space), horizonGlow * 0.22 * (1.0 - space));

            gl_FragColor = vec4(color, 1.0);
        }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(700_000, 64, 32), skyMaterial);
sky.frustumCulled = false;
sky.renderOrder = -1000;
scene.add(sky);

function createStars(): THREE.Points {
    const count = 5200;
    const positions = new Float32Array(count * 3);
    const radius = 640_000;

    for (let i = 0; i < count; i += 1) {
        const u = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        positions[i * 3] = Math.cos(theta) * r * radius;
        positions[i * 3 + 1] = u * radius;
        positions[i * 3 + 2] = Math.sin(theta) * r * radius;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.8,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        fog: false,
    });

    const stars = new THREE.Points(geometry, material);
    stars.frustumCulled = false;
    stars.renderOrder = -900;
    return stars;
}

const stars = createStars();
const starsMaterial = stars.material as THREE.PointsMaterial;
scene.add(stars);

/* ------------------------------------------------------------------ */
/*  Florida ground, ocean and curved distant Earth                     */
/* ------------------------------------------------------------------ */

const groundMaterial = new THREE.MeshStandardMaterial({
    map: groundTexture,
    color: 0xffffff,
    roughness: 0.98,
    metalness: 0.0,
    bumpMap: groundTexture,
    bumpScale: 0.35,
});

const landGeometry = new THREE.PlaneGeometry(20_000, 12_000);
landGeometry.rotateX(-Math.PI / 2);
const land = new THREE.Mesh(landGeometry, groundMaterial);
land.position.set(0, 0.22, 4000);
land.receiveShadow = true;
scene.add(land);

const oceanMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a5d78,
    roughness: 0.3,
    metalness: 0.18,
    envMapIntensity: 1.1,
});

const oceanGeometry = new THREE.PlaneGeometry(20_000, 8000);
oceanGeometry.rotateX(-Math.PI / 2);
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.position.set(0, 0.12, -6000);
ocean.receiveShadow = true;
scene.add(ocean);

const beachMaterial = new THREE.MeshStandardMaterial({
    color: 0xc7bb91,
    roughness: 0.95,
    metalness: 0.0,
});

const beach = new THREE.Mesh(new THREE.BoxGeometry(20_000, 0.45, 54), beachMaterial);
beach.position.set(0, 0.34, -2000);
beach.receiveShadow = true;
scene.add(beach);

function createCurvedEarth(): THREE.Mesh {
    const radialSegments = 88;
    const angularSegments = 256;
    const innerRadius = 6000;
    const outerRadius = 3_200_000;
    const row = angularSegments + 1;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i <= radialSegments; i += 1) {
        const fraction = i / radialSegments;
        const radius = innerRadius + (outerRadius - innerRadius) * Math.pow(fraction, 1.55);

        for (let j = 0; j <= angularSegments; j += 1) {
            const angle = (j / angularSegments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = EARTH_RADIUS - Math.sqrt(Math.max(0, EARTH_RADIUS * EARTH_RADIUS - radius * radius));

            positions.push(x, y, z);

            const noise = 0.5 + 0.5 * Math.sin(x * 0.00009 + z * 0.00011 + Math.sin(z * 0.00004) * 2.7);
            const isLand = z > -2500;

            if (isLand) {
                color.setRGB(
                    0.055 + noise * 0.065,
                    0.115 + noise * 0.10,
                    0.045 + noise * 0.045,
                );
            } else {
                color.setRGB(
                    0.012 + noise * 0.018,
                    0.042 + noise * 0.045,
                    0.085 + noise * 0.080,
                );
            }

            colors.push(color.r, color.g, color.b);
        }
    }

    for (let i = 0; i < radialSegments; i += 1) {
        for (let j = 0; j < angularSegments; j += 1) {
            const a = i * row + j;
            const b = i * row + j + 1;
            const c = (i + 1) * row + j;
            const d = (i + 1) * row + j + 1;
            indices.push(a, b, c, b, d, c);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.0,
        side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    return mesh;
}

scene.add(createCurvedEarth());

/* ------------------------------------------------------------------ */
/*  Roads and low buildings                                            */
/* ------------------------------------------------------------------ */

const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
});

function addRoad(x: number, z: number, length: number, width: number, rotationY: number): void {
    const geometry = new THREE.PlaneGeometry(length, width);
    geometry.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(geometry, roadMaterial);
    road.position.set(x, 0.3, z);
    road.rotation.y = rotationY;
    road.receiveShadow = true;
    scene.add(road);
}

addRoad(0, -130, 6000, 22, 0);
addRoad(180, 0, 5600, 18, Math.PI / 2);
addRoad(0, 220, 6000, 18, 0);

const buildingWallMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfcbc0,
    roughness: 0.83,
    metalness: 0.02,
});

const buildingRoofMaterial = new THREE.MeshStandardMaterial({
    color: 0x666c6e,
    roughness: 0.78,
    metalness: 0.12,
});

const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x172328,
    roughness: 0.35,
    metalness: 0.35,
});

function addBuilding(x: number, z: number, width: number, depth: number, height: number): void {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingWallMaterial);
    wall.position.set(x, height / 2 + 0.2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 1.5, 0.6, depth + 1.5), buildingRoofMaterial);
    roof.position.set(x, height + 0.5, z);
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);

    const window = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, height * 0.22, 0.25), windowMaterial);
    window.position.set(x, height * 0.54, z + depth / 2 + 0.14);
    scene.add(window);
}

addBuilding(-280, -175, 42, 58, 12);
addBuilding(245, -205, 55, 42, 10);
addBuilding(430, -70, 35, 70, 15);
addBuilding(-470, -80, 60, 45, 9);
addBuilding(-210, 260, 48, 38, 11);
addBuilding(390, 240, 70, 40, 14);

/* ------------------------------------------------------------------ */
/*  Vegetation                                                         */
/* ------------------------------------------------------------------ */

function addScrub(count: number, color: number): void {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 1,
        metalness: 0,
        flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i += 1) {
        let x = 0;
        let z = 0;
        let accepted = false;

        while (!accepted) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 80 + Math.pow(Math.random(), 0.72) * 850;
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            accepted = z > -1850 && Math.hypot(x, z) > 95;
        }

        const scaleX = 0.55 + Math.random() * 2.1;
        const scaleY = 0.35 + Math.random() * 1.4;
        const scaleZ = 0.55 + Math.random() * 2.1;

        dummy.position.set(x, scaleY * 0.78, z);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.scale.set(scaleX, scaleY, scaleZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    scene.add(mesh);
}

addScrub(560, 0x2c421f);
addScrub(360, 0x3e5426);

/* ------------------------------------------------------------------ */
/*  Launch pad, trench, mount and towers                               */
/* ------------------------------------------------------------------ */

const concreteMaterial = new THREE.MeshStandardMaterial({
    map: concreteTexture,
    color: 0xffffff,
    roughness: 0.91,
    metalness: 0.02,
    bumpMap: concreteTexture,
    bumpScale: 0.22,
});

const trenchMaterial = new THREE.MeshStandardMaterial({
    color: 0x242525,
    roughness: 0.9,
    metalness: 0.08,
});

const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x70777a,
    roughness: 0.51,
    metalness: 0.72,
    envMapIntensity: 1.1,
});

const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d3034,
    roughness: 0.4,
    metalness: 0.82,
});

const unitBeamGeometry = new THREE.BoxGeometry(1, 1, 1);
const upAxis = new THREE.Vector3(0, 1, 0);

function addBeam(
    parent: THREE.Object3D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    thickness: number,
    material: THREE.Material,
): void {
    const direction = end.clone().sub(start);
    const length = direction.length();

    if (length < 1e-6) {
        return;
    }

    const beam = new THREE.Mesh(unitBeamGeometry, material);
    beam.position.copy(start).addScaledVector(direction, 0.5);
    beam.quaternion.setFromUnitVectors(upAxis, direction.normalize());
    beam.scale.set(thickness, length, thickness);
    beam.castShadow = true;
    beam.receiveShadow = true;
    parent.add(beam);
}

function createLatticeTower(
    centerX: number,
    centerZ: number,
    baseY: number,
    width: number,
    height: number,
    levels: number,
    thickness: number,
): THREE.Group {
    const group = new THREE.Group();
    const half = width / 2;

    const cornerOffsets: Array<[number, number]> = [
        [-half, -half],
        [half, -half],
        [half, half],
        [-half, half],
    ];

    const cornerAt = (index: number, y: number): THREE.Vector3 => {
        const offset = cornerOffsets[index];
        return new THREE.Vector3(centerX + offset[0], y, centerZ + offset[1]);
    };

    for (let i = 0; i < 4; i += 1) {
        addBeam(group, cornerAt(i, baseY), cornerAt(i, baseY + height), thickness, metalMaterial);
    }

    for (let level = 0; level <= levels; level += 1) {
        const y = baseY + (height * level) / levels;

        for (let i = 0; i < 4; i += 1) {
            addBeam(group, cornerAt(i, y), cornerAt((i + 1) % 4, y), thickness * 0.72, metalMaterial);
        }

        if (level > 0) {
            const previousY = baseY + (height * (level - 1)) / levels;
            for (let i = 0; i < 4; i += 1) {
                addBeam(
                    group,
                    cornerAt(i, previousY),
                    cornerAt((i + 1) % 4, y),
                    thickness * 0.52,
                    metalMaterial,
                );
            }
        }
    }

    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(width + 1.5, 0.5, width + 1.5),
        darkMetalMaterial,
    );
    platform.position.set(centerX, baseY + height + 0.3, centerZ);
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);

    const crane = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.55, 4.5, width * 0.35),
        metalMaterial,
    );
    crane.position.set(centerX + width * 0.35, baseY + height + 2.7, centerZ);
    crane.castShadow = true;
    group.add(crane);

    return group;
}

/* Pad slab with a central flame trench opening */
const padLeft = new THREE.Mesh(new THREE.BoxGeometry(43, PAD_TOP, 90), concreteMaterial);
padLeft.position.set(-28.5, PAD_TOP / 2, 0);
padLeft.castShadow = true;
padLeft.receiveShadow = true;
scene.add(padLeft);

const padRight = new THREE.Mesh(new THREE.BoxGeometry(43, PAD_TOP, 90), concreteMaterial);
padRight.position.set(28.5, PAD_TOP / 2, 0);
padRight.castShadow = true;
padRight.receiveShadow = true;
scene.add(padRight);

const trenchFloor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 90), trenchMaterial);
trenchFloor.position.set(0, 0.4, 0);
trenchFloor.receiveShadow = true;
scene.add(trenchFloor);

const trenchWallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.2, 90), trenchMaterial);
trenchWallLeft.position.set(-7.1, 2.6, 0);
trenchWallLeft.receiveShadow = true;
scene.add(trenchWallLeft);

const trenchWallRight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.2, 90), trenchMaterial);
trenchWallRight.position.set(7.1, 2.6, 0);
trenchWallRight.receiveShadow = true;
scene.add(trenchWallRight);

/* launch mount legs and hold-down clamps */
for (const x of [-4.2, 4.2]) {
    for (const z of [-4.2, 4.2]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.85, 4, 0.85), darkMetalMaterial);
        leg.position.set(x, PAD_TOP + 2, z);
        leg.castShadow = true;
        leg.receiveShadow = true;
        scene.add(leg);
    }
}

for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.1, 0.65), metalMaterial);
    clamp.position.set(Math.cos(angle) * 2.5, ROCKET_BASE_Y + 0.2, Math.sin(angle) * 2.5);
    clamp.castShadow = true;
    scene.add(clamp);
}

const apron = new THREE.Mesh(new THREE.BoxGeometry(170, 0.35, 170), concreteMaterial);
apron.position.set(0, 0.25, 0);
apron.receiveShadow = true;
scene.add(apron);

const umbilicalTower = createLatticeTower(-14, 0, PAD_TOP, 6.5, 94, 15, 0.28);
scene.add(umbilicalTower);

function addServiceArm(y: number): void {
    const group = new THREE.Group();
    const start = new THREE.Vector3(-10.7, y, 0);
    const end = new THREE.Vector3(-2.2, y, 0);

    addBeam(group, start, end, 0.22, metalMaterial);
    addBeam(
        group,
        start.clone().add(new THREE.Vector3(0, 1.1, 0)),
        end.clone().add(new THREE.Vector3(0, 1.1, 0)),
        0.18,
        metalMaterial,
    );
    addBeam(group, start, end.clone().add(new THREE.Vector3(0, 1.1, 0)), 0.14, metalMaterial);
    addBeam(group, start.clone().add(new THREE.Vector3(0, 1.1, 0)), end, 0.14, metalMaterial);

    scene.add(group);
}

addServiceArm(PAD_TOP + 28);
addServiceArm(PAD_TOP + 49);

/* lightning protection masts */
const mastPositions: Array<[number, number]> = [
    [-62, -40],
    [60, -48],
    [28, 72],
];

for (const [x, z] of mastPositions) {
    const mast = createLatticeTower(x, z, PAD_TOP, 2.1, 112, 9, 0.12);
    scene.add(mast);

    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.35, 8, 10), metalMaterial);
    spike.position.set(x, PAD_TOP + 116, z);
    spike.castShadow = true;
    scene.add(spike);

    const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2a1a }),
    );
    beacon.position.set(x, PAD_TOP + 120.5, z);
    scene.add(beacon);
}

const wireMaterial = new THREE.LineBasicMaterial({
    color: 0x777b7d,
    transparent: true,
    opacity: 0.6,
});

function addWire(a: THREE.Vector3, b: THREE.Vector3, sag: number): void {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i += 1) {
        const t = i / 24;
        const point = a.clone().lerp(b, t);
        point.y -= sag * 4 * t * (1 - t);
        points.push(point);
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, wireMaterial);
    scene.add(line);
}

const mastTopA = new THREE.Vector3(mastPositions[0][0], PAD_TOP + 116, mastPositions[0][1]);
const mastTopB = new THREE.Vector3(mastPositions[1][0], PAD_TOP + 116, mastPositions[1][1]);
const mastTopC = new THREE.Vector3(mastPositions[2][0], PAD_TOP + 116, mastPositions[2][1]);
addWire(mastTopA, mastTopB, 13);
addWire(mastTopB, mastTopC, 15);
addWire(mastTopC, mastTopA, 12);

/* ------------------------------------------------------------------ */
/*  Rocket                                                             */
/* ------------------------------------------------------------------ */

const rocketGroup = new THREE.Group();
rocketGroup.position.set(0, ROCKET_BASE_Y, 0);
scene.add(rocketGroup);

const rocketWhiteMaterial = new THREE.MeshPhysicalMaterial({
    map: rocketBodyTexture,
    color: 0xfffdf7,
    roughness: 0.4,
    metalness: 0.04,
    clearcoat: 0.15,
    clearcoatRoughness: 0.45,
    envMapIntensity: 1.15,
});

const rocketUpperMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf2f0e9,
    roughness: 0.42,
    metalness: 0.04,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    envMapIntensity: 1.1,
});

const interstageMaterial = new THREE.MeshStandardMaterial({
    color: 0x24262a,
    roughness: 0.42,
    metalness: 0.65,
});

const engineSectionMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b4e52,
    roughness: 0.48,
    metalness: 0.62,
});

const nozzleMaterial = new THREE.MeshStandardMaterial({
    color: 0x252629,
    roughness: 0.32,
    metalness: 0.92,
    side: THREE.DoubleSide,
});

const darkBandMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3d41,
    roughness: 0.44,
    metalness: 0.5,
});

function addRocketMesh(mesh: THREE.Mesh): void {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rocketGroup.add(mesh);
}

const engineSection = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 6, 32),
    engineSectionMaterial,
);
engineSection.position.y = 3;
addRocketMesh(engineSection);

const firstStage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 38, 32),
    rocketWhiteMaterial,
);
firstStage.position.y = 25;
addRocketMesh(firstStage);

const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.83, 1.83, 4, 32),
    interstageMaterial,
);
interstage.position.y = 46;
addRocketMesh(interstage);

const upperStage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 14, 32),
    rocketUpperMaterial,
);
upperStage.position.y = 55;
addRocketMesh(upperStage);

const noseProfile: THREE.Vector2[] = [
    new THREE.Vector2(1.85, 0),
    new THREE.Vector2(1.78, 1.2),
    new THREE.Vector2(1.6, 2.6),
    new THREE.Vector2(1.28, 4.3),
    new THREE.Vector2(0.82, 5.9),
    new THREE.Vector2(0.37, 7.1),
    new THREE.Vector2(0.08, 7.9),
    new THREE.Vector2(0, 8.0),
];

const noseFairing = new THREE.Mesh(new THREE.LatheGeometry(noseProfile, 32), rocketUpperMaterial);
noseFairing.position.y = 62;
addRocketMesh(noseFairing);

const lowerBand = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 0.45, 32), darkBandMaterial);
lowerBand.position.y = 8.2;
addRocketMesh(lowerBand);

const upperBand = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 0.5, 32), darkBandMaterial);
upperBand.position.y = 42.8;
addRocketMesh(upperBand);

const raceway = new THREE.Mesh(new THREE.BoxGeometry(0.18, 54, 0.32), darkMetalMaterial);
raceway.position.set(1.9, 34, 0);
addRocketMesh(raceway);

const finGeometry = new THREE.BoxGeometry(1.6, 0.14, 2.0);
for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2;
    const fin = new THREE.Mesh(finGeometry, metalMaterial);
    fin.position.set(Math.cos(angle) * 2.28, 45.1, Math.sin(angle) * 2.28);
    fin.rotation.y = -angle;
    addRocketMesh(fin);
}

const nozzleGeometry = new THREE.CylinderGeometry(0.42, 0.69, 2.4, 18, 1, true);
for (let i = 0; i < 9; i += 1) {
    let x = 0;
    let z = 0;
    if (i > 0) {
        const angle = ((i - 1) / 8) * Math.PI * 2;
        x = Math.cos(angle) * 1.25;
        z = Math.sin(angle) * 1.25;
    }
    const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.position.set(x, -1.2, z);
    nozzle.castShadow = true;
    nozzle.receiveShadow = true;
    rocketGroup.add(nozzle);
}

/* ------------------------------------------------------------------ */
/*  Plume                                                              */
/* ------------------------------------------------------------------ */

const plumeGroup = new THREE.Group();
plumeGroup.position.y = -2.4;
rocketGroup.add(plumeGroup);

const plumeCoreMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
            float top = pow(vUv.y, 2.2);
            float diamonds = pow(0.5 + 0.5 * sin((1.0 - vUv.y) * 46.0 - uTime * 18.0), 7.0);
            float flicker = 0.82 + 0.18 * sin(uTime * 31.0 + vUv.y * 8.0);
            vec3 color = mix(vec3(1.0, 0.17, 0.015), vec3(1.0, 0.94, 0.67), top);
            color += vec3(1.0, 0.82, 0.42) * diamonds * top * 1.6;
            float alpha = (0.35 + 0.65 * top) * (0.62 + 0.38 * diamonds) * flicker * uIntensity;
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
});

const plumeOuterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
            float glow = pow(vUv.y, 1.6);
            float flicker = 0.78 + 0.22 * sin(uTime * 20.0 + vUv.y * 5.0);
            vec3 color = mix(vec3(1.0, 0.12, 0.0), vec3(1.0, 0.48, 0.06), glow);
            float alpha = (0.08 + 0.28 * glow) * flicker * uIntensity;
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
});

const plumeCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 1.5, 1, 24, 1, true),
    plumeCoreMaterial,
);
plumeCore.frustumCulled = false;
plumeCore.renderOrder = 4;
plumeGroup.add(plumeCore);

const plumeOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 2.7, 1, 24, 1, true),
    plumeOuterMaterial,
);
plumeOuter.frustumCulled = false;
plumeOuter.renderOrder = 3;
plumeGroup.add(plumeOuter);

const glowMaterial = new THREE.SpriteMaterial({
    map: softCircleTexture,
    color: 0xffd081,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
});

const glowSprite = new THREE.Sprite(glowMaterial);
glowSprite.position.set(0, -2.4, 0);
glowSprite.scale.set(22, 22, 1);
rocketGroup.add(glowSprite);

const flameLight = new THREE.PointLight(0xffb268, 0, 420, 2);
flameLight.position.set(0, -2.8, 0);
rocketGroup.add(flameLight);

/* ------------------------------------------------------------------ */
/*  Smoke and steam                                                    */
/* ------------------------------------------------------------------ */

class SmokeSystem {
    private static readonly CAPACITY = 3400;

    readonly points: THREE.Points;
    private readonly geometry: THREE.BufferGeometry;
    private readonly material: THREE.ShaderMaterial;

    private readonly positions: Float32Array;
    private readonly sizes: Float32Array;
    private readonly alphas: Float32Array;
    private readonly colors: Float32Array;

    private readonly velocityX: Float32Array;
    private readonly velocityY: Float32Array;
    private readonly velocityZ: Float32Array;
    private readonly ages: Float32Array;
    private readonly lifetimes: Float32Array;
    private readonly baseSizes: Float32Array;
    private readonly growth: Float32Array;
    private readonly opacities: Float32Array;
    private readonly active: Uint8Array;

    private cursor = 0;

    constructor() {
        const capacity = SmokeSystem.CAPACITY;

        this.positions = new Float32Array(capacity * 3);
        this.sizes = new Float32Array(capacity);
        this.alphas = new Float32Array(capacity);
        this.colors = new Float32Array(capacity * 3);

        this.velocityX = new Float32Array(capacity);
        this.velocityY = new Float32Array(capacity);
        this.velocityZ = new Float32Array(capacity);
        this.ages = new Float32Array(capacity);
        this.lifetimes = new Float32Array(capacity);
        this.baseSizes = new Float32Array(capacity);
        this.growth = new Float32Array(capacity);
        this.opacities = new Float32Array(capacity);
        this.active = new Uint8Array(capacity);

        const geometry = new THREE.BufferGeometry();
        const positionAttribute = new THREE.BufferAttribute(this.positions, 3);
        positionAttribute.setUsage(THREE.DynamicDrawUsage);
        const sizeAttribute = new THREE.BufferAttribute(this.sizes, 1);
        sizeAttribute.setUsage(THREE.DynamicDrawUsage);
        const alphaAttribute = new THREE.BufferAttribute(this.alphas, 1);
        alphaAttribute.setUsage(THREE.DynamicDrawUsage);
        const colorAttribute = new THREE.BufferAttribute(this.colors, 3);
        colorAttribute.setUsage(THREE.DynamicDrawUsage);

        geometry.setAttribute('position', positionAttribute);
        geometry.setAttribute('aSize', sizeAttribute);
        geometry.setAttribute('aAlpha', alphaAttribute);
        geometry.setAttribute('aColor', colorAttribute);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uPixelScale: { value: 800 },
            },
            vertexShader: `
                attribute float aSize;
                attribute float aAlpha;
                attribute vec3 aColor;
                uniform float uPixelScale;
                varying float vAlpha;
                varying vec3 vColor;

                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = aSize * uPixelScale / max(1.0, -mvPosition.z);
                    vAlpha = aAlpha;
                    vColor = aColor;
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                varying vec3 vColor;

                void main() {
                    vec2 centered = gl_PointCoord - vec2(0.5);
                    float distanceFromCenter = length(centered) * 2.0;
                    float softness = smoothstep(1.0, 0.05, distanceFromCenter);
                    softness = pow(softness, 1.35);
                    float alpha = softness * vAlpha;

                    if (alpha < 0.006) {
                        discard;
                    }

                    vec3 color = vColor * (0.84 + 0.16 * (1.0 - distanceFromCenter));
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending,
            fog: false,
        });

        const points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        points.renderOrder = 2;

        this.geometry = geometry;
        this.material = material;
        this.points = points;
    }

    setPixelScale(scale: number): void {
        this.material.uniforms.uPixelScale.value = scale;
    }

    clear(): void {
        this.active.fill(0);
        this.alphas.fill(0);
        this.sizes.fill(0);
        this.ages.fill(0);
        this.cursor = 0;

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.aSize.needsUpdate = true;
        this.geometry.attributes.aAlpha.needsUpdate = true;
        this.geometry.attributes.aColor.needsUpdate = true;
    }

    spawn(
        x: number,
        y: number,
        z: number,
        vx: number,
        vy: number,
        vz: number,
        size: number,
        lifetime: number,
        opacity: number,
        r: number,
        g: number,
        b: number,
        initialAge = 0,
    ): void {
        const index = this.cursor;
        this.cursor = (this.cursor + 1) % SmokeSystem.CAPACITY;

        this.active[index] = 1;
        this.ages[index] = initialAge;
        this.lifetimes[index] = lifetime;
        this.baseSizes[index] = size;
        this.growth[index] = size * (1.1 + Math.random() * 1.8);
        this.opacities[index] = opacity;
        this.velocityX[index] = vx;
        this.velocityY[index] = vy;
        this.velocityZ[index] = vz;

        this.positions[index * 3] = x;
        this.positions[index * 3 + 1] = y;
        this.positions[index * 3 + 2] = z;

        this.colors[index * 3] = r;
        this.colors[index * 3 + 1] = g;
        this.colors[index * 3 + 2] = b;

        this.sizes[index] = size;
        this.alphas[index] = 0;
    }

    update(dt: number): void {
        if (dt <= 0) {
            return;
        }

        const drag = Math.exp(-0.58 * dt);
        const verticalDrag = Math.exp(-0.08 * dt);

        for (let i = 0; i < SmokeSystem.CAPACITY; i += 1) {
            if (this.active[i] === 0) {
                continue;
            }

            this.ages[i] += dt;

            if (this.ages[i] >= this.lifetimes[i]) {
                this.active[i] = 0;
                this.alphas[i] = 0;
                this.sizes[i] = 0;
                continue;
            }

            const index3 = i * 3;

            this.velocityX[i] *= drag;
            this.velocityZ[i] *= drag;
            this.velocityY[i] += 2.4 * dt;
            this.velocityY[i] *= verticalDrag;

            this.positions[index3] += this.velocityX[i] * dt;
            this.positions[index3 + 1] += this.velocityY[i] * dt;
            this.positions[index3 + 2] += this.velocityZ[i] * dt;

            if (this.positions[index3 + 1] < 0.8) {
                this.positions[index3 + 1] = 0.8;
                if (this.velocityY[i] < 0) {
                    this.velocityY[i] = 0;
                }
            }

            const lifeFraction = this.ages[i] / this.lifetimes[i];
            this.sizes[i] = this.baseSizes[i] + this.growth[i] * lifeFraction;

            const fadeIn = Math.min(1, this.ages[i] / 1.15);
            const fadeOut = Math.pow(Math.max(0, 1 - lifeFraction), 1.35);
            this.alphas[i] = this.opacities[i] * fadeIn * fadeOut;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.aSize.needsUpdate = true;
        this.geometry.attributes.aAlpha.needsUpdate = true;
        this.geometry.attributes.aColor.needsUpdate = true;
    }
}

const smokeSystem = new SmokeSystem();
scene.add(smokeSystem.points);

function spawnTrenchSteam(): void {
    const side = Math.random() < 0.5 ? 1 : -1;
    const x = (Math.random() - 0.5) * 16;
    const y = 1.2 + Math.random() * 4.8;
    const z = side * (38 + Math.random() * 10);

    const vx = (Math.random() - 0.5) * 11;
    const vy = 2.0 + Math.random() * 6.0;
    const vz = side * (9 + Math.random() * 27);

    const size = 6 + Math.random() * 13;
    const lifetime = 9 + Math.random() * 10;
    const opacity = 0.16 + Math.random() * 0.18;

    const warm = Math.random() < 0.28;
    const r = warm ? 1.0 : 0.82;
    const g = warm ? 0.88 : 0.87;
    const b = warm ? 0.70 : 0.91;

    smokeSystem.spawn(x, y, z, vx, vy, vz, size, lifetime, opacity, r, g, b);
}

function seedInitialSteam(): void {
    for (let i = 0; i < 180; i += 1) {
        const side = Math.random() < 0.5 ? 1 : -1;
        const x = (Math.random() - 0.5) * 24;
        const y = 0.8 + Math.random() * 5.5;
        const z = side * (34 + Math.random() * 18);

        const vx = (Math.random() - 0.5) * 12;
        const vy = 1.2 + Math.random() * 3.8;
        const vz = side * (4 + Math.random() * 13);

        const size = 5 + Math.random() * 10;
        const lifetime = 10 + Math.random() * 9;
        const opacity = 0.10 + Math.random() * 0.13;
        const age = Math.random() * 1.4;

        smokeSystem.spawn(
            x,
            y,
            z,
            vx,
            vy,
            vz,
            size,
            lifetime,
            opacity,
            0.80,
            0.85,
            0.92,
            age,
        );
    }
}

/* ------------------------------------------------------------------ */
/*  Trail                                                              */
/* ------------------------------------------------------------------ */

const TRAIL_CAPACITY = 65_536;
const trailPositions = new Float32Array(TRAIL_CAPACITY * 3);
const trailPositionAttribute = new THREE.BufferAttribute(trailPositions, 3);
trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);

const trailLineGeometry = new THREE.BufferGeometry();
trailLineGeometry.setAttribute('position', trailPositionAttribute);
trailLineGeometry.setDrawRange(0, 0);

const trailPointsGeometry = new THREE.BufferGeometry();
trailPointsGeometry.setAttribute('position', trailPositionAttribute);
trailPointsGeometry.setDrawRange(0, 0);

const trailLineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    fog: true,
});

const trailLine = new THREE.Line(trailLineGeometry, trailLineMaterial);
trailLine.frustumCulled = false;
trailLine.renderOrder = 5;
scene.add(trailLine);

const trailPointsMaterial = new THREE.PointsMaterial({
    map: softCircleTexture,
    color: 0xffffff,
    size: 5.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    alphaTest: 0.005,
    fog: true,
});

const trailPoints = new THREE.Points(trailPointsGeometry, trailPointsMaterial);
trailPoints.frustumCulled = false;
trailPoints.renderOrder = 5;
scene.add(trailPoints);

/* ------------------------------------------------------------------ */
/*  Post-processing                                                    */
/* ------------------------------------------------------------------ */

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,
    0.42,
    0.82,
);
const outputPass = new OutputPass();

composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(outputPass);

/* ------------------------------------------------------------------ */
/*  Simulation and UI                                                  */
/* ------------------------------------------------------------------ */

const simulation = new LaunchSimulation();

let smokeAccumulator = 0;
let effectTime = 0;
let lastFrameTime = 0;

const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.left = '18px';
overlay.style.top = '18px';
overlay.style.zIndex = '20';
overlay.style.color = '#f4f6f8';
overlay.style.background = 'rgba(5, 10, 16, 0.48)';
overlay.style.backdropFilter = 'blur(7px)';
overlay.style.border = '1px solid rgba(255,255,255,0.16)';
overlay.style.borderRadius = '9px';
overlay.style.padding = '12px 14px';
overlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
overlay.style.fontSize = '12px';
overlay.style.lineHeight = '1.5';
overlay.style.pointerEvents = 'auto';
overlay.style.userSelect = 'none';

const title = document.createElement('div');
title.textContent = 'FALCON 9  •  CAPE CANAVERAL';
title.style.fontWeight = '700';
title.style.letterSpacing = '0.08em';
title.style.marginBottom = '7px';
overlay.appendChild(title);

function addReadout(labelText: string): HTMLSpanElement {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '68px 1fr';
    row.style.gap = '8px';

    const label = document.createElement('span');
    label.textContent = labelText;
    label.style.color = 'rgba(172, 205, 228, 0.9)';
    row.appendChild(label);

    const value = document.createElement('span');
    value.textContent = '—';
    value.style.fontWeight = '600';
    row.appendChild(value);
    overlay.appendChild(row);
    return value;
}

const timeReadout = addReadout('T+');
const altitudeReadout = addReadout('ALT');
const velocityReadout = addReadout('VEL');
const pitchReadout = addReadout('PITCH');
const speedReadout = addReadout('RATE');

const controls = document.createElement('div');
controls.style.display = 'flex';
controls.style.flexWrap = 'wrap';
controls.style.gap = '6px';
controls.style.marginTop = '10px';
overlay.appendChild(controls);

function createButton(labelText: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = labelText;
    button.style.cursor = 'pointer';
    button.style.color = '#e8eef3';
    button.style.background = 'rgba(255,255,255,0.09)';
    button.style.border = '1px solid rgba(255,255,255,0.20)';
    button.style.borderRadius = '6px';
    button.style.padding = '6px 9px';
    button.style.fontFamily = 'inherit';
    button.style.fontSize = '11px';
    button.style.fontWeight = '700';
    return button;
}

const speedButton1 = createButton('×1');
const speedButton10 = createButton('×10');
const speedButton30 = createButton('×30');
const pauseButton = createButton('PAUSE');
const resetButton = createButton('RESET');

controls.appendChild(speedButton1);
controls.appendChild(speedButton10);
controls.appendChild(speedButton30);
controls.appendChild(pauseButton);
controls.appendChild(resetButton);

document.body.appendChild(overlay);

function refreshSpeedButtons(): void {
    const chosen = simulation.viewerSpeed;
    const setStyle = (button: HTMLButtonElement, selected: boolean): void => {
        button.style.background = selected ? 'rgba(255, 190, 100, 0.23)' : 'rgba(255,255,255,0.09)';
        button.style.borderColor = selected ? 'rgba(255, 205, 130, 0.72)' : 'rgba(255,255,255,0.20)';
    };
    setStyle(speedButton1, chosen === 1);
    setStyle(speedButton10, chosen === 10);
    setStyle(speedButton30, chosen === 30);
}

function setViewerSpeed(value: number): void {
    simulation.viewerSpeed = value;
    refreshSpeedButtons();
}

speedButton1.addEventListener('click', () => setViewerSpeed(1));
speedButton10.addEventListener('click', () => setViewerSpeed(10));
speedButton30.addEventListener('click', () => setViewerSpeed(30));

const rocketApi: {
    reset: () => void;
    step: (dt: number) => void;
    state: () => PublicRocketState;
    trail: TrailPoint[];
    paused: boolean;
} = {
    reset: () => {
        simulation.reset();
        resetPresentation();
        refreshSpeedButtons();
    },
    step: (dt: number) => {
        simulation.step(dt);
    },
    state: () => simulation.getState(),
    trail: simulation.trail,
    paused: false,
};

(window as any).__rocket = rocketApi;

pauseButton.addEventListener('click', () => {
    rocketApi.paused = !rocketApi.paused;
    pauseButton.textContent = rocketApi.paused ? 'PLAY' : 'PAUSE';
});

resetButton.addEventListener('click', () => {
    rocketApi.reset();
    pauseButton.textContent = rocketApi.paused ? 'PLAY' : 'PAUSE';
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === '1') {
        setViewerSpeed(1);
    } else if (event.key === '2') {
        setViewerSpeed(10);
    } else if (event.key === '3') {
        setViewerSpeed(30);
    } else if (event.code === 'Space') {
        event.preventDefault();
        rocketApi.paused = !rocketApi.paused;
        pauseButton.textContent = rocketApi.paused ? 'PLAY' : 'PAUSE';
    }
});

/* ------------------------------------------------------------------ */
/*  Camera / visual updates                                           */
/* ------------------------------------------------------------------ */

const chaseOffset = new THREE.Vector3(50, 55, 70);
const rocketCenterLocal = new THREE.Vector3(0, 35, 0);
const desiredCameraPosition = new THREE.Vector3();
const currentTarget = new THREE.Vector3();

const fogColorGround = new THREE.Color(0xbcd4e6);
const fogColorSpace = new THREE.Color(0x03060b);
const fogColorScratch = new THREE.Color();

function updateCamera(altitude: number): void {
    rocketGroup.updateMatrixWorld(true);

    const chasePosition = chaseOffset.clone().applyMatrix4(rocketGroup.matrixWorld);
    const target = rocketCenterLocal.clone().applyMatrix4(rocketGroup.matrixWorld);

    const blend = THREE.MathUtils.smoothstep(altitude, 80, 160);
    desiredCameraPosition.copy(padCameraPosition).lerp(chasePosition, blend);

    camera.position.copy(desiredCameraPosition);
    currentTarget.copy(target);
    camera.lookAt(currentTarget);
}

function updateAtmosphere(altitude: number): void {
    const spaceAmount = THREE.MathUtils.smoothstep(altitude, 60_000, 100_000);

    fogColorScratch.copy(fogColorGround).lerp(fogColorSpace, spaceAmount);
    const fog = scene.fog as THREE.FogExp2;
    fog.color.copy(fogColorScratch);
    fog.density = 0.00005 * Math.exp(-altitude / 8500) + 1e-7;

    skyUniforms.uAltitude.value = altitude;
    skyUniforms.uTime.value = effectTime;

    starsMaterial.opacity = THREE.MathUtils.smoothstep(altitude, 70_000, 100_000);
    hemisphereLight.intensity = 1.05 * (1.0 - 0.58 * spaceAmount);

    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
}

function updatePlume(dt: number, burning: boolean, altitude: number): void {
    if (!burning) {
        plumeGroup.visible = false;
        glowSprite.visible = false;
        flameLight.intensity = 0;
        return;
    }

    plumeGroup.visible = true;
    glowSprite.visible = true;

    const airFactor = THREE.MathUtils.clamp(altitude / 70_000, 0, 1);
    const ignitionFactor = Math.min(1, 0.55 + effectTime * 1.5);
    const length = (26 + 300 * Math.pow(airFactor, 0.85)) * ignitionFactor;
    const width = 0.88 + 2.15 * Math.pow(airFactor, 0.72);

    plumeCore.scale.set(width * 0.95, length, width * 0.95);
    plumeCore.position.y = -length / 2;

    plumeOuter.scale.set(width * 1.6, length * 1.08, width * 1.6);
    plumeOuter.position.y = -length * 1.08 / 2;

    plumeCoreMaterial.uniforms.uTime.value = effectTime;
    plumeOuterMaterial.uniforms.uTime.value = effectTime;

    const flicker =
        0.82 +
        0.12 * Math.sin(effectTime * 31.0) +
        0.06 * Math.sin(effectTime * 73.0 + 1.7);

    const glowScale = 15 + width * 12;
    glowSprite.scale.set(glowScale, glowScale, 1);
    glowMaterial.opacity = 0.7 * ignitionFactor * flicker;

    flameLight.intensity = (altitude < 1200 ? 4600 : 1800) * flicker;
    flameLight.distance = altitude < 1200 ? 420 : 180;

    plumeCoreMaterial.uniforms.uIntensity.value = 0.92 + 0.08 * Math.sin(effectTime * 43.0);
    plumeOuterMaterial.uniforms.uIntensity.value = 0.76 + 0.24 * Math.sin(effectTime * 27.0 + 0.6);

    void dt;
}

function updateTrail(): void {
    const length = Math.min(simulation.trail.length, TRAIL_CAPACITY);

    for (let i = 0; i < length; i += 1) {
        const point = simulation.trail[i];
        const age = Math.max(0, simulation.t - simulation.trailTimes[i]);
        const drift = Math.min(age, 240) * 0.55;

        const index = i * 3;
        trailPositions[index] = point.x + drift;
        trailPositions[index + 1] = point.y + Math.min(age, 240) * 0.12;
        trailPositions[index + 2] = point.z + drift * 0.35;
    }

    trailLineGeometry.setDrawRange(0, length);
    trailPointsGeometry.setDrawRange(0, length);
    trailPositionAttribute.needsUpdate = true;
}

function spawnGroundSmoke(dt: number): void {
    if (rocketApi.paused) {
        return;
    }

    const state = simulation.getState();
    if (state.t >= BURN_TIME) {
        smokeAccumulator = 0;
        return;
    }

    let rate = 0;
    if (state.t < 6) {
        rate = 260;
    } else if (state.t < 12) {
        rate = 160;
    } else if (state.alt < 900) {
        rate = 58;
    } else if (state.alt < 2100) {
        rate = 18;
    }

    smokeAccumulator += rate * dt;

    while (smokeAccumulator >= 1) {
        smokeAccumulator -= 1;
        spawnTrenchSteam();
    }
}

function updateOverlay(): void {
    const state = simulation.getState();
    const physicalSpeed = simulation.getPhysicalSpeed();

    const minutes = Math.floor(state.t / 60);
    const seconds = state.t - minutes * 60;
    timeReadout.textContent = `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
    altitudeReadout.textContent = `${(state.alt / 1000).toFixed(2)} km`;
    velocityReadout.textContent = `${(physicalSpeed * 3.6).toFixed(0)} km/h`;
    pitchReadout.textContent = `${THREE.MathUtils.radToDeg(state.pitch).toFixed(1)}°`;
    speedReadout.textContent = `×${state.speed}`;
}

function updateSmokePixelScale(): void {
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const scale = renderer.domElement.height / (2 * Math.tan(fov / 2));
    smokeSystem.setPixelScale(scale);
}

function resetPresentation(): void {
    smokeSystem.clear();
    seedInitialSteam();
    smokeAccumulator = 0;
    effectTime = 0;

    trailLineGeometry.setDrawRange(0, 0);
    trailPointsGeometry.setDrawRange(0, 0);

    rocketGroup.position.set(0, ROCKET_BASE_Y, 0);
    rocketGroup.rotation.set(0, 0, 0);
    rocketGroup.updateMatrixWorld(true);

    camera.position.copy(padCameraPosition);
    camera.lookAt(padCameraTarget);

    updateSmokePixelScale();
    refreshSpeedButtons();
}

/* ------------------------------------------------------------------ */
/*  Resize                                                             */
/* ------------------------------------------------------------------ */

function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(window.innerWidth, window.innerHeight);

    updateSmokePixelScale();
}

window.addEventListener('resize', onResize);

/* ------------------------------------------------------------------ */
/*  Animation loop                                                     */
/* ------------------------------------------------------------------ */

let ready = false;

function animate(time: number): void {
    if (lastFrameTime === 0) {
        lastFrameTime = time;
    }

    const rawDelta = Math.max(0, Math.min((time - lastFrameTime) / 1000, 1 / 30));
    lastFrameTime = time;

    const speedBeforeStep = simulation.currentSpeed();

    if (!rocketApi.paused) {
        simulation.step(rawDelta * speedBeforeStep);
        effectTime += rawDelta;
    }

    const state = simulation.getState();

    rocketGroup.position.set(simulation.x, ROCKET_BASE_Y + simulation.alt, 0);
    rocketGroup.rotation.set(0, 0, -state.pitch);
    rocketGroup.updateMatrixWorld(true);

    updateCamera(state.alt);
    updateAtmosphere(state.alt);
    updatePlume(rawDelta, state.t < BURN_TIME, state.alt);

    if (!rocketApi.paused) {
        spawnGroundSmoke(rawDelta);
        smokeSystem.update(rawDelta);
    }

    updateTrail();
    updateOverlay();

    composer.render();

    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
}

resetPresentation();
updateSmokePixelScale();
updateAtmosphere(0);
updateOverlay();

renderer.setAnimationLoop(animate);
