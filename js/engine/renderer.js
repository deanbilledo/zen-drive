/**
 * WebGL Renderer for Zen Drive
 * Handles all rendering operations, shaders, and graphics pipeline
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.initWebGL();
        this.shaders = {};
        this.buffers = {};
        this.textures = {};
        this.frameBuffers = {};
        
        this.renderSettings = {
            quality: 'medium',
            renderDistance: 1000,
            fogDensity: 0.003,
            shadowResolution: 1024,
            enableShadows: true,
            enableFog: true,
            enablePostProcessing: true
        };

        this.performance = {
            fps: 60,
            frameTime: 16.7,
            drawCalls: 0,
            triangles: 0
        };

        this.init();
    }

    initWebGL() {
        const gl = this.canvas.getContext('webgl2', {
            antialias: true,
            alpha: false,
            depth: true,
            stencil: false,
            powerPreference: 'high-performance'
        });

        if (!gl) {
            throw new Error('WebGL 2.0 not supported');
        }

        // Enable extensions
        const extensions = [
            'EXT_color_buffer_float',
            'OES_texture_float_linear',
            'WEBGL_depth_texture'
        ];

        extensions.forEach(ext => {
            const extension = gl.getExtension(ext);
            if (!extension) {
                console.warn(`Extension ${ext} not supported`);
            }
        });

        return gl;
    }

    init() {
        const gl = this.gl;

        // Set up WebGL state
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        gl.depthFunc(gl.LEQUAL);

        // Create shaders
        this.createShaders();
        
        // Create frame buffers for post-processing
        this.createFrameBuffers();

        // Set initial viewport
        this.resize();
    }

    createShaders() {
        // Terrain shader
        this.shaders.terrain = this.createShaderProgram(
            this.vertexShaderSources.terrain,
            this.fragmentShaderSources.terrain
        );

        // Road shader
        this.shaders.road = this.createShaderProgram(
            this.vertexShaderSources.road,
            this.fragmentShaderSources.road
        );

        // Vehicle shader
        this.shaders.vehicle = this.createShaderProgram(
            this.vertexShaderSources.vehicle,
            this.fragmentShaderSources.vehicle
        );

        // Sky shader
        this.shaders.sky = this.createShaderProgram(
            this.vertexShaderSources.sky,
            this.fragmentShaderSources.sky
        );

        // Shadow map shader
        this.shaders.shadow = this.createShaderProgram(
            this.vertexShaderSources.shadow,
            this.fragmentShaderSources.shadow
        );

        // Post-processing shader
        this.shaders.postProcess = this.createShaderProgram(
            this.vertexShaderSources.postProcess,
            this.fragmentShaderSources.postProcess
        );
    }

    get vertexShaderSources() {
        return {
            terrain: `#version 300 es
                precision highp float;

                in vec3 a_position;
                in vec3 a_normal;
                in vec2 a_texCoord;
                in float a_biome;

                uniform mat4 u_modelMatrix;
                uniform mat4 u_viewMatrix;
                uniform mat4 u_projectionMatrix;
                uniform mat4 u_lightSpaceMatrix;
                uniform vec3 u_cameraPosition;

                out vec3 v_worldPosition;
                out vec3 v_normal;
                out vec2 v_texCoord;
                out float v_biome;
                out vec4 v_lightSpacePosition;
                out float v_fogFactor;

                void main() {
                    vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
                    v_worldPosition = worldPosition.xyz;
                    v_normal = normalize((u_modelMatrix * vec4(a_normal, 0.0)).xyz);
                    v_texCoord = a_texCoord;
                    v_biome = a_biome;
                    v_lightSpacePosition = u_lightSpaceMatrix * worldPosition;

                    // Calculate fog factor
                    float distance = length(u_cameraPosition - v_worldPosition);
                    v_fogFactor = exp(-distance * 0.001);

                    gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
                }
            `,

            road: `#version 300 es
                precision highp float;

                in vec3 a_position;
                in vec3 a_normal;
                in vec2 a_texCoord;

                uniform mat4 u_modelMatrix;
                uniform mat4 u_viewMatrix;
                uniform mat4 u_projectionMatrix;
                uniform mat4 u_lightSpaceMatrix;
                uniform vec3 u_cameraPosition;

                out vec3 v_worldPosition;
                out vec3 v_normal;
                out vec2 v_texCoord;
                out vec4 v_lightSpacePosition;
                out float v_fogFactor;

                void main() {
                    vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
                    v_worldPosition = worldPosition.xyz;
                    v_normal = normalize((u_modelMatrix * vec4(a_normal, 0.0)).xyz);
                    v_texCoord = a_texCoord;
                    v_lightSpacePosition = u_lightSpaceMatrix * worldPosition;

                    float distance = length(u_cameraPosition - v_worldPosition);
                    v_fogFactor = exp(-distance * 0.001);

                    gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
                }
            `,

            vehicle: `#version 300 es
                precision highp float;

                in vec3 a_position;
                in vec3 a_normal;
                in vec2 a_texCoord;

                uniform mat4 u_modelMatrix;
                uniform mat4 u_viewMatrix;
                uniform mat4 u_projectionMatrix;
                uniform mat4 u_lightSpaceMatrix;

                out vec3 v_worldPosition;
                out vec3 v_normal;
                out vec2 v_texCoord;
                out vec4 v_lightSpacePosition;

                void main() {
                    vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
                    v_worldPosition = worldPosition.xyz;
                    v_normal = normalize((u_modelMatrix * vec4(a_normal, 0.0)).xyz);
                    v_texCoord = a_texCoord;
                    v_lightSpacePosition = u_lightSpaceMatrix * worldPosition;

                    gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
                }
            `,

            sky: `#version 300 es
                precision highp float;

                in vec3 a_position;

                uniform mat4 u_viewMatrix;
                uniform mat4 u_projectionMatrix;

                out vec3 v_direction;

                void main() {
                    v_direction = a_position;
                    vec4 pos = u_projectionMatrix * mat4(mat3(u_viewMatrix)) * vec4(a_position, 1.0);
                    gl_Position = pos.xyww;
                }
            `,

            shadow: `#version 300 es
                precision highp float;

                in vec3 a_position;

                uniform mat4 u_modelMatrix;
                uniform mat4 u_lightSpaceMatrix;

                void main() {
                    gl_Position = u_lightSpaceMatrix * u_modelMatrix * vec4(a_position, 1.0);
                }
            `,

            postProcess: `#version 300 es
                precision highp float;

                in vec2 a_position;

                out vec2 v_texCoord;

                void main() {
                    v_texCoord = a_position * 0.5 + 0.5;
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            `
        };
    }

    get fragmentShaderSources() {
        return {
            terrain: `#version 300 es
                precision highp float;

                in vec3 v_worldPosition;
                in vec3 v_normal;
                in vec2 v_texCoord;
                in float v_biome;
                in vec4 v_lightSpacePosition;
                in float v_fogFactor;

                uniform vec3 u_lightDirection;
                uniform vec3 u_lightColor;
                uniform vec3 u_ambientColor;
                uniform vec3 u_fogColor;
                uniform sampler2D u_grassTexture;
                uniform sampler2D u_rockTexture;
                uniform sampler2D u_sandTexture;
                uniform sampler2D u_snowTexture;
                uniform sampler2D u_shadowMap;
                uniform float u_time;

                out vec4 fragColor;

                float calculateShadow(vec4 lightSpacePosition) {
                    vec3 projCoords = lightSpacePosition.xyz / lightSpacePosition.w;
                    projCoords = projCoords * 0.5 + 0.5;

                    if (projCoords.z > 1.0) return 0.0;

                    float closestDepth = texture(u_shadowMap, projCoords.xy).r;
                    float currentDepth = projCoords.z;

                    float bias = 0.005;
                    float shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;

                    return shadow;
                }

                vec3 getTerrainColor() {
                    vec4 grass = texture(u_grassTexture, v_texCoord * 16.0);
                    vec4 rock = texture(u_rockTexture, v_texCoord * 8.0);
                    vec4 sand = texture(u_sandTexture, v_texCoord * 12.0);
                    vec4 snow = texture(u_snowTexture, v_texCoord * 20.0);

                    // Biome blending based on height and slope
                    float height = v_worldPosition.y;
                    float slope = 1.0 - dot(v_normal, vec3(0.0, 1.0, 0.0));

                    vec3 color = grass.rgb;

                    // Desert biome
                    if (v_biome > 0.7) {
                        color = mix(color, sand.rgb, 0.8);
                    }
                    // Mountain biome
                    else if (height > 100.0 || slope > 0.3) {
                        color = mix(color, rock.rgb, min(1.0, (height - 50.0) / 100.0 + slope));
                        if (height > 150.0) {
                            color = mix(color, snow.rgb, (height - 150.0) / 100.0);
                        }
                    }
                    // Forest biome
                    else if (v_biome < 0.3) {
                        color = mix(color, vec3(0.2, 0.4, 0.1), 0.5);
                    }

                    return color;
                }

                void main() {
                    vec3 normal = normalize(v_normal);
                    vec3 lightDir = normalize(-u_lightDirection);

                    // Diffuse lighting
                    float diff = max(dot(normal, lightDir), 0.0);
                    
                    // Shadow calculation
                    float shadow = calculateShadow(v_lightSpacePosition);
                    
                    // Final lighting
                    vec3 ambient = u_ambientColor;
                    vec3 diffuse = u_lightColor * diff * (1.0 - shadow * 0.7);
                    
                    vec3 terrainColor = getTerrainColor();
                    vec3 color = terrainColor * (ambient + diffuse);

                    // Apply fog
                    color = mix(u_fogColor, color, v_fogFactor);

                    fragColor = vec4(color, 1.0);
                }
            `,

            road: `#version 300 es
                precision highp float;

                in vec3 v_worldPosition;
                in vec3 v_normal;
                in vec2 v_texCoord;
                in vec4 v_lightSpacePosition;
                in float v_fogFactor;

                uniform vec3 u_lightDirection;
                uniform vec3 u_lightColor;
                uniform vec3 u_ambientColor;
                uniform vec3 u_fogColor;
                uniform sampler2D u_roadTexture;
                uniform sampler2D u_shadowMap;

                out vec4 fragColor;

                float calculateShadow(vec4 lightSpacePosition) {
                    vec3 projCoords = lightSpacePosition.xyz / lightSpacePosition.w;
                    projCoords = projCoords * 0.5 + 0.5;

                    if (projCoords.z > 1.0) return 0.0;

                    float closestDepth = texture(u_shadowMap, projCoords.xy).r;
                    float currentDepth = projCoords.z;

                    float bias = 0.005;
                    return currentDepth - bias > closestDepth ? 1.0 : 0.0;
                }

                void main() {
                    vec3 normal = normalize(v_normal);
                    vec3 lightDir = normalize(-u_lightDirection);

                    float diff = max(dot(normal, lightDir), 0.0);
                    float shadow = calculateShadow(v_lightSpacePosition);
                    
                    vec3 ambient = u_ambientColor;
                    vec3 diffuse = u_lightColor * diff * (1.0 - shadow * 0.7);
                    
                    vec4 roadColor = texture(u_roadTexture, v_texCoord);
                    vec3 color = roadColor.rgb * (ambient + diffuse);

                    color = mix(u_fogColor, color, v_fogFactor);

                    fragColor = vec4(color, 1.0);
                }
            `,

            vehicle: `#version 300 es
                precision highp float;

                in vec3 v_worldPosition;
                in vec3 v_normal;
                in vec2 v_texCoord;
                in vec4 v_lightSpacePosition;

                uniform vec3 u_lightDirection;
                uniform vec3 u_lightColor;
                uniform vec3 u_ambientColor;
                uniform vec3 u_vehicleColor;
                uniform sampler2D u_shadowMap;

                out vec4 fragColor;

                float calculateShadow(vec4 lightSpacePosition) {
                    vec3 projCoords = lightSpacePosition.xyz / lightSpacePosition.w;
                    projCoords = projCoords * 0.5 + 0.5;

                    if (projCoords.z > 1.0) return 0.0;

                    float closestDepth = texture(u_shadowMap, projCoords.xy).r;
                    float currentDepth = projCoords.z;

                    float bias = 0.005;
                    return currentDepth - bias > closestDepth ? 1.0 : 0.0;
                }

                void main() {
                    vec3 normal = normalize(v_normal);
                    vec3 lightDir = normalize(-u_lightDirection);

                    float diff = max(dot(normal, lightDir), 0.0);
                    float shadow = calculateShadow(v_lightSpacePosition);
                    
                    vec3 ambient = u_ambientColor;
                    vec3 diffuse = u_lightColor * diff * (1.0 - shadow * 0.7);
                    
                    vec3 color = u_vehicleColor * (ambient + diffuse);

                    fragColor = vec4(color, 1.0);
                }
            `,

            sky: `#version 300 es
                precision highp float;

                in vec3 v_direction;

                uniform float u_time;
                uniform vec3 u_sunDirection;

                out vec4 fragColor;

                vec3 getSkyColor(vec3 direction) {
                    float y = direction.y;
                    
                    // Time-based sky coloring
                    float timeOfDay = sin(u_time * 0.0001) * 0.5 + 0.5;
                    
                    vec3 dayTopColor = vec3(0.5, 0.7, 1.0);
                    vec3 dayBottomColor = vec3(0.8, 0.9, 1.0);
                    vec3 nightTopColor = vec3(0.1, 0.1, 0.2);
                    vec3 nightBottomColor = vec3(0.2, 0.2, 0.3);
                    
                    vec3 topColor = mix(nightTopColor, dayTopColor, timeOfDay);
                    vec3 bottomColor = mix(nightBottomColor, dayBottomColor, timeOfDay);
                    
                    vec3 skyColor = mix(bottomColor, topColor, max(0.0, y));
                    
                    // Sun glow
                    float sunDot = dot(direction, u_sunDirection);
                    float sunGlow = pow(max(0.0, sunDot), 32.0);
                    skyColor += vec3(1.0, 0.8, 0.6) * sunGlow * timeOfDay;
                    
                    return skyColor;
                }

                void main() {
                    vec3 direction = normalize(v_direction);
                    vec3 color = getSkyColor(direction);
                    
                    fragColor = vec4(color, 1.0);
                }
            `,

            shadow: `#version 300 es
                precision highp float;

                void main() {
                    // Depth is automatically written to gl_FragDepth
                }
            `,

            postProcess: `#version 300 es
                precision highp float;

                in vec2 v_texCoord;

                uniform sampler2D u_colorTexture;
                uniform float u_exposure;
                uniform float u_gamma;

                out vec4 fragColor;

                vec3 tonemap(vec3 color) {
                    // Simple Reinhard tone mapping
                    return color / (color + vec3(1.0));
                }

                void main() {
                    vec3 color = texture(u_colorTexture, v_texCoord).rgb;
                    
                    // Exposure
                    color *= u_exposure;
                    
                    // Tone mapping
                    color = tonemap(color);
                    
                    // Gamma correction
                    color = pow(color, vec3(1.0 / u_gamma));
                    
                    fragColor = vec4(color, 1.0);
                }
            `
        };
    }

    createShaderProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('Shader program failed to link: ' + error);
        }
        
        // Get attribute and uniform locations
        const info = {
            program: program,
            attributes: {},
            uniforms: {}
        };
        
        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const attribute = gl.getActiveAttrib(program, i);
            info.attributes[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const uniform = gl.getActiveUniform(program, i);
            info.uniforms[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
        
        return info;
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Shader compilation failed: ' + error);
        }
        
        return shader;
    }

    createFrameBuffers() {
        const gl = this.gl;
        
        // Main color buffer
        this.frameBuffers.main = this.createFrameBuffer(this.canvas.width, this.canvas.height, true);
        
        // Shadow map
        this.frameBuffers.shadow = this.createFrameBuffer(
            this.renderSettings.shadowResolution,
            this.renderSettings.shadowResolution,
            false,
            true
        );
    }

    createFrameBuffer(width, height, color = true, depth = true) {
        const gl = this.gl;
        
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        
        const result = { framebuffer, width, height };
        
        if (color) {
            const colorTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, colorTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
            result.colorTexture = colorTexture;
        }
        
        if (depth) {
            const depthTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, depthTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
            result.depthTexture = depthTexture;
        }
        
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Framebuffer not complete');
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return result;
    }

    resize() {
        const gl = this.gl;
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;
        
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            
            // Recreate main framebuffer
            if (this.frameBuffers.main) {
                gl.deleteFramebuffer(this.frameBuffers.main.framebuffer);
                if (this.frameBuffers.main.colorTexture) {
                    gl.deleteTexture(this.frameBuffers.main.colorTexture);
                }
                if (this.frameBuffers.main.depthTexture) {
                    gl.deleteTexture(this.frameBuffers.main.depthTexture);
                }
            }
            
            this.frameBuffers.main = this.createFrameBuffer(displayWidth, displayHeight, true);
        }
        
        gl.viewport(0, 0, displayWidth, displayHeight);
    }

    render(scene, camera) {
        const gl = this.gl;
        
        this.performance.drawCalls = 0;
        this.performance.triangles = 0;
        
        // Shadow pass
        if (this.renderSettings.enableShadows) {
            this.renderShadowMap(scene, camera);
        }
        
        // Main render pass
        if (this.renderSettings.enablePostProcessing) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.main.framebuffer);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.5, 0.7, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Render sky
        this.renderSky(camera);
        
        // Render terrain
        this.renderTerrain(scene.terrain, camera);
        
        // Render road
        this.renderRoad(scene.road, camera);
        
        // Render vehicle
        this.renderVehicle(scene.vehicle, camera);
        
        // Post-processing pass
        if (this.renderSettings.enablePostProcessing) {
            this.renderPostProcess();
        }
    }

    renderShadowMap(scene, camera) {
        const gl = this.gl;
        const shader = this.shaders.shadow;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.shadow.framebuffer);
        gl.viewport(0, 0, this.renderSettings.shadowResolution, this.renderSettings.shadowResolution);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(shader.program);
        
        // Light view matrix (simplified directional light)
        const lightDirection = new Vec3(0.5, -1, 0.3).normalize();
        const lightPosition = camera.position.add(lightDirection.multiply(-500));
        const lightView = Mat4.lookAt(lightPosition, camera.position, Vec3.up());
        const lightProjection = Mat4.perspective(MathUtils.toRadians(90), 1, 1, 1000);
        const lightSpaceMatrix = lightProjection.multiply(lightView);
        
        gl.uniformMatrix4fv(shader.uniforms.u_lightSpaceMatrix, false, lightSpaceMatrix.elements);
        
        // Render terrain to shadow map
        if (scene.terrain) {
            this.renderObjectToShadowMap(scene.terrain, shader);
        }
        
        // Render vehicle to shadow map
        if (scene.vehicle) {
            this.renderObjectToShadowMap(scene.vehicle, shader);
        }
    }

    renderObjectToShadowMap(object, shader) {
        const gl = this.gl;
        
        if (object.buffers && object.buffers.vertices) {
            gl.uniformMatrix4fv(shader.uniforms.u_modelMatrix, false, object.transform.elements);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers.vertices);
            gl.enableVertexAttribArray(shader.attributes.a_position);
            gl.vertexAttribPointer(shader.attributes.a_position, 3, gl.FLOAT, false, 0, 0);
            
            if (object.buffers.indices) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.buffers.indices);
                gl.drawElements(gl.TRIANGLES, object.indexCount, gl.UNSIGNED_SHORT, 0);
            } else {
                gl.drawArrays(gl.TRIANGLES, 0, object.vertexCount);
            }
            
            this.performance.drawCalls++;
        }
    }

    renderSky(camera) {
        const gl = this.gl;
        const shader = this.shaders.sky;
        
        gl.useProgram(shader.program);
        gl.disable(gl.DEPTH_TEST);
        
        // Sky uniforms
        gl.uniformMatrix4fv(shader.uniforms.u_viewMatrix, false, camera.viewMatrix.elements);
        gl.uniformMatrix4fv(shader.uniforms.u_projectionMatrix, false, camera.projectionMatrix.elements);
        gl.uniform1f(shader.uniforms.u_time, performance.now());
        gl.uniform3fv(shader.uniforms.u_sunDirection, [0.5, -1, 0.3]);
        
        // Create sky box vertices if not exists
        if (!this.buffers.skybox) {
            this.buffers.skybox = this.createSkyboxBuffer();
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.skybox);
        gl.enableVertexAttribArray(shader.attributes.a_position);
        gl.vertexAttribPointer(shader.attributes.a_position, 3, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        
        gl.enable(gl.DEPTH_TEST);
        this.performance.drawCalls++;
    }

    createSkyboxBuffer() {
        const gl = this.gl;
        
        const vertices = new Float32Array([
            -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1, // Front
            -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1, -1, // Back
            -1,  1, -1, -1,  1,  1,  1,  1,  1,  1,  1, -1, // Top
            -1, -1, -1,  1, -1, -1,  1, -1,  1, -1, -1,  1, // Bottom
             1, -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1, // Right
            -1, -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1  // Left
        ]);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        return buffer;
    }

    renderTerrain(terrain, camera) {
        if (!terrain || !terrain.chunks) {
            console.log('No terrain or terrain chunks to render');
            return;
        }
        
        console.log(`Rendering terrain with ${terrain.chunks.length} chunks`);
        
        const gl = this.gl;
        const shader = this.shaders.terrain;
        
        if (!shader) {
            console.error('Terrain shader not available');
            return;
        }
        
        gl.useProgram(shader.program);
        
        // Set uniforms (with error checking)
        try {
            if (shader.uniforms.u_viewMatrix) {
                gl.uniformMatrix4fv(shader.uniforms.u_viewMatrix, false, camera.viewMatrix.elements);
            }
            if (shader.uniforms.u_projectionMatrix) {
                gl.uniformMatrix4fv(shader.uniforms.u_projectionMatrix, false, camera.projectionMatrix.elements);
            }
            if (shader.uniforms.u_cameraPosition) {
                gl.uniform3fv(shader.uniforms.u_cameraPosition, camera.position.toArray());
            }
            if (shader.uniforms.u_lightDirection) {
                gl.uniform3fv(shader.uniforms.u_lightDirection, [0.5, -1, 0.3]);
            }
            if (shader.uniforms.u_lightColor) {
                gl.uniform3fv(shader.uniforms.u_lightColor, [1.0, 0.9, 0.8]);
            }
            if (shader.uniforms.u_ambientColor) {
                gl.uniform3fv(shader.uniforms.u_ambientColor, [0.3, 0.3, 0.4]);
            }
            if (shader.uniforms.u_fogColor) {
                gl.uniform3fv(shader.uniforms.u_fogColor, [0.7, 0.8, 0.9]);
            }
            if (shader.uniforms.u_time) {
                gl.uniform1f(shader.uniforms.u_time, performance.now());
            }
        } catch (error) {
            console.error('Error setting terrain shader uniforms:', error);
            return;
        }
        
        // Bind shadow map
        if (this.frameBuffers.shadow) {
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, this.frameBuffers.shadow.depthTexture);
            gl.uniform1i(shader.uniforms.u_shadowMap, 4);
        }
        
        // Render visible chunks
        let chunksRendered = 0;
        for (const chunk of terrain.chunks) {
            if (chunk.visible && chunk.buffers) {
                this.renderTerrainChunk(chunk, shader);
                chunksRendered++;
            }
        }
        
        console.log(`Rendered ${chunksRendered} terrain chunks`);
    }

    renderTerrainChunk(chunk, shader) {
        const gl = this.gl;
        
        gl.uniformMatrix4fv(shader.uniforms.u_modelMatrix, false, chunk.transform.elements);
        
        // Bind vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, chunk.buffers.vertices);
        gl.enableVertexAttribArray(shader.attributes.a_position);
        gl.vertexAttribPointer(shader.attributes.a_position, 3, gl.FLOAT, false, 32, 0);
        
        gl.enableVertexAttribArray(shader.attributes.a_normal);
        gl.vertexAttribPointer(shader.attributes.a_normal, 3, gl.FLOAT, false, 32, 12);
        
        gl.enableVertexAttribArray(shader.attributes.a_texCoord);
        gl.vertexAttribPointer(shader.attributes.a_texCoord, 2, gl.FLOAT, false, 32, 24);
        
        // Draw
        if (chunk.buffers.indices) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunk.buffers.indices);
            gl.drawElements(gl.TRIANGLES, chunk.indexCount, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.drawArrays(gl.TRIANGLES, 0, chunk.vertexCount);
        }
        
        this.performance.drawCalls++;
        this.performance.triangles += chunk.indexCount / 3;
    }

    renderRoad(road, camera) {
        if (!road || !road.segments) return;
        
        const gl = this.gl;
        const shader = this.shaders.road;
        
        gl.useProgram(shader.program);
        
        // Set uniforms
        gl.uniformMatrix4fv(shader.uniforms.u_viewMatrix, false, camera.viewMatrix.elements);
        gl.uniformMatrix4fv(shader.uniforms.u_projectionMatrix, false, camera.projectionMatrix.elements);
        gl.uniform3fv(shader.uniforms.u_lightDirection, [0.5, -1, 0.3]);
        gl.uniform3fv(shader.uniforms.u_lightColor, [1.0, 0.9, 0.8]);
        gl.uniform3fv(shader.uniforms.u_ambientColor, [0.3, 0.3, 0.4]);
        gl.uniform3fv(shader.uniforms.u_fogColor, [0.7, 0.8, 0.9]);
        
        // Render road segments
        for (const segment of road.segments) {
            if (segment.visible && segment.buffers) {
                this.renderRoadSegment(segment, shader);
            }
        }
    }

    renderRoadSegment(segment, shader) {
        const gl = this.gl;
        
        gl.uniformMatrix4fv(shader.uniforms.u_modelMatrix, false, segment.transform.elements);
        
        // Bind vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, segment.buffers.vertices);
        gl.enableVertexAttribArray(shader.attributes.a_position);
        gl.vertexAttribPointer(shader.attributes.a_position, 3, gl.FLOAT, false, 32, 0);
        
        gl.enableVertexAttribArray(shader.attributes.a_normal);
        gl.vertexAttribPointer(shader.attributes.a_normal, 3, gl.FLOAT, false, 32, 12);
        
        gl.enableVertexAttribArray(shader.attributes.a_texCoord);
        gl.vertexAttribPointer(shader.attributes.a_texCoord, 2, gl.FLOAT, false, 32, 24);
        
        // Draw
        if (segment.buffers.indices) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, segment.buffers.indices);
            gl.drawElements(gl.TRIANGLES, segment.indexCount, gl.UNSIGNED_SHORT, 0);
        }
        
        this.performance.drawCalls++;
    }

    renderVehicle(vehicle, camera) {
        if (!vehicle || !vehicle.buffers) return;
        
        const gl = this.gl;
        const shader = this.shaders.vehicle;
        
        gl.useProgram(shader.program);
        
        // Set uniforms
        gl.uniformMatrix4fv(shader.uniforms.u_modelMatrix, false, vehicle.transform.elements);
        gl.uniformMatrix4fv(shader.uniforms.u_viewMatrix, false, camera.viewMatrix.elements);
        gl.uniformMatrix4fv(shader.uniforms.u_projectionMatrix, false, camera.projectionMatrix.elements);
        gl.uniform3fv(shader.uniforms.u_lightDirection, [0.5, -1, 0.3]);
        gl.uniform3fv(shader.uniforms.u_lightColor, [1.0, 0.9, 0.8]);
        gl.uniform3fv(shader.uniforms.u_ambientColor, [0.3, 0.3, 0.4]);
        gl.uniform3fv(shader.uniforms.u_vehicleColor, vehicle.color || [0.8, 0.2, 0.2]);
        
        // Bind vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, vehicle.buffers.vertices);
        gl.enableVertexAttribArray(shader.attributes.a_position);
        gl.vertexAttribPointer(shader.attributes.a_position, 3, gl.FLOAT, false, 32, 0);
        
        gl.enableVertexAttribArray(shader.attributes.a_normal);
        gl.vertexAttribPointer(shader.attributes.a_normal, 3, gl.FLOAT, false, 32, 12);
        
        gl.enableVertexAttribArray(shader.attributes.a_texCoord);
        gl.vertexAttribPointer(shader.attributes.a_texCoord, 2, gl.FLOAT, false, 32, 24);
        
        // Draw
        if (vehicle.buffers.indices) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vehicle.buffers.indices);
            gl.drawElements(gl.TRIANGLES, vehicle.indexCount, gl.UNSIGNED_SHORT, 0);
        }
        
        this.performance.drawCalls++;
    }

    renderPostProcess() {
        const gl = this.gl;
        const shader = this.shaders.postProcess;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(shader.program);
        
        // Bind main color texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.frameBuffers.main.colorTexture);
        gl.uniform1i(shader.uniforms.u_colorTexture, 0);
        
        gl.uniform1f(shader.uniforms.u_exposure, 1.0);
        gl.uniform1f(shader.uniforms.u_gamma, 2.2);
        
        // Create fullscreen quad if not exists
        if (!this.buffers.fullscreenQuad) {
            this.buffers.fullscreenQuad = this.createFullscreenQuadBuffer();
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.fullscreenQuad);
        gl.enableVertexAttribArray(shader.attributes.a_position);
        gl.vertexAttribPointer(shader.attributes.a_position, 2, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        this.performance.drawCalls++;
    }

    createFullscreenQuadBuffer() {
        const gl = this.gl;
        
        const vertices = new Float32Array([
            -1, -1,  1, -1, -1,  1,
            -1,  1,  1, -1,  1,  1
        ]);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        return buffer;
    }

    createBuffer(data, type = null) {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        
        if (type === 'index') {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        }
        
        return buffer;
    }

    updateSettings(settings) {
        Object.assign(this.renderSettings, settings);
        
        // Recreate shadow map if resolution changed
        if (settings.shadowResolution) {
            const gl = this.gl;
            gl.deleteFramebuffer(this.frameBuffers.shadow.framebuffer);
            gl.deleteTexture(this.frameBuffers.shadow.depthTexture);
            
            this.frameBuffers.shadow = this.createFrameBuffer(
                settings.shadowResolution,
                settings.shadowResolution,
                false,
                true
            );
        }
    }

    cleanup() {
        const gl = this.gl;
        
        // Delete shaders
        Object.values(this.shaders).forEach(shader => {
            gl.deleteProgram(shader.program);
        });
        
        // Delete buffers
        Object.values(this.buffers).forEach(buffer => {
            gl.deleteBuffer(buffer);
        });
        
        // Delete textures and framebuffers
        Object.values(this.frameBuffers).forEach(fb => {
            gl.deleteFramebuffer(fb.framebuffer);
            if (fb.colorTexture) gl.deleteTexture(fb.colorTexture);
            if (fb.depthTexture) gl.deleteTexture(fb.depthTexture);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
}
