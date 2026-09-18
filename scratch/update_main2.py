import os

def update():
    with open('src/main.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # import updateFlora
    content = content.replace("import { updateMinimapOverlay, updateHouses } from './world.js';", "import { updateMinimapOverlay, updateHouses, updateFlora } from './world.js';")

    # add to animate loop
    animate_start = "function animate(time) {"
    
    if animate_start in content:
        replace = """function animate(time) {
    requestAnimationFrame(animate);

    if (!STATE.isPaused) {
        const delta = (time - STATE.lastFrameTime) * 0.001 * STATE.timeSpeed;
        
        // update WASM simulation
        if (wasmExports && wasmExports.update) {
            // pass some global temp/hum for the environment
            wasmExports.update(delta, 0.5, 0.5); 
            updateFlora();
        }
"""
        # Find where to inject
        # Basically just after `const delta = ...`
        delta_str = "const delta = (time - STATE.lastFrameTime) * 0.001 * STATE.timeSpeed;"
        if delta_str in content:
            content = content.replace(delta_str, delta_str + "\n        if (wasmExports && wasmExports.update) {\n            wasmExports.update(delta, 0.5, 0.5);\n            updateFlora();\n        }\n")

    with open('src/main.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
