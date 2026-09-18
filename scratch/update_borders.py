import os

def update():
    with open('src/world.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove territoryGroup from rebuildHouses
    start = "    GLOBALS.territoryGroup = new THREE.Group();"
    end = "    GLOBALS.scene.add(GLOBALS.territoryGroup);"
    start_idx = content.find(start)
    end_idx = content.find(end) + len(end)
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

    # Update minimap overlay to draw voronoi-like borders
    overlay_start = "export function updateMinimapOverlay() {"
    overlay_end = "        ctx.stroke();\n    }\n}"
    
    overlay_start_idx = content.find(overlay_start)
    overlay_end_idx = content.find(overlay_end) + len(overlay_end)
    
    if overlay_start_idx != -1 and overlay_end_idx != -1:
        new_overlay = """export function updateMinimapOverlay() {
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
}"""
        content = content[:overlay_start_idx] + new_overlay + content[overlay_end_idx:]

    with open('src/world.js', 'w', encoding='utf-8') as f:
        f.write(content)

update()
