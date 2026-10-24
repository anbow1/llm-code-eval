Raycasting InstancedMesh with MeshBasicMaterial works. Grid in XY plane, camera at z looking at origin. Box geometry size 0.8. 30x30, centered: offset -14.5 to 14.5.

Camera: grid spans ~29.5 units. FOV 50, distance needed: half-height 14.5+margin. tan(fov/2)*d >= ~16 → d ≈ 16/tan(25°) ≈ 34.3. Use fov 50, distance 40. Handle aspect: width typically larger, but to be safe distance based on both dimensions? Simple: compute so it fits vertically with margin; horizontal usually fine since aspect > 1. But for narrow windows... Requirement says "whole grid visible with a margin" — just pick distance 45 with fov 50. Could also compute per resize. Keep static camera per spec ("No camera movement, no animation"). Resize only updates aspect and size.

Click: raycaster.setFromCamera with NDC from canvas bounding rect. intersects[0].instanceId. Toggle color, setColorAt, instanceColor.needsUpdate = true.

Note: raycaster against InstancedMesh requires mesh with geometry — fine. Also raycaster.firstHitOnly not needed. Use intersects sorted by distance, take first.

Material white MeshBasicMaterial. Colors show exactly.

Set colors initially all gray via setColorAt in loop, then instanceColor.needsUpdate = true.

__ready after first frame: use a flag in animate; set after render.

Write code.