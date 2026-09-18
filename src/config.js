// ===== config.js =====
// Game configuration constants and initial state template

export const CONFIG = {
    worldSize: 8000,
    worldSegments: 300,
    seaLevel: 0.44,
    dayDurationMS: 2000,
    initialPop: 1500,
    initialAnimals: 1200,
    maxCharInstances: 5000,
    maxAnimalInstances: 1000,
    autoSaveInterval: 30  // days
};

export function createInitialState() {
    return {
        seed: "42",
        timeSpeed: 1,
        worldTime: 0,
        dayCount: 1,
        lastFrameTime: 0,
        selectedChar: null,
        characters: [],
        animals: [],
        nations: [],
        wars: [],
        snapshots: [],
        isPossessing: false,
        nightVision: false,
        keys: { w: false, a: false, s: false, d: false },
        housePositions: [],
        houseNations: [],
        globalTechLevel: 1,
        targetCamPos: null,
        targetCamLookAt: null,
        pendingMiracle: null
    };
}
