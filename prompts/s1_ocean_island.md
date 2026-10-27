# s1_ocean_island: prompt for comparisons

Suite `scene` ([README](../README.md)). Send the **system** and the **user** prompt below unchanged, as two
messages (or, where the tool has no system prompt, the system text first and then the user text in one message).
The local models get exactly this, with 60 min and 98,304 tokens per task.

How the answer is run: one TypeScript file, bundled with esbuild against Three.js 0.186.1
(`three` and `three/addons/...`), compiled with `tsc --strict`, opened in Chromium at 1280 x 720
with a software WebGL renderer (SwiftShader).

**Chat or API:** save the whole reply as `s1_ocean_island.md` (the ```ts block is taken from it).
**Agent harness** (Claude Code, Codex, Cursor and the like): add one line to the user prompt,
"Write the file to main.ts instead of replying with a code block.", then save it as `s1_ocean_island.ts`.
Do not let the agent install other packages or add an HTML file: only the TypeScript file is used.

Grade it like a local run (it goes to the same tables and gallery):

```
python run_eval.py --suite scene --tasks s1_ocean_island --from-file answers/ --label <Model-Name>-<harness>
```

Optional `answers/s1_ocean_island.json` with `{"minutes": 12.5, "tokens": 48000, "reasoning_tokens": 30000}` adds time and
tokens to the tables.

## System prompt

```text
You are an expert TypeScript and Three.js developer.
Write ONE complete TypeScript file for the browser.

Hard rules:
- Import Three.js as: import * as THREE from 'three';  Addons from 'three/addons/...'.
- The file must compile with `tsc --strict` with zero errors.
- Create the WebGLRenderer yourself and append its canvas to document.body. The page has no other HTML.
- Size the renderer from window.innerWidth / window.innerHeight and handle window resize (camera aspect + renderer size).
- Use renderer.setAnimationLoop for the render loop. Motion must use delta/elapsed time, not frame counts.
- Expose for testing:
    (window as any).__scene = scene;
    (window as any).__camera = camera;
    (window as any).__renderer = renderer;
- After the first frame is rendered, set (window as any).__ready = true.
- No external assets (no textures, models, fonts or network requests).

Reply with a single ```ts code block and nothing else.
```

## User prompt

```text
Build a realistic, good-looking 3D scene: a small boat rocking on an ocean next to a tropical island.
Graphics quality matters: aim for a picture that looks like a game, not a demo.

Ocean
- A large water surface (at least 400 x 400 units, centered on the origin) animated in a vertex shader (ShaderMaterial, or a
  built-in material extended with onBeforeCompile). Use a sum of at least 3 directional waves (Gerstner or sine) with
  different directions, wavelengths and speeds; waves must be clearly visible (crest-to-trough height about 0.5 to 2 units).
- Shade the water well: normals from the waves, a deep/shallow color, Fresnel reflection of the sky, a specular highlight
  from the sun; foam near crests or near the shore is a plus.
- Expose the same wave function to JavaScript:
    (window as any).__ocean = { heightAt(x: number, z: number, t: number): number, time(): number }
  heightAt returns the vertical displacement your shader applies at the undisplaced position (x, z) at wave time t
  (for Gerstner waves ignore the small horizontal shift). time() returns the wave time in seconds that the shader uses
  right now. The two must match the picture.

Boat
- A boat built from primitives (hull, deck or cabin, mast and sail; at least 3 meshes in one Group), about 4 units long,
  floating at about (12, 0, 14) and staying within 25 units of the origin (it may drift slowly).
- Every frame its height follows the water: y = heightAt(x, z, time()) plus a constant offset, and its pitch and roll
  follow the wave slope (sample heightAt in front of, behind and beside the hull).
- Expose the Group as (window as any).__boat. Its meshes cast shadows.

Island
- A procedural island centered on the origin: about 30 to 50 units across, peak 5 to 15 units above the water, sloping
  into the sea, with sand near the water and grass or rock higher up (vertex colors, a shader, or several materials).
- At least 5 palm trees on it: a curved trunk and a crown of leaves. Draw ALL leaves of all palms as ONE InstancedMesh
  with at least 30 instances, and sway them in the wind by updating the instance matrices every frame
  (instanceMatrix.needsUpdate = true). Expose it as (window as any).__leaves.
- Expose the island (Mesh or Group) as (window as any).__island; it receives shadows.

Light and atmosphere
- A sky: a gradient sky dome or the Sky addon ('three/addons/objects/Sky.js'), with a visible sun position.
- A DirectionalLight as the sun, matching the sky's sun direction, casting shadows (renderer.shadowMap.enabled, a shadow
  camera that covers the island and the boat). Expose it as (window as any).__sun. Add hemisphere or ambient fill light.
- scene.fog that blends the far ocean into the horizon, ACESFilmic (or AgX) tone mapping, sRGB output.

Camera and performance
- PerspectiveCamera at exactly (35, 12, 35) looking at (0, 2, 0); keep this view (OrbitControls are allowed if they start
  there and do not move by themselves).
- It must run smoothly on a mid-range GPU: keep the ocean grid at or below 256 x 256 segments and shadow maps at or below
  2048 x 2048.
```
