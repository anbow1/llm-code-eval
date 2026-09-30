Let me plan out a mini solar system in Three.js:

1. **Sun**: Sphere at origin with MeshBasicMaterial (emissive look), plus a PointLight at origin. For physically based lighting, I need to use `decay` and `intensity` properly. In newer Three.js versions, the default is physically correct lighting, so PointLight intensity is in candela and decay is 2 (inverse square law). I'll set intensity high enough to illuminate planets at distances 4-10.

2. **3 Planets**: 
   - Planet 1: distance ~4, faster orbit
   - Planet 2: distance ~7, medium orbit, has a moon
   - Planet 3: distance ~10, slower orbit
   - All use MeshStandardMaterial
   - Each spins on its own axis

3. **Moon**: Small sphere, child of planet 2's mesh, orbiting it.

4. **Lighting**: PointLight at origin + weak AmbientLight.

5. **Camera**: Above and to the side, looking at origin.

6. **Technical requirements**:
   - Import THREE from 'three'
   - Create WebGLRenderer, append to document.body
   - Handle resize
   - Use setAnimationLoop
   - Delta time for motion
   - Expose __scene, __camera, __renderer
   - Set __ready after first frame

Let me think about the orbit mechanics. I'll use angle variables that increment by angular speed * delta each frame. Planet position = (cos(angle) * distance, 0, sin(angle) * distance).

For the moon, since it's a child of the planet mesh, I need to be careful. If I add the moon as a child of the planet mesh, the moon's position is relative to the planet. So I'll set the moon's position relative to the planet based on its own orbit angle.

Wait, but if the planet spins (rotation.y), and the moon is a child, the moon would also rotate with the planet's spin. That's not ideal. Let me think...

Actually, the requirement says "added as a child of the planet mesh (planet.add(moon))". So I must add it as a child. But if the planet spins, the moon will orbit in a way that's affected by the planet's rotation. 

One approach: I can counter-rotate the moon, or I can use a separate group. But the requirement explicitly says `planet.add(moon)`. 

Actually, let me re-read: "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet."

I think the simplest approach that satisfies the requirement is to add the moon as a child and update its local position each frame. The planet's spin will affect the moon's apparent orbit, but since the moon's orbit is being set explicitly each frame, it should still work - the moon will just have a slightly different apparent orbit due to the parent's rotation. 

Actually wait - if I set moon.position.set(cos(moonAngle)*moonDist, 0, sin(moonAngle)*moonDist) each frame, and the parent (planet) is rotating, then the moon's world position will be affected by the planet's rotation. This means the moon's orbit will be a combination of its own orbital motion and the planet's spin. That might look weird.

Better approach: I can counter the planet's rotation on the moon. Or I can use a separate orbit group. But the requirement says `planet.add(moon)`.

Let me just do it simply: add moon as child, update its local position each frame. The planet's spin will cause the moon to have a slightly wobbly orbit, but it'll still be clearly orbiting the planet. For a "mini solar system" this is fine. Or I can make the planet's spin slow enough that it's not too noticeable.

Actually, a cleaner approach: I'll counter-rotate the moon by the planet's rotation. Each frame, after setting the moon's local position, I can set moon.rotation.y = -planet.rotation.y. Wait, that won't quite work either because the position is in local space.

Let me think differently. The planet mesh rotates around its Y axis. The moon is a child. If I set the moon's position in local space, the planet's rotation will transform that position. So if the planet has rotated by angle θ, the moon's actual orbital angle in world space will be moonAngle + θ.

The simplest fix: just don't worry about it. The moon will orbit the planet, and the planet's spin will add a small perturbation. For a demo, this is perfectly fine. Or I can make the spin very slow.

Actually, the cleanest solution: I'll update the moon's position to compensate. Each frame:
- moonAngle += moonSpeed * delta
- The planet has rotation.y = planetSpinAngle
- To make the moon orbit at moonAngle in world space, I need the local angle to be moonAngle - planetSpinAngle
- So: moon.position.set(cos(moonAngle - planet.rotation.y) * moonDist, 0, sin(moonAngle - planet.rotation.y) * moonDist)

That way the moon orbits smoothly in world space regardless of the planet's spin. Let me use this approach.

Now for the PointLight: In Three.js r155+, the default is physically correct lighting. PointLight intensity is in candela. With decay=2 (default), the intensity at distance d is intensity / d². So at distance 10, I need intensity/100 to be reasonable. If I want brightness of about 1 at distance 4, I need intensity = 16. At distance 10, it would be 16/100 = 0.16. That might be too dim for the outer planet.

Let me use intensity = 50 or so. At distance 4: 50/16 ≈ 3.1, at distance 7: 50/49 ≈ 1, at distance 10: 50/100 = 0.5. That seems reasonable.

Actually, let me check Three.js version considerations. In recent versions (r155+), `renderer.useLegacyLights` was removed and physically correct lighting is always on. So PointLight intensity is in candela. I'll set it to something like 50-100.

Let me write the code now.

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight at origin
const pointLight = new THREE.PointLight(0xffffff, 80, 0, 2);
scene.add(pointLight);

// AmbientLight
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// Planet data
interface PlanetData {
    mesh: THREE.Mesh;
    distance: number;
    orbitAngle: number;
    orbitSpeed: number;
    spinSpeed: number;
    moon?: {
        mesh: THREE.Mesh;
        distance: number;
        angle: number;
        speed: number;
    };
}

const planets: PlanetData[] = [];

// Planet 1
const p1Geo = new THREE.SphereGeometry(0.4, 32, 32);
const p1Mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.7, metalness: 0.1 });
const p1 = new THREE.Mesh(p1Geo, p1Mat);
scene.add(p1);
planets.push({ mesh: p1, distance: 4, orbitAngle: 0, orbitSpeed: 1.0, spinSpeed: 2.0 });

// Planet 2
const p2Geo = new THREE.SphereGeometry(0.6, 32, 32);
const p2Mat = new THREE.MeshStandardMaterial({ color: 0xff8844, roughness: 0.8, metalness: 0.05 });
const p2 = new THREE.Mesh(p2Geo, p2Mat);
scene.add(p2);

// Moon for planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
p2.add(moon);

planets.push({
    mesh: p2,
    distance: 7,
    orbitAngle: Math.PI / 3,
    orbitSpeed: 0.6,
    spinSpeed: 1.5,
    moon: { mesh: moon, distance: 1.2, angle: 0, speed: 2.0 }
});

// Planet 3
const p3Geo = new THREE.SphereGeometry(0.5, 32, 32);
const p3Mat = new THREE.MeshStandardMaterial({ color: 0x44ff88, roughness: 0.6, metalness: 0.1 });
const p3 = new THREE.Mesh(p3Geo, p3Mat);
scene.add(p3);
planets.push({ mesh: p3, distance: 10, orbitAngle: Math.PI, orbitSpeed: 0.35, spinSpeed: 1.0 });

// Orbit lines (optional visual aid)
for (const p of planets) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * p.distance, 0, Math.sin(a) * p.distance));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x333333 });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbitLine);
}

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    for (const p of planets) {
        p.orbitAngle += p.orbitSpeed * delta;
        p.mesh.position.set(
            Math.cos(p.orbitAngle) * p.distance,
            0,
            Math.sin(p.orbitAngle) * p.distance
        );
        p.mesh.rotation.y += p.spinSpeed * delta;

        if (p.moon) {
            p.moon.angle += p.moon.speed * delta;
            // Counter the planet's rotation so moon orbits smoothly in world space
            const localAngle = p.moon.angle - p.mesh.rotation.y;
            p.moon.mesh.position.set(
                Math.cos(localAngle) * p.moon.distance,
                0,
                Math.sin(localAngle) * p.moon.distance
            );
        }
    }

    renderer.render(scene, camera);

    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to double-check the PointLight constructor. In Three.js, `PointLight(color, intensity, distance, decay)`. With `distance = 0` it means infinite range. `decay = 2` is physically correct. The intensity in physically based mode is in candela.

Let me verify: at distance 4, illuminance = 80 / (4²) = 80/16 = 5. At distance 7: 80/49 ≈ 1.6. At distance 10: 80/100 = 0.8. That should be visible with MeshStandardMaterial.

Actually, I realize I should double-check if `useLegacyLights` matters. In Three.js r155+, `useLegacyLights` defaults to false, meaning physically correct lighting is used. In this mode, PointLight intensity is in candela. My values should work.

Let me also make sure the ambient light is weak enough. `AmbientLight(0x404040, 0.5)` - in physically correct mode, ambient light intensity... actually AmbientLight works a bit differently. Let me just use a low intensity like 0.3 with a dark color.

Let me finalize the code. I think it's solid. Let me also add some slight tilt to planet rotation axes for visual interest - actually no, the requirement just says "spins on its own axis" which is Y axis by default. I'll keep it simple.

One more thing - I should make sure the orbit lines don't interfere with anything. They're just visual aids.

I think the code is complete and correct. Let me write the final version.
