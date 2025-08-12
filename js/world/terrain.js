/**
 * Procedural terrain generation system for Zen Drive
 * Generates infinite, seamless terrain with multiple biomes and LOD
 */

class TerrainSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.gl = renderer.gl;
        
        // Terrain parameters
        this.chunkSize = 128;           // Vertices per chunk side
        this.chunkWorldSize = 500;      // World units per chunk
        this.renderDistance = 2000;     // Maximum render distance
        this.lodLevels = 4;             // Number of LOD levels
        this.heightScale = 100;         // Maximum terrain height
        
        // Chunk management
        this.chunks = new Map();        // Active chunks
        this.chunkPool = [];           // Pooled chunk objects
        this.loadedChunks = new Set();  // Currently loaded chunk keys
        this.visibleChunks = new Set(); // Currently visible chunk keys
        
        // Biome system
        this.biomeNoise = new BiomeNoise(12345);
        this.biomes = {
            plains: { id: 0, color: [0.4, 0.7, 0.2], roughness: 0.1 },
            forest: { id: 1, color: [0.2, 0.5, 0.1], roughness: 0.3 },
            desert: { id: 2, color: [0.8, 0.7, 0.4], roughness: 0.2 },
            mountain: { id: 3, color: [0.5, 0.5, 0.5], roughness: 0.8 },
            city: { id: 4, color: [0.3, 0.3, 0.3], roughness: 0.05 }
        };
        
        // Performance tracking
        this.stats = {
            chunksGenerated: 0,
            chunksVisible: 0,
            trianglesRendered: 0,
            generationTime: 0
        };
        
        // Generation settings
        this.settings = {
            wireframe: false,
            showChunkBounds: false,
            autoLOD: true,
            enableFrustumCulling: true,
            enableDistanceCulling: true
        };
        
        this.init();
    }

    init() {
        // Pre-generate some chunks around origin
        this.generateInitialChunks();
    }

    generateInitialChunks() {
        const initialRadius = 2;
        for (let x = -initialRadius; x <= initialRadius; x++) {
            for (let z = -initialRadius; z <= initialRadius; z++) {
                this.generateChunk(x, z, 0); // LOD 0 for initial chunks
            }
        }
    }

    update(cameraPosition, frustumPlanes) {
        const startTime = performance.now();
        
        // Determine which chunks should be loaded
        const requiredChunks = this.getRequiredChunks(cameraPosition);
        
        // Unload distant chunks
        this.unloadDistantChunks(cameraPosition, requiredChunks);
        
        // Load new chunks
        for (const { x, z, lod } of requiredChunks) {
            const key = this.getChunkKey(x, z);
            if (!this.loadedChunks.has(key)) {
                this.generateChunk(x, z, lod);
            }
        }
        
        // Update visibility and LOD
        this.updateVisibility(cameraPosition, frustumPlanes);
        
        // Update stats
        this.stats.generationTime = performance.now() - startTime;
        this.stats.chunksVisible = this.visibleChunks.size;
    }

    getRequiredChunks(cameraPosition) {
        const chunks = [];
        const camChunkX = Math.floor(cameraPosition.x / this.chunkWorldSize);
        const camChunkZ = Math.floor(cameraPosition.z / this.chunkWorldSize);
        
        const maxDistance = this.renderDistance / this.chunkWorldSize;
        
        for (let x = camChunkX - maxDistance; x <= camChunkX + maxDistance; x++) {
            for (let z = camChunkZ - maxDistance; z <= camChunkZ + maxDistance; z++) {
                const distance = Math.sqrt((x - camChunkX) ** 2 + (z - camChunkZ) ** 2);
                
                if (distance <= maxDistance) {
                    // Determine LOD based on distance
                    let lod = 0;
                    if (this.settings.autoLOD) {
                        lod = Math.min(
                            Math.floor(distance / (maxDistance / this.lodLevels)),
                            this.lodLevels - 1
                        );
                    }
                    
                    chunks.push({ x, z, lod, distance });
                }
            }
        }
        
        return chunks;
    }

    unloadDistantChunks(cameraPosition, requiredChunks) {
        const requiredKeys = new Set(requiredChunks.map(c => this.getChunkKey(c.x, c.z)));
        
        for (const key of this.loadedChunks) {
            if (!requiredKeys.has(key)) {
                this.unloadChunk(key);
            }
        }
    }

    updateVisibility(cameraPosition, frustumPlanes) {
        this.visibleChunks.clear();
        this.stats.trianglesRendered = 0;
        
        for (const [key, chunk] of this.chunks) {
            let visible = true;
            
            // Distance culling
            if (this.settings.enableDistanceCulling) {
                const chunkCenter = new Vec3(
                    chunk.worldX + this.chunkWorldSize / 2,
                    chunk.bounds.center.y,
                    chunk.worldZ + this.chunkWorldSize / 2
                );
                const distance = cameraPosition.distance(chunkCenter);
                
                if (distance > this.renderDistance) {
                    visible = false;
                }
            }
            
            // Frustum culling
            if (visible && this.settings.enableFrustumCulling && frustumPlanes) {
                const chunkBounds = chunk.bounds;
                visible = this.isChunkInFrustum(chunkBounds, frustumPlanes);
            }
            
            chunk.visible = visible;
            
            if (visible) {
                this.visibleChunks.add(key);
                this.stats.trianglesRendered += chunk.triangleCount || 0;
            }
        }
    }

    isChunkInFrustum(bounds, planes) {
        // Test bounding box against frustum planes
        const center = bounds.center;
        const extents = bounds.extents;
        
        for (const plane of planes) {
            const normal = new Vec3(plane[0], plane[1], plane[2]);
            const distance = plane[3];
            
            // Get the positive vertex (farthest in the direction of the normal)
            const positiveVertex = new Vec3(
                normal.x >= 0 ? center.x + extents.x : center.x - extents.x,
                normal.y >= 0 ? center.y + extents.y : center.y - extents.y,
                normal.z >= 0 ? center.z + extents.z : center.z - extents.z
            );
            
            // If the positive vertex is behind the plane, the box is outside
            if (normal.dot(positiveVertex) + distance < 0) {
                return false;
            }
        }
        
        return true;
    }

    generateChunk(chunkX, chunkZ, lod = 0) {
        const key = this.getChunkKey(chunkX, chunkZ);
        
        if (this.loadedChunks.has(key)) {
            return this.chunks.get(key);
        }
        
        const startTime = performance.now();
        
        // Get or create chunk object
        const chunk = this.getChunkFromPool();
        chunk.x = chunkX;
        chunk.z = chunkZ;
        chunk.lod = lod;
        chunk.worldX = chunkX * this.chunkWorldSize;
        chunk.worldZ = chunkZ * this.chunkWorldSize;
        chunk.key = key;
        
        // Generate geometry
        this.generateChunkGeometry(chunk);
        
        // Create GPU buffers
        this.createChunkBuffers(chunk);
        
        // Store chunk
        this.chunks.set(key, chunk);
        this.loadedChunks.add(key);
        
        this.stats.chunksGenerated++;
        console.log(`Generated chunk ${chunkX},${chunkZ} (LOD ${lod}) in ${(performance.now() - startTime).toFixed(2)}ms`);
        
        return chunk;
    }

    generateChunkGeometry(chunk) {
        const resolution = Math.max(8, this.chunkSize >> chunk.lod);
        const vertices = [];
        const indices = [];
        const normals = [];
        const texCoords = [];
        const biomeData = [];
        
        const worldX = chunk.worldX;
        const worldZ = chunk.worldZ;
        const step = this.chunkWorldSize / (resolution - 1);
        
        // Generate heightfield
        const heights = [];
        for (let z = 0; z < resolution; z++) {
            heights[z] = [];
            for (let x = 0; x < resolution; x++) {
                const worldPosX = worldX + x * step;
                const worldPosZ = worldZ + z * step;
                
                const biome = this.biomeNoise.getBiome(worldPosX, worldPosZ);
                const height = this.biomeNoise.getBlendedHeight(worldPosX, worldPosZ, biome);
                
                heights[z][x] = height;
            }
        }
        
        // Generate vertices
        let minY = Infinity, maxY = -Infinity;
        
        for (let z = 0; z < resolution; z++) {
            for (let x = 0; x < resolution; x++) {
                const worldPosX = worldX + x * step;
                const worldPosZ = worldZ + z * step;
                const height = heights[z][x];
                
                vertices.push(worldPosX, height, worldPosZ);
                
                // Calculate normal
                const normal = this.calculateNormal(heights, x, z, resolution, step);
                normals.push(normal.x, normal.y, normal.z);
                
                // Texture coordinates
                texCoords.push(x / (resolution - 1), z / (resolution - 1));
                
                // Biome data
                const biome = this.biomeNoise.getBiome(worldPosX, worldPosZ);
                const biomeId = this.biomes[biome] ? this.biomes[biome].id : 0;
                biomeData.push(biomeId);
                
                minY = Math.min(minY, height);
                maxY = Math.max(maxY, height);
            }
        }
        
        // Generate indices
        for (let z = 0; z < resolution - 1; z++) {
            for (let x = 0; x < resolution - 1; x++) {
                const topLeft = z * resolution + x;
                const topRight = topLeft + 1;
                const bottomLeft = (z + 1) * resolution + x;
                const bottomRight = bottomLeft + 1;
                
                // Two triangles per quad
                indices.push(topLeft, bottomLeft, topRight);
                indices.push(topRight, bottomLeft, bottomRight);
            }
        }
        
        // Combine vertex data (position, normal, texCoord, biome)
        const vertexData = new Float32Array(vertices.length / 3 * 9);
        for (let i = 0; i < vertices.length / 3; i++) {
            const offset = i * 9;
            vertexData[offset + 0] = vertices[i * 3 + 0];     // x
            vertexData[offset + 1] = vertices[i * 3 + 1];     // y
            vertexData[offset + 2] = vertices[i * 3 + 2];     // z
            vertexData[offset + 3] = normals[i * 3 + 0];      // nx
            vertexData[offset + 4] = normals[i * 3 + 1];      // ny
            vertexData[offset + 5] = normals[i * 3 + 2];      // nz
            vertexData[offset + 6] = texCoords[i * 2 + 0];    // u
            vertexData[offset + 7] = texCoords[i * 2 + 1];    // v
            vertexData[offset + 8] = biomeData[i];            // biome
        }
        
        chunk.vertices = vertexData;
        chunk.indices = new Uint16Array(indices);
        chunk.vertexCount = vertices.length / 3;
        chunk.indexCount = indices.length;
        chunk.triangleCount = indices.length / 3;
        
        // Calculate bounds
        chunk.bounds = {
            center: new Vec3(
                worldX + this.chunkWorldSize / 2,
                (minY + maxY) / 2,
                worldZ + this.chunkWorldSize / 2
            ),
            extents: new Vec3(
                this.chunkWorldSize / 2,
                (maxY - minY) / 2,
                this.chunkWorldSize / 2
            ),
            min: new Vec3(worldX, minY, worldZ),
            max: new Vec3(worldX + this.chunkWorldSize, maxY, worldZ + this.chunkWorldSize)
        };
        
        // Transform matrix
        chunk.transform = Mat4.create();
    }

    calculateNormal(heights, x, z, resolution, step) {
        // Get neighboring heights for normal calculation
        const getHeight = (hx, hz) => {
            hx = Math.max(0, Math.min(resolution - 1, hx));
            hz = Math.max(0, Math.min(resolution - 1, hz));
            return heights[hz][hx];
        };
        
        const left = getHeight(x - 1, z);
        const right = getHeight(x + 1, z);
        const up = getHeight(x, z - 1);
        const down = getHeight(x, z + 1);
        
        const normal = new Vec3(
            (left - right) / (2 * step),
            2,
            (up - down) / (2 * step)
        ).normalize();
        
        return normal;
    }

    createChunkBuffers(chunk) {
        const gl = this.gl;
        
        // Create vertex buffer
        chunk.buffers = {
            vertices: gl.createBuffer(),
            indices: gl.createBuffer()
        };
        
        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, chunk.buffers.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, chunk.vertices, gl.STATIC_DRAW);
        
        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunk.buffers.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, chunk.indices, gl.STATIC_DRAW);
    }

    unloadChunk(key) {
        const chunk = this.chunks.get(key);
        if (!chunk) return;
        
        // Delete GPU buffers
        if (chunk.buffers) {
            this.gl.deleteBuffer(chunk.buffers.vertices);
            this.gl.deleteBuffer(chunk.buffers.indices);
        }
        
        // Return to pool
        this.returnChunkToPool(chunk);
        
        // Remove from collections
        this.chunks.delete(key);
        this.loadedChunks.delete(key);
        this.visibleChunks.delete(key);
    }

    getChunkFromPool() {
        if (this.chunkPool.length > 0) {
            return this.chunkPool.pop();
        }
        
        return {
            x: 0, z: 0, lod: 0,
            worldX: 0, worldZ: 0,
            vertices: null, indices: null,
            buffers: null, transform: null,
            bounds: null, visible: false,
            vertexCount: 0, indexCount: 0, triangleCount: 0
        };
    }

    returnChunkToPool(chunk) {
        // Reset chunk data
        chunk.vertices = null;
        chunk.indices = null;
        chunk.buffers = null;
        chunk.visible = false;
        
        this.chunkPool.push(chunk);
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    // Get terrain height at world position
    getHeightAt(x, z) {
        const biome = this.biomeNoise.getBiome(x, z);
        return this.biomeNoise.getBlendedHeight(x, z, biome);
    }

    // Get biome at world position
    getBiomeAt(x, z) {
        return this.biomeNoise.getBiome(x, z);
    }

    // Raycast against terrain
    raycast(ray) {
        // Simple heightfield raycast
        const step = 1.0;
        const maxDistance = 1000;
        
        for (let t = 0; t < maxDistance; t += step) {
            const point = ray.origin.add(ray.direction.multiply(t));
            const terrainHeight = this.getHeightAt(point.x, point.z);
            
            if (point.y <= terrainHeight) {
                return {
                    hit: true,
                    point: new Vec3(point.x, terrainHeight, point.z),
                    distance: t,
                    normal: Vec3.up() // Simplified
                };
            }
        }
        
        return { hit: false };
    }

    // Debug rendering
    renderChunkBounds(renderer, camera) {
        if (!this.settings.showChunkBounds) return;
        
        // This would require a separate line rendering system
        // For now, just log visible chunks
        console.log(`Visible chunks: ${this.visibleChunks.size}`);
    }

    // Settings
    updateSettings(settings) {
        Object.assign(this.settings, settings);
        
        if (settings.chunkSize && settings.chunkSize !== this.chunkSize) {
            this.chunkSize = settings.chunkSize;
            this.regenerateAllChunks();
        }
    }

    regenerateAllChunks() {
        // Clear all chunks and regenerate
        for (const key of this.loadedChunks) {
            this.unloadChunk(key);
        }
        
        this.generateInitialChunks();
    }

    // Performance statistics
    getStats() {
        return {
            ...this.stats,
            loadedChunks: this.loadedChunks.size,
            pooledChunks: this.chunkPool.length
        };
    }

    // Cleanup
    destroy() {
        // Unload all chunks
        for (const key of this.loadedChunks) {
            this.unloadChunk(key);
        }
        
        this.chunks.clear();
        this.loadedChunks.clear();
        this.visibleChunks.clear();
        this.chunkPool = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerrainSystem;
}
