import { CONFIG } from './config.js';
import { STATE, GLOBALS } from './state.js';
import { createMergedGeo, addLog } from './utils.js';
import { getTerrainHeightAt } from './world.js';
import { updateCharPanel, hideCharPanel } from './ui.js';
import { ASSETS } from './loaders.js';

let nameData = { namePrefixes: [], nameSuffixes: [], nationPrefixes: [], nationRoots: [] };
let diseasesData = [];

const JOBS = ['無職', '木こり', '農民', '建築家', '戦士'];

const JOB_COLORS = {
    '無職': new THREE.Color(0xdddddd),
    '木こり': new THREE.Color(0x8B4513),
    '農民': new THREE.Color(0x228B22),
    '建築家': new THREE.Color(0xFFD700),
    '戦士': new THREE.Color(0xDC143C)
};

export async function loadEntityData() {
    try {
        const namesRes = await fetch('./res/names.json');
        nameData = await namesRes.json();
        const diseasesRes = await fetch('./res/diseases.json');
        diseasesData = await diseasesRes.json();
    } catch (e) {
        console.error("Failed to load entity data", e);
    }
}

export function generateName() {
    const { namePrefixes, nameSuffixes } = nameData;
    if (!namePrefixes.length) return "無名";
    const p = namePrefixes[Math.floor(Math.random() * namePrefixes.length)];
    const s = nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)];
    const p2 = (Math.random() > 0.5) ? namePrefixes[Math.floor(Math.random() * namePrefixes.length)] : "";
    return p + p2 + s;
}

export function generateNationName() {
    const { nationPrefixes, nationRoots } = nameData;
    if (!nationRoots.length) return "国";
    const r = nationRoots[Math.floor(Math.random() * nationRoots.length)];
    if (Math.random() > 0.6) {
        const p = nationPrefixes[Math.floor(Math.random() * nationPrefixes.length)];
        return p + r;
    }
    return r;
}

export function initCharacterInstancedMesh() {
    const asset = ASSETS['char_human'];
    if (asset && asset.geometry && asset.material) {
        GLOBALS.characterInstancedMesh = new THREE.InstancedMesh(asset.geometry, asset.material, 5000);
        GLOBALS.characterInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        GLOBALS.characterInstancedMesh.castShadow = true;
        GLOBALS.characterInstancedMesh.receiveShadow = true;
        GLOBALS.scene.add(GLOBALS.characterInstancedMesh);
    }
}

export function initAnimalInstancedMeshes() {
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
}


export function spawnCharacter(position) {
    let nearestNation = null;
    let minDist = Infinity;
    STATE.nations.forEach(n => {
        const dist = position.distanceTo(n.position);
        if (dist < 300) {
            if (dist < minDist) {
                minDist = dist;
                nearestNation = n;
            }
        }
    });

    const charData = {
        id: Math.random().toString(36).substr(2, 9),
        position: position.clone(),
        rotationY: 0,
        scale: 1.0,
        isVisible: true,
        name: generateName(),
        age: 18 + Math.floor(Math.random() * 12),
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        maxLifespan: 55 + Math.floor(Math.random() * 30),
        health: '健康',
        nation: nearestNation ? nearestNation.name : '放浪者',

        isDead: false,
        isDetailed: false,
        organs: null,
        targetPos: null,
        speed: 0.07 + Math.random() * 0.05,
        actionTimer: 0,
        currentAction: 'wandering',
        diseases: []
    };

    STATE.characters.push(charData);
    return charData;
}

export function spawnAnimal(position) {
    const r = Math.random();
    let type, isFlying = false;

    if (r < 0.25) { type = 'deer'; }
    else if (r < 0.5) { type = 'wolf'; }
    else if (r < 0.75) { type = 'fox'; }
    else { type = 'bird'; isFlying = true; }

    const animalData = {
        type: type,
        position: position.clone(),
        rotationY: 0,
        speed: 0.06 + Math.random() * 0.04,
        isFlying: isFlying,
        actionTimer: 0,
        targetPos: null
    };
    STATE.animals.push(animalData);
}

export function die(char, index, reason) {
    addLog(`${char.name}(${char.age}歳) が死亡。死因: ${reason}`, 'death');
    char.isDead = true;
    char.targetPos = null;
    char.timeSinceDeath = 0;
}

export function selectCharacter(char) {
    STATE.selectedChar = char;
    STATE.characters.forEach(c => { c.scale = 1.0; });
    char.scale = 1.4;
    updateCharPanel(char);

    const panel = document.getElementById('char-info-panel');
    if (panel) {
        panel.classList.remove('hidden');
        setTimeout(() => panel.classList.remove('translate-y-4', 'opacity-0'), 10);
    }
}

export function updateCharacters(deltaTime) {
    const shouldAge = Math.random() < (deltaTime * 0.04);
    const camPos = GLOBALS.camera.position;
    let instanceCount = 0;
    const dummy = new THREE.Object3D();

    for (let i = STATE.characters.length - 1; i >= 0; i--) {
        const char = STATE.characters[i];

        if (char.isDead) {
            char.timeSinceDeath = (char.timeSinceDeath || 0) + deltaTime;
            if (char.currentAction === 'dead_drown' && char.isVisible) {
                char.rotationY += 0.1;
                char.position.y -= deltaTime * 2;
            }
            if (char.timeSinceDeath > 5.0) {
                char.isVisible = false;
            }
        } else {
            const inView = GLOBALS.frustum.containsPoint(char.position);
            const distToCam = char.position.distanceToSquared(camPos);
            char.isVisible = inView || distToCam < 4000000;

            if (shouldAge) char.age++;

            if (STATE.isPossessing && STATE.selectedChar === char) {
                const moveSpeed = 16;
                const rotSpeed = 3.2;
                let moved = false;
                let moveDir = 0;

                if (STATE.keys.a) char.rotationY += rotSpeed * deltaTime;
                if (STATE.keys.d) char.rotationY -= rotSpeed * deltaTime;
                if (STATE.keys.w) { moveDir = 1; moved = true; }
                if (STATE.keys.s) { moveDir = -1; moved = true; }

                if (moved) {
                    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), char.rotationY);
                    char.position.add(forward.multiplyScalar(moveDir * moveSpeed * deltaTime));
                    char.currentAction = 'possessed';
                } else {
                    char.currentAction = 'idle';
                }

                char.position.y = getTerrainHeightAt(char.position.x, char.position.z);
            } else {
                if (Math.random() < 0.00015 * (char.age / 40)) {
                    die(char, i, "自然死");
                } else if (Math.random() < 0.00004 && char.diseases.length === 0) {
                    const newDisease = diseasesData[Math.floor(Math.random() * diseasesData.length)];
                    if (newDisease) char.diseases.push(newDisease);
                } else if (char.age >= char.maxLifespan) {
                    die(char, i, "老衰");
                }

                if (!char.isDead && char.diseases.length > 0) {
                    const dNames = char.diseases.map(d => d.name).join(',');
                    char.health = `罹患(${dNames})`;

                    for (let d of char.diseases) {
                        if (Math.random() < d.lethality * deltaTime) {
                            die(char, i, d.name);
                            break;
                        }
                        if (d.contagious && Math.random() < (d.spreadChance * deltaTime * 6)) {
                            const radiusSq = d.spreadRadius * d.spreadRadius;
                            for (let j = 0; j < STATE.characters.length; j++) {
                                const other = STATE.characters[j];
                                if (other !== char && !other.isDead && !other.diseases.includes(d)) {
                                    if (char.position.distanceToSquared(other.position) < radiusSq) {
                                        other.diseases.push(d);
                                    }
                                }
                            }
                        }
                    }
                } else if (!char.isDead) {
                    char.health = '健康';
                }

                if (!char.isDead && !STATE.isPossessing) {
                    if (char.targetPos) {
                        const dir = new THREE.Vector3().subVectors(char.targetPos, char.position);
                        dir.y = 0;
                        const dist = dir.length();
                        if (dist > 0.2) {
                            dir.normalize();
                            const nextPos = char.position.clone().add(dir.multiplyScalar(char.speed * deltaTime * 180));
                            const nextY = getTerrainHeightAt(nextPos.x, nextPos.z);
                            if (nextY <= (CONFIG.seaLevel + 0.01) * 300) {
                                char.targetPos = null;
                            } else {
                                char.position.copy(nextPos);
                                dummy.position.copy(char.position);
                                dummy.lookAt(char.position.clone().add(dir));
                                char.rotationY = dummy.rotation.y;
                            }
                        } else {
                            char.targetPos = null;
                            if (char.currentAction === 'moving' || char.currentAction === 'building') {
                                char.actionTimer = 1.0 + Math.random() * 2.0;
                            }
                        }
                        char.position.y = getTerrainHeightAt(char.position.x, char.position.z);
                    } else {
                        char.actionTimer -= deltaTime;
                        if (char.actionTimer <= 0) {
                            decideAction(char);
                        }
                    }
                }
            }
        }

        if (char.isVisible) {
            dummy.position.copy(char.position);
            dummy.rotation.y = char.rotationY;
            if (char.isDead && char.currentAction === 'dead_drown') {
                dummy.rotation.z = Math.PI / 2;
            }
            const finalScale = char.isDead ? char.scale * 0.25 : char.scale;
            dummy.scale.set(finalScale, finalScale, finalScale);
            dummy.updateMatrix();

            GLOBALS.characterInstancedMesh.setMatrixAt(instanceCount, dummy.matrix);

            const nData = STATE.nations.find(n => n.name === char.nation);
            const color = nData ? nData.color : new THREE.Color(0x888888);
            GLOBALS.characterInstancedMesh.setColorAt(instanceCount, color);

            instanceCount++;
        }
    }

    if (GLOBALS.characterInstancedMesh) {
        GLOBALS.characterInstancedMesh.count = instanceCount;
        GLOBALS.characterInstancedMesh.instanceMatrix.needsUpdate = true;
        if (GLOBALS.characterInstancedMesh.instanceColor) GLOBALS.characterInstancedMesh.instanceColor.needsUpdate = true;
    }

    const popEl = document.getElementById('ui-pop');
    if (popEl) popEl.innerText = STATE.characters.filter(c => !c.isDead).length;
}

export function updateAnimals(deltaTime) {
    const halfSize = CONFIG.worldSize / 2 - 10;
    let deerCount = 0, wolfCount = 0, foxCount = 0, birdCount = 0;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < STATE.animals.length; i++) {
        const animal = STATE.animals[i];

        if (animal.targetPos) {
            const dir = new THREE.Vector3().subVectors(animal.targetPos, animal.position);
            dir.y = 0;
            if (dir.length() > 0.2) {
                dir.normalize();
                const nextPos = animal.position.clone().add(dir.multiplyScalar(animal.speed * deltaTime * 150));
                const nextY = getTerrainHeightAt(nextPos.x, nextPos.z);

                if (!animal.isFlying && nextY <= (CONFIG.seaLevel + 0.01) * 300) {
                    animal.targetPos = null;
                } else {
                    animal.position.copy(nextPos);
                    dummy.position.copy(animal.position);
                    dummy.lookAt(animal.position.clone().add(dir));
                    animal.rotationY = dummy.rotation.y;
                }
            } else {
                animal.targetPos = null;
                animal.actionTimer = 2.0 + Math.random() * 3.0;
            }
            const groundY = getTerrainHeightAt(animal.position.x, animal.position.z);
            animal.position.y = animal.isFlying ? groundY + 18 : groundY;
        } else {
            animal.actionTimer -= deltaTime;
            if (animal.actionTimer <= 0) {
                animal.actionTimer = 3.0 + Math.random() * 5.0;
                const angle = Math.random() * Math.PI * 2;
                const dist = 15 + Math.random() * 25;
                animal.targetPos = new THREE.Vector3(
                    animal.position.x + Math.cos(angle) * dist,
                    0,
                    animal.position.z + Math.sin(angle) * dist
                );
                animal.targetPos.x = THREE.MathUtils.clamp(animal.targetPos.x, -halfSize, halfSize);
                animal.targetPos.z = THREE.MathUtils.clamp(animal.targetPos.z, -halfSize, halfSize);
            }
        }

        dummy.position.copy(animal.position);
        dummy.rotation.y = animal.rotationY || 0;
        dummy.updateMatrix();

        if (animal.type === 'deer') {
            GLOBALS.animalInstancedMeshes.deer.setMatrixAt(deerCount++, dummy.matrix);
        } else if (animal.type === 'wolf') {
            GLOBALS.animalInstancedMeshes.wolf.setMatrixAt(wolfCount++, dummy.matrix);
        } else if (animal.type === 'fox') {
            GLOBALS.animalInstancedMeshes.fox.setMatrixAt(foxCount++, dummy.matrix);
        } else if (animal.type === 'bird') {
            GLOBALS.animalInstancedMeshes.bird.setMatrixAt(birdCount++, dummy.matrix);
        }
    }

    if (GLOBALS.animalInstancedMeshes.deer) { GLOBALS.animalInstancedMeshes.deer.count = deerCount; GLOBALS.animalInstancedMeshes.deer.instanceMatrix.needsUpdate = true; }
    if (GLOBALS.animalInstancedMeshes.wolf) { GLOBALS.animalInstancedMeshes.wolf.count = wolfCount; GLOBALS.animalInstancedMeshes.wolf.instanceMatrix.needsUpdate = true; }
    if (GLOBALS.animalInstancedMeshes.fox) { GLOBALS.animalInstancedMeshes.fox.count = foxCount; GLOBALS.animalInstancedMeshes.fox.instanceMatrix.needsUpdate = true; }
    if (GLOBALS.animalInstancedMeshes.bird) { GLOBALS.animalInstancedMeshes.bird.count = birdCount; GLOBALS.animalInstancedMeshes.bird.instanceMatrix.needsUpdate = true; }
}

export function findValidLandPos(basePos, radius) {
    for (let i = 0; i < 6; i++) {
        const target = basePos.clone().add(new THREE.Vector3((Math.random() - 0.5) * radius * 2, 0, (Math.random() - 0.5) * radius * 2));
        const y = getTerrainHeightAt(target.x, target.z);
        if (y > (CONFIG.seaLevel + 0.02) * 300) {
            return target;
        }
    }
    return null;
}

export function decideAction(char) {
    const r = Math.random();
    const nation = STATE.nations.find(n => n.name === char.nation);

    if (nation && STATE.wars.length > 0) {
        const activeWar = STATE.wars.find(w => w.attacker.id === nation.id || w.defender.id === nation.id);
        if (activeWar && r < 0.35) {
            char.currentAction = 'war';
            char.actionTimer = 8.0;
            const enemy = activeWar.attacker.id === nation.id ? activeWar.defender : activeWar.attacker;
            char.targetPos = enemy.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 50, 0, (Math.random() - 0.5) * 50));
            return;
        }
    }

    if (r < 0.2 && nation) {
        char.currentAction = 'building';
        char.actionTimer = 4.0;
        char.targetPos = findValidLandPos(nation.position, 60);
    } else {
        char.currentAction = 'wandering';
        char.actionTimer = 3.5;
        char.targetPos = findValidLandPos(char.position, 30);
    }
}
