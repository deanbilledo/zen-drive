/**
 * Environment system for Zen Drive
 * Handles day/night cycle, weather, lighting, and atmospheric effects
 */

class EnvironmentSystem {
    constructor(renderer) {
        this.renderer = renderer;
        
        // Time system
        this.time = 0;                    // Time in seconds since start
        this.timeSpeed = 1;               // Time multiplier (1 = real time)
        this.dayLength = 1200;            // Day length in seconds (20 minutes)
        this.timeOfDay = 0.5;             // 0 = midnight, 0.5 = noon, 1 = midnight
        
        // Lighting
        this.sun = {
            direction: new Vec3(0.5, -1, 0.3).normalize(),
            color: new Vec3(1.0, 0.9, 0.8),
            intensity: 1.0,
            position: new Vec3(0, 100, 0)
        };
        
        this.ambient = {
            color: new Vec3(0.3, 0.3, 0.4),
            intensity: 0.3
        };
        
        // Sky colors for different times
        this.skyColors = {
            dawn: {
                top: new Vec3(1.0, 0.6, 0.4),
                horizon: new Vec3(1.0, 0.8, 0.6),
                sun: new Vec3(1.0, 0.8, 0.5)
            },
            day: {
                top: new Vec3(0.5, 0.7, 1.0),
                horizon: new Vec3(0.8, 0.9, 1.0),
                sun: new Vec3(1.0, 1.0, 0.9)
            },
            dusk: {
                top: new Vec3(0.8, 0.4, 0.2),
                horizon: new Vec3(1.0, 0.6, 0.3),
                sun: new Vec3(1.0, 0.6, 0.2)
            },
            night: {
                top: new Vec3(0.1, 0.1, 0.2),
                horizon: new Vec3(0.2, 0.2, 0.3),
                sun: new Vec3(0.4, 0.4, 0.6)
            }
        };
        
        // Current interpolated colors
        this.currentSky = {
            top: new Vec3(),
            horizon: new Vec3(),
            sun: new Vec3()
        };
        
        // Fog settings
        this.fog = {
            color: new Vec3(0.7, 0.8, 0.9),
            density: 0.0015,
            near: 100,
            far: 1000,
            enabled: true
        };
        
        // Weather system
        this.weather = {
            type: 'clear',        // clear, cloudy, rain, storm
            intensity: 0,         // 0-1
            windDirection: new Vec3(1, 0, 0),
            windSpeed: 0.1,
            cloudCover: 0.2,
            precipitation: 0
        };
        
        // Atmospheric effects
        this.atmosphere = {
            haze: 0.1,
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0,
            temperature: 6500    // Color temperature in Kelvin
        };
        
        // Performance settings
        this.settings = {
            enableDynamicLighting: true,
            enableFog: true,
            enableWeather: true,
            enableVolumetricLighting: false,
            skyQuality: 'medium'
        };
        
        // Animation state
        this.animations = {
            timeTransition: null,
            weatherTransition: null
        };
        
        this.init();
    }

    init() {
        // Initialize with current time
        this.updateTimeOfDay();
        this.updateLighting();
        this.updateSkyColors();
        this.updateFog();
    }

    update(deltaTime) {
        // Update time
        this.time += deltaTime * this.timeSpeed;
        this.timeOfDay = (this.time / this.dayLength) % 1.0;
        
        // Update lighting based on time
        this.updateTimeOfDay();
        this.updateLighting();
        this.updateSkyColors();
        this.updateFog();
        
        // Update weather
        this.updateWeather(deltaTime);
        
        // Update atmospheric effects
        this.updateAtmosphere(deltaTime);
        
        // Update animations
        this.updateAnimations(deltaTime);
    }

    updateTimeOfDay() {
        // Convert time of day to sun angle
        const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2; // -0.25 to start at sunrise
        
        // Calculate sun position
        this.sun.position.x = Math.cos(sunAngle) * 1000;
        this.sun.position.y = Math.sin(sunAngle) * 1000;
        this.sun.position.z = 0;
        
        // Update sun direction (pointing towards center)
        this.sun.direction = this.sun.position.multiply(-1).normalize();
        
        // Calculate sun intensity based on angle
        const elevation = Math.sin(sunAngle);
        this.sun.intensity = Math.max(0, elevation) * 1.2;
        
        // Adjust ambient intensity inversely
        this.ambient.intensity = 0.1 + (1 - Math.max(0, elevation)) * 0.4;
    }

    updateLighting() {
        // Update sun color based on time of day
        const elevation = Math.max(0, Math.sin((this.timeOfDay - 0.25) * Math.PI * 2));
        
        if (elevation > 0.1) {
            // Daytime - warm white
            this.sun.color = new Vec3(1.0, 0.95, 0.9);
        } else if (elevation > 0) {
            // Sunset/sunrise - warm orange
            const sunsetFactor = elevation / 0.1;
            this.sun.color = new Vec3(
                1.0,
                0.6 + sunsetFactor * 0.35,
                0.3 + sunsetFactor * 0.6
            );
        } else {
            // Night - cool moonlight
            this.sun.color = new Vec3(0.4, 0.4, 0.6);
        }
        
        // Update ambient color
        if (elevation > 0.5) {
            // Day - blue ambient
            this.ambient.color = new Vec3(0.4, 0.5, 0.7);
        } else if (elevation > 0) {
            // Twilight - purple ambient
            const twilightFactor = elevation / 0.5;
            this.ambient.color = new Vec3(
                0.3 + twilightFactor * 0.1,
                0.2 + twilightFactor * 0.3,
                0.4 + twilightFactor * 0.3
            );
        } else {
            // Night - dark blue ambient
            this.ambient.color = new Vec3(0.1, 0.1, 0.2);
        }
    }

    updateSkyColors() {
        const elevation = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
        
        let skyA, skyB, blend;
        
        if (this.timeOfDay < 0.25) {
            // Night to dawn
            skyA = this.skyColors.night;
            skyB = this.skyColors.dawn;
            blend = this.timeOfDay / 0.25;
        } else if (this.timeOfDay < 0.5) {
            // Dawn to day
            skyA = this.skyColors.dawn;
            skyB = this.skyColors.day;
            blend = (this.timeOfDay - 0.25) / 0.25;
        } else if (this.timeOfDay < 0.75) {
            // Day to dusk
            skyA = this.skyColors.day;
            skyB = this.skyColors.dusk;
            blend = (this.timeOfDay - 0.5) / 0.25;
        } else {
            // Dusk to night
            skyA = this.skyColors.dusk;
            skyB = this.skyColors.night;
            blend = (this.timeOfDay - 0.75) / 0.25;
        }
        
        // Smooth the blend
        blend = MathUtils.smoothstep(0, 1, blend);
        
        // Interpolate colors
        this.currentSky.top = skyA.top.lerp(skyB.top, blend);
        this.currentSky.horizon = skyA.horizon.lerp(skyB.horizon, blend);
        this.currentSky.sun = skyA.sun.lerp(skyB.sun, blend);
        
        // Apply weather influence
        if (this.weather.cloudCover > 0) {
            const grayScale = this.currentSky.top.x * 0.3 + this.currentSky.top.y * 0.6 + this.currentSky.top.z * 0.1;
            const grayColor = new Vec3(grayScale, grayScale, grayScale * 1.1);
            this.currentSky.top = this.currentSky.top.lerp(grayColor, this.weather.cloudCover * 0.6);
            this.currentSky.horizon = this.currentSky.horizon.lerp(grayColor, this.weather.cloudCover * 0.4);
        }
    }

    updateFog() {
        if (!this.settings.enableFog) return;
        
        // Update fog color to match sky
        this.fog.color = this.currentSky.horizon.clone();
        
        // Adjust fog density based on weather
        let baseDensity = 0.0015;
        
        if (this.weather.type === 'cloudy') {
            baseDensity *= 1.5;
        } else if (this.weather.type === 'rain') {
            baseDensity *= 2.0;
        } else if (this.weather.type === 'storm') {
            baseDensity *= 3.0;
        }
        
        // Add time-based variation
        const elevation = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
        if (elevation < 0) {
            baseDensity *= 1.5; // More fog at night
        }
        
        this.fog.density = baseDensity * (1 + this.weather.intensity * 0.5);
    }

    updateWeather(deltaTime) {
        if (!this.settings.enableWeather) return;
        
        // Simple weather simulation
        const weatherNoise = new NoiseGenerator(Math.floor(this.time / 3600)); // New seed every hour
        const weatherValue = weatherNoise.octaveNoise2D(this.time * 0.0001, 0, 3, 0.5);
        
        // Determine weather type based on noise
        if (weatherValue > 0.6) {
            this.weather.type = 'storm';
            this.weather.intensity = (weatherValue - 0.6) / 0.4;
        } else if (weatherValue > 0.3) {
            this.weather.type = 'rain';
            this.weather.intensity = (weatherValue - 0.3) / 0.3;
        } else if (weatherValue > 0) {
            this.weather.type = 'cloudy';
            this.weather.intensity = weatherValue / 0.3;
        } else {
            this.weather.type = 'clear';
            this.weather.intensity = 0;
        }
        
        // Update cloud cover
        this.weather.cloudCover = Math.max(0, weatherValue * 0.8);
        
        // Update precipitation
        this.weather.precipitation = Math.max(0, (weatherValue - 0.2) * 1.25);
        
        // Update wind
        const windNoise = weatherNoise.octaveNoise2D(this.time * 0.0005, 1000, 2, 0.6);
        this.weather.windSpeed = 0.1 + Math.abs(windNoise) * 0.5;
        
        const windAngle = windNoise * Math.PI * 2;
        this.weather.windDirection = new Vec3(Math.cos(windAngle), 0, Math.sin(windAngle));
    }

    updateAtmosphere(deltaTime) {
        // Update atmospheric parameters based on time and weather
        
        // Brightness varies with sun elevation
        const elevation = Math.max(0, Math.sin((this.timeOfDay - 0.25) * Math.PI * 2));
        this.atmosphere.brightness = 0.3 + elevation * 0.7;
        
        // Contrast decreases in fog/rain
        this.atmosphere.contrast = 1.0 - this.weather.intensity * 0.3;
        
        // Saturation decreases with weather
        this.atmosphere.saturation = 1.0 - this.weather.cloudCover * 0.4;
        
        // Color temperature varies with time
        if (elevation > 0.7) {
            this.atmosphere.temperature = 6500; // Daylight
        } else if (elevation > 0.3) {
            this.atmosphere.temperature = 5500; // Warm light
        } else if (elevation > 0) {
            this.atmosphere.temperature = 3000; // Sunset
        } else {
            this.atmosphere.temperature = 4000; // Moonlight
        }
        
        // Haze increases with humidity/rain
        this.atmosphere.haze = 0.1 + this.weather.precipitation * 0.2;
    }

    updateAnimations(deltaTime) {
        // Update any ongoing transitions
        if (this.animations.timeTransition) {
            this.animations.timeTransition.update(deltaTime);
        }
        
        if (this.animations.weatherTransition) {
            this.animations.weatherTransition.update(deltaTime);
        }
    }

    // Time control methods
    setTimeOfDay(timeOfDay) {
        this.timeOfDay = MathUtils.clamp(timeOfDay, 0, 1);
        this.time = this.timeOfDay * this.dayLength;
        this.updateTimeOfDay();
        this.updateLighting();
        this.updateSkyColors();
    }

    setTimeSpeed(speed) {
        this.timeSpeed = Math.max(0, speed);
    }

    toggleTimeSpeed() {
        this.timeSpeed = this.timeSpeed === 1 ? 60 : 1; // Toggle between normal and 60x speed
    }

    // Weather control methods
    setWeather(type, intensity = 1.0) {
        this.weather.type = type;
        this.weather.intensity = MathUtils.clamp(intensity, 0, 1);
        
        // Update derived properties
        switch (type) {
            case 'clear':
                this.weather.cloudCover = 0;
                this.weather.precipitation = 0;
                break;
            case 'cloudy':
                this.weather.cloudCover = 0.3 + intensity * 0.4;
                this.weather.precipitation = 0;
                break;
            case 'rain':
                this.weather.cloudCover = 0.6 + intensity * 0.3;
                this.weather.precipitation = 0.3 + intensity * 0.5;
                break;
            case 'storm':
                this.weather.cloudCover = 0.8 + intensity * 0.2;
                this.weather.precipitation = 0.6 + intensity * 0.4;
                break;
        }
    }

    // Lighting transition animation
    animateToTime(targetTime, duration = 5000) {
        return new Promise((resolve) => {
            const startTime = this.timeOfDay;
            const startAnimTime = performance.now();
            
            this.animations.timeTransition = {
                update: (deltaTime) => {
                    const elapsed = performance.now() - startAnimTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = MathUtils.ease.easeInOutCubic(progress);
                    
                    this.setTimeOfDay(MathUtils.lerp(startTime, targetTime, easedProgress));
                    
                    if (progress >= 1) {
                        this.animations.timeTransition = null;
                        resolve();
                    }
                }
            };
        });
    }

    // Get lighting uniforms for shaders
    getLightingUniforms() {
        return {
            u_lightDirection: this.sun.direction.toArray(),
            u_lightColor: this.sun.color.multiply(this.sun.intensity).toArray(),
            u_ambientColor: this.ambient.color.multiply(this.ambient.intensity).toArray(),
            u_fogColor: this.fog.color.toArray(),
            u_fogDensity: this.fog.density,
            u_time: this.time,
            u_timeOfDay: this.timeOfDay
        };
    }

    // Get sky rendering data
    getSkyUniforms() {
        return {
            u_skyTopColor: this.currentSky.top.toArray(),
            u_skyHorizonColor: this.currentSky.horizon.toArray(),
            u_sunColor: this.currentSky.sun.toArray(),
            u_sunDirection: this.sun.direction.toArray(),
            u_time: this.time,
            u_timeOfDay: this.timeOfDay,
            u_weather: [this.weather.cloudCover, this.weather.precipitation, this.weather.intensity, 0]
        };
    }

    // Get post-processing uniforms
    getPostProcessUniforms() {
        return {
            u_brightness: this.atmosphere.brightness,
            u_contrast: this.atmosphere.contrast,
            u_saturation: this.atmosphere.saturation,
            u_temperature: this.atmosphere.temperature,
            u_haze: this.atmosphere.haze
        };
    }

    // Environment presets
    setPreset(presetName) {
        const presets = {
            dawn: { time: 0.2, weather: 'clear' },
            morning: { time: 0.3, weather: 'clear' },
            noon: { time: 0.5, weather: 'clear' },
            afternoon: { time: 0.6, weather: 'clear' },
            sunset: { time: 0.8, weather: 'clear' },
            night: { time: 0.0, weather: 'clear' },
            stormyDay: { time: 0.5, weather: 'storm' },
            rainyNight: { time: 0.0, weather: 'rain' },
            foggyMorning: { time: 0.3, weather: 'cloudy' }
        };
        
        const preset = presets[presetName];
        if (preset) {
            this.setTimeOfDay(preset.time);
            this.setWeather(preset.weather, 1.0);
        }
    }

    // Settings
    updateSettings(settings) {
        Object.assign(this.settings, settings);
        
        if (!settings.enableFog) {
            this.fog.density = 0;
        }
    }

    // Debug information
    getDebugInfo() {
        return {
            timeOfDay: this.timeOfDay.toFixed(3),
            timeSpeed: this.timeSpeed,
            sunElevation: Math.sin((this.timeOfDay - 0.25) * Math.PI * 2).toFixed(3),
            weather: this.weather.type,
            weatherIntensity: this.weather.intensity.toFixed(3),
            cloudCover: this.weather.cloudCover.toFixed(3),
            fogDensity: this.fog.density.toFixed(6),
            sunIntensity: this.sun.intensity.toFixed(3)
        };
    }

    // Helper methods
    isDay() {
        const elevation = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
        return elevation > 0;
    }

    isNight() {
        return !this.isDay();
    }

    getSunElevation() {
        return Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    }

    getFormattedTime() {
        const hours = Math.floor(this.timeOfDay * 24);
        const minutes = Math.floor((this.timeOfDay * 24 * 60) % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentSystem;
}
