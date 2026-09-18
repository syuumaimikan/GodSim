import { STATE } from './state.js';
import { getSaveMetaInfo, loadGame, saveGame } from './save.js';
import { generateWorld } from './world.js';
import { initAudio } from './audio.js';
import { addLog } from './utils.js';

let previousTimeSpeed = 1;
let currentMode = '';

export function initMenu() {
    document.getElementById('btn-menu-new').addEventListener('click', () => {
        initAudio();
        const seedInput = document.getElementById('seed-input');
        const seed = seedInput ? seedInput.value : "genesis";
        STATE.seed = seed;
        STATE.dayCount = 1;
        STATE.worldTime = 0.25;
        addLog("--- 世界を構築中 ---");
        generateWorld(seed);
        closeMenu();
    });

    document.getElementById('btn-menu-continue').addEventListener('click', () => {
        currentMode = 'load';
        showSaveSlots();
    });

    document.getElementById('btn-menu-save').addEventListener('click', () => {
        currentMode = 'save';
        showSaveSlots();
    });

    document.getElementById('btn-menu-close').addEventListener('click', closeMenu);
    
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !STATE.pendingMiracle) {
            const menu = document.getElementById('main-menu');
            if (menu.classList.contains('hidden')) {
                openMenu();
            } else if (document.getElementById('btn-menu-close').classList.contains('hidden') === false) {
                closeMenu();
            }
        }
    });
}

export function openMenu() {
    const menu = document.getElementById('main-menu');
    menu.classList.remove('hidden');
    document.getElementById('save-slots').classList.add('hidden');
    
    if (STATE.characters && STATE.characters.length > 0) {
        document.getElementById('btn-menu-close').classList.remove('hidden');
        document.getElementById('btn-menu-save').classList.remove('hidden');
        previousTimeSpeed = STATE.timeSpeed;
        STATE.timeSpeed = 0;
    } else {
        document.getElementById('btn-menu-close').classList.add('hidden');
        document.getElementById('btn-menu-save').classList.add('hidden');
    }
}

export function closeMenu() {
    const menu = document.getElementById('main-menu');
    menu.classList.add('hidden');
    if (STATE.characters && STATE.characters.length > 0) {
        STATE.timeSpeed = previousTimeSpeed || 1;
        // make sure UI speed buttons reflect this, or at least it resumes
    }
}

function showSaveSlots() {
    const container = document.getElementById('save-slots');
    container.classList.remove('hidden');
    container.innerHTML = '';

    const slots = getSaveMetaInfo();
    slots.forEach(s => {
        const div = document.createElement('div');
        div.className = 'border border-gray-700 p-3 mb-2 rounded cursor-pointer hover:bg-gray-800 transition-colors flex justify-between items-center text-left';
        
        let title = s.slot === 0 ? "オートセーブ" : `スロット ${s.slot}`;
        
        if (s.empty) {
            div.innerHTML = `<span class="text-gray-500 font-bold">${title}</span><span class="text-gray-600 text-sm">NO DATA</span>`;
        } else {
            const date = new Date(s.timestamp).toLocaleString();
            div.innerHTML = `
                <div>
                    <div class="font-bold text-indigo-300">${title}</div>
                    <div class="text-xs text-gray-400">Day ${s.dayCount} | 👤${s.pop} | 🚩${s.nations}</div>
                </div>
                <div class="text-[10px] text-gray-500">${date}</div>
            `;
        }

        div.onclick = () => {
            if (currentMode === 'load') {
                if (!s.empty) {
                    initAudio();
                    const success = loadGame(s.slot);
                    if (success) closeMenu();
                }
            } else if (currentMode === 'save') {
                if (s.slot === 0) {
                    alert("オートセーブスロットには手動でセーブできません。");
                    return;
                }
                saveGame(s.slot, false);
                showSaveSlots();
            }
        };

        container.appendChild(div);
    });
}
