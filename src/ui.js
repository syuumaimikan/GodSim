import { STATE } from './state.js';
import { getNationTitle } from './simulation.js';

export const uiElements = {};

export function initUIElements() {
    Object.assign(uiElements, {
        day: document.getElementById('ui-day'),
        time: document.getElementById('ui-time'),
        pop: document.getElementById('ui-pop'),
        log: document.getElementById('event-log'),
        charPanel: document.getElementById('char-info-panel'),
        nationPanel: document.getElementById('nation-detail-panel'),
        seedInput: document.getElementById('seed-input'),
        hoverInfo: document.getElementById('hover-info'),
        possessHint: document.getElementById('possess-hint'),
        minimap: document.getElementById('minimap'),
        minimapOverlay: document.getElementById('minimap-overlay'),
        miracleOverlay: document.getElementById('miracle-overlay'),
        miracleText: document.getElementById('miracle-text')
    });
}

export function updateUI() {
    if (uiElements.day) uiElements.day.innerText = STATE.dayCount;
    if (uiElements.time) {
        let h = Math.floor(STATE.worldTime * 24);
        let m = Math.floor((STATE.worldTime * 24 * 60) % 60);
        uiElements.time.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
}

export function hideCharPanel() {
    if (STATE.selectedChar) STATE.selectedChar.scale = 1.0;
    STATE.selectedChar = null;
    const panel = uiElements.charPanel;
    if (panel) {
        panel.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => panel.classList.add('hidden'), 300);
    }
}

export function updateCharPanel(char) {
    const elName = document.getElementById('char-name');
    if (elName) elName.innerText = char.name;
    const elAge = document.getElementById('char-age');
    if (elAge) elAge.innerText = char.age;
    const elGender = document.getElementById('char-gender');
    if (elGender) elGender.innerText = char.gender === 'Male' ? '♂ 男性' : '♀ 女性';
    const elHealth = document.getElementById('char-health');
    if (elHealth) elHealth.innerText = char.health;
    const elNation = document.getElementById('char-nation');
    if (elNation) {
        elNation.innerText = char.nation;
        const nData = STATE.nations.find(n => n.name === char.nation);
        if (nData) elNation.style.color = '#' + nData.color.getHexString();
    }
    const elAction = document.getElementById('char-action');
    if (elAction) elAction.innerText = char.currentAction;
}

export function updateNationsUI() {
    const list = document.getElementById('nations-list');
    const countEl = document.getElementById('nation-count');
    if (!list || !countEl) return;

    list.innerHTML = '';
    countEl.innerText = `${STATE.nations.length} 個の集落/国家`;

    const popCounts = {};
    STATE.characters.forEach(c => {
        if (!c.isDead) popCounts[c.nation] = (popCounts[c.nation] || 0) + 1;
    });

    const sorted = [...STATE.nations].sort((a, b) => b.techLevel - a.techLevel);
    sorted.forEach(n => {
        const pop = popCounts[n.name] || 0;
        const isAtWar = STATE.wars.some(w => w.attacker.id === n.id || w.defender.id === n.id);
        const warBadge = isAtWar ? `<span class="bg-red-600 text-[9px] px-1 rounded text-white ml-1">交戦</span>` : '';
        const typeTitle = getNationTitle(n, pop);

        const item = document.createElement('div');
        item.className = "flex justify-between items-center text-xs border-b border-gray-700/50 pb-1 mb-1 hover:bg-gray-800 cursor-pointer transition-colors";
        item.onclick = () => showNationDetail(n, pop);

        item.innerHTML = `
        <div class="flex items-center gap-2 truncate">
            <span class="w-3 h-3 rounded-sm flex-shrink-0" style="background-color: #${n.color.getHexString()}"></span>
            <span class="text-gray-200 truncate">${n.name} (${typeTitle}) ${warBadge}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-400 font-mono text-[10px]">
            <span>Lv.${n.techLevel}</span>
            <span>👤${pop}</span>
        </div>
    `;
        list.appendChild(item);
    });
}

export function showNationDetail(nation, pop) {
    const panel = uiElements.nationPanel;
    if (!panel) return;
    
    document.getElementById('detail-nation-name').innerHTML = `<span class="w-3 h-3 rounded-full inline-block" style="background-color: #${nation.color.getHexString()}"></span> ${nation.name}`;
    document.getElementById('detail-nation-pop').innerText = pop;
    document.getElementById('detail-nation-res').innerText = Math.floor(nation.resources);

    let diploText = "平和";
    const enemies = [];
    STATE.wars.forEach(w => {
        if (w.attacker.id === nation.id) enemies.push(w.defender.name);
        if (w.defender.id === nation.id) enemies.push(w.attacker.name);
    });
    if (enemies.length > 0) diploText = `交戦中 (${enemies.join(', ')})`;
    document.getElementById('detail-nation-diplo').innerText = diploText;

    let stabText = `<span class="text-green-400">安定 (${Math.floor(nation.stability)})</span>`;
    if (nation.stability < 40) stabText = `<span class="text-yellow-400">不穏 (${Math.floor(nation.stability)})</span>`;
    if (nation.stability < 20) stabText = `<span class="text-red-500 font-bold animate-pulse">暴動寸前 (${Math.floor(nation.stability)})</span>`;

    if (!document.getElementById('detail-nation-stab')) {
        const stabRow = document.createElement('div');
        stabRow.className = 'flex justify-between border-b border-gray-700 pb-1';
        stabRow.innerHTML = `<span class="text-gray-400">安定度:</span><span id="detail-nation-stab" class="font-bold"></span>`;
        document.getElementById('detail-nation-diplo').parentElement.after(stabRow);
    }
    document.getElementById('detail-nation-stab').innerHTML = stabText;

    const treeList = document.getElementById('tech-tree-list');
    treeList.innerHTML = '';
    [
        { lv: 1, name: "集落の形成 (木造)" },
        { lv: 10, name: "石造要塞と城塞" },
        { lv: 20, name: "近代インフラと鉄鋼" },
        { lv: 35, name: "産業革命と国家総動員" }
    ].forEach(stage => {
        const reached = nation.techLevel >= stage.lv;
        treeList.innerHTML += `
        <div class="relative py-1 ${reached ? 'text-indigo-200 font-bold' : 'text-gray-600'}">
            <div class="absolute -left-[13px] top-2 w-2 h-2 rounded-full ${reached ? 'bg-indigo-400' : 'bg-gray-700'}"></div>
            Lv.${stage.lv} : ${stage.name}
        </div>
    `;
    });

    panel.classList.remove('hidden');
    setTimeout(() => panel.classList.remove('translate-y-4', 'opacity-0'), 10);
}

export function makeDraggable(element, handleId = null) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const handle = handleId ? element.querySelector(handleId) || element : element;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT') return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;

        document.querySelectorAll('.draggable-panel').forEach(p => p.style.zIndex = '10');
        element.style.zIndex = '100';
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        if (element.style.position !== 'absolute') {
            const rect = element.getBoundingClientRect();
            element.style.position = 'absolute';
            element.style.left = rect.left + "px";
            element.style.top = rect.top + "px";
            element.classList.remove('ml-auto', 'mt-auto', 'mb-4');
        }

        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.bottom = 'auto';
        element.style.right = 'auto';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

export function drawFullMap() {
    const canvas = document.getElementById('full-map-canvas');
    const uiCanvas = document.getElementById('full-map-ui');
    if (!canvas || !uiCanvas) return;
    
    const ctx = canvas.getContext('2d');
    const uiCtx = uiCanvas.getContext('2d');
    const size = 800;
    
    ctx.clearRect(0, 0, size, size);
    uiCtx.clearRect(0, 0, size, size);
    
    const minimap = document.getElementById('minimap');
    if (minimap) {
        ctx.drawImage(minimap, 0, 0, size, size);
    }
    
    import('./config.js').then(({ CONFIG }) => {
        import('./state.js').then(({ STATE }) => {
            STATE.nations.forEach(n => {
                if (!n.position) return;
                const px = ((n.position.x / CONFIG.worldSize) + 0.5) * size;
                const py = ((n.position.z / CONFIG.worldSize) + 0.5) * size;
                
                // Territory
                uiCtx.beginPath();
                uiCtx.arc(px, py, 60 + (n.techLevel * 2), 0, Math.PI * 2);
                uiCtx.fillStyle = n.color.getStyle();
                uiCtx.globalAlpha = 0.25;
                uiCtx.fill();
                uiCtx.lineWidth = 2;
                uiCtx.strokeStyle = n.color.getStyle();
                uiCtx.globalAlpha = 0.8;
                uiCtx.stroke();
                
                // City center
                uiCtx.globalAlpha = 1.0;
                uiCtx.beginPath();
                uiCtx.arc(px, py, 6, 0, Math.PI * 2);
                uiCtx.fillStyle = '#ffffff';
                uiCtx.fill();
                uiCtx.lineWidth = 1;
                uiCtx.strokeStyle = '#000000';
                uiCtx.stroke();
                
                // Labels
                uiCtx.font = "bold 16px sans-serif";
                uiCtx.textAlign = "center";
                uiCtx.fillStyle = "#ffffff";
                uiCtx.shadowColor = "#000000";
                uiCtx.shadowBlur = 4;
                uiCtx.fillText(n.name, px, py - 12);
                
                uiCtx.font = "12px sans-serif";
                uiCtx.fillText(`Pop: ${n.pop || 0}  Tech: ${n.techLevel}`, px, py + 20);
                
                uiCtx.shadowBlur = 0;
            });
        });
    });
}
