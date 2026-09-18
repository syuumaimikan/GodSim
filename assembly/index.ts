// GodSim WASM Simulation Engine

const MAX_ENTITIES = 20000;

export const entity_x = new Float32Array(MAX_ENTITIES);
export const entity_y = new Float32Array(MAX_ENTITIES);
export const entity_z = new Float32Array(MAX_ENTITIES);
export const entity_type = new Int32Array(MAX_ENTITIES); // 0 = empty, 1 = oak, 2 = pine, ... 100 = human, 101 = deer
export const entity_scale = new Float32Array(MAX_ENTITIES);
export const entity_age = new Float32Array(MAX_ENTITIES);
export const entity_max_age = new Float32Array(MAX_ENTITIES);
export const entity_ideal_temp = new Float32Array(MAX_ENTITIES);
export const entity_ideal_humidity = new Float32Array(MAX_ENTITIES);
export const entity_state = new Int32Array(MAX_ENTITIES); // 0: dead/empty, 1: alive

let entity_count = 0;

export function getEntityCount(): i32 { return entity_count; }
export function getPtrX(): usize { return entity_x.dataStart; }
export function getPtrY(): usize { return entity_y.dataStart; }
export function getPtrZ(): usize { return entity_z.dataStart; }
export function getPtrType(): usize { return entity_type.dataStart; }
export function getPtrScale(): usize { return entity_scale.dataStart; }
export function getPtrState(): usize { return entity_state.dataStart; }

export function init(): void {
  // Initialize with some entities if needed
  entity_count = 0;
}

export function spawnEntity(type: i32, x: f32, y: f32, z: f32, temp: f32, humidity: f32): i32 {
  for (let i = 0; i < MAX_ENTITIES; i++) {
    if (entity_state[i] == 0) {
      entity_state[i] = 1;
      entity_type[i] = type;
      entity_x[i] = x;
      entity_y[i] = y;
      entity_z[i] = z;
      entity_scale[i] = 0.1; // start small
      entity_age[i] = 0;
      entity_max_age[i] = 1000.0;
      entity_ideal_temp[i] = temp;
      entity_ideal_humidity[i] = humidity;
      if (i >= entity_count) entity_count = i + 1;
      return i;
    }
  }
  return -1;
}

// Pseudo-random generator for WASM
let seed: u32 = 123456789;
function rand(): f32 {
  seed ^= seed << 13;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  return (seed as f32) / 4294967295.0;
}

export function getTerrainHeight(x: f32, z: f32): f32 {
  // In a real scenario, we'd sample the same noise function as JS.
  // For now, we rely on JS to correct Y positions, or we port simplex noise to AS.
  // We'll leave Y mostly static and let JS handle exact terrain pinning for plants.
  return 0.0; 
}

export function update(dt: f32, globalTemp: f32, globalHumidity: f32): void {
  for (let i = 0; i < entity_count; i++) {
    if (entity_state[i] == 1) {
      // Age
      entity_age[i] += dt;
      if (entity_age[i] > entity_max_age[i]) {
        entity_state[i] = 0; // Die of old age
        continue;
      }

      // Growth
      if (entity_scale[i] < 1.0) {
        entity_scale[i] += dt * 0.01;
      }

      // Environmental check (Evolution mechanism)
      // If environment deviates from ideal too much, they might die
      let tDiff = Mathf.abs(globalTemp - entity_ideal_temp[i]);
      let hDiff = Mathf.abs(globalHumidity - entity_ideal_humidity[i]);
      
      if (tDiff > 0.4 || hDiff > 0.4) {
        // High chance of death if not adapted
        if (rand() < dt * 0.05) {
          entity_state[i] = 0;
          continue;
        }
      }


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

      // Reproduction (Plants & Animals)
      if (entity_age[i] > 100.0 && rand() < dt * 0.01) {
        // Spawn a child nearby with mutated genes
        let nx = entity_x[i] + (rand() - 0.5) * 50.0;
        let nz = entity_z[i] + (rand() - 0.5) * 50.0;
        
        let mTemp = entity_ideal_temp[i] + (rand() - 0.5) * 0.1;
        let mHum = entity_ideal_humidity[i] + (rand() - 0.5) * 0.1;
        
        spawnEntity(entity_type[i], nx, 0, nz, mTemp, mHum);
      }
    }
  }
}

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
