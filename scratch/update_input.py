import os

def update():
    with open('src/input.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Import wasmExports
    import_target = "import { executeMiracleQuake, executeMiracleLightning } from './particles.js';"
    import_repl = "import { executeMiracleQuake, executeMiracleLightning } from './particles.js';\nimport { wasmExports } from './wasm.js';"
    content = content.replace(import_target, import_repl)

    # In executeMiracle
    start = "function executeMiracle(type, pos) {"
    replace = """function executeMiracle(type, pos) {
    if (type === 'lightning') {
        executeMiracleLightning(pos);
    } else if (type === 'quake') {
        executeMiracleQuake(pos);
    } else if (type === 'tornado') {
        if (wasmExports && wasmExports.triggerTornado) {
            wasmExports.triggerTornado(pos.x, pos.z);
            setTimeout(() => {
                if (wasmExports.stopTornado) wasmExports.stopTornado();
            }, 5000);
        }
    }
}"""
    content = content.replace(start + "\n    if (type === 'lightning') {\n        executeMiracleLightning(pos);\n    } else if (type === 'quake') {\n        executeMiracleQuake(pos);\n    }\n}", replace)

    # In setupInputEvents, add tornado button logic
    # First check if btn-miracle-tornado exists. Wait, it doesn't in index.html. I will add it via replace_file_content for index.html.
    # I'll just add the listener if it exists.
    setup_start = "    document.getElementById('btn-miracle-quake').addEventListener('click', () => prepareMiracle('quake'));"
    setup_replace = setup_start + "\n    const tBtn = document.getElementById('btn-miracle-tornado');\n    if (tBtn) tBtn.addEventListener('click', () => prepareMiracle('tornado'));"
    content = content.replace(setup_start, setup_replace)

    with open('src/input.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
