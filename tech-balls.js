// ---- TECH SKILLS 3D BALLS (VARUN CLONE WITH FIXED LOGOS/TEXT) ----
function initTechBalls() {
    const container = document.getElementById('tech-canvas-container');
    if(!container) return;
    
    container.innerHTML = ''; // Clear context gracefully on reload
    
    // Adjust height for text accommodations
    container.style.height = "700px";
    
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 700;

    const renderer2 = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer2.setSize(w, h);
    renderer2.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer2.domElement);

    const scene2 = new THREE.Scene();
    const camera2 = new THREE.PerspectiveCamera(40, w/h, 0.1, 1000);
    // Push camera back slightly to fit names cleanly
    camera2.position.z = 32;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene2.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(0, 5, 15);
    scene2.add(dirLight);

    const techs = [
        { name: "React", url: "assets/logos/react.svg" },
        { name: "FastAPI", url: "assets/logos/fastapi.svg" },
        { name: "Python", url: "assets/logos/python.svg" },
        { name: "Java", url: "assets/logos/java.svg" },
        { name: "Docker", url: "assets/logos/docker.svg" },
        { name: "AWS", url: "assets/logos/aws.svg" },
        { name: "Three.js", url: "assets/logos/threejs.svg" },
        { name: "Spring", url: "assets/logos/spring.svg" },
        { name: "PostgreSQL", url: "assets/logos/postgresql.svg" },
        { name: "Git", url: "assets/logos/git.svg" }
    ];

    const balls = [];
    const cols = 5;
    const spacing = 4.8; 
    const startX = -((cols-1)*spacing)/2;
    
    const textureLoader = new THREE.TextureLoader();

    techs.forEach((tech, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * spacing;
        const y = 4 - row * 7; // Increased vertical margin drastically

        const group = new THREE.Group();
        group.position.set(x, y, 0);

        // Core White Crystal (This is the ONLY part that rotates)
        const rockGeom = new THREE.IcosahedronGeometry(1.6, 1);
        const rockMat = new THREE.MeshStandardMaterial({
            color: 0xfff8eb, flatShading: true, roughness: 0.1, metalness: 0.5
        });
        const rock = new THREE.Mesh(rockGeom, rockMat);
        group.add(rock);

        // Stationary Front Badge (Hovering slightly off the rock)
        const badgeMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.05 });
        const badgeGeom = new THREE.CircleGeometry(1.1, 32);
        const badge = new THREE.Mesh(badgeGeom, badgeMat);
        badge.position.z = 1.7; // Sticks out front
        group.add(badge);

        // Stationary Name Sprite centered exactly underneath the crystal
        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 512; nameCanvas.height = 128;
        const nameCtx = nameCanvas.getContext('2d');
        nameCtx.fillStyle = '#b0bec5'; // A nice silver/white tone 
        nameCtx.font = "bold 50px 'Inter', sans-serif";
        nameCtx.textAlign = "center"; nameCtx.textBaseline = "middle";
        nameCtx.fillText(tech.name, 256, 64);
        
        const nameTex = new THREE.CanvasTexture(nameCanvas);
        const nameSpriteMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true });
        const nameSprite = new THREE.Sprite(nameSpriteMat);
        // Sprite scales
        nameSprite.scale.set(4, 1.0, 1);
        nameSprite.position.y = -2.8; // Floating securely below the ball
        group.add(nameSprite);

        // Load the actual multi-color SVG DevIcon onto the stationary badge using Canvas to ensure proper cross-browser rendering size
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 256, 256);
            ctx.drawImage(img, 0, 0, 256, 256);
            
            const tex = new THREE.CanvasTexture(canvas);
            tex.anisotropy = renderer2.capabilities.getMaxAnisotropy();
            badgeMat.map = tex;
            badgeMat.needsUpdate = true;
        };
        img.onerror = (err) => {
            console.error("Error loading SVG logo: " + tech.name, err);
        };
        img.src = tech.url;

        scene2.add(group);
        balls.push({ group: group, rock: rock, badge: badge, offset: Math.random() * 100 });
    });

    function animate2() {
        requestAnimationFrame(animate2);
        
        // Critical Render Optimization: Suspend WebGL pipelines when the HTML Overlay is hidden/transparent
        if (!container || container.offsetWidth === 0) return;

        balls.forEach((b) => {
            // Hover orbit effect applied uniformly to the entire group
            b.group.position.y = (b.group.userData.baseY || b.group.position.y) + Math.sin(Date.now()*0.002 + b.offset) * 0.2; 
            
            // Only the internal icosahedron crystal mesh rapidly spins
            b.rock.rotation.y += 0.008;
            b.rock.rotation.x += 0.004;
            
            // Note: b.badge and nameSprite do NOT rotate, fulfilling "logos should not rotate" explicitly!
        });
        renderer2.render(scene2, camera2);
    }
    
    // Store initial Y positions for the sine wave hover
    balls.forEach(b => b.group.userData.baseY = b.group.position.y);
    
    animate2();
    
    window.addEventListener('resize', () => {
        if(container.clientWidth > 0) {
            camera2.aspect = container.clientWidth / container.clientHeight;
            camera2.updateProjectionMatrix();
            renderer2.setSize(container.clientWidth, container.clientHeight);
        }
    });
}
window.initTechBalls = initTechBalls;
