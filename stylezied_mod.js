(function() {
    const { engine, matter, registerTool } = window.SandboxAPI;
    const { Bodies, Composite, Body } = matter;

    const panelAntiguo = document.getElementById('stylized-forms-panel');
    if (panelAntiguo) panelAntiguo.remove();
    if (window.sfInterval) clearInterval(window.sfInterval);

    const grupoSuperposicion = Body.nextGroup(true); 

    const panel = document.createElement('div');
    panel.id = 'stylized-forms-panel';
    panel.style.position = 'fixed'; 
    panel.style.bottom = '90px'; 
    panel.style.left = '15px';
    panel.style.zIndex = '999999'; 
    panel.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
    panel.style.color = 'white';
    panel.style.padding = '15px';
    panel.style.borderRadius = '10px';
    panel.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
    panel.style.fontFamily = 'sans-serif';
    panel.style.width = '220px';
    panel.style.border = '1px solid #555';
    panel.style.transition = 'opacity 0.2s';

    panel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 16px; text-align: center; border-bottom: 1px solid #555; padding-bottom: 5px;">🎨 Stylized Forms</h3>
        
        <label style="font-size: 12px;">Forma:</label>
        <select id="sf-shape" style="width: 100%; margin-bottom: 10px; padding: 4px; border-radius: 4px; border: none; background: #333; color: white;">
            <option value="circle">⚪ Círculo (Falso)</option>
            <option value="3">🔺 Triángulo</option>
            <option value="4">♦️ Rombo</option>
            <option value="5">⬟ Pentágono</option>
            <option value="6">⬡ Hexágono</option>
            <option value="8">🛑 Octágono</option>
            <option value="trapezoid">⏢ Trapecio</option>
        </select>
        
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="flex: 1;">
                <label style="font-size: 12px;">Color:</label>
                <input type="color" id="sf-color" value="#ff9800" style="width: 100%; height: 30px; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
            </div>
            <div style="flex: 2;">
                <label style="font-size: 12px;">Tamaño: <span id="sf-size-label">40</span></label>
                <input type="range" id="sf-size" min="15" max="100" value="40" style="width: 100%; cursor: pointer;">
            </div>
        </div>

        <div style="text-align: center; background: #222; border-radius: 6px; padding: 5px; border: 1px dashed #555;">
            <canvas id="sf-preview" width="200" height="150"></canvas>
        </div>
    `;
    document.body.appendChild(panel);

    function actualizarPreview() {
        const canvas = document.getElementById('sf-preview');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const shapeValue = document.getElementById('sf-shape').value;
        const color = document.getElementById('sf-color').value;
        const size = parseInt(document.getElementById('sf-size').value);
        
        document.getElementById('sf-size-label').innerText = size;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = color;
        ctx.beginPath();

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (shapeValue === 'circle') {
            ctx.arc(cx, cy, size, 0, 2 * Math.PI); 
        } else if (shapeValue === 'trapezoid') {
            const w = size * 2;
            const h = size;
            ctx.moveTo(cx - w/2, cy + h/2);
            ctx.lineTo(cx + w/2, cy + h/2);
            ctx.lineTo(cx + w/4, cy - h/2);
            ctx.lineTo(cx - w/4, cy - h/2);
        } else {
            const sides = parseInt(shapeValue);
            for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
                let offset = (sides === 4) ? Math.PI / 4 : 0; 
                if (sides === 5) offset = Math.PI / 10; 
                ctx.lineTo(cx + size * Math.cos(angle + offset), cy + size * Math.sin(angle + offset));
            }
        }
        
        ctx.closePath();
        ctx.fill();
    }

    document.getElementById('sf-shape').addEventListener('change', actualizarPreview);
    document.getElementById('sf-color').addEventListener('input', actualizarPreview);
    document.getElementById('sf-size').addEventListener('input', actualizarPreview);
    actualizarPreview();

    window.sfInterval = setInterval(() => {
        const p = document.getElementById('stylized-forms-panel');
        if (!p) return;
        const btnPlay = document.getElementById('btn-play');
        const enSimulacion = btnPlay && btnPlay.classList.contains('simulando');

        if (enSimulacion) {
            p.style.opacity = '0';
            p.style.pointerEvents = 'none';
        } else {
            p.style.opacity = '1';
            p.style.pointerEvents = 'auto';
        }

        const bodies = Composite.allBodies(engine.world);
        bodies.forEach(b => {
            if (b.isStylizedForm && b.sfOriginalFilter) {
                if (enSimulacion) {
                    // Restauramos el ADN exacto para que choque con lo que dibujes
                    b.collisionFilter.category = b.sfOriginalFilter.category;
                    b.collisionFilter.mask = b.sfOriginalFilter.mask;
                    b.collisionFilter.group = b.sfOriginalFilter.group;
                } else {
                    // Modo fantasma entre piezas del mod
                    b.collisionFilter.group = grupoSuperposicion; 
                }
            }
        });
    }, 100);

    registerTool('stylized', 'Stylized', '🎨', function(ix, iy, ax, ay) {
        const shapeValue = document.getElementById('sf-shape').value;
        const color = document.getElementById('sf-color').value;
        const size = parseInt(document.getElementById('sf-size').value);

        let body;
        const opcFisicas = { render: { fillStyle: color }, restitution: 0.5, friction: 0.1 };

        if (shapeValue === 'circle') {
            body = Bodies.polygon(ax, ay, 40, size, opcFisicas);
        } else if (shapeValue === 'trapezoid') {
            body = Bodies.trapezoid(ax, ay, size * 2, size, 0.5, opcFisicas);
        } else {
            const lados = parseInt(shapeValue);
            body = Bodies.polygon(ax, ay, lados, size, opcFisicas);
            if (lados === 4) Body.setAngle(body, Math.PI / 4);
        }

        if (body) {
            body.customPaint = []; 
            body.isStylizedForm = true; 
            
            // GUARDAMOS EL ADN DE COLISIÓN ORIGINAL
            body.sfOriginalFilter = {
                category: body.collisionFilter.category,
                mask: body.collisionFilter.mask,
                group: body.collisionFilter.group
            };
            
            body.collisionFilter.group = grupoSuperposicion; 
            Composite.add(engine.world, body);
        }
    });

    console.log("Mod 'Stylized Forms v4.1' rodando. Problemas de colisión con otras herramientas arreglados.");
})();
