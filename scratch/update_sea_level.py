import os

def update():
    with open('src/world.js', 'r', encoding='utf-8') as f:
        content = f.read()

    sea_fn = """
export function getSeaLevelY() {
    return CONFIG.seaLevel * 300; // maxHeight = 300
}
"""
    if "getSeaLevelY" not in content:
        content = content.replace("export function getTerrainHeightAt", sea_fn + "\nexport function getTerrainHeightAt")

    with open('src/world.js', 'w', encoding='utf-8') as f:
        f.write(content)

    with open('src/entities.js', 'r', encoding='utf-8') as f:
        content2 = f.read()

    import_repl = content2.replace("getTerrainHeightAt }", "getTerrainHeightAt, getSeaLevelY }")
    if "getSeaLevelY" not in import_repl:
        # if not found, we might need to add it differently, but it should be there.
        import_repl = import_repl.replace("from './world.js'", ", getSeaLevelY } from './world.js'")

    # in entities.js updateCharacters
    # old: if (y < 0) {
    # new: if (y <= getSeaLevelY() + 0.5) {
    import_repl = import_repl.replace("if (y < 0) {", "if (y <= getSeaLevelY() + 1.0) {")

    with open('src/entities.js', 'w', encoding='utf-8') as f:
        f.write(import_repl)
        
    with open('src/simulation.js', 'r', encoding='utf-8') as f:
        content3 = f.read()

    import_repl3 = content3.replace("getTerrainHeightAt, ENV_MAPS }", "getTerrainHeightAt, ENV_MAPS, getSeaLevelY }")
    
    # anywhere we check y > 0
    import_repl3 = import_repl3.replace("if (pos.y > 0)", "if (pos.y > getSeaLevelY() + 1.0)")
    
    with open('src/simulation.js', 'w', encoding='utf-8') as f:
        f.write(import_repl3)

update()
