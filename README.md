# Zen Drive

A zen driving experience inspired by Slow Roads, featuring procedural terrain generation and immersive 3D graphics built for the web.

## 🎮 Features

- **Infinite Procedural World**: Drive through endless landscapes with 5 unique biomes
- **Realistic Physics**: Advanced vehicle simulation with engine, transmission, and tire modeling
- **Stunning Graphics**: WebGL 2.0 powered visuals with dynamic lighting and shadows
- **Day/Night Cycle**: Experience beautiful transitions from dawn to dusk
- **Weather System**: Dynamic weather effects including rain and fog
- **Zen Experience**: Relaxing, meditative driving without stress or time pressure

## 🌍 Biomes

- **Plains**: Rolling grasslands with gentle hills
- **Forest**: Dense woodlands with towering trees
- **Desert**: Vast sandy landscapes with dunes
- **Mountains**: Dramatic peaks and valleys
- **City**: Urban environments with buildings and infrastructure

## 🎯 Getting Started

### Play Online

Visit [zen-drive.github.io](https://your-username.github.io/zen-drive) to play instantly in your browser.

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-username/zen-drive.git
cd zen-drive
```

2. Serve the files using a local web server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

3. Open your browser and navigate to `http://localhost:8000`

## 🎮 Controls

### Keyboard
- **W / Arrow Up**: Accelerate
- **S / Arrow Down**: Brake / Reverse
- **A / Arrow Left**: Steer Left
- **D / Arrow Right**: Steer Right
- **Space**: Handbrake
- **R**: Reset Vehicle
- **C**: Change Camera Mode
- **M**: Toggle Map
- **ESC**: Settings Menu

### Gamepad
- **Right Trigger**: Accelerate
- **Left Trigger**: Brake
- **Left Stick**: Steering
- **A/X Button**: Handbrake
- **Y/Triangle**: Reset Vehicle

### Touch (Mobile)
- **Touch Controls**: Adaptive on-screen controls for mobile devices

## ⚙️ Settings

- **Graphics Quality**: Low, Medium, High, Ultra
- **Render Distance**: Adjust for performance
- **Time of Day**: Control lighting and atmosphere
- **Weather**: Toggle weather effects
- **Camera Settings**: FOV, follow distance, and smoothness
- **Audio**: Volume controls for engine and ambient sounds

## 🛠️ Technical Details

### Engine Architecture
- **Renderer**: Custom WebGL 2.0 engine
- **Physics**: Real-time vehicle dynamics simulation
- **Terrain**: Chunk-based infinite generation using Perlin noise
- **LOD System**: Level-of-detail optimization for performance
- **Frustum Culling**: Efficient rendering of visible objects only

### Performance Features
- **60 FPS Target**: Optimized for smooth gameplay
- **Adaptive Quality**: Automatic graphics adjustment
- **Memory Management**: Efficient chunk loading/unloading
- **Mobile Optimization**: Touch controls and performance scaling

### Browser Compatibility
- **Modern Browsers**: Chrome 70+, Firefox 70+, Safari 14+, Edge 79+
- **WebGL 2.0**: Required for advanced graphics features
- **Mobile Support**: iOS Safari, Chrome Mobile, Samsung Internet

## 🎨 Art Style

Zen Drive features a minimalist, low-poly art style that emphasizes:
- Clean geometric shapes
- Soft, natural color palettes
- Procedural texturing
- Atmospheric lighting
- Meditative visual design

## 🌟 Inspiration

This project draws inspiration from:
- **Slow Roads**: The zen driving concept and peaceful gameplay
- **AltspaceVR**: Procedural world generation techniques
- **Gran Turismo**: Realistic driving physics
- **Journey**: Atmospheric visual design and emotional experience

## 📱 Mobile Experience

Zen Drive is fully optimized for mobile devices:
- Responsive design that adapts to any screen size
- Touch-friendly controls with haptic feedback
- Performance scaling for mobile hardware
- Battery life optimization
- Portrait and landscape orientation support

## 🚗 Vehicle Physics

The driving experience features realistic physics simulation:
- **Engine Simulation**: Torque curves, RPM modeling, gear ratios
- **Tire Physics**: Grip simulation, understeer/oversteer dynamics
- **Suspension**: Spring and damper modeling for realistic handling
- **Aerodynamics**: Wind resistance and downforce effects
- **Weight Transfer**: Realistic load distribution during acceleration/braking

## 🌍 World Generation

The infinite world is created using advanced procedural techniques:
- **Multi-octave Noise**: Perlin and Simplex noise for natural terrain
- **Biome Blending**: Smooth transitions between different environments
- **Road Network**: Intelligent road placement following natural terrain
- **Landmark Generation**: Points of interest scattered throughout the world
- **Streaming System**: Seamless loading of new areas as you drive

## 🎵 Audio Design

Immersive audio enhances the zen experience:
- **Engine Sounds**: Realistic car audio based on RPM and load
- **Ambient Audio**: Nature sounds for each biome
- **Weather Effects**: Rain, wind, and atmospheric audio
- **Spatial Audio**: 3D positioned sounds for immersion
- **Dynamic Mixing**: Adaptive audio levels based on speed and environment

## 📊 Performance Monitoring

Built-in performance tools help optimize your experience:
- **FPS Counter**: Real-time frame rate display
- **GPU Usage**: Graphics performance monitoring
- **Memory Usage**: RAM consumption tracking
- **Draw Calls**: Rendering efficiency metrics
- **Chunk Statistics**: World generation performance

## 🎯 Development Roadmap

### Phase 1: Core Experience ✅
- Basic driving mechanics
- Procedural terrain generation
- Day/night cycle
- Mobile support

### Phase 2: Enhanced Features 🚧
- Weather system
- Multiple vehicle types
- Photo mode
- Achievement system

### Phase 3: Social Features 🔮
- Ghost mode (race against recordings)
- Shared landmarks
- Community challenges
- Leaderboards

### Phase 4: Advanced Graphics 🔮
- Volumetric lighting
- Advanced post-processing
- Ray-traced reflections
- Enhanced weather effects

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Bug Reports
- Use the GitHub issue tracker
- Include browser information and steps to reproduce
- Screenshots or videos are helpful

### Feature Requests
- Discuss ideas in GitHub discussions
- Consider the zen philosophy of the game
- Focus on relaxation and peaceful gameplay

### Code Contributions
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Follow the existing code style
- Comment complex algorithms
- Maintain 60 FPS performance
- Test on multiple devices
- Consider mobile users

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Slow Roads**: Original inspiration for zen driving
- **WebGL Community**: Tutorials and documentation
- **Noise Generation**: Research papers on procedural generation
- **Game Physics**: Academic resources on vehicle dynamics
- **Open Source**: Libraries and tools that made this possible

## 🔗 Links

- **Play Game**: [zen-drive.github.io](https://your-username.github.io/zen-drive)
- **Source Code**: [GitHub Repository](https://github.com/your-username/zen-drive)
- **Bug Reports**: [Issue Tracker](https://github.com/your-username/zen-drive/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/zen-drive/discussions)

---

Made with ❤️ for the zen driving community
