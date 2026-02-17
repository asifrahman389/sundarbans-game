// Dynamic lighting, fog, and sky
class Atmosphere {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.time = 6; // Start at 6 AM
        this.dayDuration = 600; // 10 minutes per day
        
        this.setupLighting();
        this.createSky();
        this.setupFog();
    }
    
    setupLighting() {
        // Ambient
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambientLight);
        
        // Sun/Moon directional
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(100, 100, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.scene.add(this.sunLight);
        
        // Hemisphere for sky/ground bounce
        this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1d, 0.6);
        this.scene.add(this.hemiLight);
    }
    
    createSky() {
        // Gradient sky sphere
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `;
        
        const uniforms = {
            topColor: { value: new THREE.Color(0x0077ff) },
            bottomColor: { value: new THREE.Color(0xffffff) },
            offset: { value: 33 },
            exponent: { value: 0.6 }
        };
        
        const skyGeo = new THREE.SphereGeometry(400, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            side: THREE.BackSide
        });
        
        this.sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.sky);
    }
    
    setupFog() {
        this.scene.fog = new THREE.FogExp2(0xccdee8, 0.002);
    }
    
    update(deltaTime) {
        this.time += deltaTime / this.dayDuration * 24;
        if (this.time >= 24) this.time = 0;
        
        // Calculate sun position
        const sunAngle = (this.time / 24) * Math.PI * 2 - Math.PI / 2;
        const sunHeight = Math.sin(sunAngle) * 100;
        const sunX = Math.cos(sunAngle) * 100;
        
        this.sunLight.position.set(sunX, sunHeight, 50);
        
        // Day/night cycle colors
        let skyTop, skyBottom, fogColor, lightIntensity;
        
        if (this.time >= 5 && this.time < 7) {
            // Sunrise
            const t = (this.time - 5) / 2;
            skyTop = new THREE.Color(0x1a1a2e).lerp(new THREE.Color(0x4a90e2), t);
            skyBottom = new THREE.Color(0xff6b35).lerp(new THREE.Color(0x87ceeb), t);
            fogColor = new THREE.Color(0xff9f43).lerp(new THREE.Color(0xccdee8), t);
            lightIntensity = 0.2 + t * 0.8;
        } else if (this.time >= 7 && this.time < 17) {
            // Day
            skyTop = new THREE.Color(0x0077ff);
            skyBottom = new THREE.Color(0xffffff);
            fogColor = new THREE.Color(0xccdee8);
            lightIntensity = 1.0;
        } else if (this.time >= 17 && this.time < 19) {
            // Sunset
            const t = (this.time - 17) / 2;
            skyTop = new THREE.Color(0x4a90e2).lerp(new THREE.Color(0x0f0f23), t);
            skyBottom = new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xff6b35), t);
            fogColor = new THREE.Color(0xccdee8).lerp(new THREE.Color(0xff6b35), t);
            lightIntensity = 1.0 - t * 0.8;
        } else {
            // Night
            skyTop = new THREE.Color(0x0f0f23);
            skyBottom = new THREE.Color(0x1a1a2e);
            fogColor = new THREE.Color(0x0a0a1a);
            lightIntensity = 0.1;
        }
        
        // Apply colors
        this.sky.material.uniforms.topColor.value = skyTop;
        this.sky.material.uniforms.bottomColor.value = skyBottom;
        this.scene.fog.color = fogColor;
        this.scene.fog.density = (this.time > 19 || this.time < 5) ? 0.005 : 0.002;
        
        this.sunLight.intensity = lightIntensity;
        this.ambientLight.intensity = 0.2 + lightIntensity * 0.3;
        
        return this.time;
    }
    
    getTimeString() {
        const hours = Math.floor(this.time);
        const minutes = Math.floor((this.time - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}
