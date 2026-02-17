// 3D terrain with islands and channels
class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.noise = new SimplexNoise();
        this.chunkSize = 100;
        this.chunks = new Map();
        this.maxChunks = 9; // 3x3 grid
        
        this.createInitialChunks();
    }
    
    createInitialChunks() {
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                this.createChunk(x, z);
            }
        }
    }
    
    createChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (this.chunks.has(key)) return;
        
        const chunk = new THREE.Group();
        const offsetX = cx * this.chunkSize;
        const offsetZ = cz * this.chunkSize;
        
        // Generate heightmap
        const resolution = 50;
        const geometry = new THREE.PlaneGeometry(
            this.chunkSize, 
            this.chunkSize, 
            resolution, 
            resolution
        );
        
        const positions = geometry.attributes.position.array;
        const colors = [];
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i] + offsetX;
            const z = positions[i + 1] + offsetZ;
            
            // Multi-layered noise for realistic terrain
            let height = 0;
            height += this.noise.noise(x * 0.01, z * 0.01) * 20;
            height += this.noise.noise(x * 0.03, z * 0.03) * 10;
            height += this.noise.noise(x * 0.1, z * 0.1) * 2;
            
            // Create channels (waterways)
            const channelNoise = this.noise.noise(x * 0.005, z * 0.005);
            if (channelNoise > 0.3) {
                height = Math.max(height, 2); // Land
            } else {
                height = -10; // Deep water channel
            }
            
            positions[i + 2] = height;
            
            // Vertex colors based on height
            if (height < 0) {
                colors.push(0.2, 0.3, 0.4); // Underwater
            } else if (height < 3) {
                colors.push(0.4, 0.5, 0.2); // Mud/Grass
            } else if (height < 8) {
                colors.push(0.2, 0.6, 0.2); // Grass
            } else {
                colors.push(0.4, 0.4, 0.3); // Rock
            }
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(offsetX, 0, offsetZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        chunk.add(mesh);
        
        // Add detail objects (rocks, stumps)
        this.addDetails(chunk, offsetX, offsetZ);
        
        this.scene.add(chunk);
        this.chunks.set(key, { mesh: chunk, x: cx, z: cz });
        
        // Cleanup old chunks
        if (this.chunks.size > this.maxChunks) {
            const firstKey = this.chunks.keys().next().value;
            const oldChunk = this.chunks.get(firstKey);
            this.scene.remove(oldChunk.mesh);
            this.chunks.delete(firstKey);
        }
    }
    
    addDetails(chunk, offsetX, offsetZ) {
        // Add random rocks and logs
        for (let i = 0; i < 10; i++) {
            const x = offsetX + (Math.random() - 0.5) * this.chunkSize;
            const z = offsetZ + (Math.random() - 0.5) * this.chunkSize;
            const height = this.getHeightAt(x, z);
            
            if (height > 0 && height < 5) {
                // Rock
                const geo = new THREE.DodecahedronGeometry(Math.random() * 2 + 0.5);
                const mat = new THREE.MeshStandardMaterial({ color: 0x666666 });
                const rock = new THREE.Mesh(geo, mat);
                rock.position.set(x - offsetX, height + 1, z - offsetZ);
                rock.castShadow = true;
                chunk.add(rock);
            }
        }
    }
    
    getHeightAt(x, z) {
        let height = 0;
        height += this.noise.noise(x * 0.01, z * 0.01) * 20;
        height += this.noise.noise(x * 0.03, z * 0.03) * 10;
        height += this.noise.noise(x * 0.1, z * 0.1) * 2;
        
        const channelNoise = this.noise.noise(x * 0.005, z * 0.005);
        if (channelNoise > 0.3) {
            return Math.max(height, 2);
        }
        return -10;
    }
    
    update(playerX, playerZ) {
        const cx = Math.floor(playerX / this.chunkSize);
        const cz = Math.floor(playerZ / this.chunkSize);
        
        // Load nearby chunks
        for (let x = cx - 1; x <= cx + 1; x++) {
            for (let z = cz - 1; z <= cz + 1; z++) {
                this.createChunk(x, z);
            }
        }
    }
}
