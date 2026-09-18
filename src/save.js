
import { STATE, GLOBALS } from './state.js';
import { addLog } from './utils.js';
import { spawnCharacter } from './entities.js';
import { generateWorld, rebuildHouses } from './world.js';
import { updateNationsUI } from './ui.js';

export function saveSnapshot() {
    STATE.snapshots.push({
        dayCount: STATE.dayCount,
        worldTime: STATE.worldTime,
        chars: STATE.characters.filter(c => !c.isDead).map(c => ({
            name: c.name, age: c.age, gender: c.gender, nation: c.nation,
            x: c.position.x, y: c.position.y, z: c.position.z
        }))
    });
    if (STATE.snapshots.length > 10) STATE.snapshots.shift();
}

export function rewind() {
    if (STATE.snapshots.length === 0) return addLog("巻き戻せるデータがありません。", "alert");
    const snap = STATE.snapshots.pop();
    
    // Clear existing characters
    STATE.characters = [];
    
    STATE.dayCount = snap.dayCount;
    STATE.worldTime = snap.worldTime;

    snap.chars.forEach(d => {
        const char = spawnCharacter(new THREE.Vector3(d.x, d.y, d.z));
        char.name = d.name; char.age = d.age; char.gender = d.gender; char.nation = d.nation;
    });
    addLog(`Day ${STATE.dayCount} へ時間を巻き戻しました。`, "alert");
}

export function saveGame(slot = 1, isAuto = false) {
    const data = {
        seed: STATE.seed,
        dayCount: STATE.dayCount,
        worldTime: STATE.worldTime,
        globalTechLevel: STATE.globalTechLevel,
        chars: STATE.characters.filter(c => !c.isDead).map(c => ({
            n: c.name, a: c.age, g: c.gender, nt: c.nation, h: c.health,
            x: Math.round(c.position.x), y: Math.round(c.position.y), z: Math.round(c.position.z),
            diseases: c.diseases || []
        })),
        nations: STATE.nations.map(n => ({
            id: n.id, n: n.name, c: n.color.getHex(), x: n.position.x, y: n.position.y, z: n.position.z,
            tl: n.techLevel, r: n.resources, rel: n.relations, stb: n.stability
        })),
        houses: STATE.housePositions.map((p, i) => ({
            x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), nId: STATE.houseNations[i]
        }))
    };
    try {
        const key = `godsim_save_${slot}`;
        localStorage.setItem(key, JSON.stringify(data));
        const metaKey = `godsim_meta_${slot}`;
        const meta = {
            dayCount: STATE.dayCount,
            pop: data.chars.length,
            nations: data.nations.length,
            timestamp: Date.now(),
            isAuto: isAuto
        };
        localStorage.setItem(metaKey, JSON.stringify(meta));
        if (!isAuto) addLog(`スロット${slot}にセーブしました。`, 'alert');
    } catch (e) {
        addLog('セーブに失敗しました: ' + e.message, 'alert');
    }
}

export function loadGame(slot = 1) {
    const key = `godsim_save_${slot}`;
    const saveStr = localStorage.getItem(key);
    if (!saveStr) {
        addLog(`スロット${slot}にセーブデータがありません。`, 'alert');
        return false;
    }
    const data = JSON.parse(saveStr);

    const seedInput = document.getElementById('seed-input');
    if (seedInput) seedInput.value = data.seed;
    STATE.seed = data.seed;
    addLog("--- セーブデータをロード中 ---", 'alert');
    
    // generateWorld will clear old meshes and create new terrain/trees
    // and call populateWorld which spawns characters/animals initially
    generateWorld(data.seed.toString());

    STATE.dayCount = data.dayCount;
    STATE.worldTime = data.worldTime;
    STATE.globalTechLevel = data.globalTechLevel || 1;

    STATE.nations = data.nations.map(n => ({
        id: n.id, name: n.n, color: new THREE.Color(n.c), position: new THREE.Vector3(n.x, n.y, n.z),
        techLevel: n.tl, resources: n.r, relations: n.rel, stability: n.stb || 100
    }));

    STATE.housePositions = data.houses.map(h => new THREE.Vector3(h.x, h.y, h.z));
    STATE.houseNations = data.houses.map(h => h.nId);
    rebuildHouses();

    // Now overwrite characters created by generateWorld
    STATE.characters = [];
    data.chars.forEach(c => {
        const char = spawnCharacter(new THREE.Vector3(c.x, c.y, c.z));
        char.name = c.n; char.age = c.a; char.gender = c.g; char.nation = c.nt; char.health = c.h;
        char.diseases = c.diseases || [];
    });

    updateNationsUI();
    addLog(`Day ${STATE.dayCount} のデータを復元しました。`, 'alert');
    return true;
}

export function getSaveMetaInfo() {
    const slots = [];
    for (let i = 0; i <= 3; i++) {
        const metaStr = localStorage.getItem(`godsim_meta_${i}`);
        if (metaStr) {
            slots.push({ slot: i, ...JSON.parse(metaStr) });
        } else {
            slots.push({ slot: i, empty: true });
        }
    }
    return slots;
}
