(function() {
    const api = window.SandboxAPI;
    window._teleColor = false; 

    api.registerEntity('teleporter_pad', {
        createBody: function(x, y) {
            window._teleColor = !window._teleColor; 
            const isSalida = window._teleColor;
            
            return api.matter.Bodies.rectangle(x, y, 60, 15, {
                isStatic: true,
                isSensor: true, 
                render: { 
                    fillStyle: isSalida ? '#ff6600' : '#0066ff',
                    strokeStyle: '#ffffff',
                    lineWidth: 2
                }
            });
        },
        
        initData: function() {
            return { isSalida: window._teleColor };
        },
        
        onUpdate: function(body, api) {
            // EL PARCHE: Forzamos que sea atravesable siempre, esquivando el olvido del juego base
            body.isSensor = true;

            if (body.modData.isSalida) return;

            const engine = api.engine;
            const matter = api.matter;
            const bodies = matter.Composite.allBodies(engine.world);
            
            const padSalida = bodies.find(b => b.isModEntity && b.modType === 'teleporter_pad' && b.modData && b.modData.isSalida);
            if (!padSalida) return;

            bodies.forEach(cuerpo => {
                if (cuerpo.isStatic || cuerpo.isSensor) return;
                if (cuerpo.teleportCooldown && cuerpo.teleportCooldown > Date.now()) return;

                const dx = body.position.x - cuerpo.position.x;
                const dy = body.position.y - cuerpo.position.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 35) {
                    matter.Body.setPosition(cuerpo, { 
                        x: padSalida.position.x, 
                        y: padSalida.position.y - 40 
                    });
                    
                    matter.Body.setVelocity(cuerpo, { 
                        x: cuerpo.velocity.x, 
                        y: -Math.abs(cuerpo.velocity.y) - 5 
                    });
                    
                    cuerpo.teleportCooldown = Date.now() + 500;
                }
            });
        }
    });

    api.registerTool('teleporter', 'Teleporter', '🌀', function(ix, iy, ax, ay) {
        api.createEntity('teleporter_pad', ax, ay);
    });

    console.log("🎬 Mod Teleporter arreglado. Colisiones fantasma forzadas en la 2ª simulación.");
})();
