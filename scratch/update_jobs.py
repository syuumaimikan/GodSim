import os

def update():
    with open('src/entities.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Define jobs
    jobs = "const JOBS = ['無職', '木こり', '農民', '建築家', '戦士'];\n"
    job_colors = """
const JOB_COLORS = {
    '無職': new THREE.Color(0xdddddd),
    '木こり': new THREE.Color(0x8B4513),
    '農民': new THREE.Color(0x228B22),
    '建築家': new THREE.Color(0xFFD700),
    '戦士': new THREE.Color(0xDC143C)
};
"""

    if "const JOBS" not in content:
        content = content.replace("export async function loadEntityData", jobs + job_colors + "\nexport async function loadEntityData")

    # In spawnCharacter, assign a job
    start = "        nationId: nation ? nation.id : null,"
    replace = start + "\n        job: JOBS[Math.floor(Math.random() * JOBS.length)],"
    if "job: JOBS" not in content:
        content = content.replace(start, replace)

    # In updateCharacters, set color based on job and move based on job
    start_update = "    for (let i = 0; i < STATE.characters.length; i++) {"
    end_update = "    if (instanceCount > 0) {"
    
    start_idx = content.find(start_update)
    end_idx = content.find(end_update)
    
    if start_idx != -1 and end_idx != -1:
        new_loop = """    for (let i = 0; i < STATE.characters.length; i++) {
        const char = STATE.characters[i];
        if (char.isDead) continue;

        if (shouldAge) {
            char.age += 1;
            if (char.age > 80 && Math.random() < 0.1) die(char, i, "老衰");
        }

        if (char.isDead) continue;

        // Job-based movement
        char.actionTimer -= deltaTime;
        if (char.actionTimer <= 0) {
            char.actionTimer = 2.0 + Math.random() * 3.0;
            
            let targetOffset = 50;
            if (char.job === '木こり') {
                // Seek trees roughly
                char.targetPos = new THREE.Vector3(
                    char.position.x + (Math.random() - 0.5) * 100,
                    0,
                    char.position.z + (Math.random() - 0.5) * 100
                );
            } else if (char.job === '農民') {
                char.targetPos = new THREE.Vector3(
                    char.position.x + (Math.random() - 0.5) * 20,
                    0,
                    char.position.z + (Math.random() - 0.5) * 20
                );
            } else if (char.job === '建築家') {
                if (STATE.housePositions && STATE.housePositions.length > 0) {
                    const hp = STATE.housePositions[Math.floor(Math.random() * STATE.housePositions.length)];
                    char.targetPos = hp.clone();
                } else {
                    char.targetPos = new THREE.Vector3(
                        char.position.x + (Math.random() - 0.5) * 50,
                        0,
                        char.position.z + (Math.random() - 0.5) * 50
                    );
                }
            } else if (char.job === '戦士') {
                char.targetPos = new THREE.Vector3(
                    char.position.x + (Math.random() - 0.5) * 150,
                    0,
                    char.position.z + (Math.random() - 0.5) * 150
                );
            } else {
                char.targetPos = new THREE.Vector3(
                    char.position.x + (Math.random() - 0.5) * 40,
                    0,
                    char.position.z + (Math.random() - 0.5) * 40
                );
            }
        }

        if (char.targetPos) {
            const dir = new THREE.Vector3().subVectors(char.targetPos, char.position);
            dir.y = 0;
            if (dir.lengthSq() > 1.0) {
                dir.normalize();
                char.position.addScaledVector(dir, char.speed * deltaTime * 10.0);
                char.rotation = Math.atan2(dir.x, dir.z);
            } else {
                char.targetPos = null;
            }
        }

        const y = getTerrainHeightAt(char.position.x, char.position.z);
        if (y < 0) {
            char.position.y = 0.5;
        } else {
            char.position.y = y + 0.5;
        }

        dummy.position.copy(char.position);
        dummy.rotation.y = char.rotation;
        dummy.scale.set(char.scale, char.scale, char.scale);
        dummy.updateMatrix();

        if (instanceCount < 5000 && GLOBALS.characterInstancedMesh) {
            GLOBALS.characterInstancedMesh.setMatrixAt(instanceCount, dummy.matrix);
            GLOBALS.characterInstancedMesh.setColorAt(instanceCount, JOB_COLORS[char.job] || JOB_COLORS['無職']);
            instanceCount++;
        }
    }
"""
        content = content[:start_idx] + new_loop + content[end_idx:]

    with open('src/entities.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
