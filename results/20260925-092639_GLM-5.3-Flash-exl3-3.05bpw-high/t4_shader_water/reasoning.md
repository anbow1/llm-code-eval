Write a single TS file with a plane 10x10, 128x128 segments, rotated to XZ plane (rotation.x = -PI/2), ShaderMaterial with waves. Varying for height. uTime from clock. Handle resize, setAnimationLoop, __ready after first frame.

Vertex shader: wave = sin(pos.x * 2.0 + uTime) * ... combine. Since plane is rotated via mesh rotation, position in shader is local (xy plane before rotation?). PlaneGeometry lies in XY plane; displacing z in local space then rotating -90° about X makes z point up. Good approach: displacement along local z, compute wave from local xy coordinates. Pass vHeight varying (normalized elevation).

Fragment: mix deep blue to white based on vHeight plus foam highlight.

Camera at angle, lookAt origin. Also handle first frame __ready set once.