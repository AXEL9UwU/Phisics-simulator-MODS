(function() {
    const { engine, matter, registerTool } = window.SandboxAPI;
    const { Events, Bodies, Composite, Vector, Body, Constraint } = matter;

    // Ayudantes para leer la "mochila" de memoria (modData) que sobrevive a las simulaciones
    const isSano = (b) => b.isModEntity && b.modData && b.modData.tipo === 'humano';
    const isPodrido = (b) => b.isModEntity && b.modData && b.modData.tipo === 'zombie';
    const isZombieTorso = (b) => isPodrido(b) && b.modData.parte === 'torso';
    const isHumanTorso = (b) => isSano(b) && b.modData.parte === 'torso';
    const isZombieLimb = (b) => isPodrido(b) && b.modData.parte === 'limb';
    const isHumanLimb = (b) => isSano(b) && b.modData.parte === 'limb';

    function crearEntidad(x, y, esZombie) {
        const head = Bodies.circle(x, y-50, 20, { render: {fillStyle: esZombie ? '#1b5e20' : '#ffccbc'} });
        const torso = Bodies.rectangle(x, y, 40, 60, { render: {fillStyle: esZombie ? '#2e7d32' : '#1976d2'} });
        const armL = Bodies.rectangle(x-30, y-10, 10, 40, { render: {fillStyle: esZombie ? '#4caf50' : '#ffccbc'} });
        const armR = Bodies.rectangle(x+30, y-10, 10, 40, { render: {fillStyle: esZombie ? '#4caf50' : '#ffccbc'} });
        const legL = Bodies.rectangle(x-15, y+50, 12, 45, { render: {fillStyle: esZombie ? '#4caf50' : '#0d47a1'} });
        const legR = Bodies.rectangle(x+15, y+50, 12, 45, { render: {fillStyle: esZombie ? '#4caf50' : '#0d47a1'} });
        
        const parts = [head, torso, armL, armR, legL, legR];
        
        parts.forEach(p => { 
            p.customPaint = []; 
            p.isTrans = false; 
            
            // GUARDAMOS LA IA EN LA MEMORIA QUE SOBREVIVE A LAS PAUSAS
            p.isModEntity = true;
            p.modType = 'los_podridos';
            p.modData = {
                tipo: esZombie ? 'zombie' : 'humano',
                parte: (p === torso) ? 'torso' : (p === head ? 'head' : 'limb')
            };
        }); 
        
        const c = [
            Constraint.create({ bodyA: head, bodyB: torso, pointA: {x:0, y:20}, pointB: {x:0, y:-30}, stiffness: 0.6 }),
            Constraint.create({ bodyA: armL, bodyB: torso, pointA: {x:0, y:-15}, pointB: {x:-20, y:-20}, stiffness: 0.6 }),
            Constraint.create({ bodyA: armR, bodyB: torso, pointA: {x:0, y:-15}, pointB: {x:20, y:-20}, stiffness: 0.6 }),
            Constraint.create({ bodyA: legL, bodyB: torso, pointA: {x:0, y:-20}, pointB: {x:-10, y:30}, stiffness: 0.6 }),
            Constraint.create({ bodyA: legR, bodyB: torso, pointA: {x:0, y:-20}, pointB: {x:10, y:30}, stiffness: 0.6 })
        ];
        
        Composite.add(engine.world, [...parts, ...c]);
    }

    registerTool('humano', 'Humano', '🧍', function(ix, iy, ax, ay) { crearEntidad(ax, ay, false); });
    registerTool('podrido', 'Podrido', '🧟', function(ix, iy, ax, ay) { crearEntidad(ax, ay, true); });

    function infectar(body) {
        if (!body.isModEntity || !body.modData || body.modData.tipo === 'zombie' || body.isStatic) return;
        
        // Modificamos la memoria persistente
        body.modData.tipo = 'zombie';
        body.customPaint = []; 
        
        if (body.modData.parte === 'head') body.render.fillStyle = '#1b5e20'; 
        else if (body.modData.parte === 'torso') body.render.fillStyle = '#2e7d32'; 
        else body.render.fillStyle = '#4caf50'; 

        const constraints = Composite.allConstraints(engine.world);
        for(let c of constraints) {
            if (c.bodyA === body && c.bodyB && isSano(c.bodyB)) infectar(c.bodyB);
            else if (c.bodyB === body && c.bodyA && isSano(c.bodyA)) infectar(c.bodyA);
        }
    }

    Events.on(engine, 'collisionStart', function(event) {
        event.pairs.forEach(pair => {
            if (isPodrido(pair.bodyA) && isSano(pair.bodyB)) infectar(pair.bodyB);
            else if (isPodrido(pair.bodyB) && isSano(pair.bodyA)) infectar(pair.bodyA);
        });
    });

    let fasePaso = 0;
    Events.on(engine, 'beforeUpdate', function() {
        // SOLUCIÓN GUSANOS: Comprobamos directamente el botón nativo para saber si hay pausa
        const btnPlay = document.getElementById('btn-play');
        if (!btnPlay || !btnPlay.classList.contains('simulando')) return;

        fasePaso += 0.15;
        const bodies = Composite.allBodies(engine.world);
        
        const humanosTorsos = bodies.filter(b => isHumanTorso(b));
        const podridosTorsos = bodies.filter(b => isZombieTorso(b));

        // ZOMBIES: Cazar
        podridosTorsos.forEach(zombie => {
            Body.setAngle(zombie, zombie.angle * 0.9);

            if (humanosTorsos.length > 0) {
                let objetivo = null;
                let minD = Infinity;
                humanosTorsos.forEach(p => {
                    const d = Vector.magnitudeSquared(Vector.sub(p.position, zombie.position));
                    if (d < minD) { minD = d; objetivo = p; }
                });

                if (objetivo) {
                    const dx = objetivo.position.x - zombie.position.x;
                    const dir = dx > 0 ? 1 : -1; 
                    Body.applyForce(zombie, zombie.position, { x: dir * 0.0015, y: -0.003 });
                }
            }
        });

        // HUMANOS: Huir
        humanosTorsos.forEach(humano => {
            Body.setAngle(humano, humano.angle * 0.9);

            if (podridosTorsos.length > 0) {
                let amenaza = null;
                let minD = Infinity;
                podridosTorsos.forEach(z => {
                    const d = Vector.magnitudeSquared(Vector.sub(z.position, humano.position));
                    if (d < minD) { minD = d; amenaza = z; }
                });

                if (amenaza && minD < 600000) {
                    const dx = humano.position.x - amenaza.position.x;
                    const dir = dx > 0 ? 1 : -1; 
                    Body.applyForce(humano, humano.position, { x: dir * 0.0022, y: -0.0038 });
                }
            }
        });

        // Animaciones
        const limbsZ = bodies.filter(b => isZombieLimb(b));
        limbsZ.forEach((limb, index) => {
            Body.setAngularVelocity(limb, Math.sin(fasePaso + index) * 0.15);
        });

        if (podridosTorsos.length > 0) {
            const limbsH = bodies.filter(b => isHumanLimb(b));
            limbsH.forEach((limb, index) => {
                Body.setAngularVelocity(limb, Math.cos(fasePaso * 1.8 + index) * 0.25);
            });
        }
    });

    console.log("Mod 'Los Podridos v4.0' cargado. Memoria arreglada y gusanos eliminados.");
})();
