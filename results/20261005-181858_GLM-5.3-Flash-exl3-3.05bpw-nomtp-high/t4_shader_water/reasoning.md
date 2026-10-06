Write a single TS file with ShaderMaterial ocean. Include vertex/fragment shaders, waves computed from position (after rotation plane lies in XZ... but PlaneGeometry is in XY; rotate mesh -PI/2 around X so local y becomes world z). Compute displacement in shader based on local position and pass height varying. Color by height.

Set __scene etc. __ready after first frame. Use setAnimationLoop with callback receiving time — use clock or time param. setAnimationLoop callback gets time in ms. Use that.

Need ready flag: in render, if first frame, after renderer.render set __ready = true.

Camera at angle, lookAt origin.