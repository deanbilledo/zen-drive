/**
 * Vehicle physics and rendering system for Zen Drive
 * Handles realistic car physics, controls, and visual representation
 */

class Vehicle {
    constructor(renderer) {
        this.renderer = renderer;
        this.gl = renderer.gl;
        
        // Transform
        this.position = new Vec3(0, 2, 0);
        this.rotation = new Vec3(0, 0, 0);  // Euler angles (pitch, yaw, roll)
        this.forward = new Vec3(0, 0, 1);
        this.right = new Vec3(1, 0, 0);
        this.up = new Vec3(0, 1, 0);
        this.transform = Mat4.create();
        
        // Physics
        this.velocity = new Vec3(0, 0, 0);
        this.angularVelocity = new Vec3(0, 0, 0);
        this.acceleration = new Vec3(0, 0, 0);
        
        // Vehicle properties
        this.mass = 1200;               // kg
        this.drag = 0.3;                // Air resistance coefficient
        this.rollingResistance = 0.02;  // Rolling resistance coefficient
        this.downforce = 0.1;           // Downforce coefficient
        
        // Engine
        this.engine = {
            power: 150,                 // kW
            maxRPM: 6000,
            idleRPM: 800,
            currentRPM: 800,
            torqueCurve: this.createTorqueCurve()
        };
        
        // Transmission
        this.transmission = {
            gears: [3.5, 2.1, 1.4, 1.0, 0.8],  // Gear ratios
            currentGear: 1,
            finalDrive: 3.9,
            shiftRPM: 5500,
            efficiency: 0.9
        };
        
        // Wheels and suspension
        this.wheels = [
            { position: new Vec3(-0.8, -0.5, 1.2), radius: 0.3, contact: false },  // Front left
            { position: new Vec3(0.8, -0.5, 1.2), radius: 0.3, contact: false },   // Front right
            { position: new Vec3(-0.8, -0.5, -1.2), radius: 0.3, contact: false }, // Rear left
            { position: new Vec3(0.8, -0.5, -1.2), radius: 0.3, contact: false }   // Rear right
        ];
        
        this.suspension = {
            stiffness: 35000,           // N/m
            damping: 4500,              // Ns/m
            restLength: 0.4,            // m
            maxCompression: 0.2,        // m
            maxExtension: 0.3           // m
        };
        
        // Tires
        this.tires = {
            gripForward: 1.8,           // Longitudinal grip coefficient
            gripSideways: 2.0,          // Lateral grip coefficient
            peakSlip: 0.15,             // Optimal slip ratio
            falloffRate: 0.7            // Grip falloff after peak
        };
        
        // Input state
        this.controls = {
            throttle: 0,    // -1 to 1
            steering: 0,    // -1 to 1
            brake: 0,       // 0 to 1
            handbrake: false
        };
        
        // Steering
        this.steering = {
            maxAngle: MathUtils.toRadians(35),  // Maximum steering angle
            returnSpeed: 3.0,                   // Steering return rate
            currentAngle: 0,                    // Current steering angle
            sensitivity: 1.0                    // Steering sensitivity
        };
        
        // Visual properties
        this.color = [0.8, 0.2, 0.2];       // Red color
        this.buffers = null;
        this.vertexCount = 0;
        this.indexCount = 0;
        
        // State tracking
        this.onGround = false;
        this.speed = 0;                      // m/s
        this.speedKPH = 0;                   // km/h
        this.speedMPH = 0;                   // mph
        this.wheelRotation = 0;              // Wheel rotation in radians
        
        // Collision
        this.boundingBox = {
            min: new Vec3(-0.9, -0.7, -2.0),
            max: new Vec3(0.9, 0.7, 2.0)
        };
        
        // Performance tracking
        this.stats = {
            topSpeed: 0,
            acceleration: 0,
            gForce: 0
        };
        
        this.init();
    }

    init() {
        this.createGeometry();
        this.updateTransform();
    }

    createGeometry() {
        // Simple car geometry - box with basic proportions
        const vertices = [];
        const indices = [];
        const normals = [];
        const texCoords = [];
        
        // Car body (simplified)
        const bodyVertices = [
            // Front face
            -0.8, -0.5,  2.0,   0.8, -0.5,  2.0,   0.8,  0.5,  2.0,  -0.8,  0.5,  2.0,
            // Back face
            -0.8, -0.5, -2.0,  -0.8,  0.5, -2.0,   0.8,  0.5, -2.0,   0.8, -0.5, -2.0,
            // Left face
            -0.8, -0.5, -2.0,  -0.8, -0.5,  2.0,  -0.8,  0.5,  2.0,  -0.8,  0.5, -2.0,
            // Right face
             0.8, -0.5,  2.0,   0.8, -0.5, -2.0,   0.8,  0.5, -2.0,   0.8,  0.5,  2.0,
            // Top face
            -0.8,  0.5,  2.0,   0.8,  0.5,  2.0,   0.8,  0.5, -2.0,  -0.8,  0.5, -2.0,
            // Bottom face
            -0.8, -0.5, -2.0,   0.8, -0.5, -2.0,   0.8, -0.5,  2.0,  -0.8, -0.5,  2.0
        ];
        
        vertices.push(...bodyVertices);
        
        // Generate normals for each face
        const faceNormals = [
            [0, 0, 1],   // Front
            [0, 0, -1],  // Back
            [-1, 0, 0],  // Left
            [1, 0, 0],   // Right
            [0, 1, 0],   // Top
            [0, -1, 0]   // Bottom
        ];
        
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 4; j++) {
                normals.push(...faceNormals[i]);
                texCoords.push(j % 2, Math.floor(j / 2));
            }
        }
        
        // Generate indices for box
        for (let i = 0; i < 6; i++) {
            const offset = i * 4;
            indices.push(
                offset, offset + 1, offset + 2,
                offset, offset + 2, offset + 3
            );
        }
        
        // Combine vertex data (position, normal, texCoord)
        const vertexData = new Float32Array(vertices.length / 3 * 8);
        for (let i = 0; i < vertices.length / 3; i++) {
            const offset = i * 8;
            vertexData[offset + 0] = vertices[i * 3 + 0];     // x
            vertexData[offset + 1] = vertices[i * 3 + 1];     // y
            vertexData[offset + 2] = vertices[i * 3 + 2];     // z
            vertexData[offset + 3] = normals[i * 3 + 0];      // nx
            vertexData[offset + 4] = normals[i * 3 + 1];      // ny
            vertexData[offset + 5] = normals[i * 3 + 2];      // nz
            vertexData[offset + 6] = texCoords[i * 2 + 0];    // u
            vertexData[offset + 7] = texCoords[i * 2 + 1];    // v
        }
        
        this.vertexCount = vertices.length / 3;
        this.indexCount = indices.length;
        
        // Create GPU buffers
        this.createBuffers(vertexData, new Uint16Array(indices));
    }

    createBuffers(vertices, indices) {
        const gl = this.gl;
        
        this.buffers = {
            vertices: gl.createBuffer(),
            indices: gl.createBuffer()
        };
        
        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }

    createTorqueCurve() {
        // Simplified torque curve - real cars have complex curves
        return (rpm) => {
            const normalizedRPM = rpm / this.engine.maxRPM;
            if (normalizedRPM < 0.2) {
                return 150 + normalizedRPM * 100; // Low-end torque
            } else if (normalizedRPM < 0.6) {
                return 200 + (normalizedRPM - 0.2) * 50; // Peak torque
            } else {
                return 220 - (normalizedRPM - 0.6) * 100; // High-end falloff
            }
        };
    }

    update(deltaTime, input, terrain, road) {
        // Update controls from input
        this.updateControls(input);
        
        // Physics simulation
        this.updatePhysics(deltaTime, terrain, road);
        
        // Update visual representation
        this.updateVisuals(deltaTime);
        
        // Update transform matrix
        this.updateTransform();
        
        // Update statistics
        this.updateStats();
    }

    updateControls(input) {
        if (!input) return;
        
        const controls = input.getVehicleControls();
        
        this.controls.throttle = controls.throttle;
        this.controls.brake = controls.brake;
        this.controls.handbrake = controls.handbrake;
        
        // Smooth steering input
        const targetSteering = controls.steering * this.steering.sensitivity;
        const steeringDiff = targetSteering - this.steering.currentAngle;
        this.steering.currentAngle += steeringDiff * 0.1; // Smooth steering
        
        // Apply steering limits
        this.steering.currentAngle = MathUtils.clamp(
            this.steering.currentAngle,
            -this.steering.maxAngle,
            this.steering.maxAngle
        );
        
        // Reset vehicle if requested
        if (controls.reset) {
            this.reset();
        }
    }

    updatePhysics(deltaTime, terrain, road) {
        const dt = Math.min(deltaTime, 1/30); // Cap delta time for stability
        
        // Ground detection
        this.updateGroundContact(terrain, road);
        
        if (this.onGround) {
            // Ground-based physics
            this.updateEngineAndTransmission(dt);
            this.updateTireForces(dt);
            this.updateSuspension(dt);
        } else {
            // Airborne physics
            this.velocity.y -= 9.81 * dt; // Gravity
        }
        
        // Apply air resistance
        this.applyAerodynamics(dt);
        
        // Integrate motion
        this.integrateMotion(dt);
        
        // Update derived values
        this.speed = this.velocity.length();
        this.speedKPH = this.speed * 3.6;
        this.speedMPH = this.speed * 2.237;
    }

    updateGroundContact(terrain, road) {
        this.onGround = false;
        const groundHeight = terrain ? terrain.getHeightAt(this.position.x, this.position.z) : 0;
        const roadHeight = road ? road.getRoadHeight(this.position.x, this.position.z) : null;
        
        // Use road height if on road, otherwise terrain height
        const surfaceHeight = roadHeight !== null ? roadHeight : groundHeight;
        
        // Check if any wheel is touching ground
        for (const wheel of this.wheels) {
            const worldWheelPos = this.transformPoint(wheel.position);
            const wheelGroundHeight = terrain ? terrain.getHeightAt(worldWheelPos.x, worldWheelPos.z) : 0;
            
            if (worldWheelPos.y - wheel.radius <= wheelGroundHeight + 0.1) {
                wheel.contact = true;
                this.onGround = true;
            } else {
                wheel.contact = false;
            }
        }
        
        // Prevent sinking through ground
        if (this.position.y < surfaceHeight + 0.5) {
            this.position.y = surfaceHeight + 0.5;
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
            }
        }
    }

    updateEngineAndTransmission(deltaTime) {
        // Calculate engine load based on throttle and current speed
        const wheelSpeed = this.speed; // Simplified - should calculate actual wheel speed
        const gearRatio = this.transmission.gears[this.transmission.currentGear - 1] * this.transmission.finalDrive;
        
        // Calculate target RPM based on wheel speed
        const wheelRPM = (wheelSpeed / (Math.PI * this.wheels[0].radius * 2)) * 60;
        const targetRPM = wheelRPM * gearRatio;
        
        // Update engine RPM with some lag
        const rpmDiff = targetRPM - this.engine.currentRPM;
        this.engine.currentRPM += rpmDiff * 0.1;
        this.engine.currentRPM = MathUtils.clamp(this.engine.currentRPM, this.engine.idleRPM, this.engine.maxRPM);
        
        // Simple automatic transmission
        if (this.engine.currentRPM > this.transmission.shiftRPM && this.transmission.currentGear < this.transmission.gears.length) {
            this.transmission.currentGear++;
        } else if (this.engine.currentRPM < this.engine.idleRPM + 500 && this.transmission.currentGear > 1) {
            this.transmission.currentGear--;
        }
    }

    updateTireForces(deltaTime) {
        try {
            // Calculate forces at each wheel
            let totalForce = new Vec3();
            let totalTorque = new Vec3();
            
            console.log('Starting updateTireForces - totalForce:', totalForce);
            
            for (let i = 0; i < this.wheels.length; i++) {
                const wheel = this.wheels[i];
                if (!wheel.contact) continue;
                
                const isFront = i < 2;
                const wheelWorldPos = this.transformPoint(wheel.position);
                
                // Calculate wheel velocity
                const wheelVel = this.velocity.add(this.angularVelocity.cross(wheel.position));
                
                // Steering angle (only front wheels)
                const steerAngle = isFront ? this.steering.currentAngle : 0;
            
            // Local wheel coordinate system
            const wheelForward = new Vec3(
                Math.sin(this.rotation.y + steerAngle),
                0,
                Math.cos(this.rotation.y + steerAngle)
            );
            const wheelRight = new Vec3(
                Math.cos(this.rotation.y + steerAngle),
                0,
                -Math.sin(this.rotation.y + steerAngle)
            );
            
            // Decompose velocity into forward and sideways components
            const forwardVel = wheelVel.dot(wheelForward);
            const sidewaysVel = wheelVel.dot(wheelRight);
            
            // Calculate slip ratios
            const wheelRadius = wheel.radius;
            const wheelAngularVel = this.wheelRotation / deltaTime; // Simplified
            const wheelLinearVel = wheelAngularVel * wheelRadius;
            
            const longitudinalSlip = Math.abs(forwardVel) > 0.1 ? 
                (wheelLinearVel - forwardVel) / Math.abs(forwardVel) : 0;
            const lateralSlip = Math.abs(forwardVel) > 0.1 ? 
                Math.atan2(sidewaysVel, Math.abs(forwardVel)) : 0;
            
            // Calculate tire forces using simplified Pacejka model
            const longitudinalForce = this.calculateTireForce(longitudinalSlip, this.tires.gripForward);
            const lateralForce = this.calculateTireForce(lateralSlip, this.tires.gripSideways);
            
            // Apply driving/braking force
            let drivingForce = 0;
            if (this.controls.throttle > 0) {
                // Engine torque
                const engineTorque = this.engine.torqueCurve(this.engine.currentRPM);
                const gearRatio = this.transmission.gears[this.transmission.currentGear - 1] * this.transmission.finalDrive;
                drivingForce = (engineTorque * gearRatio * this.controls.throttle * this.transmission.efficiency) / wheelRadius;
            } else if (this.controls.throttle < 0) {
                // Reverse
                drivingForce = -5000 * Math.abs(this.controls.throttle);
            }
            
            // Apply braking force
            let brakingForce = 0;
            if (this.controls.brake > 0 || this.controls.handbrake) {
                const maxBrakeForce = this.controls.handbrake ? 8000 : 12000;
                brakingForce = maxBrakeForce * this.controls.brake;
                
                // Apply braking in opposite direction of motion
                if (forwardVel > 0) {
                    brakingForce = -brakingForce;
                } else if (forwardVel < 0) {
                    brakingForce = Math.abs(brakingForce);
                }
            }
            
            // Combine forces
            const totalLongitudinalForce = drivingForce + brakingForce + longitudinalForce;
            
            // Convert forces to world space
            const worldLongitudinalForce = wheelForward.multiply(totalLongitudinalForce);
            const worldLateralForce = wheelRight.multiply(lateralForce);
            const wheelForce = worldLongitudinalForce.add(worldLateralForce);
            
            // Accumulate forces and torques
            totalForce = totalForce.add(wheelForce);
            
            // Calculate torque around center of mass
            const relativePos = wheel.position;
            const wheelTorque = relativePos.cross(wheelForce);
            totalTorque = totalTorque.add(wheelTorque);
        }
        
        // Apply forces
        this.acceleration = totalForce.divide(this.mass);
        this.angularVelocity = this.angularVelocity.add(totalTorque.divide(this.mass * 0.5)); // Simplified inertia
        
        // Apply some damping to angular velocity
        this.angularVelocity = this.angularVelocity.multiply(0.98);
        
        } catch (error) {
            console.error('Error in updateTireForces:', error);
            console.error('Stack:', error.stack);
        }
    }

    calculateTireForce(slip, maxGrip) {
        // Simplified tire model
        const normalForce = this.mass * 9.81 / 4; // Weight per wheel
        const peakForce = maxGrip * normalForce;
        
        if (Math.abs(slip) <= this.tires.peakSlip) {
            // Linear region
            return -(slip / this.tires.peakSlip) * peakForce;
        } else {
            // Sliding region with falloff
            const slideForce = peakForce * this.tires.falloffRate;
            return slip > 0 ? -slideForce : slideForce;
        }
    }

    updateSuspension(deltaTime) {
        // Simple suspension simulation
        for (const wheel of this.wheels) {
            if (!wheel.contact) continue;
            
            const worldWheelPos = this.transformPoint(wheel.position);
            const groundHeight = 0; // Simplified - should get actual ground height
            
            let compression = this.suspension.restLength - (worldWheelPos.y - groundHeight);
            compression = MathUtils.clamp(compression, -this.suspension.maxExtension, this.suspension.maxCompression);
            
            const springForce = compression * this.suspension.stiffness;
            const dampingForce = -this.velocity.y * this.suspension.damping;
            
            const suspensionForce = springForce + dampingForce;
            
            // Apply suspension force
            this.acceleration.y += suspensionForce / this.mass;
        }
    }

    applyAerodynamics(deltaTime) {
        const airDensity = 1.225; // kg/m³
        const frontalArea = 2.5; // m²
        const velocitySquared = this.velocity.lengthSquared();
        
        if (velocitySquared > 0.1) {
            // Air resistance
            const dragForce = 0.5 * airDensity * this.drag * frontalArea * velocitySquared;
            const dragDirection = this.velocity.normalize().multiply(-1);
            this.acceleration = this.acceleration.add(dragDirection.multiply(dragForce / this.mass));
            
            // Downforce
            const downforceAmount = 0.5 * airDensity * this.downforce * frontalArea * velocitySquared;
            this.acceleration.y -= downforceAmount / this.mass;
        }
        
        // Rolling resistance
        if (this.onGround) {
            const rollingForce = this.mass * 9.81 * this.rollingResistance;
            const rollingDirection = this.velocity.normalize().multiply(-1);
            this.acceleration = this.acceleration.add(rollingDirection.multiply(rollingForce / this.mass));
        }
    }

    integrateMotion(deltaTime) {
        // Linear motion
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        
        // Angular motion
        this.rotation.y += this.angularVelocity.y * deltaTime;
        this.rotation.x += this.angularVelocity.x * deltaTime;
        this.rotation.z += this.angularVelocity.z * deltaTime;
        
        // Update orientation vectors
        this.updateOrientationVectors();
        
        // Update wheel rotation
        const wheelSpeed = this.forward.dot(this.velocity);
        this.wheelRotation += (wheelSpeed / this.wheels[0].radius) * deltaTime;
    }

    updateOrientationVectors() {
        const yaw = this.rotation.y;
        const pitch = this.rotation.x;
        const roll = this.rotation.z;
        
        this.forward = new Vec3(
            Math.sin(yaw) * Math.cos(pitch),
            -Math.sin(pitch),
            Math.cos(yaw) * Math.cos(pitch)
        ).normalize();
        
        this.right = new Vec3(
            Math.cos(yaw),
            0,
            -Math.sin(yaw)
        ).normalize();
        
        this.up = this.right.cross(this.forward).normalize();
    }

    updateVisuals(deltaTime) {
        // Update visual effects based on speed, etc.
        // This could include particle effects, sound, etc.
    }

    updateTransform() {
        // Create transformation matrix
        this.transform = Mat4.create()
            .translate(this.position.x, this.position.y, this.position.z)
            .rotateY(this.rotation.y)
            .rotateX(this.rotation.x)
            .rotateZ(this.rotation.z);
    }

    updateStats() {
        this.stats.topSpeed = Math.max(this.stats.topSpeed, this.speedKPH);
        
        // Calculate acceleration (simplified)
        this.stats.acceleration = this.acceleration.length();
        
        // Calculate G-force
        this.stats.gForce = this.acceleration.length() / 9.81;
    }

    transformPoint(localPoint) {
        // Transform a point from local to world space
        const transformed = this.transform.multiply(new Mat4().translate(localPoint.x, localPoint.y, localPoint.z));
        return new Vec3(transformed.elements[12], transformed.elements[13], transformed.elements[14]);
    }

    reset() {
        // Reset vehicle to starting position and state
        this.position = new Vec3(0, 2, 0);
        this.rotation = new Vec3(0, 0, 0);
        this.velocity = new Vec3(0, 0, 0);
        this.angularVelocity = new Vec3(0, 0, 0);
        this.acceleration = new Vec3(0, 0, 0);
        this.engine.currentRPM = this.engine.idleRPM;
        this.transmission.currentGear = 1;
        this.wheelRotation = 0;
        
        this.updateOrientationVectors();
        this.updateTransform();
    }

    // Get current input for UI display
    get turnInput() {
        return this.steering.currentAngle / this.steering.maxAngle;
    }

    // Performance data
    getPerformanceData() {
        return {
            speed: this.speed,
            speedKPH: this.speedKPH,
            speedMPH: this.speedMPH,
            rpm: this.engine.currentRPM,
            gear: this.transmission.currentGear,
            throttle: this.controls.throttle,
            brake: this.controls.brake,
            steering: this.turnInput,
            onGround: this.onGround
        };
    }

    // Debug information
    getDebugInfo() {
        return {
            position: this.position.toArray(),
            velocity: this.velocity.toArray(),
            speed: this.speedKPH.toFixed(1) + ' km/h',
            rpm: this.engine.currentRPM.toFixed(0),
            gear: this.transmission.currentGear,
            onGround: this.onGround,
            wheelContacts: this.wheels.map(w => w.contact)
        };
    }

    // Cleanup
    destroy() {
        if (this.buffers) {
            this.gl.deleteBuffer(this.buffers.vertices);
            this.gl.deleteBuffer(this.buffers.indices);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Vehicle;
}
