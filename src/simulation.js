import { CONFIG } from './config.js';
import { STATE, GLOBALS } from './state.js';
import { addLog } from './utils.js';
import { saveSnapshot } from './save.js';
import { rebuildHouses, getTerrainHeightAt, ENV_MAPS, getSeaLevelY } from './world.js';
import { executeMiracleTornado, executeMiracleQuake, executeMiracleLightning } from './particles.js';
import { updateNationsUI, updateUI } from './ui.js';
import { spawnCharacter, generateNationName } from './entities.js';

let nextNationId = 0;

export function updateWorldTime(deltaTime) {
    STATE.worldTime += deltaTime / (CONFIG.dayDurationMS / 1000);
    if (STATE.worldTime >= 1.0) {
        STATE.worldTime -= 1.0;
        STATE.dayCount++;
        onNewDay();
    }
    updateUI();

    if (STATE.nightVision) {
        GLOBALS.ambientLight.intensity = 1.2;
        GLOBALS.dirLight.intensity = 0.5;
        GLOBALS.scene.background.setHex(0x0a2f0a);
        GLOBALS.starsGroup.visible = false;
    } else {
        if (STATE.worldTime > 0.75 || STATE.worldTime < 0.25) {
            GLOBALS.ambientLight.intensity = 0.25;
            GLOBALS.dirLight.intensity = 0.15;
            GLOBALS.scene.background.setHex(0x0c0c24);
            GLOBALS.starsGroup.visible = true;
            GLOBALS.starsGroup.children.forEach(c => { if (c.material) c.material.opacity = 0.9; });
        } else {
            GLOBALS.ambientLight.intensity = 0.7;
            GLOBALS.dirLight.intensity = 1.1;
            GLOBALS.scene.background.setHex(0x87CEEB);
            GLOBALS.starsGroup.visible = false;
        }
    }

    const theta = (STATE.worldTime - 0.25) * Math.PI * 2;
    GLOBALS.dirLight.position.set(Math.cos(theta) * 1500, Math.sin(theta) * 1500, 500);
}

export function updateDiplomacyAndWar() {
    STATE.nations.forEach(n => {
        const pop = STATE.characters.filter(c => c.nation === n.name && !c.isDead).length;
        n.resources += (15 + n.techLevel * 4) - (pop * 0.4);

        if (n.resources < 150) {
            STATE.nations.forEach(other => {
                if (n.id !== other.id) n.relations[other.id] -= 12;
            });
        }
    });

    STATE.nations.forEach(attacker => {
        STATE.nations.forEach(defender => {
            if (attacker.id >= defender.id) return;
            const rel = attacker.relations[defender.id];
            const isAtWar = STATE.wars.some(w => (w.attacker.id === attacker.id && w.defender.id === defender.id) || (w.attacker.id === defender.id && w.defender.id === attacker.id));

            if (rel < -80 && !isAtWar) {
                STATE.wars.push({ attacker, defender, reason: attacker.resources < 150 ? "資源の強奪" : "領土紛争と報復", duration: 0 });
                addLog(`[開戦] ${attacker.name} と ${defender.name} が開戦！`, 'alert');
            }
        });
    });

    for (let i = STATE.wars.length - 1; i >= 0; i--) {
        const war = STATE.wars[i];
        war.duration++;
        if (war.duration > 10) {
            addLog(`[停戦] ${war.attacker.name} と ${war.defender.name} が和平条約を締結。`, 'alert');
            STATE.wars.splice(i, 1);
        }
    }
}

export function onNewDay() {
    if (STATE.dayCount % 5 === 0) saveSnapshot();
    if (STATE.dayCount % CONFIG.autoSaveInterval === 0) {
        import('./save.js').then(m => m.saveGame(0, true)); // auto save slot 0
    }
    STATE.globalTechLevel += 1;

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

    for (let i = STATE.nations.length - 1; i >= 0; i--) {
        const n = STATE.nations[i];

        let isAtWar = STATE.wars.some(w => w.attacker.id === n.id || w.defender.id === n.id);
        if (isAtWar) n.stability -= (1 + Math.random() * 2);
        else n.stability += (0.5 + Math.random());

        if (n.resources < 100) n.stability -= 3;
        else if (n.resources > 500) n.stability += 1;

        n.stability = Math.max(0, Math.min(100, n.stability));

        if (n.stability < 20 && Math.random() < 0.15) {
            addLog(`【革命勃発】圧政と疲弊の末、${n.name} で革命が起き、国が滅亡した！`, 'alert');

            for (let j = STATE.housePositions.length - 1; j >= 0; j--) {
                if (STATE.houseNations[j] === n.id) {
                    STATE.housePositions.splice(j, 1);
                    STATE.houseNations.splice(j, 1);
                }
            }
            STATE.characters.forEach(c => {
                if (c.nation === n.name) {
                    c.nation = '放浪者';
                    c.color = new THREE.Color(0x888888);
                }
            });

            STATE.nations.splice(i, 1);
            rebuildHouses();
            continue;
        }

        if (Math.random() < 0.35) {
            n.techLevel += 1;
            n.resources += 250;
            if (Math.random() < 0.5) {
                STATE.housePositions.push(n.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40)));
                STATE.houseNations.push(n.id);
                if (!STATE.houseProgress) STATE.houseProgress = [];
                STATE.houseProgress.push(0);
                rebuildHouses();
                addLog(`${n.name} が都市を拡張した。`);
            }
        }
    }

    const wanderers = STATE.characters.filter(c => !c.isDead && c.nation === '放浪者');
    if (wanderers.length >= 3 && Math.random() < 0.3) {
        const w = wanderers[Math.floor(Math.random() * wanderers.length)];
        const pos = w.position.clone();
        let tooCloseToNation = false;
        STATE.nations.forEach(n => {
            if (pos.distanceTo(n.position) < 400) tooCloseToNation = true;
        });

        if (!tooCloseToNation) {
            nextNationId = STATE.nations.length > 0 ? Math.max(...STATE.nations.map(n => n.id)) + 1 : 1;
            const newNation = {
                id: nextNationId,
                name: generateNationName(),
                color: new THREE.Color().setHSL(Math.random(), 0.85, 0.55),
                position: pos,
                techLevel: 1,
                resources: 200,
                stability: 100,
                relations: {}
            };
            STATE.nations.forEach(n => {
                newNation.relations[n.id] = 20;
                n.relations[newNation.id] = 20;
            });
            STATE.nations.push(newNation);

            STATE.housePositions.push(pos.clone().add(new THREE.Vector3(10, 0, 10)));
            STATE.houseNations.push(newNation.id);
            if (!STATE.houseProgress) STATE.houseProgress = [];
            STATE.houseProgress.push(0);
            rebuildHouses();

            let foundedCount = 0;
            wanderers.forEach(c => {
                if (c.position.distanceTo(pos) < 200 && foundedCount < 5) {
                    c.nation = newNation.name;
                    c.color = newNation.color.clone();
                    foundedCount++;
                }
            });
            addLog(`【建国】放浪者たちが集い、${newNation.name} の村を形成した！`, 'alert');
        }
    }

    updateDiplomacyAndWar();
    updateNationsUI();

    if (Math.random() < 0.5) {
        const alive = STATE.characters.filter(c => !c.isDead);
        if (alive.length > 0) {
            const parent = alive[Math.floor(Math.random() * alive.length)];
            const spawnPos = parent.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4));
            spawnPos.y = getTerrainHeightAt(spawnPos.x, spawnPos.z);
            const newChar = spawnCharacter(spawnPos);
            newChar.age = 0;
            newChar.nation = parent.nation;

            if (parent.nation !== '放浪者') {
                const nat = STATE.nations.find(n => n.name === parent.nation);
                if (nat) {
                    newChar.color = nat.color.clone();
                }
            }

            addLog(`${parent.nation} に新たな生命 '${newChar.name}' が誕生。`, 'birth');
        }
    }
}

export function getNationTitle(nation, pop) {
    if (nation.techLevel >= 20 || pop >= 15) return "国";
    if (nation.techLevel >= 10 || pop >= 8) return "都市";
    if (nation.techLevel >= 5 || pop >= 5) return "町";
    return "村";
}
