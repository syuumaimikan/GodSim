import os

def update():
    with open('src/world.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add wasmExports and wasmMemory to imports
    if 'import { wasmExports, wasmMemory } from' not in content:
        import_target = "import { ASSETS } from './loaders.js';"
        import_repl = "import { ASSETS } from './loaders.js';\nimport { wasmExports, wasmMemory } from './wasm.js';"
        content = content.replace(import_target, import_repl)

    start = "export function populateWorld(scene, worldSize) {"
    end = "            const mesh = new THREE.InstancedMesh(asset.geometry, asset.material, count);\n"
    
    start_idx = content.find(start)
    end_idx = content.find(end)
    
    replacement = """
export const ENV_MAPS = {
    temp: null,
    humidity: null,
    getTemp: (x, z) => {
        return GLOBALS.simplex.noise2D(x * 0.002 + 1000, z * 0.002 + 1000) * 0.5 + 0.5; // 0 to 1
    },
    getHumidity: (x, z) => {
        return GLOBALS.simplex.noise2D(x * 0.003 + 5000, z * 0.003 + 5000) * 0.5 + 0.5; // 0 to 1
    }
};

const ASSET_TYPE_MAP = {
    "tree_oak": 1,
    "tree_pine": 2,
    "tree_birch": 3,
    "tree_dead": 4,
    "tree_autumn": 5,
    "plant_bush": 6,
    "plant_grass": 7,
    "plant_mushroom": 8,
    "plant_cattail": 9,
    "plant_lilypad": 10
};

export const INSTANCED_MESHES = {};

export function populateWorld(scene, worldSize) {
    if (!GLOBALS.simplex) {
        GLOBALS.simplex = new SimplexNoise();
    }
    
    // Spawn initial entities via WASM
    let planted = 0;
    for (let i = 0; i < 3000; i++) {
        let x = (GLOBALS.rng() - 0.5) * worldSize;
        let z = (GLOBALS.rng() - 0.5) * worldSize;
        let y = getTerrainHeightAt(x, z);
        
        let temp = ENV_MAPS.getTemp(x, z);
        let hum = ENV_MAPS.getHumidity(x, z);
        
        if (y > 0.0) {
            let type = 1; // oak
            if (temp < 0.3) type = 2; // pine
            else if (temp > 0.7 && hum < 0.4) type = 4; // dead
            else if (temp > 0.6 && hum > 0.6) type = 3; // birch
            else if (temp > 0.4 && temp < 0.6 && hum > 0.5) type = 5; // autumn
            
            // Randomly pick plants instead
            if (GLOBALS.rng() < 0.5) {
                if (hum > 0.7) type = 8; // mushroom
                else if (hum < 0.3) type = 6; // bush
                else type = 7; // grass
            }
            
            wasmExports.spawnEntity(type, x, y, z, temp, hum);
            planted++;
        } else if (y > -10.0) {
            // Water plants
            if (GLOBALS.rng() < 0.5) wasmExports.spawnEntity(9, x, y, z, temp, hum); // cattail
            else wasmExports.spawnEntity(10, x, 0.5, z, temp, hum); // lilypad
            planted++;
        }
    }
    console.log("Planted initial flora: " + planted);

    // Initialize InstancedMeshes
    for (const [key, id] of Object.entries(ASSET_TYPE_MAP)) {
        const asset = ASSETS[key];
        if (asset && asset.geometry && asset.material) {
            const mesh = new THREE.InstancedMesh(asset.geometry, asset.material, 10000);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            scene.add(mesh);
            INSTANCED_MESHES[id] = mesh;
        }
    }
}

export function updateFlora() {
    const count = wasmExports.getEntityCount();
    const counters = {};
    const dummy = new THREE.Object3D();
    
    // Reset counters
    for (let i = 1; i <= 10; i++) counters[i] = 0;
    
    for (let i = 0; i < count; i++) {
        if (wasmMemory.state[i] === 1) {
            const type = wasmMemory.type[i];
            if (type >= 1 && type <= 10) {
                const idx = counters[type]++;
                const mesh = INSTANCED_MESHES[type];
                if (mesh && idx < 10000) {
                    dummy.position.set(wasmMemory.x[i], wasmMemory.y[i], wasmMemory.z[i]);
                    const scale = wasmMemory.scale[i];
                    dummy.scale.set(scale, scale, scale);
                    // Add some deterministic rotation based on position
                    dummy.rotation.y = (wasmMemory.x[i] * 1.37) % Math.PI;
                    dummy.updateMatrix();
                    mesh.setMatrixAt(idx, dummy.matrix);
                }
            }
        }
    }
    
    // Hide unused instances (scale to 0)
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 1; i <= 10; i++) {
        const mesh = INSTANCED_MESHES[i];
        if (mesh) {
            for (let j = counters[i]; j < 10000; j++) {
                mesh.setMatrixAt(j, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
        }
    }
}
"""

    if start_idx != -1 and end_idx != -1:
        # We need to replace until the end of the old populateWorld
        old_end_str = "    GLOBALS.scene.add(GLOBALS.territoryGroup);\n}"
        old_end_idx = content.find(old_end_str, start_idx) + len(old_end_str)
        content = content[:start_idx] + replacement + content[old_end_idx:]
        
        with open('src/world.js', 'w', encoding='utf-8') as f:
            f.write(content)

update()
