import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

// Camera - above and to the side
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(14, 10, 14);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 600, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet data
interface PlanetInfo {
    mesh: THREE.Mesh;
    distance: number;
    orbitSpeed: number;
    spinSpeed: number;
}

const planets: PlanetInfo[] = [];

function createPlanet(
    radius: number,
    color: number,
    distance: number,
    orbitSpeed: number,
    spinSpeed: number
): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    planets.push({ mesh, distance, orbitSpeed, spinSpeed });
    return mesh;
}

const planet1 = createPlanet(0.35, 0x5588ff, 4, 1.2, 3.0);
const planet2 = createPlanet(0.6, 0x44dd44, 7, 0.7, 2.0);
const planet3 = createPlanet(0.45, 0xff6633, 10, 0.4, 1.5);

// Moon for planet 2 (child of planet mesh)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planet2.add(moon);
const moonOrbitRadius = 1.4;
const moonOrbitSpeed = 4.0;
let moonAngle = 0;

// Clock for delta/elapsed time
const clock = new THREE.Clock();

let firstFrameRendered = false;

// Animation loop
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update planet orbits and spins
    for (const p of planets) {
        const angle = elapsed * p.orbitSpeed;
        p.mesh.position.set(
            Math.cos(angle) * p.distance,
            0,
            Math.sin(angle) * p.distance
        );
        // Spin on own Y axis
        p.mesh.rotation.y += p.spinSpeed * delta;
    }

    // Moon orbit in local XZ plane of planet2
    moonAngle += moonOrbitSpeed * delta;
    moon.position.set(
        Math.cos(moonAngle) * moonOrbitRadius,
        0,
        Math.sin(moonAngle) * moonOrbitRadius
    );

    renderer.render(scene, camera);

    if (!firstFrameRendered) {
        firstFrameRendered = true;
        (window as any).__ready = true;
    }
});

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
