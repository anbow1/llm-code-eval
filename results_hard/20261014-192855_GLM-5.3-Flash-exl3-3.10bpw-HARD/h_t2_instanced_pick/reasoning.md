Camera: grid 30 wide, z=0. Perspective camera looking straight down -z at origin. Place camera at z = D, fov 50. Need whole grid (±14.5 + half box ~ actually grid spans ±14.5+... boxes centered at -14.5..14.5, box size 0.8 so extent ±14.9) plus margin. Aspect could be narrow on resize; but requirement just says visible initially. Use distance e.g. 40.

Compute: fov 50°, half height at distance d: d*tan(25°)=d*0.4663. Need >= ~16 → d >= ~34.3. Use 45 for margin. Also ensure width fits for narrow aspect: halfWidth = halfHeight*aspect. If aspect small... initial test likely 1+. Use fov 45 and distance 50 to be safe. halfHeight = 50*tan(22.5°)=20.7, halfWidth = 20.7*aspect; if aspect < 0.72 width insufficient but fine.

Actually better: adjust on resize to keep grid visible? Not required. Keep simple: fixed camera.

instanceColor: mesh.instanceColor needs update flag: mesh.instanceColor.needsUpdate = true. setColorAt before first setColorAt creates instanceColor. Initialize all colors in loop with setColorAt gray, then needsUpdate.

Raycast: raycaster.setFromCamera(ndc, camera); intersectObject(mesh) — non-recursive. instanceId from first intersection.

Handle click on canvas: renderer.domElement.addEventListener('click', ...). Compute NDC from canvas bounding rect.

tsc strict: instanceColor is InstancedBufferAttribute | null — use ! or guard.

First frame ready flag: in animation loop... but "no animation"; still use setAnimationLoop with null callback? We need __ready after first frame. We can render once then set flag, but still need setAnimationLoop for the loop. Use setAnimationLoop with a function that renders and sets ready after first frame (renderer.render inside loop). Delta not needed since no animation — but motion must use delta if motion exists; no motion, fine.

Write code.