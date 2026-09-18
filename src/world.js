import { CONFIG } from './config.js';
import { STATE, GLOBALS } from './state.js';
import { createMergedGeo, addLog, mulberry32 } from './utils.js';
import { initCharacterInstancedMesh, initAnimalInstancedMeshes, spawnCharacter, spawnAnimal } from './entities.js';
import { saveSnapshot } from './save.js';
import { updateNationsUI } from './ui.js';
import { ASSETS } from './loaders.js';
import { wasmExports, wasmMemory } from './wasm.js';

let nextNationId = 0;


export function getSeaLevelY() {
    return CONFIG.seaLevel * 300; // maxHeight = 300
}

export function getTerrainHeightAt(x, z) {
    const size = CONFIG.worldSize;
    const maxDist = size / 2;
    const distanceToCenter = Math.sqrt(x * x + z * z);
    let edgeDrop = 1 - Math.pow(distanceToCenter / maxDist, 2.2);
    if (edgeDrop < 0) edgeDrop = 0;

    let noiseVal = 0;
    noiseVal += (GLOBALS.simplex.noise2D(x * 0.0002, z * 0.0002) + 1) * 0.5 * 3.0;
    noiseVal += (GLOBALS.simplex.noise2D(x * 0.0008, z * 0.0008) + 1) * 0.5 * 1.5;
    noiseVal += (GLOBALS.simplex.noise2D(x * 0.003, z * 0.003) + 1) * 0.5 * 0.5;
    noiseVal += (GLOBALS.simplex.noise2D(x * 0.01, z * 0.01) + 1) * 0.5 * 0.15;

    let base = noiseVal / 5.15;
    base = Math.pow(base, 1.3);
    noiseVal = base * edgeDrop - 0.10;

    let riverNoise = Math.abs(GLOBALS.simplex.noise2D(x * 0.0015, z * 0.0015));
    riverNoise += Math.abs(GLOBALS.simplex.noise2D(x * 0.004, z * 0.004)) * 0.4;
    if (noiseVal > CONFIG.seaLevel + 0.02 && riverNoise < 0.065) {
        const depth = (0.065 - riverNoise) * 10.0;
        noiseVal -= depth;
    }

    const steps = 30;
    noiseVal = Math.floor(noiseVal * steps) / steps;

    const maxHeight = 300;
    let y = noiseVal * maxHeight;
    if (noiseVal < CONFIG.seaLevel) {
        y = (CONFIG.seaLevel * maxHeight) * 0.75 + (y * 0.25);
    }
    return y;
}

export function generateWorld(seedStr) {
    if (GLOBALS.terrainMesh) { GLOBALS.scene.remove(GLOBALS.terrainMesh); GLOBALS.terrainMesh.geometry.dispose(); GLOBALS.terrainMesh.material.dispose(); }
    if (GLOBALS.waterMesh) { GLOBALS.scene.remove(GLOBALS.waterMesh); GLOBALS.waterMesh.geometry.dispose(); GLOBALS.waterMesh.material.dispose(); }
    GLOBALS.treeInstancedMeshes.forEach(mesh => {
        GLOBALS.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
    });
    GLOBALS.treeInstancedMeshes = [];
    if (GLOBALS.houseInstancedMesh) { GLOBALS.scene.remove(GLOBALS.houseInstancedMesh); GLOBALS.houseInstancedMesh.geometry.dispose(); GLOBALS.houseInstancedMesh.material.dispose(); }
    if (GLOBALS.characterInstancedMesh) { GLOBALS.scene.remove(GLOBALS.characterInstancedMesh); GLOBALS.characterInstancedMesh.geometry.dispose(); GLOBALS.characterInstancedMesh.material.dispose(); }
    Object.values(GLOBALS.animalInstancedMeshes).forEach(m => {
        if (m) { GLOBALS.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    });

    if (GLOBALS.territoryGroup) GLOBALS.scene.remove(GLOBALS.territoryGroup);

    STATE.characters = [];
    STATE.animals = [];
    STATE.wars = [];

    initCharacterInstancedMesh();
    initAnimalInstancedMeshes();

    let seedNum = 0;
    for (let i = 0; i < seedStr.length; i++) seedNum += seedStr.charCodeAt(i);
    GLOBALS.rng = mulberry32(seedNum);
    GLOBALS.simplex = new SimplexNoise(GLOBALS.rng);

    const size = CONFIG.worldSize;
    const seg = CONFIG.worldSegments;

    const geometry = new THREE.PlaneGeometry(size, size, seg, seg);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;
    const colors = [];
    const color = new THREE.Color();

    const maxHeight = 300;
    const colorSand = new THREE.Color(0xefdecd);
    const colorGrass1 = new THREE.Color(0x669933);
    const colorGrass2 = new THREE.Color(0x3f7a1e);
    const colorRock = new THREE.Color(0x707070);
    const colorSnow = new THREE.Color(0xf5f5f5);

    for (let i = 0; i < vertices.length; i += 3) {
        let x = vertices[i];
        let z = vertices[i + 2];
        let y = getTerrainHeightAt(x, z);
        vertices[i + 1] = y;

        let normalizedHeight = y / maxHeight;

        if (normalizedHeight < CONFIG.seaLevel + 0.012) {
            color.copy(colorSand);
        } else if (normalizedHeight < 0.68) {
            const forestMap = GLOBALS.simplex.noise2D(x * 0.008, z * 0.008);
            color.copy(forestMap > 0.05 ? colorGrass2 : colorGrass1);
        } else if (normalizedHeight < 0.82) {
            color.copy(colorRock);
        } else {
            color.copy(colorSnow);
        }
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true
    });
    GLOBALS.terrainMesh = new THREE.Mesh(geometry, material);
    GLOBALS.terrainMesh.receiveShadow = true;
    GLOBALS.terrainMesh.castShadow = true;
    GLOBALS.scene.add(GLOBALS.terrainMesh);

    const waterGeo = new THREE.PlaneGeometry(size, size, 120, 120);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1a6699,
        transparent: true,
        opacity: 0.82,
        roughness: 0.15,
        metalness: 0.7
    });
    GLOBALS.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    GLOBALS.waterMesh.position.y = CONFIG.seaLevel * maxHeight - 1.5;
    GLOBALS.waterMesh.receiveShadow = true;
    GLOBALS.scene.add(GLOBALS.waterMesh);

    populateWorld(geometry, size);
    drawMinimapCanvas(vertices, colors, size);

    STATE.snapshots = [];
    saveSnapshot();
}

export const ENV_MAPS = {
    temp: null,
    humidity: null,
    getTemp: (x, z) => {
        if (!GLOBALS.simplex) GLOBALS.simplex = new SimplexNoise();
        return GLOBALS.simplex.noise2D(x * 0.002 + 1000, z * 0.002 + 1000) * 0.5 + 0.5; // 0 to 1
    },
    getHumidity: (x, z) => {
        if (!GLOBALS.simplex) GLOBALS.simplex = new SimplexNoise();
        return GLOBALS.simplex.noise2D(x * 0.003 + 5000, z * 0.003 + 5000) * 0.5 + 0.5; // 0 to 1
    }
};

const ASSET_TYPE_MAP = {
    "tree_oak": 1,
    "tree_pine": 2,
    "tree_birch": 3,
    "tree_dead": 4,
    "tree_autumn": 5,
    "plant_bush": 6,
    "plant_grass": 7,
    "plant_mushroom": 8,
    "plant_cattail": 9,
    "plant_lilypad": 10
};

export const INSTANCED_MESHES = {};

export function populateWorld(scene, worldSize) {
    if (!GLOBALS.simplex) {
        GLOBALS.simplex = new SimplexNoise();
    }
    
    // Spawn initial entities via WASM
    let planted = 0;
    for (let i = 0; i < 3000; i++) {
        let x = (GLOBALS.rng() - 0.5) * worldSize;
        let z = (GLOBALS.rng() - 0.5) * worldSize;
        let y = getTerrainHeightAt(x, z);
        
        let temp = ENV_MAPS.getTemp(x, z);
        let hum = ENV_MAPS.getHumidity(x, z);
        
        let seaY = CONFIG.seaLevel * 300;
        if (y > seaY + 2.0) {
            let type = 1; // oak
            if (temp < 0.3) type = 2; // pine
            else if (temp > 0.7 && hum < 0.4) type = 4; // dead
            else if (temp > 0.6 && hum > 0.6) type = 3; // birch
            else if (temp > 0.4 && temp < 0.6 && hum > 0.5) type = 5; // autumn
            
            // Randomly pick plants instead
            if (GLOBALS.rng() < 0.5) {
                if (hum > 0.7) type = 8; // mushroom
                else if (hum < 0.3) type = 6; // bush
                else type = 7; // grass
            }
            
            wasmExports.spawnEntity(type, x, y, z, temp, hum);
            planted++;
        } else if (y > seaY - 5.0 && y <= seaY + 2.0) {
            // Water plants
            if (GLOBALS.rng() < 0.5) wasmExports.spawnEntity(9, x, y, z, temp, hum); // cattail
            else wasmExports.spawnEntity(10, x, 0.5, z, temp, hum); // lilypad
            planted++;
        }
    }
    console.log("Planted initial flora: " + planted);

    // Initialize InstancedMeshes
    for (const [key, id] of Object.entries(ASSET_TYPE_MAP)) {
        const asset = ASSETS[key];
        if (asset && asset.geometry && asset.material) {
            const mesh = new THREE.InstancedMesh(asset.geometry, asset.material, 10000);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            GLOBALS.scene.add(mesh); // Fix: use GLOBALS.scene instead of scene
            INSTANCED_MESHES[id] = mesh;
        }
    }
    
    STATE.housePositions = [];
    STATE.houseNations = [];
    STATE.houseProgress = [];
    STATE.nations = [];
    STATE.globalTechLevel = 1;
    nextNationId = 0;

    rebuildHouses();

    for (let i = 0; i < CONFIG.initialPop + 10; i++) {
        let x = (GLOBALS.rng() - 0.5) * worldSize;
        let z = (GLOBALS.rng() - 0.5) * worldSize;
        let y = getTerrainHeightAt(x, z);
        if (y > CONFIG.seaLevel * 300 + 2.0) spawnCharacter(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < CONFIG.initialAnimals; i++) {
        let x = (GLOBALS.rng() - 0.5) * worldSize;
        let z = (GLOBALS.rng() - 0.5) * worldSize;
        let y = getTerrainHeightAt(x, z);
        if (y > CONFIG.seaLevel * 300 + 2.0) spawnAnimal(new THREE.Vector3(x, y, z));
    }

    updateNationsUI();
}

export function updateFlora() {
    if (!wasmExports || !wasmExports.getEntityCount) return;
    const count = wasmExports.getEntityCount();
    const counters = {};
    const dummy = new THREE.Object3D();
    
    // Reset counters
    for (let i = 1; i <= 10; i++) counters[i] = 0;
    
    for (let i = 0; i < count; i++) {
        if (wasmMemory.state[i] === 1) {
            const type = wasmMemory.type[i];
            if (type >= 1 && type <= 10) {
                const idx = counters[type]++;
                const mesh = INSTANCED_MESHES[type];
                if (mesh && idx < 10000) {
                    dummy.position.set(wasmMemory.x[i], wasmMemory.y[i], wasmMemory.z[i]);
                    const scale = wasmMemory.scale[i];
                    dummy.scale.set(scale, scale, scale);
                    // Add some deterministic rotation based on position
                    dummy.rotation.y = (wasmMemory.x[i] * 1.37) % Math.PI;
                    dummy.updateMatrix();
                    mesh.setMatrixAt(idx, dummy.matrix);
                }
            }
        }
    }
    
    // Hide unused instances (scale to 0)
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 1; i <= 10; i++) {
        const mesh = INSTANCED_MESHES[i];
        if (mesh) {
            for (let j = counters[i]; j < 10000; j++) {
                mesh.setMatrixAt(j, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
        }
    }
}

export function rebuildHouses() {
    if (GLOBALS.houseInstancedMesh) GLOBALS.scene.remove(GLOBALS.houseInstancedMesh);
    if (GLOBALS.territoryGroup) GLOBALS.scene.remove(GLOBALS.territoryGroup);

    const houseCount = STATE.housePositions.length;
    
    const asset = ASSETS['house_lvl1'];
    if (houseCount > 0 && asset && asset.geometry && asset.material) {
        GLOBALS.houseInstancedMesh = new THREE.InstancedMesh(asset.geometry, asset.material, houseCount);
        GLOBALS.houseInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        GLOBALS.houseInstancedMesh.castShadow = true;
        GLOBALS.houseInstancedMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < houseCount; i++) {
            dummy.position.copy(STATE.housePositions[i]);
            dummy.rotation.y = (i * 1.37) % Math.PI;
            
            const p = STATE.houseProgress && STATE.houseProgress[i] !== undefined ? Math.min(1, Math.max(0, STATE.houseProgress[i])) : 1.0;
            const targetScale = 1.0 + ((i * 0.15) % 0.4);
            const scale = targetScale * (0.1 + p * 0.9);
            
            dummy.scale.set(scale, scale, scale);
            const yOffset = (1.0 - p) * -3.0;
            dummy.position.y += yOffset;
            
            dummy.updateMatrix();

            const nId = STATE.houseNations[i];
            const nation = STATE.nations.find(n => n.id === nId);
            if (nation) {
                GLOBALS.houseInstancedMesh.setColorAt(i, nation.color);
            }
            GLOBALS.houseInstancedMesh.setMatrixAt(i, dummy.matrix);
        }
        GLOBALS.scene.add(GLOBALS.houseInstancedMesh);
    }


}

export function updateHouses(deltaTime) {
    if (!STATE.houseProgress || !GLOBALS.houseInstancedMesh) return;
    
    let needsUpdate = false;
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < STATE.houseProgress.length; i++) {
        if (STATE.houseProgress[i] < 1.0) {
            STATE.houseProgress[i] += deltaTime * 0.2; // 5秒で完成
            if (STATE.houseProgress[i] > 1.0) STATE.houseProgress[i] = 1.0;
            
            dummy.position.copy(STATE.housePositions[i]);
            dummy.rotation.y = (i * 1.37) % Math.PI;
            
            const p = STATE.houseProgress[i];
            const targetScale = 1.0 + ((i * 0.15) % 0.4);
            const scale = targetScale * (0.1 + p * 0.9);
            
            dummy.scale.set(scale, scale, scale);
            const yOffset = (1.0 - p) * -3.0;
            dummy.position.y += yOffset;
            dummy.updateMatrix();
            
            GLOBALS.houseInstancedMesh.setMatrixAt(i, dummy.matrix);
            needsUpdate = true;
        }
    }
    
    if (needsUpdate) {
        GLOBALS.houseInstancedMesh.instanceMatrix.needsUpdate = true;
    }
}

export function drawMinimapCanvas(vertices, colors, worldSize) {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(canvas.width, canvas.height);

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        const cx = Math.floor((x / worldSize + 0.5) * canvas.width);
        const cy = Math.floor((z / worldSize + 0.5) * canvas.height);

        if (cx >= 0 && cx < canvas.width && cy >= 0 && cy < canvas.height) {
            const idx = (cy * canvas.width + cx) * 4;
            imgData.data[idx] = colors[i] * 255 * 0.85;
            imgData.data[idx + 1] = colors[i + 1] * 255 * 0.85;
            imgData.data[idx + 2] = colors[i + 2] * 255 * 0.85;
            imgData.data[idx + 3] = 255;
        }
    }

    for (let i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i + 3] === 0) {
            imgData.data[i] = 26; imgData.data[i + 1] = 102; imgData.data[i + 2] = 153; imgData.data[i + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

export function updateMinimapOverlay() {
    const canvas = document.getElementById('minimap-overlay');
    if (!canvas) return;
    if (canvas.width !== 200) { canvas.width = 200; canvas.height = 200; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Voronoi-like borders on minimap
    if (STATE.nations && STATE.nations.length > 0) {
        ctx.globalAlpha = 0.3;
        for (let x = 0; x < canvas.width; x += 4) {
            for (let y = 0; y < canvas.height; y += 4) {
                let minDist = Infinity;
                let closestNation = null;
                for (const n of STATE.nations) {
                    if (!n.position) continue;
                    const nx = (n.position.x / CONFIG.worldSize + 0.5) * canvas.width;
                    const ny = (n.position.z / CONFIG.worldSize + 0.5) * canvas.height;
                    const dist = (x - nx) * (x - nx) + (y - ny) * (y - ny);
                    // Tech level increases border radius
                    const maxDist = (20 + (n.techLevel || 1) * 2) * (20 + (n.techLevel || 1) * 2);
                    if (dist < maxDist && dist < minDist) {
                        minDist = dist;
                        closestNation = n;
                    }
                }
                if (closestNation) {
                    ctx.fillStyle = '#' + closestNation.color.getHexString();
                    ctx.fillRect(x, y, 4, 4);
                }
            }
        }
        ctx.globalAlpha = 1.0;

        // Draw nation centers
        STATE.nations.forEach(n => {
            if (!n.position) return;
            const cx = (n.position.x / CONFIG.worldSize + 0.5) * canvas.width;
            const cy = (n.position.z / CONFIG.worldSize + 0.5) * canvas.height;
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#' + n.color.getHexString();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    // Draw camera
    if (GLOBALS.camera) {
        const cx = (GLOBALS.camera.position.x / CONFIG.worldSize + 0.5) * canvas.width;
        const cy = (GLOBALS.camera.position.z / CONFIG.worldSize + 0.5) * canvas.height;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const rot = -GLOBALS.camera.rotation.y;
        ctx.arc(cx, cy, 22, rot - 0.5, rot + 0.5);
        ctx.lineTo(cx, cy);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.stroke();
    }
}

export function teleportCameraTo(x, z) {
    const groundY = getTerrainHeightAt(x, z);
    STATE.targetCamLookAt = new THREE.Vector3(x, groundY, z);
    STATE.targetCamPos = new THREE.Vector3(x, groundY + 250, z + 350);

    addLog(`座標 [${Math.floor(x)}, ${Math.floor(z)}] へテレポートしました。`);
    // Note: exitPossessMode should be imported and called if possessing
    if (STATE.isPossessing) {
        import('./input.js').then(module => module.exitPossessMode());
    }
}


