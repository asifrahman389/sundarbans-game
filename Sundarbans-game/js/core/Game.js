// Main game controller
class Game {
    constructor() {
        this.renderer = new Renderer();
        this.input = new Input();
        this.clock = new THREE.Clock();
        
        this.isPlaying = false;
        this.gameOver = false;
        
        // Pirate system
        this.pirates = [];
        this.maxPirates = 3;
        
        this.init();
    }
    
    init() {
        // World systems
        this.water = new Water(this.renderer.scene);
        this.terrain = new Terrain(this.renderer.scene);
        this.vegetation = new Vegetation(this.renderer.scene);
        this.atmosphere = new Atmosphere(this.renderer.scene, this.renderer.renderer);
        
        // Entities (created in start())
        this.boat = null;
        this.tiger = null;
        
        // UI
        this.setupUI();
        
        // Start loop
        this.animate();
    }
    
    setupUI() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.start();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload();
        });
    }
    
    start() {
        document.getElementById('main-menu').classList.add('hidden');
        
        // Create boat at center
        this.boat = new Boat(this.renderer.scene, this.water);
        
        // Create tiger
        this.tiger = new Tiger(this.renderer.scene, this.terrain);
        
        // Create pirates
        this.pirates = [];
        for (let i = 0; i < this.maxPirates; i++) {
            this.pirates.push(new Pirate(
                this.renderer.scene, 
                this.water, 
                this.boat
            ));
        }
        
        this.isPlaying = true;
    }
    
    endGame(reason) {
        this.gameOver = true;
        this.isPlaying = false;
        
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('end-reason').textContent = reason;
        
        const dist = this.boat ? 
            Math.floor(this.boat.getPosition().length() / 10) : 0;
        document.getElementById('final-dist').textContent = dist;
        
        // Check if tiger was ever seen
        const tigerSeen = this.tiger && this.tiger.mesh.visible;
        document.getElementById('final-tiger').textContent = tigerSeen ? 'Yes!' : 'No';
    }
    
    update() {
        if (!this.isPlaying || this.gameOver) return;
        
        const deltaTime = this.clock.getDelta();
        const time = this.clock.getElapsedTime();
        
        // Update world
        this.water.update(deltaTime);
        
        const playerPos = this.boat.getPosition();
        this.terrain.update(playerPos.x, playerPos.z);
        this.vegetation.update(playerPos.x, playerPos.z, this.terrain);
        
        const dayTime = this.atmosphere.update(deltaTime);
        
        // Update boat
        const cameraData = this.boat.update(this.input, deltaTime);
        
        // Check fuel depletion
        if (this.boat.getFuel() <= 0) {
            this.endGame('You ran out of fuel');
            return;
        }
        
        // Update camera
        this.renderer.camera.position.lerp(cameraData.position, 0.1);
        this.renderer.camera.lookAt(cameraData.lookAt);
        
        // Update compass
        const angle = -this.boat.rotation * (180 / Math.PI);
        document.getElementById('compass-needle').style.transform = 
            `translate(-50%, -100%) rotate(${angle}deg)`;
        
        // Update pirates
        let nearestPirate = null;
        let nearestDist = Infinity;
        
        this.pirates = this.pirates.filter(pirate => {
            const data = pirate.update(deltaTime, dayTime);
            
            if (data.distance < nearestDist) {
                nearestDist = data.distance;
                nearestPirate = pirate;
            }
            
            // Remove dead pirates
            if (pirate.health <= 0) {
                pirate.destroy();
                return false;
            }
            
            return true;
        });
        
        // Spawn new pirates if all dead (rare chance)
        if (this.pirates.length === 0 && Math.random() < 0.01) {
            this.pirates.push(new Pirate(
                this.renderer.scene,
                this.water,
                this.boat
            ));
        }
        
        // Check pirate collision
        if (nearestPirate && nearestDist < 5) {
            this.boat.fuel -= 30; // Crash damage
            nearestPirate.takeDamage(50); // Pirate also damaged
            
            if (this.boat.getFuel() <= 0) {
                this.endGame('Your boat was destroyed by pirates!');
                return;
            }
        }
        
        // Update tiger
        const tigerData = this.tiger.update(playerPos, deltaTime, dayTime);
        if (tigerData === 'caught') {
            this.endGame('The Royal Bengal Tiger caught you!');
            return;
        }
        
        // Update UI
        document.getElementById('fuel').textContent = 
            Math.floor(this.boat.getFuel()) + '%';
        document.getElementById('time').textContent = 
            this.atmosphere.getTimeString();
        
        // Tiger distance
        if (tigerData.visible) {
            const dist = tigerData.distance;
            let status = dist < 30 ? 'VERY CLOSE!' : 
                        dist < 60 ? 'Near' : 'Distant';
            document.getElementById('tiger-dist').textContent = 
                `${status} (${dist}m)`;
            document.getElementById('tiger-dist').style.color = 
                dist < 30 ? '#ff4444' : '#ffff00';
        } else {
            document.getElementById('tiger-dist').textContent = 'Unknown';
            document.getElementById('tiger-dist').style.color = '#888';
        }
        
        // Warning if pirates near
        if (nearestPirate && nearestDist < 50) {
            document.getElementById('tiger-dist').textContent = 
                `PIRATE ${Math.floor(nearestDist)}m!`;
            document.getElementById('tiger-dist').style.color = '#ff00ff';
        }
        
        // Update minimap
        this.updateMinimap(playerPos);
    }
    
    updateMinimap(playerPos) {
        const canvas = document.getElementById('minimap');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        // Clear
        ctx.fillStyle = '#001a00';
        ctx.fillRect(0, 0, 200, 200);
        
        // Draw terrain
        for (let x = 0; x < 200; x += 10) {
            for (let y = 0; y < 200; y += 10) {
                const worldX = playerPos.x + (x - 100) * 2;
                const worldZ = playerPos.z + (y - 100) * 2;
                const height = this.terrain.getHeightAt(worldX, worldZ);
                
                if (height > 0) {
                    ctx.fillStyle = '#2d5016';
                    ctx.fillRect(x, y, 10, 10);
                }
            }
        }
        
        // Draw player (center)
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(100, 100, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.lineTo(
            100 - Math.sin(this.boat.rotation) * 15,
            100 - Math.cos(this.boat.rotation) * 15
        );
        ctx.stroke();
        
        // Draw tiger if visible
        if (this.tiger.mesh.visible) {
            const dx = this.tiger.mesh.position.x - playerPos.x;
            const dz = this.tiger.mesh.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < 400) {
                const mx = 100 - (dx / 2);
                const my = 100 - (dz / 2);
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(mx, my, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw pirates
        this.pirates.forEach(pirate => {
            const dx = pirate.mesh.position.x - playerPos.x;
            const dz = pirate.mesh.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < 400) {
                const mx = 100 - (dx / 2);
                const my = 100 - (dz / 2);
                ctx.fillStyle = '#ff00ff';
                ctx.beginPath();
                ctx.moveTo(mx, my - 5);
                ctx.lineTo(mx - 4, my + 3);
                ctx.lineTo(mx + 4, my + 3);
                ctx.fill();
            }
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render();
    }
}

// Start game
window.addEventListener('load', () => {
    new Game();
});
