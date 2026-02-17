// 3D boat with physics
class Boat {
    constructor(scene, water) {
        this.scene = scene;
        this.water = water;
        this.mesh = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        this.speed = 0;
        this.maxSpeed = 15;
        this.acceleration = 5;
        this.friction = 0.95;
        this.turnSpeed = 2;
        this.fuel = 100;
        
        this.createBoat();
        this.scene.add(this.mesh);
        
        // Camera offset
        this.cameraOffset = new THREE.Vector3(0, 8, 15);
    }
    
    createBoat() {
        // Hull
        const hullGeo = new THREE.BoxGeometry(2, 1, 5);
        // Taper the front
        const positions = hullGeo.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            if (positions[i + 2] < -2) { // Front vertices
                positions[i] *= 0.3; // Narrow width
            }
        }
        hullGeo.computeVertexNormals();
        
        const hullMat = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.6 
        });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.y = 0.5;
        hull.castShadow = true;
        this.mesh.add(hull);
        
        // Deck
        const deckGeo = new THREE.BoxGeometry(1.8, 0.1, 4.5);
        const deckMat = new THREE.MeshStandardMaterial({ color: 0xA0522D });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.y = 1.05;
        this.mesh.add(deck);
        
        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.5, 1.2, 2);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0xF4A460 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.6, 0.5);
        cabin.castShadow = true;
        this.mesh.add(cabin);
        
        // Roof
        const roofGeo = new THREE.ConeGeometry(1.3, 0.8, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 2.6, 0.5);
        roof.rotation.y = Math.PI / 4;
        this.mesh.add(roof);
        
        // Engine
        const engineGeo = new THREE.BoxGeometry(0.8, 0.8, 1);
        const engineMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.set(0, 0.9, -2);
        this.mesh.add(engine);
        
        // Propeller
        const propGeo = new THREE.BoxGeometry(1.2, 0.1, 0.1);
        const propMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        this.propeller = new THREE.Mesh(propGeo, propMat);
        this.propeller.position.set(0, 0.5, -2.6);
        this.mesh.add(this.propeller);
        
        // Headlight
        const lightGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const headlight = new THREE.Mesh(lightGeo, lightMat);
        headlight.rotation.x = Math.PI / 2;
        headlight.position.set(0, 1.2, -2.2);
        this.mesh.add(headlight);
        
        // Spotlight
        this.spotLight = new THREE.SpotLight(0xffffaa, 2, 50, 0.5, 0.5, 1);
        this.spotLight.position.set(0, 2, 1);
        this.spotLight.target.position.set(0, 0, -10);
        this.mesh.add(this.spotLight);
        this.mesh.add(this.spotLight.target);
    }
    
    update(input, deltaTime) {
        // Fuel consumption
        if (input.forward || input.backward) {
            this.fuel -= deltaTime * 2;
        }
        
        // Acceleration
        if (input.forward && this.fuel > 0) {
            this.speed += this.acceleration * deltaTime;
        } else if (input.backward && this.fuel > 0) {
            this.speed -= this.acceleration * deltaTime;
        }
        
        // Boost
        if (input.boost && this.fuel > 0) {
            this.speed += this.acceleration * deltaTime * 2;
            this.fuel -= deltaTime * 5;
        }
        
        // Friction
        this.speed *= this.friction;
        
        // Clamp speed
        this.speed = Math.max(-this.maxSpeed/2, Math.min(this.maxSpeed, this.speed));
        
        // Turning (only when moving)
        if (Math.abs(this.speed) > 0.1) {
            if (input.left) {
                this.rotation += this.turnSpeed * deltaTime * Math.sign(this.speed);
            }
            if (input.right) {
                this.rotation -= this.turnSpeed * deltaTime * Math.sign(this.speed);
            }
        }
        
        // Apply movement
        this.velocity.x = Math.sin(this.rotation) * this.speed;
        this.velocity.z = Math.cos(this.rotation) * this.speed;
        
        this.mesh.position.x += this.velocity.x * deltaTime;
        this.mesh.position.z += this.velocity.z * deltaTime;
        this.mesh.rotation.y = this.rotation;
        
        // Water physics
        const waveHeight = this.water.getHeightAt(
            this.mesh.position.x, 
            this.mesh.position.z
        );
        this.mesh.position.y = waveHeight;
        
        // Boat rocking based on waves
        const frontHeight = this.water.getHeightAt(
            this.mesh.position.x + Math.sin(this.rotation) * 2,
            this.mesh.position.z + Math.cos(this.rotation) * 2
        );
        const backHeight = this.water.getHeightAt(
            this.mesh.position.x - Math.sin(this.rotation) * 2,
            this.mesh.position.z - Math.cos(this.rotation) * 2
        );
        
        this.mesh.rotation.x = (backHeight - frontHeight) * 0.2;
        this.mesh.rotation.z = Math.sin(Date.now() * 0.002) * 0.05;
        
        // Propeller animation
        this.propeller.rotation.z += this.speed * deltaTime * 2;
        
        // Update camera
        return this.updateCamera();
    }
    
    updateCamera() {
        // Smooth camera follow
        const relativeOffset = this.cameraOffset.clone();
        relativeOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        
        const targetPos = this.mesh.position.clone().add(relativeOffset);
        
        return {
            position: targetPos,
            lookAt: this.mesh.position.clone().add(
                new THREE.Vector3(
                    Math.sin(this.rotation) * 10,
                    0,
                    Math.cos(this.rotation) * 10
                )
            )
        };
    }
    
    getPosition() {
        return this.mesh.position;
    }
    
    getFuel() {
        return Math.max(0, this.fuel);
    }
}
