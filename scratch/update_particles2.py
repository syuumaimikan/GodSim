import os

def update():
    with open('src/particles.js', 'r', encoding='utf-8') as f:
        content = f.read()

    tornado_fn = """
export function executeMiracleTornado(pos) {
    addLog(`【大竜巻】座標[${Math.floor(pos.x)}, ${Math.floor(pos.z)}]で大竜巻が発生！`, 'alert');
    
    // We can call WASM if needed, but for now just visuals and simple logic
    import('./wasm.js').then(({ wasmExports }) => {
        if (wasmExports && wasmExports.triggerTornado) {
            wasmExports.triggerTornado(pos.x, pos.z, 50.0);
        }
    });

    const actx = getAudioContext();
    if (actx) {
        const osc = actx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(50, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, actx.currentTime + 3.0);
        const gain = actx.createGain();
        gain.gain.setValueAtTime(2.0, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 3.0);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + 3.0);
    }

    // Visuals: Tornado Cone
    const geo = new THREE.CylinderGeometry(20, 2, 100, 16);
    geo.translate(0, 50, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x444455, transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    GLOBALS.scene.add(mesh);

    particleSystems.push({
        life: 3.0,
        mesh: mesh,
        update: (dt, self) => {
            self.mesh.rotation.y += dt * 10.0; // Spin fast
            self.mesh.position.x += (Math.random() - 0.5) * 10 * dt;
            self.mesh.position.z += (Math.random() - 0.5) * 10 * dt;
            self.mesh.material.opacity = (self.life / 3.0) * 0.7;
        }
    });

    // JS Logic
    STATE.characters.forEach((c, i) => {
        if (!c.isDead && c.position.distanceToSquared(mesh.position) < 2500) {
            if (Math.random() < 0.8) die(c, i, "竜巻に巻き込まれた");
        }
    });
}
"""
    if "executeMiracleTornado" not in content:
        content += "\n" + tornado_fn

    with open('src/particles.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
