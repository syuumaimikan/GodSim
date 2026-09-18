import os

def update():
    with open('src/entities.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    import_target = "import { updateCharPanel, hideCharPanel } from './ui.js';"
    import_repl = "import { updateCharPanel, hideCharPanel } from './ui.js';\nimport { ASSETS } from './loaders.js';"
    content = content.replace(import_target, import_repl)

    # Replace character init
    char_start = "export function initCharacterInstancedMesh() {"
    char_end = "    GLOBALS.scene.add(GLOBALS.characterInstancedMesh);\n}"
    
    char_start_idx = content.find(char_start)
    char_end_idx = content.find(char_end) + len(char_end)
    
    char_replacement = """export function initCharacterInstancedMesh() {
    const asset = ASSETS['char_human'];
    if (asset && asset.geometry && asset.material) {
        GLOBALS.characterInstancedMesh = new THREE.InstancedMesh(asset.geometry, asset.material, 5000);
        GLOBALS.characterInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        GLOBALS.characterInstancedMesh.castShadow = true;
        GLOBALS.characterInstancedMesh.receiveShadow = true;
        GLOBALS.scene.add(GLOBALS.characterInstancedMesh);
    }
}"""
    
    content = content[:char_start_idx] + char_replacement + content[char_end_idx:]
    
    # Replace animal init
    animal_start = "export function initAnimalInstancedMeshes() {"
    animal_end = "    GLOBALS.animalInstancedMeshes.bird = new THREE.InstancedMesh(birdGeo, mat, 1000);\n}"
    
    animal_start_idx = content.find(animal_start)
    animal_end_idx = content.find(animal_end) + len(animal_end)
    
    animal_replacement = """export function initAnimalInstancedMeshes() {
    const animals = [
        { key: 'animal_deer', name: 'deer' },
        { key: 'animal_wolf', name: 'wolf' },
        { key: 'animal_fox', name: 'fox' },
        { key: 'animal_bird', name: 'bird' }
    ];
    
    animals.forEach(anim => {
        const asset = ASSETS[anim.key];
        if (asset && asset.geometry && asset.material) {
            GLOBALS.animalInstancedMeshes[anim.name] = new THREE.InstancedMesh(asset.geometry, asset.material, 1000);
            GLOBALS.animalInstancedMeshes[anim.name].instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            GLOBALS.animalInstancedMeshes[anim.name].castShadow = true;
            GLOBALS.animalInstancedMeshes[anim.name].receiveShadow = true;
            GLOBALS.scene.add(GLOBALS.animalInstancedMeshes[anim.name]);
        }
    });
}"""

    content = content[:animal_start_idx] + animal_replacement + content[animal_end_idx:]

    with open('src/entities.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
