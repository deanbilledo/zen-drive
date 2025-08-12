/**
 * Camera system for Zen Drive
 * Handles third-person camera following, smooth interpolation, and view controls
 */

class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Position and orientation
        this.position = new Vec3(0, 10, 20);
        this.target = new Vec3(0, 0, 0);
        this.up = Vec3.up();
        
        // Following parameters
        this.followDistance = 25;
        this.followHeight = 8;
        this.followLag = 0.1;
        this.lookAhead = 15;
        
        // Smooth following state
        this.smoothPosition = this.position.clone();
        this.smoothTarget = this.target.clone();
        this.velocity = Vec3.zero();
        this.targetVelocity = Vec3.zero();
        
        // View parameters
        this.fov = MathUtils.toRadians(75);
        this.near = 0.1;
        this.far = 2000;
        this.aspect = canvas.width / canvas.height;
        
        // Speed-based effects
        this.baseFov = this.fov;
        this.maxSpeedFov = MathUtils.toRadians(90);
        this.fovSmoothness = 0.05;
        
        // Matrices
        this.viewMatrix = Mat4.create();
        this.projectionMatrix = Mat4.create();
        this.viewProjectionMatrix = Mat4.create();
        
        // Collision
        this.terrainHeight = 0;
        this.minHeight = 2;
        
        // Camera shake
        this.shakeIntensity = 0;
        this.shakeDecay = 0.95;
        this.shakeOffset = Vec3.zero();
        
        this.updateProjectionMatrix();
    }

    follow(vehicle, deltaTime) {
        if (!vehicle) return;

        const vehiclePos = vehicle.position;
        const vehicleVel = vehicle.velocity;
        const vehicleSpeed = vehicleVel.length();
        const vehicleForward = vehicle.forward;
        const vehicleRight = vehicle.right;
        
        // Calculate ideal camera position
        const idealOffset = vehicleForward.multiply(-this.followDistance);
        idealOffset.y = this.followHeight;
        
        // Add side offset based on turning
        const turnAmount = vehicle.turnInput || 0;
        const sideOffset = vehicleRight.multiply(turnAmount * 5);
        idealOffset.x += sideOffset.x;
        idealOffset.z += sideOffset.z;
        
        const idealPosition = vehiclePos.add(idealOffset);
        
        // Speed-based camera adjustments
        const speedFactor = Math.min(vehicleSpeed / 100, 1); // Normalize to 0-1
        
        // Adjust follow distance based on speed
        const dynamicDistance = this.followDistance + speedFactor * 10;
        const dynamicHeight = this.followHeight + speedFactor * 3;
        
        // Calculate final ideal position with speed adjustments
        const finalIdealOffset = vehicleForward.multiply(-dynamicDistance);
        finalIdealOffset.y = dynamicHeight;
        const finalIdealPosition = vehiclePos.add(finalIdealOffset);
        
        // Smooth position interpolation
        const positionLag = this.followLag * (1 + speedFactor * 0.5);
        this.smoothPosition = this.smoothPosition.lerp(finalIdealPosition, positionLag);
        
        // Terrain collision
        this.handleTerrainCollision();
        
        // Calculate look-at target with look-ahead
        const lookAheadDistance = this.lookAhead + speedFactor * 20;
        const lookAheadTarget = vehiclePos.add(vehicleVel.normalize().multiply(lookAheadDistance));
        lookAheadTarget.y = vehiclePos.y + 2;
        
        // Smooth target interpolation
        const targetLag = this.followLag * 0.8;
        this.smoothTarget = this.smoothTarget.lerp(lookAheadTarget, targetLag);
        
        // Speed-based FOV
        const targetFov = this.baseFov + speedFactor * (this.maxSpeedFov - this.baseFov);
        this.fov = MathUtils.lerp(this.fov, targetFov, this.fovSmoothness);
        
        // Camera shake based on speed and terrain roughness
        this.updateCameraShake(vehicleSpeed, deltaTime);
        
        // Apply shake to final position
        this.position = this.smoothPosition.add(this.shakeOffset);
        this.target = this.smoothTarget;
        
        this.updateMatrices();
    }

    handleTerrainCollision() {
        // Ensure camera doesn't go below terrain
        const groundHeight = this.getTerrainHeight(this.smoothPosition.x, this.smoothPosition.z);
        const minCameraHeight = groundHeight + this.minHeight;
        
        if (this.smoothPosition.y < minCameraHeight) {
            this.smoothPosition.y = minCameraHeight;
        }
    }

    getTerrainHeight(x, z) {
        // This should be connected to the terrain system
        // For now, return a simple approximation
        return 0;
    }

    updateCameraShake(speed, deltaTime) {
        // Calculate shake intensity based on speed
        const speedShake = Math.min(speed / 100, 1) * 0.3;
        
        // Add random shake
        this.shakeIntensity = Math.max(this.shakeIntensity, speedShake);
        
        // Generate shake offset
        if (this.shakeIntensity > 0.01) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 1;
            const shakeZ = (Math.random() - 0.5) * this.shakeIntensity * 2;
            
            this.shakeOffset = new Vec3(shakeX, shakeY, shakeZ);
        } else {
            this.shakeOffset = Vec3.zero();
        }
        
        // Decay shake
        this.shakeIntensity *= this.shakeDecay;
    }

    setTarget(target) {
        this.target.copy(target);
        this.smoothTarget.copy(target);
    }

    setPosition(position) {
        this.position.copy(position);
        this.smoothPosition.copy(position);
    }

    updateMatrices() {
        // Update view matrix
        this.viewMatrix = Mat4.lookAt(this.position, this.target, this.up);
        
        // Update projection matrix if needed
        const newAspect = this.canvas.width / this.canvas.height;
        if (Math.abs(newAspect - this.aspect) > 0.001) {
            this.aspect = newAspect;
            this.updateProjectionMatrix();
        }
        
        // Update combined matrix
        this.viewProjectionMatrix = this.projectionMatrix.multiply(this.viewMatrix);
    }

    updateProjectionMatrix() {
        this.projectionMatrix = Mat4.perspective(this.fov, this.aspect, this.near, this.far);
    }

    // Manual camera controls for debugging
    moveForward(distance) {
        const forward = this.target.subtract(this.position).normalize();
        this.position = this.position.add(forward.multiply(distance));
        this.target = this.target.add(forward.multiply(distance));
        this.smoothPosition.copy(this.position);
        this.smoothTarget.copy(this.target);
    }

    moveRight(distance) {
        const forward = this.target.subtract(this.position).normalize();
        const right = forward.cross(this.up).normalize();
        this.position = this.position.add(right.multiply(distance));
        this.target = this.target.add(right.multiply(distance));
        this.smoothPosition.copy(this.position);
        this.smoothTarget.copy(this.target);
    }

    moveUp(distance) {
        this.position.y += distance;
        this.target.y += distance;
        this.smoothPosition.copy(this.position);
        this.smoothTarget.copy(this.target);
    }

    rotateHorizontal(angle) {
        const direction = this.target.subtract(this.position);
        const distance = direction.length();
        
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        
        const newX = direction.x * cosAngle - direction.z * sinAngle;
        const newZ = direction.x * sinAngle + direction.z * cosAngle;
        
        this.target = this.position.add(new Vec3(newX, direction.y, newZ).normalize().multiply(distance));
        this.smoothTarget.copy(this.target);
    }

    rotateVertical(angle) {
        const direction = this.target.subtract(this.position);
        const horizontalDistance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        
        const currentVerticalAngle = Math.atan2(direction.y, horizontalDistance);
        const newVerticalAngle = MathUtils.clamp(
            currentVerticalAngle + angle,
            -Math.PI / 2 + 0.1,
            Math.PI / 2 - 0.1
        );
        
        const newY = horizontalDistance * Math.tan(newVerticalAngle);
        this.target.y = this.position.y + newY;
        this.smoothTarget.copy(this.target);
    }

    // Cinematic camera modes
    setCinematicMode(mode, vehicle) {
        switch (mode) {
            case 'follow':
                this.followDistance = 25;
                this.followHeight = 8;
                this.followLag = 0.1;
                break;
                
            case 'close':
                this.followDistance = 15;
                this.followHeight = 5;
                this.followLag = 0.05;
                break;
                
            case 'far':
                this.followDistance = 40;
                this.followHeight = 15;
                this.followLag = 0.15;
                break;
                
            case 'side':
                this.followDistance = 20;
                this.followHeight = 6;
                this.followLag = 0.1;
                // Add side offset
                break;
                
            case 'bird':
                this.followDistance = 5;
                this.followHeight = 50;
                this.followLag = 0.2;
                break;
        }
    }

    // Frustum culling support
    getFrustumPlanes() {
        const matrix = this.viewProjectionMatrix.elements;
        const planes = [];
        
        // Extract frustum planes from view-projection matrix
        // Left
        planes.push(this.normalizePlane([
            matrix[3] + matrix[0],
            matrix[7] + matrix[4],
            matrix[11] + matrix[8],
            matrix[15] + matrix[12]
        ]));
        
        // Right
        planes.push(this.normalizePlane([
            matrix[3] - matrix[0],
            matrix[7] - matrix[4],
            matrix[11] - matrix[8],
            matrix[15] - matrix[12]
        ]));
        
        // Top
        planes.push(this.normalizePlane([
            matrix[3] - matrix[1],
            matrix[7] - matrix[5],
            matrix[11] - matrix[9],
            matrix[15] - matrix[13]
        ]));
        
        // Bottom
        planes.push(this.normalizePlane([
            matrix[3] + matrix[1],
            matrix[7] + matrix[5],
            matrix[11] + matrix[9],
            matrix[15] + matrix[13]
        ]));
        
        // Near
        planes.push(this.normalizePlane([
            matrix[3] + matrix[2],
            matrix[7] + matrix[6],
            matrix[11] + matrix[10],
            matrix[15] + matrix[14]
        ]));
        
        // Far
        planes.push(this.normalizePlane([
            matrix[3] - matrix[2],
            matrix[7] - matrix[6],
            matrix[11] - matrix[10],
            matrix[15] - matrix[14]
        ]));
        
        return planes;
    }

    normalizePlane(plane) {
        const length = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
        return [
            plane[0] / length,
            plane[1] / length,
            plane[2] / length,
            plane[3] / length
        ];
    }

    isPointInFrustum(point, planes) {
        for (const plane of planes) {
            if (plane[0] * point.x + plane[1] * point.y + plane[2] * point.z + plane[3] <= 0) {
                return false;
            }
        }
        return true;
    }

    isSphereInFrustum(center, radius, planes) {
        for (const plane of planes) {
            const distance = plane[0] * center.x + plane[1] * center.y + plane[2] * center.z + plane[3];
            if (distance <= -radius) {
                return false;
            }
        }
        return true;
    }

    // Screen-to-world ray casting
    screenToWorldRay(screenX, screenY) {
        // Convert screen coordinates to normalized device coordinates
        const ndc = new Vec3(
            (screenX / this.canvas.width) * 2 - 1,
            -((screenY / this.canvas.height) * 2 - 1),
            -1
        );
        
        // Unproject to world space
        const invViewProjection = this.viewProjectionMatrix.inverse();
        const nearWorld = this.transformPoint(ndc, invViewProjection);
        
        ndc.z = 1;
        const farWorld = this.transformPoint(ndc, invViewProjection);
        
        const direction = farWorld.subtract(nearWorld).normalize();
        
        return {
            origin: nearWorld,
            direction: direction
        };
    }

    transformPoint(point, matrix) {
        const m = matrix.elements;
        const x = point.x, y = point.y, z = point.z;
        
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        
        return new Vec3(
            (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
            (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
            (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
        );
    }

    // Camera animation
    animateTo(targetPosition, targetLookAt, duration, easing = 'easeInOutCubic') {
        return new Promise((resolve) => {
            const startPosition = this.position.clone();
            const startTarget = this.target.clone();
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = MathUtils.ease[easing](progress);
                
                this.position = startPosition.lerp(targetPosition, easedProgress);
                this.target = startTarget.lerp(targetLookAt, easedProgress);
                
                this.smoothPosition.copy(this.position);
                this.smoothTarget.copy(this.target);
                
                this.updateMatrices();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    // Settings
    updateSettings(settings) {
        if (settings.followDistance !== undefined) {
            this.followDistance = settings.followDistance;
        }
        if (settings.followHeight !== undefined) {
            this.followHeight = settings.followHeight;
        }
        if (settings.followLag !== undefined) {
            this.followLag = settings.followLag;
        }
        if (settings.fov !== undefined) {
            this.baseFov = MathUtils.toRadians(settings.fov);
            this.fov = this.baseFov;
            this.updateProjectionMatrix();
        }
    }

    // Debug information
    getDebugInfo() {
        return {
            position: this.position.toArray(),
            target: this.target.toArray(),
            fov: MathUtils.toDegrees(this.fov),
            followDistance: this.followDistance,
            followHeight: this.followHeight,
            shakeIntensity: this.shakeIntensity
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Camera;
}
