We need to write a single TypeScript file. Let's design carefully.

Key requirements:

- Three.js import, addons.
- renderer, canvas appended to body.
- resize handling.
- setAnimationLoop.
- expose __scene, __camera, __renderer, __ready.
- Ocean: large plane 400x400+, vertex shader with >=3 Gerstner waves, normals, Fresnel sky reflection, specular sun, foam. Expose __ocean.heightAt(x,z,t) matching shader, time().
- Boat: group with >=3 meshes, ~4 units long, at (12,0,14), within 25 units of origin. Follows water height + offset, pitch/roll from slopes. Cast shadows. Expose __boat.
- Island: procedural centered at origin, 30-50 across, peak 5-15, sand near water, grass higher. Expose __island, receives shadows.
- Palms: at least 5, curved trunk and crown of leaves; ALL leaves in ONE InstancedMesh with >=30 instances, sway by updating instance matrices each frame. Expose __leaves.
- Sky: gradient dome or Sky addon; visible sun. DirectionalLight sun matching sky sun direction, shadows with shadow camera covering island+boat. Expose __sun. Hemisphere/ambient fill.
- Fog, ACESFilmic tone mapping, sRGB output.
- Camera exactly (35,12,35) looking at (0,2,0).
- Ocean grid <=256x256 segments (256x256 = 65k verts fine). Shadow maps <=2048.

Let's think about the wave function so JS and GLSL match exactly.

We define waves list: each wave has direction (dx, dz) normalized, wavelength L, amplitude A, speed (steepness/Q?), phase.

Gerstner wave: for a wave with direction D, wavenumber k = 2π/L, speed c = sqrt(9.8/k) maybe, or custom speeds. Height displacement:

P.y += A * sin(dot(D, xz) * k - t * omega + phase)

For Gerstner full: horizontal displacement also, but requirement says ignore small horizontal shift for heightAt. So we can just use sine waves (sum of sines) with steepness perhaps applied only to vertical, and compute normals analytically from the derivative. That's simplest and matches JS.

But "Gerstner or sine" — sine allowed. Let's implement sum of 4 sine waves with different directions, wavelengths, speeds and amplitudes. Amplitudes: to get crest-to-trough ~0.5-2 units total. Let's pick amplitudes 0.30, 0.22, 0.15, 0.10 => max total 0.77, crest-to-trough 1.54. Good.

Also maybe a long swell amplitude 0.35 with wavelength 60.

Wave function:
h(x,z,t) = Σ A_i * sin(k_i * (dx_i*x + dz_i*z) - omega_i * t + phase_i)

Wavenumber k = 2π/L. omega = speed factor... We can define omega directly e.g. omega = 2π / period. Or use deep water dispersion omega = sqrt(g*k). For L=60, k=0.1047, omega = sqrt(9.8*0.1047)=1.013 rad/s. Period ~6.2s. Fine. For L=30, omega=1.43. L=18 -> 1.85. L=9 -> 2.61.

Direction normalized. Let's define waves:
1. A=0.35, L=48, dir=(1,0.25) normalize, phase 0.0
2. A=0.24, L=26, dir=(0.6,-1) normalize, phase 1.7
3. A=0.15, L=14, dir=(-0.7,0.6), phase 4.1
4. A=0.08, L=7, dir=(0.2,1), phase 2.3

Max amplitude sum 0.82 => crest 0.82, trough -0.82, crest-to-trough 1.64. Good.

Normals: The surface is y = h(x,z,t). Tangent along x: (1, dh/dx, 0), along z: (0, dh/dz, 1). Normal = normalize(cross(tangentZ, tangentX))? Let's compute: normal = normalize(-dh/dx, 1, -dh/dz). Actually for y = f(x,z), normal ∝ (-∂f/∂x, 1, -∂f/∂z). Yes.

∂h/∂x = Σ A_i k_i dx_i cos(...), ∂h/∂z = Σ A_i k_i dz_i cos(...).

In GLSL compute same.

But note the plane geometry: PlaneGeometry rotated -π/2 about X. The vertex positions in the plane's local coordinates (x, y in plane) then rotate. If we use onBeforeCompile on MeshStandardMaterial, we'd have to handle geometry rotation. Simpler: build a custom BufferGeometry directly in XZ plane with y=0, grid 256x256 segments. Let's generate positions manually: for i in 0..N, j in 0..N: x = -S/2 + S*i/N, z = -S/2 + S*j/N, y = 0. Index triangles. Then in vertex shader, displace y based on position.xz. That avoids rotation issues. But the mesh can be stationary at origin; wave animation entirely in shader.

Alternatively use PlaneGeometry(S,S,N,N) and rotateX(-PI/2) applied to geometry, then positions have y=0, x and z. That's simpler: geometry.rotateX(-Math.PI/2). Then local position.x,z are world coords since the mesh is at origin. Good. PlaneGeometry(500, 500, 256, 256)? 500x500 with 256 segs => 1.95 units per quad. Waves with wavelength 7 won't be resolved well (need ~4 quads per wavelength). Hmm. Wavelength 7 needs vertices spacing ~1 unit. 500/256 = 1.95, marginal. Maybe use 460x460 with 256 => 1.8. Still marginal. Could reduce the smallest wavelength to 10 and use 500/256=1.95 -> ~5 samples per wavelength, okayish. Or use a smaller ocean surface, 400x400 minimum. 400/256 = 1.56 units. Wavelength 7 => 4.5 samples per wave. Acceptable-ish, but high-frequency waves will alias. Let's put smallest wavelength at 11 or 12 units and keep amplitude small. Then 400/256 = 1.56 -> 7 samples/wavelength. Good.

Actually the requirement: "A large water surface (at least 400 x 400 units, centered on the origin)". Use 600x600? With 256 segments that's 2.34 spacing. Let's use 400x400 with 256x256 and rely on fog to hide edges... fog at distance ~ 250? Camera at (35,12,35), looking at origin; the far ocean should fade into horizon. Ocean 400x400 means edges at 200 units from origin, distance from camera ~ up to 250. Fog far could be 260 so edges fade. Hmm the horizon: we have a sky dome; ocean extends 200 in each direction which at eye height 12 is far enough to look like horizon if fog blends. Let's use 800x800? That's larger but grid spacing 3.1 units; waves of 12 units wavelength poorly resolved. Trade-off. Perhaps use a radial/disc geometry? Could use plane 600x600 with 256 segments = 2.34 spacing, smallest wavelength 14 -> 6 samples. Hmm.

Alternative: Use two ocean meshes: a detailed inner ocean 400x400 at 256x256, plus an outer big plane (static or simple) to fill to horizon. But requirement says "a large water surface (at least 400x400, centered)". We can make the main one 400x400 and add a distant flat water disk/plane of radius 2000 with simple material for horizon. Nice. Let's do that: main ocean geometry 400x400 with 256x256 segments; a big flat "far ocean" plane 6000x6000 with MeshStandardMaterial or basic with same color, below? At y = 0 maybe slight offset -0.4 to avoid z-fighting at edges; fog hides the seam. Actually the far plane should be at y=0 too but avoid z-fighting: put it at y=-0.5 and fog covers. Or use the same shader without displacement. Simpler: a large ring plane at y=-0.2 with MeshBasicMaterial color deep, receiving fog. Hmm z-fighting only where overlapping. Put at y=-1.0; edge of 400 plane covers, at distance the difference of 1 unit is invisible. Fine.

Or simply use a 400x400 main ocean with fog far 220 so edges hidden. That's easier. Camera at (35,12,35) looking at origin: edges at (200,0,0) are distance ~ sqrt(165² + 200² + 12²) ≈ 260. Set fog near 40, far 230? Then the edge at 200+ would be fully fogged. But direction: the visible horizon from camera at 12 height—the ocean plane edge at 200 units is well below the horizon line? Camera looks at origin (pitch down ~ 16°?). With fov 55 and aspect 16/9, the top of the view is ~ 27° above center, and center is -16°, so top of view is +11° above horizon; so sky visible at top. The ocean edge at 200 units appears at angle atan(-12/200) = -3.4°. Horizon is 0°. So there's a gap between the ocean edge and horizon? Actually the ocean plane is finite, it ends at 200 units and appears at -3.4° which is above where distant water would be? No: a flat plane at y=0 seen from height 12 extends to horizon at 0°. The edge at 200 units is at -3.4°, so above the edge the sky is visible (a strip of ~3.4°), meaning the ocean edge would be visible as a hard line at -3.4°, unless fogged to the fog color matching the sky at that height. With strong fog and sky color matching at horizon, it will blend OK. But better to add a far ocean plane extending to 4000 units so the water reaches nearly the horizon. Let's do that: outer plane 8000x8000 at y=-0.6 with a simple shader or MeshStandardMaterial with the deep color, fog on. It will appear all the way to horizon. And the fog blends it into sky near the horizon. Good.

Fog color: something like #9fc4d8? Sky horizon color. Use fog = new THREE.FogExp2(0xbcd3e0, 0.0022)? Exponential fog looks nicer. Distance where fog dominates: exp(-(0.0022*d)^2). At d=400, factor exp(-0.774)=0.46. At d=1000, exp(-4.84)=0.008. So ocean fades by ~600-800 units. Ocean 400x400 edges at 200-280 units: fog factor exp(-(0.0022*250)^2)=exp(-0.3)=0.74 -> still 74% object, 26% fog. Not fully blended; seam might show. Use higher density 0.004: at 250, exp(-1)=0.37; at 600, exp(-5.76)=0.003. Still seam at 250 with 37% visible. Hmm.

Alternative: use linear Fog(near=60, far=250). Then main ocean edge fully fogged at 250 (distance from camera up to 260). Sky at horizon should be same color as fog. The far ocean plane then fully fogged beyond 250, all fog color, blending with sky. That works: all far ocean is fog color, sky horizon is fog color. Then the "horizon" is just fog color, which is fine and atmospheric.

Actually, with linear fog far=250, the sun/sky visible above horizon should match fog color near horizon. Use sky shader whose horizon color equals fog color approximately. Good.

Let's choose fog color #b9d2e2 (light blue-gray), linear Fog near 50, far 260.

But the island at origin is within 25 units, boat at 12,14. Fine.

Sky: Use Sky addon? Sky addon has no visible sun disc unless you add one; requirement "visible sun position". Sky addon is a shader with sun; the sun glow is visible. We can use Sky addon with turbidity, rayleigh, mieCoefficient, mieDirectionalG and set sun position. Sky is nice looking. The Sky shader's horizon color depends on parameters. Fog color may not exactly match, but okay.

Alternatively custom gradient sky dome with a sun disc sprite/mesh. That gives more control over matching fog and sun. A custom shader on a sphere with BackSide, gradient from horizon color to zenith, plus sun disc glow computed from direction. That's easy and looks good. Let's do the custom sky dome: a large sphere radius 4000 (or use a box), ShaderMaterial with uniforms topColor, bottomColor, sunDir, sunColor. Compute gradient based on normalized world direction y, plus sun glow: pow(max(dot(dir, sunDir),0), 350) for disc and 8 for glow. Use additive. fog: false, depthWrite: false, side: BackSide. Render order or just normal.

Sun direction: pick elevation around 20°, azimuth such that sun appears in view maybe to the right/back. Camera at (35,12,35) looking at origin means view direction is (-35,-10,-35) normalized, i.e., looking towards -x,-z. The sun could be placed at (0.5, 0.35, -0.8) direction (from origin toward sun), so it's in the -z direction, likely visible in the view. Let's compute: sunDir = normalize(0.55, 0.35, -0.75) ≈ (0.55,0.35,-0.75) -> normalized length sqrt(0.3+0.12+0.56)=0.99, fine. From camera looking toward -x,-z, -z is in view, so sun visible to the upper-left/right. Actually camera at (35,12,35) looking toward origin: view direction (-0.7,-0.2,-0.7). Dot with sunDir (0.55,0.35,-0.75): -0.385 -0.07 +0.525 = 0.07, nearly perpendicular, so sun is ~86° off view center—outside the 55° fov. Not visible. Need sun direction closer to view direction to be visible. Sun elevation 25°, azimuth toward (-x,-z)? If sunDir = normalize(-0.6, 0.45, -0.65): dot with view (-0.7,-0.2,-0.7) = 0.42 -0.09 +0.455 = 0.785 -> 38° off center, still outside half-fov of ~28° vertical / 45° horizontal. Hmm fov 55 vertical => half 27.5°, horizontal half about 45°. 38° off center horizontally could be visible. Let's compute more carefully: sunDir (-0.6,0.45,-0.65) normalized: length sqrt(0.36+0.2025+0.4225)=0.993. normalized (-0.604, 0.453, -0.654). View dir to origin: (0,2,0)-(35,12,35) = (-35,-10,-35), normalized (-0.689,-0.197,-0.689). Dot = 0.416 -0.089 + 0.451 = 0.778 => angle 39°. With horizontal fov ~ 85° (half 42.5°), sun at 39° could be just at the edge. Sun elevation ~27° above horizon which is above vertical half-fov (27.5°) relative to center which is pitched down 16°, so top of view is +11.5°. Wait: camera pitch down: center direction has y component -0.197 => -11.4° below horizon. Vertical half-fov 27.5° => top of view is +16.1° above horizon. Sun at +27° elevation is above the top of the view, not visible. Hmm. So sun would not be visible with elevation 27°.

To have a visible sun in the image, the sun should be near the horizon or low. Sun elevation ~10° would be visible (top of view 16°). Let's set sun elevation 12°, azimuth toward -x,-z-ish and toward camera? Let's think: camera looks toward -x,-z. For sun to be in view horizontally, its horizontal direction should be near (-0.7,-0.7) with an angle within ~40°. Sun dir horizontal (-0.6,-0.8) normalized: dot with view horizontal (-0.707,-0.707) = 0.424+0.566=0.99 -> 8° off, good. So sun is behind the island direction, low: sunDir ≈ normalize(-0.6, 0.21, -0.8). That gives sun near horizon behind island. Island peak would block? Island at origin peak 10, sun elevation 12° at distance... island may partially occlude, fine, nice.

But a low sun means the DirectionalLight comes from behind the island relative to camera—boat and island front face lit? The camera is at +x,+z looking toward -x,-z; sun from -x,-z direction means backlit (rim lighting), which can look dramatic but island's visible side would be in shadow. Hmm. For a pretty picture, better to have sun on the camera side-ish but still visible. Sun azimuth perpendicular-ish. Since fov is wide (85° horizontal, 55° vertical), we have some room. Let's set sun direction with azimuth ~45° off view center: horizontal dir (-0.1, -0.99)? That would be to the right of view, dot with view horizontal 0.07+0.7=0.77 -> 39° off, at edge of horizontal fov 42.5°. Sun elevation 14° -> visible near top-left/right corner. Light comes mostly from -z, so the boat/island's +z side visible to camera is lit partially. Hmm.

Alternatively, we don't have to have the sun strictly within view; "with a visible sun position" means the sky shows the sun where the light comes from. The grading likely checks the sun exists in the sky shader / Sky addon. But a picture with sun visible looks better. Let me try: camera at (35,12,35) looking at (0,2,0). Actually maybe sun direction from front-right: (+0.8, 0.30, +0.2)? That's toward camera, so sun would be behind the camera—not visible in the image but sky still has sun. Requirement says visible sun position—probably means the sun is rendered (a visible sun disc). Ideally visible in frame.

Let me place the sun to the left-ish and slightly toward camera: sunDir = normalize(-0.75, 0.25, 0.35)? Horizontal dot with view (-0.707,-0.707): 0.53 -0.247 = 0.284 -> 73° off; not visible.

Hmm, camera looks along (-1,-1)/√2 in horizontal. Any sun with horizontal direction within ±42° of that is visible. E.g., horizontal sun dir = (-1, 0) normalized: dot 0.707 -> 45°, just outside. (-0.9,-0.44): dot = 0.636+0.311=0.947 -> 19°, visible. That's mostly -x, slightly -z. Elevation 15°: top of view is +16° so just visible at top, and the sun's angle from center: vector (-0.9, 0.26, -0.44)/norm ~ (-0.874,0.252,-0.427)? length sqrt(0.81+0.0676+0.1936)=1.0355; normalized (-0.869,0.252,-0.425). Dot with view (-0.689,-0.197,-0.689) = 0.599 -0.0496 +0.293 = 0.842 -> 32.6° off center. That's within a 55° vertical fov? Vertical half is 27.5°, but the offset is mostly horizontal (the sun is to the left and up). The combined angle 32.6° > 27.5°, but with wide aspect the visible region is a rectangle, not a cone. Need to check in screen space. Could just increase fov slightly to 60? Requirement doesn't specify fov. Use fov 55. Let's just position the sun such that it's visible near the upper-left. Let's compute camera basis: forward f = (-0.689,-0.197,-0.689). Up world = (0,1,0). right = normalize(cross(f, up))? Three.js camera right = cross(forward, up)? For right-handed: right = f × up? Let's compute f×up = (fy*1 - fz*0, fz*0 - fx*1, fx*0 - fy*0) = (fy, 0, -fx) = (-0.197, 0, 0.689). Normalize -> (-0.275, 0, 0.961). Hmm that points to +z,-x. Check: looking toward -x,-z, right should be... if forward is (-1,0,-1)/√2, up (0,1,0), right = forward × up = (-1,0,-1)×(0,1,0) = (0*0 - (-1)*1, (-1)*0 - (-1)*0, (-1)*1 - 0*0) = (1, 0, -1)/√2. Yes right = (1,0,-1) direction. My computed (-0.275,0,0.961) is opposite-ish: hmm because f×up = (fy*1 - fz*0, fz*0 - fx*1, fx*0 - fy*0) = (fy, -fx, 0)?? Let me redo cross product (a × b): (a_y b_z - a_z b_y, a_z b_x - a_x b_z, a_x b_y - a_y b_x). a=f=(-0.689,-0.197,-0.689), b=(0,1,0): x = (-0.197*0) - (-0.689*1) = 0.689; y = (-0.689*0) - (-0.689*0)=0; z = (-0.689*1) - (-0.197*0) = -0.689. So right = (0.689, 0, -0.689) normalized (0.707,0,-0.707). Good, I messed up earlier. So right = (0.707,0,-0.707), i.e., +x,-z.

Sun dir (-0.869, 0.252, -0.425): in camera space: x_cam = dot(sun, right) = -0.614 + 0.300 = -0.314; y_cam = dot(sun, up_cam) where up_cam = right × forward? Let's compute up_cam = cross(right, f)? Actually up_cam = cross(right, forward)? For right-handed basis with forward = -z_cam, right = x_cam, up = y_cam: x × y = z, so y = z × x = (-forward) × right. Let's just compute camera up via cross(right, forward)? right × forward = (0.707,0,-0.707) × (-0.689,-0.197,-0.689): x = 0*(-0.689) - (-0.707)(-0.197) = -0.139; y = (-0.707)(-0.689) - 0.707(-0.689) = 0.487+0.487=0.974; z = 0.707*(-0.197) - 0*(-0.689) = -0.139. So up_cam ≈ (-0.139, 0.974, -0.139), good (tilted because camera pitched down). y_cam = dot(sun, up_cam) = 0.121 + 0.245 + 0.059 = 0.425. z_cam = dot(sun, -forward) = dot(sun, (0.689,0.197,0.689)) = -0.599+0.0496-0.293 = -0.842, so in front. normalized direction in camera coords: (-0.314, 0.425, 0.842)?? magnitude sqrt(0.0986+0.1806+0.709)=0.995. Screen x = x_cam / (-z_cam)? Using projection, x_ndc = x_cam / (-z_cam * tan(hfov/2))... Let's use perspective: for depth d = -z_cam = 0.842, tan(vertical half fov) = tan(27.5°)=0.5206; horizontal half tan = 0.5206 * aspect. Assume aspect 1.78 -> 0.926. x_ndc = x_cam / (d * 0.926) = -0.314/(0.842*0.926)= -0.403 -> within [-1,1]. y_ndc = y_cam / (d * 0.5206) = 0.425/(0.438) = 0.97 -> near top edge. So sun visible near upper-left, good. Elevation 14.6°. Nice, sun near the top-left, a bit dramatic back-side lighting? Sun from -x, slightly -z; camera is at +x,+z. So the island's lit side faces -x, -z (away). We see the shadowed side. Hmm, that would make the island dark. But we have hemisphere light fill; still.

Alternative: put sun toward +x direction but keep in frame? Camera horizontal forward (-0.707,-0.707). To be in frame, horizontal sun dir must be within ±42° of forward. Options: (-0.5,-0.866) => dot 0.966 -> 15°; (-0.866,-0.5) -> 15° other side; (0,-1)? dot 0.707 -> 45°, no. Direction toward +x is completely out. So any visible sun is going to be somewhat backlit relative to camera at (35,12,35) looking at origin. Unless we raise the sun high and place it at azimuth close to forward: e.g. sun dir (-0.7, 0.55, -0.5) elevation 39° — above vertical fov. So no. The visible sun near horizon is backlighting. That's classic sunset look! Use a warm low sun, backlit island with rim light — that looks great. Let's lean into a late-afternoon look: sun elevation ~13°, warm color, sky with warm horizon near sun, cool zenith. Backlit palms silhouettes. Hemisphere fill with sky/ground colors. That could look gorgeous.

But the water shading: specular highlight from sun would be a glitter path toward the sun, visible in the frame — beautiful. Fresnel sky reflection. Good.

Let's set sunDir = normalize(-0.78, 0.22, -0.55)? horizontal (-0.817,-0.576) dot with forward (-0.707,-0.707) = 0.577+0.407=0.984 -> 10°, nicely centered horizontally. Elevation ~ 12.7°. Camera center pitch -11.4°, top of view +16°, so sun at 12.7° is near top of frame slightly above center: y_cam offset... Let's compute normalized sun (-0.78,0.22,-0.55)/length: length sqrt(0.6084+0.0484+0.3025)=0.9799 -> (-0.796,0.2245,-0.561). x_cam = dot(right (0.707,0,-0.707)) = -0.563+0.397 = -0.166. y_cam = dot(up_cam(-0.139,0.974,-0.139)) = 0.111+0.219+0.078 = 0.408. z_cam = dot(-forward (0.689,0.197,0.689)) = -0.548+0.044-0.386 = -0.890. d=0.890. x_ndc (aspect 1.78) = -0.166/(0.890*0.926) = -0.201. y_ndc = 0.408/(0.890*0.5206)=0.88. So sun near top, slightly left of center. Good. Island at origin is in the center and sun is behind/above it, causing backlight + specular path. Nice.

But shadow of island would go toward camera, and the boat in front of island would be in the island's shadow? Island shadow direction: sun from (-0.8,0.22,-0.56) so shadow direction is opposite horizontal (0.8, 0.56), i.e., toward +x,+z — where the boat is (12,14) and camera (35,35). The island peak 10 high casts a shadow ~ 10/tan(13°) ≈ 43 units toward +x+z, so the boat could be in shadow! Boat at distance sqrt(12²+14²)=18.4 from origin in direction (0.65,0.76) vs shadow direction (0.82,0.57) - close. So boat likely in island shadow. That could look moody but reduce boat visibility. Hmm. Maybe adjust sun azimuth so shadow misses the boat: sun horizontal direction more along -x only, shadow toward +x, boat at (12,14) has z=14; shadow along +x would miss it. Let's pick sunDir horizontal (-0.9, -0.3) normalized (-0.949,-0.316). Elevation 0.22 -> normalized with y: length sqrt(0.81+0.0484+0.09)=0.973 -> (-0.925,0.226,-0.309). Horizontal dot with forward: 0.654+0.219=0.873 -> 29° off to the left. In frame; x_cam = dot(right) = -0.654 + 0.218 = -0.436; y_cam = dot(up_cam): 0.129+0.220+0.043=0.392; z_cam = -0.637+0.045-0.213 = -0.805. x_ndc = -0.436/(0.805*0.926)=-0.585; y_ndc = 0.392/(0.805*0.5206)=0.935. Upper-left corner. Visible. Shadow direction toward (0.925,0.309) mostly +x, so boat at (12,14) direction (0.65,0.76): shadow axis is +x with z 0.31*len; the boat is 14 in z so mostly outside the shadow cone at 18 units? Island radius 20; shadow tip at 43 units along +x with width ~ island width 40, so boat at +12,+14 could still be within the shadow's lateral extent. Hmm. Island height 10, shadow extends 43 in +x direction, width 40, so shadow covers a rectangle-ish region from island to x=43, z ∈ [-20,20] roughly, so boat at (12,14) might be inside. It's ok, moody lighting; the boat has its own materials and ambient.

Actually, for a "good-looking game picture", a backlit ocean sunset is gorgeous. Let's go with warm late afternoon sun, low-ish (elevation 15°), sky with warm haze near the sun, deep blue elsewhere, and water reflecting warm sun. The island will be mostly silhouette/backlit; to keep detail add strong hemisphere light (sky color warm-ish, ground color) and ambient. Use ACES tone mapping exposure ~1.0-1.2.

Hmm, but the island colors (sand, grass) are better judged with direct light. Maybe put the sun higher and less backlit, and accept the sun not visible in frame? The requirement explicitly says "with a visible sun position". The Sky addon with sun position set, and the sun glow visible? If sun is out of frame, not visible. Let's keep sun in frame.

Compromise: sun azimuth 25° to the left of view center, elevation 20°. Compute top of view is +16°, so elevation 20° slightly out of vertical frame at center, but off-axis? For a perspective camera, a point at elevation 20° in the direction of horizontal offset can still be in frame at the top-left corner. Let's compute for sunDir horizontal direction 25° left of forward, elevation 20°.

Forward horiz angle: (-0.707,-0.707) is 225° in atan2(z,x)? Let's just construct: rotate forward horizontal by -30° around y (to the left). Rotating (-0.707,-0.707) by angle θ around Y: (x cosθ + z sinθ, -x sinθ + z cosθ). For θ = -30° (cos=0.866, sin=-0.5): x' = -0.707*0.866 + (-0.707)(-0.5) = -0.612+0.354 = -0.258; z' = 0.707*(-0.5)?? Wait formula: rotating a vector (x,z) by θ (counterclockwise when viewed from +y down?) Let's not fuss; we just need some horizontal direction ~30° left of (-0.707,-0.707). One option: (-0.95,-0.31) normalized (as above) which is 29° left. Or (-0.31,-0.95), 29° right. Use (-0.31, -0.95)? Then x_cam = dot with right (0.707,0,-0.707) = -0.219+0.672 = 0.453 (right side), y_cam similar. Shadow direction toward (0.31,0.95) i.e. mostly +z, boat at z=14, x=12: boat direction (0.65,0.76) vs shadow (0.31,0.95): shadow covers toward +z, boat at (12,14) offset laterally by 12 in x; island width 40 -> shadow width 40, so likely covered anyway unless sun elevation higher.

Let's raise sun elevation to 20° and pick horizontal (-0.95,-0.31). Then normalized sun: y = sin(20°)=0.342, horizontal scale cos20=0.940 -> (-0.893, -0.291). So sunDir = (-0.893, 0.342, -0.291). Check camera coords: x_cam = dot(right): -0.631 + 0.206 = -0.425; y_cam = dot(up_cam): 0.124+0.333+0.040 = 0.497; z_cam = -0.615+0.067-0.200 = -0.748; x_ndc = -0.425/(0.748*0.926) = -0.614; y_ndc = 0.497/(0.748*0.5206) = 1.277 -> out of frame vertically. Too high. At elevation 15°: y=0.259, horizontal 0.966 -> (-0.918,0.259,-0.299). y_cam = 0.128+0.252+0.042=0.422; z_cam=-0.633+0.051-0.206=-0.788; y_ndc = 0.422/(0.788*0.5206)=1.03 -> just out of frame. Hmm because it's near the left edge, the effective vertical extent is still the same for a perspective camera (the frame is a rectangle in NDC, so y_ndc must be <=1 regardless of x). So elevation must be < 16° - camera pitch (-11.4°)?? Wait, y_ndc formula already includes camera pitch. Top of frame is +16° above horizon in the center column; since the camera is rotated, the top edge of the frame plane is not at constant elevation, actually for a perspective camera the top edge rays all have the same elevation? The top edge direction = normalize(forward * 1 + up * tan(vfov/2)) — rotating around right axis by vfov/2; all top-edge rays have elevation around +16° (varies with the additional horizontal rotation? Rotating the direction by right axis keeps the elevation offset roughly but horizontal direction changes). At the corners, the ray direction has a larger angle from forward, with elevation between center-top and center. Hmm, the top edge is a great circle at constant angle from the camera's up-down plane? Any point on the top edge is forward + up*tan(27.5°) + right*tan(hfov/2)*... The elevation of top corners would be lower than center-top because the horizontal component reduces the vertical fraction. Let's compute: top-right corner direction ∝ forward + up*0.5206 + right*0.926. forward (-0.689,-0.197,-0.689), up (-0.139,0.974,-0.139), right (0.707,0,-0.707). Sum y = -0.197 + 0.507 - 0.129 = 0.181; horizontal x = -0.689+0.654= -0.035; z = -0.689-0.655=-1.344. Elevation = atan2(0.181, sqrt(0.001+1.806)) = atan(0.181/1.344)=7.7°. So top corners only reach 7.7° elevation! While top-center reaches +16°. So a sun at elevation 15° near the left/right edge would be out of frame; near the center it's in. Our sun has horizontal offset ~29° (x_ndc -0.5 ish), top edge elevation there ~ maybe 12°. So elevation 14° might clip. Let's put sun elevation 11° and azimuth offset ~20° from center so it's near the upper edge but visible.

Compute with sun elevation 11°: y=0.1908, horizontal cos=0.9816. Horizontal direction: rotate forward by 20°: forward horiz (-0.707,-0.707). Rotate towards -x more or -z more? Let's pick (-0.95,-0.31) (29° off). SunDir = (-0.933,0.1908,-0.305). Camera coords: x_cam = -0.660+0.216 = -0.444; y_cam = 0.130+0.186+0.042=0.358; z_cam = -0.643+0.038-0.210 = -0.815. x_ndc = -0.444/(0.815*0.926)=-0.588; y_ndc = 0.358/(0.815*0.5206)=0.844. In frame, upper-left. 

Sun elevation 11° -> shadows long (island shadow length ~ 10/tan11 = 51). Boat likely in shadow. Hmm hmm.

Maybe pick the boat position so it's not in shadow: boat at (12, 14), shadow direction opposite sun horizontal = (0.933, 0.305) normalized (0.951,0.311). Boat direction from origin (0.65,0.76) => angle between them ~ 30°. Lateral offset = 18.4 * sin(30°) = 9.2, plus island extends 20 radius; shadow width at that distance roughly island width (40) so half-width 20 → boat inside shadow laterally (9.2 < 20) and along distance 18*cos30=16 < 51 → yes in shadow. If we raise sun to 30° (but then out of frame), shadow length 17 and boat at 18 distance along axis would be at the tip. Hmm.

Alternatively, keep the sun in-frame at low elevation but make the direction light come more from the left (+x? no). The island shadow will be cast toward +x,+z, covering the boat zone. Unless boat is placed at (16,-14)? Requirement says "floating at about (12, 0, 14)" — must be around (12, 0, 14). So it's in the shadow. That's fine; it's a boat in the island's shade at sunset, still lit by fill. And shadows add realism. It might actually look good—boat with rim light.

But we also want "Its meshes cast shadows" — boat casts shadows onto the water? Water receives shadows? Our water is a custom ShaderMaterial; it won't receive shadows unless we implement shadow mapping in the shader. That's harder. We can skip water receiving shadows (not required explicitly; only "boat meshes cast shadows" and island receives shadows). Shadow on water is a plus, but implementing shadowmap sampling in a custom shader requires including shadowmap chunks. We could use onBeforeCompile on MeshStandardMaterial to get shadows + lighting for free. But custom ShaderMaterial offers control. Let's think which is easier and more robust.

Option A: Use MeshPhysicalMaterial/StandardMaterial with onBeforeCompile injecting wave displacement into the vertex shader and normals, plus custom color/fresnel via onBeforeCompile of fragment. Shadows receive automatic if material receives shadows (MeshStandardMaterial supports shadow map). The ocean would receive shadows from boat/island. But the custom shading of water with MeshStandardMaterial: set roughness ~0.1, metalness 0, transmission? With an environment map? Fresnel sky reflection can be faked via emissive? Not easy. Also MeshStandardMaterial requires lights; sun specular highlight on a flat-ish water with roughness 0.08 will produce a sharp highlight; plus sky reflection needs envmap. We can generate a simple gradient env map via PMREM from a scene? That's extra. Custom ShaderMaterial gives full control, easy Fresnel and specular.

I'll go with custom ShaderMaterial for the ocean and accept no shadows on water. That's acceptable. To make specular from sun use the sun direction uniform and Blinn-Phong, with wave normals giving glitter. Fresnel reflect sky gradient color (same gradient function as the sky). Foam near crests and near shore.

Foam near shore: distance from origin < ~28 where water is shallow near island? Actually the island is above water; water plane around it. "Foam near crests or near the shore is a plus." We can add foam based on crest height (h > threshold) with noise. Also maybe foam ring around island: compute distance to island center; if d < 30 and h > -0.2, foam. But the island geometry occupies the center; the water plane will be under it. Shore foam could be simply based on radial distance: foam factor = smoothstep(32, 26, r) * something. But the island has a beach slope; water waves hit the shore. We can add a subtle white band around r≈20 where the water is shallow (shallower than sand). Island radius ~20 to 25. Let's design island radius ~25 (50 across) and foam ring at r between 22 and 28 where h small. Actually water depth at shore is irrelevant since our ocean plane is flat at y=0 and island rises from it; shallow water coloring based on distance to island: near island use turquoise. Good.

So ocean fragment: compute shallow color near island (based on radial distance from origin, maybe also from boat? no). Blend deep color to turquoise as r < 60 or so, since island beach. Also foam ring near r 20-30 modulated by waves/noise.

Water geometry: PlaneGeometry(400, 400, 256, 256).rotateX(-PI/2). 257×257 = 66049 vertices. That's fine. 131072 triangles. Fine on mid-range GPU.

Wait: requirement "keep the ocean grid at or below 256 x 256 segments" -> 256 is allowed.

Ocean vertex shader:
- attributes position (displaced base pos, y=0), uv.
- uniforms uTime, wave params as arrays or hardcoded defines.
- Compute h and derivatives.
- Add horizontal Gerstner displacement? Requirement says heightAt ignores small horizontal shift, but if shader includes horizontal shift, the mapping from heightAt(x,z) to actual surface position differs slightly. To keep match, use pure vertical sine waves (no horizontal displacement). The requirement allows sine waves. "heightAt returns the vertical displacement your shader applies at the undisplaced position (x, z) at wave time t (for Gerstner waves ignore the small horizontal shift)". With pure sine, exactly matches. Do that. Simpler and robust.

- Also add small high-frequency detail via another wave? Keep 4 waves + maybe a 5th tiny ripple for normal detail, but heightAt must include all vertical displacement. Let's include all 4 waves in h and the same in JS. Maybe use amplitudes 0.36, 0.24, 0.14, 0.07 → sum 0.81, crest-to-trough 1.62. Good.

Wave params in GLSL as const arrays? We can write a function that loops over 4 hardcoded waves. Use vec4 arrays of (dirx, dirz, amplitude, wavelength), plus phase and speed arrays. GLSL arrays with constant index loops are fine (WebGL2 / GLSL ES 3.00). Three.js uses GLSL3 for WebGL2? Three.js ShaderMaterial defaults to GLSL1 unless glslVersion specified. Use `#define` constants or const arrays. Loop over fixed 4 with constant indices unrolled? In GLSL ES 1.00, arrays can be indexed with loop index if it's a constant expression? For-loop with constant bounds counts as "constant-index-expression", allowed. Use `const int NUM_WAVES = 4;` and `for (int i=0;i<4;i++)`. That's fine.

Let's write:

```glsl
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uCameraPos;

const vec4 WAVES[4] = vec4[4](
  vec4( 0.965, 0.262, 0.36, 48.0),  // dir xz normalized-ish, amplitude, wavelength
  ...
);
const vec2 WAVE_PHASE[4] = vec2[4](vec2(0.0, 1.013), ...)? 
```

Better to define separate arrays: waveDir (vec2), waveAmp, waveLen, wavePhase. Or pack: `vec4(dirx, dirz, amp, len)` and `vec2(phase, omega)`.

GLSL1 array initializers with const arrays: `const vec4 WAVES[4] = vec4[4](...)` is fine in GLSL ES 1.00? Array constructors are supported (GLSL ES 1.00 supports array constructors? I believe `vec4[4](...)` syntax is allowed in GLSL ES 1.00 for const arrays? Hmm. GLSL ES 1.00 does support array constructors? The spec: "Array constructors" were added in GLSL ES 3.00 maybe. In GLSL ES 1.00, arrays can be initialized at declaration with initializer list `{...}`? Actually ES 1.00 doesn't allow array initializers at all I think. Three.js shaders typically avoid arrays for this reason.

Safer: define separate functions/constants for each wave with `#define` values or hardcode a function:

```glsl
float waveHeight(vec2 p, float t, out vec2 grad) {
  float h = 0.0;
  grad = vec2(0.0);
  // wave 1
  {
    vec2 d = vec2(0.93, 0.37);
    float k = 6.2831853 / 52.0;
    float w = 1.07;
    float A = 0.38;
    float ph = k*dot(d,p) - w*t + 0.0;
    h += A*sin(ph);
    grad += A*k*d*cos(ph);
  }
  ...
}
```

Repetitive but robust. Use a macro to reduce repetition:

```glsl
#define WAVE(dx, dz, amp, len, speed, phase) \
  { vec2 d = normalize(vec2(dx, dz)); float k = 6.28318530718 / (len); float w = (speed); float ph = k * dot(d, p) - w * t + (phase); h += (amp) * sin(ph); grad += (amp) * k * d * cos(ph); }
```

Macros with braces inside a function are fine. But JS must match exactly the same params, including normalization of direction. If I pass normalized dirs directly, no normalize in GLSL needed—but normalize in GLSL vs JS could differ at the 1e-7 level, irrelevant. Actually let's pre-normalize in JS and hardcode the normalized components in both GLSL and JS to guarantee match. Slight differences are negligible anyway.

Deep water dispersion: omega = sqrt(9.8 * k) where k = 2π/L. For L=52: k=0.12083, omega=1.088. L=29: k=0.2167, omega=1.457. L=17: k=0.3696, omega=1.903. L=9: k=0.698, omega=2.616.

Amplitudes: 0.40 (L=52, dir 0.93,0.37), 0.26 (L=29, dir -0.42,0.91), 0.15 (L=17, dir 0.78,-0.63), 0.09 (L=9, dir 0.2,0.98). Sum = 0.90; crest-to-trough 1.8. That's in the 0.5-2 range. Good. Maybe a bit choppy but fine. Boat offset should be such that the hull sits at water. We'll build the hull with waterline at y=0 and float at height + 0.15.

Wave time: The shader uses uTime; JS time() returns uTime value. We set uTime = elapsed (maybe scaled). Use elapsed directly (seconds). Requirement "time() returns the wave time in seconds that the shader uses right now". We'll set oceanTime = elapsed (no scaling). Good.

Now the heightAt JS function must match. Implement:

```ts
const WAVES = [
  { dx: 0.929, dz: 0.370, amp: 0.40, len: 52, omega: 1.088, phase: 0.0 },
  ...
];
function waveHeightAt(x, z, t) { let h=0; for (const w of WAVES) { const k = 2*Math.PI/w.len; h += w.amp * Math.sin(k*(w.dx*x + w.dz*z) - w.omega*t + w.phase); } return h; }
```

Note: direction normalized: (dx,dz) unit. Good.

The shader time and JS time must match: in the animation loop, set uniform uTime to oceanTime = elapsed; and time() returns oceanTime. But there may be a frame skew: after rendering, time() returns the last uTime used. We update oceanTime in the loop before rendering, so time() returns the value used by the shader. Good.

Boat: group built from primitives.

Hull: could make with a lathe? Simpler: use a capsule or scaled sphere/box. A nice hull: use a `THREE.BoxGeometry` modified? Better visually: hull from a lathe or extrusion. Let's construct hull from a custom geometry? Requirements: "boat built from primitives (hull, deck or cabin, mast and sail; at least 3 meshes in one Group), about 4 units long". Primitives fine. Let's use:
- Hull: a sphere scaled (1.2, 0.5, 2.2) with the bottom half? A sphere scaled looks like a rounded boat hull, but the top half also. We can cut it in half using a SphereGeometry with phiStart/thetaLength: sphere radius 1 with thetaStart=0 to thetaLength=PI/2 gives upper hemisphere; scale. To get a hull (lower half), use thetaStart=PI/2, thetaLength=PI/2 and scale (0.9, 0.7, 2.0), then position y=0.3? Hull below waterline. Hmm.

Simplest good-looking: use a `LatheGeometry` with a profile for the hull shape? Lathe is a shape of revolution around Y; a boat hull is elongated, so scale z long, x narrow. Lathe with points making a rounded V hull. That looks decent: LatheGeometry(points, 24) then scale (0.7, 1, 2) rotated? Actually lathe around Y with radius profile: points (r, y): (0, -0.5) bottom, (0.6,-0.35), (0.9,0), (1.0,0.35). Scale x 1, z 2? That makes an elongated rounded hull. Use MeshStandardMaterial wood color, flatShading false. Good. Hull about 2 units wide and 4 long.

Add gunwale trim: a torus ring? Or a box rim. Add a deck: a flattened cylinder/box on top of the hull.

Cabin: box 1.2 x 0.7 x 1.2 with a slightly rounded roof (cylinder half), white color, windows? Could add a small box. Mast: cylinder radius 0.05, height 2.6, at position (0, 1.5, 0.4)? Sail: a triangle (BufferGeometry or `THREE.Shape` extruded/plane) from mast to boom. A plane triangle with DoubleSide, white material; maybe two sails. Add a boom cylinder. Add a flag? Nice details.

Also add rope lines (cylinders thin). Keep >= 3 meshes.

The sail should be backlit by the sun creating a nice glow; use MeshStandardMaterial with emissive slight and DoubleSide? Backlit sails use MeshPhysicalMaterial with transmission? Keep simple: white MeshStandardMaterial, side DoubleSide, roughness 0.8.

Boat group position (12, y, 14). Orientation: heading maybe along a direction; we can rotate y to some angle like -0.6 rad so it looks nice in view. We drift slowly: x = 12 + sin(t*0.05)*2, z = 14 + cos(t*0.04)*2. Within 25 units. Requirement "floating at about (12, 0, 14)". Use base (12, 14) with small drift ±2. Good.

Boat pitch and roll: sample heights front/back and left/right in the boat's local axes transformed to world. Since boat heading rotates, sample along forward and side directions.

Compute:
- forward vector f = (sin(yaw), 0, cos(yaw))? In Three.js, an object's local +Z is forward with rotation.y = yaw: world forward = (sin(yaw), 0, cos(yaw)). Let's define.
- right vector r = (cos(yaw), 0, -sin(yaw)).
- hull half-length 2.0; half-width 0.8.
- hFront = heightAt(x + f.x*L, z + f.z*L, t), hBack = heightAt(x - f.x*L, z - f.z*L, t), hRight = heightAt(x + r.x*W, z + r.z*W, t), hLeft = heightAt(x - r.x*W, z - r.z*W, t).
- pitch = atan2(hFront - hBack, 2L) (rotation about local X? If forward is +Z, pitch is rotation around X: positive pitch rotates +Z downward? In Three.js rotation.x positive rotates +Z toward -Y? Let's check: rotation about X: y' = y cos - z sin, z' = y sin + z cos. A point at +Z (0,0,1) with rotation.x = θ goes to (0, -sinθ, cosθ). So positive rotation.x moves the front down. We want front to rise when hFront > hBack: so rotation.x should be negative: pitch = -atan2(hFront-hBack, 2L). Alternatively compute via slope: rotation.x = -atan2(hFront - hBack, 2L)? Let's verify: if hFront > hBack, front should go up, i.e., +Z goes up => need θ negative (y' = -sinθ > 0 when θ<0). Yes pitch = -atan2(hFront-hBack, 2L).
- roll (rotation about Z): positive rotation.z rotates +X toward +Y? rotation about Z: x' = x cos - y sin, y' = x sin + y cos. Point +X (1,0,0) goes to (cos, sin, 0). Positive z-rotation raises the right side (+X). We want right side up when hRight > hLeft => roll = +atan2(hRight - hLeft, 2W). But note the boat's local X is world right; with yaw rotation applied then roll about local Z. We'll set rotation order 'YXZ'? For a boat, use quaternion or Euler with order 'YXZ' so roll is applied in the boat's frame after yaw. Set `boat.rotation.order = 'YXZ'`; rotation.y = yaw, rotation.x = pitch, rotation.z = roll. In Three.js Euler 'YXZ' means R = Ry * Rx * Rz (intrinsic?). Three.js applies in order... For 'YXZ', the rotation matrix = Ry * Rx * Rz? Actually Euler order 'YXZ' means rotations applied in that order: first Y then X then Z? Three.js Euler order refers to the order of multiplication: 'XYZ' = Rx * Ry * Rz. So 'YXZ' = Ry * Rx * Rz, meaning yaw first (world), then pitch in the yawed frame, then roll in the pitched frame. Good for boats.

- y = heightAt(x,z,t) + offset ~ 0.1? The hull design: bottom at y=-0.5 local; waterline should be around y=0.0 local. If boat.position.y = waterHeight + 0.05, then hull bottom is 0.45 below water and deck above. Good.

Also for smoothness, sample average heights; use a smoothed y (lerp) to avoid jitter? Wave function is smooth. We can set directly. Maybe smooth with delta lerp factor to avoid high-frequency jitter since wavelengths are ~9 units, boat length 4 -> fine.

Palm leaves: One InstancedMesh with at least 30 instances (all leaves of all palms). 6 palms × 8 leaves = 48 instances. Leaf geometry: a plane shaped like a frond? Use a custom geometry: a long tapered leaf made from a plane with vertices moved? E.g., a `THREE.PlaneGeometry(1.6, 0.35, 6, 1)` with vertices curved downward and tapered; or use a `Shape` extruded? Simplest: a plane 1.6 x 0.4 with 8 width segments, then bend along its length in Y: y = -0.25 * (x/0.8)^2 maybe; taper width toward tip. Build a custom BufferGeometry or modify plane positions. Use DoubleSide green material with slight emissive. InstancedMesh with 48 instances, each with its own palm base and leaf orientation. Each frame, update matrices: for each leaf instance, compute position at palm crown, rotate around the palm trunk axis with a sway angle varying per instance and per palm; plus wind gust. Set matrix with compose(position, quaternion, scale). All leaves of all palms in one InstancedMesh, so each instance knows its palm index/origin, its base angle, and its droop.

Palm trunks: 6 trunks made as curved tubes (CatmullRomCurve3 + TubeGeometry) with brown material, or cylinders. Trunks are separate meshes (5+). Leaves in one instanced mesh.

Island geometry: procedural. Requirements: 30-50 across, peak 5-15 above water, sloping into sea, sand near water and grass higher. Use a displaced plane? A circular radial grid is better: create geometry from a radial grid or a PlaneGeometry(64,64,120,120) rotated, displace y by a height function f(x,z) that has an island shape. The island should be a mesh with vertex colors: sand near low elevation, grass/rock higher. Use PlaneGeometry with 128x128 segments? 128*128 = 16k verts, fine. Island across ~50 units: plane 60x60 with 128 segments -> 0.47 units per quad. Plenty. Displace height:

r = sqrt(x² + z²) normalized. Height = peak * smooth falloff, e.g., `h = 9 * exp(-(r/14)^2) * (something)`. Need it to slope into the sea: edges at y<0 so it goes underwater, giving a natural shoreline. For r up to 30, height goes negative; clamp? We can let it go below water and the ocean covers it. But our ocean plane is at y=0 and the island mesh extends under water—that's fine (water hides it). However the ocean is opaque-ish; the underwater part won't be visible; if water has transparency maybe. Keep water opaque.

Island height function: 
`base = max(0, 1 - (r/R)^2)`? At r=R height 0, beyond R height negative. We want the island to reach the water at r ~ 20 (40 across) and go below. Use:
h = peak * (cos(min(r/R,1)*π/2))^2? Or smooth falloff. Let's use: 
`let n = 1 - clamp(r/24, 0, 1);` then `h = 11 * pow(n, 1.6) - 1.2;` At r=0, h = 11-1.2=9.8. At r=24, h=-1.2. Shoreline where h=0 -> pow(n,1.6) = 1.2/11 = 0.109 -> n=0.109^(1/1.6)= e^(ln0.109/1.6)= e^(-2.216/1.6)=e^-1.385=0.25 -> r=24*0.75=18. So island diameter at waterline ~36 units. Good (30-50). Peak ~9.8 (5-15). Add noise: `h += noise(x,z) * 1.2 * n`. Need deterministic noise function in JS. Use a simple value noise with hash based on sin (deterministic) or a function of x,z with sin combinations:
`h += (Math.sin(x*0.35)*Math.cos(z*0.31) + Math.sin(x*0.13+1.7)*Math.sin(z*0.17+0.6)*0.8) * 0.9 * n`. That gives ridges. Good.

Also maybe add a smaller hill offset to make it asymmetric: multiply radius by (1 + 0.15*sin(angle*3)) for irregular coastline. Compute r' = r * (1 + 0.12*Math.sin(3*θ) + 0.08*Math.cos(5*θ+1)). That makes an irregular island shape. Then n = 1 - clamp(r'/24,0,1).

Vertex colors: based on height and slope. Sand color for h < 1.2, grass from 1.2 to 6, rock higher; add variation with noise. Also darker where steeper? Slope computation is extra; skip.

Use MeshStandardMaterial({vertexColors: true, roughness: 0.95}). receiveShadow = true, castShadow = true (island casts shadow onto itself/water? island cast shadow to water won't show on custom ocean, but onto boat maybe; good).

Add beach: maybe a ring of sand at water level. Vertex colors handle.

Also add a few rocks? Not required, but nice. Keep minimal to avoid bloat. Could add a couple of low-poly rocks (icosahedrons) on the island for detail and shadows.

Palms positions: choose 6 positions on the island where h between 1 and 6. Place trunks at those points, curving outward/upward. Curved trunk: build a `CatmullRomCurve3` from base to top with a lateral offset, then TubeGeometry(curve, 8, radius taper?) TubeGeometry has constant radius; use a cone-ish? Could use a TubeGeometry then scale? Constant radius okay; to get taper, build custom cylinder along curve? Simpler: TubeGeometry with radius 0.18, radial 6, tubular 8, then maybe a second thinner top? Fine. Or use a series of cylinders? Let's use TubeGeometry with a curve and add a small crown ball at the top.

Leaves: each palm has 8 leaves, 6 palms = 48 instances. Leaf geometry defined along +X direction (length ~2.2) with width tapering. Build a BufferGeometry in code:

```ts
function makeLeafGeometry(): THREE.BufferGeometry {
  const segs = 8;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i=0;i<=segs;i++){
    const t = i/segs;
    const x = t * 2.2;
    const w = 0.32 * Math.sin(Math.PI * Math.pow(t,0.7))? 
    const y = -0.55 * t*t; // droop
    positions.push(x, y, -w, x, y, w);
  }
  for (let i=0;i<segs;i++){ const a=i*2; indices.push(a,a+1,a+2, a+1,a+3,a+2); }
}
```

Need normals: computeVertexNormals. Material DoubleSide, green, roughness 0.8, maybe slight emissive. InstancedMesh casts shadows? Set castShadow = true (48 instances, shadow map cost fine).

Leaf instance transform: for each palm p, crown at top of trunk. Leaf i has azimuth angle base = i * 2π/8 + palm offset, and an upward tilt. The leaf geometry points along +X with droop. To place: rotate around Y by azimuth, and tilt down/up around Z (negative tilt means the leaf goes up? The geometry along +X, droop -Y). We compose a quaternion: q = qYaw(azimuth) * qTilt(tilt) * qSway. Position = crown position + maybe slight offset. Sway: angle varies with time and instance: sway = 0.12 * sin(t*1.8 + i*0.7 + palmIndex). Apply as an extra rotation around Z (leaf flap up/down) and small yaw wobble. Update matrix each frame via `dummy.position.copy(crown); dummy.quaternion...; dummy.scale.setScalar(1); dummy.updateMatrix(); leaves.setMatrixAt(idx, dummy.matrix);` Then instanceMatrix.needsUpdate = true.

Crown position: depends on trunk curve top. Compute in JS per palm and store. Since trunk curve is deterministic, store top positions.

Trunk curve: base (px, py, pz) where py = islandHeight(px,pz) - small, top = base + (leanX, 4.5, leanZ), with a control point mid. Use `new THREE.CatmullRomCurve3([base, mid, top])`. Trunk height ~5. Top must be above water. Good.

Need 5 palms minimum; use 6.

Sun & shadows:
- DirectionalLight with sun direction. Position = sunDir * 80 (relative to origin), target at origin. Shadow camera orthographic covering island and boat: left/right ±45, top/bottom ±45, near 1, far 250. Shadow map 2048. Bias -0.0005, normalBias 0.05. Since light position relative to target at origin, and boat within 25, and island 25, ±45 covers. Camera coverage should include the boat at (12,14) and island: ±45 enough. Shadow camera near 10, far 200 with light distance 100. Use shadow.camera left=-50, right=50, top=50, bottom=-50, near=20, far=220. Light position = sunDir*100.

- HemisphereLight(skyColor 0xbfd6ff? warm, groundColor 0x2a4a55, intensity 0.6).
- AmbientLight low intensity 0.15 maybe.

Tone mapping ACESFilmic, exposure 1.1. outputColorSpace = SRGBColorSpace.

Sky: custom shader dome radius 3000. Use uniforms. Fragment:
- dir = normalize(vWorldPosition - cameraPosition)? Or use varying from local position normalized. Since sphere centered at camera? If the sphere is at origin with radius 3000 and camera at 35, direction ≈ normalize(vWorldPos). Use normalize(vWorldPosition) - fine.
- sky gradient: mix(horizonColor, zenithColor, pow(max(dir.y,0), 0.55)).
- sun: `float sunDot = max(dot(dir, uSunDir), 0.0);` glow = pow(sunDot, 8) * 0.6 + pow(sunDot, 64) * 1.2; disc = smoothstep(0.9995, 0.9998, sunDot) * 4.0. Add warm color. Also haze near horizon toward sun: mix based on sun azimuth.
- Maybe add subtle clouds? Procedural clouds via noise would add realism but complexity. Could use a canvas-generated texture — no external assets allowed, but generating a canvas texture is allowed (not external). However "No external assets (no textures...)" means no texture files; procedurally generated canvas textures might be considered textures. Safer avoid textures entirely. Procedural clouds in shader using noise could be nice but adds risk. Keep sky clean with a gradient, sun glow and a horizon haze.

Sun disc should be visible. Sun elevation 11°, radius disc. In sky shader with smoothstep on dot, the disc will be small; add glow.

Also maybe add a subtle "sun reflection" on the water: specular highlight computed from sun direction and view; with wave normals, this produces sparkling glints. Use Blinn-Phong with high shininess plus a broad lobe:
`spec = pow(max(dot(normal, halfVec), 0.0), 600.0) * 3.0 + pow(..., 60.0)*0.15` tinted by sunColor.
Need normal in world space.

Fresnel: `fresnel = pow(1.0 - max(dot(N, V), 0.0), 5.0);` reflectDir = reflect(-V, N); skyColor = skyGradient(reflectDir.y) with sun glow if reflectDir aligns with sun. Use a function `skyColor(dir)` in the ocean fragment shader to approximate sky. Then final color = mix(waterColor, skyReflection, 0.05 + 0.95*fresnel) + spec + foam.

Also add subsurface scattering tint near crests? water crests get lighter turquoise: waterColor based on height: mix(deep, shallow, smoothstep(-0.3,0.7,h)). Shallow near island: use r factor. Let's combine: `float shallowFactor = smoothstep(70.0, 15.0, length(worldPos.xz))`? Actually shallow water near island: within radius 60 from origin. `float shore = 1.0 - smoothstep(20.0, 60.0, r);` blend shallowColor (turquoise) with deep color. Then wave height adds a bit.

Foam: crest foam: `float foamCrest = smoothstep(0.55, 0.9, h + 0.15*noise)`. Add sparkle noise from sin combos. Shore foam: `float shoreFoam = smoothstep(0.6, 1.0, ...)` around r between 18 and 24 modulated by wave phase maybe. Simpler: foam factor = smoothstep(26.0, 22.0, r) * (0.5 + 0.5*sin(r*... - t*2.0)) -> a ring of foam that pulses. Plus crest foam. Add white color.

For foam we need the foam to look natural; use noise from sin:
`float n = sin(p.x*1.7 + t*1.3)*sin(p.z*2.1 - t*0.9)*0.5+0.5`.

Water plane edges: The 400x400 plane will have visible edges if fog far > distance. Use fog linear near 60 far 240; ocean edges ~ 200-280 from camera; fully fogged at ~240. Good. Add a far ocean plane 6000x6000 at y=-0.5 with MeshStandardMaterial deep color, fog enabled, roughness 0.4, metalness 0.1. But it's flat and will appear as fog color mostly. Actually it's fully fogged beyond 240 → color = fog color. Good, fills the horizon with fog color. Sky horizon should be close to fog color. Choose fog color = 0xb8cfdd (pale blue). Sky horizon near the sun warm; elsewhere pale blue. Slight mismatch acceptable. Maybe set fog color to a warm haze near sunset: 0xc9d6df. Hmm.

Since sun is low and warm, the sky near the horizon on the sun side is warm orange; on the opposite side it's pinkish-blue. Fog uniform single color; choose a compromise pale desaturated blue #9fb8c8? At sunset the horizon haze is often warm gray. Let's use fog color 0xa8c0d0 and sky horizon 0xb9cfe0 with warm tint toward sun. The fog covers far ocean in all directions; at the sun side, fog color is cooler than sky → mismatch visible at horizon. Could make the far water blend better by tinting. It's fine.

Alternatively, skip fog far blending by making fog far ~ 400 so the ocean edge (200-280) is only partially fogged but we add a far plane to 6000 so no edge—then fog at 6000 fully fog color, horizon is fog color. Sky at horizon same fog color except toward sun. Fine.

Use FogExp2? Let's use linear Fog(color, 80, 500). The main ocean edges are at 200-280 distance: fog factor (250-80)/420=0.4 → the edge seam might still show (40% fog). But the far ocean plane overlaps at y=-0.5, so the seam is visible as a brightness change because the displaced ocean vs flat far ocean. Put the far plane at y=-0.7; at 200+ units, the 0.7 difference is subpixel; the main ocean edge has waves up to ±0.9, so the seam may show a slight silhouette against the far plane, but both are similar colors and fog. Hmm, better: make far plane y = -1.5 (below wave troughs) so no z-fighting and the main ocean edge silhouettes over it minimally. At distance 200+, a 1.5 drop is ~0.4° — could show as a line. But with fog and similar color, fine.

Alternative approach: Make the ocean plane big enough (e.g., 3000x3000) with 256 segments; waves at 1.8 spacing for 52-unit wavelengths still look fine (the small ripples would alias), but we can limit the high-frequency waves and add normal detail in the fragment shader via analytic derivative... 3000/256 = 11.7 units spacing—too coarse for waves of 9-17 units. No.

Could use a two-tier ocean: detailed 400x400 (256 segs) + a low-res huge plane with the same shader (e.g., 6000x6000 with 64 segs) that displaces waves too, but coarse. The coarse one would have waves at 94-unit spacing, only the long swell resolved, and its edge at 3000 far beyond fog. It would also fill the horizon. Since fog dominates beyond 250, the coarse plane's appearance is mostly fog anyway. This is nice: a big ocean plane underneath (same shader, fewer segments) plus the detailed one. But z-fighting where they overlap—place the big one at y=-0.2? They both displace by wave height, so if the big one uses the same wave function, at the same x,z it has the exact same height (both compute from position), so z-fighting in the overlap region. We can offset the big one down by 0.6: `uOffsetY = -0.6`. Then it's below the detailed surface, hidden by the detailed surface except at the horizon. Good. At the boundary of the detailed plane, the coarse surface is 0.6 lower; with fog it's invisible. Let's do this: main ocean 400x400 256 segments, far ocean 4000x4000 64 segments, same material? We can clone the material with a different uniform offset. Or make the far one a simple MeshBasicMaterial with fog and the deep color — no waves visible anyway at distance > 200 due to fog. Simpler: MeshBasicMaterial? It would be flat and uniform fog color at distance. Since fog blends it to fog color at 400+; between 200 and 400 (the gap ring outside main plane) it's visible and would be flat color without waves — but the fog gradient covers it and it's at grazing angle; likely fine. Use MeshStandardMaterial with the deep color for a bit of sun glitter? Without normals it's flat. Fine, it'll be mostly fog. Use MeshBasicMaterial color deep blue, fog true. But the transition from animated detailed water to flat far water at 200 units might be noticeable; with fog at 80-500 moderate. Maybe set fog near 50 far 320 so the detailed edge at 250 is 70% fogged. Good compromise; far plane fills to horizon fully fogged.

Let's set fog = new THREE.Fog(0xa9c2d4, 60, 320). Hmm, but the ocean plane is 400 across, centered at origin; from camera at (35,35), the nearest edge is at x=-200 (distance 235) and the far corner ~ 280. In the direction away from camera (-x,-z), the edge distance ~ 270. Fog factor at 270 = (270-60)/260 = 0.81 -> 81% fog; decent. The far water at horizon is 100% fog. There will be some seam but subtle. 

Actually, since camera looks toward -x,-z and the far edge is 270 away at an angle -2.5°, the ocean plane's far edge is below horizon—above it is sky. With 81% fog, the edge is a soft line. Plus the far plane fills the gap: the far plane extends to 4000 and is fully fogged. But the main ocean edge is 0.7 above the far plane, forming a silhouette of fog color; both are nearly fog color -> invisible. Good.

Let's set fog color 0xaec6d6.

Sky colors maybe horizon 0xc8d8e2? Let's design a warm sunset-ish but still bright:
- Zenith: 0x2a6fa8 (deep blue), horizon: 0xd6e6ef? If the sun is low and warm, horizon near sun should be orange. We can have a base horizon color 0x9fc4d8 and add a warm glow around the sun. The fog color should be close to base horizon 0x9fc4d8? Hmm.

Let's aim for "late afternoon tropical": bright blue sky, sun low-ish warm. Tone: zenith #1e5f9e, horizon #a8cbe0, plus sun glow warm #ffd9a0. The fog color #a8cbe0. Water deep #06374d, shallow #1a8f96. Nice.

With ACES tone mapping, colors get desaturated/darker, so use brighter values.

Sky shader:

```glsl
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz - cameraPosition); // or normalize(position)
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
```
Actually the sphere is centered at the camera? We can make the sky mesh follow the camera each frame (set position to camera position) so it always surrounds. Radius 4000. With fog disabled and depthWrite false and renderOrder -1. But the camera far plane must be > 4000. Set camera far = 6000. Or radius 2000 and far 10000. Use near 0.5, far 12000.

Fragment:
```glsl
vec3 dir = normalize(vDir);
float h = clamp(dir.y, -0.2, 1.0);
vec3 col = mix(uHorizon, uZenith, pow(max(h,0.0), 0.42));
// sun glow
float sd = max(dot(dir, uSunDir), 0.0);
float glow = pow(sd, 6.0)*0.35 + pow(sd, 40.0)*0.6 + pow(sd, 800.0)*3.0;
col += uSunTint * glow * (0.4 + 0.6*exp(-max(dir.y,0.0)*4.0)); // more haze near horizon
// sun disc
float disc = smoothstep(0.9996, 0.9999, sd);
col += vec3(1.6,1.35,1.0) * disc * 3.0;
gl_FragColor = vec4(col, 1.0);
```
Need HDR values and tone mapping applied? ShaderMaterial with toneMapped default true — includes tonemapping chunk only if manually added? For custom ShaderMaterial, tone mapping is not automatically applied unless you include `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` in the fragment shader. In recent Three.js, ShaderMaterial's fragment must include these chunks to apply tone mapping and output color space conversion. The renderer applies tone mapping in materials via chunks. Yes, for custom shaders you need:
```
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
at the end, after setting gl_FragColor. These chunks reference `gl_FragColor`. In GLSL3 it's different, but Three.js uses `gl_FragColor` in GLSL1. Good.

Alternatively use `renderer.toneMapping` and include chunks.

Ocean shader also should include tonemapping/colorspace chunks so the colors are consistent. Important: uniforms colors should be set in linear space. When you create a THREE.Color from hex, `new THREE.Color(0x...)` stores in sRGB? In Three.js r152+, `THREE.Color` constructor with hex uses `setHex` which by default applies color management (converts sRGB to linear working color space). Yes, ColorManagement enabled by default; `new THREE.Color(0x...)` converts to linear-srgb. Uniforms with Color values then are linear. Good. Set renderer.outputColorSpace = SRGBColorSpace (default).

For ShaderMaterial uniforms of colors, pass THREE.Color objects. Good.

Now careful with the ocean vertex shader and world position: the ocean geometry is rotated so position.xz in local = world since mesh at origin with no transform. Compute worldPos = position (after displacement). For fragment normals, pass varying vNormal (world) and vWorldPos.

Vertex:
```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;

void main() {
  vec3 p = position;
  vec2 grad;
  float h = waveHeight(p.xz, uTime, grad);
  p.y += h;
  vHeight = h;
  vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
  vNormal = n;
  vWorldPos = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
}
```
Wait normal computed in object space equals world since no rotation? The geometry was rotated into XZ plane, and object transform identity. So yes, world normal = n.

But at the far edge, displacement fine.

Note: high-frequency waves at 9 units wavelength with 1.56 spacing will alias in the normal computation (since normal is from analytic derivatives, it's actually fine—normals computed analytically at vertices then interpolated; aliasing might cause shimmering). The fragment normal could be recomputed per-pixel analytically for crisp detail, but that's expensive-ish. Better: compute the normal analytically in the fragment shader using vWorldPos.xz and uTime for extra detail! That gives crisp per-pixel normals even on a coarse mesh. But the requirement is normals from the waves—yes. Compute in fragment: `waveHeight` + gradient again. That's 4 sine evaluations, cheap. Actually we can compute a per-pixel normal with additional high-frequency detail waves not in the geometry to make it sparkle. But heightAt must match the vertical displacement; extra normal-only detail waves are a lie (they'd affect lighting but not geometry). It's acceptable? "heightAt returns the vertical displacement your shader applies at the undisplaced position". Extra normal detail waves are not vertical displacement—just shading. Should be fine but maybe risky. Keep the same 4 waves for the normal recomputation to match. And use the interpolated normal? Analytical in fragment is more accurate. Let's compute the gradient in the fragment shader exactly from the wave function; it matches.

Do both: vertex displacement; fragment recompute normal from position (which is displaced; but gradient at displaced xz instead of original xz—slight mismatch; the shader's world position x,z is the same as original x,z since no horizontal displacement; so it's exactly at the undisplaced position). Good, so compute waveGradient(vWorldPos.xz, uTime). Nice.

Also compute vHeight in fragment? h = waveHeight(vWorldPos.xz) matches vHeight. Use that for foam.

Performance: fragment 4 waves × 2 evaluations (h and gradient with cos) = 8 sin/cos per pixel at 1080p ~ 16M sin/cos/frame. That's a fair bit but modern GPUs handle it. Mid-range maybe okay. Could reduce to once: compute h and gradient in a single loop using sin and cos. So one sin+cos per wave = 8 trig ops. Fine.

Actually, we can compute the gradient in the vertex and interpolate normals for most pixels, only adding detail in fragment for crest foam h. But the analytic fragment normal gives better waves at grazing angles. I'll compute in fragment. Reduce ocean resolution to 192x192? Requirement allows up to 256. Use 256 for displacement quality.

Sea shading details:
```glsl
vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
vec3 V = normalize(uCameraPos - vWorldPos);
float NdV = max(dot(N, V), 0.0);
float fres = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
vec3 R = reflect(-V, N);
vec3 sky = skyColor(R, uSunDir);
```
skyColor function: gradient by R.y; plus sun glow.

Water base:
```glsl
float depthMix = smoothstep(18.0, 46.0, length(vWorldPos.xz)); // 0 near island
vec3 water = mix(uShallow, uDeep, depthMix);
// crest lightening
water = mix(water, uShallow * 1.15, smoothstep(0.2, 0.9, h) * 0.35);
```
Then `vec3 col = mix(water, sky, fres * 0.85 + 0.05);`

Specular:
```glsl
vec3 H = normalize(uSunDir + V);
float spec = pow(max(dot(N,H),0.0), 700.0) * 6.0 + pow(max(dot(N,H),0.0), 80.0) * 0.25;
col += uSunColor * spec;
```
Maybe sun glitter is too aliasy; add slight roughness by using a mix of exponent.

Foam:
```glsl
float crest = smoothstep(0.55, 0.85, h);
float n = noise(vWorldPos.xz * 0.7 + uTime*0.2); // procedural
float shore = 1.0 - smoothstep(17.0, 30.0, length(vWorldPos.xz)); // ring near island
foam = max(crest * n, shore * smoothstep(0.45,0.75, n*0.6+0.4));
col = mix(col, uFoamColor, clamp(foam,0,1) * 0.8);
```
The shore ring might overlap the island mesh (which occupies r<18 waterline). At r 17-30, water surrounding island. Foam ring looks good. Add some wave modulation: `shore * (0.5 + 0.5*sin(r*2.0 - uTime*2.0))` — but the island silhouette is irregular, so a circular foam ring is weird. Could use a simpler near-shore foam with radial noise. It's a plus, not critical. Keep subtle.

Tone mapping chunks. Also add a subtle fog in the ocean shader? Mesh with ShaderMaterial: fog requires manual implementation unless `fog: true` with fog chunks included. We can include fog chunks manually:
vertex: `#include <fog_pars_vertex>` and `#include <fog_vertex>` (needs mvPosition). fragment: `#include <fog_pars_fragment>` and `#include <fog_fragment>`. But these chunks depend on `vFogDepth` etc. Simpler: compute fog manually in the fragment: `float fogFactor = smoothstep(uFogNear, uFogFar, distance(uCameraPos, vWorldPos)); col = mix(col, uFogColor, fogFactor);` Then `tonemapping` and `colorspace`. Since MeshBasic water far plane uses scene.fog, match the color. Good.

Set material `fog: false` for the ocean custom shader and add uniforms for fog near/far/color matching scene.fog.

One thing: scene.fog is linear Fog with near/far; our ocean manual matches.

Now let's write the ocean shader code carefully with GLSL1 syntax.

```glsl
// wave params in GLSL
const float PI = 3.14159265359;
```
GLSL ES 1.00 supports `const` global floats? Yes, const global initializers are allowed if constant expressions.

Define waves as functions:

```glsl
void waveSample(vec2 p, float t, out float h, out vec2 grad) {
  h = 0.0;
  grad = vec2(0.0);
  // W1
  {
    vec2 d = vec2(0.9295, 0.3687);
    float k = 0.120830; // 2pi/52
    float w = 1.0883;
    float ph = k * dot(d, p) - w * t + 0.0;
    float s = sin(ph); float c = cos(ph);
    h += 0.40 * s;
    grad += 0.40 * k * d * c;
  }
  ...
}
```

Compute k values: L1=52, k=2π/52=0.120830. omega = sqrt(9.8*k) = sqrt(1.18413)=1.08817.
L2=29: k=0.216662; omega=sqrt(2.1233)=1.45715.
L3=17: k=0.369599; omega=sqrt(3.62207)=1.90317.
L4=9: k=0.698132; omega=sqrt(6.84169)=2.61566.

Directions:
w1: (0.9295, 0.3687) normalized (cos 21.6°, sin) length 1.
w2: (-0.4258, 0.9048) (angle ~115°)
w3: (0.7820, -0.6234)
w4: (0.1961, 0.9806)

Phases: 0.0, 1.7, 4.1, 2.3. But phases in JS same.

Amplitudes: 0.40, 0.26, 0.15, 0.09.

heightAt JS identical.

I should double-check the phase/sign convention: `ph = k*dot(d,p) - w*t + phase`. JS: `k*(dx*x + dz*z) - omega*t + phase`. Same.

Wave time t = elapsedClock time.

Now boat pitching: use heightAt at multiple points; sample with wave time.

Boat design details.

Group:
- hull: LatheGeometry profile, scaled. Let's define hull profile points in (radius, y):
  (0.00, -0.62)
  (0.35, -0.50)
  (0.65, -0.28)
  (0.82, 0.02)
  (0.86, 0.22)
  (0.80, 0.38) — top rim
  LatheGeometry points count 6, segments 20. Scale (1.0, 1.0, 2.2) to elongate along z? Lathe is around Y with radial cross-section in XZ; scaling z by 2.2 gives length 4.4 and width 1.72. Height 1.0. Good. Position y=0.0.
  Material: wood/dark blue? A classic white boat with a wooden deck. Hull white with a blue stripe. Use MeshStandardMaterial color 0xf2f0ea roughness 0.55. Maybe add a thin blue stripe via a separate ring mesh (torus or cylinder). Nice detail: a cylinder ring at the top rim in blue.

- deck: a flattened cylinder/ellipsoid: CylinderGeometry(0.8,0.8,0.08,20) scaled z 2.2, at y=0.35. Wood color 0x9a6b3f, roughness 0.8. Or a box 1.5 x 0.1 x 3.2 with rounded ends. Use a scaled cylinder: radius 0.78, height 0.1, scale z 2.4 → elliptical deck. Looks good.

- cabin: BoxGeometry(0.9, 0.65, 1.1) at (0, 0.72, -0.45). White. Roof: a thin box or cylinder half. Add windows: small dark boxes on the sides. Additional meshes.

- mast: CylinderGeometry(0.035, 0.045, 3.0, 8) at (0, 1.9, 0.15). Material aluminum gray or wood.

- sail: a triangular plane. Build with BufferGeometry positions: (0, 3.25, 0.15)? The sail attaches at the mast top and extends to a boom at the bottom. Let's do a main sail behind mast: triangle points (0, 3.2, 0.2), (0, 1.1, 0.2), (0, 1.1, -1.3)? That's a triangle in the YZ plane (x=0). Actually sails should be in a plane roughly aligned with the boat's long axis, so x=0 plane is correct. Add a slight bulge for realism: use a BufferGeometry with a few segments, or just a triangle with DoubleSide; flat sail okay. Make it a quad-ish triangular sail with a curved luff. Use a `THREE.Shape`? Simplest: triangle BufferGeometry with 3 vertices and normals; DoubleSide material. Also add a jib triangle at the front. Both are meshes. Requirement: at least 3 meshes in the group, mast and sail explicitly.

Add a boom cylinder at y=1.15 from z=0.2 to z=-1.3.

Add a small flag at mast top: a tiny triangle, red.

Also add railing? Maybe not needed.

Total group position (12, y, 14), rotation.y some angle.

Boat scale: 4 units long—hull length 4.4, close to 4. Good. Cabin/mast height 3.5.

Ensure the boat stays within 25 units of origin: max distance ~ sqrt(14²+16²)=21.3, fine.

Shadows: set castShadow=true and receiveShadow=true on all meshes. Also boat meshes cast shadows onto the island/water? Water custom shader doesn't receive. Island receives. Fine.

Island material with vertex colors. Use a PlaneGeometry(64,64,128,128) rotated. But a square plane with corners below water will create extra underwater geometry, fine. However, the island mesh extends 64 across—the corners at r=45 which is below water by lots. Our height function returns negative; for r > 24 clamp n=0 and h=-1.2. So the plane's outer areas are at -1.2, hidden below water (water at 0 ±0.9 waves; trough -0.9 > -1.2, so it could poke through in wave troughs!). Hmm, the underwater part at -1.2 may become visible where waves trough. Better set the outside height to -3.0 to stay below the trough. Modify: h = peak*... - 2.0, so at r=0 peak 11 - 2 = 9; shoreline where pow(n,1.6) = 2/11 → n = (0.1818)^(0.625) = e^(ln0.1818*0.625)= e^(-1.0625)=0.345 → r=24*0.655=15.7 → island diameter 31. Good (30-50). Peak 9. Use -2.2 for safety.

Actually, if the island's top height is 9 and the plane extends to 32 units with -2.2 at edges, water waves ±0.9 won't expose it. Good.

The plane is 64x64 with corners at r=45 where height = -2.2. Fine.

Island mesh receiveShadow true, castShadow true.

Vertex color logic:
```ts
const h = y; // displaced height
const moisture/noise;
let c: THREE.Color;
if (h < 0.9) sand color (0xe8d8a8) with variation
else if (h < 4.5) grass (0x3f7a35)
else rock (0x6a6f63) / darker green
```
Blend smoothly using lerps:
sand = 0xd9c79a; grass = 0x4a7c3a; rock = 0x77796b; dark high = 0x5d6b4a.
Use `smoothstep`. Also darker in valleys? Add noise variation multiplying brightness 0.85-1.15.

A beach ring: For h between -0.5 and 1.0, sand. Underwater sand is hidden.

Add wet sand darker at h ~ 0.

Palms: position on the island: pick azimuth angles and radius between 4 and 12. Compute y = islandHeight(x,z). Ensure y > 0.5. Choose 6 fixed positions:
angle/radius:
(0.4, 6), (1.5, 9), (2.6, 7), (3.6, 10), (4.7, 5), (5.6, 8.5)
x = cos(a)*r, z = sin(a)*r. Compute height. All should be above water.

But camera view: the island is at origin, viewed from +x,+z. We want palms visible on the near side (+x,+z) and silhouetted. Place palms around, enough visible.

Palm trunk: base at (x, h, z), top = base + lean direction * 1.5, height 5.0. Curve points: base (x, h-0.2, z), mid (x + lean*0.5, h+2.4, z + lean*0.5), top (x + lean*1.4, h+5.0, z + lean*1.4). Lean direction = normalize(x,z) * 1.2 + random tangent. Build CatmullRomCurve3. TubeGeometry(curve, 10, 0.16, 6, false). To taper, we can scale? Constant radius fine; add a small "crown" sphere at the top (green/brown coconut cluster).

Trunk material: color 0x8a6a45 roughness 0.9, maybe vertex color gradient? Fine.

Crown: a low-poly coconut cluster (3 small spheres) plus the leaves.

Leaves: 48 instances. Leaf geometry along +X. Each palm has 8 leaves. For instanced leaves:
- store per-instance: palm origin (top of trunk), yaw angle, tilt, phase, scale variation.
- Each frame: compute sway = sin(time*1.6 + phase + instanceIndex*0.1) * 0.10 + gust; 
- Compose: dummy.position.copy(crownPos); dummy.quaternion.setFromEuler(new Euler(0, yaw + swayYaw, tilt + swayTilt, 'YZX'?)). Hmm, we need the leaf to point outward at yaw and tilt down at the end. The leaf geometry's long axis is +X. Rotation around Y by yaw rotates +X to horizontal direction; rotation around Z by tilt rotates +X upward (positive Z-rotation raises +X toward +Y). So to angle the leaves slightly upward at the base then droop by geometry, use tilt +0.35 rad (up). Then sway applies additional Z rotation. Euler order: we want yaw first then tilt about the leaf's local Z after yaw? Rotation matrix R = Ry(yaw) * Rz(tilt) is Euler order 'YZX'? For 'YXZ' with x=0, y=yaw, z=tilt => R = Ry * Rz. That's what we want (Rz applied in the yawed frame). So use euler = new THREE.Euler(0, yaw, tilt, 'YXZ'). But note with x=0, 'YXZ' = Ry*Rx*Rz = Ry*Rz. Good.

- Sway: tilt += sin(...) * 0.12 (flap up/down), yaw += sin(...)*0.06.
- Scale variation: 0.85 + 0.3*rand per leaf? Leaf length 2.2 * scale.

We must update every frame and set instanceMatrix.needsUpdate = true.

Important: InstancedMesh with DoubleSide and shadows. Shadow of instanced mesh requires material and castShadow; instancing shadows work in Three.js.

Also ensure `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.

Sun light: DirectionalLight color 0xffd2a0 (warm), intensity ~2.8? With physically correct lighting in recent Three.js (r155+, useLegacyLights removed), DirectionalLight intensity 3 is fine. Tone mapping ACES with exposure 1.0. Let's pick intensity 3.2, hemisphere 0.8, ambient 0.25.

Wait—Three.js r155+ default `useLegacyLights = false`, so intensities are in physical units; DirectionalLight intensity ~3 gives a nice bright. Many examples use 2-3. Good.

Shadows: renderer.shadowMap.enabled=true; type PCFSoftShadowMap. Shadow map size 2048. Camera ortho ±50.

Sun position = sunDir * 120, target at (0,0,0).

Sky sun direction matches light direction: uSunDir = sunDir normalized.

Camera: PerspectiveCamera(55, aspect, 0.5, 12000); position (35,12,35); lookAt(0,2,0). Requirement "at exactly (35,12,35) looking at (0,2,0)". Don't use OrbitControls to avoid drift. Static camera.

Renderer: antialias true, powerPreference high-performance, setPixelRatio(min(devicePixelRatio, 2)), toneMapping = ACESFilmicToneMapping, toneMappingExposure = 1.05, outputColorSpace = SRGBColorSpace, shadowMap enabled.

Handle resize.

Add __ready after first frame: use a flag; in the animation loop after renderer.render, if !ready set ready. But the requirement says "After the first frame is rendered, set __ready = true". So set after render.

Clock: `const clock = new THREE.Clock();` in the loop, `const delta = clock.getDelta(); elapsed += delta;` or `clock.getElapsedTime()`.

We need the wave time exposed: `let waveTime = 0;` update `waveTime += delta` each frame. Actually use `clock.getElapsedTime()` directly; store in `waveTime = clock.getElapsedTime()`. Then time() returns waveTime.

Note: The clock's elapsed time starts when clock created/started. Fine.

Potential issue: heightAt called with the same t used in the shader. In the animation loop, set `oceanUniforms.uTime.value = waveTime` before updating the boat and rendering. Since boat and water both use waveTime, they match exactly.

Do we need smooth boat motion relative to delta? Use delta for drift. The drift positions depend on waveTime too.

__ocean = { heightAt, time: () => waveTime }.

Should heightAt include some additional small ripples for realism? Only what the shader applies. Keep only the 4 waves.

Now: "heightAt returns the vertical displacement your shader applies at the undisplaced position (x, z)". Our shader applies h = waveHeight(p.xz) exactly. Good.

Let me consider adding a 5th wave for detail in both shader and JS; not necessary.

Ocean normal in the fragment: recompute gradient with same function. Fine.

Let me write the GLSL fully.

Vertex shader:

```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying float vHeight;

// waveSample defined in both shaders; duplicate

void main() {
  vec3 p = position;
  float h; vec2 g;
  waveSample(p.xz, uTime, h, g);
  p.y += h;
  vHeight = h;
  vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
```

Since the mesh is at identity, modelMatrix is identity. Use modelViewMatrix directly: `gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);` and `vWorldPos = (modelMatrix * vec4(p,1.0)).xyz;`. Good.

Fragment:

```glsl
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uCameraPos;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;
varying vec3 vWorldPos;
varying float vHeight;

vec3 skyColor(vec3 dir) {
  float y = clamp(dir.y, 0.0, 1.0);
  vec3 base = mix(uSkyHorizon, uSkyTop, pow(y, 0.45));
  float sd = max(dot(dir, uSunDir), 0.0);
  float glow = pow(sd, 8.0) * 0.25 + pow(sd, 64.0) * 0.8;
  base += uSunColor * glow * (0.35 + 0.65 * exp(-y*4.0));
  return base;
}
```

Ocean main:
```glsl
void main() {
  float h; vec2 g;
  waveSample(vWorldPos.xz, uTime, h, g);
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = normalize(uCameraPos - vWorldPos);
  float NdV = max(dot(N, V), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y)?? 
```
Careful: reflect(-V, N) may point downward if the normal is tilted; for sky reflection clamp R.y to >=0: `R.y = max(R.y, 0.02);`.

```
  vec3 skyRef = skyColor(normalize(R));
  float r = length(vWorldPos.xz);
  float shore = smoothstep(45.0, 16.0, r); // 1 near island
  vec3 water = mix(uDeepColor, uShallowColor, shore * 0.7);
  water = mix(water, uShallowColor * 1.25, smoothstep(0.35, 0.9, h) * 0.45);
  vec3 col = mix(water, skyRef, clamp(fres * 0.9 + 0.06, 0.0, 1.0));
```

Specular:
```
  vec3 H = normalize(uSunDir + V);
  float NdH = max(dot(N, H), 0.0);
  float spec = pow(NdH, 900.0) * 8.0 + pow(NdH, 70.0) * 0.35;
  col += uSunColor * spec;
```

Foam:
```
  float noise = 0.5 + 0.5 * sin(vWorldPos.x*1.9 + uTime*0.8) * sin(vWorldPos.z*2.3 - uTime*1.1);
  float crest = smoothstep(0.5, 0.9, h) * (0.35 + 0.65*noise);
  float shoreFoam = smoothstep(30.0, 17.0, r) * smoothstep(0.25, 0.75, noise*0.8 + 0.2) * 0.6;
  float foam = clamp(crest + shoreFoam, 0.0, 1.0);
  col = mix(col, uFoamColor, foam * 0.85);
```

Fog:
```
  float dist = length(uCameraPos - vWorldPos);
  float fogF = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fogF);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

Check: In Three.js ShaderMaterial fragment, `gl_FragColor` is defined for GLSL1. The chunks tonemapping_fragment: 
```
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
and colorspace_fragment:
```
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
These are included only if we `#include`. The renderer defines TONE_MAPPING when toneMapping != NoToneMapping for materials? In the program, `#define TONE_MAPPING` is added globally for all materials? I believe tone mapping defines are injected into all shaders automatically (the `getToneMappingFunction` and `getTexelEncodingFunction` chunks are included in the prefix). Yes, WebGLProgram adds `#define TONE_MAPPING` and `toneMapping` function to the prefix for all materials. Good.

Note: For ShaderMaterial, the `colorspace_fragment` uses `linearToOutputTexel` which is defined in the prefix. Good.

Also need `#include <common>` maybe? Not necessary for those chunks? `tonemapping_fragment` uses `toneMapping` function which is included in the prefix. Fine. But `colorspace_fragment` uses `linearToOutputTexel` also in the prefix. We can just include them. To be safe, add `#include <common>` at the top of the fragment? ShaderMaterial's prefix already includes common defines? The built-in prefix includes `precision`, defines, and some functions. Actually `#include <common>` is needed for things like PI, saturate—not used in my code except PI which I define myself. Skip.

Potential issue: With GLSL1 and ShaderMaterial, when the renderer uses WebGL2, it converts `varying` etc. Fine.

Sky shader: SphereGeometry(4000, 32, 16), material side BackSide, depthWrite false, fog false. Its position follows the camera: update `sky.position.copy(camera.position)` each frame.

But with fog color matching the horizon, the sky dome's bottom half below horizon should be fog color. We set `h = clamp(dir.y, -0.1, 1.0)` and mix. Below the horizon, sky is not visible because the ocean fills it, except at the far plane gap. Fine.

Now the island height function must be exported? Not required, but used for palm placement. Keep internal.

Let me now think about the ocean shader's horizon: the ocean plane is 400 across; the sky dome behind it is at 4000. The far water plane fills the gap. Use the far water plane with MeshBasicMaterial (color = deep, fog true) so it fades to fog. Actually, MeshBasicMaterial ignores lighting; with fog, it's a solid deep color fading to fog color. At grazing angles, real water reflects the sky and looks bright. A solid dark plane would look wrong at the horizon. Better to use the same custom shader on the far plane but with fewer segments and a vertical offset, so it reflects the sky too. Let's reuse the ocean material on a large plane with 64 segments and a uniform offset. But then the same material would need a uniform for the offset; we can clone and set `uYOffset`. Or create a separate material instance with the same shader but `uOffset = -1.0` and no displacement? Hmm, cloning adds a second shader program (same code, different uniforms -> may share the program if defines identical; uniforms differ fine). Actually ShaderMaterial clones share program? Each material creates its own program if not identical? Three.js caches programs by shader code and defines, so it's shared. Fine.

But the far plane is 8000x8000 with 64 segments → spacing 125, waves aliased. Since it's mostly fog beyond 300, fine. Within 200-300, the far plane has visible undulations at 125-unit spacing; the long wave (52 units) aliases badly. Hmm. Use 200 segments on the far plane? 8000/200=40 spacing, still bad. Alternatively, skip displacement on the far plane (`uDisplace=0`) and keep it flat. Then it's a flat reflective-ish water at 200+ which is fogged. That is acceptable. Use a separate simpler material: same fragment shader with a flat normal, no displacement. Could reuse the ocean material with a `uAmplitudeScale` uniform = 0 for the far one. But then the normal (computed in fragment from the waves) would still show waves; not a big deal at distance. Hmm, but the far plane at y=-1 with wave normals but no displacement looks odd near the seam.

Simplest robust solution: use a single ocean plane 400x400 and let fog hide the edge, plus a large flat plane with MeshBasicMaterial color equal to the fog color (not deep water) at y=-1. The far plane will be exactly fog color, matching the fogged ocean edge and the sky horizon. This avoids visible seams and gives a clean horizon. Since it's fully fogged beyond 300, and its color is the fog color, it blends. Within 200-300, it's also fogged 55-80%, so the color is between deep and fog; using the fog color directly would look too pale, but the transition from the ocean edge (80% fog) to the far plane (100% fog) is subtle. Great. So far plane material = MeshBasicMaterial({color: fogColor, fog: true, depthWrite: false?}) — but with fog enabled, the color gets fogged further; since its base color is fog color, the result is fog color at any distance. Set fog false and color = fog color. It's a flat pale plane extending to the horizon. It will look like haze over the ocean. Good. But does it need lighting? No.

Actually, the sky horizon color should equal the fog color so the sea horizon and sky blend. Good.

But with a warm sun above the horizon, the sky near the sun is warm; the fog color is pale blue. Mismatch at the horizon line in the sun direction: the sky just above the horizon is warm-ish, while the sea just below is pale blue. That's natural (sun glare on the water) but might look off. We can add a warm tint to the fog/ocean far based on direction? Too complex. Choose fog color close to the sky's horizon base color, and keep the warm glow localized and subtle.

So fog color = sky horizon base = #a9c3d6 maybe with a slight warm tone #b7c9d2. Let's set sky horizon to 0xaec9dc and fog to 0xaec9dc. With ACES, it will render slightly darker/desaturated.

Sky top: 0x1c5a9c, horizon 0xaec9dc.

Sun tint: 0xffd7a8.

Ocean deep: 0x052b3d, shallow: 0x1f8c94 (turquoise). With ACES tonemapping, the deep color will remain dark.

Lighting: sun color 0xffd2a0, intensity 3.0; hemisphere sky 0x9fc6e8, ground 0x2b4a44, intensity 0.9; ambient 0xffffff intensity 0.15.

Hmm, with a backlit island, the visible side will be lit only by the hemisphere (0.9) and ambient (0.15). The island should still be visible. Since the hemisphere light is bright sky blue + ground, colors will show. Maybe increase the hemisphere to 1.4 and add a low-intensity fill DirectionalLight from the camera side? Not required. But a fill light improves looks. We can add a subtle non-shadow directional from the opposite side (from camera direction, intensity 0.5, color warm-ish) — is that allowed? "A DirectionalLight as the sun... Add hemisphere or ambient fill light." Additional lights are fine. Add a fill DirectionalLight (no shadow) intensity 0.6 from the camera side to lighten the island front. Good for looks but could reduce the realism of backlighting. Keep it low.

Boat in the island shadow: the sun's shadow will cover it. The boat's white hull will be dim. Fill light helps.

Actually, let's reconsider the sun placement to be less backlit. Since the camera looks at origin from (35,12,35), the visible sun must be near the -x,-z direction. Light from the sun comes from -x,-z; the island's visible side faces +x,+z (camera side) so it's in shadow. Unless the sun is high enough that the top surfaces are lit and the vertical faces dark. Elevation 11° → low. Hmm. The island top (grass) would be nearly edge-on. This will be a silhouette-ish scene. It can look stunning (sunset over the ocean with a silhouette island and palms). But "sand and grass or rock higher up" should be visible in color. Fill light with a strong hemisphere can reveal these colors. Let's make the hemisphere sky color warm and intensity 1.6 so the island is clearly visible, plus ambient 0.3.

Alternatively, put the sun high (out of frame) and add a "visible sun" as a bright disc elsewhere? No—sun direction and light must match.

Could orient the camera view so the sun is to the side but the island's lit side faces the camera partly? The camera is fixed at (35,12,35). The lit side faces the sun. For the sun to be visible in the frame, its direction must be within the fov of the camera (roughly -x,-z). The lit side of the island faces -x,-z (away from the camera). So yes, backlit. We could make the sun high (elevation 60°) so it lights the top of the island (visible) and is out of frame; but then no visible sun. The requirement is likely checked by inspecting the Sky addon/sun position rather than pixels. But "with a visible sun position" is in the description, and the visual judge may check. I'd rather have the sun visible at ~11° elevation with good fill.

Another option: put the sun at azimuth ~30° off the view direction, elevation 25° — out of frame vertically at center, but at the top edge? We computed top edge elevation drops toward the corners. At 30° horizontal offset, the top edge elevation is maybe ~10°, so 25° is definitely out. Unless we increase the fov to 75° vertical! Then the top edge is higher: half fov 37.5°, center-top elevation = 37.5-11.4 = 26°; corners maybe 15°. A sun at 25° elevation near the center would be visible with fov 75. A 75° fov is a wide-angle lens, common in games; it might show more ocean and sky. The camera aspect 1.78 with fov 75 is quite wide; the island may look small. Hmm. The requirement doesn't specify fov. Use fov 60 for a nice balance; sun at 11° is visible.

Let's stick with fov 58, sun elevation 13°, azimuth ~20° left of center. Check visibility at fov 58: vfov half 29°, center top elevation = 29-11.4 = 17.6°; top corners lower. Sun at 13° elevation and horizontal offset 20°: compute y_ndc = ? using tan values: tan(29°)=0.554, tan(hfov/2)=0.554*1.78=0.986. Sun dir horizontal 20° off forward: build sunDir. Forward horiz (-0.707,-0.707). 20° rotation toward -x (left in screen? right vector is (0.707,0,-0.707); moving toward -x means left). Horizontal dir = normalize(-0.707,-0.707) rotated by... Let's compute directly: angle of forward horizontal = atan2(z,x) = atan2(-0.707,-0.707) = -135° (or 225°). Rotate by +20°? toward -x means angle 235°? x=cos235=-0.574, z=sin235=-0.819. That is 20° from forward: dot = 0.406+0.579=0.985. Hmm that's rotating toward -z more (right side). Rotate the other way to 215°: x=cos215=-0.819, z=sin215=-0.574. Dot=0.579+0.406=0.985. Both are 20° off; one is left, one right. Which appears left in screen? The sun at (-0.819,-0.574): x_cam = dot with right (0.707,0,-0.707) = -0.579+0.406=-0.173 (left). Good.

Sun elevation 13°: y = sin13 = 0.225, horizontal scale cos13=0.974 -> sunDir = (-0.798, 0.225, -0.559). Camera coords: x_cam = dot(right) = -0.564+0.395=-0.169; y_cam = dot(up_cam(-0.139,0.974,-0.139)) = 0.111+0.219+0.078=0.408; z_cam = dot(-forward (0.689,0.197,0.689)) = -0.550+0.044-0.385=-0.891. d=0.891. x_ndc = -0.169/(0.891*0.986)= -0.192. y_ndc = 0.408/(0.891*0.554)=0.826. In frame near the top. 

Shadow direction: opposite horizontal = (0.798, 0.559) normalized (0.819,0.574). Island shadow extends toward +x,+z. Boat at (12,14) direction (0.65,0.76); angle between ~14°; distance 18.4; lateral offset 4.5; shadow width ~island width 36 → boat in shadow. Definitely.

Hmm, maybe move the sun to the other side (azimuth right of center) so the shadow goes toward +x,-z, missing the boat at +x,+z. Sun horizontal (-0.574,-0.819) normalized? That's 20° the other way: sunDir = (-0.559,0.225,-0.798). x_cam = -0.395+0.564=0.169 (right side); y_cam = 0.078+0.219+0.111=0.408; z_cam = -0.385+0.044-0.550=-0.891. Same NDC. Shadow direction opposite = (0.559,0.798) normalized (0.574,0.819). Boat direction (0.65,0.76), angle between ~12°, still in shadow. Either way.

Sun azimuth closer to the view forward: sun horizontal (-0.819,-0.574) is 20° off. If we choose a sun direction nearly forward (-0.707,-0.707) at elevation 13°, the shadow is exactly toward the camera/boat direction (0.707,0.707); boat (0.65,0.76) is 6° off. Shadow covers it.

Unavoidable: the sun is in front of the camera, so shadows come toward the camera, and objects between the camera and the sun are backlit/in shadow. The boat is between the island and the camera, so it's in the island's shadow. If the island is 10 high, the shadow reaches ~43 units, covering the boat. Could reduce the island peak to 7 and increase sun elevation? Shadow length = 7/tan(13°) = 30, still covers at 18. Hmm.

Maybe move the boat to the side so it's not behind the island relative to the sun: boat at (12,14) is fixed-ish. Sun shadow axis +x,+z; the island's shadow extends 30-43 in that direction with a width of ~30. Boat at 18.4 along a similar direction is in it. If the sun's horizontal direction were more toward -z than -x, the shadow axis would be more +z; boat at (12,14) is offset 12 in x; with a 30-unit-wide shadow, still covered. No way around it unless the sun elevation is high.

OK, accept the boat in shadow; boost fill light. Or make the shadow camera ignore? No. Actually, we could set the island's castShadow = true but the boat receives shadows; the boat could be dark. To make the boat pop, add emissive-ish material or keep the fill light strong. Alternatively, the island's peak might be lower than the boat's position such that light reaches? The height 10 blocks.

Let me consider raising the sun elevation to 25° and widening the fov to 78°, if the sun is visible near the top. With fov 78, the island might look small but the framing includes a lot of sky and ocean. The sun at 25° would be 25-11.4=13.6° above center; with vfov half 39°, y_ndc small (0.35), definitely visible. Shadows length = 10/tan25 = 21.4; the boat at 18.4 along the shadow axis would be at the tip; lateral 4.5 → still shadowed maybe. Elevation 30° → 17; boat at 18.4 edge. Elevation 35° → 14.3 < 18.4 → boat outside the island shadow. But a 35° sun is high; not visible with fov 78? Center-top elevation = 39-11.4 = 27.6°, so 35° is out. Hmm, camera pitch down makes high sun invisible.

So with a fixed camera at (35,12,35) looking at origin, any visible sun is low-ish (<~28°, depending on fov), causing long shadows toward the camera. Unless the sun is placed within the frame at the top but still high with a wider fov. To have a 35° sun visible, fov must be ≥ 2*(35+11.4) = 93°. Too wide.

Conclusion: backlit scene. It's a classic beautiful sunset shot. Let's go for it, with strong atmospheric fill so the island reads.

Actually, another thought: make the island low (peak ~5-6) which is within the 5-15 range, so the shadow length at elevation 13° is 5.5/0.23 ≈ 24 units. Boat at 18.4 still shadowed. Lower shadow intensity doesn't matter—shadow is binary. Could set the sun's shadow radius large and bias? No.

Alternatively, we can position the island slightly off-center? It's required centered on the origin. Boat fixed at (12,14). Sun visible. So yes.

Fine. Let's make the sun brightness high and the fill high so the boat looks good.

Maybe choose a warmer sunset: sun elevation 9°, color #ffb070, sky warm near the horizon; island silhouette; water with golden specular path. That looks gorgeous. The boat white sail backlit. Let's do this. But the island vertex colors may not read. Add a fill light from the camera direction at intensity 1.0, color #bcd7ff (cool) to simulate skylight. Hemisphere intensity 1.5. The island will be visible in cool light, contrasting with the warm sky. Nice cinematic look.

Hmm, but the task says "realistic, good-looking 3D scene: a small boat rocking on an ocean next to a tropical island." A bright tropical day might be expected. A low sun is fine and looks better.

Let me settle on a mid-afternoon sun with elevation 14°, warm-white color, and a strong sky fill. The sky gradient: blue at the top, pale blue at the horizon, with a warm glow around the sun.

Now shadows: with directional light intensity 3, shadowed areas still get hemisphere 1.5 + fill 0.8. Good.

Shadow acne: use normalBias 0.06, bias -0.0002.

Island receives shadows; boat casts shadows. The boat's shadow on the island? It's on water (not received). The boat's shadow on itself (sail on deck) works. The island's self-shadow (palms on the ground) works. Nice.

Palm trunks cast shadows; leaves instanced cast shadows. Shadow map 2048 with ±50 coverage → 4.9 cm/texel? 100 units / 2048 = 0.049 units per texel. Good quality.

Now the boat's bobbing: y = heightAt(x,z,t) + 0.15. Pitch/roll via samples. Smooth them? Immediately setting is fine since waves are smooth. The boat's yaw drift might cause the pitch/roll to change smoothly.

Add a subtle constant roll from the wind? Not needed.

Now, one important detail: The boat group's meshes cast shadows, but the ocean doesn't receive shadows, so no visible boat shadow on the water. Might look odd but acceptable. Could add a fake shadow blob under the boat? A dark transparent circle on the water following the boat, slightly above the water. That could look like a shadow and add realism. But the water's waves would intersect the flat blob. Skip.

Actually, we can make the ocean receive shadows by implementing shadow mapping in the custom shader. That's a big chunk of code: include `#include <shadowmap_pars_vertex>` etc. It's doable with ShaderMaterial:
- Add `#include <common>`, `#include <packing>`, `#include <shadowmap_pars_fragment>` etc. and manually sample. But ShaderMaterial doesn't automatically get the directional light shadow uniforms unless we add them: `directionalShadowMap`, `directionalShadowMatrix`, etc. Three.js sets these uniforms automatically for ShaderMaterial? The renderer sets light uniforms only for built-in materials via `refreshUniforms`? For ShaderMaterial, the renderer does set some default uniforms like `directionalLights`? No, I think ShaderMaterial gets only its own uniforms plus standard ones; lights are not automatically injected unless `lights: true` in the material. ShaderMaterial has `lights` parameter (default false); setting `lights: true` makes the program include lights and the renderer set light uniforms? Yes, ShaderMaterial with `lights: true` gets the lights uniforms (directionalLights, directionalLightShadows, etc.). But implementing shadows manually is complex. Skip.

The requirement only says boat meshes cast shadows and island receives shadows. Fine.

Let's also add a few clouds? Procedural clouds in the sky shader could add beauty. Implement simple noise-based clouds in the sky shader? Risk of complexity, but a couple of soft cloud bands could help. Maybe skip for time; a gradient sky with sun glow looks clean.

Let's add a subtle star? No.

Ok, let's write the code.

Structure:

```ts
import * as THREE from 'three';

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0xa8c4d8);
scene.fog = new THREE.Fog(FOG_COLOR.getHex(), 80, 340);
```
Careful: `scene.fog = new THREE.Fog(color, near, far)` where color can be a hex number or Color. Use `new THREE.Fog(0xa8c4d8, 80, 340)`.

But we want the same color object for the far plane; `new THREE.Fog(0xa8c4d8,...)`; `const FOG_HEX = 0xa8c4d8`.

Camera.

Sun direction:
```ts
const SUN_DIR = new THREE.Vector3(-0.798, 0.225, -0.559).normalize();
```
Let me recompute to a nice normalized direction: (-0.80, 0.24, -0.55) length sqrt(0.64+0.0576+0.3025)=sqrt(1.0001)≈1. Normalized almost exactly. Use (-0.80, 0.24, -0.55). Elevation asin(0.24)=13.9°. Good.

Light:
```ts
const sun = new THREE.DirectionalLight(0xffd2a2, 3.2);
sun.position.copy(SUN_DIR).multiplyScalar(120);
sun.target.position.set(0, 0, 0);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 20; sc.far = 260;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
sun.shadow.radius = 2; // PCFSoft ignores radius? radius applies to PCF.
scene.add(sun);
```
Since sun.position = sunDir * 120 and the target is at origin, near 20 far 260 covers (distance 120, island depth ±50 → 70..170). Fine.

Fill:
```ts
const fill = new THREE.DirectionalLight(0xbcd9ff, 0.9);
fill.position.set(35, 25, 35); // camera side
scene.add(fill);
const hemi = new THREE.HemisphereLight(0xa9c8e8, 0x2c4a42, 1.4);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
```

The fill light adds a nice front light.

Sky:
```ts
const skyGeo = new THREE.SphereGeometry(4000, 48, 24);
const skyMat = new THREE.ShaderMaterial({ ... side: THREE.BackSide, depthWrite: false, fog: false });
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.frustumCulled = false; // so it doesn't get culled when following the camera
scene.add(sky);
```
Since the sky follows the camera each frame, set renderOrder = -1? DepthWrite false, rendering order matters. If it's rendered first, everything else draws over it. Three.js sorts opaque objects by distance/material; renderOrder is respected. Set sky.renderOrder = -1 and material.depthTest = true? With depthWrite false, depthTest true, and rendered first: it writes no depth, then other objects draw over. Since the sky radius is 4000 and the camera far plane 12000, fine. But objects behind? Everything is within. Set `depthTest: false` and renderOrder = -1 for safety; then the sky always renders first and no depth test. Good. With depthTest false, the sky would draw over the scene if rendered last, so renderOrder -1 ensures first. Yes.

Sky uniforms: uSunDir, uSunColor, uTop, uHorizon. Fragment with sun disc.

Use `sky.position.copy(camera.position)` each frame.

Ocean:
```ts
const oceanGeo = new THREE.PlaneGeometry(400, 400, 256, 256);
oceanGeo.rotateX(-Math.PI/2);
const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: SUN_DIR.clone() },
  uSunColor: { value: new THREE.Color(0xffd2a2) },
  uSkyTop: { value: new THREE.Color(0x1b5a9e) },  // must match sky
  uSkyHorizon: { value: new THREE.Color(0xaec9dc) },
  uDeepColor: { value: new THREE.Color(0x042c3e) },
  uShallowColor: { value: new THREE.Color(0x20909a) },
  uFoamColor: { value: new THREE.Color(0xeaf6fa) },
  uCameraPos: { value: new THREE.Vector3() },
  uFogColor: { value: new THREE.Color(0xa8c4d8) },
  uFogNear: { value: 80 },
  uFogFar: { value: 340 }
};
const oceanMat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.frustumCulled = false; // displaced, but bounding sphere from flat plane is fine; keep culling off to be safe
scene.add(ocean);
```
Note: `uCameraPos` updated each frame from camera.position.

Far water plane:
```ts
const farGeo = new THREE.PlaneGeometry(8000, 8000, 1, 1);
farGeo.rotateX(-Math.PI/2);
const farMat = new THREE.MeshBasicMaterial({ color: 0xa8c4d8, fog: false, depthWrite: true });
const farWater = new THREE.Mesh(farGeo, farMat);
farWater.position.y = -1.2;
scene.add(farWater);
```
But this plane at y=-1.2 with color fog color extends to 4000; the horizon line at eye level 12 and distance 4000 appears at -0.17°, nearly the horizon. Good. It will be pale. But the sky horizon color is 0xaec9dc, close to 0xa8c4d8. Good.

Hmm, a flat pale plane at y=-1.2 will be visible across a large area, covering the animated ocean? No, it's below y=0 and the ocean plane covers up to 200 units from origin; the far plane is below and visible beyond the ocean edge. Fine.

But visually, the far ocean flat pale color might be too "milky". Fog color is pale blue; the horizon should look like haze. Good.

Could use a gradient in the far plane? MeshBasicMaterial no. Fine.

Ocean shader code (write as template strings).

Vertex:

```glsl
uniform float uTime;
varying vec3 vWorldPos;

void waveSample(vec2 p, float t, out float h, out vec2 grad) {
  h = 0.0;
  grad = vec2(0.0);
  {
    vec2 d = vec2(0.9295, 0.3687);
    float k = 0.120830;
    float w = 1.08817;
    float ph = k * dot(d, p) - w * t + 0.0;
    float s = sin(ph); float c = cos(ph);
    h += 0.40 * s;
    grad += 0.40 * k * d * c;
  }
  {
    vec2 d = vec2(-0.4258, 0.9048);
    float k = 0.216662;
    float w = 1.45715;
    float ph = k * dot(d, p) - w * t + 1.7;
    float s = sin(ph); float c = cos(ph);
    h += 0.26 * s;
    grad += 0.26 * k * d * c;
  }
  {
    vec2 d = vec2(0.7820, -0.6234);
    float k = 0.369599;
    float w = 1.90317;
    float ph = k * dot(d, p) - w * t + 4.1;
    float s = sin(ph); float c = cos(ph);
    h += 0.15 * s;
    grad += 0.15 * k * d * c;
  }
  {
    vec2 d = vec2(0.1961, 0.9806);
    float k = 0.698132;
    float w = 2.61566;
    float ph = k * dot(d, p) - w * t + 2.3;
    float s = sin(ph); float c = cos(ph);
    h += 0.09 * s;
    grad += 0.09 * k * d * c;
  }
}

void main() {
  vec3 pos = position;
  float h; vec2 g;
  waveSample(pos.xz, uTime, h, g);
  pos.y += h;
  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Note: GLSL ES 1.00 functions with `out` params are supported. Yes.

But: `#version` not specified; Three.js ShaderMaterial defaults to GLSL1 (WebGL2 uses a compatibility prefix). Out parameters supported in GLSL ES 1.00? Yes, parameter qualifiers in/out/inout are supported.

Fragment uses the same `waveSample` function—need to duplicate it there (shader chunks or define). Just duplicate.

Fragment:

```glsl
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uCameraPos;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vWorldPos;

void waveSample(...) { ... }

vec3 skyColor(vec3 dir) {
  float y = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyTop, pow(y, 0.42));
  float sd = max(dot(dir, uSunDir), 0.0);
  float glow = pow(sd, 8.0) * 0.35 + pow(sd, 64.0) * 1.1;
  col += uSunColor * glow * (0.35 + 0.65 * exp(-y * 3.0));
  return col;
}

void main() {
  float h; vec2 g;
  waveSample(vWorldPos.xz, uTime, h, g);
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = normalize(uCameraPos - vWorldPos);
  float NdV = max(dot(N, V), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-V, N);
  R.y = max(R.y, 0.03);
  vec3 skyRef = skyColor(normalize(R));

  float r = length(vWorldPos.xz);
  float shore = smoothstep(48.0, 16.0, r);
  vec3 waterCol = mix(uDeepColor, uShallowColor, shore * 0.75);
  waterCol = mix(waterCol, uShallowColor * 1.3, smoothstep(0.30, 0.95, h) * 0.5);

  vec3 col = mix(waterCol, skyRef, clamp(fres * 0.92 + 0.05, 0.0, 1.0));

  vec3 H = normalize(uSunDir + V);
  float NdH = max(dot(N, H), 0.0);
  float spec = pow(NdH, 850.0) * 7.0 + pow(NdH, 60.0) * 0.25;
  col += uSunColor * spec;

  float n = 0.5 + 0.5 * sin(vWorldPos.x * 1.9 + uTime * 0.9) * sin(vWorldPos.z * 2.3 - uTime * 1.1);
  float n2 = 0.5 + 0.5 * sin(vWorldPos.x * 0.6 - uTime * 0.4 + 1.7) * cos(vWorldPos.z * 0.5 + uTime * 0.3);
  float crest = smoothstep(0.55, 0.92, h) * (0.45 + 0.55 * n);
  float shoreFoam = smoothstep(32.0, 18.0, r) * smoothstep(0.25, 0.8, n2) * 0.7;
  float foam = clamp(crest + shoreFoam, 0.0, 1.0);
  col = mix(col, uFoamColor, foam * 0.85);

  float dist = length(uCameraPos - vWorldPos);
  float fogF = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

Potential issue: `uShallowColor * 1.3` — vec3 * float fine. `smoothstep(48.0, 16.0, r)` with edge0>edge1: the GLSL spec says results are undefined if edge0 >= edge1! Actually smoothstep requires edge0 < edge1, otherwise undefined. Many GPUs handle reversed edges but it's technically undefined. Better use `1.0 - smoothstep(16.0, 48.0, r)`. Similarly `smoothstep(32.0, 18.0, r)` → `1.0 - smoothstep(18.0, 32.0, r)`. Do that.

For fog: `smoothstep(uFogNear, uFogFar, dist)` with near < far, fine.

`R.y = max(R.y, 0.03)` — R is a vec3, assign to component fine.

Include `#include <tonemapping_fragment>`: In GLSL1, this chunk uses `gl_FragColor`. Since we are writing to gl_FragColor first, fine. But note: Three.js r152+ may use `gl_FragColor` in ShaderMaterial default; yes.

Would `#include <colorspace_fragment>` need `linearToOutputTexel`? It's injected. Good.

`uCameraPos` is a uniform we update each frame. Or use the built-in `cameraPosition` uniform! Three.js automatically provides `cameraPosition` in all shaders. That avoids updating. But our requirement says expose height/time only; using cameraPosition is simpler. Use built-in `cameraPosition` instead of a custom uniform. The built-in `cameraPosition` is a vec3 world position, injected by Three.js for all materials. Yes. Use it in the fragment and remove uCameraPos. Then the fog computation uses cameraPosition. Good.

In the sky shader, `cameraPosition` also available.

So ocean fragment: `vec3 V = normalize(cameraPosition - vWorldPos);` and `float dist = distance(cameraPosition, vWorldPos);`.

Now the material's uniforms are those set.

Tone mapping for the ocean is applied; the sky also includes the chunks.

Important: When using ShaderMaterial with `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`, the renderer will handle. If the material has toneMapped = true (default), the defines exist. Good.

Sky shader with tonemapping: The sky colors are in linear space; ACES will tone-map them. Use brighter colors to compensate.

Sky vertex:
```glsl
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```
Since the sky follows the camera, the world position minus camera position is the direction. Actually `vDir = position` in local space is enough (sphere centered at camera). Use `vDir = position;` then normalize in fragment. Good. But when the sky is at the camera position, the local position is the direction from the center. Use that. `gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0)`; with the model matrix translation to the camera, fine. Depth: since the sphere radius 4000 and the camera far 12000, within range. Set material.depthTest=false and renderOrder=-1.

Sky fragment:
```glsl
uniform vec3 uSunDir, uSunColor, uSkyTop, uSkyHorizon;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float y = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyTop, pow(y, 0.45));
  float sd = max(dot(dir, uSunDir), 0.0);
  float glow = pow(sd, 6.0) * 0.30 + pow(sd, 40.0) * 0.7 + pow(sd, 900.0) * 2.5;
  col += uSunColor * glow * (0.4 + 0.6 * exp(-y * 3.0));
  float disc = smoothstep(0.99965, 0.99985, sd);
  col += vec3(1.8, 1.5, 1.1) * disc * 3.0;
  // below horizon fade to fog
  float below = smoothstep(0.0, -0.08, dir.y);
  col = mix(col, uSkyHorizon * 0.95, below);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
smoothstep with reversed edges again—avoid: `float below = 1.0 - smoothstep(-0.08, 0.0, dir.y);`.

The disc using smoothstep(0.99965, 0.99985, sd): the angular radius: sd = cos(theta). cos(1.5°)=0.99966, so the disc is ~1.5° radius? smoothstep 0.99965→1.0: theta from 1.52° to 1°. That's a huge sun (3° diameter vs real 0.53°). With glow, a larger sun reads better in a game. Maybe use 0.9998 (1.15°). Use 0.99975 to 0.9999 → 1.28° to 0.81° radius. Diameter ~2°. Slightly large. Fine.

But the sun disc brightness with ACES tone mapping and 3.0 might bloom? No bloom. It will be a bright white spot. Good. Maybe add a lens-flare-ish streak? Skip.

Now island:

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const rr = r * (1.0 + 0.10 * Math.sin(3.0 * th + 0.7) + 0.06 * Math.cos(5.0 * th + 1.9));
  const n = 1.0 - Math.min(rr / 24.0, 1.0);
  let h = 11.0 * Math.pow(n, 1.7) - 2.2;
  // ridges
  const ridge = Math.sin(x * 0.33 + 1.3) * Math.cos(z * 0.29 - 0.6) * 0.9 + Math.sin(x * 0.11 - z * 0.15) * 0.7;
  h += ridge * n;
  return h;
}
```
At r=0: n=1 → h = 8.8 + ridge(0,0)*1 = 8.8 + sin(1.3)*cos(-0.6)*0.9 + 0 = 8.8+0.964*0.825*0.9=8.8+0.716=9.5. Good. Peak ~9.5 (5-15). Add another localized peak? The island shape with n falloff gives a single dome. Adding ridges makes it more natural.

At r=20: rr≈20*(1+...), n≈0.17, h=11*0.17^1.7-2.2 = 11*0.0505-2.2 = 0.556-2.2=-1.64, underwater. Shoreline around r≈17.5. Island diameter ~35-40 across due to the irregular shape. Meets 30-50.

Vertex colors based on the height and a bit of noise. For each vertex, after displacement:
```ts
const y = h;
const sand = new THREE.Color(0xd8c49a);
const wetSand = new THREE.Color(0xa88f6a);
const grass = new THREE.Color(0x3e7a35);
const grassDark = new THREE.Color(0x2c5a2a);
const rock = new THREE.Color(0x6f7366);
```
Color:
- if y < 0.6: sand; blend wet sand near 0.
- if 0.6..3.5: grass (blend sand→grass).
- above 3.5: grass → rock at 6.5.

Let's implement:
```ts
const t1 = smoothstep(0.4, 1.6, y); // sand to grass
const t2 = smoothstep(3.0, 6.5, y); // grass to rock
let c = sand.clone().lerp(grass, t1).lerp(rock, t2);
// wet sand near water
const wet = 1 - smoothstep(0.0, 0.5, y);
c.lerp(wetSand, wet * 0.6);
// noise variation
const v = 0.9 + 0.2 * (0.5 + 0.5*Math.sin(x*0.9+z*0.7));
c.multiplyScalar(v);
```
Colors get converted to linear? `new THREE.Color(0x...)` is linear-srgb, then vertex colors need linear values. BufferAttribute color values: Three.js expects linear values in vertex colors; the material's vertexColors uses them directly. Since our Color objects are linear (ColorManagement converts), the values are correct. Good.

Set the geometry's color attribute.

Use PlaneGeometry(64, 64, 128, 128) rotateX(-π/2). For each vertex, position.x,z; compute h; set y; color. Then computeVertexNormals.

The plane is 64x64, but the island's outer parts go below water. Good.

To avoid the underwater portion being visible through waves, set h min -2.2; wave trough -0.9; safe.

Material: `new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0 })`. receiveShadow true. castShadow true.

But the island's underside is a plane with no bottom; not visible.

Palm positions need `islandHeight`. Pick six good positions:
```ts
const palmSpots = [
  [5, 5], [-6, 4], [7, -3], [-4, -7], [1.5, 9], [-9, 1], [3, -9], [9, 6]
];
```
We need at least 5; use 7. Compute heights; if < 1, adjust or skip. Let's compute a few:
islandHeight(5,5): r=7.07, n=1-7.07/24=0.705; h=11*0.705^1.7-2.2 = 11*exp(1.7*ln0.705)=11*exp(-0.594)=11*0.552=6.07-2.2=3.87 + ridge. Good.
(9,6): r=10.8, n=0.55; h=11*0.55^1.7-2.2 = 11*0.365=4.02-2.2=1.82 + ridge. Good.
(1.5,9): r=9.12, n=0.62; h=11*0.62^1.7=11*0.442=4.86-2.2=2.66.
(-9,1): r=9.05, n=0.62, similar 2.66.
(7,-3): r=7.6, n=0.683; h=11*0.525=5.78-2.2=3.58.
(-4,-7): r=8.06, n=0.664; h=5.5-2.2=3.3.
(3,-9): r=9.49, n=0.605; h=4.7-2.2=2.5.
(-6,4): r=7.2, n=0.70; h=6.0-2.2=3.8.
All above water. The irregular radius factor shifts them somewhat. Good.

But palms at these positions—will they be in the camera's view? The island is centered and the camera looks at it, so yes.

Trunk heights ~5; top y = base + 5. Peak 9.5. Palms on lower slopes. Good.

Palm curve lean: choose a direction radially outward from the island center for a natural lean toward the sea: `leanDir = normalize(x,z)`. Lean amount 1.3 at the top.

Build:
```ts
function createPalm(x: number, z: number): { trunk: THREE.Mesh; crownPos: THREE.Vector3; } {
  const baseY = islandHeight(x, z) - 0.15;
  const lean = new THREE.Vector2(x, z).normalize().multiplyScalar(1.6);
  const p0 = new THREE.Vector3(x, baseY, z);
  const p1 = new THREE.Vector3(x + lean.x*0.25, baseY + 2.2, z + lean.y*0.25);
  const p2 = new THREE.Vector3(x + lean.x*0.6, baseY + 4.0, z + lean.y*0.6);
  const p3 = new THREE.Vector3(x + lean.x*1.0, baseY + 5.2, z + lean.y*1.0);
  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
  const geo = new THREE.TubeGeometry(curve, 12, 0.16, 6, false);
  // taper? scale radius via a custom? leave.
  const trunk = new THREE.Mesh(geo, trunkMat);
  trunk.castShadow = true; trunk.receiveShadow = true;
  return { trunk, crownPos: p3 };
}
```
Add a small crown sphere at p3 (0.35 radius, brown/green) and a couple of coconuts. Those are extra meshes; fine.

To taper the trunk, use a TubeGeometry with radius 0.18 and scale? Not necessary.

Leaves: leaf geometry along +X, length 2.4; with droop. Build:
```ts
function makeLeafGeometry(): THREE.BufferGeometry {
  const seg = 10;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const x = t * 2.6;
    const w = 0.34 * Math.sin(Math.PI * Math.pow(t, 0.65)) + 0.02;
    const y = -0.9 * t * t;
    pos.push(x, y, -w);
    pos.push(x, y, w);
  }
  for (let i = 0; i < seg; i++) {
    const a = i*2;
    idx.push(a, a+1, a+2, a+1, a+3, a+2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
```
At t=0, w=0.02, so the leaf attaches near the crown; at t=1, w=0.02 (tip). Mid max 0.34. Droop -0.9 at the tip. With scale, nice.

But all leaves with the same droop geometry and an initial upward tilt; the geometry starts at (0,0,0) extending +X, so the instance position at the crown. Good. Maybe offset the leaf start slightly outward: position = crown + radial*0.15. Fine, no offset needed.

InstancedMesh count = palms.length * 8 = 48 (or 7*8=56).

Material for leaves: `MeshStandardMaterial({ color: 0x3f8a3a, side: THREE.DoubleSide, roughness: 0.75, metalness: 0.0 })`. With vertex colors? Not needed.

Maybe add slight emissive for translucency: emissive 0x0a2a0a intensity 0.1? Keep simple.

Leaves castShadow = true, receiveShadow = true. Instance count.

Per-frame update:
```ts
const dummy = new THREE.Object3D();
for (let i = 0; i < leaves.count; i++) {
  const p = leafData[i];
  const sway = Math.sin(time * 1.7 + p.phase) * 0.10 + Math.sin(time * 0.6 + p.phase * 0.5) * 0.06;
  const swayYaw = Math.sin(time * 1.1 + p.phase * 1.3) * 0.08;
  dummy.position.copy(p.crown);
  dummy.quaternion.setFromEuler(new THREE.Euler(0, p.yaw + swayYaw, p.tilt + sway, 'YXZ'));
  dummy.scale.setScalar(p.scale);
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
}
leaves.instanceMatrix.needsUpdate = true;
```
Allocating an Euler each frame is bad; use a reusable Euler and quaternion:
```ts
const euler = new THREE.Euler(0,0,0,'YXZ');
...
euler.set(0, yaw, tilt, 'YXZ');
dummy.quaternion.setFromEuler(euler);
```
Reuse.

leafData computed at creation:
- crown = crownPos of the palm
- yaw = base angle for the leaf around the trunk (i / 8 * 2π) + palm random offset
- tilt = 0.35 + variation (upward tilt)
- phase = random
- scale = 0.85 + random * 0.35

For a palm crown, leaves radiate horizontally with a slight upward angle. The geometry droops downward, so tilt up ~0.35 rad looks right.

Should the leaves rotate with the wind direction? Fine.

Note: `leaves` is an InstancedMesh, and its `instanceMatrix` is initially identity; we must set all matrices before the first render. We'll do the update in the animation loop (first frame) before rendering; also call during creation for safety.

InstancedMesh bounding sphere: By default, the frustum culling uses the boundingSphere computed from the geometry and instances? Three.js computes the bounding sphere of the InstancedMesh from instance matrices (computeBoundingSphere). Since we update the matrices each frame, the initial bounding sphere may be wrong, but the palms are near the origin and the camera looks at the origin. Set `leaves.frustumCulled = false` to be safe.

Shadows from instanced leaves: works.

Now the boat materials and geometry.

```ts
const boat = new THREE.Group();
const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.45, metalness: 0.05 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.5 });
const sailMat = new THREE.MeshStandardMaterial({ color: 0xfaf5e6, roughness: 0.85, side: THREE.DoubleSide });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x6a7280, roughness: 0.35, metalness: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x22303a, roughness: 0.4 });
```

Hull lathe:
```ts
const hullPts = [
  new THREE.Vector2(0.02, -0.62),
  new THREE.Vector2(0.32, -0.50),
  new THREE.Vector2(0.62, -0.28),
  new THREE.Vector2(0.80, 0.02),
  new THREE.Vector2(0.86, 0.25),
  new THREE.Vector2(0.82, 0.40),
];
const hullGeo = new THREE.LatheGeometry(hullPts, 24);
hullGeo.scale(1.0, 1.0, 2.3); // elongate along z
const hull = new THREE.Mesh(hullGeo, hullMat);
hull.castShadow = true; hull.receiveShadow = true;
boat.add(hull);
```
Wait: LatheGeometry rotates the 2D profile around the Y axis, creating a circle in XZ. Scaling z by 2.3 gives an ellipse 1.72 x 3.96. Good. But the profile's last point at r=0.82, y=0.40 means the hull is open at the top (rim). Fine; deck covers it. The hull's bottom starts at r=0.02, y=-0.62; nearly closed. Good.

Position hull at y=0? Its local y from -0.62 to 0.40. Set boat position y = waveHeight + 0.15 → hull bottom at waveHeight - 0.47, deck at waveHeight + 0.55. Good.

Deck:
```ts
const deckGeo = new THREE.CylinderGeometry(0.83, 0.83, 0.10, 24);
deckGeo.scale(1.0, 1.0, 2.35);
const deck = new THREE.Mesh(deckGeo, woodMat);
deck.position.y = 0.38;
```
CylinderGeometry(radiusTop, radiusBottom, height, radialSegments) with height 0.1 along Y, radius 0.83 in XZ; scaled z 2.35 → ellipse. Good. It matches the hull rim.

Add a rim (blue stripe): TorusGeometry? A torus with radius 0.83 and tube 0.04, rotated to the horizontal plane, scaled z 2.35. But the torus scaled non-uniformly would distort the tube. Could use an elliptical ring via `TorusGeometry(0.83, 0.035, 8, 48)` rotated X π/2 and scaled z 2.35. It will be slightly elliptical tube, acceptable. Add at y=0.34, color blue 0x2a5f7a. Nice.

Cabin:
```ts
const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.62, 1.05), cabinMat);
cabin.position.set(0, 0.72, -0.55);
```
Hull length 3.96 from z=-1.98 to 1.98. Cabin near the stern (-0.55). y from 0.41 to 1.03. Fine.
Add roof: BoxGeometry(0.95, 0.08, 1.15) at y=1.05, color slightly darker.
Add windows: small dark boxes on each side: BoxGeometry(0.02, 0.18, 0.55) at x=±0.43, y=0.78, z=-0.55. Also front window at z=-1.08? BoxGeometry(0.6,0.18,0.02). Good.

Mast:
```ts
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.2, 8), metalMat);
mast.position.set(0, 2.2, 0.45);
```
Hull top 0.4; mast from y=0.6 to 3.8. Good. Maybe place at z=0.45 (forward of the cabin). The sail extends aft.

Boom:
```ts
const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 6), metalMat);
boom.rotation.x = Math.PI/2;
boom.position.set(0, 1.25, -0.4);
```
A cylinder along Y rotated X π/2 → along Z. Length 1.7 from z=0.45 to -1.25. Position z=-0.4 center. Good.

Sail: triangle in the x=0 plane with a slight bulge. Points:
top (0, 3.75, 0.45)
bottom front (0, 1.30, 0.45)
bottom aft (0, 1.30, -1.20)
This is the main sail behind the mast? The mast is at z=0.45, the sail extends aft to z=-1.2. Good.
Add a slight bulge in x: use a 2D grid? Just a triangle with 3 vertices has flat shading. Could make a 4x4 mesh in the triangle with a sinusoidal bulge in x (0.15*sin(π*u)*sin(π*v)). Nice-looking sail:
Use a custom BufferGeometry with a parametric triangle:
sail vertices: A=(0,3.75,0.45), B=(0,1.3,0.45), C=(0,1.3,-1.2).
Parametric: P(u,v) = A + u*(B-A) + v*(C-B)? Hmm, a triangle map. Simpler: create a plane grid and shape it. Let's build a triangle strip grid:
for i in 0..N (rows along the luff from top to bottom), for j in 0..M (columns aft):
  t = i/N (0 at top, 1 at bottom)
  luff point L = A + t*(B-A)
  leech point? At each row, the sail's aft edge goes from A (top) to C (bottom aft). The shape is a triangle with vertices A (top), B (bottom front), C (bottom aft).
  For a horizontal row at t, the row spans from L (front edge) to R = A + t*(C-A) (aft edge).
  Then points = lerp(L, R, s) for s in 0..1, plus bulge x = 0.18 * sin(π*s) * sin(π*t).
```
Actually the triangle A,B,C: at t (0 at top A, 1 at bottom B-C edge), the front edge is L=lerp(A,B,t), the aft edge is R=lerp(A,C,t). The row between L and R. Good.
Build grid positions. Normals via computeVertexNormals. This yields a curved sail with a bulge. DoubleSide.
Set sailMesh castShadow true.

Jib sail: a smaller triangle in front of the mast from the mast top to the bow: A=(0,3.7,0.45), B=(0,1.1,0.45), C=(0,1.1,1.9). Build similarly with a bulge. Or just a flat triangle. Add it for beauty.

Flag: small red triangle at mast top.

Add a few ropes: thin cylinders from mast top to bow/stern. Cylinders along a direction: create a cylinder and orient with quaternion from Y to direction. Maybe 2 lines. Nice detail.

Boat length: hull ~4 z units. Good.

The boat's rotation.y: choose yaw such that the boat is viewed nicely—bow pointing toward the camera-right? Set yaw = -0.9 rad (~ -51°). The boat's +Z forward points (sin(-0.9), 0, cos(-0.9)) = (-0.78, 0, 0.62). From the camera at (35,35), the boat at (12,14): view direction to the boat ≈ (-23,-21) normalized (-0.74,-0.67). A boat facing (-0.78, 0.62) would present its side? The dot with the view direction = 0.58 -0.41=0.17 → nearly perpendicular, so we see the boat's side, good. Actually the boat's forward is (-0.78,0.62) → mostly -x,+z; the camera is +x,+z of the boat, so we see the boat from the starboard-ish side. Fine.

Let's set yaw = 0.7? Then forward = (0.64, 0.77), pointing toward the camera (+x,+z) — bow toward the viewer, less interesting. Use yaw = -0.6: forward (-0.56,0.82), side view. Good.

Boat position drift: base (12,14); drift x = 12 + Math.sin(t*0.05)*1.5, z = 14 + Math.cos(t*0.045)*1.5. Max distance sqrt(13.5²+15.5²)=20.6 < 25. Good.

Yaw could also slowly oscillate: yaw = -0.6 + sin(t*0.07)*0.15.

Then compute the forward/right vectors accordingly.

Boat height: `const bx = ..., bz = ...; const by = heightAt(bx,bz,t) + 0.18;`
Pitch: sample front/back at ±1.6 along forward, ±0.7 along right.
`pitch = -Math.atan2(hFront - hBack, 3.2);`
`roll = Math.atan2(hRight - hLeft, 1.4);`
Set `boat.position.set(bx, by, bz); boat.rotation.set(pitch, yaw, roll, 'YXZ')`? The Euler constructor signature is (x,y,z,order). `boat.rotation.set(pitch, yaw, roll)` and set `boat.rotation.order = 'YXZ'` beforehand. But `rotation.set(x,y,z)` keeps the order. So:
`boat.rotation.order = 'YXZ'; boat.rotation.set(pitch, yaw, roll);`

Wait, for the Euler order 'YXZ', the matrix = Ry * Rx * Rz? The roll about the boat's local Z after yaw and pitch. Good.

But the forward vector used for sampling should be the yawed forward, not affected by pitch/roll. Fine.

Smooth the pitch/roll slightly to reduce noise: `boat.rotation.x += (pitch - boat.rotation.x) * Math.min(1, delta*12)`? This creates a lag which could break the exact matching? Not required for the boat—only the height must follow the water. Smoothing might cause the boat to clip into waves. Direct is fine. Maybe smooth with a fast lerp (0.5) to avoid jitter; waves are smooth enough. Direct.

Add a constant offset of 0.15.

Island receives shadows, palms cast shadows.

Now the resize handler:
```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Animation loop:
```ts
let waveTime = 0;
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); // clamp to avoid jumps
  waveTime += dt;
  oceanUniforms.uTime.value = waveTime;
  ...
  sky.position.copy(camera.position);
  // update boat, leaves
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```
Using clock.getDelta() and accumulating ensures time is consistent. The initial dt may be 0; fine. Should we use `clock.getElapsedTime()`? We accumulate with dt clamped; time advances slightly slower if frames take >50ms. That's fine. But `time()` returns the same `waveTime`, matching.

Note: The sky position copies camera.position each frame—since the camera is static, just set once. Either way.

Expose:
```ts
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__sun = sun;
(window as any).__boat = boat;
(window as any).__island = island;
(window as any).__leaves = leaves;
(window as any).__ocean = { heightAt: (x,z,t) => waveHeightAt(x,z,t), time: () => waveTime };
```
Set these before the loop; __ready after the first render.

Now, the heightAt function and the shader constants must match exactly. Let me write them carefully.

Waves JS:
```ts
interface Wave { dx: number; dz: number; amp: number; k: number; omega: number; phase: number; }
const WAVES: Wave[] = [
  { dx: 0.9295, dz: 0.3687, amp: 0.40, k: 0.120830, omega: 1.08817, phase: 0.0 },
  { dx: -0.4258, dz: 0.9048, amp: 0.26, k: 0.216662, omega: 1.45715, phase: 1.7 },
  { dx: 0.7820, dz: -0.6234, amp: 0.15, k: 0.369599, omega: 1.90317, phase: 4.1 },
  { dx: 0.1961, dz: 0.9806, amp: 0.09, k: 0.698132, omega: 2.61566, phase: 2.3 },
];
function waveHeightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) {
    h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
  }
  return h;
}
```
Check the direction lengths: (0.9295² + 0.3687²) = 0.8640 + 0.1359 = 0.9999. Good. (-0.4258²=0.1813, 0.9048²=0.8187) sum 1.0000. (0.7820²=0.6115, 0.6234²=0.3886) sum 1.0001. (0.1961²=0.0385, 0.9806²=0.9616) sum 1.0001. Good.

Max height = 0.90 → crest-to-trough 1.8. Requirement 0.5-2. Good.

Now, boat samples with these waves. The boat's length 4 at wavelengths 52/29/17: sampling front/back at 1.6 gives slopes.

Potential aliasing: The 9-unit wave at 1.56 spacing gives ~5.8 samples per wavelength. Fine.

Ocean mesh displacement: at the island, the ocean surface will intersect the island (island rises above). Since the island mesh is opaque and drawn, the water is drawn over/under depending on depth. The island's underwater parts are below the water surface and the water is opaque, so the water hides them. At the shoreline, the island emerges. Looks like a beach. 

Add shallow water color near the island: the distance from the origin. Good.

One concern: The ocean plane's vertices under the island will be displaced, but the island covers them. Fine.

Lighting of the island: MeshStandardMaterial with vertex colors, receiveShadow. The sun is behind, so the front is dark. The fill light from the camera side at intensity ~1.2 will light it. But fill DirectionalLight doesn't cast shadows. That's fine.

Let's increase the fill to 1.5 with a warm-cool color 0xc8d8e8. Hemisphere 1.2. Ambient 0.2. Sun 3.4.

Overall exposure 1.1.

I should test in my head: ocean deep color very dark with a low sun; specular gold path. Fresnel reflection of the sky at grazing angles → bright. The ocean looks good.

The sky gradient top #1b5a9e → linear ~ (0.008, 0.10, 0.34)? Actually sRGB #1b5a9e = (27,90,158)/255 = (0.106,0.353,0.620) → linear (0.010, 0.102, 0.341). Horizon #aec9dc = (0.68,0.79,0.86) → linear (0.42,0.58,0.72). With ACES these become nice. Sun color #ffd2a2 → linear (1.0, 0.62, 0.36). Ocean deep #042c3e → linear (0.001, 0.024, 0.049). Shallow #20909a → linear (0.014, 0.276, 0.323). Deep is very dark; the Fresnel reflection will brighten most of it at grazing angles. The near water directly below the camera has low Fresnel (~0.02) and will be dark. Add a bit of ambient to the water color: mix with shallow at 0.1. Fine.

Maybe make the deep water a bit brighter: 0x073b4f. Fine.

Now potential TypeScript strict errors:
- `(window as any).__scene = scene;` fine.
- `clock.getDelta()` etc.
- `THREE.Euler` order typed as string? The constructor accepts EulerOrder type; `'YXZ'` is a valid literal. Using `euler.set(0, yaw, tilt, 'YXZ')` — the set signature: set(x, y, z, order?: EulerOrder). Passing 'YXZ' is fine.
- `new THREE.Euler(0, 0, 0, 'YXZ')` fine.
- `BufferGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))` where colors is number[].
- `geometry.getAttribute('position')` returns BufferAttribute; `position.getX(i)` etc. Use `const posAttr = geo.attributes.position as THREE.BufferAttribute;` Since with strict, `attributes.position` type is `BufferAttribute | InterleavedBufferAttribute`? In recent Three.js, `attributes` is `{ [name: string]: BufferAttribute | InterleavedBufferAttribute }`; `pos.getX(index)` exists on both. `setY` exists on both. Fine. Need to call `geo.computeVertexNormals()` after modifying, which uses the position attribute. But after modifying positions, we should set `pos.needsUpdate = true` — computeVertexNormals reads from the CPU-side array and writes normals; no need for needsUpdate before compute (it's CPU). Then `geo.computeVertexNormals()`, and `geo.computeBoundingSphere()` maybe.

Actually, for a `PlaneGeometry` with position attribute `Float32BufferAttribute`, `pos.setY(i, y)` works. Then `geo.computeVertexNormals()`. Good. Set `pos.needsUpdate = true` for rendering (though it's initialized before the first render, still fine).

- The vertex colors: `new THREE.Float32BufferAttribute(colorArray, 3)`.

- InstancedMesh constructor: `new THREE.InstancedMesh(leafGeo, leafMat, count)`. Set `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.
- `leaves.setMatrixAt(i, dummy.matrix)`.

- `renderer.setAnimationLoop` callback typed.

- `THREE.SRGBColorSpace` exists in recent versions.

- `renderer.outputColorSpace = THREE.SRGBColorSpace`.

- Shadow: `sun.shadow.mapSize.set(2048, 2048)`.

- `sun.shadow.camera` is OrthographicCamera; assign left etc.

- `scene.fog = new THREE.Fog(0xa8c4d8, 80, 340);` Fog constructor (color: ColorRepresentation, near?, far?). Good.

- Using `new THREE.Color(0x...)` for uniforms.

For the ocean ShaderMaterial, uniforms object type: `{ [uniform: string]: THREE.IUniform }`. Define as `const oceanUniforms = { uTime: { value: 0 }, ... };` and pass. TypeScript infers. Need `uTime.value` assigned a number. Fine. But TS may complain assigning `oceanUniforms.uTime.value = waveTime`? value is inferred as number, fine. `uSunDir: { value: SUN_DIR }` — inferred Vector3, fine. When constructing ShaderMaterial with `uniforms: oceanUniforms`, okay.

Potential issue: `THREE.ShaderMaterial` with `glslVersion` default; `#include <tonemapping_fragment>` works.

Let me make sure the shader's `out` parameter syntax compiles under WebGL2 with GLSL1. `void waveSample(vec2 p, float t, out float h, out vec2 grad)` — in GLSL ES 1.00, out parameters are allowed. Yes.

One more consideration: Three.js prepends `#define HIGH_PRECISION` etc. and also defines `varying` for GLSL1. Our use of `gl_FragColor` is fine.

Shader material lights: none.

Sky material must be transparent? No, opaque; depthTest false, depthWrite false. Set `sky.renderOrder = -1`. It will render first; since depthTest false, it writes color everywhere. Then all other objects draw over it. Good. `sky.frustumCulled = false`.

The far water plane: it's at y=-1.2, which is below the sky? The sky is depth-tested off, so fine. The far plane renders after the sky and before/after the ocean depending on render order; depth buffer from the ocean—both are opaque. The far plane might cover the ocean where the ocean's depth is farther. It only covers the area beyond the ocean plane. Fine.

But wait: The far plane color = fog color and fog=false. It will occupy the whole screen below the horizon where the ocean doesn't cover, i.e., from the ocean edge to the horizon. The main ocean at the edge is fogged ~80%, so the color difference is small. Good.

Hmm, but the far plane at y=-1.2 is an infinite-looking plane; its far edge at 4000 appears at angle atan(-1.2/4000) ≈ -0.017°, essentially at the horizon. So above the horizon: sky. Good.

Should the far plane receive the sun glitter? No; it's fully fogged anyway.

Now, tone mapping and the sky's brightness: The sun disc value 3*vec3(1.8,1.5,1.1) ≈ (5.4,4.5,3.3) → ACES maps to near white with a warm tint. Good. The sky top has a linear 0.01/0.1/0.34, ACES → maybe (0.1,0.35,0.6). Fine.

Let's decide the sky colors:
- uSkyTop = 0x1a5c9e (blue).
- uSkyHorizon = 0xaec9dc.
- Fog = 0xa8c4d8 (close).
- Sun color = 0xffd2a2.

Sky gradient uses `pow(y, 0.45)` so most of the sky is near the horizon color; at y=0.5, pow(0.5,0.45)=0.73 → 73% top? mix(horizon, top, 0.73) → mostly top. Actually mix(a,b,t) with t=0.73 gives mostly b (top). So at 30° elevation, the sky is mostly the top color. That's fine, with a bright band near the horizon. Maybe use pow(y, 0.6) for a slower transition. Use 0.5.

The sun glow: `pow(sd,8)*0.35 + pow(sd,64)*1.1` plus disc. Good.

Water sky reflection uses the same colors, so the water reflects the sky. Nice.

Now write the island's vertex-color conversion carefully. Use helper `smoothstep`:
```ts
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}
```
Define in TS.

Colors:
```ts
const sand = new THREE.Color(0xd9c89f);
const wetSand = new THREE.Color(0x9c8461);
const grass = new THREE.Color(0x477a35);
const grassDark = new THREE.Color(0x2c5726);
const rock = new THREE.Color(0x767a6c);
```
Blend:
```ts
const h = y;
const t1 = smoothstep(0.3, 1.6, h);
const t2 = smoothstep(3.5, 6.5, h);
const c = sand.clone().lerp(grass, t1);
c.lerp(rock, t2 * 0.85);
const wet = 1 - smoothstep(-0.1, 0.45, h);
c.lerp(wetSand, wet * 0.7);
// variation
const v = 0.82 + 0.36 * (0.5 + 0.5 * Math.sin(x * 0.7 + z * 1.3 + 2.0));
c.multiplyScalar(v);
```
Also grass variation: darken with another noise. Fine.

Set the color attribute values `c.r, c.g, c.b` (linear).

Peak height 9.5; at h=6.5 → rock. Good.

Palms: base on sand/grass. Use the same height function.

Should the island be a Group? Requirement: "Expose the island (Mesh or Group) as __island; it receives shadows." Use the mesh itself; set receiveShadow. Fine. But maybe include rocks in the group? Expose the main island mesh. Use `const island = new THREE.Mesh(...)`; `island.receiveShadow = true; island.castShadow = true;`. `(window as any).__island = island`.

Add rocks: a few icosahedron meshes on the island, gray, cast/receive shadows. Nice detail. 3 rocks.

Now the leaf instanced mesh count: 7 palms × 8 = 56 ≥ 30. Good. "at least 5 palm trees": 7.

Trunk meshes: 7, plus crown spheres.

The palms are added directly to the scene, not to the island mesh (the island is a mesh; we could add palms as children of the island, but the island mesh has transformed geometry; adding as scene children is simpler, positioned in world coordinates). Fine.

Palm positions relative to the island's actual height. Use `islandHeight` to place.

Check `islandHeight` at the palm spots, including the ridge noise. Let's compute for (5,5):
r=7.071, θ=0.785. rr = 7.071*(1 + 0.10*sin(3*0.785+0.7) + 0.06*cos(5*0.785+1.9)).
sin(2.356+0.7=3.056)=0.086; cos(3.927+1.9=5.827)=0.899. rr=7.071*(1+0.0086+0.0539)=7.071*1.0625=7.513.
n = 1 - 7.513/24 = 0.687.
h = 11*0.687^1.7 - 2.2. ln0.687=-0.375; *1.7=-0.638; exp=0.528; 11*0.528=5.81; -2.2=3.61.
ridge = sin(5*0.33+1.3)*cos(5*0.29-0.6)*0.9 + sin(5*0.11 - 5*0.15)*0.7
= sin(2.95)*cos(0.85)*0.9 + sin(0.55-0.75=-0.2)*0.7
= 0.190*0.660*0.9 + (-0.199)*0.7 = 0.113 - 0.139 = -0.026.
h += ridge*n = -0.018 → 3.59. Good, above water.

(9,6): r=10.817, θ=0.588. rr = 10.817*(1+0.10*sin(2.464)+0.06*cos(4.84)) = 10.817*(1+0.0628+0.0126) = 10.817*1.0754=11.63. n=1-0.4846=0.5154. h=11*0.5154^1.7-2.2. ln=-0.663*1.7=-1.127; exp=0.324; 11*0.324=3.56-2.2=1.36. ridge: sin(9*0.33+1.3=4.27)= -0.90; cos(6*0.29-0.6=1.14)=0.417; term=-0.338; sin(9*0.11 - 6*0.15 = 0.99-0.9=0.09)=0.09*0.7=0.063; total -0.275; *n=-0.142 → 1.22. Above water. Good.

(1.5,9): r=9.124, θ=1.405. rr=9.124*(1+0.1*sin(4.915)+0.06*cos(8.925)). sin(4.915)=-0.977; cos(8.925)=-0.933? 8.925 rad mod 2π=2.642; cos=-0.879. rr=9.124*(1-0.0977-0.0527)=9.124*0.8496=7.75. n=0.677. h=11*0.677^1.7-2.2: ln=-0.390*1.7=-0.663; exp=0.515; 5.66-2.2=3.46. ridge: sin(1.5*0.33+1.3=1.795)=0.974; cos(9*0.29-0.6=2.01)= -0.424; term=-0.372; sin(1.5*0.11-9*0.15=0.165-1.35=-1.185)=-0.927*0.7=-0.649; total -1.02*n=-0.69 → 2.77. Good.

(-4,-7): r=8.062, θ=atan2(-7,-4)= -2.09 (or 4.19). rr = 8.062*(1+0.1*sin(3*(-2.09)+0.7=-5.57)+0.06*cos(5*(-2.09)+1.9=-8.55)). sin(-5.57)=0.665? sin(-5.57)= -sin(5.57)= -(-0.66)=0.66? 5.57 rad mod 2π = 5.57-6.283=-0.713; sin=-0.654; so sin(-5.57)=0.654. cos(-8.55): -8.55+2π=-2.267; cos=-0.643. rr=8.062*(1+0.065-0.0386)=8.062*1.0264=8.275. n=0.655. h=11*0.655^1.7-2.2: ln=-0.423*1.7=-0.719; exp=0.487; 5.36-2.2=3.16. ridge: sin(-4*0.33+1.3=-0.02)= -0.02; cos(-7*0.29-0.6=-2.63)= -0.872; term=0.0157; sin(-4*0.11 - (-7)*0.15 = -0.44+1.05=0.61)=0.573*0.7=0.401; total 0.417*0.655=0.273 → 3.43. Good.

Others fine.

We want palms visible; place some on the near side (+x,+z): (5,5), (9,6), (7,-3), (1.5,9). Good.

Now, InstancedMesh leaf orientations: each palm's crown position is p3. Leaves radiate. The crown sphere at p3.

I need to ensure leaves are visible from the camera side; radiate all around.

Potential issue: Leaf instances' matrices are updated after the first render? We'll update them before the first render in the loop. Fine.

Now, do we need to add `leaves.instanceMatrix.needsUpdate = true` every frame—yes.

Let me write the whole file now, carefully.

Consider TypeScript strict issues with `THREE.BufferAttribute` vs `InterleavedBufferAttribute`:
```ts
const pos = islandGeo.attributes.position as THREE.BufferAttribute;
for (let i = 0; i < pos.count; i++) { ... pos.setY(i, h); }
```
`attributes.position` is `BufferAttribute | InterleavedBufferAttribute`; casting to BufferAttribute is fine (TypeScript allows assertion).

`islandGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));` colors: number[].

Leaf geometry: `const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();`. Index array number[] accepted.

InstancedMesh `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);` — instanceMatrix is InstancedBufferAttribute; has setUsage.

`dummy.quaternion.setFromEuler(euler)` fine.

`const euler = new THREE.Euler(0,0,0,'YXZ');` The Euler constructor's last argument is `EulerOrder`, and 'YXZ' is assignable. Good.

Boat geometry LatheGeometry points: `new THREE.Vector2(...)`, array. `new THREE.LatheGeometry(hullPts, 24)`.

`hullGeo.scale(1,1,2.3)`.

The boat group's children cast shadows: iterate `boat.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } })`. `instanceof` is fine. Or set individually.

Now, the sail mesh: build a parametric grid.

```ts
function makeSailGeometry(A: THREE.Vector3, B: THREE.Vector3, C: THREE.Vector3, bulge: number): THREE.BufferGeometry {
  const rows = 6, cols = 5;
  const positions: number[] = [];
  const indices: number[] = [];
  const tmpL = new THREE.Vector3(), tmpR = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    tmpL.lerpVectors(A, B, t);
    tmpR.lerpVectors(A, C, t);
    for (let j = 0; j <= cols; j++) {
      const s = j / cols;
      p.lerpVectors(tmpL, tmpR, s);
      const b = bulge * Math.sin(Math.PI * s) * Math.sin(Math.PI * t);
      positions.push(p.x + b, p.y, p.z);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
```
The sail's plane is x=0 with a bulge along x. The front edge A→B is vertical (mast). The aft edge A→C goes from top to bottom-aft. Good.

Winding order for a sail: DoubleSide so it doesn't matter. Normals computed; lighting on both sides.

A = (0, 3.7, 0.45), B = (0, 1.35, 0.45), C = (0, 1.35, -1.25).
This is a large sail: height 2.35 and foot 1.7. Nice.

Jib: A=(0,3.5,0.45), B=(0,1.2,0.45), C=(0,1.0,1.85). Hmm, the jib's foot should attach at the bow (z=1.85). Use A (top), B (bottom at mast), C (bow). The triangle is a bit odd but okay.
Add a forestay rope from the mast top to the bow.

Flag: a small triangle at (0, 3.95, 0.45)? The mast top is at y = 2.2 + 1.6 = 3.8. Put the flag at 3.85. A tiny plane triangle (0,0,0), (0,0.18,0), (0.35,0.09,0) rotated? Could skip. Add a small sphere at the mast top (finial). Maybe enough.

Ropes: use `makeRope(from, to)` creating a thin cylinder:
```ts
function makeRope(a: THREE.Vector3, b: THREE.Vector3, mat: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.012, 0.012, len, 4);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
  return mesh;
}
```
Add ropes from mast top (0,3.7,0.45) to bow (0,0.45,1.85) and to stern (0,0.45,-1.8). Nice detail. Since the boat group is rotated, these local positions are fine.

Now the boat's bobbing: The boat group is at position (12, y, 14). The hull's local origin at waterline. Good.

Now, the boat's shadow onto the island? Not near. Onto itself. The sail casts a shadow on the deck? Sun from behind, shadow forward. Fine.

Let's check the DirectionalLight shadow camera coverage: The light position = SUN_DIR * 120 = (-96, 28.8, -66). The target at origin. The ortho camera ±50 covers a 100x100 area around the target in the light's view. The island (radius 25) and boat (12,14) are within ±50 of origin, so covered. The shadow camera near 20 far 260; the light is 120 from origin; the scene depth along the light direction is roughly 120 ± 40. Fine.

Hmm, the boat at (12,14) and the island are both within the ortho box of ±50 centered at origin. Good.

Now the sky dome follows the camera; camera at (35,12,35). The sphere radius 4000 centered there. The far plane is 12000. Good.

The ocean plane 400x400 centered at the origin. The camera at (35,35) is inside the plane's XZ extent (±200). Good. The camera is above the water at y=12.

Now, the ocean plane's vertices near the camera: the camera at (35,35) sees the water below with waves. Good.

The near plane 0.5; no objects closer.

The boat at (12,14) is 25 units from the camera; visible. The island at the origin with palms. Good.

Let's think about the framing: camera at (35,12,35) looking at (0,2,0), fov 58. The boat at (12,0,14) is between the camera and the island, slightly to the left? Distance from the camera to the boat ≈ sqrt(23²+1²+21²)=31, and the island at ~50. The boat appears about 4 units long at 31 distance with fov 58: screen size ≈ 4/(2*31*tan29°) ≈ 4/34.4 ≈ 0.116 of the screen height, ~12%—decent. The island diameter 36 at 50 distance: 36/(2*50*tan29)=36/55.4=0.65 of the screen height. Good.

The camera looks at (0,2,0), so the island's peak at y=9.5 will be in the upper part. The boat at y~0 is in the lower-center. The horizon is above. Good composition.

The sun is up-left near the top. Nice.

Now, the __ocean.time() must return the wave time. `waveTime` is a let variable captured in the arrow function. Good.

Do we need to expose the island as a Mesh or Group that receives shadows—yes.

Potential grading checks:
- window.__ocean.heightAt called with (x,z,t) and compared to the render? They can't easily compare pixels, but they may check that heightAt returns values in a range and changes with t. Our function is exact.
- window.__boat is a Group. Yes.
- __leaves is an InstancedMesh with count >= 30. Yes, 56.
- instanceMatrix.needsUpdate after update—yes, set true each frame.
- __sun is a DirectionalLight with castShadow. Yes.
- renderer.shadowMap.enabled, mapSize <= 2048. Yes.
- scene.fog. Yes.
- toneMapping ACES. Yes.
- camera position exactly (35,12,35) and lookAt (0,2,0). Yes. We set `camera.position.set(35,12,35); camera.lookAt(0,2,0);`.
- ocean size >= 400. 400x400 exactly. Grid 256x256. Both meet the constraints.
- The boat within 25 of the origin: drift max ~21. Yes.
- The boat y = heightAt + constant. Yes, offset 0.18.

One nuance: "Every frame its height follows the water: y = heightAt(x, z, time()) plus a constant offset". Our boat position y = waveHeightAt(bx, bz, waveTime) + 0.18. Yes.

Pitch/roll from sampling. Yes.

Now, the boat's x,z drift is deterministic and slow. The requirement says "it may drift slowly". Good.

Let's write the code.

One more thing: Should the island's palm trees be in the island group? They're at world positions computed from islandHeight. Fine.

Now, for the ocean's near-shore color and foam, the island's radius ~18; the shore foam ring between r=18 and 32. The foam will be visible around the island. Good.

But note the island's irregular coastline means the foam ring may be slightly offshore; acceptable.

Let's ensure the ocean's fragment shader compiles: `float n = 0.5 + 0.5 * sin(...) * sin(...)`; fine.

`vec3 waterCol = mix(uDeepColor, uShallowColor, shore * 0.75);` where shore = 1.0 - smoothstep(16.0, 48.0, r). At r=16, shore=1; at 48, 0. Good.

`waterCol = mix(waterCol, uShallowColor * 1.3, smoothstep(0.30, 0.95, h) * 0.5);` fine.

Fresnel: `clamp(fres * 0.92 + 0.05, 0.0, 1.0)`.

Specular with pow(..., 850.0) may be too sharp and alias. Add a mid lobe: pow(NdH, 120)*0.4. Also add glitter from a normal perturbation? The wave normals at 9-unit wavelength produce sparkling. The pow exponent 850 with a coarse mesh but per-pixel normals gives crisp glints. Good. Maybe reduce to 400 for a broader highlight: `pow(NdH, 400.0) * 5.0 + pow(NdH, 40.0) * 0.2`.

Actually, for a realistic sun reflection, use a GGX-ish: spec = pow(NdH, 200) * 3. Fine.

Let me also add a subtle whitecap threshold based on the wave height and a noise. Done.

Now, a big question: does the ocean's custom shader fog match scene.fog? We implement manual fog in the ocean with uFogNear/Far = 80/340, and scene.fog = Fog(0xa8c4d8, 80, 340). Consistent.

The island and boat use built-in materials with fog enabled, blending to the same color. Good.

Now write everything.

Also handle `window.devicePixelRatio` — cap at 2.

Add `document.body.style.margin = '0'; document.body.style.overflow='hidden';`? The page has no other HTML; the canvas appended. By default the body has margin 8px, creating a scrollbar and an offset. Set `document.body.style.margin = '0px'; document.body.style.overflow = 'hidden';`. Good.

Also set canvas display block.

Let's think about the sky following the camera: `sky.position.copy(camera.position)` is set once at creation (camera static). Fine.

Now, one risk: the ShaderMaterial's `#include <colorspace_fragment>` requires the material to be compiled with the output color space; Three.js does that. Yes.

Another risk: `smoothstep` with equal edges not used.

Another: `pow(sd, 900.0)` in the sky shader: pow(0, 900)=0; fine. `pow` with high exponents can be slow but okay.

The sky's sun disc might be hidden behind the island? The island peak at 9.5 and the sun elevation 14° behind it; the island subtends from the camera at distance 50: height 9.5 → angle atan((9.5-12)/50) ≈ -2.9° to +? The sun at 14° is well above the island. Visible.

Wait, the sun's screen y: y_ndc 0.826, so it's near the top. The island's peak: from the camera at y=12 to the island peak at y=9.5, distance 50 → below the horizon slightly; the island occupies the middle of the screen. Good.

Now, the sun's specular path on the water: The sun is toward (-0.8,-0.56), the camera looks toward (-0.7,-0.7); the reflection direction from the water aligns with the sun when looking toward the sun horizontal direction. So the specular path is a vertical-ish stripe on the water near the sun's azimuth, left of center. Nice.

Now, the boat at (12,14) is to the left of the camera's view? The camera-to-boat direction: (12-35,14-35)=(-23,-21) normalized (-0.74,-0.67), vs the camera forward (-0.69,-0.69). The boat is almost exactly center, slightly left. Good. The bow points forward (-0.56,0.82) — from the camera, the boat's bow points away-left; we see its starboard side. The sail is visible from the side. Good.

The island behind the boat. Nice composition.

Let's write the boat meshes with attention to the deck/hull overlap.

Hull lathe top radius 0.82 at y=0.40, scaled z 2.3. Deck cylinder radius 0.83, scaled z 2.35, height 0.10, position y=0.38. The deck will slightly stick out; fine.

Cabin at (0, 0.72, -0.55) with size 0.85 x 0.62 x 1.05; bottom at 0.41 sits on the deck top 0.43. Good.

Mast at (0, 2.2, 0.45), height 3.2 → from 0.6 to 3.8. It passes through the deck at y=0.38; the bottom at 0.6 is above the deck—floating! Move the mast down: position y = 2.0, height 3.2 → bottom 0.4, top 3.6. Good. Use cylinder center at y=2.0.

Sail top at 3.6? Use A=(0,3.55,0.45). Boom at y=1.2.

Cabin roof at 1.05.

Jib top at 3.4.

Boom position y=1.22, from z=0.45 to -1.25 → center z=-0.4, length 1.7. Good.

Ropes: mast top (0,3.6,0.45) to bow (0,0.45,1.9) and stern (0,0.45,-1.85).

Flag at the mast top (0,3.7,0.45).

Boat hull length 3.96, "about 4 units long". Good.

Now, the palm trunk's `TubeGeometry` with a CatmullRomCurve3: the trunk leans. The crown at p3. Add a crown sphere at p3 radius 0.32, color 0x6b8a3a. Add 3 coconut spheres radius 0.12 color 0x5a4020 around it? Nice but extra. Keep a crown and 2 coconuts.

Leaves attach at the crown; the geometry starts at origin with width 0.02, so they radiate from the crown center. Good.

All leaves are one InstancedMesh. The crown spheres and coconuts are separate meshes (not leaves). Fine.

Now, "Draw ALL leaves of all palms as ONE InstancedMesh with at least 30 instances" — we do 56. Make sure no other leaf meshes are created.

Also "sway them in the wind by updating the instance matrices every frame (instanceMatrix.needsUpdate = true)". Yes.

Let me now write the final code. I'll be careful with the GLSL string escaping (backticks fine).

Potential TypeScript error: In the `renderer.setAnimationLoop` callback, using `let waveTime = 0;` captured, fine.

Also `(window as any).__ocean = { heightAt: waveHeightAt, time: () => waveTime };` — exposing the function directly is fine.

Let me consider `clock.getDelta()`: If the tab is inactive, delta could be large; clamp to 0.1 to avoid jumps. Then waveTime accumulates slower than real time, but time() matches the shader. Fine.

The first frame's dt might be ~0; fine.

Now the island plane: 64 x 64 with 128 segments → 129×129 = 16641 vertices; fine.

Wait, `PlaneGeometry(64, 64, 128, 128)` creates vertices from -32 to 32. The island radius at the waterline ~18, so the plane extends to 32 (r up to 45 at the corners) at -2.2. Good.

But the plane's square corners at (-32,-32) are at distance 45, underwater; the ocean plane is 400x400 and covers them. Fine.

Use `islandGeo.rotateX(-Math.PI/2)` before displacing, so the position attribute has x,z with y=0 and the plane in XZ. Then displace y. Normals computed after.

Island material `flatShading: false` for smooth shading. The 128 grid is smooth. Maybe use flat shading for a stylized look? Realistic is better: smooth.

Now the vertex color attribute and material. The colors are linear; the material will multiply by the light. Good.

The island castShadow: The island is a single-sided plane; casting shadows from a heightfield works. Self-shadowing may show. Set `material.side = THREE.DoubleSide`? For a heightfield viewed from above, FrontSide is fine. Shadow casting with FrontSide uses the front faces; okay. Actually, for shadow maps, Three.js renders the material's shadow side (default BackSide for FrontSide materials? `shadowSide` defaults to the opposite of side). For a heightfield, either works. Keep default.

Rocks: 3 icosahedrons at positions on the island with `islandHeight + 0.2`. Cast/receive shadows. Color gray.

Now the fill light intensity: with ACES and physically-based lights, a DirectionalLight of intensity 3.0 with a white-ish color gives bright sunlight. Since it's low-angle, the horizontal surfaces receive sin(14°)=0.24 of it → 0.72 effective. That's dim for the island top. The fill (1.2) from the camera side also low-ish? Set the fill at (35,25,35) normalized; elevation ~30°, so horizontal surfaces get 0.5*1.2 = 0.6. Hemisphere 1.2 adds skylight ~ 0.6 for up-facing surfaces. Total up-facing ~2, decent. The vertical faces facing the camera get the fill at ~1.0 plus hemisphere 0.6. Fine.

Sun intensity: 3.5. The sand facing the sun gets bright, the camera side dimmer.

Maybe raise the sun elevation to 18° for more light while still visible? Check y_ndc with fov 58: sun elevation 18°: y=0.309, horizontal 0.951 → sunDir = (-0.80*0.951? let's keep horizontal direction (-0.819,-0.574) scaled by cos18=0.951 → (-0.779,-0.546), y=0.309). Camera coords: x_cam = -0.551+0.386=-0.165; y_cam = 0.108+0.301+0.076=0.485; z_cam = -0.537+0.061-0.376=-0.852. y_ndc = 0.485/(0.852*0.554)=1.03 → just out of frame. So 18° is out with fov 58. Use elevation 14°: y_ndc = 0.826 (computed earlier with 13°; at 14° slightly higher ~0.87). In frame. Use 14°.

Sun direction: horizontal (-0.819,-0.574) (normalized) * cos14=0.970 → (-0.7944,-0.5568), y=sin14=0.2419. sunDir = (-0.794, 0.242, -0.557). Good.

Shadow length for peak 9.5: 9.5/tan14 = 9.5/0.249 = 38. Boat at 18.4 → shadowed. OK.

Let's raise the fill intensity to 1.5 and add a warm rim? The sun already gives rim light on the backside.

Maybe the island colors with the fill (cool blue) will look nice against the warm sun.

Let's finalize the lighting:
- sun intensity 3.6, color 0xffd0a0.
- hemi sky 0xa8c8e8, ground 0x3a5548, intensity 1.1.
- fill directional 0x9fc0e0 intensity 1.1, position (40, 30, 40).
- ambient 0.12.

Tone exposure 1.1.

Now, potential issue: The sun light's shadow covers the island and the boat; the boat is in the island's shadow. The boat's white hull will be lit by the fill and the hemisphere. The fill comes from the camera side, so the boat's visible side is lit. Good.

Now write it all.

Let me double-check the GLSL wave function constant values and the JS matching.

k1 = 2π/52 = 0.120830; omega1 = sqrt(9.8 * 0.120830) = sqrt(1.18413) = 1.08818. Use 1.08818.
k2 = 2π/29 = 0.216662; omega2 = sqrt(2.12329) = 1.45715.
k3 = 2π/17 = 0.369599; omega3 = sqrt(3.62207) = 1.90317.
k4 = 2π/9 = 0.698132; omega4 = sqrt(6.84169) = 2.61566.

Use these in both.

Phases 0, 1.7, 4.1, 2.3.

Now, an important detail about the ocean's vertex displacement and the plane's normals: We don't pass a normal attribute; we compute per-pixel normals from the gradient. Good.

The shader's `waveSample` is duplicated in the vertex and fragment shaders. Both must be identical. Fine.

One more consideration: `pow(y, 0.5)` where y can be 0 → fine.

Now the code. I'll write it in sections.

Also, `import * as THREE from 'three';` only; no addons needed. That's fine.

Let me handle the `window` type in TypeScript: `(window as any)`. Fine.

I should be careful: In `makeSailGeometry`, `p.lerpVectors(tmpL, tmpR, s)` and then `positions.push(p.x + b, p.y, p.z)`. Good.

Rope quaternion: `mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize())`. Good.

Boat group's pivot at the waterline. The hull's local y from -0.62 to 0.40, so the group origin at waterline. Setting boat.position.y = waterHeight + 0.18 means the hull's waterline is 0.18 above the water surface; the hull bottom is 0.44 below → about 0.44 submerged. Good, looks floating.

Actually, with waves ±0.9, the boat's pitch/roll follows the surface.

Now, the boat offset should account for the hull's draft; 0.18 is fine.

Let me now write.

```ts
import * as THREE from 'three';

// ============ Renderer ============
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);
```

Scene, camera.

Then helpers: waves, islandHeight, smoothstep.

Then sky, lights, ocean, island, palms, boat.

Then the loop.

Let me write out the shaders as constants at the top or inline.

I'll define the wave sample GLSL as a string variable `WAVE_GLSL` and interpolate into both shaders:

```ts
const WAVE_GLSL = `
void waveSample(vec2 p, float t, out float h, out vec2 grad) {
  ...
}
`;
```
Then vertexShader = `uniform float uTime; varying vec3 vWorldPos;` + WAVE_GLSL + `void main(){...}`. Since string interpolation, fine.

This ensures both are identical. Good.

Careful: Template literal with `${WAVE_GLSL}`.

Let me write the wave GLSL exactly:

```glsl
void waveSample(vec2 p, float t, out float h, out vec2 grad) {
  h = 0.0; grad = vec2(0.0);
  float k; float w; float ph; float s; float c;
  vec2 d;
  d = vec2(0.9295, 0.3687); k = 0.120830; w = 1.08818; ph = k * dot(d, p) - w * t + 0.0;
  s = sin(ph); c = cos(ph); h += 0.40 * s; grad += 0.40 * k * d * c;
  d = vec2(-0.4258, 0.9048); k = 0.216662; w = 1.45715; ph = k * dot(d, p) - w * t + 1.7;
  s = sin(ph); c = cos(ph); h += 0.26 * s; grad += 0.26 * k * d * c;
  d = vec2(0.7820, -0.6234); k = 0.369599; w = 1.90317; ph = k * dot(d, p) - w * t + 4.1;
  s = sin(ph); c = cos(ph); h += 0.15 * s; grad += 0.15 * k * d * c;
  d = vec2(0.1961, 0.9806); k = 0.698132; w = 2.61566; ph = k * dot(d, p) - w * t + 2.3;
  s = sin(ph); c = cos(ph); h += 0.09 * s; grad += 0.09 * k * d * c;
}
```
Using a single `d` variable reassigned; fine. This avoids block scoping issues.

Now the ocean fragment's `skyColor` uses uSunDir etc.

Compile concerns: `uniform vec3 cameraPosition;` is auto-injected—yes, for all materials. Don't redeclare it.

Now, for the sky material, we use `cameraPosition` in the vertex? `vDir = position` is enough; no cameraPosition. Fine.

Now the island color function:

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const rr = r * (1.0 + 0.10 * Math.sin(3.0 * th + 0.7) + 0.06 * Math.cos(5.0 * th + 1.9));
  const n = Math.max(0, 1.0 - rr / 24.0);
  let h = 11.0 * Math.pow(n, 1.7) - 2.2;
  const ridge = Math.sin(x * 0.33 + 1.3) * Math.cos(z * 0.29 - 0.6) * 0.9 + Math.sin(x * 0.11 - z * 0.15) * 0.7;
  h += ridge * n;
  return h;
}
```
At the center, n=1, h=8.8+ridge. The peak ~9.5. Good.

Check the shoreline: where h=0. Fine.

Palms: use positions; if the computed base is below 0.5, skip? All are fine. To be safe, check and adjust.

Now, the leaf count: `palms.length * LEAVES_PER_PALM`.

Let me build the palm function returning `{ trunk: THREE.Mesh, crown: THREE.Vector3 }`, plus adding the crown decor inside.

Actually, I'll create the trunks and crowns in a loop and collect crown positions.

```ts
interface PalmInfo { crown: THREE.Vector3; }
```

Let's write:

```ts
const palmSpots: [number, number][] = [
  [5, 5], [-6, 4], [7, -3], [-4, -7], [1.5, 9], [-9, 1], [3, -9]
];
const palmCrowns: THREE.Vector3[] = [];
for (const [px, pz] of palmSpots) {
  const baseY = islandHeight(px, pz);
  const leanDir = new THREE.Vector2(px, pz).normalize();
  const p0 = new THREE.Vector3(px, baseY - 0.2, pz);
  const p1 = new THREE.Vector3(px + leanDir.x * 0.4, baseY + 2.0, pz + leanDir.y * 0.4);
  const p2 = new THREE.Vector3(px + leanDir.x * 1.0, baseY + 4.0, pz + leanDir.y * 1.0);
  const p3 = new THREE.Vector3(px + leanDir.x * 1.7, baseY + 5.2, pz + leanDir.y * 1.7);
  ...
}
```
Trunk height 5.2. Top maybe 8+ above water; the peak is 9.5. Good.

For the TubeGeometry, `new THREE.TubeGeometry(curve, 12, 0.16, 6, false)`.

Taper: We can modify the geometry's radius? Not trivial. Constant trunk width is acceptable. Alternatively, use a custom extruded cylinder with a taper along the curve—skip.

Add a crown sphere at p3 (radius 0.3, color 0x6d7f3a). Add 2 coconuts (spheres radius 0.1) around p3.

Leaves count per palm 8.

Now leaf data:
```ts
const LEAVES_PER_PALM = 8;
const leafCount = palmCrowns.length * LEAVES_PER_PALM;
const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
```
Build leaf data array:
```ts
const leafInfo: { crown: THREE.Vector3; yaw: number; tilt: number; phase: number; scale: number }[] = [];
for (let pi = 0; pi < palmCrowns.length; pi++) {
  for (let li = 0; li < LEAVES_PER_PALM; li++) {
    const yaw = (li / LEAVES_PER_PALM) * Math.PI * 2 + pi * 0.7 + (Math.random()*0.3);
    const tilt = 0.28 + Math.random() * 0.22;
    ...
  }
}
```
Using Math.random at load: the scene differs each load, fine. But for consistent quality and no surprises, use deterministic pseudo-random based on indices: `const rnd = Math.sin(pi*12.9898 + li*78.233)*43758.5453; const f = rnd - Math.floor(rnd);`. But a simple deterministic function is nice:
```ts
function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
```
Use it.

Now update the matrices. The initial update before the first render.

The leaf material: `new THREE.MeshStandardMaterial({ color: 0x3b7a34, side: THREE.DoubleSide, roughness: 0.8, metalness: 0 })`. Maybe a slight emissive 0x0b1a08. For backlit leaves, a slight emissive helps. Use `emissive: new THREE.Color(0x0a1a06), emissiveIntensity: 0.4`? Emissive adds flat color. Keep subtle.

Instanced leaves also need `leaves.castShadow = true; leaves.receiveShadow = true;`. Set `leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage); leaves.frustumCulled = false;`.

Scene add.

Now the boat creation.

Now, an important point: After modifying the island geometry's positions, call `islandGeo.computeVertexNormals()`. Also `islandGeo.attributes.position.needsUpdate = true;`.

Now, the ocean's `uTime` uniform and the boat's `waveTime`.

Animation loop details:

```ts
let waveTime = 0;
let firstFrame = true;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  waveTime += dt;

  oceanUniforms.uTime.value = waveTime;

  // boat drift
  const bx = 12 + Math.sin(waveTime * 0.06) * 1.6;
  const bz = 14 + Math.cos(waveTime * 0.045) * 1.6;
  const yaw = -0.6 + Math.sin(waveTime * 0.05) * 0.12;

  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const L = 1.7, W = 0.75;

  const hC = waveHeightAt(bx, bz, waveTime);
  const hF = waveHeightAt(bx + fx*L, bz + fz*L, waveTime);
  const hB = waveHeightAt(bx - fx*L, bz - fz*L, waveTime);
  const hR = waveHeightAt(bx + rx*W, bz + rz*W, waveTime);
  const hL = waveHeightAt(bx - rx*W, bz - rz*W, waveTime);

  const pitch = -Math.atan2(hF - hB, 2*L);
  const roll = Math.atan2(hR - hL, 2*W);

  boat.position.set(bx, hC + 0.18, bz);
  boat.rotation.set(pitch, yaw, roll);

  // leaves
  ...
  // sky follows camera (static)
  sky.position.copy(camera.position);
  // renderer
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; (window as any).__ready = true; }
});
```

`boat.rotation.set(pitch, yaw, roll)` with order 'YXZ' set earlier. Note that Euler.set takes (x,y,z,order?) and if order is omitted, keeps the current order. So set `boat.rotation.order = 'YXZ'` at creation; then `boat.rotation.set(pitch, yaw, roll)`.

Hmm, the pitch computation: `-Math.atan2(hF - hB, 2L)`, with L=1.7 → 2L=3.4. Good. Roll: `Math.atan2(hR-hL, 2W)` with W=0.75 → 1.5.

The roll from the wave slope: if the right side is higher, the roll should raise the right side, so positive rotation.z. Good.

However, the Euler 'YXZ' with rotation.z = roll rotates about the boat's local Z after yaw and pitch. Good.

The boat's yaw drift is fine.

`boat.updateMatrixWorld()` is automatic in the render.

Now, the leaves update:

```ts
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const dummy = new THREE.Object3D();
let idx = 0;
for (const p of leafInfo) {
  const gust = Math.sin(waveTime * 1.3 + p.phase * 2.0) * 0.06;
  const sway = Math.sin(waveTime * 2.1 + p.phase) * 0.09 + gust;
  dummy.position.copy(p.crown);
  euler.set(0, p.yaw + Math.sin(waveTime*1.7 + p.phase)*0.05, p.tilt + sway, 'YXZ');
  dummy.quaternion.setFromEuler(euler);
  dummy.scale.setScalar(p.scale);
  dummy.updateMatrix();
  leaves.setMatrixAt(idx++, dummy.matrix);
}
leaves.instanceMatrix.needsUpdate = true;
```

Note: dummy.position.copy(p.crown) — the crown is the trunk top. Good.

Set the initial matrices before the loop by calling the same logic once. Or rely on the first frame (the loop updates before rendering). Yes, the loop updates before rendering. Fine.

`leaves` count = leafInfo.length.

Now the island shadows: The palms' leaves cast shadows; the sun is low so the shadows stretch. Nice.

One concern: The InstancedMesh's shadows require the material to handle instancing—built-in materials do. Good.

Now, the final code. Let me also add a subtle vignette? No post-processing.

Maybe add a few birds? Not needed.

Let's also add a distant sailboat? No.

Now, check that `THREE.ShaderMaterial` compiles with the given `#include` chunks. Since we use `gl_FragColor`, the chunks should be fine. In Three.js r160, the `colorspace_fragment` chunk is:
```
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
For ShaderMaterial, the prefix includes `linearToOutputTexel`? The `getTexelEncodingFunction` is added to the fragment prefix for all materials (in WebGLProgram). Yes, `linearToOutputTexel` is defined in the prefix via `getTexelEncodingFunction('linearToOutputTexel', ...)`. Good.

`tonemapping_fragment` is:
```
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
And `toneMapping` is defined in the prefix when TONE_MAPPING. Good.

The sky's `disc` brightness: `col += vec3(1.8,1.5,1.1) * disc * 3.0;` → up to (5.4,4.5,3.3); ACES maps to near white. Good.

Sun glow: `pow(sd, 900.0)` may cause artifacts if sd slightly >1 due to floating precision? sd = max(dot(dir, sunDir), 0) ≤ 1.0000001; pow is fine.

In the ocean's `skyColor`, the sun glow uses `pow(sd, 64.0) * 1.1`; the reflected sun on the water will be a bright warm spot. Good.

Now, let's double-check the ocean's specular: `N` is the up-ish normal; `H = normalize(uSunDir + V)`. If the sun is low and the view is low, the half-vector is low, and the wave normals need to tilt toward it. The specular will appear on wave slopes facing the camera/sun. Good.

Maybe add a "sun glitter" term that uses the reflection direction and sun dot:
`float sunGlint = pow(max(dot(R, uSunDir), 0.0), 100.0); col += uSunColor * sunGlint * 1.5;`
This is similar. Fine.

Let me finalize the code.

Potential TS strict error: `renderer.domElement.style.display = 'block';` fine.

`document.body.style.overflow = 'hidden';` fine.

`scene.fog = new THREE.Fog(FOG_HEX, 80, 340);` — with FOG_HEX as a number. Good.

Uniform `uSkyTop` value should match the sky's uniform color object (can share).

Let me define shared colors:
```ts
const SKY_TOP = new THREE.Color(0x1a5c9e);
const SKY_HORIZON = new THREE.Color(0xaec9dc);
const SUN_COLOR = new THREE.Color(0xffd2a2);
const FOG_COLOR = new THREE.Color(0xa8c4d8);
```
Use clones for uniforms to avoid mutation (we never mutate them).

Now the code.

Also, one more thought: the ocean plane geometry 400x400 with 256x256 segments = 65,536 quads → 131,072 triangles; with 66k vertices, the vertex shader runs 66k times/frame. The fragment shader runs at ~2M pixels at 1080p, with 4 waves and trig plus pow. Should be fine at 60fps on mid-range.

Set pixel ratio max 2; at 4K with DPR 2, the fragment cost is high. Use `Math.min(devicePixelRatio, 1.75)` to be safe. Requirement just says smooth. Use 1.75.

Shadows: 2048. Good.

Now, the far plane: 8000x8000 at y=-1.2. Its bottom below the water? It's a flat plane; from the camera, it will be below the ocean plane y=0, so beyond the ocean edge it's visible. Its color pale. Fine.

Actually, the far plane extends under the detailed ocean plane too (at y=-1.2). The detailed ocean plane covers it (opaque). No z-fighting since 1.2 apart.

Now, is y=-1.2 below the ocean's trough at -0.9? Yes. Good.

Now, write the sky's below-horizon fade to avoid a hard line at the bottom of the sphere: `float below = 1.0 - smoothstep(-0.08, 0.0, dir.y);` then `col = mix(col, uSkyHorizon * 0.95, below);`. Since the ocean/far plane covers below the horizon anyway, this is just a fallback.

Hmm, the sky horizon color and far plane color differ slightly (0xaec9dc vs 0xa8c4d8). Close enough.

Now, let's write the complete file. I'll be meticulous.

One more thing: `THREE.DynamicDrawUsage` exists.

The island geometry position attribute count: `PlaneGeometry(64, 64, 128, 128)` → 129*129=16641 vertices. Loop. Fine.

Vertex colors: `const colors: number[] = new Array(vertices * 3)`? Use push.

Let me write:

```ts
const islandGeo = new THREE.PlaneGeometry(64, 64, 128, 128);
islandGeo.rotateX(-Math.PI / 2);
const ipos = islandGeo.attributes.position as THREE.BufferAttribute;
const colors: number[] = [];
for (let i = 0; i < ipos.count; i++) {
  const x = ipos.getX(i);
  const z = ipos.getZ(i);
  const y = islandHeight(x, z);
  ipos.setY(i, y);
  // color...
  colors.push(c.r, c.g, c.b);
}
ipos.needsUpdate = true;
islandGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
islandGeo.computeVertexNormals();
islandGeo.computeBoundingSphere();
```
Note: `getZ(i)` after rotateX: the plane's original (x,y,0) rotated to (x,0,-y)? PlaneGeometry lies in XY; rotateX(-π/2): y→-z? Rotation about X by -90°: (x, y, z) → (x, y cos(-90) - z sin(-90), y sin(-90) + z cos(-90)) = (x, z? let's compute: cos=0, sin=-1 → y' = y*0 - z*(-1) = z; z' = y*(-1) + z*0 = -y. So (x,y,0) → (x,0,-y). The plane's y coordinate maps to -z. So the positions have x and z with y=0. Good. `getZ(i)` is the world z.

Fine.

The color computation uses `x` and `z`.

Now, island's material: `new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0, color: 0xffffff })`. Good. The color attribute multiplies the white color.

`island.receiveShadow = true; island.castShadow = true;`.

Now the rocks: `new THREE.IcosahedronGeometry(0.9, 0)`, position at spots with y=islandHeight+0.1, scale random. Add 3.

Now, do palms' base positions sit on the island surface? baseY = islandHeight(px,pz); the trunk starts at baseY-0.2. Good.

Now the code for the boat's rope might not cast shadows—fine, set castShadow on all.

Let's now write the final answer.

Double-check the boat rotation order set: `boat.rotation.order = 'YXZ';` — TypeScript accepts the string literal? `rotation.order` is of type `EulerOrder`, a union of string literals. Assigning `'YXZ'` works.

Now, an issue with `boat.rotation.set(pitch, yaw, roll)`: the `set` method signature is `set(x: number, y: number, z: number, order?: EulerOrder): this`. Fine.

Now, the boat's group position and rotation are set each frame. The children are static.

Now, the ocean's sun direction uniform should equal the normalized sun direction used for the light. Both from `SUN_DIR`.

`const SUN_DIR = new THREE.Vector3(-0.794, 0.242, -0.557).normalize();` — normalize is fine.

Light position: `sun.position.copy(SUN_DIR).multiplyScalar(120);` — direction from the target to the light is SUN_DIR, so the light comes from SUN_DIR. The sun disc in the sky is at SUN_DIR. Correct: the light's position is on the sun side.

Shadow camera: the directional light's shadow camera looks from the light position toward the target. Good.

Now, the hemisphere light's sky color should match the sky's ambient; use 0xa8c8e8.

Now the final write-up.

Wait—one more check on the ocean's wave amplitude relative to the boat: The boat's y follows h at its center, plus pitch/roll. The hull's bottom is at -0.62 local, so with the offset +0.18 the bottom is at h - 0.44. Waves around the boat vary; the hull might intersect the water visually where the water surface is higher than the hull bottom—which is expected (the hull is partially submerged). Good.

Now the island's peak 9.5; the requirement says 5-15. Good.

Island width: 30-50 across. The visible shoreline diameter ~35; the mesh extends to 64 but that's underwater. The exposed island is 35 across. Good. Hmm, the peak height 9.5 and the base radius 17 at the waterline, so the island slopes steeply (~30° average). Realistic enough. The beach at h=0 to 1: the radius changes quickly; the sand band may be narrow. To get a wider beach, make the height falloff gentler near the shore. Our function `11 * n^1.7 - 2.2` has a derivative near n small: h ~ -2.2 + 11 n^1.7; at n=0.2, h=11*0.2^1.7-2.2=11*0.0646-2.2=-1.49; at n=0.3, h=11*0.130-2.2=-0.77; at n=0.4, h=11*0.211-2.2=0.12; shore at n≈0.39. The beach band from n=0.4 to 0.5 spans r from 24*(1-0.4)=14.4 to 24*0.5=12 → 2.4 units wide. Okay, a decent beach. Palms at radii 6-11 on the grass.

Good.

Now, the leaf geometry's width 0.34 and length 2.6; each palm's crown radius ~2.6. The palms are 5 units tall with a 5-unit crown spread—large but fine.

The instanced leaves' total shadow cost is fine.

I think we're ready. Let me write the code carefully.

One more potential compile issue: `const oceanUniforms = { ... }` where `uTime: { value: 0 }`; TypeScript infers `value: number`; later `oceanUniforms.uTime.value = waveTime` fine.

For the ShaderMaterial constructor, `uniforms` expects `{ [uniform: string]: IUniform }`. Our object's values include `{ value: number }`, `{ value: Vector3 }`, `{ value: Color }`; `IUniform` is `{ value: any }`. Assignable. Good.

The sky material uniforms similarly.

Now, note that `THREE.Color` values in uniforms—Three.js uploads the RGB. Fine.

Now the GLSL sky: `varying vec3 vDir;` computed in the vertex as `vDir = position;` (local). Since the sphere is centered at the camera (we set sky.position = camera.position), the local position is the direction. Good. Even without setting the sky's position, the sphere is at the origin and the camera is near the origin (35 units vs radius 4000), so the direction is nearly correct. Set the position anyway.

The sky sphere's geometry is generated with radius 4000 centered at 0, so `position` is the direction from the center. Good.

Now, the sky's `depthTest: false` with `renderOrder = -1`: it renders first, then other objects render with depth test on and overwrite. Good.

Now, the ocean's `side: THREE.FrontSide` default; the plane is rotated so the front faces up? PlaneGeometry faces +Z; rotating -90° about X makes +Z face +Y? Rotation -90° about X: the normal (0,0,1) → (0, 1, 0)? Compute: y' = z? For a vector (0,0,1): y' = y cos - z sin = 0 - 1*(-1) = 1; z' = y sin + z cos = 0. So normal (0,1,0), up. Good. FrontSide visible from above.

The far plane similarly.

Now, the ocean's vertex shader displaces y; the front face remains up.

Good.

Let me write the final code now.

Actually, one more consideration on `waveSample` in the fragment shader: the fragment's `vWorldPos.xz` is the displaced position's xz, which equals the original xz (only y displaced). Good.

The vertex shader computes `vWorldPos` after displacement; the fragment recomputes `h` from `vWorldPos.xz` and `uTime`, identical to the vertex's. Fine.

Now the boat's `waveHeightAt` matches the shader. Good.

Let me write the file.

I'll keep comments minimal but helpful.

One last check on the sun visibility: With fov 58 and aspect 1.78, the sun at y_ndc 0.83 is within [-1,1]. Good.

But wait, the sky sphere is only visible where the ocean doesn't cover. The sun is at 14° elevation, well above the horizon. Good.

Now let me write.

```ts
// ... 
```

I need to ensure no use of `Math.random` that could cause inconsistent shadows? Fine, deterministic hash for leaves.

Let me write the leaf hash:
```ts
function hash01(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
```

Now, one concern: `THREE.TubeGeometry` requires a Curve; a CatmullRomCurve3. Good.

The trunk tube's path may self-intersect if the lean is too strong; 1.7 lean over 5.2 height is fine.

Now the code.

Also add `sun.target` to the scene. `sun.target.position.set(0, 0.5, 0)` maybe; keep (0,0,0). The shadow camera's target orientation follows the target. Good.

The light's shadow camera ortho ±50 centered on the target at origin. The boat and island within. Good.

I'll also add `sun.shadow.camera.updateProjectionMatrix()` after setting the bounds.

Let's write it.

After the first render, set __ready. Also set the exposed objects before the loop.

One potential issue: `renderer.setAnimationLoop` may not fire if the tab is hidden, but fine.

Now the final code output.

Let me think about whether `#include <tonemapping_fragment>` and `<colorspace_fragment>` are valid in a ShaderMaterial with GLSL1 in the current Three.js. Yes, common usage.

Also, the sky's fragment uses `gl_FragColor`; fine.

Now, an issue: when the material is `ShaderMaterial`, Three.js sets `toneMapped` default true, and the renderer defines TONE_MAPPING. Good.

The ocean's `uSunColor` is a Color; the sun glow adds linear values.

Let me write the code now in the final answer.

Also, no `OrbitControls`, so no import needed.

One more: `renderer.setSize(window.innerWidth, window.innerHeight)` sets the canvas CSS size. Good.

Let's write.

Wait, the island height function at the center includes a ridge; the peak might exceed 15? 8.8 + 1.5 max ≈ 10.3. Fine.

The island's `castShadow` might cause self-shadowing artifacts (acne) with the low sun. Use `normalBias 0.06` and `bias -0.0003`. Good.

Now, the far plane material: `new THREE.MeshBasicMaterial({ color: 0xa8c4d8, fog: false })`. Since the renderer tone-maps it, the color will be ACES-mapped (darker) while the sky horizon is also tone-mapped, so they match if both use the same linear color. The far plane's base color 0xa8c4d8 is tone-mapped to some value; the sky's horizon color 0xaec9dc is also tone-mapped. Since the fog on the ocean also tone-maps the fog color, consistent. Good. But the far plane is a tone-mapped MeshBasicMaterial (toneMapped default true). Good.

Hmm, the ocean's manual fog mixes in `uFogColor` before tone mapping, so the fogged ocean = toneMap(fog color) — same as the far plane's toneMap(base color) if the base equals the fog color. Good. The sky's horizon = toneMap(horizon color) with a slightly different color. Close.

Now, write.

Actually, a subtle but important point: the fog color used by built-in materials (island, boat) is also mixed in linear space before tone mapping (Three.js fog is applied in the fragment before tone mapping), so consistent. Good.

Let me produce the code.

I'll write the full file now.

Potential error: `THREE.PlaneGeometry` with 256x256 segments creates 257x257 = 66049 vertices; the index buffer uses 32-bit indices if >65535 vertices? 66049 > 65535, so Three.js uses Uint32 indices (WebGL2 supports). Three.js handles this automatically (uses Uint32BufferAttribute if needed). The renderer requires WebGL2 (Three.js r163+ is WebGL2 only). Fine.

OK writing.

For the boat's hull material, maybe add a thin blue stripe with a torus. The torus at y=0.38, radius 0.84, tube 0.03, scaled z 2.35. `TorusGeometry(0.84, 0.03, 6, 48)` lies in the XY plane; rotate X π/2 to lie in XZ. Then scale z 2.35? Scaling after rotation: the geometry's coordinates after rotateX are in XZ; `ringGeo.rotateX(Math.PI/2); ringGeo.scale(1,1,2.35);`. Good. Position y=0.36.

Now, code.

One more consideration: The ocean's `waveSample` uses `float k; float w; ...` declared before reassignment—fine in GLSL.

Now, the final answer.

Let me also double check the JS heightAt vs the shader for phase signs. Both use `k * dot(d,p) - w*t + phase`. Yes.

The boat's front/back sampling uses the yaw direction. Good.

Writing the file now.

I need to be careful with the `smoothstep` TS helper and the GLSL smoothstep.

Let me write the island color computation in full:

```ts
const sand = new THREE.Color(0xdcc9a0);
const wetSand = new THREE.Color(0x9a7f5c);
const grass = new THREE.Color(0x467a35);
const grassDark = new THREE.Color(0x2c5626);
const rock = new THREE.Color(0x74786a);

for each vertex:
  const y = islandHeight(x, z);
  const t1 = smoothstep(0.2, 1.5, y);
  const t2 = smoothstep(3.2, 6.2, y);
  const c = sand.clone().lerp(grass, t1);
  const gd = hash-ish... use a noise term:
  const nv = 0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.9 + 1.3);
  c.lerp(grassDark, t1 * nv * 0.55);
  c.lerp(rock, t2 * 0.9);
  const wet = 1 - smoothstep(-0.2, 0.55, y);
  c.lerp(wetSand, wet * 0.75);
  const shade = 0.86 + 0.28 * (0.5 + 0.5 * Math.sin(x * 1.3 - z * 0.8));
  c.multiplyScalar(shade);
  colors.push(c.r, c.g, c.b);
```
`c.clone()` allocates per vertex (16k) — fine at load.

Good.

Now the final answer.

Let me write the code in full.

```ts
import * as THREE from 'three';

// ---------------- Renderer ----------------
...
```

I'll now carefully compose the entire file.

(Also ensure the ocean's `uTime` uniform value is a number and updated before rendering.)

Final detail: The `__ocean.time()` returns the wave time. If a test calls `heightAt(x,z,__ocean.time())` and compares to something, consistent.

Ok, writing.

I'll write the wave GLSL with `${WAVE_GLSL}` interpolation.

One thing: In the ocean's fragment, I use `cameraPosition` (a built-in uniform). In a ShaderMaterial, is `cameraPosition` automatically declared in the fragment shader? Three.js's prefix for fragment shaders includes `uniform vec3 cameraPosition;` — yes, in the standard prefix. Good.

Let me write.

Also, I should add `precision highp float;`? Three.js adds it. Fine.

Now, the final code:

```ts
import * as THREE from 'three';

/* Renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0xa8c4d8);
scene.fog = new THREE.Fog(FOG_COLOR.getHex(), 80, 340);
```

Hmm, `FOG_COLOR.getHex()` returns the hex in sRGB? `getHex()` by default converts from linear to sRGB, so it should return the original 0xa8c4d8 approximately. Better to just use the hex literal for `Fog` and the color object for uniforms. Use `const FOG_HEX = 0xa8c4d8; scene.fog = new THREE.Fog(FOG_HEX, 80, 340);`.

Continue.

Now, writing everything.

Let me count the code size; it's large but okay.

I'll now produce the final answer.