Need to invert in sRGB space. Workflow: RenderPass renders scene to a render target in linear space (composer render targets are linear). OutputPass does linear→sRGB conversion at the end. To invert exactly in sRGB space: invert the linear color, then OutputPass converts linear→sRGB. But inverse of sRGB(1-c) ≠ sRGB(1 - linear c)? Actually the requirement: on-screen result must be exact inverse of what screen would show without effect. Without effect: screen shows sRGB(c). With effect must show 1 - sRGB(c) = sRGB-inverted in gamma space.

So the shader must convert linear → sRGB, invert, then convert back sRGB → linear, and then OutputPass converts linear → sRGB. Net: invert in sRGB space. That's the standard trick.

Alternative: skip OutputPass and do invert + linear→sRGB in shader with renderer.outputColorSpace = SRGBColorSpace? But requirement says use OutputPass. So do: shader gets linear color, converts to sRGB, inverts, converts back to linear, OutputPass then converts to sRGB.

Implement sRGB conversion functions in GLSL (matching three's sRGBTransferOETF/IEF approximations — actually exact piecewise). Use exact formulas:

LinearToSRGB: if c <= 0.0031308: 12.92*c else 1.055*pow(c, 1/2.4) - 0.055
SRGBToLinear: if c <= 0.04045: c/12.92 else pow((c+0.055)/1.055, 2.4)

ShaderPass fragment: 

```
vec3 srgb = LinearToSRGB(tDiffuse.rgb);
vec3 inverted = 1.0 - srgb;
gl_FragColor = vec4(SRGBToLinear(inverted), tDiffuse.a);
```

Then OutputPass converts to sRGB. Result: exact sRGB inversion. 

Need tDiffuse uniform defined. ShaderPass(shader object). Include uniforms: { tDiffuse: { value: null } }, vertexShader, fragmentShader.

Renderer setup: default outputColorSpace is SRGBColorSpace in modern three; OutputPass handles conversion when rendering to screen. Fine.

Also need __ready after first frame: track flag in animation loop; set after composer.render() first time.

Write code.