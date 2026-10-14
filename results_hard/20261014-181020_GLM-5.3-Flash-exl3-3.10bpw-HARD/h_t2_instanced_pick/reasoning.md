30x30 grid in XY plane. Grid width 29 units (spacing 1). Camera z distance needs to fit. Grid spans -14.5..14.5. Vertical FOV default 75? Let's set camera FOV or position so whole grid fits with margin. With fov 75 and aspect maybe wider; height needed ~31, so distance = 15.5 / tan(37.5°) ≈ 15.5/0.767 ≈ 20.2. Use z = 26 to be safe. But aspect could be portrait; height fit is vertical. Grid width 29 vertical span 29. camera z such that vertical half-extent 15 fits: z = 15/tan(fov/2 + margin). fov 75: tan(37.5°)=0.7673, z=20 gives 15.35 half height — barely margin. Use z=24.

But window aspect may be < 1 (portrait), then width is constraining: horizontal half = tan(fov/2)*z*aspect. For portrait, need z = 15/(tan(37.5°)*aspect). Simpler: adjust camera on resize: compute distance so both fit. Use fov 60. Compute bounding: halfW=15, halfH=15+margin. distance = max(halfH, halfW/aspect)/tan(fov/2) + margin. Implement updateCamera() called on init and resize, keeping camera at -z looking at origin. Keep z axis-aligned.

Raycaster against InstancedMesh gives raycast; instance colors array. Toggle state stored in boolean array; set color accordingly, then instanceColor.needsUpdate = true.

Also mesh.instanceColor may be null until setColorAt is called; call setColorAt in init loop which creates it.

Set frustumCulled maybe fine. Material MeshBasicMaterial({color: 0xffffff}).

Write code.