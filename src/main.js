
import { STATE, GLOBALS } from './state.js';
import { initThreeJS, onWindowResize } from './renderer.js';
import { updateWorldTime } from './simulation.js';
import { updateCharacters, updateAnimals, loadEntityData } from './entities.js';
import { loadModels } from './loaders.js';
import { initWasm } from './wasm.js';
import { updateAudio } from './audio.js';
import { updateMinimapOverlay, updateHouses, updateFlora } from './world.js';
import { setupInputEvents } from './input.js';
import { updateParticles } from './particles.js';
import { initMenu, openMenu } from './menu.js';
import { initUIElements, makeDraggable } from './ui.js';

function animate(time) {
    requestAnimationFrame(animate);
    time *= 0.001;
    let rawDelta = time - STATE.lastFrameTime;
    STATE.lastFrameTime = time;
    if (rawDelta > 0.1) rawDelta = 0.1;
    
    // If we're on the menu and the game hasn't started yet, don't update simulation
    // But we still render the scene (could be an empty scene or stars)
    const simDelta = rawDelta * STATE.timeSpeed;

    if (STATE.timeSpeed > 0 && GLOBALS.camera && GLOBALS.frustum) {
        updateWorldTime(simDelta);
        GLOBALS.camera.updateMatrixWorld();
        GLOBALS.cameraViewProjectionMatrix.multiplyMatrices(GLOBALS.camera.projectionMatrix, GLOBALS.camera.matrixWorldInverse);
        GLOBALS.frustum.setFromProjectionMatrix(GLOBALS.cameraViewProjectionMatrix);

        updateCharacters(simDelta);
        updateAnimals(simDelta);
        updateParticles(simDelta);
        updateHouses(rawDelta); // 家の建築は実時間依存にする
    }

    if (GLOBALS.camera) {
        updateAudio();
        updateMinimapOverlay();

        if (STATE.targetCamPos && STATE.targetCamLookAt) {
            GLOBALS.camera.position.lerp(STATE.targetCamPos, 0.06);
            GLOBALS.controls.target.lerp(STATE.targetCamLookAt, 0.06);
            if (GLOBALS.camera.position.distanceTo(STATE.targetCamPos) < 1.0) {
                STATE.targetCamPos = null; STATE.targetCamLookAt = null;
            }
        }

        if (STATE.isPossessing && STATE.selectedChar && !STATE.selectedChar.isDead) {
            const charPos = STATE.selectedChar.position;
            const theta = STATE.selectedChar.rotationY || 0;
            GLOBALS.camera.position.lerp(new THREE.Vector3(charPos.x - Math.sin(theta) * 16, charPos.y + 9, charPos.z - Math.cos(theta) * 16), 0.1);
            GLOBALS.camera.lookAt(charPos.clone().add(new THREE.Vector3(0, 2, 0)));
        } else if (GLOBALS.controls) {
            // ズームインしても移動速度が低下しないように panSpeed を距離に応じて調整する
            const dist = GLOBALS.camera.position.distanceTo(GLOBALS.controls.target);
            const slider = document.getElementById('cam-speed-slider');
            const baseSpeed = slider ? parseFloat(slider.value) : 1.0;
            // 距離1000のときに標準速度となるように調整
            GLOBALS.controls.panSpeed = (baseSpeed * 1000) / Math.max(10, dist);
        }

        GLOBALS.controls.update();
        GLOBALS.renderer.render(GLOBALS.scene, GLOBALS.camera);
    }
}

async function initApp() {
    initThreeJS();
    
    await initWasm();
    await loadModels();
    await loadEntityData();

    initUIElements();
    document.querySelectorAll('.glass-panel').forEach(panel => {
        panel.classList.add('draggable-panel');
        makeDraggable(panel, '.drag-handle');
    });

    setupInputEvents();
    initMenu();
    window.addEventListener('resize', onWindowResize, false);

    STATE.lastFrameTime = performance.now() * 0.001;
    animate(performance.now());
    
    openMenu();
}

window.addEventListener('DOMContentLoaded', initApp);
