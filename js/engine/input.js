/**
 * Input handling system for Zen Drive
 * Manages keyboard, mouse, and gamepad inputs with smooth controls
 */

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Input state
        this.keys = {};
        this.keysDown = {};
        this.keysUp = {};
        
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            buttons: {},
            wheel: 0
        };
        
        // Vehicle controls
        this.controls = {
            throttle: 0,        // -1 to 1 (reverse to forward)
            steering: 0,        // -1 to 1 (left to right)
            brake: 0,           // 0 to 1
            handbrake: false,   // boolean
            reset: false        // boolean
        };
        
        // Control smoothing
        this.smoothing = {
            throttle: 0.1,
            steering: 0.15,
            brake: 0.2
        };
        
        // Raw input values
        this.rawControls = {
            throttle: 0,
            steering: 0,
            brake: 0
        };
        
        // Key bindings
        this.keyBindings = {
            // Primary controls
            forward: ['KeyW', 'ArrowUp'],
            backward: ['KeyS', 'ArrowDown'],
            left: ['KeyA', 'ArrowLeft'],
            right: ['KeyD', 'ArrowRight'],
            brake: ['Space'],
            reset: ['KeyR'],
            
            // Camera controls
            cameraLeft: ['KeyQ'],
            cameraRight: ['KeyE'],
            cameraUp: ['KeyZ'],
            cameraDown: ['KeyX'],
            
            // UI controls
            toggleHelp: ['KeyH'],
            toggleSettings: ['KeyO'],
            toggleFullscreen: ['KeyF'],
            toggleTimeSpeed: ['KeyT'],
            
            // Debug controls
            toggleDebug: ['F1'],
            toggleWireframe: ['F2'],
            nextCameraMode: ['KeyC']
        };
        
        // Gamepad support
        this.gamepad = null;
        this.gamepadIndex = -1;
        this.gamepadDeadzone = 0.1;
        
        // Touch support for mobile
        this.touch = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        };
        
        // Event listeners
        this.setupEventListeners();
        
        // Update loop
        this.lastUpdateTime = performance.now();
        this.update();
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('wheel', (e) => this.onMouseWheel(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        
        // Gamepad events
        window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
        window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle focus events
        window.addEventListener('blur', () => this.onWindowBlur());
        window.addEventListener('focus', () => this.onWindowFocus());
    }

    onKeyDown(event) {
        const code = event.code;
        
        // Prevent default for game controls
        if (this.isGameControl(code)) {
            event.preventDefault();
        }
        
        if (!this.keys[code]) {
            this.keysDown[code] = true;
        }
        this.keys[code] = true;
    }

    onKeyUp(event) {
        const code = event.code;
        
        if (this.isGameControl(code)) {
            event.preventDefault();
        }
        
        this.keys[code] = false;
        this.keysUp[code] = true;
    }

    isGameControl(code) {
        for (const [action, keys] of Object.entries(this.keyBindings)) {
            if (keys.includes(code)) {
                return true;
            }
        }
        return false;
    }

    onMouseDown(event) {
        this.mouse.buttons[event.button] = true;
        
        // Request pointer lock for camera control
        if (event.button === 2) { // Right mouse button
            this.canvas.requestPointerLock();
        }
    }

    onMouseUp(event) {
        this.mouse.buttons[event.button] = false;
    }

    onMouseMove(event) {
        if (document.pointerLockElement === this.canvas) {
            this.mouse.deltaX = event.movementX;
            this.mouse.deltaY = event.movementY;
        } else {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = event.clientX - rect.left;
            this.mouse.y = event.clientY - rect.top;
            this.mouse.deltaX = 0;
            this.mouse.deltaY = 0;
        }
    }

    onMouseWheel(event) {
        event.preventDefault();
        this.mouse.wheel = event.deltaY;
    }

    onTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.touch.active = true;
        this.touch.startX = touch.clientX;
        this.touch.startY = touch.clientY;
        this.touch.currentX = touch.clientX;
        this.touch.currentY = touch.clientY;
    }

    onTouchEnd(event) {
        event.preventDefault();
        this.touch.active = false;
    }

    onTouchMove(event) {
        event.preventDefault();
        if (this.touch.active && event.touches.length > 0) {
            const touch = event.touches[0];
            this.touch.currentX = touch.clientX;
            this.touch.currentY = touch.clientY;
        }
    }

    onGamepadConnected(event) {
        console.log('Gamepad connected:', event.gamepad);
        this.gamepad = event.gamepad;
        this.gamepadIndex = event.gamepad.index;
    }

    onGamepadDisconnected(event) {
        console.log('Gamepad disconnected');
        this.gamepad = null;
        this.gamepadIndex = -1;
    }

    onWindowBlur() {
        // Clear all input states when window loses focus
        this.keys = {};
        this.mouse.buttons = {};
        this.rawControls = {
            throttle: 0,
            steering: 0,
            brake: 0
        };
    }

    onWindowFocus() {
        // Reset states when window regains focus
        this.keysDown = {};
        this.keysUp = {};
    }

    update() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = currentTime;
        
        // Update gamepad state
        this.updateGamepad();
        
        // Process keyboard input
        this.processKeyboardInput();
        
        // Process mouse input
        this.processMouseInput();
        
        // Process touch input
        this.processTouchInput();
        
        // Apply smoothing to controls
        this.applySmoothControls(deltaTime);
        
        // Clear frame-specific input states
        this.keysDown = {};
        this.keysUp = {};
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        this.mouse.wheel = 0;
        
        // Schedule next update
        requestAnimationFrame(() => this.update());
    }

    updateGamepad() {
        if (this.gamepadIndex >= 0) {
            const gamepads = navigator.getGamepads();
            this.gamepad = gamepads[this.gamepadIndex];
        }
    }

    processKeyboardInput() {
        // Reset raw controls
        this.rawControls.throttle = 0;
        this.rawControls.steering = 0;
        this.rawControls.brake = 0;
        this.controls.handbrake = false;
        this.controls.reset = false;
        
        // Forward/backward
        if (this.isActionPressed('forward')) {
            this.rawControls.throttle += 1;
        }
        if (this.isActionPressed('backward')) {
            this.rawControls.throttle -= 1;
        }
        
        // Steering
        if (this.isActionPressed('left')) {
            this.rawControls.steering -= 1;
        }
        if (this.isActionPressed('right')) {
            this.rawControls.steering += 1;
        }
        
        // Brake/handbrake
        if (this.isActionPressed('brake')) {
            this.controls.handbrake = true;
            this.rawControls.brake = 1;
        }
        
        // Reset
        if (this.isActionJustPressed('reset')) {
            this.controls.reset = true;
        }
    }

    processMouseInput() {
        // Mouse wheel can control throttle (optional)
        if (this.mouse.wheel !== 0) {
            this.rawControls.throttle += this.mouse.wheel > 0 ? -0.1 : 0.1;
            this.rawControls.throttle = MathUtils.clamp(this.rawControls.throttle, -1, 1);
        }
    }

    processTouchInput() {
        if (!this.touch.active) return;
        
        const deltaX = this.touch.currentX - this.touch.startX;
        const deltaY = this.touch.currentY - this.touch.startY;
        
        // Touch steering
        const steeringSensitivity = 0.005;
        this.rawControls.steering = MathUtils.clamp(deltaX * steeringSensitivity, -1, 1);
        
        // Touch throttle/brake
        const throttleSensitivity = 0.003;
        if (deltaY < 0) {
            this.rawControls.throttle = MathUtils.clamp(-deltaY * throttleSensitivity, 0, 1);
        } else {
            this.rawControls.brake = MathUtils.clamp(deltaY * throttleSensitivity, 0, 1);
        }
    }

    processGamepadInput() {
        if (!this.gamepad) return;
        
        // Left stick for steering
        const leftStickX = this.gamepad.axes[0];
        if (Math.abs(leftStickX) > this.gamepadDeadzone) {
            this.rawControls.steering = leftStickX;
        }
        
        // Right trigger for throttle
        const rightTrigger = this.gamepad.buttons[7] ? this.gamepad.buttons[7].value : 0;
        if (rightTrigger > this.gamepadDeadzone) {
            this.rawControls.throttle = rightTrigger;
        }
        
        // Left trigger for brake
        const leftTrigger = this.gamepad.buttons[6] ? this.gamepad.buttons[6].value : 0;
        if (leftTrigger > this.gamepadDeadzone) {
            this.rawControls.brake = leftTrigger;
        }
        
        // Buttons
        if (this.gamepad.buttons[0] && this.gamepad.buttons[0].pressed) { // A button
            this.controls.handbrake = true;
        }
        
        if (this.gamepad.buttons[1] && this.gamepad.buttons[1].pressed) { // B button
            this.controls.reset = true;
        }
    }

    applySmoothControls(deltaTime) {
        // Smooth throttle
        const throttleTarget = this.rawControls.throttle;
        const throttleDiff = throttleTarget - this.controls.throttle;
        this.controls.throttle += throttleDiff * this.smoothing.throttle;
        
        // Smooth steering
        const steeringTarget = this.rawControls.steering;
        const steeringDiff = steeringTarget - this.controls.steering;
        this.controls.steering += steeringDiff * this.smoothing.steering;
        
        // Smooth brake
        const brakeTarget = this.rawControls.brake;
        const brakeDiff = brakeTarget - this.controls.brake;
        this.controls.brake += brakeDiff * this.smoothing.brake;
        
        // Clamp values
        this.controls.throttle = MathUtils.clamp(this.controls.throttle, -1, 1);
        this.controls.steering = MathUtils.clamp(this.controls.steering, -1, 1);
        this.controls.brake = MathUtils.clamp(this.controls.brake, 0, 1);
    }

    isActionPressed(action) {
        const keys = this.keyBindings[action];
        if (!keys) return false;
        
        return keys.some(key => this.keys[key]);
    }

    isActionJustPressed(action) {
        const keys = this.keyBindings[action];
        if (!keys) return false;
        
        return keys.some(key => this.keysDown[key]);
    }

    isActionJustReleased(action) {
        const keys = this.keyBindings[action];
        if (!keys) return false;
        
        return keys.some(key => this.keysUp[key]);
    }

    // Camera controls
    getCameraInput() {
        return {
            left: this.isActionPressed('cameraLeft'),
            right: this.isActionPressed('cameraRight'),
            up: this.isActionPressed('cameraUp'),
            down: this.isActionPressed('cameraDown'),
            mouseX: this.mouse.deltaX,
            mouseY: this.mouse.deltaY,
            nextMode: this.isActionJustPressed('nextCameraMode')
        };
    }

    // UI controls
    getUIInput() {
        return {
            toggleHelp: this.isActionJustPressed('toggleHelp'),
            toggleSettings: this.isActionJustPressed('toggleSettings'),
            toggleFullscreen: this.isActionJustPressed('toggleFullscreen'),
            toggleTimeSpeed: this.isActionJustPressed('toggleTimeSpeed'),
            toggleDebug: this.isActionJustPressed('toggleDebug'),
            toggleWireframe: this.isActionJustPressed('toggleWireframe')
        };
    }

    // Control sensitivity settings
    setSensitivity(type, value) {
        if (type === 'steering') {
            this.smoothing.steering = MathUtils.clamp(value, 0.01, 1.0);
        } else if (type === 'throttle') {
            this.smoothing.throttle = MathUtils.clamp(value, 0.01, 1.0);
        } else if (type === 'brake') {
            this.smoothing.brake = MathUtils.clamp(value, 0.01, 1.0);
        }
    }

    // Custom key binding
    bindKey(action, key) {
        if (this.keyBindings[action]) {
            if (!this.keyBindings[action].includes(key)) {
                this.keyBindings[action].push(key);
            }
        } else {
            this.keyBindings[action] = [key];
        }
    }

    unbindKey(action, key) {
        if (this.keyBindings[action]) {
            const index = this.keyBindings[action].indexOf(key);
            if (index > -1) {
                this.keyBindings[action].splice(index, 1);
            }
        }
    }

    // Enable/disable specific input types
    enableKeyboard(enabled = true) {
        this.keyboardEnabled = enabled;
    }

    enableMouse(enabled = true) {
        this.mouseEnabled = enabled;
    }

    enableGamepad(enabled = true) {
        this.gamepadEnabled = enabled;
    }

    enableTouch(enabled = true) {
        this.touchEnabled = enabled;
    }

    // Get control values for vehicle
    getVehicleControls() {
        return {
            throttle: this.controls.throttle,
            steering: this.controls.steering,
            brake: this.controls.brake,
            handbrake: this.controls.handbrake,
            reset: this.controls.reset
        };
    }

    // Input state for debugging
    getDebugInfo() {
        return {
            throttle: this.controls.throttle.toFixed(3),
            steering: this.controls.steering.toFixed(3),
            brake: this.controls.brake.toFixed(3),
            handbrake: this.controls.handbrake,
            gamepad: this.gamepad ? this.gamepad.id : 'None',
            activeKeys: Object.keys(this.keys).filter(key => this.keys[key])
        };
    }

    // Clean up event listeners
    destroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('wheel', this.onMouseWheel);
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('gamepadconnected', this.onGamepadConnected);
        window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
        window.removeEventListener('blur', this.onWindowBlur);
        window.removeEventListener('focus', this.onWindowFocus);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputManager;
}
