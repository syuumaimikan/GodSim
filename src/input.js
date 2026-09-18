
import { STATE, GLOBALS } from './state.js';
import { uiElements, hideCharPanel } from './ui.js';
import { selectCharacter } from './entities.js';
import { addLog } from './utils.js';
import { teleportCameraTo, rebuildHouses, generateWorld } from './world.js';
import { updateNationsUI } from './ui.js';
import { updateWorldTime } from './simulation.js';
import { executeMiracleQuake, executeMiracleLightning } from './particles.js';
import { wasmExports } from './wasm.js';

export function setupInputEvents() {
    window.addEventListener('pointerdown', onPointerDown, false);
    window.addEventListener('pointermove', onPointerMove, false);
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', (e) => {
        if (STATE.isPossessing && ['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
            STATE.keys[e.key.toLowerCase()] = false;
        }
    });

    
    const btnGen = document.getElementById('btn-generate');
    if (btnGen) {
        btnGen.addEventListener('click', () => {
            const seed = document.getElementById('seed-input').value || "GodSim";
            generateWorld(seed);
        });
    }

    const btnSkip = document.getElementById('btn-skip-100');
    if (btnSkip) {
        btnSkip.addEventListener('click', skip100Years);
    }
    document.getElementById('btn-close-char').addEventListener('click', hideCharPanel);
    document.getElementById('btn-close-nation').addEventListener('click', () => {
        uiElements.nationPanel.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => uiElements.nationPanel.classList.add('hidden'), 300);
    });

    document.getElementById('btn-miracle-lightning').addEventListener('click', () => prepareMiracle('lightning'));
    document.getElementById('btn-miracle-quake').addEventListener('click', () => prepareMiracle('quake'));
    const tBtn = document.getElementById('btn-miracle-tornado');
    if (tBtn) tBtn.addEventListener('click', () => prepareMiracle('tornado'));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && STATE.pendingMiracle) cancelMiracle();
        if (e.key.toLowerCase() === 'm' && !document.activeElement.matches('input, textarea')) {
            toggleFullMap();
        }
    });

    const closeMapBtn = document.getElementById('btn-close-map');
    if (closeMapBtn) closeMapBtn.addEventListener('click', toggleFullMap);

    document.getElementById('btn-possess').addEventListener('click', () => {
        if (!STATE.selectedChar || STATE.selectedChar.isDead) return;
        STATE.isPossessing = !STATE.isPossessing;
        if (STATE.isPossessing) {
            addLog(`'${STATE.selectedChar.name}' に憑依中。[F]で奇跡。`, 'alert');
            uiElements.possessHint.classList.remove('hidden');
            GLOBALS.controls.enabled = false;
        } else {
            exitPossessMode();
        }
    });

    const speedBtns = [
        { id: 'btn-speed-pause', speed: 0 },
        { id: 'btn-speed-play', speed: 1 },
        { id: 'btn-speed-fast', speed: 6 }
    ];

    speedBtns.forEach(info => {
        document.getElementById(info.id).addEventListener('click', () => {
            STATE.timeSpeed = info.speed;
            speedBtns.forEach(b => document.getElementById(b.id).classList.remove('bg-indigo-600/50'));
            document.getElementById(info.id).classList.add('bg-indigo-600/50');
        });
    });

    document.getElementById('btn-night-vision').addEventListener('click', (e) => {
        STATE.nightVision = !STATE.nightVision;
        e.currentTarget.classList.toggle('bg-green-600', STATE.nightVision);
        addLog(STATE.nightVision ? "暗視モード有効" : "暗視モード解除");
        updateWorldTime(0);
    });

    const minimapContainer = document.getElementById('minimap-container');
    if (minimapContainer) {
        minimapContainer.addEventListener('click', (e) => {
            const rect = minimapContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const percentX = x / rect.width;
            const percentY = y / rect.height;

            import('./config.js').then(({ CONFIG }) => {
                const worldX = (percentX - 0.5) * CONFIG.worldSize;
                const worldZ = (percentY - 0.5) * CONFIG.worldSize;
                teleportCameraTo(worldX, worldZ);
            });
        });
    }
}

function onPointerMove(event) {
    GLOBALS.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    GLOBALS.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (!GLOBALS.camera || !GLOBALS.scene || STATE.isPossessing) return;

    GLOBALS.raycaster.setFromCamera(GLOBALS.mouse, GLOBALS.camera);
    if (GLOBALS.characterInstancedMesh) {
        const intersects = GLOBALS.raycaster.intersectObject(GLOBALS.characterInstancedMesh);

        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            const visibleAlive = STATE.characters.filter(c => !c.isDead && c.isVisible);
            if (instanceId !== undefined && instanceId < visibleAlive.length) {
                const char = visibleAlive[instanceId];
                uiElements.hoverInfo.style.opacity = 1;
                uiElements.hoverInfo.style.left = (event.clientX + 15) + 'px';
                uiElements.hoverInfo.style.top = (event.clientY + 15) + 'px';
                const nData = STATE.nations.find(n => n.name === char.nation);
                const colorHex = nData ? nData.color.getHexString() : "888888";
                uiElements.hoverInfo.innerHTML = `${char.name} (${char.age}歳)<br><span style="color:#${colorHex}">${char.nation}</span>`;
                return;
            }
        }
    }
    uiElements.hoverInfo.style.opacity = 0;
}

function onPointerDown(event) {
    if (STATE.isPossessing) return;
    if (event.target.closest('#ui-layer') || event.target.closest('#minimap-container')) return;

    GLOBALS.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    GLOBALS.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    GLOBALS.raycaster.setFromCamera(GLOBALS.mouse, GLOBALS.camera);

    if (STATE.pendingMiracle && GLOBALS.terrainMesh) {
        const intersects = GLOBALS.raycaster.intersectObject(GLOBALS.terrainMesh);
        if (intersects.length > 0) {
            executeMiracle(STATE.pendingMiracle, intersects[0].point);
        }
        cancelMiracle();
        return;
    }

    if (GLOBALS.characterInstancedMesh) {
        const intersects = GLOBALS.raycaster.intersectObject(GLOBALS.characterInstancedMesh);
        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            const visibleAlive = STATE.characters.filter(c => !c.isDead && c.isVisible);
            if (instanceId !== undefined && instanceId < visibleAlive.length) {
                const char = visibleAlive[instanceId];
                selectCharacter(char);
                return;
            }
        }
        hideCharPanel();
    }
}

function onKeyDown(event) {
    if (STATE.isPossessing) {
        const k = event.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(k)) STATE.keys[k] = true;
        if (k === 'f' && STATE.selectedChar) {
            const nation = STATE.nations.find(n => n.name === STATE.selectedChar.nation);
            if (nation) {
                nation.techLevel += 5;
                nation.resources += 1000;
                addLog(`神の奇跡により ${nation.name} の技術が飛躍的に発展した！`, 'alert');
                rebuildHouses();
                updateNationsUI();
            }
        }
        if (k === 'c' && STATE.selectedChar) {
            const nation = STATE.nations.find(n => n.name === STATE.selectedChar.nation);
            if (nation) {
                nation.techLevel += 20;
                nation.resources += 5000;
                addLog(`【異世界チート発動】現代知識が ${nation.name} にもたらされ、劇的な文明進化を遂げた！`, 'alert');
                rebuildHouses();
                updateNationsUI();
            }
        }
    }
}

export function prepareMiracle(type) {
    STATE.pendingMiracle = type;
    uiElements.miracleOverlay.classList.remove('hidden');
    uiElements.miracleText.innerText = type === 'lightning' ? '天罰(雷)を落とす場所を指定...' : '大地震を起こす場所を指定...';
    uiElements.miracleText.className = type === 'lightning' ? 'text-2xl font-bold text-yellow-300 drop-shadow-md animate-pulse' : 'text-2xl font-bold text-orange-500 drop-shadow-md animate-pulse';
    document.body.style.cursor = 'crosshair';
}

export function cancelMiracle() {
    STATE.pendingMiracle = null;
    uiElements.miracleOverlay.classList.add('hidden');
    document.body.style.cursor = 'default';
}

function executeMiracle(type, pos) {
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
}

export function exitPossessMode() {
    STATE.isPossessing = false;
    uiElements.possessHint.classList.add('hidden');
    GLOBALS.controls.enabled = true;
    GLOBALS.controls.enablePan = true;
    GLOBALS.controls.enableZoom = true;
    STATE.keys = { w: false, a: false, s: false, d: false };
    GLOBALS.controls.maxDistance = 4500;
    GLOBALS.camera.position.y += 60;
    GLOBALS.camera.position.z += 60;
    addLog("神はマクロ視点へ戻った。");
}

let isMapOpen = false;
export function toggleFullMap() {
    const overlay = document.getElementById('full-map-overlay');
    if (!overlay) return;
    
    isMapOpen = !isMapOpen;
    if (isMapOpen) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        import('./ui.js').then(({ drawFullMap }) => drawFullMap());
    } else {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }
}

export function skip100Years() {
    addLog("100年分時間を進めています...", "system");
    
    const steps = 36500; 
    const delta = 1.0; 
    
    if (wasmExports && wasmExports.update) {
        for (let i = 0; i < steps; i++) {
            wasmExports.update(delta, 0.5, 0.5);
        }
    }
    
    import('./entities.js').then(({ updateCharacters, updateAnimals }) => {
        for (let i = 0; i < steps / 100; i++) { 
            updateCharacters(delta * 100);
            updateAnimals(delta * 100);
        }
        
        STATE.worldTime += steps * 0.01;
        
        import('./world.js').then(({ updateFlora }) => {
            updateFlora();
            addLog("100年の歳月が流れました。", "system");
        });
    });
}
