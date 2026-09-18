import { STATE } from './state.js';

// Seeded random number generator
export function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Add message to UI event log
export function addLog(msg, type = 'normal') {
    const el = document.createElement('div');
    el.textContent = `[Day ${STATE.dayCount}] ${msg}`;

    switch (type) {
        case 'birth': el.className = 'text-green-300'; break;
        case 'death': el.className = 'text-red-400'; break;
        case 'alert': el.className = 'text-yellow-400 font-bold'; break;
        default: el.className = 'text-gray-300';
    }

    const logContainer = document.getElementById('event-log');
    if (logContainer) {
        logContainer.appendChild(el);
        while (logContainer.children.length > 30) {
            logContainer.removeChild(logContainer.firstChild);
        }
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

// Merge multiple Three.js geometries efficiently
export function createMergedGeo(parts) {
    let totalVertices = 0;
    parts.forEach(p => {
        if (!p.geo.attributes.normal) p.geo.computeVertexNormals();
        totalVertices += p.geo.attributes.position.count;
    });

    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const colors = new Float32Array(totalVertices * 3);

    let offset = 0;
    parts.forEach(p => {
        const posAttr = p.geo.attributes.position;
        const normAttr = p.geo.attributes.normal;
        const c = new THREE.Color(p.color);

        for (let i = 0; i < posAttr.count; i++) {
            positions[(offset + i) * 3] = posAttr.getX(i);
            positions[(offset + i) * 3 + 1] = posAttr.getY(i);
            positions[(offset + i) * 3 + 2] = posAttr.getZ(i);

            normals[(offset + i) * 3] = normAttr.getX(i);
            normals[(offset + i) * 3 + 1] = normAttr.getY(i);
            normals[(offset + i) * 3 + 2] = normAttr.getZ(i);

            colors[(offset + i) * 3] = c.r;
            colors[(offset + i) * 3 + 1] = c.g;
            colors[(offset + i) * 3 + 2] = c.b;
        }
        offset += posAttr.count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return merged;
}
