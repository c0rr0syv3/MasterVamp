// ==========================================
// PARTICLES.JS — Partículas de poeira/cinza
// Efeito atmosférico para a landing page
// ==========================================
(function() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, particles;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        const count = Math.floor((W * H) / 12000);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.2 + 0.2,
                // Mistura de ouro muito apagado e vermelho-sangue
                hue: Math.random() > 0.6 ? 0 : 40,
                alpha: Math.random() * 0.18 + 0.02,
                vx: (Math.random() - 0.5) * 0.15,
                vy: -Math.random() * 0.25 - 0.05,
                drift: Math.random() * Math.PI * 2,
                driftSpeed: Math.random() * 0.008 + 0.002,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.hue === 0
                ? `rgba(160, 0, 0, ${p.alpha})`
                : `rgba(180, 140, 40, ${p.alpha})`;
            ctx.fill();

            // Movimento
            p.drift += p.driftSpeed;
            p.x += p.vx + Math.sin(p.drift) * 0.12;
            p.y += p.vy;

            // Recicla ao sair pelo topo
            if (p.y < -4) {
                p.y = H + 4;
                p.x = Math.random() * W;
            }
            if (p.x < -4) p.x = W + 4;
            if (p.x > W + 4) p.x = -4;
        }
        requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });
})();