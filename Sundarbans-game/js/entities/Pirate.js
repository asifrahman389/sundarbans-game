// Enemy pirate boats that chase and shoot
class Pirate {
    constructor(scene, water, playerBoat) {
        this.scene = scene;
        this.water = water;
        this.player = playerBoat;
        this.mesh = new THREE.Group();
        
        this.speed = 8 + Math.random() * 4;
        this.turnSpeed = 1.5;
        this.detectionRange = 80;
        this.attackRange = 30;
        this.state = 'patrol'; // patrol, chase, attack, flee
        this.health = 100;
        this.lastShot = 0;
        this.shootCooldown = 2;
        
        this.createBoat();
        
        // Random start position away from player
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 100;
        this.mesh.position.x = Math.cos(angle) * dist;
        this.mesh.position.z = Math.sin(angle) * dist;
        
        this.scene.add(this.mesh);
        
        // Patrol target
        this.patrolTarget = new THREE.Vector3(
            (Math.random() - 0.5) * 200,
            0,
            (Math.random() - 0.5) * 200
        );
    }
    
    createBoat() {
        // Hull - darker, more rugged than player boat
        const hullGeo = new THREE.BoxGeometry(2.2, 1.2, 5);
        const hullMat = new THREE.MeshStandardMaterial({ 
            color: 0x4a3728,  // Dark wood
            roughness: 0.9 
        });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.y = 0.6;
        hull.castShadow = true;
        this.mesh.add(hull);
        
        // Deck
        const deckGeo = new THREE.BoxGeometry(2, 0.1, 4.8);
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.y = 1.25;
        this.mesh.add(deck);
        
        // Mast
        const mastGeo = new THREE.CylinderGeometry(0.15, 0.2, 6);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.set(0, 4, 0);
        this.mesh.add(mast);
        
        // Sail (tattered black)
        const sailGeo = new THREE.PlaneGeometry(3, 4, 5, 5);
        // Deform sail to look wind-blown
        const pos = sailGeo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i + 2] += Math.sin(pos[i] * 2) * 0.3;
        }
        sailGeo.computeVertexNormals();
        
        const sailMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            side: THREE.DoubleSide,
            roughness: 1
        });
        const sail = new THREE.Mesh(sailGeo, sailMat);
        sail.position.set(0, 4, 0.5);
        sail.rotation.y = Math.PI / 2;
        this.mesh.add(sail);
        
        // Pirate flag
        const flagGeo = new THREE.PlaneGeometry(0.8, 0.6);
        const flagMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0, 7, 0);
        this.mesh.add(flag);
        
        // Skull symbol (white circle)
        const skullGeo = new THREE.CircleGeometry(0.2, 8);
        const skullMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const skull = new THREE.Mesh(skullGeo, skullMat);
        skull.position.set(0, 7, 0.01);
        this.mesh.add(skull);
        
        // Cannon
        const cannonGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5);
        const cannonMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        
        this.cannon = new THREE.Mesh(cannonGeo, cannonMat);
        this.cannon.rotation.x = Math.PI / 2;
        this.cannon.position.set(0, 1.3, -2.5);
        this.mesh.add(this.cannon);
        
        // Lantern (glows at night)
        const lanternGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);
        const lanternMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(0.8, 2, 1);
        this.mesh.add(lantern);
        
        this.lanternLight = new THREE.PointLight(0xff6600, 1, 10);
        this.lanternLight.position.set(0.8, 2.5, 1);
        this.mesh.add(this.lanternLight);
    }
    
    update(deltaTime, timeOfDay) {
        const playerPos = this.player.getPosition();
        const myPos = this.mesh.position;
        const dist = myPos.distanceTo(playerPos);
        
        // AI State machine
        if (this.health < 30 && dist < 50) {
            this.state = 'flee';
        } else if (dist < this.attackRange) {
            this.state = 'attack';
        } else if (dist < this.detectionRange) {
            this.state = 'chase';
        } else if (this.state !== 'patrol') {
            this.state = 'patrol';
        }
        
        // Behaviors
        let targetPos = null;
        
        switch(this.state) {
            case 'patrol':
                targetPos = this.patrolTarget;
                if (myPos.distanceTo(this.patrolTarget) < 10) {
                    this.patrolTarget.set(
                        (Math.random() - 0.5) * 300,
                        0,
                        (Math.random() - 0.5) * 300
                    );
                }
                break;
                
            case 'chase':
                targetPos = playerPos.clone();
                // Try to get behind player
                targetPos.x -= Math.sin(this.player.rotation) * 20;
                targetPos.z -= Math.cos(this.player.rotation) * 20;
                break;
                
            case 'attack':
                targetPos = playerPos.clone();
                // Circle around player
                const angle = Math.atan2(
                    playerPos.x - myPos.x,
                    playerPos.z - myPos.z
                ) + 0.5;
                targetPos.x = playerPos.x - Math.sin(angle) * 25;
                targetPos.z = playerPos.z - Math.cos(angle) * 25;
                
                // Shoot
                this.tryShoot(deltaTime);
                break;
                
            case 'flee':
                targetPos = myPos.clone().sub(playerPos).normalize().multiplyScalar(100).add(myPos);
                this.speed = 12; // Boost when fleeing
                break;
        }
        
        // Movement
        if (targetPos) {
            const dir = new THREE.Vector3().subVectors(targetPos, myPos).normalize();
            const targetRotation = Math.atan2(dir.x, dir.z);
            
            // Smooth turn
            let rotDiff = targetRotation - this.mesh.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            
            this.mesh.rotation.y += rotDiff * this.turnSpeed * deltaTime;
            
            // Move forward
            const moveSpeed = this.state === 'flee' ? this.speed : this.speed * 0.8;
            this.mesh.position.x += Math.sin(this.mesh.rotation.y) * moveSpeed * deltaTime;
            this.mesh.position.z += Math.cos(this.mesh.rotation.y) * moveSpeed * deltaTime;
        }
        
        // Water physics
        const waveHeight = this.water.getHeightAt(myPos.x, myPos.z);
        this.mesh.position.y = waveHeight;
        
        // Rocking
        this.mesh.rotation.x = Math.sin(Date.now() * 0.003) * 0.1;
        this.mesh.rotation.z = Math.cos(Date.now() * 0.002) * 0.05;
        
        // Cannon follows player
        if (this.state === 'attack') {
            const cannonAngle = Math.atan2(
                playerPos.x - myPos.x,
                playerPos.z - myPos.z
            );
            this.cannon.rotation.y = cannonAngle - this.mesh.rotation.y;
        }
        
        // Lantern only at night
        this.lanternLight.intensity = (timeOfDay > 18 || timeOfDay < 6) ? 2 : 0;
        
        return { state: this.state, distance: dist };
    }
    
    tryShoot(deltaTime) {
        const now = Date.now() / 1000;
        if (now - this.lastShot > this.shootCooldown) {
            this.lastShot = now;
            this.shoot();
        }
    }
    
    shoot() {
        // Create cannonball
        const ballGeo = new THREE.SphereGeometry(0.3);
        const ballMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const ball = new THREE.Mesh(ballGeo, ballMat);
        
        const spawnPos = new THREE.Vector3();
        this.cannon.getWorldPosition(spawnPos);
        ball.position.copy(spawnPos);
        
        this.scene.add(ball);
        
        // Ball physics
        const velocity = new THREE.Vector3(0, 0, -30);
        velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y + this.cannon.rotation.y);
        
        // Animate ball
        const animateBall = () => {
            ball.position.add(velocity.clone().multiplyScalar(0.016));
            velocity.y -= 0.5; // Gravity
            
            // Check hit player
            if (ball.position.distanceTo(this.player.getPosition()) < 3) {
                this.scene.remove(ball);
                this.player.fuel -= 20; // Damage
                return;
            }
            
            // Hit water
            if (ball.position.y < this.water.getHeightAt(ball.position.x, ball.position.z)) {
                this.scene.remove(ball);
                // Splash effect could go here
                return;
            }
            
            if (ball.position.y > -10) {
                requestAnimationFrame(animateBall);
            } else {
                this.scene.remove(ball);
            }
        };
        animateBall();
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.destroy();
            return true; // Dead
        }
        return false;
    }
    
    destroy() {
        // Explosion effect
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
            const particle = new THREE.Mesh(geo, mat);
            particle.position.copy(this.mesh.position);
            particle.position.x += (Math.random() - 0.5) * 4;
            particle.position.y += Math.random() * 3;
            particle.position.z += (Math.random() - 0.5) * 4;
            this.scene.add(particle);
            
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 10,
                (Math.random() - 0.5) * 10
            );
            
            const animate = () => {
                particle.position.add(vel.clone().multiplyScalar(0.016));
                vel.y -= 0.3;
                particle.rotation.x += 0.1;
                particle.scale.multiplyScalar(0.95);
                
                if (particle.scale.x > 0.1) {
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(particle);
                }
            };
            animate();
        }
        
        this.scene.remove(this.mesh);
    }
}
