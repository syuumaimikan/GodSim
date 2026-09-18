export const wasmExports = {};
export const wasmMemory = {
    x: null, y: null, z: null, type: null, scale: null, state: null
};

export async function initWasm() {
    return new Promise((resolve, reject) => {
        const importObject = {
            env: {
                abort: (message, fileName, line, column) => {
                    console.error(`WASM Abort at ${fileName}:${line}:${column}`);
                }
            }
        };

        WebAssembly.instantiateStreaming(fetch('./build/release.wasm'), importObject)
            .then(obj => {
                Object.assign(wasmExports, obj.instance.exports);
                wasmExports.init();
                
                const buffer = wasmExports.memory.buffer;
                wasmMemory.x = new Float32Array(buffer, wasmExports.getPtrX(), 20000);
                wasmMemory.y = new Float32Array(buffer, wasmExports.getPtrY(), 20000);
                wasmMemory.z = new Float32Array(buffer, wasmExports.getPtrZ(), 20000);
                wasmMemory.scale = new Float32Array(buffer, wasmExports.getPtrScale(), 20000);
                wasmMemory.type = new Int32Array(buffer, wasmExports.getPtrType(), 20000);
                wasmMemory.state = new Int32Array(buffer, wasmExports.getPtrState(), 20000);
                
                console.log("WASM initialized.");
                resolve(wasmExports);
            })
            .catch(err => {
                console.error("WASM instantiation failed:", err);
                reject(err);
            });
    });
}
