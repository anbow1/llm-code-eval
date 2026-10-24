Need to compute grid extents: 30 boxes, spacing 1.0, centered: positions from -14.5 to 14.5. Grid spans 29 + 0.8 = 29.8 wide. Camera: perspective, need margin. Distance so that vertical fov covers ~32 units. fov 50, aspect ~ window aspect. Choose camera z such that height 32 fits: z = 16/tan(25°) ≈ 34.3. Use fov 50, distance 36 to be safe for both dims? Horizontal might be narrower if aspect <1. Compute at init based on aspect: required halfHeight = max needed considering aspect. Simplest: distance = 17 / Math.tan(fov/2 in rad) * max(1, 1/aspect)... Actually halfHeight visible = dist*tan(fov/2). Need halfHeight >= 15.9 and halfWidth = halfHeight*aspect >= 15.9. So dist = 15.9*marginFactor / tan(fov/2) adjusted. Let margin: need half extent 14.9+0.8/2? Grid half extent = 14.5+0.4 = 14.9. Use halfTarget = 16. dist = halfTarget / tan(fov/2); if aspect < 1, dist *= (1/aspect)? halfWidth = halfHeight*aspect, need >=16 → halfHeight >= 16/aspect → dist = max(dist, 16/(aspect*tan)).

Compute once; on resize keep camera position but maybe recompute distance? "No camera movement" — keep fixed. Recompute distance on resize would be movement. Keep initial. But aspect could change making grid cut off. Acceptable; but better recompute distance on resize — that's still no "camera movement" in animated sense. I'll recompute on resize to keep fully visible; it's a static repositioning. Actually safer: just set once and also update on resize. Fine.

instanceColor needsUpdate: mesh.instanceColor.needsUpdate = true. Also need mesh.instanceColor to exist — set colors before first render via setColorAt then it's created.

Raycasting InstancedMesh with MeshBasicMaterial works.

Toggle state: keep array or check color. Use boolean array.

Write code.