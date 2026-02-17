// Realistic water with waves and reflections
class Water {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;
        this.geometry = new THREE.PlaneGeometry(1000, 1000, 128, 128);
        
        // Custom shader for water
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x006994) },
                sunPosition: { value: new THREE.Vector3(100, 100, 50) }
            },
            vertexShader: `
                uniform float time;
                varying vec2 vUv;
                varying float vElevation;
                
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    
                    // Multiple wave layers
                    float wave1 = sin(pos.x * 0.1 + time) * 0.5;
                    float wave2 = sin(pos.y * 0.08 + time * 0.8) * 0.5;
                    float wave3 = sin((pos.x + pos.y) * 0.05 + time * 1.2) * 0.3;
                    
                    pos.z += wave1 + wave2 + wave3;
                    vElevation = pos.z;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform vec3 sunPosition;
                varying float vElevation;
                varying vec2 vUv;
                
                void main() {
                    // Water color variation based on depth/waves
                    vec3 deepColor = color * 0.5;
                    vec3 surfaceColor = color + vec3(0.1, 0.2, 0.3);
                    vec3 finalColor = mix(deepColor, surfaceColor, vElevation * 0.5 + 0.5);
                    
                    // Simple specular reflection
                    float specular = pow(max(vElevation, 0.0), 3.0) * 0.5;
                    finalColor += vec3(specular);
                    
                    // Foam at wave peaks
                    if (vElevation > 0.8) {
                        finalColor = mix(finalColor, vec3(1.0), (vElevation - 0.8) * 2.0);
                    }
                    
                    gl_FragColor = vec4(finalColor, 0.9);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = -0.5;
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        this.material.uniforms.time.value = this.time;
    }
    
    getHeightAt(x, z) {
        // Approximate height calculation for physics
        const wave1 = Math.sin(x * 0.1 + this.time) * 0.5;
        const wave2 = Math.sin(z * 0.08 + this.time * 0.8) * 0.5;
        const wave3 = Math.sin((x + z) * 0.05 + this.time * 1.2) * 0.3;
        return wave1 + wave2 + wave3 - 0.5;
    }
}
