import { STATE, GLOBALS } from './state.js';

let audioCtx;
let windGain, cricketGain;

export function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    // --- Wind Noise ---
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    windGain = audioCtx.createGain();
    windGain.gain.value = 0;

    noiseSrc.connect(filter);
    filter.connect(windGain);
    windGain.connect(masterGain);
    noiseSrc.start();

    // --- Crickets (Bug fixed) ---
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 2500; // Changed from 4500Hz to 2500Hz for a more natural insect sound

    const oscFilter = audioCtx.createBiquadFilter();
    oscFilter.type = 'bandpass';
    oscFilter.frequency.value = 2500;
    oscFilter.Q.value = 1.5;

    // The LFO to create the chirping pattern (ON/OFF)
    const ampGain = audioCtx.createGain();
    ampGain.gain.value = 0.5; // Offset for the LFO

    const lfo = audioCtx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 12; // Fast chirping
    
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 0.5; 
    
    lfo.connect(lfoGain);
    lfoGain.connect(ampGain.gain);

    // The master volume for crickets (day/night control)
    cricketGain = audioCtx.createGain();
    cricketGain.gain.value = 0; // Default to 0 (silent during the day)

    osc.connect(oscFilter);
    oscFilter.connect(ampGain);
    ampGain.connect(cricketGain);
    cricketGain.connect(masterGain);

    osc.start();
    lfo.start();
}

export function updateAudio() {
    if (!audioCtx) return;
    
    // Wind based on camera height
    const camH = GLOBALS.camera ? Math.max(0, GLOBALS.camera.position.y) / 2000 : 0.5;
    windGain.gain.setTargetAtTime(Math.min(0.2, camH * 0.15), audioCtx.currentTime, 0.5);

    // Crickets only at night
    const isNight = STATE.worldTime > 0.75 || STATE.worldTime < 0.25 || STATE.nightVision;
    const nightVol = isNight ? 0.08 : 0;
    cricketGain.gain.setTargetAtTime(nightVol, audioCtx.currentTime, 2.0);
}

export function getAudioContext() {
    return audioCtx;
}
