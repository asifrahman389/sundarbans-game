// Dense 3D mangrove forest
class Vegetation {
    constructor(scene) {
        this.scene = scene;
        this.noise = new SimplexNoise();
        this.trees = [];
        this.maxTrees = 200;
        this.treeGeometry = this.createTreeGeometry();
        this.treeMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a472a,
            roughness: 0.8
        });
    }
    
    createTreeGeometry() {
        // Procedural mangrove tree
        const group = new THREE.Group();
        
        // Roots (stilt roots characteristic of mangroves)
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const rootGeo = new THREE.CylinderGeometry(0.1, 0.3, 4, 6);
            const root = new THREE.Mesh(rootGeo, this.treeMaterial);
            root.position.set(Math.cos(angle) * 1.5, 2, Math.sin(angle) * 1.5);
            root.rotation.x = 0.3;
            root.rotation.z = Math.cos(angle) * 0.3;
            root.rotation.y = angle;
            group.add(root);
        }
        
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 6, 8);
        const trunk = new THREE.Mesh(trunkGeo, this.treeMaterial);
        trunk.position.y = 3;
        group.add(trunk);
        
        // Branches
        for (let i = 0; i < 4; i++) {
            const branchGeo = new THREE.CylinderGeometry(0.15, 0.25, 3, 6);
            const branch = new THREE.Mesh(branchGeo, this.treeMaterial);
            branch.position.y = 4 + i * 1.2;
            branch.rotation.z = 0.5 + Math.random() * 0.3;
            branch.rotation.y = Math.random() * Math.PI * 2;
            group.add(branch);
        }
        
        // Leaves (multiple spheres for volume)
        const leafColors = [0x0f3d0f, 0x1a5c1a, 0x267326];
        for (let i = 0; i < 8; i++) {
            const leafGeo = new THREE.IcosahedronGeometry(1.5 + Math.random(), 0);
            const leafMat = new THREE.MeshStandardMaterial({
                color: leafColors[Math.floor(Math.random() * leafColors.length)],
                roughness: 0.9
            });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(
                (Math.random() - 0.5) * 4,
                7 + Math.random() * 3,
                (Math.random() - 0.5) * 4
            );
            group.add(leaf);
        }
        
        return group;
    }
    
    update(playerX, playerZ, terrain) {
        // Remove distant trees
        this.trees = this.trees.filter(tree => {
            const dx = tree.x - playerX;
            const dz = tree.z - playerZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist > 150) {
                this.scene.remove(tree.mesh);
                return false;
            }
            return true;
        });
        
        // Add new trees
        if (this.trees.length < this.maxTrees) {
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 30 + Math.random() * 100;
                const x = playerX + Math.cos(angle) * dist;
                const z = playerZ + Math.sin(angle) * dist;
                
                const height = terrain.getHeightAt(x, z);
                
                // Only place on land above water
                if (height > 0 && height < 8) {
                    const tree = this.treeGeometry.clone();
                    tree.position.set(x, height, z);
                    
                    // Random scale and rotation
                    const scale = 0.8 + Math.random() * 0.6;
                    tree.scale.set(scale, scale, scale);
                    tree.rotation.y = Math.random() * Math.PI * 2;
                    
                    this.scene.add(tree);
                    this.trees.push({ mesh: tree, x: x, z: z });
                }
            }
        }
    }
}
