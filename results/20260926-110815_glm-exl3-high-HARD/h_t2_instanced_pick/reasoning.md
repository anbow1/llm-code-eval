Write the file. Grid size 30 -> total extent 29*1 + 0.8 = 29.8? Centered: positions from -14.5 to 14.5. Camera z distance to fit: height ~30.8 with margin; fov 45 => z = (15.4/2)/tan(22.5°) ≈ 15.4/0.4142 ≈ 37.2... Actually half-height 15.4 → z ≈ 18.6 * ... let me compute: tan(22.5°)=0.41421, half height at distance d = d*0.41421; need ≥ 15.4 → d ≈ 37.2. Also need width fit: aspect typically > 1, check width: half width 15.4 too, need d*0.41421*aspect ≥ 15.4. If aspect could be < 1 (portrait), need to handle. Use fov 50, d = 36. Simpler: d = 40 with fov 45 covers aspect ≥ 15.4/ (40*0.41421) = 15.4/16.57 = 0.93. On very narrow window, grid may clip. Could compute distance from aspect at setup. Keep simple but robust: compute distance to fit both dimensions based on current aspect.

Colors: use state array of booleans. instanceColor buffer needsUpdate.

Raycaster with mesh, intersection.instanceId.

Write code.