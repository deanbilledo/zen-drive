/**
 * Math utilities for 3D graphics and game calculations
 */

class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static create(x, y, z) {
        return new Vec3(x, y, z);
    }

    static zero() {
        return new Vec3(0, 0, 0);
    }

    static one() {
        return new Vec3(1, 1, 1);
    }

    static up() {
        return new Vec3(0, 1, 0);
    }

    static forward() {
        return new Vec3(0, 0, 1);
    }

    static right() {
        return new Vec3(1, 0, 0);
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(other) {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
        return this;
    }

    add(other) {
        return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    subtract(other) {
        return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    multiply(scalar) {
        return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    divide(scalar) {
        return new Vec3(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    dot(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    cross(other) {
        return new Vec3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    lengthSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    normalize() {
        const len = this.length();
        if (len > 0) {
            return this.divide(len);
        }
        return Vec3.zero();
    }

    distance(other) {
        return this.subtract(other).length();
    }

    distanceSquared(other) {
        return this.subtract(other).lengthSquared();
    }

    lerp(other, t) {
        return new Vec3(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t,
            this.z + (other.z - this.z) * t
        );
    }

    toArray() {
        return [this.x, this.y, this.z];
    }
}

class Mat4 {
    constructor() {
        this.elements = new Float32Array(16);
        this.identity();
    }

    static create() {
        return new Mat4();
    }

    identity() {
        const e = this.elements;
        e[0] = 1; e[4] = 0; e[8] = 0; e[12] = 0;
        e[1] = 0; e[5] = 1; e[9] = 0; e[13] = 0;
        e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
        e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
        return this;
    }

    copy(other) {
        for (let i = 0; i < 16; i++) {
            this.elements[i] = other.elements[i];
        }
        return this;
    }

    clone() {
        const result = new Mat4();
        return result.copy(this);
    }

    multiply(other) {
        const a = this.elements;
        const b = other.elements;
        const result = new Mat4();
        const c = result.elements;

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                c[i * 4 + j] = 
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }

        return result;
    }

    translate(x, y, z) {
        const translation = Mat4.translation(x, y, z);
        return this.multiply(translation);
    }

    rotateX(angle) {
        const rotation = Mat4.rotationX(angle);
        return this.multiply(rotation);
    }

    rotateY(angle) {
        const rotation = Mat4.rotationY(angle);
        return this.multiply(rotation);
    }

    rotateZ(angle) {
        const rotation = Mat4.rotationZ(angle);
        return this.multiply(rotation);
    }

    scale(x, y, z) {
        const scaling = Mat4.scaling(x, y, z);
        return this.multiply(scaling);
    }

    static translation(x, y, z) {
        const result = new Mat4();
        result.elements[12] = x;
        result.elements[13] = y;
        result.elements[14] = z;
        return result;
    }

    static rotationX(angle) {
        const result = new Mat4();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const e = result.elements;

        e[5] = c; e[9] = -s;
        e[6] = s; e[10] = c;
        return result;
    }

    static rotationY(angle) {
        const result = new Mat4();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const e = result.elements;

        e[0] = c; e[8] = s;
        e[2] = -s; e[10] = c;
        return result;
    }

    static rotationZ(angle) {
        const result = new Mat4();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const e = result.elements;

        e[0] = c; e[4] = -s;
        e[1] = s; e[5] = c;
        return result;
    }

    static scaling(x, y, z) {
        const result = new Mat4();
        result.elements[0] = x;
        result.elements[5] = y;
        result.elements[10] = z;
        return result;
    }

    static perspective(fov, aspect, near, far) {
        const result = new Mat4();
        const f = 1.0 / Math.tan(fov / 2);
        const rangeInv = 1 / (near - far);
        const e = result.elements;

        e[0] = f / aspect; e[1] = 0; e[2] = 0; e[3] = 0;
        e[4] = 0; e[5] = f; e[6] = 0; e[7] = 0;
        e[8] = 0; e[9] = 0; e[10] = (near + far) * rangeInv; e[11] = -1;
        e[12] = 0; e[13] = 0; e[14] = near * far * rangeInv * 2; e[15] = 0;

        return result;
    }

    static lookAt(eye, target, up) {
        const f = target.subtract(eye).normalize();
        const s = f.cross(up).normalize();
        const u = s.cross(f);

        const result = new Mat4();
        const e = result.elements;

        e[0] = s.x; e[4] = s.y; e[8] = s.z; e[12] = -s.dot(eye);
        e[1] = u.x; e[5] = u.y; e[9] = u.z; e[13] = -u.dot(eye);
        e[2] = -f.x; e[6] = -f.y; e[10] = -f.z; e[14] = f.dot(eye);
        e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;

        return result;
    }

    inverse() {
        const a = this.elements;
        const result = new Mat4();
        const b = result.elements;

        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        const b00 = a00 * a11 - a01 * a10;
        const b01 = a00 * a12 - a02 * a10;
        const b02 = a00 * a13 - a03 * a10;
        const b03 = a01 * a12 - a02 * a11;
        const b04 = a01 * a13 - a03 * a11;
        const b05 = a02 * a13 - a03 * a12;
        const b06 = a20 * a31 - a21 * a30;
        const b07 = a20 * a32 - a22 * a30;
        const b08 = a20 * a33 - a23 * a30;
        const b09 = a21 * a32 - a22 * a31;
        const b10 = a21 * a33 - a23 * a31;
        const b11 = a22 * a33 - a23 * a32;

        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

        if (!det) {
            return null;
        }

        det = 1.0 / det;

        b[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        b[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        b[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        b[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        b[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        b[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        b[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        b[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        b[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        b[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        b[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        b[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        b[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        b[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        b[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        b[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

        return result;
    }
}

class MathUtils {
    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    static toDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static smoothstep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    }

    static mix(a, b, t) {
        return a * (1 - t) + b * t;
    }

    static isPowerOfTwo(value) {
        return (value & (value - 1)) === 0;
    }

    static nearestPowerOfTwo(value) {
        return Math.pow(2, Math.ceil(Math.log(value) / Math.log(2)));
    }

    static random(min = 0, max = 1) {
        return Math.random() * (max - min) + min;
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static wrap(value, min, max) {
        const range = max - min;
        if (range <= 0) return min;
        
        const result = value - min;
        return min + (result - Math.floor(result / range) * range);
    }

    static mod(a, b) {
        return ((a % b) + b) % b;
    }

    static smoothDamp(current, target, velocity, smoothTime, maxSpeed, deltaTime) {
        smoothTime = Math.max(0.0001, smoothTime);
        const omega = 2 / smoothTime;
        const x = omega * deltaTime;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        
        let change = current - target;
        const originalTo = target;
        
        const maxChange = maxSpeed * smoothTime;
        change = this.clamp(change, -maxChange, maxChange);
        target = current - change;
        
        const temp = (velocity + omega * change) * deltaTime;
        velocity = (velocity - omega * temp) * exp;
        let output = target + (change + temp) * exp;
        
        if (originalTo - current > 0.0 === output > originalTo) {
            output = originalTo;
            velocity = (output - originalTo) / deltaTime;
        }
        
        return { value: output, velocity: velocity };
    }

    static ease = {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeInQuart: t => t * t * t * t,
        easeOutQuart: t => 1 - (--t) * t * t * t,
        easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
        easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
        easeOutSine: t => Math.sin(t * Math.PI / 2),
        easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Vec3, Mat4, MathUtils };
}
