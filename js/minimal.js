/**
 * Minimal Zen Drive - Progressive loading version
 */

class MinimalZenDrive {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.init();
    }

    async init() {
        try {
            console.log('Starting minimal Zen Drive...');
            
            // Get canvas
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) {
                throw new Error('Canvas not found');
            }
            
            // Size canvas
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            
            // Get WebGL context
            this.gl = this.canvas.getContext('webgl2');
            if (!this.gl) {
                throw new Error('WebGL 2.0 not supported');
            }
            
            console.log('WebGL context created');
            
            // Set up basic WebGL state
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            this.gl.clearColor(0.4, 0.7, 1.0, 1.0); // Sky blue
            this.gl.enable(this.gl.DEPTH_TEST);
            
            // Hide loading screen
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            console.log('Starting render loop...');
            this.render();
            
        } catch (error) {
            console.error('Minimal Zen Drive error:', error);
            
            // Show error
            const errorDisplay = document.getElementById('error-display');
            if (errorDisplay) {
                errorDisplay.classList.remove('hidden');
                const errorMessage = document.getElementById('error-message');
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                }
            }
        }
    }

    render() {
        // Clear screen with sky blue
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Continue render loop
        requestAnimationFrame(() => this.render());
    }
}

// Check if full ZenDrive class is available, otherwise use minimal version
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // Check WebGL support first
    const testCanvas = document.createElement('canvas');
    const testGL = testCanvas.getContext('webgl2');
    
    if (!testGL) {
        console.error('WebGL 2.0 not supported');
        document.getElementById('error-display').classList.remove('hidden');
        return;
    }
    
    // Try to use full ZenDrive, fall back to minimal version
    if (typeof ZenDrive !== 'undefined') {
        console.log('Loading full Zen Drive...');
        try {
            window.zenDrive = new ZenDrive();
        } catch (error) {
            console.error('Full ZenDrive failed, using minimal version:', error);
            window.zenDrive = new MinimalZenDrive();
        }
    } else {
        console.log('ZenDrive class not found, using minimal version');
        window.zenDrive = new MinimalZenDrive();
    }
});
