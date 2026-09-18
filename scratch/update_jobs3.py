import os

def update():
    with open('src/entities.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Define jobs
    jobs = "export const JOBS = ['無職', '木こり', '農民', '建築家', '戦士'];\n"
    job_colors = """
const JOB_COLORS = {
    '無職': new THREE.Color(0xdddddd),
    '木こり': new THREE.Color(0x8B4513),
    '農民': new THREE.Color(0x228B22),
    '建築家': new THREE.Color(0xFFD700),
    '戦士': new THREE.Color(0xDC143C)
};
"""

    if "export const JOBS" not in content:
        content = content.replace("export async function loadEntityData", jobs + job_colors + "\nexport async function loadEntityData")

    start = "        nation: nearestNation ? nearestNation.name : '放浪者',"
    replace = start + "\n        job: JOBS[Math.floor(Math.random() * JOBS.length)],"
    if "job: JOBS" not in content:
        content = content.replace(start, replace)

    # Replace color setting
    color_start = "GLOBALS.characterInstancedMesh.setColorAt(instanceCount, colorWhite);"
    color_replace = "GLOBALS.characterInstancedMesh.setColorAt(instanceCount, JOB_COLORS[char.job] || JOB_COLORS['無職']);"
    
    if color_start in content:
        content = content.replace(color_start, color_replace)

    # Now let's inject job-based movement logic inside updateCharacters
    # we can inject it right after `char.rotationY = Math.atan2(dir.x, dir.z);`
    # or inside the AI logic block: `if (!STATE.isPossessing || STATE.selectedChar !== char)`
    ai_start = """            if (!STATE.isPossessing || STATE.selectedChar !== char) {
                char.actionTimer -= deltaTime;
                if (char.actionTimer <= 0) {
                    char.actionTimer = 2.0 + Math.random() * 3.0;
                    if (Math.random() > 0.3) {
                        char.targetPos = new THREE.Vector3(
                            char.position.x + (Math.random() - 0.5) * 40,
                            0,
                            char.position.z + (Math.random() - 0.5) * 40
                        );
                    } else {
                        char.targetPos = null;
                    }
                }
            }"""
            
    ai_replace = """            if (!STATE.isPossessing || STATE.selectedChar !== char) {
                char.actionTimer -= deltaTime;
                if (char.actionTimer <= 0) {
                    char.actionTimer = 2.0 + Math.random() * 3.0;
                    if (Math.random() > 0.1) {
                        let tx = char.position.x;
                        let tz = char.position.z;
                        if (char.job === '木こり') {
                            tx += (Math.random() - 0.5) * 100;
                            tz += (Math.random() - 0.5) * 100;
                        } else if (char.job === '農民') {
                            tx += (Math.random() - 0.5) * 20;
                            tz += (Math.random() - 0.5) * 20;
                        } else if (char.job === '建築家') {
                            if (STATE.housePositions && STATE.housePositions.length > 0) {
                                const hp = STATE.housePositions[Math.floor(Math.random() * STATE.housePositions.length)];
                                tx = hp.x; tz = hp.z;
                            } else {
                                tx += (Math.random() - 0.5) * 50; tz += (Math.random() - 0.5) * 50;
                            }
                        } else if (char.job === '戦士') {
                            tx += (Math.random() - 0.5) * 150;
                            tz += (Math.random() - 0.5) * 150;
                        } else {
                            tx += (Math.random() - 0.5) * 40; tz += (Math.random() - 0.5) * 40;
                        }
                        char.targetPos = new THREE.Vector3(tx, 0, tz);
                    } else {
                        char.targetPos = null;
                    }
                }
            }"""
            
    if ai_start in content:
        content = content.replace(ai_start, ai_replace)
        
    with open('src/entities.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
