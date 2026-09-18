import os

def update():
    with open('src/world.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix flora spawn
    old_flora_condition = "        if (y > 0.0) {"
    new_flora_condition = "        let seaY = CONFIG.seaLevel * 300;\n        if (y > seaY + 2.0) {"
    content = content.replace(old_flora_condition, new_flora_condition)

    old_water_flora = "} else if (y > -10.0) {"
    new_water_flora = "} else if (y > seaY - 5.0 && y <= seaY + 2.0) {"
    content = content.replace(old_water_flora, new_water_flora)

    # Fix char and animal spawn
    old_char_spawn = "        if (y > 0) spawnCharacter(new THREE.Vector3(x, y, z));"
    new_char_spawn = "        if (y > CONFIG.seaLevel * 300 + 2.0) spawnCharacter(new THREE.Vector3(x, y, z));"
    content = content.replace(old_char_spawn, new_char_spawn)

    old_animal_spawn = "        if (y > 0) spawnAnimal(new THREE.Vector3(x, y, z));"
    new_animal_spawn = "        if (y > CONFIG.seaLevel * 300 + 2.0) spawnAnimal(new THREE.Vector3(x, y, z));"
    content = content.replace(old_animal_spawn, new_animal_spawn)

    with open('src/world.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
