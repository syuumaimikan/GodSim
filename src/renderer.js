import { GLOBALS } from './state.js';

export function initThreeJS() {
    const container = document.getElementById('canvas-container');

    GLOBALS.scene = new THREE.Scene();
    GLOBALS.scene.background = new THREE.Color(0x87CEEB);
    GLOBALS.scene.fog = new THREE.FogExp2(0x87CEEB, 0.0006);

    GLOBALS.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    GLOBALS.camera.position.set(0, 1200, 1800);

    GLOBALS.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    GLOBALS.renderer.setSize(window.innerWidth, window.innerHeight);
    GLOBALS.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    GLOBALS.renderer.shadowMap.enabled = true;
    GLOBALS.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    GLOBALS.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    GLOBALS.renderer.toneMappingExposure = 1.1;
    container.appendChild(GLOBALS.renderer.domElement);

    GLOBALS.controls = new THREE.OrbitControls(GLOBALS.camera, GLOBALS.renderer.domElement);
    GLOBALS.controls.enableDamping = true;
    GLOBALS.controls.dampingFactor = 0.05;
    GLOBALS.controls.screenSpacePanning = true;
    GLOBALS.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    GLOBALS.controls.minDistance = 5;
    GLOBALS.controls.maxDistance = 4500;

    GLOBALS.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    GLOBALS.scene.add(GLOBALS.ambientLight);

    GLOBALS.dirLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
    GLOBALS.dirLight.position.set(800, 1500, 800);
    GLOBALS.dirLight.castShadow = true;
    GLOBALS.dirLight.shadow.mapSize.width = 2048;
    GLOBALS.dirLight.shadow.mapSize.height = 2048;
    GLOBALS.dirLight.shadow.camera.near = 0.5;
    GLOBALS.dirLight.shadow.camera.far = 6000;
    const d = 2000;
    GLOBALS.dirLight.shadow.camera.left = -d;
    GLOBALS.dirLight.shadow.camera.right = d;
    GLOBALS.dirLight.shadow.camera.top = d;
    GLOBALS.dirLight.shadow.camera.bottom = -d;
    GLOBALS.dirLight.shadow.bias = -0.0005;
    GLOBALS.scene.add(GLOBALS.dirLight);

    GLOBALS.moonLight = new THREE.DirectionalLight(0x88bbff, 0.3);
    GLOBALS.moonLight.position.set(-800, -1500, -800);
    GLOBALS.scene.add(GLOBALS.moonLight);

    GLOBALS.raycaster = new THREE.Raycaster();
    GLOBALS.mouse = new THREE.Vector2();

    GLOBALS.starsGroup = new THREE.Group();
    createStars();
    GLOBALS.scene.add(GLOBALS.starsGroup);

    GLOBALS.frustum = new THREE.Frustum();
    GLOBALS.cameraViewProjectionMatrix = new THREE.Matrix4();
}

export function onWindowResize() {
    if (GLOBALS.camera && GLOBALS.renderer) {
        GLOBALS.camera.aspect = window.innerWidth / window.innerHeight;
        GLOBALS.camera.updateProjectionMatrix();
        GLOBALS.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

export function createStars() {
    while (GLOBALS.starsGroup.children.length > 0) {
        GLOBALS.starsGroup.remove(GLOBALS.starsGroup.children[0]);
    }

    const starsGeo = new THREE.BufferGeometry();
    const starsMat = new THREE.PointsMaterial({ vertexColors: true, size: 5.0, transparent: true, opacity: 0 });

    const starsPos = [];
    const starsCol = [];
    const color = new THREE.Color();

    for (let i = 0; i < 18000; i++) {
        const x = (Math.random() - 0.5) * 9000;
        const y = Math.random() * 2500 + 400;
        const z = (Math.random() - 0.5) * 9000;
        starsPos.push(x, y, z);

        const r = Math.random();
        if (r < 0.12) color.setHex(0x88ccff);
        else if (r < 0.22) color.setHex(0xffea88);
        else if (r < 0.3) color.setHex(0xff88ff);
        else color.setHex(0xffffff);

        starsCol.push(color.r, color.g, color.b);
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPos, 3));
    starsGeo.setAttribute('color', new THREE.Float32BufferAttribute(starsCol, 3));
    const starPoints = new THREE.Points(starsGeo, starsMat);
    GLOBALS.starsGroup.add(starPoints);
}
