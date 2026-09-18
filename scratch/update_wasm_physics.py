import os

def update():
    with open('assembly/index.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    replacement = """
// Physics & Disasters
let tornado_active: bool = false;
let tornado_x: f32 = 0.0;
let tornado_z: f32 = 0.0;

export function triggerTornado(x: f32, z: f32): void {
  tornado_active = true;
  tornado_x = x;
  tornado_z = z;
}

export function stopTornado(): void {
  tornado_active = false;
}
"""
    
    if "triggerTornado" not in content:
        content += replacement
        
        # Now update the update() loop
        start = "      // Reproduction (Plants & Animals)"
        replace_loop = """
      // Tornado physics
      if (tornado_active) {
        let dx = entity_x[i] - tornado_x;
        let dz = entity_z[i] - tornado_z;
        let dist = Mathf.sqrt(dx*dx + dz*dz);
        if (dist < 100.0) {
          // Pull in and up
          entity_x[i] -= dx * dt * 0.05;
          entity_z[i] -= dz * dt * 0.05;
          entity_y[i] += dt * 50.0; // lift
          // Spin
          let spinX = -dz * dt * 0.1;
          let spinZ = dx * dt * 0.1;
          entity_x[i] += spinX;
          entity_z[i] += spinZ;
          
          if (entity_y[i] > 300.0) {
              entity_state[i] = 0; // Destroyed
          }
        }
      }

      // Gravity if in air
      if (entity_y[i] > 0.0 && !tornado_active) {
          entity_y[i] -= dt * 30.0;
          if (entity_y[i] < 0.0) entity_y[i] = 0.0;
      }

      // Reproduction (Plants & Animals)"""
        content = content.replace(start, replace_loop)

        with open('assembly/index.ts', 'w', encoding='utf-8') as f:
            f.write(content)

update()
