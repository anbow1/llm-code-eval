```ts
import * as THREE from 'three';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1a);

const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(6, 5, 9);
camera.lookAt(0, 0, 0);

// ---------- Shaders ----------
const vertexShader = /* glsl */ `
    uniform float uTime;
    varying float vHeight;

    float wave(vec2 p, float t) {
        float w = sin(p.x * 1.5 + t * 1.2) * 0.35;
        w += sin(p.y * 2.0 + t * 1.7) * 0.25;
        w += sin((p.x + p.y) * 3.0 + t * 2.3) * 0.12;
        w += cos((p.x - p.y) * 1.1 - t * 0.9) * 0.18;
        return w;
    }

    void main() {
        vec3 pos = position;

        // PlaneGeometry is created in the XY plane; this shader runs
        // before/after the object is rotated to the XZ plane, so we
        // displace along Z (the plane's local "up" after rotation? No:
        // we displace along the local normal direction). We compute the
        // wave from the local XY coordinates and push local Z. When the
        // mesh is rotated -90deg about X, local Z becomes world +Y.
        float h = wave(pos.xy, uTime);
        pos.z += h;

        vHeight = h;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    varying float vHeight;

    void main() {
        // Normalize height roughly to [0, 1]
        float h = clamp((vHeight + 0.9) / 1.8, 0.0, 1.0);

        vec3 deepBlue = vec3(0.02, 0.12, 0.36);
        vec3 midBlue  = vec3(0.05, 0.42, 0.65);
        vec3 teal     = vec3(0.20, 0.70, 0.70);
        vec3 foam     = vec3(0.97, 0.99, 1.00);

        vec3 color;
        if (h < 0.35) {
            color = mix(deepBlue, midBlue, h / 0.35);
        } else if (h < 0.7) {
            color = mix(midBlue, teal, (h - 0.35) / 0.35);
        } else {
            color = mix(teal, foam, (h - 0.7) / 0.3);
        }

        gl_FragColor = vec4(color, 1.0);
    }
`;

// ---------- Ocean mesh ----------
const uniforms = {
    uTime: { value: 0.0 }
};

const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const ocean = new THREE.Mesh(geometry, material);
ocean.rotation.x = -Math.PI / 2; // lay flat in the XZ plane
scene.add(ocean);

// ---------- Resize ----------
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Animation ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    uniforms.uTime.value += delta;

    renderer.render(scene, camera);

    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// ---------- Test hooks ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```