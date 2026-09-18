import os

def update():
    with open('src/world.js', 'r', encoding='utf-8') as f:
        content = f.read()

    start = "export function rebuildHouses() {"
    end = "        GLOBALS.territoryGroup.add(tMesh);\n    });\n    GLOBALS.scene.add(GLOBALS.territoryGroup);\n}"
    
    start_idx = content.find(start)
    end_idx = content.find(end) + len(end)
    
    replacement = """export function rebuildHouses() {
    if (GLOBALS.houseInstancedMesh) GLOBALS.scene.remove(GLOBALS.houseInstancedMesh);
    if (GLOBALS.territoryGroup) GLOBALS.scene.remove(GLOBALS.territoryGroup);

    const houseCount = STATE.housePositions.length;
    
    const asset = ASSETS['house_lvl1'];
    if (houseCount > 0 && asset && asset.geometry && asset.material) {
        GLOBALS.houseInstancedMesh = new THREE.InstancedMesh(asset.geometry, asset.material, houseCount);
        GLOBALS.houseInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        GLOBALS.houseInstancedMesh.castShadow = true;
        GLOBALS.houseInstancedMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < houseCount; i++) {
            dummy.position.copy(STATE.housePositions[i]);
            dummy.rotation.y = (i * 1.37) % Math.PI;
            
            const p = STATE.houseProgress && STATE.houseProgress[i] !== undefined ? Math.min(1, Math.max(0, STATE.houseProgress[i])) : 1.0;
            const targetScale = 1.0 + ((i * 0.15) % 0.4);
            const scale = targetScale * (0.1 + p * 0.9);
            
            dummy.scale.set(scale, scale, scale);
            const yOffset = (1.0 - p) * -3.0;
            dummy.position.y += yOffset;
            
            dummy.updateMatrix();

            const nId = STATE.houseNations[i];
            const nation = STATE.nations.find(n => n.id === nId);
            if (nation) {
                GLOBALS.houseInstancedMesh.setColorAt(i, nation.color);
            }
            GLOBALS.houseInstancedMesh.setMatrixAt(i, dummy.matrix);
        }
        GLOBALS.scene.add(GLOBALS.houseInstancedMesh);
    }

    GLOBALS.territoryGroup = new THREE.Group();
    const tGeo = new THREE.PlaneGeometry(120, 120);
    tGeo.rotateX(-Math.PI / 2);

    STATE.nations.forEach(n => {
        const tMat = new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0.15, depthWrite: false });
        const tMesh = new THREE.Mesh(tGeo, tMat);
        tMesh.position.copy(n.position);
        tMesh.position.y = getTerrainHeightAt(n.position.x, n.position.z) + 0.5;
        GLOBALS.territoryGroup.add(tMesh);
    });
    GLOBALS.scene.add(GLOBALS.territoryGroup);
}"""

    if start_idx != -1 and end_idx > start_idx:
        content = content[:start_idx] + replacement + content[end_idx:]
        with open('src/world.js', 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print("rebuildHouses not found")

update()
