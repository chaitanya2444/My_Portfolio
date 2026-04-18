// ---- SAMSY.NINJA INSPIRED GALAXY ENGINE ----
const canvas = document.getElementById('neural-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020105); 
scene.fog = new THREE.FogExp2(0x020105, 0.001);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 150, 1400); 
scene.add(camera);

// ---- POST PROCESSING (BLOOM & GLOW) ----
const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 3.0, 1.0, 0.1); 
const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ---- CONTROLS ----
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false; 
controls.enablePan = true;
controls.enableZoom = true; 
controls.minDistance = 50; 
controls.maxDistance = 2500;

// ---- STATE MACHINE ----
let STATE = 0; // 0 = GALAXY, 1 = SOLAR, 2 = PLANET
let orbitSpeedMultiplier = 1;
let isTransitioning = false;

// Prepare DOM for Interactive Cards
const sections = document.querySelectorAll('main section');
const mainEl = document.querySelector('main');
if(mainEl) {
    mainEl.style.position = 'fixed';
    mainEl.style.inset = '0';
    mainEl.style.pointerEvents = 'none';
}

function resetSectionStyles() {
    sections.forEach(sec => {
        sec.classList.remove('reveal');
        sec.classList.add('interactive-section', 'glass-card');
        sec.style.display = 'none';
        sec.classList.remove('active');
        sec.style.position = 'absolute';
        sec.style.top = '50%';
        sec.style.left = '50%';
        sec.style.transform = 'translate(-50%, -50%)';
        sec.style.width = '90vw';
        sec.style.maxWidth = '1100px';
        sec.style.maxHeight = '';
        sec.style.overflowY = '';
        sec.style.margin = '0';
        sec.style.padding = '3rem';
        sec.style.background = 'rgba(5, 5, 5, 0.7)';
        sec.style.border = '1px solid rgba(0, 245, 255, 0.2)';
    });
}
resetSectionStyles();

function showHtmlSection(id) {
    if (id === 'all') {
        mainEl.style.pointerEvents = 'auto';
        mainEl.style.overflowY = 'auto';
        mainEl.style.overflowX = 'hidden';
        mainEl.style.background = 'rgba(5, 5, 5, 0.85)';
        mainEl.style.backdropFilter = 'blur(15px)';
        mainEl.style.zIndex = '50';
        mainEl.classList.add('nav-active');
        
        const logo = document.getElementById('global-rlc-logo');
        const footer = document.getElementById('global-rlc-footer');
        if(logo) { logo.style.transition = 'opacity 0.3s'; logo.style.opacity = '0'; }
        if(footer) { footer.style.transition = 'opacity 0.3s'; footer.style.opacity = '0'; }
        
        sections.forEach(sec => {
            sec.style.display = sec.id === 'hero' ? 'flex' : 'block';
            sec.style.position = 'relative'; 
            sec.style.top = '0';
            sec.style.left = '0';
            sec.style.transform = 'none';
            sec.style.width = '100%';
            sec.style.maxWidth = '1200px';
            sec.style.maxHeight = 'none';
            sec.style.overflowY = 'visible';
            sec.style.margin = '0 auto 4rem auto';
            sec.style.padding = '5rem 2rem';
            sec.style.background = 'transparent';
            sec.style.border = 'none';
            sec.classList.remove('glass-card');
            setTimeout(() => sec.classList.add('active'), 50);
        });

        // Trigger secondary 3D WebGL renderer even in the 'All' view
        if (!window.techBallsInitialized) {
            setTimeout(() => {
                if(typeof initTechBalls === 'function') initTechBalls();
                window.techBallsInitialized = true;
            }, 500);
        }
    } else {
        mainEl.style.pointerEvents = 'none';
        mainEl.style.overflowY = 'hidden';
        mainEl.style.background = 'transparent';
        mainEl.style.backdropFilter = 'blur(0px)';
        mainEl.style.zIndex = '1';
        mainEl.classList.add('nav-active');

        const logo = document.getElementById('global-rlc-logo');
        const footer = document.getElementById('global-rlc-footer');
        if(logo) { logo.style.transition = 'opacity 0.3s'; logo.style.opacity = '0'; }
        if(footer) { footer.style.transition = 'opacity 0.3s'; footer.style.opacity = '0'; }

        resetSectionStyles();
        
        const target = document.getElementById(id);
        if(target) {
            target.style.display = 'block';
            if (id === 'hero') target.style.display = 'flex';
            
            // Trigger secondary 3D WebGL renderer exactly when viewing the Varun Skills card
            if (id === 'skills' && !window.techBallsInitialized) {
                if(typeof initTechBalls === 'function') initTechBalls();
                window.techBallsInitialized = true;
            }

            setTimeout(() => target.classList.add('active'), 50);
        }
    }
}
function hideAllHtmlSections() {
    mainEl.style.pointerEvents = 'none';
    mainEl.style.overflowY = 'hidden';
    mainEl.style.background = 'transparent';
    mainEl.style.backdropFilter = 'blur(0px)';
    mainEl.classList.remove('nav-active');
    
    const logo = document.getElementById('global-rlc-logo');
    const footer = document.getElementById('global-rlc-footer');
    if(logo) { logo.style.transition = 'opacity 0.3s'; logo.style.opacity = '1'; }
    if(footer) { footer.style.transition = 'opacity 0.3s'; footer.style.opacity = '1'; }
    
    sections.forEach(sec => sec.classList.remove('active'));
    setTimeout(() => {
        resetSectionStyles();
    }, 500);
}

// ---- CUSTOM CAMERA TWEENING ENGINE ----
const tweens = [];
function tweenCamera(targetPos, targetLookAt, duration, onComplete) {
    tweens.push({
        startPos: camera.position.clone(),
        endPos: targetPos.clone(),
        startLook: controls.target.clone(),
        endLook: targetLookAt.clone(),
        startTime: performance.now(),
        duration,
        onComplete
    });
}
function updateTweens(time) {
    for (let i = tweens.length - 1; i >= 0; i--) {
        const t = tweens[i];
        const elapsed = time - t.startTime;
        const progress = Math.min(elapsed / t.duration, 1.0);
        
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        camera.position.lerpVectors(t.startPos, t.endPos, ease);
        controls.target.lerpVectors(t.startLook, t.endLook, ease);
        
        if (progress === 1.0) {
            if (t.onComplete) t.onComplete();
            tweens.splice(i, 1);
        }
    }
}

// ---- WARP SPEED LINES (SamSy.ninja effect) ----
const warpGroup = new THREE.Group();
const warpMaterial = new THREE.LineBasicMaterial({
    color: 0x00f5ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending
});
const warpGeom = new THREE.BufferGeometry();
const warpLinesCount = 800; // Tons of lines
const warpPositions = new Float32Array(warpLinesCount * 6);
for(let i=0; i<warpLinesCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 80 + 2; 
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const z = (Math.random() - 0.5) * 500;
    const length = Math.random() * 100 + 40;
    warpPositions[i*6] = x;
    warpPositions[i*6+1] = y;
    warpPositions[i*6+2] = z;
    warpPositions[i*6+3] = x;
    warpPositions[i*6+4] = y;
    warpPositions[i*6+5] = z + length;
}
warpGeom.setAttribute('position', new THREE.BufferAttribute(warpPositions, 3));
const warpLines = new THREE.LineSegments(warpGeom, warpMaterial);
warpGroup.add(warpLines);
warpGroup.position.z = -50; 
camera.add(warpGroup);

// ---- ALIEN UFO HUD MASCOT ----
function createAlienUFO() {
    const group = new THREE.Group();
    
    // Glass Dome
    const domeMat = new THREE.MeshPhysicalMaterial({
        color: 0x00f5ff, transmission: 0.9, opacity: 1, metalness: 0, roughness: 0, 
        ior: 1.5, thickness: 0.1, transparent: true
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    group.add(dome);

    // Rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.4, 16, 64), rimMat);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
    
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.0, 0.5, 32), rimMat);
    cap.position.y = -0.25;
    group.add(cap);

    const engine = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), new THREE.MeshStandardMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 2.0 }));
    engine.position.y = -0.6;
    group.add(engine);

    // Alien Body
    const alienGroup = new THREE.Group();
    const alienBodyMat = new THREE.MeshStandardMaterial({ color: 0x39ff14, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), alienBodyMat);
    head.position.y = 0.5;
    alienGroup.add(head);
    
    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), eyeMat);
    leftEye.position.set(-0.3, 0.6, 0.5); leftEye.scale.set(1, 1.5, 0.5); leftEye.rotation.set(-0.2, 0, 0.2);
    alienGroup.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), eyeMat);
    rightEye.position.set(0.3, 0.6, 0.5); rightEye.scale.set(1, 1.5, 0.5); rightEye.rotation.set(-0.2, 0, -0.2);
    alienGroup.add(rightEye);
    
    group.add(alienGroup);
    return { ufoGroup: group, alienGroup, rim, engine };
}
const ufo = createAlienUFO();
ufo.ufoGroup.position.set(18, -10, -35); 
camera.add(ufo.ufoGroup);


// ---- SCENE 1: GALAXIES ----
const galaxyGroup = new THREE.Group();
scene.add(galaxyGroup);
const interactableGalaxies = [];

function createSpiralGalaxy(colorHex, x, y, z, rotationZ) {
    const container = new THREE.Object3D();
    container.position.set(x, y, z);
    container.rotation.z = rotationZ;
    container.rotation.x = Math.PI / 4;

    // LAYER 1: Core Glow (High Intensity Center)
    const coreGeom = new THREE.SphereGeometry(4, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const core = new THREE.Mesh(coreGeom, coreMat);
    container.add(core);

    const haloGeom = new THREE.SphereGeometry(15, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.2, side: THREE.BackSide });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    container.add(halo);

    // LAYER 2: The Main Star Map (Spiral Arms)
    const count = 25000;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorObj = new THREE.Color(colorHex);
    const pink = new THREE.Color(0xff00ff);
    const white = new THREE.Color(0xffffff);

    for(let i=0; i<count; i++) {
        const r = Math.random() * 85;
        const branchTheta = (i % 3) * ((Math.PI * 2) / 3);
        const theta = r * 0.15 + branchTheta + (Math.random()-0.5)*1.2;
        
        const px = Math.cos(theta) * r;
        const py = (Math.random()-0.5) * (60 - r) * 0.4;
        const pz = Math.sin(theta) * r;

        pos[i*3] = px;
        pos[i*3+1] = py;
        pos[i*3+2] = pz;

        // Gradient: White @ center -> Pink @ mid -> Color @ edge
        let lerpColor;
        if (r < 20) lerpColor = white.clone().lerp(pink, r / 20);
        else if (r < 50) lerpColor = pink.clone().lerp(colorObj, (r - 20) / 30);
        else lerpColor = colorObj;

        colors[i*3] = lerpColor.r;
        colors[i*3+1] = lerpColor.g;
        colors[i*3+2] = lerpColor.b;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const mat = new THREE.PointsMaterial({ size: 0.35, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(geom, mat);
    container.add(stars);

    // LAYER 3: Volumetric Nebula Clouds (Fuzzy stars/gas)
    const nebulaCount = 4000;
    const nGeom = new THREE.BufferGeometry();
    const nPos = new Float32Array(nebulaCount * 3);
    const nColors = new Float32Array(nebulaCount * 3);
    for(let i=0; i<nebulaCount; i++) {
        const r = Math.random() * 80;
        const theta = r * 0.15 + (i % 3) * ((Math.PI * 2) / 3) + (Math.random()-0.5)*2.0;
        nPos[i*3] = Math.cos(theta) * r;
        nPos[i*3+1] = (Math.random()-0.5) * 20;
        nPos[i*3+2] = Math.sin(theta) * r;

        const c = colorObj.clone().lerp(pink, Math.random());
        nColors[i*3] = c.r; nColors[i*3+1] = c.g; nColors[i*3+2] = c.b;
    }
    nGeom.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
    nGeom.setAttribute('color', new THREE.BufferAttribute(nColors, 3));
    const nMat = new THREE.PointsMaterial({ size: 3.5, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.08 });
    const nebula = new THREE.Points(nGeom, nMat);
    container.add(nebula);
    
    // LAYER 4: Interaction Hitbox
    const hitBox = new THREE.Mesh(new THREE.SphereGeometry(60, 8, 8), new THREE.MeshBasicMaterial({transparent: true, opacity: 0}));
    hitBox.userData = { isGalaxy: true, color: colorHex };
    container.add(hitBox);

    galaxyGroup.add(container);
    interactableGalaxies.push(hitBox);
    return container;
}

const g1 = createSpiralGalaxy(0x00f5ff, -180, 50, 700, 0); 
const g2 = createSpiralGalaxy(0xff00ff, 180, -50, 600, Math.PI/2); 
const g3 = createSpiralGalaxy(0x39ff14, 0, 100, 400, Math.PI); 

// ---- SCENE 2: SOLAR SYSTEM OVERHAUL ----
// Solar system now perpetually visible in the background from the onset!
const solarSystemGroup = new THREE.Group();
solarSystemGroup.visible = true;
scene.add(solarSystemGroup);

const interactablePlanets = [];

function makeTextSprite(message, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.font = "Bold 100px 'Inter', sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.shadowBlur = 20; 
    ctx.fillText(message, 512, 128);
    ctx.fillText(message, 512, 128); 

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, visible: false }); 
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(240, 60, 1);
    sprite.userData = { isPlanetLabel: true };
    return sprite;
}

// CENTRAL SUN IS THE 'HOME' BUTTON
const sunGeom = new THREE.SphereGeometry(30, 64, 64);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
const sun = new THREE.Mesh(sunGeom, sunMat);
solarSystemGroup.add(sun);

const sunLabel = makeTextSprite('HOME', 0xffffff);
sunLabel.position.y = 50;
sun.add(sunLabel);
sun.userData = { id: 'all', isPlanet: true, size: 30 };
interactablePlanets.push(sun);

const sunLight = new THREE.PointLight(0xffffff, 3.0, 1500);
solarSystemGroup.add(sunLight);
const ambientLight = new THREE.AmbientLight(0x0f111a, 0.8);
solarSystemGroup.add(ambientLight);

const haloMat = new THREE.MeshBasicMaterial({
    color: 0x00f5ff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, side: THREE.BackSide
});
solarSystemGroup.add(new THREE.Mesh(new THREE.SphereGeometry(33, 64, 64), haloMat));

const sectionsMapping = [
    { id: 'about', name: 'ABOUT ME', color: 0x00f5ff, size: 12, dist: 155, speed: 0.009 },
    { id: 'skills', name: 'SKILLS', color: 0x39ff14, size: 18, dist: 240, speed: 0.006 },
    { id: 'projects', name: 'PROJECTS', color: 0xff00ff, size: 15, dist: 335, speed: 0.004 },
    { id: 'education', name: 'EDUCATION', color: 0xffbd2e, size: 20, dist: 400, speed: 0.003 },
    { id: 'experience', name: 'EXPERIENCE', color: 0xe0f7fa, size: 26, dist: 490, speed: 0.002, hasRing: true },
    { id: 'contact', name: 'CONTACT', color: 0xff4500, size: 14, dist: 620, speed: 0.001 }
];

const planetOrbitGroups = [];

sectionsMapping.forEach((s, i) => {
    const ringGeom = new THREE.RingGeometry(s.dist-1.0, s.dist+1.0, 128); // Super thick orbit lines
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, side: THREE.DoubleSide, transparent:true, opacity:0.2 }); // Higher glow visibility
    const orbitRing = new THREE.Mesh(ringGeom, ringMat);
    orbitRing.rotation.x = Math.PI / 2;
    solarSystemGroup.add(orbitRing);

    const group = new THREE.Group();
    
    const geom = new THREE.SphereGeometry(s.size, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
        color: s.color, emissive: s.color, emissiveIntensity: 0.3, roughness: 0.4, metalness: 0.8,
        wireframe: (i % 2 === 0) 
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.x = s.dist;
    mesh.userData = { id: s.id, isPlanet: true, size: s.size, color: s.color }; // Provide color to warp line
    interactablePlanets.push(mesh); 

    if (s.hasRing) {
        const saturnRing = new THREE.TorusGeometry(s.size + 14, 2.5, 16, 128);
        const satMat = new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.5, wireframe: true });
        const sRingMesh = new THREE.Mesh(saturnRing, satMat);
        sRingMesh.rotation.x = Math.PI / 1.8;
        mesh.add(sRingMesh);
    }

    const label = makeTextSprite(s.name, s.color);
    label.position.y = s.size + 25;
    mesh.add(label);

    group.add(mesh);
    group.rotation.y = Math.random() * Math.PI * 2;
    solarSystemGroup.add(group);
    planetOrbitGroups.push({ group, mesh, speed: s.speed, dist: s.dist });
});

// Deep Space Starfield (MASSIVELY UPGRADED)
const starsGeom = new THREE.BufferGeometry();
const starsCount = 35000;
const posArray = new Float32Array(starsCount * 3);
for(let i=0; i < starsCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 3000; // Super widespread
}
starsGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const starsMat = new THREE.PointsMaterial({ size: 0.7, color: 0xffffff, transparent: true, opacity: 0.9 });
const starMesh = new THREE.Points(starsGeom, starsMat);
scene.add(starMesh);

const asteroidGroup = new THREE.Group();
const rockCount = 700; // Slightly fewer, incredibly large distinct rocks
const rockGeom = new THREE.DodecahedronGeometry(2); // Reduced from 4
// Enable flatShading: true so they render as sharp, crisp crystals instead of blurry spheres
const rockInstanced = new THREE.InstancedMesh(rockGeom, new THREE.MeshStandardMaterial({color: 0x99aabb, roughness: 0.8, metalness: 0.4, flatShading: true}), rockCount);
const dummy = new THREE.Object3D();
for(let i=0; i<rockCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 340 + (Math.random() - 0.5) * 50; 
    dummy.position.set(Math.cos(angle)*dist, (Math.random() - 0.5) * 20, Math.sin(angle)*dist);
    dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    const scale = Math.random() * 1.2 + 0.3; // Minimized upscaling slightly
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    rockInstanced.setMatrixAt(i, dummy.matrix);
}
asteroidGroup.add(rockInstanced);
solarSystemGroup.add(asteroidGroup);

// ---- COMETS ----
const cometsGroup = new THREE.Group();
const cometsCount = 10;
const comets = [];
for(let i=0; i<cometsCount; i++) {
    const comet = new THREE.Group();
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(3), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.1, metalness: 0.8, emissive: 0x666666, flatShading: true}));
    comet.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(2.5, 80, 16), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
    }));
    tail.position.y = 40;
    comet.add(tail);
    comet.rotation.z = -Math.PI / 4; // -45 degrees points the tail back towards Top-Right (+X, +Y) 
    comet.position.set(500 + Math.random()*1000, 500 + Math.random()*1000, (Math.random()-0.5)*1000);
    cometsGroup.add(comet);
    comets.push({ mesh: comet, speed: 0.8 + Math.random()*1.2 });
}
solarSystemGroup.add(cometsGroup);

// ---- FREIGHTER SPACESHIPS ----
const shipsGroup = new THREE.Group();
const ships = [];
function createShip() {
    const ship = new THREE.Group();
    const bodyGeom = new THREE.CylinderGeometry(0.8, 2, 15, 8);
    bodyGeom.rotateZ(Math.PI / 2); 
    const bodyMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8, roughness: 0.2});
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    ship.add(body);
    const thruster = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), new THREE.MeshBasicMaterial({color: 0xff3300}));
    thruster.position.x = 7.5; 
    ship.add(thruster);
    return ship;
}

for(let i=0; i<2; i++) {
    const ship = createShip();
    ship.position.set(1000 + Math.random()*500, (Math.random()-0.5)*300, (Math.random()-0.5)*800);
    shipsGroup.add(ship);
    ships.push({ mesh: ship, speed: -2 - Math.random(), dir: -1 });
}
for(let i=0; i<2; i++) {
    const ship = createShip();
    ship.rotation.y = Math.PI; 
    ship.position.set(-1000 - Math.random()*500, (Math.random()-0.5)*300, (Math.random()-0.5)*800);
    shipsGroup.add(ship);
    ships.push({ mesh: ship, speed: 2 + Math.random(), dir: 1 });
}
solarSystemGroup.add(shipsGroup);

// ---- RAYCASTER & INTERACTION LOGIC ----
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function setPlanetLabelsVisible(visible) {
    interactablePlanets.forEach(p => {
        p.children.forEach(c => {
            if(c.userData.isPlanetLabel) {
                c.material.visible = visible;
            }
        });
    });
}

document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    if (STATE === 0 && !isTransitioning) {
        document.body.style.cursor = raycaster.intersectObjects(interactableGalaxies).length > 0 ? 'pointer' : 'default';
    } else if (STATE === 1 && !isTransitioning) {
        document.body.style.cursor = raycaster.intersectObjects(interactablePlanets, true).length > 0 ? 'pointer' : 'default';
        interactablePlanets.forEach(p => {
            if(p.material && p.material.emissiveIntensity !== undefined) p.material.emissiveIntensity = 0.3;
        });
        const intersects = raycaster.intersectObjects(interactablePlanets, true);
        if(intersects.length > 0) {
            let hit = intersects[0].object;
            while(hit && !hit.userData.isPlanet) hit = hit.parent;
            if(hit && hit.material && hit.material.emissiveIntensity !== undefined) hit.material.emissiveIntensity = 1.0;
        }
    }
});

let cameraDefaultSolarDist = 1100; // Farther out to observe all planets easily!
let cameraDefaultSolarHeight = 350;

document.addEventListener('click', () => {
    if(isTransitioning) return;
    raycaster.setFromCamera(mouse, camera);
    
    if (STATE === 0) {
        const intersects = raycaster.intersectObjects(interactableGalaxies);
        if (intersects.length > 0) {
            isTransitioning = true;
            
            // Extract the Hex Color from the chosen Galaxy and apply to the Warp speed lines!
            const chosenGalaxy = intersects[0].object;
            warpMaterial.color.setHex(chosenGalaxy.userData.color || 0x00f5ff);
            
            const targetPos = new THREE.Vector3();
            chosenGalaxy.getWorldPosition(targetPos);
            const offsetPos = targetPos.clone().add(new THREE.Vector3(0, 0, 50));
            
            tweenCamera(offsetPos, targetPos, 1500, () => {
                galaxyGroup.visible = false;
                
                const galaxyTitle = document.getElementById('galaxy-title');
                if(galaxyTitle) galaxyTitle.style.display = 'none';
                
                const sideNav = document.getElementById('side-nav');
                if(sideNav) sideNav.style.display = 'flex';
                
                // Set camera to wide overview of solar system
                camera.position.set(0, cameraDefaultSolarHeight, cameraDefaultSolarDist);
                controls.target.set(0, 0, 0);
                controls.enableZoom = true; // Fully enables zooming logic
                controls.enablePan = true;
                
                setPlanetLabelsVisible(true); 
                STATE = 1;
                isTransitioning = false;
            });
        }
    } else if (STATE === 1) {
        const intersects = raycaster.intersectObjects(interactablePlanets, true);
        if (intersects.length > 0) {
            let planet = intersects[0].object;
            while(planet && !planet.userData.isPlanet) planet = planet.parent;
            if (!planet) return; 

            isTransitioning = true;
            
            // Re-adapt Star warp color from planet
            const colorHex = planet.userData.color || 0xffffff;
            warpMaterial.color.setHex(colorHex);
            
            const sectionId = planet.userData.id;
            
            const worldPos = new THREE.Vector3();
            planet.getWorldPosition(worldPos);
            
            orbitSpeedMultiplier = 0; 
            controls.enabled = false; // Restrict rotation when reading
            
            const size = planet.userData.size || 10;
            let offset = worldPos.clone().normalize().multiplyScalar(size * 6);
            if (worldPos.lengthSq() < 0.1) offset = new THREE.Vector3(0, 0, 250); 
            
            const camPos = worldPos.clone().add(offset).add(new THREE.Vector3(0, 5, 0)); 
            
            tweenCamera(camPos, worldPos, 1200, () => {
                showHtmlSection(sectionId);
                const backBtn = document.getElementById('back-btn');
                if(backBtn) backBtn.style.display = 'block';
                STATE = 2;
                isTransitioning = false;
            });
        }
    }
});

// Sidebar Navigation Linking
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if(isTransitioning) return;
        
        const targetId = e.target.getAttribute('data-target');
        const planet = interactablePlanets.find(p => p.userData.id === targetId);
        if(!planet) return;

        // Force leap state out of Galaxy Start Screen if needed
        if (STATE === 0) {
            galaxyGroup.visible = false;
            setPlanetLabelsVisible(true);
            const sideNav = document.getElementById('side-nav');
            if(sideNav) sideNav.style.display = 'flex';
            
            const galaxyTitle = document.getElementById('galaxy-title');
            if(galaxyTitle) galaxyTitle.style.display = 'none';
            STATE = 1;
        }
        
        isTransitioning = true;
        hideAllHtmlSections();
        
        const colorHex = planet.material && planet.material.color ? planet.material.color.getHex() : 0xffffff;
        warpMaterial.color.setHex(colorHex);
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const sectionId = planet.userData.id;
        const worldPos = new THREE.Vector3();
        planet.getWorldPosition(worldPos);
        
        orbitSpeedMultiplier = 0; 
        controls.enabled = false;
        
        const size = planet.userData.size || 10;
        let offset = worldPos.clone().normalize().multiplyScalar(size * 6);
        if (worldPos.lengthSq() < 0.1) offset = new THREE.Vector3(0, 0, 250); 
        
        const camPos = worldPos.clone().add(offset).add(new THREE.Vector3(0, 5, 0)); 
        
        tweenCamera(camPos, worldPos, 1200, () => {
            showHtmlSection(sectionId);
            const backBtn = document.getElementById('back-btn');
            if(backBtn) backBtn.style.display = 'block';
            STATE = 2;
            isTransitioning = false;
        });
    });
});

setTimeout(() => {
    const backBtn = document.getElementById('back-btn');
    if(backBtn) {
        backBtn.addEventListener('click', () => {
            if(isTransitioning) return;
            isTransitioning = true;
            hideAllHtmlSections();
            backBtn.style.display = 'none';
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            
            tweenCamera(new THREE.Vector3(0, cameraDefaultSolarHeight, cameraDefaultSolarDist), new THREE.Vector3(0,0,0), 1500, () => {
                orbitSpeedMultiplier = 1;
                controls.enabled = true; // Restores zoom and pan on return
                STATE = 1;
                isTransitioning = false;
            });
        });
    }
}, 1000);

// ---- ANIMATE ----
function animate(time) {
    requestAnimationFrame(animate);
    
    updateTweens(performance.now());

    // Hyperspeed Effect Logic
    if(isTransitioning) {
        const pos = warpLines.geometry.attributes.position.array;
        for(let i=0; i<warpLinesCount; i++) {
            pos[i*6+2] += 60; // hyper velocity shift
            pos[i*6+5] += 60; 
            if(pos[i*6+2] > 50) {
                pos[i*6+2] = -500;
                pos[i*6+5] = -500 + (Math.random() * 100 + 40);
            }
        }
        warpLines.geometry.attributes.position.needsUpdate = true;
        if(warpMaterial.opacity < 0.8) warpMaterial.opacity += 0.05;
        
        // Push UFO forward
        ufo.ufoGroup.position.z += (-20 - ufo.ufoGroup.position.z) * 0.1;
    } else {
        if(warpMaterial.opacity > 0) warpMaterial.opacity -= 0.05;
        // Float UFO
        ufo.ufoGroup.position.y = -10 + Math.sin(time * 0.002) * 1.5;
        ufo.ufoGroup.position.z += (-35 - ufo.ufoGroup.position.z) * 0.05;
        ufo.alienGroup.rotation.y = (mouse.x * 0.5);
        ufo.alienGroup.rotation.x = -(mouse.y * 0.5);
    }

    g1.rotation.y += 0.002;
    g2.rotation.y -= 0.001;
    g3.rotation.z += 0.001;

    planetOrbitGroups.forEach(p => {
        p.group.rotation.y += p.speed * orbitSpeedMultiplier;
        p.mesh.rotation.y += 0.01; 
    });
    asteroidGroup.rotation.y += 0.001 * orbitSpeedMultiplier;
    starMesh.rotation.y += 0.0001;

    if (STATE === 1 || STATE === 2) {
        comets.forEach(c => {
            c.mesh.position.x -= c.speed;
            c.mesh.position.y -= c.speed;
            if(c.mesh.position.x < -1500 || c.mesh.position.y < -1500) {
                c.mesh.position.set(800 + Math.random()*1000, 800 + Math.random()*1000, (Math.random()-0.5)*1000);
            }
        });

        ships.forEach(s => {
            s.mesh.position.x += s.speed;
            if(s.dir === -1 && s.mesh.position.x < -2000) s.mesh.position.x = 2000 + Math.random()*1000;
            if(s.dir === 1 && s.mesh.position.x > 2000) s.mesh.position.x = -2000 - Math.random()*1000;
        });
    }

    controls.update();
    composer.render();
}
animate(performance.now());

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// ---- BRIDGE SECTION (JAVA/PYTHON/GENAI TABS) ----
const tabBtns = document.querySelectorAll('.tab-btn');
const codeContent = document.getElementById('code-content');
const filenameTag = document.querySelector('.filename');

const codeBlocks = {
    java: `// JAVA MODE (Legacy Core)
@RestController
@RequestMapping("/api/v1")
public class ApiService {
    @GetMapping("/analyze")
    public String analyzeData(@RequestParam String input) {
        if(input.contains("error")) return "Error detected.";
        return "Processed successfully.";
    }
}`,
    python: `# PYTHON MODE (Data & Pipeline Engineering)
from fastapi import APIRouter
import pandas as pd

router = APIRouter(prefix="/api/v1")
@router.post("/process")
async def process_data(payload: dict):
    df = pd.DataFrame([payload])
    cleaned_data = df.dropna()
    return {"status": "success", "rows": len(cleaned_data)}`,
    ai: `# GEN AI MODE (Agentic Workflows)
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI

def deploy_agent(prompt: str):
    tools = [Tool(name="RagSearch", func=vector_db.search)]
    agent = initialize_agent(tools, OpenAI(temperature=0))
    return agent.run(prompt)`
};

const fileNames = {
    java: 'ApiService.java',
    python: 'data_pipeline.py',
    ai: 'agent_orchestrator.py'
};

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.borderColor = 'rgba(255,255,255,0.2)';
            b.style.boxShadow = 'none';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(0,245,255,0.2)';
        btn.style.borderColor = '#00f5ff';
        btn.style.boxShadow = '0 0 15px rgba(0,245,255,0.4)';
        
        const mode = btn.dataset.mode;
        if(codeContent) codeContent.textContent = codeBlocks[mode];
        if(filenameTag) filenameTag.textContent = fileNames[mode];
    });
});

// ---- PROJECTS HORIZONTAL SCROLL JACKING ----
const projectsTrack = document.getElementById('projects-horizontal-track');
if(projectsTrack) {
    projectsTrack.addEventListener('wheel', (evt) => {
        if(evt.deltaY !== 0) {
            evt.preventDefault();
            projectsTrack.scrollLeft += evt.deltaY;
        }
    }, { passive: false });
}
