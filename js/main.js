/**
 * Main game class for Zen Drive
 * Orchestrates all game systems and handles the main game loop
 */

class ZenDrive {
    constructor() {
        // Core systems
        this.canvas = null;
        this.renderer = null;
        this.camera = null;
        this.input = null;
        
        // World systems
        this.terrain = null;
        this.road = null;
        this.environment = null;
        this.vehicle = null;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.isLoading = true;
        this.loadingProgress = 0;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 60;
        this.frameTime = 16.7;
        this.lastFrameTime = performance.now();
        
        // UI elements
        this.uiElements = {
            loadingScreen: null,
            speedDisplay: null,
            timeDisplay: null,
            controlsHelp: null,
            settingsPanel: null,
            performanceMonitor: null,
            errorDisplay: null
        };
        
        // Game settings
        this.settings = {
            graphics: {
                quality: 'medium',
                renderDistance: 1000,
                enableShadows: true,
                enableFog: true,
                enablePostProcessing: true
            },
            controls: {
                sensitivity: 1.0,
                smoothing: 0.1
            },
            environment: {
                timeSpeed: 1,
                weather: 'auto'
            },
            debug: {
                showFPS: true,
                showDebugInfo: false,
                wireframe: false
            }
        };
        
        // Initialize the game
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Zen Drive...');
            
            // Get UI elements
            this.initializeUIElements();
            console.log('UI elements initialized');
            
            // Show loading screen
            this.showLoadingScreen('Initializing graphics...');
            
            // Initialize canvas and WebGL
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }
            console.log('Canvas found:', this.canvas);
            
            // Set canvas size to match window
            this.resizeCanvas();
            console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
            
            // Test basic WebGL
            const testGL = this.canvas.getContext('webgl2');
            if (!testGL) {
                throw new Error('WebGL 2.0 context creation failed');
            }
            testGL.clearColor(0.4, 0.7, 1.0, 1.0); // Sky blue
            testGL.clear(testGL.COLOR_BUFFER_BIT);
            console.log('Basic WebGL test passed - you should see blue screen');
            
            // Add some visual feedback to the page
            const statusDiv = document.createElement('div');
            statusDiv.style.position = 'absolute';
            statusDiv.style.top = '10px';
            statusDiv.style.left = '10px';
            statusDiv.style.color = 'white';
            statusDiv.style.fontFamily = 'Arial';
            statusDiv.style.background = 'rgba(0,0,0,0.7)';
            statusDiv.style.padding = '10px';
            statusDiv.style.zIndex = '1000';
            statusDiv.innerHTML = 'WebGL initialized successfully<br>Loading game systems...';
            document.body.appendChild(statusDiv);
            this.statusDiv = statusDiv;
            
            // Initialize renderer
            console.log('Creating renderer...');
            try {
                // Check if Renderer class exists
                if (typeof Renderer === 'undefined') {
                    throw new Error('Renderer class not found - using basic renderer');
                }
                this.renderer = new Renderer(this.canvas);
                console.log('Full Renderer created successfully');
            } catch (error) {
                console.error('Renderer creation failed:', error);
                console.log('Using basic fallback renderer with test triangle');
                // Continue with basic rendering
                this.useBasicRenderer();
            }
            this.updateLoadingProgress(20, 'Creating world systems...');
            
            // Initialize camera
            console.log('Creating camera...');
            try {
                this.camera = typeof Camera !== 'undefined' ? new Camera(this.canvas) : new SimpleCamera(this.canvas);
                console.log('Camera created successfully');
            } catch (error) {
                console.error('Camera creation failed:', error);
                this.camera = new SimpleCamera(this.canvas);
            }
            this.updateLoadingProgress(30, 'Generating terrain...');
            
            // Initialize world systems
            console.log('Creating terrain system...');
            try {
                this.terrain = typeof TerrainSystem !== 'undefined' ? new TerrainSystem(this.renderer) : new SimpleTerrain(this.renderer);
                console.log('Terrain system created successfully');
            } catch (error) {
                console.error('Terrain creation failed:', error);
                this.terrain = new SimpleTerrain(this.renderer);
            }
            this.updateLoadingProgress(50, 'Building roads...');
            
            console.log('Creating road system...');
            try {
                this.road = typeof RoadSystem !== 'undefined' ? new RoadSystem(this.renderer, this.terrain) : new SimpleRoad(this.renderer, this.terrain);
                console.log('Road system created successfully');
            } catch (error) {
                console.error('Road creation failed:', error);
                this.road = new SimpleRoad(this.renderer, this.terrain);
            }
            this.updateLoadingProgress(60, 'Setting up environment...');
            
            console.log('Creating environment system...');
            try {
                this.environment = typeof EnvironmentSystem !== 'undefined' ? new EnvironmentSystem(this.renderer) : new SimpleEnvironment(this.renderer);
                console.log('Environment system created successfully');
            } catch (error) {
                console.error('Environment creation failed:', error);
                this.environment = new SimpleEnvironment(this.renderer);
            }
            this.updateLoadingProgress(70, 'Creating vehicle...');
            
            // Initialize vehicle
            console.log('Creating vehicle...');
            try {
                this.vehicle = typeof Vehicle !== 'undefined' ? new Vehicle(this.renderer) : new SimpleVehicle(this.renderer);
                console.log('Vehicle created successfully');
            } catch (error) {
                console.error('Vehicle creation failed:', error);
                this.vehicle = new SimpleVehicle(this.renderer);
            }
            this.updateLoadingProgress(80, 'Configuring controls...');
            
            // Initialize input system
            console.log('Creating input system...');
            try {
                this.input = typeof InputManager !== 'undefined' ? new InputManager(this.canvas) : new SimpleInputManager(this.canvas);
                console.log('Input system created successfully');
            } catch (error) {
                console.error('Input creation failed:', error);
                this.input = new SimpleInputManager(this.canvas);
            }
            this.updateLoadingProgress(90, 'Finalizing...');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Configure initial settings
            this.applySettings();
            
            this.updateLoadingProgress(100, 'Ready!');
            
            // Start the game
            await this.startGame();
            
        } catch (error) {
            console.error('Failed to initialize Zen Drive:', error);
            console.error('Stack trace:', error.stack);
            this.showError(error.message);
        }
    }

    initializeUIElements() {
        this.uiElements.loadingScreen = document.getElementById('loading-screen');
        this.uiElements.speedDisplay = document.getElementById('speed-value');
        this.uiElements.timeDisplay = document.getElementById('time-value');
        this.uiElements.controlsHelp = document.getElementById('controls-help');
        this.uiElements.settingsPanel = document.getElementById('settings-panel');
        this.uiElements.performanceMonitor = document.getElementById('performance-monitor');
        this.uiElements.errorDisplay = document.getElementById('error-display');
    }

    showLoadingScreen(message) {
        if (this.uiElements.loadingScreen) {
            this.uiElements.loadingScreen.style.display = 'flex';
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    updateLoadingProgress(progress, message) {
        this.loadingProgress = progress;
        
        const progressBar = document.getElementById('loading-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        const loadingText = document.getElementById('loading-text');
        if (loadingText && message) {
            loadingText.textContent = message;
        }
        
        // Update status div too
        if (this.statusDiv) {
            this.statusDiv.innerHTML = `Loading ${progress}%<br>${message}`;
        }
    }

    hideLoadingScreen() {
        if (this.uiElements.loadingScreen) {
            this.uiElements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.uiElements.loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    useBasicRenderer() {
        console.log('Using basic renderer fallback');
        // Create a minimal renderer that can draw simple shapes
        this.renderer = {
            gl: this.canvas.getContext('webgl2'),
            render: (scene, camera) => {
                const gl = this.renderer.gl;
                gl.clearColor(0.4, 0.7, 1.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                
                // Draw a test triangle and some status info
                this.drawTestTriangle(gl);
                
                console.log('Basic renderer: drawing test triangle + scene info');
                if (scene) {
                    console.log('Scene objects:', Object.keys(scene));
                    
                    // Try to call render on scene objects if they have it
                    if (scene.terrain && scene.terrain.render) {
                        console.log('Calling terrain.render()');
                        scene.terrain.render(camera);
                    }
                    if (scene.vehicle && scene.vehicle.render) {
                        console.log('Calling vehicle.render()');
                        scene.vehicle.render(camera);
                    }
                    if (scene.road && scene.road.render) {
                        console.log('Calling road.render()');
                        scene.road.render(camera);
                    }
                }
            },
            resize: () => {
                this.renderer.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        };
    }

    drawTestTriangle(gl) {
        // Simple vertex shader
        const vertexShaderSource = `#version 300 es
            in vec4 a_position;
            void main() {
                gl_Position = a_position;
            }
        `;
        
        // Simple fragment shader
        const fragmentShaderSource = `#version 300 es
            precision mediump float;
            out vec4 outColor;
            void main() {
                outColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
            }
        `;
        
        // Create and compile shaders (basic version)
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        
        // Create program
        if (!this.testProgram) {
            this.testProgram = gl.createProgram();
            gl.attachShader(this.testProgram, vertexShader);
            gl.attachShader(this.testProgram, fragmentShader);
            gl.linkProgram(this.testProgram);
            
            // Create triangle vertices
            const vertices = new Float32Array([
                0.0,  0.5,
                -0.5, -0.5,
                0.5, -0.5
            ]);
            
            this.testBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.testBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        }
        
        // Draw triangle
        gl.useProgram(this.testProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.testBuffer);
        
        const positionAttributeLocation = gl.getAttribLocation(this.testProgram, 'a_position');
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        
        console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height} (display: ${displayWidth}x${displayHeight})`);
        
        // Update renderer viewport if available
        if (this.renderer && this.renderer.gl) {
            this.renderer.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    showError(message) {
        if (this.uiElements.errorDisplay) {
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
            this.uiElements.errorDisplay.classList.remove('hidden');
        }
    }

    async startGame() {
        console.log('Starting Zen Drive...');
        
        // Update status
        if (this.statusDiv) {
            this.statusDiv.innerHTML = 'Game starting...<br>Systems loaded, beginning render loop';
        }
        
        // Hide loading screen
        setTimeout(() => {
            this.hideLoadingScreen();
            this.isLoading = false;
            
            // Update status for running game
            if (this.statusDiv) {
                this.statusDiv.innerHTML = `
                    Zen Drive Running<br>
                    Renderer: ${this.renderer === this.basicRenderer ? 'Basic Fallback' : 'Full System'}<br>
                    Controls: WASD to drive
                `;
            }
        }, 1000);
        
        // Start the main game loop
        this.isRunning = true;
        this.gameLoop();
        
        console.log('Zen Drive started successfully!');
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        this.frameTime = currentTime - this.lastFrameTime + deltaTime * 1000;
        
        // Add frame counter to show the loop is running
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            console.log(`Game loop running - Frame ${this.frameCount}, FPS: ${Math.round(1/deltaTime)}`);
        }
        
        if (!this.isPaused && !this.isLoading) {
            // Update all game systems
            this.update(deltaTime);
            
            // Render the frame
            this.render();
        }
        
        // Update UI
        this.updateUI();
        
        // Update performance stats
        this.updatePerformanceStats();
        
        // Continue the loop
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // Clamp delta time to prevent large jumps
        deltaTime = Math.min(deltaTime, 1/20);
        
        // Handle input
        this.handleInput();
        
        // Update environment first (affects lighting)
        this.environment.update(deltaTime);
        
        // Update vehicle physics
        this.vehicle.update(deltaTime, this.input, this.terrain, this.road);
        
        // Log vehicle position every few seconds for debugging
        if (this.frameCount % 300 === 0) {
            console.log('Vehicle position:', this.vehicle.position);
            console.log('Camera position:', this.camera.position);
        }
        
        // Update camera to follow vehicle
        this.camera.follow(this.vehicle, deltaTime);
        
        // Update world systems
        const frustumPlanes = this.camera.getFrustumPlanes();
        this.terrain.update(this.vehicle.position, frustumPlanes);
        this.road.update(this.vehicle.position);
        
        // Resize canvas if needed
        this.checkResize();
    }

    render() {
        try {
            if (!this.renderer) {
                console.warn('No renderer available');
                return;
            }
            
            // Create scene object for renderer
            const scene = {
                terrain: this.terrain,
                road: this.road,
                vehicle: this.vehicle,
                environment: this.environment
            };
            
            // Debug log every few seconds
            if (this.frameCount % 300 === 0) {
                console.log('Rendering scene with:', Object.keys(scene));
                console.log('Renderer type:', this.renderer.constructor?.name || 'Basic');
            }
            
            // Render the frame
            this.renderer.render(scene, this.camera);
            
        } catch (error) {
            console.error('Render error:', error);
            // Fallback to basic clear
            if (this.renderer && this.renderer.gl) {
                console.log('Using fallback rendering');
                this.renderer.gl.clearColor(0.4, 0.7, 1.0, 1.0);
                this.renderer.gl.clear(this.renderer.gl.COLOR_BUFFER_BIT | this.renderer.gl.DEPTH_BUFFER_BIT);
            }
        }
    }

    handleInput() {
        const uiInput = this.input.getUIInput();
        const cameraInput = this.input.getCameraInput();
        
        // UI controls
        if (uiInput.toggleHelp) {
            this.toggleControlsHelp();
        }
        
        if (uiInput.toggleSettings) {
            this.toggleSettings();
        }
        
        if (uiInput.toggleFullscreen) {
            this.toggleFullscreen();
        }
        
        if (uiInput.toggleTimeSpeed) {
            this.environment.toggleTimeSpeed();
        }
        
        if (uiInput.toggleDebug) {
            this.settings.debug.showDebugInfo = !this.settings.debug.showDebugInfo;
        }
        
        if (uiInput.toggleWireframe) {
            this.settings.debug.wireframe = !this.settings.debug.wireframe;
        }
        
        // Camera controls
        if (cameraInput.nextMode) {
            this.cycleCameraMode();
        }
    }

    updateUI() {
        if (this.isLoading) return;
        
        // Update speed display
        const vehicleData = this.vehicle.getPerformanceData();
        if (this.uiElements.speedDisplay) {
            this.uiElements.speedDisplay.textContent = Math.round(vehicleData.speedMPH);
        }
        
        // Update time display
        if (this.uiElements.timeDisplay) {
            this.uiElements.timeDisplay.textContent = this.environment.getFormattedTime();
        }
        
        // Update performance monitor
        if (this.settings.debug.showFPS && this.uiElements.performanceMonitor) {
            const fpsElement = document.getElementById('fps-value');
            const frameTimeElement = document.getElementById('frame-time');
            const memoryElement = document.getElementById('memory-usage');
            
            if (fpsElement) fpsElement.textContent = this.currentFPS;
            if (frameTimeElement) frameTimeElement.textContent = `${this.frameTime.toFixed(1)}ms`;
            
            if (memoryElement && performance.memory) {
                const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                memoryElement.textContent = `${memoryMB}MB`;
            }
        }
    }

    updatePerformanceStats() {
        this.frameCount++;
        
        const currentTime = performance.now();
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }
    }

    checkResize() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        if (this.canvas.clientWidth !== displayWidth || this.canvas.clientHeight !== displayHeight) {
            this.resizeCanvas();
            if (this.renderer) {
                this.renderer.resize();
            }
        }
    }

    setupEventListeners() {
        // Window events
        window.addEventListener('resize', () => this.checkResize());
        window.addEventListener('beforeunload', () => this.cleanup());
        
        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
        
        // Settings controls
        this.setupSettingsControls();
    }

    setupSettingsControls() {
        // Settings toggle
        const settingsToggle = document.getElementById('settings-toggle');
        if (settingsToggle) {
            settingsToggle.addEventListener('click', () => this.toggleSettings());
        }
        
        // Graphics quality
        const qualitySelect = document.getElementById('graphics-quality');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                this.settings.graphics.quality = e.target.value;
                this.applyGraphicsSettings();
            });
        }
        
        // Render distance
        const renderDistanceSlider = document.getElementById('render-distance');
        if (renderDistanceSlider) {
            renderDistanceSlider.addEventListener('input', (e) => {
                this.settings.graphics.renderDistance = parseInt(e.target.value);
                document.getElementById('render-distance-value').textContent = `${e.target.value}m`;
                this.applyGraphicsSettings();
            });
        }
        
        // Fog density
        const fogDensitySlider = document.getElementById('fog-density');
        if (fogDensitySlider) {
            fogDensitySlider.addEventListener('input', (e) => {
                const density = parseInt(e.target.value);
                document.getElementById('fog-density-value').textContent = `${density}%`;
                this.environment.fog.density = density / 100 * 0.005;
            });
        }
        
        // Camera lag
        const cameraLagSlider = document.getElementById('camera-lag');
        if (cameraLagSlider) {
            cameraLagSlider.addEventListener('input', (e) => {
                const lag = parseInt(e.target.value);
                document.getElementById('camera-lag-value').textContent = lag;
                this.camera.followLag = lag / 10;
            });
        }
    }

    applySettings() {
        this.applyGraphicsSettings();
        this.applyControlSettings();
        this.applyEnvironmentSettings();
    }

    applyGraphicsSettings() {
        if (this.renderer) {
            const settings = this.settings.graphics;
            this.renderer.updateSettings({
                quality: settings.quality,
                renderDistance: settings.renderDistance,
                enableShadows: settings.enableShadows,
                enableFog: settings.enableFog,
                enablePostProcessing: settings.enablePostProcessing
            });
        }
        
        if (this.terrain) {
            this.terrain.renderDistance = this.settings.graphics.renderDistance;
        }
    }

    applyControlSettings() {
        if (this.input) {
            this.input.setSensitivity('steering', this.settings.controls.sensitivity);
            this.input.setSensitivity('throttle', this.settings.controls.smoothing);
        }
    }

    applyEnvironmentSettings() {
        if (this.environment) {
            this.environment.setTimeSpeed(this.settings.environment.timeSpeed);
        }
    }

    // UI toggle methods
    toggleControlsHelp() {
        if (this.uiElements.controlsHelp) {
            this.uiElements.controlsHelp.classList.toggle('visible');
        }
    }

    toggleSettings() {
        const settingsContent = document.getElementById('settings-content');
        if (settingsContent) {
            settingsContent.classList.toggle('visible');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Failed to enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.warn('Failed to exit fullscreen:', err);
            });
        }
    }

    cycleCameraMode() {
        // Cycle through different camera modes
        const modes = ['follow', 'close', 'far', 'side', 'bird'];
        const currentMode = this.camera.currentMode || 'follow';
        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const nextMode = modes[nextIndex];
        
        this.camera.setCinematicMode(nextMode, this.vehicle);
        this.camera.currentMode = nextMode;
        
        console.log(`Camera mode: ${nextMode}`);
    }

    // Game state methods
    pause() {
        this.isPaused = true;
        console.log('Game paused');
    }

    resume() {
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        console.log('Game resumed');
    }

    stop() {
        this.isRunning = false;
        console.log('Game stopped');
    }

    restart() {
        console.log('Restarting game...');
        
        // Reset vehicle
        this.vehicle.reset();
        
        // Reset camera
        this.camera.setPosition(new Vec3(0, 10, 20));
        this.camera.setTarget(new Vec3(0, 0, 0));
        
        // Reset environment
        this.environment.setTimeOfDay(0.5); // Noon
        this.environment.setWeather('clear');
        
        console.log('Game restarted');
    }

    // Debug methods
    getDebugInfo() {
        if (!this.settings.debug.showDebugInfo) return null;
        
        return {
            performance: {
                fps: this.currentFPS,
                frameTime: this.frameTime.toFixed(2) + 'ms',
                memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'
            },
            vehicle: this.vehicle.getDebugInfo(),
            camera: this.camera.getDebugInfo(),
            environment: this.environment.getDebugInfo(),
            terrain: this.terrain.getStats(),
            road: this.road.getStats()
        };
    }

    // Cleanup
    cleanup() {
        console.log('Cleaning up Zen Drive...');
        
        this.stop();
        
        if (this.input) {
            this.input.destroy();
        }
        
        if (this.vehicle) {
            this.vehicle.destroy();
        }
        
        if (this.terrain) {
            this.terrain.destroy();
        }
        
        if (this.road) {
            this.road.destroy();
        }
        
        if (this.renderer) {
            this.renderer.cleanup();
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Zen Drive...');
    
    // Prevent double initialization
    if (window.zenDriveInitialized) {
        console.log('Zen Drive already initialized, skipping...');
        return;
    }
    window.zenDriveInitialized = true;
    
    // Check for WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
        console.error('WebGL 2.0 not supported');
        document.getElementById('error-display').classList.remove('hidden');
        document.getElementById('error-message').textContent = 
            'WebGL 2.0 is not supported in your browser. Please update your browser or enable WebGL.';
        return;
    }
    
    console.log('WebGL 2.0 support confirmed');
    
    // Check if all required classes are available (with delay to allow loading)
    setTimeout(() => {
        const requiredClasses = ['Renderer', 'Camera', 'InputManager', 'TerrainSystem', 'RoadSystem', 'EnvironmentSystem', 'Vehicle'];
        const missingClasses = [];
        for (const className of requiredClasses) {
            if (typeof window[className] === 'undefined') {
                console.error(`Required class ${className} not found`);
                missingClasses.push(className);
            } else {
                console.log(`✓ ${className} class loaded`);
            }
        }
        
        if (missingClasses.length > 0) {
            console.warn(`Missing classes: ${missingClasses.join(', ')} - will use fallbacks`);
        } else {
            console.log('All required classes loaded successfully');
        }
        
        // Start the game
        try {
            window.zenDrive = new ZenDrive();
        } catch (error) {
            console.error('Error creating ZenDrive:', error);
            document.getElementById('error-display').classList.remove('hidden');
            document.getElementById('error-message').textContent = 
                `Failed to initialize game: ${error.message}`;
        }
    }, 100); // Small delay to ensure all scripts are loaded
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZenDrive;
}
