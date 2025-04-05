const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const SHIP_SIZE = 30; // Height of the ship triangle
const SHIP_THRUST = 5; // Acceleration in pixels per second per second
const FRICTION = 0.7; // Friction coefficient (0 = no friction, 1 = lots of friction)
const TURN_SPEED = 360; // Rotate speed in degrees per second
const BULLET_SPEED = 500; // Speed of bullets in pixels per second
const BULLET_MAX = 10; // Maximum number of bullets on screen
const BULLET_LIFETIME = 1; // Max time bullet lives in seconds
const ASTEROID_NUM = 3; // Starting number of asteroids
const ASTEROID_SIZE = 100; // Starting size of asteroids in pixels
const ASTEROID_SPEED = 50; // Max starting speed in pixels per second
const ASTEROID_VERT = 10; // Average number of vertices on each asteroid
const ASTEROID_JAG = 0.4; // Jaggedness of the asteroids (0 = none, 1 = lots)
const ASTEROID_PTS_LGE = 20;
const ASTEROID_PTS_MED = 50;
const ASTEROID_PTS_SML = 100;
const SHOW_BOUNDING = false; // Show collision bounding circles
const SHIP_EXPLODE_DUR = 0.3; // Duration of ship explosion in seconds
const SHIP_INV_DUR = 3; // Duration of ship invincibility in seconds
const SHIP_BLINK_DUR = 0.1; // Duration of ship blink during invincibility

// Ship class
class Ship {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = SHIP_SIZE / 2;
        this.angle = 90 / 180 * Math.PI; // Convert degrees to radians, point up
        this.rotation = 0;
        this.thrusting = false;
        this.vel = {
            x: 0,
            y: 0
        };
        this.canShoot = true;
        this.explodeTime = 0; // Time remaining for explosion animation
        this.invincibleTime = 0; // Time remaining for invincibility
        this.blinkTime = 0; // Timer for blinking effect
    }

    isAlive() {
        return this.explodeTime <= 0;
    }

    isInvincible() {
        return this.invincibleTime > 0;
    }

    explode() {
        this.explodeTime = SHIP_EXPLODE_DUR;
        // TODO: Add explosion sound effect here
    }

    respawn() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.vel = { x: 0, y: 0 };
        this.angle = 90 / 180 * Math.PI;
        this.invincibleTime = SHIP_INV_DUR;
        this.blinkTime = SHIP_BLINK_DUR;
    }

    hyperspace() {
        if (!this.isAlive()) return;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        // Optional: Add short invincibility after hyperspace?
        // this.invincibleTime = 1; // e.g., 1 second
    }

    draw(deltaTime) {
        if (this.explodeTime > 0) {
            // Draw explosion (simple expanding circle for now)
            ctx.fillStyle = 'darkred';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 + (SHIP_EXPLODE_DUR - this.explodeTime) / SHIP_EXPLODE_DUR * 2), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 + (SHIP_EXPLODE_DUR - this.explodeTime) / SHIP_EXPLODE_DUR * 1), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'orange';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 + (SHIP_EXPLODE_DUR - this.explodeTime) / SHIP_EXPLODE_DUR * 0.5), 0, Math.PI * 2);
            ctx.fill();
            return; // Don't draw ship during explosion
        }

        // Blink when invincible
        let showShip = true;
        if (this.isInvincible()) {
            this.blinkTime -= deltaTime;
            if (this.blinkTime <= 0) {
                this.blinkTime = SHIP_BLINK_DUR; // Reset blink timer
            }
            showShip = this.blinkTime > SHIP_BLINK_DUR / 2; // Blink on/off
        }

        if (showShip) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = SHIP_SIZE / 20;
            ctx.beginPath();
            // Triangle shape
            ctx.moveTo( // Nose of the ship
                this.x + this.radius * Math.cos(this.angle),
                this.y - this.radius * Math.sin(this.angle) // Y is inverted in canvas
            );
            ctx.lineTo( // Rear left
                this.x - this.radius * (Math.cos(this.angle) + Math.sin(this.angle)),
                this.y + this.radius * (Math.sin(this.angle) - Math.cos(this.angle))
            );
            ctx.lineTo( // Rear right
                this.x - this.radius * (Math.cos(this.angle) - Math.sin(this.angle)),
                this.y + this.radius * (Math.sin(this.angle) + Math.cos(this.angle))
            );
            ctx.closePath();
            ctx.stroke();
        }

        // Draw thrust flame if thrusting and alive
        if (this.thrusting && showShip && this.isAlive()) {
             ctx.fillStyle = 'red';
             ctx.strokeStyle = 'yellow';
             ctx.lineWidth = SHIP_SIZE / 10;
             ctx.beginPath();
             // Triangle shape for flame
             ctx.moveTo( // Rear center
                 this.x - this.radius * (Math.cos(this.angle) + 0.5 * Math.sin(this.angle)),
                 this.y + this.radius * (Math.sin(this.angle) - 0.5 * Math.cos(this.angle))
             );
             ctx.lineTo( // Rear left base
                 this.x - this.radius * (Math.cos(this.angle) + Math.sin(this.angle)) * 0.7,
                 this.y + this.radius * (Math.sin(this.angle) - Math.cos(this.angle)) * 0.7
             );
             ctx.lineTo( // Rear right base
                 this.x - this.radius * (Math.cos(this.angle) - Math.sin(this.angle)) * 0.7,
                 this.y + this.radius * (Math.sin(this.angle) + Math.cos(this.angle)) * 0.7
             );
             ctx.closePath();
             ctx.fill();
             ctx.stroke();
        }
    }

    thrust(deltaTime) {
        if (!this.isAlive()) return;
        // Thrust calculation needs deltaTime adjustment
        this.vel.x += SHIP_THRUST * Math.cos(this.angle) * 60 * deltaTime; 
        this.vel.y -= SHIP_THRUST * Math.sin(this.angle) * 60 * deltaTime;
    }

    shoot() {
        if (!this.isAlive() || !this.canShoot) return;
        // Only shoot if less than max bullets
        if (bullets.length < BULLET_MAX) {
            const bullet = new Bullet(this.x + this.radius * Math.cos(this.angle),
                                    this.y - this.radius * Math.sin(this.angle),
                                    this.angle);
            bullets.push(bullet);
            this.canShoot = false; // Prevent rapid fire maybe?
            setTimeout(() => { this.canShoot = true; }, 100); // Cooldown - adjust as needed
        }
    }

    update(deltaTime) {
        if (this.explodeTime > 0) {
            this.explodeTime -= deltaTime;
            if (this.explodeTime <= 0) {
                // Explosion finished
                lives--;
                if (lives <= 0) {
                    gameOver = true;
                } else {
                    this.respawn();
                }
            }
            return; // Stop updates during explosion
        }

        if (this.isInvincible()) {
            this.invincibleTime -= deltaTime;
        }

        // Apply thrust
        if (this.thrusting) {
            this.thrust(deltaTime);
        }

        // Apply friction (slow down the ship)
        this.vel.x *= (1 - FRICTION * deltaTime);
        this.vel.y *= (1 - FRICTION * deltaTime);

        // Rotate ship
        this.angle += this.rotation * (TURN_SPEED / 180 * Math.PI) * deltaTime;

        // Move ship
        this.x += this.vel.x * deltaTime;
        this.y += this.vel.y * deltaTime;

        // Handle screen wrapping
        if (this.x < 0 - this.radius) {
            this.x = canvas.width + this.radius;
        } else if (this.x > canvas.width + this.radius) {
            this.x = 0 - this.radius;
        }
        if (this.y < 0 - this.radius) {
            this.y = canvas.height + this.radius;
        } else if (this.y > canvas.height + this.radius) {
            this.y = 0 - this.radius;
        }
    }
}

// Bullet class
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.vel = {
            x: BULLET_SPEED * Math.cos(angle),
            y: -BULLET_SPEED * Math.sin(angle) // Y is inverted
        };
        this.radius = 2;
        this.lifetime = BULLET_LIFETIME;
    }

    update(deltaTime) {
        this.x += this.vel.x * deltaTime;
        this.y += this.vel.y * deltaTime;
        this.lifetime -= deltaTime;

        // Handle screen wrapping (optional for bullets, could just disappear)
        if (this.x < 0) this.x = canvas.width;
        else if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        else if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Asteroid class
class Asteroid {
    constructor(x, y, radius) {
        this.x = x !== undefined ? x : Math.random() * canvas.width;
        this.y = y !== undefined ? y : Math.random() * canvas.height;
        this.radius = radius !== undefined ? radius : Math.ceil(ASTEROID_SIZE / 2);
        this.angle = Math.random() * Math.PI * 2; // Random angle
        this.vel = {
            x: Math.random() * ASTEROID_SPEED * (Math.random() < 0.5 ? 1 : -1) / 60 * (ASTEROID_SIZE / this.radius),
            y: Math.random() * ASTEROID_SPEED * (Math.random() < 0.5 ? 1 : -1) / 60 * (ASTEROID_SIZE / this.radius)
        };
        this.vert = Math.floor(Math.random() * (ASTEROID_VERT + 1) + ASTEROID_VERT / 2);
        // Offset vertices for jaggedness
        this.offs = [];
        for (let i = 0; i < this.vert; i++) {
            this.offs.push(Math.random() * ASTEROID_JAG * 2 + 1 - ASTEROID_JAG);
        }
    }

    update(deltaTime) {
        this.x += this.vel.x * 60 * deltaTime; // Adjust speed based on deltaTime
        this.y += this.vel.y * 60 * deltaTime;

        // Handle screen wrapping
        if (this.x < 0 - this.radius) {
            this.x = canvas.width + this.radius;
        } else if (this.x > canvas.width + this.radius) {
            this.x = 0 - this.radius;
        }
        if (this.y < 0 - this.radius) {
            this.y = canvas.height + this.radius;
        } else if (this.y > canvas.height + this.radius) {
            this.y = 0 - this.radius;
        }
    }

    draw() {
        ctx.strokeStyle = 'slategrey';
        ctx.lineWidth = SHIP_SIZE / 20;
        ctx.beginPath();
        // Draw jagged polygon
        let vertAngle = Math.PI * 2 / this.vert;
        ctx.moveTo(
            this.x + this.radius * this.offs[0] * Math.cos(this.angle),
            this.y + this.radius * this.offs[0] * Math.sin(this.angle)
        );
        for (let i = 1; i < this.vert; i++) {
            ctx.lineTo(
                this.x + this.radius * this.offs[i] * Math.cos(this.angle + i * vertAngle),
                this.y + this.radius * this.offs[i] * Math.sin(this.angle + i * vertAngle)
            );
        }
        ctx.closePath();
        ctx.stroke();

        // Optionally draw bounding circle
        if (SHOW_BOUNDING) {
            ctx.strokeStyle = 'lime';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

let ship = new Ship();
let bullets = [];
let asteroids = [];
let score = 0;
let level = 0;
let lives = 3; // Starting lives
let gameOver = false;
let lastTime = 0;

// Create initial asteroids or level up
function newLevel() {
    level++;
    ship.respawn(); // Give invincibility at start of level
    createAsteroids();
}

function createAsteroids() {
    asteroids = [];
    let x, y;
    // Adjust number of asteroids based on level
    const numAsteroids = ASTEROID_NUM + level -1;
    for (let i = 0; i < numAsteroids; i++) {
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (distBetweenPoints(ship.x, ship.y, x, y) < ASTEROID_SIZE * 2 + ship.radius); // Don't spawn too close to ship
        asteroids.push(new Asteroid(x, y, Math.ceil(ASTEROID_SIZE / 2))); // Pass size explicitly
    }
}

// Helper function for distance
function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function destroyAsteroid(index) {
    const asteroid = asteroids[index];

    // Score points
    if (asteroid.radius === Math.ceil(ASTEROID_SIZE / 2)) {
        score += ASTEROID_PTS_LGE;
    } else if (asteroid.radius === Math.ceil(ASTEROID_SIZE / 4)) {
        score += ASTEROID_PTS_MED;
    } else {
        score += ASTEROID_PTS_SML;
    }

    // Break up asteroid
    if (asteroid.radius > Math.ceil(ASTEROID_SIZE / 8)) { // Check against smallest size / 2
        const newRadius = Math.ceil(asteroid.radius / 2);
        asteroids.push(new Asteroid(asteroid.x, asteroid.y, newRadius));
        asteroids.push(new Asteroid(asteroid.x, asteroid.y, newRadius));
    }
    asteroids.splice(index, 1);

    // Check for level completion
    if (asteroids.length === 0) {
        newLevel();
    }
}

// Initialize game state
newLevel();

// Game loop
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000; // Time difference in seconds
    lastTime = timestamp;

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameOver) {
        // Display Game Over message
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);
        requestAnimationFrame(gameLoop); // Keep loop running for restart
        return; // Stop further game logic
    }

    // Update and draw ship
    ship.update(deltaTime);
    ship.draw(deltaTime);

    // Update and draw bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update(deltaTime);
        bullet.draw();

        // Check for bullet-asteroid collisions
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (distBetweenPoints(bullet.x, bullet.y, asteroids[j].x, asteroids[j].y) < asteroids[j].radius + bullet.radius) {
                destroyAsteroid(j);
                bullets.splice(i, 1);
                break;
            }
        }

        if (i < bullets.length && bullet.lifetime <= 0) { // Check if bullet still exists before splicing
             bullets.splice(i, 1);
        }
    }

    // Update and draw asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        asteroids[i].update(deltaTime);
        asteroids[i].draw();

        // Check for ship-asteroid collisions (only if ship is alive and not invincible)
        if (ship.isAlive() && !ship.isInvincible() && distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.radius + asteroids[i].radius) {
            ship.explode();
            destroyAsteroid(i); // Destroy asteroid that hit the ship
            break; // Only handle one collision per frame
        }
    }

    // Draw Score and Lives
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText("Score: " + score, 10, 30);
    ctx.textAlign = 'right';
    ctx.fillText("Lives: " + lives, canvas.width - 10, 30);

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

// Keyboard input handlers
document.addEventListener('keydown', (event) => {
    if (gameOver) {
        if (event.key === 'r' || event.key === 'R') {
            // Reset game state
            score = 0;
            lives = 3;
            level = 0;
            ship = new Ship();
            bullets = [];
            newLevel();
            gameOver = false;
        }
        return; // Ignore game controls when game over
    }

    // Allow controls only if ship is alive
    if (!ship.isAlive()) return;

    switch(event.key) {
        case 'ArrowRight': // Rotate LEFT
             ship.rotation = -1;
             break;
        case 'ArrowLeft': // Rotate RIGHT
             ship.rotation = 1;
             break;
        case 'ArrowDown': // Unused
             break;
        case 'ArrowUp': // Now THRUST
             ship.thrusting = true;
             break;
        case 'Control': // Hyperspace
             ship.hyperspace();
             break;
        case ' ': // Now SHOOT
        case 'Spacebar':
             ship.shoot();
             break;
    }
});

document.addEventListener('keyup', (event) => {
     // Allow controls only if ship is alive
    if (!ship.isAlive()) return;

    switch(event.key) {
        case 'ArrowRight': // Stop rotating LEFT
             if (ship.rotation < 0) ship.rotation = 0;
             break;
        case 'ArrowLeft': // Stop rotating RIGHT
             if (ship.rotation > 0) ship.rotation = 0;
             break;
        case 'ArrowDown': // Unused
             break;
        case 'ArrowUp': // Stop THRUST
            ship.thrusting = false;
            break;
        // Control doesn't need keyup for hyperspace (instant)
        case ' ': // Stop SHOOT (no action needed for instant shot)
        case 'Spacebar':
            // No action needed on keyup for shoot
            break;
    }
}); 