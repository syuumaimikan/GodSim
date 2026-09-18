import os

def update():
    with open('src/world.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    import_target = "import { updateNationsUI } from './ui.js';"
    import_repl = "import { updateNationsUI } from './ui.js';\nimport { ASSETS } from './loaders.js';"
    content = content.replace(import_target, import_repl)

    # Replace treeConfigs
    start_str = "    const treeConfigs = ["
    end_str = "        if (count > 0) {"
    
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    if start_idx == -1 or end_idx == -1:
        print("Could not find targets")
        return
        
    replacement = """    const treeConfigs = [
        { positions: treePositionsNormal, assetKey: "tree_oak" },
        { positions: treePositionsAutumn, assetKey: "tree_autumn" },
        { positions: treePositionsBirch, assetKey: "tree_birch" },
        { positions: treePositionsDead, assetKey: "tree_dead" },
        { positions: treePositionsPine, assetKey: "tree_pine" },
        { positions: treePositionsBush, assetKey: "plant_bush" },
        { positions: treePositionsGrass, assetKey: "plant_grass" },
        { positions: treePositionsMushroom, assetKey: "plant_mushroom" },
        { positions: treePositionsCattail, assetKey: "plant_cattail" },
        { positions: treePositionsLilypad, assetKey: "plant_lilypad" }
    ];

    treeConfigs.forEach(config => {
        const count = config.positions.length;
        const asset = ASSETS[config.assetKey];
        if (count > 0 && asset && asset.geometry && asset.material) {
            const mesh = new THREE.InstancedMesh(asset.geometry, asset.material, count);
"""
    
    # We need to replace the mesh creation
    # Let's find where mesh was created
    old_mesh_str = "            const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), count);"
    content = content.replace(old_mesh_str, "")
    old_geo_str = "            const geo = config.createGeo();"
    content = content.replace(old_geo_str, "")

    new_content = content[:start_idx] + replacement + content[end_idx + len(end_str):]
    with open('src/world.js', 'w', encoding='utf-8') as f:
        f.write(new_content)

update()
