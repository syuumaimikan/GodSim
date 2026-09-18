
import { STATE, GLOBALS } from './state.js';
import { addLog } from './utils.js';
import { die } from './entities.js';
import { rebuildHouses } from './world.js';
import { getAudioContext } from './audio.js';

let particleSystems = [];

// Call this in the main animate loop
export function updateParticles(deltaTime) {
    for (let i = particleSystems.length - 1; i >= 0; i--) {
        const ps = particleSystems[i];
        ps.life -= deltaTime;
        if (ps.life <= 0) {
            if (ps.mesh) {
                GLOBALS.scene.remove(ps.mesh);
                ps.mesh.geometry.dispose();
                ps.mesh.material.dispose();
            }
            if (ps.light) GLOBALS.scene.remove(ps.light);
            particleSystems.splice(i, 1);
        } else {
            if (ps.update) ps.update(deltaTime, ps);
        }
    }
}

export function executeMiracleLightning(pos) {
    addLog(`【天罰】座標[${Math.floor(pos.x)}, ${Math.floor(pos.z)}]に雷が落ちた！`, 'alert');
    
    // Play sound if AudioContext is available
    const actx = getAudioContext();
    if (actx) {
        const osc = actx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, actx.currentTime + 0.5);
        const gain = actx.createGain();
        gain.gain.setValueAtTime(1, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + 0.5);
    }

    // Visuals: Bright cylinder
    const geo = new THREE.CylinderGeometry(5, 5, 2000, 8);
    geo.translate(0, 1000, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    GLOBALS.scene.add(mesh);

    // Light flash
    const light = new THREE.PointLight(0xffffff, 5.0, 1500);
    light.position.set(pos.x, pos.y + 50, pos.z);
    GLOBALS.scene.add(light);

    particleSystems.push({
        life: 0.3,
        mesh: mesh,
        light: light,
        update: (dt, self) => {
            self.mesh.material.opacity = self.life / 0.3;
            self.light.intensity = (self.life / 0.3) * 5.0;
        }
    });

    // Logic
    STATE.characters.forEach((c, i) => {
        if (!c.isDead && c.position.distanceToSquared(pos) < 2500) { // radius 50
            die(c, i, "神の雷");
        }
    });
}

export function executeMiracleQuake(pos) {
    addLog(`【大地震】座標[${Math.floor(pos.x)}, ${Math.floor(pos.z)}]で巨大地震が発生！`, 'alert');

    const actx = getAudioContext();
    if (actx) {
        const bufferSize = actx.sampleRate * 2;
        const noiseBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noiseSrc = actx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;
        const filter = actx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        const gain = actx.createGain();
        gain.gain.setValueAtTime(1.5, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 2.0);
        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(actx.destination);
        noiseSrc.start();
        noiseSrc.stop(actx.currentTime + 2.0);
    }

    // Visuals: Dust particles
    const particleCount = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 80;
        positions[i * 3] = pos.x + Math.cos(angle) * r;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z + Math.sin(angle) * r;

        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 30,
            20 + Math.random() * 40,
            (Math.random() - 0.5) * 30
        ));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({
        color: 0x8b5a2b,
        size: 8.0,
        transparent: true,
        opacity: 0.8
    });
    
    const points = new THREE.Points(geo, mat);
    GLOBALS.scene.add(points);

    particleSystems.push({
        life: 2.0,
        mesh: points,
        velocities: velocities,
        update: (dt, self) => {
            const posAttr = self.mesh.geometry.attributes.position;
            for (let i = 0; i < particleCount; i++) {
                const vel = self.velocities[i];
                posAttr.array[i * 3] += vel.x * dt;
                posAttr.array[i * 3 + 1] += vel.y * dt;
                posAttr.array[i * 3 + 2] += vel.z * dt;
                
                // Gravity effect on dust
                vel.y -= 15 * dt; 
            }
            posAttr.needsUpdate = true;
            self.mesh.material.opacity = (self.life / 2.0) * 0.8;
        }
    });

    // Logic
    STATE.characters.forEach((c, i) => {
        if (!c.isDead && c.position.distanceToSquared(pos) < 10000) { // radius 100
            if (Math.random() < 0.7) die(c, i, "地震による圧死");
        }
    });
    for (let j = STATE.housePositions.length - 1; j >= 0; j--) {
        if (STATE.housePositions[j].distanceToSquared(pos) < 10000) {
            STATE.housePositions.splice(j, 1);
            STATE.houseNations.splice(j, 1);
        }
    }
    rebuildHouses();
}
