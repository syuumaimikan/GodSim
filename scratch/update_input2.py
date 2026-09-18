import os

def update():
    with open('src/input.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Import generateWorld
    import_target = "import { teleportCameraTo, rebuildHouses } from './world.js';"
    import_repl = "import { teleportCameraTo, rebuildHouses, generateWorld } from './world.js';"
    if 'generateWorld' not in content:
        content = content.replace(import_target, import_repl)

    # In setupInputEvents, add the event listeners for generate and skip
    start = "    document.getElementById('btn-close-char').addEventListener('click', hideCharPanel);"
    replace = """    
    const btnGen = document.getElementById('btn-generate');
    if (btnGen) {
        btnGen.addEventListener('click', () => {
            const seed = document.getElementById('seed-input').value || "GodSim";
            generateWorld(seed);
        });
    }

    const btnSkip = document.getElementById('btn-skip-100');
    if (btnSkip) {
        btnSkip.addEventListener('click', skip100Years);
    }
""" + start
    content = content.replace(start, replace)

    # Add skip100Years function at the end
    skip_fn = """
export function skip100Years() {
    addLog("100年分時間を進めています...", "system");
    
    // Disable UI during skip? Not strictly necessary if it's synchronous and blocks UI,
    // but we can just loop the logic directly.
    const steps = 36500; // 100 years * 365 days
    const delta = 1.0; // 1 day per step roughly
    
    // We run WASM logic
    if (wasmExports && wasmExports.update) {
        for (let i = 0; i < steps; i++) {
            wasmExports.update(delta, 0.5, 0.5);
        }
    }
    
    // We also run JS entity logic
    import('./entities.js').then(({ updateCharacters, updateAnimals }) => {
        for (let i = 0; i < steps / 100; i++) { // run fewer times for JS to save CPU, but bigger delta
            updateCharacters(delta * 100);
            updateAnimals(delta * 100);
        }
        
        STATE.worldTime += steps * 0.01;
        
        import('./world.js').then(({ updateFlora }) => {
            updateFlora();
            addLog("100年の歳月が流れました。", "system");
        });
    });
}
"""
    if "skip100Years" not in content:
        content += skip_fn

    with open('src/input.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
