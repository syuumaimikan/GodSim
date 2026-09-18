import { GLOBALS } from './state.js';

export const ASSETS = {};

export async function loadModels() {
    return new Promise((resolve, reject) => {
        fetch('./res/models.json')
            .then(res => res.json())
            .then(modelsConfig => {
                const loader = new THREE.OBJLoader();
                const promises = [];

                for (const [key, config] of Object.entries(modelsConfig)) {
                    const p = new Promise((res, rej) => {
                        loader.load(
                            config.file,
                            (obj) => {
                                // Extract geometry
                                let geometry;
                                obj.traverse((child) => {
                                    if (child.isMesh) {
                                        geometry = child.geometry;
                                    }
                                });
                                
                                if (geometry) {
                                    geometry.computeVertexNormals();
                                    const material = new THREE.MeshStandardMaterial({
                                        color: config.color,
                                        roughness: 0.85,
                                        flatShading: true
                                    });
                                    ASSETS[key] = { geometry, material };
                                }
                                res();
                            },
                            undefined,
                            (err) => {
                                console.error(`Failed to load ${config.file}`);
                                res(); // Don't fail all on one error
                            }
                        );
                    });
                    promises.push(p);
                }

                Promise.all(promises).then(() => {
                    resolve(ASSETS);
                });
            })
            .catch(err => {
                console.error("Failed to load models.json", err);
                resolve({});
            });
    });
}
