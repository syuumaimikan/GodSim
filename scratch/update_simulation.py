import os

def update():
    with open('src/simulation.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add imports
    import_target = "import { rebuildHouses, getTerrainHeightAt } from './world.js';"
    import_repl = "import { rebuildHouses, getTerrainHeightAt, ENV_MAPS } from './world.js';\nimport { executeMiracleTornado, executeMiracleQuake, executeMiracleLightning } from './particles.js';"
    if 'ENV_MAPS' not in content:
        content = content.replace(import_target, import_repl)

    # In updateWorldTime, maybe check for disasters randomly
    # Instead of every frame, we can do it onNewDay or randomly during the day
    # Let's add it to onNewDay for simplicity.
    on_new_day = "    STATE.globalTechLevel += 1;\n"
    disaster_logic = """
    // Natural disasters logic
    if (Math.random() < 0.1) { // 10% chance every day for a disaster
        const size = CONFIG.worldSize || 2500;
        const x = (Math.random() - 0.5) * size;
        const z = (Math.random() - 0.5) * size;
        const temp = ENV_MAPS.getTemp(x, z);
        const hum = ENV_MAPS.getHumidity(x, z);
        
        if (temp > 0.7 && hum < 0.3 && Math.random() < 0.5) {
            // High temp, low humidity -> Quake or Lightning (Fire)
            if (Math.random() < 0.5) {
                executeMiracleQuake(new THREE.Vector3(x, getTerrainHeightAt(x, z), z));
                addLog("乾燥地帯で大地震が自然発生しました！", "alert");
            } else {
                executeMiracleLightning(new THREE.Vector3(x, getTerrainHeightAt(x, z), z));
                addLog("乾燥地帯で落雷が発生しました！", "alert");
            }
        } else if (temp > 0.6 && hum > 0.6 && Math.random() < 0.5) {
            // High temp, high humidity -> Tornado
            executeMiracleTornado(new THREE.Vector3(x, getTerrainHeightAt(x, z), z));
            addLog("熱帯地域で竜巻が自然発生しました！", "alert");
        } else if (Math.random() < 0.2) {
            // Random chance for anywhere
            executeMiracleLightning(new THREE.Vector3(x, getTerrainHeightAt(x, z), z));
            addLog("落雷が自然発生しました！", "system");
        }
    }
"""
    if "Natural disasters logic" not in content:
        content = content.replace(on_new_day, on_new_day + disaster_logic)

    with open('src/simulation.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
