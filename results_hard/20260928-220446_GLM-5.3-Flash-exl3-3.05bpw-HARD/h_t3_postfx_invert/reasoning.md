Invert in sRGB space: RenderPass gives linear... With OutputPass doing linear->sRGB, to invert in display space, do inversion after tone/color conversion, or in shader convert. Simplest: in the invert shader, read linear color, apply sRGB transfer inverse? Actually the correct trick: invert in linear space works since 1 - sRGB-encoded... no—inverting in linear doesn't equal inverting encoded values. Options: do conversion inside shader. The RenderPass renders in linear (renderer.outputColorSpace default sRGB but composer render targets are linear). We can make the invert shader output the sRGB-encoded inverted color... but OutputPass expects linear input and converts. Approach: invert shader does: encoded = sRGBToLinear? Hmm.

Simplest reliable: shader reads linear color c. Compute inverse display: we want screen = 1 - LinearToSRGB(c). Then OutputPass will apply LinearToSRGB to whatever we output. So output = SRGBToLinear(1 - LinearToSRGB(c)). Implement in GLSL:

vec3 lin2srgb(vec3 c){ return mix(c*12.92, pow(c, vec3(0.41666))*1.055+0.055, step(0.0031308,c)); }
vec3 srgb2lin(vec3 c){ return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045,c)); }

gl_FragColor = vec4(srgb2lin(1.0 - lin2srgb(vColor)), a);

Need include colorspace? Fine plain GLSL. ShaderPass output then OutputPass converts to sRGB and writes to canvas... OutputPass also applies tone mapping. Renderer toneMapping default NoToneMapping, fine.

Also set renderer.outputColorSpace = THREE.SRGBColorSpace (default). Composer render targets linear; default EffectComposer uses HalfFloat linear working space. Good.

Also need OutputPass import. Also OutputPass includes tone mapping and colorspace — good.

Also RenderPass may need renderer... fine.

Write code.