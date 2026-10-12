import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Custom inversion shader.
//
// The EffectComposer chain works in *linear* color space (the background color
// 0x336699 is converted sRGB -> linear when assigned to scene.background, and
// RenderPass renders into a linear HalfFloat target). The OutputPass at the
// end of the chain converts linear -> sRGB when writing to the screen.
//
// Inverting in linear space would NOT produce the exact sRGB complement on
// screen (the sRGB transfer function is non-linear). To guarantee that the
// final on-screen color is the exact inverse of the no-effect result:
//
//   1. convert linear -> sRGB inside the shader,
//   2. invert the sRGB values,
//   3. convert sRGB -> linear again and write into the (linear) buffer,
//
// so that the OutputPass' final linear -> sRGB encoding reconstructs exactly
// the inverted sRGB color.
// ---------------------------------------------------------------------------
const InvertShader = {
	uniforms: {
		tDiffuse: { value: null as THREE.Texture | null }
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
	`,
	fragmentShader: /* glsl */`
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		// Exact sRGB transfer function (matches three.js' color management).
		vec3 linearToSRGB( vec3 c ) {
			vec3 lo = c * 12.92;
			vec3 hi = pow( max( c, vec3( 0.0 ) ), vec3( 1.0 / 2.4 ) ) * 1.055 - 0.055;
			return mix( lo, hi, vec3( greaterThan( c, vec3( 0.0031308 ) ) ) );
		}

		vec3 sRGBToLinear( vec3 c ) {
			vec3 lo = c / 12.92;
			vec3 hi = pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) );
			return mix( lo, hi, vec3( greaterThan( c, vec3( 0.04045 ) ) ) );
		}

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );

			// Buffer holds linear values -> encode to sRGB first.
			vec3 srgb = linearToSRGB( max( texel.rgb, vec3( 0.0 ) ) );

			// Invert in sRGB space so the screen shows the exact complement.
			vec3 inverted = vec3( 1.0 ) - srgb;

			// Decode back to linear; OutputPass will re-encode on the way to screen.
			gl_FragColor = vec4( sRGBToLinear( inverted ), texel.a );
		}
	`
};

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x336699 );

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set( 0, 0, 4 );
camera.lookAt( 0, 0, 0 );

const sphere = new THREE.Mesh(
	new THREE.SphereGeometry( 1, 32, 32 ),
	new THREE.MeshBasicMaterial( { color: 0xffffff } )
);
scene.add( sphere );

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild( renderer.domElement );

// ---------------------------------------------------------------------------
// Post-processing: RenderPass -> Invert ShaderPass -> OutputPass
// ---------------------------------------------------------------------------
const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );
composer.addPass( new ShaderPass( InvertShader ) );
composer.addPass( new OutputPass() );

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
window.addEventListener( 'resize', () => {
	const width = window.innerWidth;
	const height = window.innerHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	renderer.setSize( width, height );
	composer.setSize( width, height );
} );

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------
( window as any ).scene = scene;
( window as any ).camera = camera;
( window as any ).renderer = renderer;
( window as any ).composer = composer;
( window as any ).ready = false;

// ---------------------------------------------------------------------------
// Render loop (no motion in this scene; render via the composer)
// ---------------------------------------------------------------------------
let firstFrameDone = false;

renderer.setAnimationLoop( ( _time: number ) => {
	composer.render();

	if ( ! firstFrameDone ) {
		firstFrameDone = true;
		( window as any ).ready = true;
	}
} );
