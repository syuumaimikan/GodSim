import re

def update():
    with open('src/world.js', 'r', encoding='utf-8') as f:
        content = f.read()
        
    start_str = "export function populateWorld(terrainGeo, maxHeight) {"
    end_str = "        if (count > 0) {\n            const geo = config.createGeo();"
    
    start_idx = content.find(start_str)
    
    # We will replace from start_idx up to end_str (exclusive of the rest of the loop)
    # Actually, let's just replace the body of populateWorld entirely down to the end of treeConfigs.forEach
    
    end_loop = "    });\n\n    STATE.housePositions = [];"
    end_idx = content.find(end_loop)
    
    if start_idx == -1 or end_idx == -1:
        print("Could not find targets")
        return
        
    replacement = """export function populateWorld(terrainGeo, maxHeight) {
    const vertices = terrainGeo.attributes.position.array;

    const treePositionsNormal = [];
    const treePositionsAutumn = [];
    const treePositionsPine = [];
    const treePositionsBirch = [];
    const treePositionsDead = [];
    const treePositionsBush = [];
    const treePositionsMushroom = [];
    const treePositionsGrass = [];
    const treePositionsCattail = [];
    const treePositionsLilypad = [];
    const validLandIndices = [];

    for (let i = 0; i < vertices.length; i += 3) {
        let x = vertices[i];
        let y = vertices[i + 1];
        let z = vertices[i + 2];
        let normalizedHeight = y / maxHeight;

        if (normalizedHeight > CONFIG.seaLevel + 0.02 && normalizedHeight < 0.65) {
            validLandIndices.push(i);

            const forestNoise = GLOBALS.simplex.noise2D(x * 0.007, z * 0.007);
            
            // Grass everywhere on land randomly
            if (GLOBALS.rng() < 0.12) treePositionsGrass.push(new THREE.Vector3(x, y, z));

            if (forestNoise > -0.15) {
                if (GLOBALS.rng() < 0.8) {
                    if (normalizedHeight > 0.45) {
                        if (GLOBALS.rng() < 0.85) treePositionsPine.push(new THREE.Vector3(x, y, z));
                        else treePositionsDead.push(new THREE.Vector3(x, y, z));
                    } else {
                        let r = GLOBALS.rng();
                        if (r < 0.35) treePositionsNormal.push(new THREE.Vector3(x, y, z));
                        else if (r < 0.55) treePositionsAutumn.push(new THREE.Vector3(x, y, z));
                        else if (r < 0.70) treePositionsBirch.push(new THREE.Vector3(x, y, z));
                        else if (r < 0.85) treePositionsBush.push(new THREE.Vector3(x, y, z));
                        else if (r < 0.95) treePositionsMushroom.push(new THREE.Vector3(x, y, z));
                        else treePositionsDead.push(new THREE.Vector3(x, y, z));
                    }
                }
            }
            
            if (normalizedHeight < CONFIG.seaLevel + 0.035 && GLOBALS.rng() < 0.25) {
                treePositionsCattail.push(new THREE.Vector3(x, y, z));
            }
        }
        
        if (normalizedHeight > CONFIG.seaLevel - 0.03 && normalizedHeight <= CONFIG.seaLevel && GLOBALS.rng() < 0.15) {
            treePositionsLilypad.push(new THREE.Vector3(x, CONFIG.seaLevel * maxHeight + 0.5, z));
        }
    }

    const treeConfigs = [
        {
            positions: treePositionsNormal,
            createGeo: () => {
                const trunk = new THREE.CylinderGeometry(0.35, 0.7, 5.0, 5); trunk.translate(0, 2.5, 0);
                const l1 = new THREE.DodecahedronGeometry(2.5, 1); l1.translate(0, 6.5, 0);
                const l2 = new THREE.DodecahedronGeometry(2.0, 1); l2.translate(1.5, 5.8, 1.0);
                const l3 = new THREE.DodecahedronGeometry(1.8, 1); l3.translate(-1.5, 5.5, -1.0);
                const l4 = new THREE.DodecahedronGeometry(1.6, 0); l4.translate(0.5, 7.5, -0.8);
                const l5 = new THREE.DodecahedronGeometry(1.4, 0); l5.translate(-1.0, 7.0, 1.0);
                return createMergedGeo([
                    { geo: trunk, color: 0x5c4033 }, { geo: l1, color: 0x3a7d34 }, { geo: l2, color: 0x4a9e3f },
                    { geo: l3, color: 0x2d6b28 }, { geo: l4, color: 0x55b44a }, { geo: l5, color: 0x3e8c37 }
                ]);
            }
        },
        {
            positions: treePositionsAutumn,
            createGeo: () => {
                const trunk = new THREE.CylinderGeometry(0.35, 0.7, 5.0, 5); trunk.translate(0, 2.5, 0);
                const l1 = new THREE.DodecahedronGeometry(2.5, 1); l1.translate(0, 6.5, 0);
                const l2 = new THREE.DodecahedronGeometry(2.0, 1); l2.translate(1.5, 5.8, 1.0);
                const l3 = new THREE.DodecahedronGeometry(1.8, 1); l3.translate(-1.5, 5.5, -1.0);
                const l4 = new THREE.DodecahedronGeometry(1.6, 0); l4.translate(0.5, 7.5, -0.8);
                return createMergedGeo([
                    { geo: trunk, color: 0x5c4033 }, { geo: l1, color: 0xd95a2b }, { geo: l2, color: 0xe67e22 },
                    { geo: l3, color: 0xbf360c }, { geo: l4, color: 0xd84315 }
                ]);
            }
        },
        {
            positions: treePositionsBirch,
            createGeo: () => {
                const trunk = new THREE.CylinderGeometry(0.2, 0.4, 6.0, 5); trunk.translate(0, 3.0, 0);
                const l1 = new THREE.DodecahedronGeometry(2.0, 0); l1.translate(0, 7.0, 0);
                const l2 = new THREE.DodecahedronGeometry(1.5, 0); l2.translate(1.0, 6.0, 1.0);
                const l3 = new THREE.DodecahedronGeometry(1.5, 0); l3.translate(-1.0, 6.5, -0.5);
                return createMergedGeo([
                    { geo: trunk, color: 0xe8e8e8 }, { geo: l1, color: 0x9ccc65 }, { geo: l2, color: 0x8bc34a },
                    { geo: l3, color: 0x7cb342 }
                ]);
            }
        },
        {
            positions: treePositionsDead,
            createGeo: () => {
                const trunk = new THREE.CylinderGeometry(0.25, 0.5, 4.0, 5); trunk.translate(0, 2.0, 0);
                const b1 = new THREE.CylinderGeometry(0.08, 0.15, 3.0, 4); b1.rotateZ(Math.PI * 0.2); b1.translate(1.2, 4.0, 0);
                const b2 = new THREE.CylinderGeometry(0.08, 0.15, 2.5, 4); b2.rotateZ(-Math.PI * 0.25); b2.rotateY(1.0); b2.translate(-1.0, 3.5, 0.5);
                const b3 = new THREE.CylinderGeometry(0.05, 0.1, 1.5, 4); b3.rotateZ(Math.PI * 0.3); b3.rotateY(-1.0); b3.translate(1.5, 5.0, -0.5);
                return createMergedGeo([
                    { geo: trunk, color: 0x4e4e4e }, { geo: b1, color: 0x4e4e4e }, { geo: b2, color: 0x4e4e4e }, { geo: b3, color: 0x4e4e4e }
                ]);
            }
        },
        {
            positions: treePositionsPine,
            createGeo: () => {
                const trunk = new THREE.CylinderGeometry(0.25, 0.55, 3.0, 5); trunk.translate(0, 1.5, 0);
                const l1 = new THREE.ConeGeometry(3.2, 4.0, 6); l1.translate(0, 4.0, 0);
                const l2 = new THREE.ConeGeometry(2.5, 3.5, 6); l2.translate(0, 6.0, 0);
                const l3 = new THREE.ConeGeometry(1.8, 3.0, 6); l3.translate(0, 8.0, 0);
                const l4 = new THREE.ConeGeometry(1.2, 2.5, 6); l4.translate(0, 9.5, 0);
                return createMergedGeo([
                    { geo: trunk, color: 0x3e2723 }, { geo: l1, color: 0x1b5e20 }, { geo: l2, color: 0x2e7d32 },
                    { geo: l3, color: 0x388e3c }, { geo: l4, color: 0x4caf50 }
                ]);
            }
        },
        {
            positions: treePositionsBush,
            createGeo: () => {
                const l1 = new THREE.DodecahedronGeometry(1.5, 0); l1.translate(0, 1.0, 0);
                const l2 = new THREE.DodecahedronGeometry(1.0, 0); l2.translate(1.0, 0.8, 0.5);
                const l3 = new THREE.DodecahedronGeometry(1.1, 0); l3.translate(-0.8, 0.9, -0.5);
                return createMergedGeo([
                    { geo: l1, color: 0x558b2f }, { geo: l2, color: 0x689f38 }, { geo: l3, color: 0x7cb342 }
                ]);
            }
        },
        {
            positions: treePositionsGrass,
            createGeo: () => {
                const g1 = new THREE.ConeGeometry(0.2, 1.5, 3); g1.translate(0, 0.75, 0); g1.rotateX(0.2);
                const g2 = new THREE.ConeGeometry(0.2, 1.2, 3); g2.translate(0, 0.6, 0); g2.rotateX(-0.2); g2.rotateZ(0.2);
                const g3 = new THREE.ConeGeometry(0.2, 1.0, 3); g3.translate(0, 0.5, 0); g3.rotateX(0.1); g3.rotateZ(-0.3);
                return createMergedGeo([
                    { geo: g1, color: 0x7cb342 }, { geo: g2, color: 0x8bc34a }, { geo: g3, color: 0x9ccc65 }
                ]);
            }
        },
        {
            positions: treePositionsMushroom,
            createGeo: () => {
                const stem = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 5); stem.translate(0, 0.6, 0);
                const cap = new THREE.ConeGeometry(1.2, 0.8, 7); cap.translate(0, 1.6, 0);
                const spot1 = new THREE.BoxGeometry(0.3, 0.3, 0.3); spot1.translate(0.5, 1.8, 0.5);
                const spot2 = new THREE.BoxGeometry(0.3, 0.3, 0.3); spot2.translate(-0.6, 1.7, 0.2);
                return createMergedGeo([
                    { geo: stem, color: 0xf5f5dc }, { geo: cap, color: 0xd32f2f }, 
                    { geo: spot1, color: 0xffffff }, { geo: spot2, color: 0xffffff }
                ]);
            }
        },
        {
            positions: treePositionsCattail,
            createGeo: () => {
                const stem = new THREE.CylinderGeometry(0.05, 0.05, 3.5, 4); stem.translate(0, 1.75, 0);
                const head = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 5); head.translate(0, 3.0, 0);
                const leaf1 = new THREE.ConeGeometry(0.1, 2.0, 3); leaf1.translate(0, 1.0, 0); leaf1.rotateZ(0.3);
                const leaf2 = new THREE.ConeGeometry(0.1, 1.5, 3); leaf2.translate(0, 0.75, 0); leaf2.rotateZ(-0.4);
                return createMergedGeo([
                    { geo: stem, color: 0x558b2f }, { geo: head, color: 0x5d4037 }, 
                    { geo: leaf1, color: 0x689f38 }, { geo: leaf2, color: 0x7cb342 }
                ]);
            }
        },
        {
            positions: treePositionsLilypad,
            createGeo: () => {
                const pad = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 8, 1, false, 0, Math.PI * 1.8); 
                // A small cutout for lilypad shape
                pad.translate(0, 0, 0);
                const flower = new THREE.DodecahedronGeometry(0.3, 0); flower.translate(0.5, 0.2, 0.5);
                return createMergedGeo([
                    { geo: pad, color: 0x4caf50 }, { geo: flower, color: 0xf48fb1 }
                ]);
            }
        }
    ];

    treeConfigs.forEach(config => {
        const count = config.positions.length;
        if (count > 0) {
            const geo = config.createGeo();
            const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), count);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const dummy = new THREE.Object3D();
            for (let i = 0; i < count; i++) {
                dummy.position.copy(config.positions[i]);
                const scale = 0.5 + GLOBALS.rng() * 1.2;
                dummy.scale.set(scale, scale + GLOBALS.rng() * 0.4, scale);
                dummy.rotation.y = GLOBALS.rng() * Math.PI * 2;
                
                // Align plants to ground slightly
                dummy.rotation.x = (GLOBALS.rng() - 0.5) * 0.2;
                dummy.rotation.z = (GLOBALS.rng() - 0.5) * 0.2;

                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }
            GLOBALS.scene.add(mesh);
            GLOBALS.treeInstancedMeshes.push(mesh);
        }
"""
    
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open('src/world.js', 'w', encoding='utf-8') as f:
        f.write(new_content)

update()
