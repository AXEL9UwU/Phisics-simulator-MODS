(function() {
    const { engine, matter, registerTool } = window.SandboxAPI;
    const { Events, Bodies, Composite, Vector, Body, Constraint } = matter;

    // Los colores que identifican a un robot sano en tu juego original
    const coloresSanos = ['#ffeb3b', '#e91e63', '#03a9f4', '#4caf50'];
    const isSano = (b) => coloresSanos.includes(b.render.fillStyle) && !b.isPodrido;

    // Función recursiva: infecta una pieza y busca las piezas unidas a ella para infectarlas también
    function infectar(body) {
        if (body.isPodrido || body.isStatic) return;
        
        body.isPodrido = true;
        body.customPaint = []; // Le quitamos manchas previas
        
        // Le damos color y rol según su forma (área geométrica)
        if (body.circleRadius) {
            body.render.fillStyle = '#1b5e20'; // Cabeza (Verde oscuro)
        } else if (body.area > 2000) {
            body.isZombieTorso = true;         // Es el torso (el "cerebro" del movimiento)
            body.render.fillStyle = '#2e7d32'; 
        } else {
            body.isZombieLimb = true;          // Brazos/Piernas
            body.render.fillStyle = '#4caf50'; 
        }

        // Magia: Buscar articulaciones (constraints) conectadas a esta pieza para propagar la infección
        const constraints = Composite.allConstraints(engine.world);
        for(let c of constraints) {
            // Si la pieza A es esta, y la B está sana...
            if (c.bodyA === body && c.bodyB && isSano(c.bodyB)) infectar(c.bodyB);
            // Si la pieza B es esta, y la A está sana...
            else if (c.bodyB === body && c.bodyA && isSano(c.bodyA)) infectar(c.bodyA);
        }
    }

    // 1. CREAR EL BOTÓN PARA SPAWNEAR EL PACIENTE CERO
    registerTool('podrido', 'Podrido', '🧟', function(ix, iy, ax, ay) {
        const x = ax, y = ay;
        // Creamos la anatomía estándar
        const head = Bodies.circle(x, y-50, 20, { render: {fillStyle: '#ffeb3b'} });
        const torso = Bodies.rectangle(x, y, 40, 60, { render: {fillStyle: '#e91e63'} });
        const armL = Bodies.rectangle(x-30, y-10, 10, 40, { render: {fillStyle: '#03a9f4'} });
        const armR = Bodies.rectangle(x+30, y-10, 10, 40, { render: {fillStyle: '#03a9f4'} });
        const legL = Bodies.rectangle(x-15, y+50, 12, 45, { render: {fillStyle: '#4caf50'} });
        const legR = Bodies.rectangle(x+15, y+50, 12, 45, { render: {fillStyle: '#4caf50'} });
        
        const parts = [head, torso, armL, armR, legL, legR];
        parts.forEach(p => { p.customPaint = []; p.isTrans = false; }); 
        
        const c = [
            Constraint.create({ bodyA: head, bodyB: torso, pointA: {x:0, y:20}, pointB: {x:0, y:-30}, stiffness: 0.6 }),
            Constraint.create({ bodyA: armL, bodyB: torso, pointA: {x:0, y:-15}, pointB: {x:-20, y:-20}, stiffness: 0.6 }),
            Constraint.create({ bodyA: armR, bodyB: torso, pointA: {x:0, y:-15}, pointB: {x:20, y:-20}, stiffness: 0.6 }),
            Constraint.create({ bodyA: legL, bodyB: torso, pointA: {x:0, y:-20}, pointB: {x:-10, y:30}, stiffness: 0.6 }),
            Constraint.create({ bodyA: legR, bodyB: torso, pointA: {x:0, y:-20}, pointB: {x:10, y:30}, stiffness: 0.6 })
        ];
        
        Composite.add(engine.world, [...parts, ...c]);

        // Lo infectamos instantáneamente al nacer para que cambie de color y empiece la cacería
        infectar(torso);
    });

    // 2. CONTAGIO AL CONTACTO
    Events.on(engine, 'collisionStart', function(event) {
        event.pairs.forEach(pair => {
            const a = pair.bodyA;
            const b = pair.bodyB;
            
            // Si un podrido toca a un sano, lo infecta
            if (a.isPodrido && isSano(b)) infectar(b);
            else if (b.isPodrido && isSano(a)) infectar(a);
        });
    });

    // 3. IA Y ANIMACIÓN FÍSICA (LOCÓMOCION)
    let fasePaso = 0;
    Events.on(engine, 'beforeUpdate', function() {
        fasePaso += 0.1;
        const bodies = Composite.allBodies(engine.world);
        
        // Encontrar presas (torsos de robots sanos)
        const presas = bodies.filter(b => isSano(b) && b.area > 2000);
        // Encontrar cazadores (torsos zombies)
        const podridosTorsos = bodies.filter(b => b.isZombieTorso);

        podridosTorsos.forEach(zombie => {
            // Animación 1: Intentar mantener el torso recto para que no se arrastre plano como un trapo
            Body.setAngle(zombie, zombie.angle * 0.9);

            if (presas.length > 0) {
                // Buscar la presa más cercana
                let objetivo = null;
                let minD = Infinity;
                presas.forEach(p => {
                    const d = Vector.magnitudeSquared(Vector.sub(p.position, zombie.position));
                    if (d < minD) { minD = d; objetivo = p; }
                });

                if (objetivo) {
                    const dx = objetivo.position.x - zombie.position.x;
                    const dir = dx > 0 ? 1 : -1;
                    
                    // Animación 2: Aplicar un empujón físico hacia adelante y un saltito constante
                    Body.applyForce(zombie, zombie.position, { x: dir * 0.0015, y: -0.003 });
                }
            }
        });

        // Animación 3: Sacudir extremidades zombies para dar efecto de "caminar/arrastrarse"
        const limbs = bodies.filter(b => b.isZombieLimb);
        limbs.forEach((limb, index) => {
            Body.setAngularVelocity(limb, Math.sin(fasePaso + index) * 0.15);
        });
    });

    console.log("Mod 'Los Podridos' inicializado. ¡Que comience la invasión!");
})();
