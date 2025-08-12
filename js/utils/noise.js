/**
 * Noise generation utilities for procedural terrain
 * Implements Perlin and Simplex noise algorithms
 */

class NoiseGenerator {
    constructor(seed = 0) {
        this.seed = seed;
        this.gradients = this.generateGradients();
        this.permutation = this.generatePermutation();
    }

    generateGradients() {
        const gradients = [];
        for (let i = 0; i < 256; i++) {
            const angle = (i / 256) * 2 * Math.PI;
            gradients.push({
                x: Math.cos(angle),
                y: Math.sin(angle)
            });
        }
        return gradients;
    }

    generatePermutation() {
        const perm = [];
        for (let i = 0; i < 256; i++) {
            perm[i] = i;
        }
        
        // Shuffle using seed
        const random = this.seededRandom(this.seed);
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        
        // Duplicate for easier indexing
        for (let i = 0; i < 256; i++) {
            perm[256 + i] = perm[i];
        }
        
        return perm;
    }

    seededRandom(seed) {
        let state = seed;
        return function() {
            const x = Math.sin(state++) * 10000;
            return x - Math.floor(x);
        };
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    perlin2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const A = this.permutation[X] + Y;
        const AA = this.permutation[A];
        const AB = this.permutation[A + 1];
        const B = this.permutation[X + 1] + Y;
        const BA = this.permutation[B];
        const BB = this.permutation[B + 1];
        
        return this.lerp(
            this.lerp(
                this.grad(this.permutation[AA], x, y),
                this.grad(this.permutation[BA], x - 1, y),
                u
            ),
            this.lerp(
                this.grad(this.permutation[AB], x, y - 1),
                this.grad(this.permutation[BB], x - 1, y - 1),
                u
            ),
            v
        );
    }

    octaveNoise2D(x, y, octaves = 4, persistence = 0.5, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.perlin2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return value / maxValue;
    }

    ridgedNoise2D(x, y, octaves = 4, persistence = 0.5, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            let n = this.perlin2D(x * frequency, y * frequency);
            n = 1 - Math.abs(n);
            n = n * n;
            value += n * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return value / maxValue;
    }

    billow2D(x, y, octaves = 4, persistence = 0.5, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            let n = this.perlin2D(x * frequency, y * frequency);
            n = Math.abs(n);
            value += n * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return value / maxValue;
    }
}

class SimplexNoise {
    constructor(seed = 0) {
        this.seed = seed;
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(this.seededRandom(seed + i) * 256);
        }
        
        for (let i = 0; i < 512; i++) {
            this.perm = this.perm || [];
            this.perm[i] = this.p[i & 255];
            this.permMod12 = this.permMod12 || [];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }

    noise2D(xin, yin) {
        let n0, n1, n2;
        
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        
        let i1, j1;
        if (x0 > y0) {
            i1 = 1; j1 = 0;
        } else {
            i1 = 0; j1 = 1;
        }
        
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.permMod12[ii + this.perm[jj]];
        const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
        
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
            n0 = 0.0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
            n1 = 0.0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
            n2 = 0.0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }
        
        return 70.0 * (n0 + n1 + n2);
    }

    octave2D(x, y, octaves = 4, persistence = 0.5, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return value / maxValue;
    }
}

class BiomeNoise {
    constructor(seed = 0) {
        this.temperature = new NoiseGenerator(seed);
        this.humidity = new NoiseGenerator(seed + 1000);
        this.elevation = new NoiseGenerator(seed + 2000);
        this.density = new NoiseGenerator(seed + 3000);
    }

    getTemperature(x, y) {
        return this.temperature.octaveNoise2D(x * 0.001, y * 0.001, 3, 0.6);
    }

    getHumidity(x, y) {
        return this.humidity.octaveNoise2D(x * 0.0008, y * 0.0008, 3, 0.5);
    }

    getElevation(x, y) {
        const base = this.elevation.octaveNoise2D(x * 0.0005, y * 0.0005, 6, 0.7);
        const ridged = this.elevation.ridgedNoise2D(x * 0.002, y * 0.002, 4, 0.4);
        return base * 0.7 + ridged * 0.3;
    }

    getDensity(x, y) {
        return this.density.octaveNoise2D(x * 0.003, y * 0.003, 4, 0.5);
    }

    getBiome(x, y) {
        const temp = this.getTemperature(x, y);
        const humidity = this.getHumidity(x, y);
        const elevation = this.getElevation(x, y);

        // Biome determination based on temperature, humidity, and elevation
        if (elevation > 0.6) {
            return 'mountain';
        } else if (temp < -0.3) {
            return 'mountain'; // Snow-capped
        } else if (humidity < -0.3 && temp > 0.2) {
            return 'desert';
        } else if (humidity > 0.4 && temp > -0.1) {
            return 'forest';
        } else if (elevation < 0.1 && Math.abs(temp) < 0.3) {
            return 'city';
        } else {
            return 'plains';
        }
    }

    getBlendedHeight(x, y, biome) {
        const elevation = this.getElevation(x, y);
        
        switch (biome) {
            case 'mountain':
                return elevation * 200 + this.elevation.ridgedNoise2D(x * 0.005, y * 0.005, 3) * 100;
            case 'desert':
                return elevation * 50 + this.elevation.billow2D(x * 0.008, y * 0.008, 2) * 30;
            case 'forest':
                return elevation * 80 + this.elevation.octaveNoise2D(x * 0.01, y * 0.01, 2) * 20;
            case 'city':
                return Math.max(0, elevation * 20);
            default: // plains
                return elevation * 60 + this.elevation.octaveNoise2D(x * 0.003, y * 0.003, 3) * 15;
        }
    }
}

// Voronoi noise for feature placement
class VoronoiNoise {
    constructor(seed = 0) {
        this.seed = seed;
        this.random = this.seededRandom(seed);
    }

    seededRandom(seed) {
        let state = seed;
        return function() {
            const x = Math.sin(state++) * 10000;
            return x - Math.floor(x);
        };
    }

    getPoints(x, y, cellSize = 100) {
        const points = [];
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);

        // Check 3x3 grid around current cell
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const gx = gridX + dx;
                const gy = gridY + dy;
                
                // Generate consistent random point in this grid cell
                const seedX = this.seededRandom(this.seed + gx * 73856093 + gy * 19349663);
                const seedY = this.seededRandom(this.seed + gx * 73856093 + gy * 19349663 + 1);
                
                const px = gx * cellSize + seedX() * cellSize;
                const py = gy * cellSize + seedY() * cellSize;
                
                points.push({ x: px, y: py, gx, gy });
            }
        }

        return points;
    }

    getClosestPoint(x, y, cellSize = 100) {
        const points = this.getPoints(x, y, cellSize);
        let closest = null;
        let minDist = Infinity;

        for (const point of points) {
            const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                closest = point;
            }
        }

        return { point: closest, distance: minDist };
    }

    getCellValue(x, y, cellSize = 100) {
        const { point, distance } = this.getClosestPoint(x, y, cellSize);
        return distance / cellSize;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NoiseGenerator, SimplexNoise, BiomeNoise, VoronoiNoise };
}
