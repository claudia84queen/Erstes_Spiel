(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas?.getContext("2d");

  if (!canvas || !ctx) {
    console.error("Spiel konnte nicht initialisiert werden: Canvas/Context fehlt.");
    return;
  }

  const GAME = {
    width: canvas.width,
    height: canvas.height,
    shipRadius: 14,
    score: 0,
    lives: 3,
    isGameOver: false,
    time: 0,
  };

  const SETTINGS = {
    turnSpeed: 3.8,
    thrust: 240,
    drag: 0.992,
    maxShipSpeed: 340,
    shootCooldown: 0.15,
    bulletSpeed: 520,
    bulletLife: 1.1,
    invulnerableAfterHit: 2,
    asteroidMinSpeed: 30,
    asteroidMaxSpeed: 100,
    asteroidSpawnSafeRadius: 180,
    initialAsteroids: 5,
    explosionLife: 0.35,
  };

  const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    Space: false,
  };

  let ship;
  let bullets = [];
  let asteroids = [];
  let particles = [];
  let lastFrame = performance.now();

  function createShip() {
    return {
      x: GAME.width / 2,
      y: GAME.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      canShootAt: 0,
      invulnerableUntil: 0,
      thrustFlash: 0,
    };
  }

  function resetGame() {
    GAME.score = 0;
    GAME.lives = 3;
    GAME.isGameOver = false;
    GAME.time = 0;

    ship = createShip();
    bullets = [];
    asteroids = [];
    particles = [];

    spawnAsteroids(SETTINGS.initialAsteroids);
  }

  function spawnAsteroids(count) {
    for (let i = 0; i < count; i += 1) {
      asteroids.push(createAsteroid(3));
    }
  }

  function createAsteroid(size, x, y) {
    const radiusMap = { 3: 52, 2: 32, 1: 18 };
    const radius = radiusMap[size];

    let spawnX = x;
    let spawnY = y;

    if (spawnX === undefined || spawnY === undefined) {
      do {
        spawnX = Math.random() * GAME.width;
        spawnY = Math.random() * GAME.height;
      } while (distance(spawnX, spawnY, ship.x, ship.y) < SETTINGS.asteroidSpawnSafeRadius);
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = randomRange(SETTINGS.asteroidMinSpeed, SETTINGS.asteroidMaxSpeed) * (0.7 + size * 0.2);

    return {
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      radius,
      spin: randomRange(-0.7, 0.7),
      rotation: Math.random() * Math.PI * 2,
      vertices: createAsteroidVertices(radius),
      hitFlash: 0,
    };
  }

  function createAsteroidVertices(radius) {
    const points = [];
    const count = 10;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const jitter = randomRange(0.75, 1.2);
      points.push({
        x: Math.cos(angle) * radius * jitter,
        y: Math.sin(angle) * radius * jitter,
      });
    }
    return points;
  }

  window.addEventListener("keydown", (event) => {
    if (event.code in keys) {
      keys[event.code] = true;
      event.preventDefault();
    }

    if (event.code === "KeyR" && GAME.isGameOver) {
      resetGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code in keys) {
      keys[event.code] = false;
      event.preventDefault();
    }
  });

  function gameLoop(now) {
    const delta = Math.min((now - lastFrame) / 1000, 0.033);
    lastFrame = now;
    GAME.time += delta;

    update(delta);
    render();

    requestAnimationFrame(gameLoop);
  }

  function update(delta) {
    if (GAME.isGameOver) return;

    updateShip(delta);
    updateBullets(delta);
    updateAsteroids(delta);
    updateParticles(delta);
    handleCollisions();

    if (asteroids.length === 0) {
      spawnAsteroids(SETTINGS.initialAsteroids + Math.floor(GAME.score / 1000));
    }
  }

  function updateShip(delta) {
    if (keys.ArrowLeft) ship.angle -= SETTINGS.turnSpeed * delta;
    if (keys.ArrowRight) ship.angle += SETTINGS.turnSpeed * delta;

    if (keys.ArrowUp) {
      ship.vx += Math.cos(ship.angle) * SETTINGS.thrust * delta;
      ship.vy += Math.sin(ship.angle) * SETTINGS.thrust * delta;
      ship.thrustFlash = 0.08;
    }

    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > SETTINGS.maxShipSpeed) {
      const ratio = SETTINGS.maxShipSpeed / speed;
      ship.vx *= ratio;
      ship.vy *= ratio;
    }

    ship.vx *= SETTINGS.drag;
    ship.vy *= SETTINGS.drag;

    ship.x += ship.vx * delta;
    ship.y += ship.vy * delta;
    wrap(ship);

    ship.thrustFlash = Math.max(0, ship.thrustFlash - delta);

    if (keys.Space && GAME.time >= ship.canShootAt) {
      fireBullet();
      ship.canShootAt = GAME.time + SETTINGS.shootCooldown;
    }
  }

  function fireBullet() {
    const tipX = ship.x + Math.cos(ship.angle) * (GAME.shipRadius + 4);
    const tipY = ship.y + Math.sin(ship.angle) * (GAME.shipRadius + 4);

    bullets.push({
      x: tipX,
      y: tipY,
      vx: ship.vx + Math.cos(ship.angle) * SETTINGS.bulletSpeed,
      vy: ship.vy + Math.sin(ship.angle) * SETTINGS.bulletSpeed,
      life: SETTINGS.bulletLife,
    });
  }

  function updateBullets(delta) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      wrap(bullet);
      if (bullet.life <= 0) bullets.splice(i, 1);
    }
  }

  function updateAsteroids(delta) {
    for (const asteroid of asteroids) {
      asteroid.x += asteroid.vx * delta;
      asteroid.y += asteroid.vy * delta;
      asteroid.rotation += asteroid.spin * delta;
      asteroid.hitFlash = Math.max(0, asteroid.hitFlash - delta);
      wrap(asteroid);
    }
  }

  function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      wrap(p);
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function handleCollisions() {
    for (let b = bullets.length - 1; b >= 0; b -= 1) {
      const bullet = bullets[b];
      for (let a = asteroids.length - 1; a >= 0; a -= 1) {
        const asteroid = asteroids[a];
        if (distance(bullet.x, bullet.y, asteroid.x, asteroid.y) <= asteroid.radius) {
          bullets.splice(b, 1);
          splitAsteroid(a);
          break;
        }
      }
    }

    if (GAME.time < ship.invulnerableUntil) return;

    for (let a = 0; a < asteroids.length; a += 1) {
      const asteroid = asteroids[a];
      if (distance(ship.x, ship.y, asteroid.x, asteroid.y) <= asteroid.radius + GAME.shipRadius * 0.75) {
        onShipHit();
        break;
      }
    }
  }

  function splitAsteroid(index) {
    const asteroid = asteroids[index];

    if (asteroid.size === 3) GAME.score += 20;
    if (asteroid.size === 2) GAME.score += 50;
    if (asteroid.size === 1) GAME.score += 100;

    createExplosion(asteroid.x, asteroid.y, asteroid.size * 7);

    if (asteroid.size > 1) {
      asteroids.push(createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y));
      asteroids.push(createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y));
    }

    asteroids.splice(index, 1);
  }

  function onShipHit() {
    GAME.lives -= 1;
    createExplosion(ship.x, ship.y, 22);

    if (GAME.lives <= 0) {
      GAME.isGameOver = true;
      return;
    }

    ship = createShip();
    ship.invulnerableUntil = GAME.time + SETTINGS.invulnerableAfterHit;
  }

  function createExplosion(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(70, 220);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: SETTINGS.explosionLife * randomRange(0.6, 1.4),
      });
    }
  }

  function render() {
    ctx.clearRect(0, 0, GAME.width, GAME.height);
    drawBackgroundStars();
    drawShip();
    drawAsteroids();
    drawBullets();
    drawParticles();
    drawHUD();

    if (GAME.isGameOver) drawOverlay();
  }

  function drawBackgroundStars() {
    for (let i = 0; i < 60; i += 1) {
      const x = (i * 137.5) % GAME.width;
      const y = (i * 83.3 + Math.sin(GAME.time + i) * 4 + 1000) % GAME.height;
      const alpha = 0.2 + ((i * 17) % 10) / 40;
      ctx.fillStyle = `rgba(200,220,255,${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawShip() {
    if (GAME.isGameOver) return;

    const blinking = GAME.time < ship.invulnerableUntil && Math.floor(GAME.time * 10) % 2 === 0;
    if (blinking) return;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = "#d9e6ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.stroke();

    if (ship.thrustFlash > 0) {
      ctx.strokeStyle = "#79ffe1";
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-18 - Math.random() * 7, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBullets() {
    ctx.fillStyle = "#79ffe1";
    for (const bullet of bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAsteroids() {
    for (const asteroid of asteroids) {
      ctx.save();
      ctx.translate(asteroid.x, asteroid.y);
      ctx.rotate(asteroid.rotation);
      ctx.strokeStyle = "#d9e6ff";
      ctx.lineWidth = asteroid.size === 3 ? 3 : 2;
      ctx.beginPath();
      const first = asteroid.vertices[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < asteroid.vertices.length; i += 1) {
        const v = asteroid.vertices[i];
        ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / SETTINGS.explosionLife);
      ctx.fillStyle = `rgba(255,180,120,${alpha})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    }
  }

  function drawHUD() {
    ctx.save();
    ctx.fillStyle = "#d9e6ff";
    ctx.font = "20px monospace";
    ctx.fillText(`Score: ${GAME.score}`, 16, 30);
    ctx.fillText(`Leben: ${GAME.lives}`, 16, 58);
    ctx.fillStyle = "#9db5ff";
    ctx.font = "14px monospace";
    ctx.fillText("Zerstöre Asteroiden und überlebe.", 16, 84);
    ctx.restore();
  }

  function drawOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, GAME.width, GAME.height);
    ctx.fillStyle = "#ff6b80";
    ctx.textAlign = "center";
    ctx.font = "bold 48px monospace";
    ctx.fillText("GAME OVER", GAME.width / 2, GAME.height / 2 - 20);
    ctx.fillStyle = "#d9e6ff";
    ctx.font = "22px monospace";
    ctx.fillText(`Endscore: ${GAME.score}`, GAME.width / 2, GAME.height / 2 + 22);
    ctx.font = "18px monospace";
    ctx.fillText("Drücke R für Neustart", GAME.width / 2, GAME.height / 2 + 58);
    ctx.restore();
  }

  function wrap(entity) {
    if (entity.x < 0) entity.x += GAME.width;
    if (entity.x > GAME.width) entity.x -= GAME.width;
    if (entity.y < 0) entity.y += GAME.height;
    if (entity.y > GAME.height) entity.y -= GAME.height;
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  resetGame();
  requestAnimationFrame((time) => {
    lastFrame = time;
    gameLoop(time);
  });
})();
