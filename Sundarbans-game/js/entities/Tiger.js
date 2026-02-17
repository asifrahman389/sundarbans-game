// AI Royal Bengal Tiger that stalks the player
class Tiger {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.mesh = new THREE.Group();
        this.state = 'hidden'; // hidden, stalking, attacking, fleeing
        this.target = null;
        this.lastSeenTime = 0;
        this.stalkDistance = 100;
        this.attackDistance = 20;
        
        this.createTiger();
        this.findHidingSpot();
    }
    
    createTiger() {
        // Body
        const bodyGeo = new THREE.BoxGeometry(1.2, 1, 2.5);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0xFF8C00,
            roughness: 0.8
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.5;
        body.castShadow = true;
        this.mesh.add(body);
        
        // Stripes (simple black planes)
        for (let i = 0; i < 5; i++) {
            const stripeGeo = new THREE.PlaneGeometry(0.1, 0.8);
            const stripeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(0, 1.5, -1 + i * 0.5);
            stripe.rotation.y = Math.PI / 2;
            this.mesh.add(stripe);
        }
        
        // Head
        const headGeo = new THREE.BoxGeometry(1, 0.9, 1);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0, 2, 1.5);
        this.mesh.add(head);
        
        // Ears
        const earGeo = new THREE.ConeGeometry(0.2, 0.3, 4);
        const leftEar = new THREE.Mesh(earGeo, bodyMat);
        leftEar.position.set(-0.3, 2.6, 1.5);
        this.mesh.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeo, bodyMat);
        rightEar.position.set(0.3, 2.6, 1.5);
        this.mesh.add(rightEar);
        
        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.1, 0.05, 1.5);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.position.set(0, 1.8, -1.8);
        tail.rotation.x = -0.5;
        this.mesh.add(tail);
        
        // Eyes (glow in dark)
        const eyeGeo = new THREE.SphereGeometry(0.08);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.25, 2.1, 2);
        this.mesh.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.25, 2.1, 2);
        this.mesh.add(rightEye);
        
        this.scene.add(this.mesh);
        this.mesh.visible = false;
    }
    
    findHidingSpot() {
        // Place tiger on land, hidden from player
        let attempts = 0;
        while (attempts < 50) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            const height = this.terrain.getHeightAt(x, z);
            
            if (height > 2 && height < 10) {
                this.mesh.position.set(x, height, z);
                break;
            }
            attempts++;
        }
    }
    
    update(playerPos, deltaTime, timeOfDay) {
        const dist = this.mesh.position.distanceTo(playerPos);
        
        // Tiger behavior based on time and distance
        if (timeOfDay > 19 || timeOfDay < 5) {
            // Night time - tiger is active
            if (dist < this.stalkDistance && this.state === 'hidden') {
                this.state = 'stalking';
                this.mesh.visible = true;
            }
        }
        
        if (this.state === 'stalking') {
            // Move toward player but stay hidden behind trees
            const dir = new THREE.Vector3()
                .subVectors(playerPos, this.mesh.position)
                .normalize();
            
            // Circle around player
            const angle = Math.atan2(dir.x, dir.z) + 0.5;
            const targetX = playerPos.x - Math.sin(angle) * 30;
            const targetZ = playerPos.z - Math.cos(angle) * 30;
            
            this.mesh.position.x += (targetX - this.mesh.position.x) * deltaTime;
            this.mesh.position.z += (targetZ - this.mesh.position.z) * deltaTime;
            this.mesh.lookAt(playerPos);
            
            // Height adjustment
            const height = this.terrain.getHeightAt(
                this.mesh.position.x, 
                this.mesh.position.z
            );
            this.mesh.position.y = height;
            
            if (dist < this.attackDistance) {
                this.state = 'attacking';
            }
        }
        
        if (this.state === 'attacking') {
            // Charge at player
            const dir = new THREE.Vector3()
                .subVectors(playerPos, this.mesh.position)
                .normalize();
            
            this.mesh.position.x += dir.x * 10 * deltaTime;
            this.mesh.position.z += dir.z * 10 * deltaTime;
            this.mesh.lookAt(playerPos);
            
            if (dist < 3) {
                return 'caught'; // Game over
            }
        }
        
        // Return distance for UI
        return {
            state: this.state,
            distance: Math.floor(dist),
            visible: this.mesh.visible
        };
    }
}
