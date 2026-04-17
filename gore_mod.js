(function() {
    // 1. Extraemos las herramientas de tu API nativa
    const { engine, matter } = window.SandboxAPI;
    const { Events, Bodies, Composite, Vector, Body } = matter;

    // 2. Identificamos qué es un robot mirando tus colores nativos
    const coloresRobot = ['#ffeb3b', '#e91e63', '#03a9f4', '#4caf50'];
    const isRobotPart = (b) => coloresRobot.includes(b.render.fillStyle);

    // 3. Nos "enganchamos" a las colisiones
    Events.on(engine, 'collisionStart', function(event) {
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            // --- A. DETECCIÓN DE DAÑO EN EL ROBOT ---
            const isRobA = isRobotPart(bodyA);
            const isRobB = isRobotPart(bodyB);
            
            if ((isRobA || isRobB) && !bodyA.isOil && !bodyB.isOil) {
                const velA = bodyA.velocity || {x:0, y:0};
                const velB = bodyB.velocity || {x:0, y:0};
                const relVel = Vector.magnitude(Vector.sub(velA, velB));

                if (relVel > 6) { 
                    const robotPart = isRobA ? bodyA : bodyB;
                    
                    const contactPos = (pair.collision.supports && pair.collision.supports.length > 0) 
                                        ? pair.collision.supports[0] 
                                        : robotPart.position;
                    
                    const numDrops = Math.floor(Math.random() * 5) + 3;
                    const drops = [];
                    
                    for(let d = 0; d < numDrops; d++) {
                        const drop = Bodies.circle(contactPos.x, contactPos.y, Math.random() * 2 + 2, {
                            isOil: true,
                            sourceId: robotPart.id, 
                            render: { fillStyle: '#800000' }, // Color rojo oscuro
                            frictionAir: 0.02,
                            restitution: 0.1,
                            collisionFilter: { group: -1 } 
                        });
                        
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 6 + 3;
                        Body.setVelocity(drop, { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed });
                        drops.push(drop);
                    }
                    Composite.add(engine.world, drops);
                }
            }

            // --- B. MANCHAR SUPERFICIES AL IMPACTAR ---
            const oilDrop = bodyA.isOil ? bodyA : (bodyB.isOil ? bodyB : null);
            const target = bodyA.isOil ? bodyB : (bodyB.isOil ? bodyA : null);

            if (oilDrop && target && !target.isOil) {
                if (target.id !== oilDrop.sourceId) {
                    
                    if (!target.customPaint) target.customPaint = [];
                    
                    const isTargetRobot = isRobotPart(target);
                    
                    // Magia aquí: Si NO es un robot, pinta infinito. Si ES robot, máximo 4 manchas.
                    if (!isTargetRobot || target.customPaint.length < 4) {
                        const contactPos = (pair.collision.supports && pair.collision.supports.length > 0) 
                                            ? pair.collision.supports[0] 
                                            : oilDrop.position;

                        const dx = contactPos.x - target.position.x;
                        const dy = contactPos.y - target.position.y;
                        const cos = Math.cos(-target.angle);
                        const sin = Math.sin(-target.angle);

                        target.customPaint.push({
                            relX: dx * cos - dy * sin,
                            relY: dx * sin + dy * cos,
                            color: '#800000', // Color rojo oscuro
                            size: Math.random() * 8 + 4 // Manchas
                        });
                    }

                    // La gota se destruye al estrellarse para no causar lag
                    Composite.remove(engine.world, oilDrop);
                }
            }
        }
    });

    console.log("Mod Gore-Aceite v3.0 cargado (Sin límite de sangre en cajas, robot protegido)");
})();
