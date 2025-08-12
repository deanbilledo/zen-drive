/**
 * Road generation system for Zen Drive
 * Creates smooth, winding roads that follow terrain naturally
 */

class RoadSystem {
    constructor(renderer, terrain) {
        this.renderer = renderer;
        this.terrain = terrain;
        this.gl = renderer.gl;
        
        // Road parameters
        this.roadWidth = 8;             // Width of the road
        this.segmentLength = 50;        // Length of each road segment
        this.generationDistance = 1000;  // How far ahead to generate
        this.maxSegments = 100;         // Maximum number of segments to keep
        
        // Road geometry
        this.segments = [];             // Active road segments
        this.path = [];                 // Center path points
        this.spline = null;            // Smooth spline through path
        
        // Road generation state
        this.lastGeneratedPosition = new Vec3(0, 0, 0);
        this.currentDirection = new Vec3(0, 0, 1);
        this.roadSeed = 54321;
        
        // Curve parameters
        this.curviness = 0.3;           // How much the road curves
        this.terrainFollowing = 0.8;    // How much road follows terrain
        this.bankingAmount = 0.2;       // Road banking on curves
        
        // Visual properties
        this.roadTexture = null;
        this.shoulderWidth = 1;         // Width of road shoulders
        
        // Performance
        this.visible = true;
        this.stats = {
            segmentsGenerated: 0,
            segmentsVisible: 0
        };
        
        this.init();
    }

    init() {
        // Generate initial road segments
        this.generateInitialRoad();
        
        // Create road texture (placeholder)
        this.createRoadTexture();
    }

    generateInitialRoad() {
        // Start at origin
        const startPosition = new Vec3(0, 0, 0);
        this.path.push(startPosition);
        this.lastGeneratedPosition = startPosition.clone();
        
        // Generate initial segments
        this.extendRoad(this.generationDistance);
    }

    update(vehiclePosition) {
        // Check if we need to generate more road ahead
        const distanceToEnd = this.lastGeneratedPosition.distance(vehiclePosition);
        
        if (distanceToEnd < this.generationDistance * 0.5) {
            this.extendRoad(this.generationDistance * 0.5);
        }
        
        // Remove old segments that are too far behind
        this.cullOldSegments(vehiclePosition);
        
        // Update segment visibility
        this.updateVisibility(vehiclePosition);
    }

    extendRoad(distance) {
        const noise = new NoiseGenerator(this.roadSeed);
        let currentPos = this.lastGeneratedPosition.clone();
        let currentDir = this.currentDirection.clone();
        let generatedDistance = 0;
        
        while (generatedDistance < distance) {
            // Calculate next position
            const segmentProgress = this.path.length * 0.01;
            
            // Add some randomness to direction
            const noiseValue = noise.octaveNoise2D(
                segmentProgress,
                segmentProgress * 0.7,
                3,
                0.6,
                0.5
            );
            
            // Calculate turn angle based on noise and curviness
            const turnAngle = noiseValue * this.curviness * 0.5;
            currentDir = this.rotateVector(currentDir, turnAngle);
            
            // Move forward
            const nextPos = currentPos.add(currentDir.multiply(this.segmentLength));
            
            // Adjust height based on terrain
            const terrainHeight = this.terrain.getHeightAt(nextPos.x, nextPos.z);
            nextPos.y = MathUtils.lerp(nextPos.y, terrainHeight + 1, this.terrainFollowing);
            
            // Add to path
            this.path.push(nextPos);
            
            // Update state
            currentPos = nextPos;
            generatedDistance += this.segmentLength;
        }
        
        this.lastGeneratedPosition = currentPos;
        this.currentDirection = currentDir;
        
        // Regenerate spline and segments
        this.updateSpline();
        this.generateSegments();
    }

    rotateVector(vector, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vec3(
            vector.x * cos - vector.z * sin,
            vector.y,
            vector.x * sin + vector.z * cos
        );
    }

    updateSpline() {
        // Create smooth spline through path points
        this.spline = new CatmullRomSpline(this.path);
    }

    generateSegments() {
        // Clear existing segments
        this.clearSegments();
        
        if (!this.spline || this.path.length < 4) return;
        
        const resolution = 10; // Points per segment
        const totalPoints = this.path.length * resolution;
        
        for (let i = 0; i < totalPoints - resolution; i += resolution) {
            const segment = this.generateSegment(i / totalPoints, (i + resolution) / totalPoints);
            if (segment) {
                this.segments.push(segment);
            }
        }
        
        this.stats.segmentsGenerated = this.segments.length;
    }

    generateSegment(startT, endT) {
        const points = [];
        const resolution = 20; // Vertices along segment
        
        // Generate points along spline
        for (let i = 0; i <= resolution; i++) {
            const t = MathUtils.lerp(startT, endT, i / resolution);
            const position = this.spline.getPoint(t);
            const tangent = this.spline.getTangent(t);
            
            points.push({ position, tangent, t });
        }
        
        // Generate road mesh
        const vertices = [];
        const indices = [];
        const normals = [];
        const texCoords = [];
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const { position, tangent } = point;
            
            // Calculate road normal (up vector)
            const up = new Vec3(0, 1, 0);
            const right = tangent.cross(up).normalize();
            const roadUp = right.cross(tangent).normalize();
            
            // Calculate banking based on curvature
            let banking = 0;
            if (i > 0 && i < points.length - 1) {
                const prevTangent = points[i - 1].tangent;
                const nextTangent = points[i + 1].tangent;
                const curvature = this.calculateCurvature(prevTangent, tangent, nextTangent);
                banking = curvature * this.bankingAmount;
            }
            
            // Apply banking to road normal
            const bankedRight = right.multiply(Math.cos(banking)).add(roadUp.multiply(Math.sin(banking)));
            const bankedUp = roadUp.multiply(Math.cos(banking)).subtract(right.multiply(Math.sin(banking)));
            
            // Generate road strip vertices
            const halfWidth = this.roadWidth * 0.5;
            const shoulderOffset = this.shoulderWidth;
            
            // Left shoulder
            const leftShoulderPos = position.add(bankedRight.multiply(-(halfWidth + shoulderOffset)));
            vertices.push(leftShoulderPos.x, leftShoulderPos.y, leftShoulderPos.z);
            normals.push(bankedUp.x, bankedUp.y, bankedUp.z);
            texCoords.push(0, i / (points.length - 1));
            
            // Left edge
            const leftEdgePos = position.add(bankedRight.multiply(-halfWidth));
            vertices.push(leftEdgePos.x, leftEdgePos.y, leftEdgePos.z);
            normals.push(bankedUp.x, bankedUp.y, bankedUp.z);
            texCoords.push(0.2, i / (points.length - 1));
            
            // Center
            vertices.push(position.x, position.y, position.z);
            normals.push(bankedUp.x, bankedUp.y, bankedUp.z);
            texCoords.push(0.5, i / (points.length - 1));
            
            // Right edge
            const rightEdgePos = position.add(bankedRight.multiply(halfWidth));
            vertices.push(rightEdgePos.x, rightEdgePos.y, rightEdgePos.z);
            normals.push(bankedUp.x, bankedUp.y, bankedUp.z);
            texCoords.push(0.8, i / (points.length - 1));
            
            // Right shoulder
            const rightShoulderPos = position.add(bankedRight.multiply(halfWidth + shoulderOffset));
            vertices.push(rightShoulderPos.x, rightShoulderPos.y, rightShoulderPos.z);
            normals.push(bankedUp.x, bankedUp.y, bankedUp.z);
            texCoords.push(1, i / (points.length - 1));
        }
        
        // Generate indices for road strip
        const vertsPerCross = 5; // 5 vertices per cross-section
        for (let i = 0; i < points.length - 1; i++) {
            for (let j = 0; j < vertsPerCross - 1; j++) {
                const idx = i * vertsPerCross + j;
                
                // Two triangles per quad
                indices.push(idx, idx + vertsPerCross, idx + 1);
                indices.push(idx + 1, idx + vertsPerCross, idx + vertsPerCross + 1);
            }
        }
        
        // Combine vertex data
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
        
        const segment = {
            vertices: vertexData,
            indices: new Uint16Array(indices),
            vertexCount: vertices.length / 3,
            indexCount: indices.length,
            buffers: null,
            transform: Mat4.create(),
            visible: true,
            bounds: this.calculateSegmentBounds(vertices),
            startT: startT,
            endT: endT
        };
        
        // Create GPU buffers
        this.createSegmentBuffers(segment);
        
        return segment;
    }

    calculateCurvature(prevTangent, currentTangent, nextTangent) {
        // Simplified curvature calculation
        const angle1 = Math.atan2(currentTangent.z, currentTangent.x) - Math.atan2(prevTangent.z, prevTangent.x);
        const angle2 = Math.atan2(nextTangent.z, nextTangent.x) - Math.atan2(currentTangent.z, currentTangent.x);
        
        return (angle1 + angle2) * 0.5;
    }

    calculateSegmentBounds(vertices) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (let i = 0; i < vertices.length; i += 3) {
            minX = Math.min(minX, vertices[i]);
            maxX = Math.max(maxX, vertices[i]);
            minY = Math.min(minY, vertices[i + 1]);
            maxY = Math.max(maxY, vertices[i + 1]);
            minZ = Math.min(minZ, vertices[i + 2]);
            maxZ = Math.max(maxZ, vertices[i + 2]);
        }
        
        return {
            center: new Vec3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2),
            extents: new Vec3((maxX - minX) / 2, (maxY - minY) / 2, (maxZ - minZ) / 2),
            min: new Vec3(minX, minY, minZ),
            max: new Vec3(maxX, maxY, maxZ)
        };
    }

    createSegmentBuffers(segment) {
        const gl = this.gl;
        
        segment.buffers = {
            vertices: gl.createBuffer(),
            indices: gl.createBuffer()
        };
        
        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, segment.buffers.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, segment.vertices, gl.STATIC_DRAW);
        
        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, segment.buffers.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, segment.indices, gl.STATIC_DRAW);
    }

    createRoadTexture() {
        // For now, create a simple procedural road texture
        const gl = this.gl;
        const width = 256;
        const height = 256;
        const data = new Uint8Array(width * height * 4);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Create road markings
                const centerLine = Math.abs(x - width/2) < 2;
                const isAsphalt = !centerLine;
                
                if (isAsphalt) {
                    // Dark asphalt
                    data[idx] = 40;     // R
                    data[idx + 1] = 40; // G
                    data[idx + 2] = 40; // B
                    data[idx + 3] = 255; // A
                } else {
                    // Yellow center line
                    data[idx] = 255;    // R
                    data[idx + 1] = 255; // G
                    data[idx + 2] = 0;   // B
                    data[idx + 3] = 255; // A
                }
            }
        }
        
        this.roadTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.roadTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }

    cullOldSegments(vehiclePosition) {
        const maxDistance = this.generationDistance * 2;
        
        this.segments = this.segments.filter(segment => {
            const distance = vehiclePosition.distance(segment.bounds.center);
            
            if (distance > maxDistance) {
                // Delete GPU buffers
                if (segment.buffers) {
                    this.gl.deleteBuffer(segment.buffers.vertices);
                    this.gl.deleteBuffer(segment.buffers.indices);
                }
                return false;
            }
            
            return true;
        });
    }

    updateVisibility(vehiclePosition) {
        this.stats.segmentsVisible = 0;
        
        for (const segment of this.segments) {
            const distance = vehiclePosition.distance(segment.bounds.center);
            segment.visible = distance < this.generationDistance;
            
            if (segment.visible) {
                this.stats.segmentsVisible++;
            }
        }
    }

    clearSegments() {
        for (const segment of this.segments) {
            if (segment.buffers) {
                this.gl.deleteBuffer(segment.buffers.vertices);
                this.gl.deleteBuffer(segment.buffers.indices);
            }
        }
        this.segments = [];
    }

    // Get road position and direction at world coordinates
    getRoadInfo(worldPos) {
        if (!this.spline) return null;
        
        // Find closest point on road
        let closestT = 0;
        let closestDistance = Infinity;
        
        const samples = 100;
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const point = this.spline.getPoint(t);
            const distance = worldPos.distance(point);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestT = t;
            }
        }
        
        // Refine search around closest point
        const refinement = 0.01;
        for (let i = -10; i <= 10; i++) {
            const t = Math.max(0, Math.min(1, closestT + i * refinement));
            const point = this.spline.getPoint(t);
            const distance = worldPos.distance(point);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestT = t;
            }
        }
        
        return {
            position: this.spline.getPoint(closestT),
            direction: this.spline.getTangent(closestT),
            distance: closestDistance,
            t: closestT
        };
    }

    // Check if position is on road
    isOnRoad(worldPos, tolerance = this.roadWidth) {
        const roadInfo = this.getRoadInfo(worldPos);
        return roadInfo && roadInfo.distance <= tolerance;
    }

    // Get road height at position
    getRoadHeight(x, z) {
        const worldPos = new Vec3(x, 0, z);
        const roadInfo = this.getRoadInfo(worldPos);
        
        if (roadInfo && roadInfo.distance <= this.roadWidth) {
            return roadInfo.position.y;
        }
        
        return null;
    }

    // Settings
    updateSettings(settings) {
        if (settings.roadWidth !== undefined) {
            this.roadWidth = settings.roadWidth;
            this.regenerateSegments();
        }
        
        if (settings.curviness !== undefined) {
            this.curviness = settings.curviness;
        }
        
        if (settings.terrainFollowing !== undefined) {
            this.terrainFollowing = settings.terrainFollowing;
        }
    }

    regenerateSegments() {
        this.clearSegments();
        this.generateSegments();
    }

    // Statistics
    getStats() {
        return {
            ...this.stats,
            totalSegments: this.segments.length,
            pathPoints: this.path.length
        };
    }

    // Cleanup
    destroy() {
        this.clearSegments();
        
        if (this.roadTexture) {
            this.gl.deleteTexture(this.roadTexture);
        }
    }
}

// Catmull-Rom spline for smooth road curves
class CatmullRomSpline {
    constructor(points) {
        this.points = points;
    }

    getPoint(t) {
        if (this.points.length < 2) return this.points[0] || Vec3.zero();
        
        const segmentCount = this.points.length - 1;
        const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
        const localT = (t * segmentCount) - segment;
        
        return this.getSegmentPoint(segment, localT);
    }

    getSegmentPoint(segment, t) {
        const p0 = this.points[Math.max(0, segment - 1)];
        const p1 = this.points[segment];
        const p2 = this.points[segment + 1];
        const p3 = this.points[Math.min(this.points.length - 1, segment + 2)];
        
        const t2 = t * t;
        const t3 = t2 * t;
        
        const result = new Vec3();
        
        // Catmull-Rom formula
        result.x = 0.5 * ((2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
            
        result.y = 0.5 * ((2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
            
        result.z = 0.5 * ((2 * p1.z) +
            (-p0.z + p2.z) * t +
            (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
            (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
        
        return result;
    }

    getTangent(t) {
        if (this.points.length < 2) return Vec3.forward();
        
        const segmentCount = this.points.length - 1;
        const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
        const localT = (t * segmentCount) - segment;
        
        return this.getSegmentTangent(segment, localT);
    }

    getSegmentTangent(segment, t) {
        const p0 = this.points[Math.max(0, segment - 1)];
        const p1 = this.points[segment];
        const p2 = this.points[segment + 1];
        const p3 = this.points[Math.min(this.points.length - 1, segment + 2)];
        
        const t2 = t * t;
        
        const result = new Vec3();
        
        // Derivative of Catmull-Rom
        result.x = 0.5 * ((-p0.x + p2.x) +
            2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t +
            3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2);
            
        result.y = 0.5 * ((-p0.y + p2.y) +
            2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t +
            3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t2);
            
        result.z = 0.5 * ((-p0.z + p2.z) +
            2 * (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t +
            3 * (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t2);
        
        return result.normalize();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoadSystem, CatmullRomSpline };
}
