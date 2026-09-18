import { createInitialState } from './config.js';

// Global state object
export let STATE = createInitialState();

export function resetState() {
    STATE = createInitialState();
}

// Global Three.js variables and objects
export const GLOBALS = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    terrainMesh: null,
    waterMesh: null,
    treeInstancedMeshes: [],
    houseInstancedMesh: null,
    characterInstancedMesh: null,
    animalInstancedMeshes: { deer: null, wolf: null, fox: null, bird: null },
    territoryGroup: null,
    dirLight: null,
    ambientLight: null,
    moonLight: null,
    raycaster: null,
    mouse: null,
    starsGroup: null,
    simplex: null,
    rng: null,
    frustum: null, // Will be initialized in renderer.js with THREE.Frustum()
    cameraViewProjectionMatrix: null // Will be initialized with THREE.Matrix4()
};
