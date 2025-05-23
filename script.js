import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// --- Game Settings ---
// Use fixed dimensions again
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 750;
const SHIP_SIZE = 90; // Base size for the 3D model (WAS 60)
const SHIP_THRUST = 0.1;
const FRICTION = 0.99; // Multiplicative friction
const TURN_SPEED = 0.05; // Radians per frame
const BULLET_SPEED = 7;
const BULLET_MAX = 5;
const BULLET_LIFETIME = 60; // Frames
const ASTEROID_NUM = 3;
const ASTEROID_SIZE = 125; // Starting size of asteroids in pixels (WAS 250)
const ASTEROID_SPEED = 1.5;
const ASTEROID_VERT = 10;
const ASTEROID_JAG = 0.4;
const ASTEROID_PTS_LGE = 20;
const ASTEROID_PTS_MED = 50;
const ASTEROID_PTS_SML = 100;
const SHIP_EXPLODE_DUR = 15; // Frames
const SHIP_INV_DUR = 180; // Frames
const SHIP_BLINK_DUR = 10; // Frames

// --- Global Variables ---
let scene, camera, renderer;
let ship;
let bullets = [];
let asteroids = [];
let score = 0;
let level = 0;
let lives = 3;
let gameOver = false;
let gamePaused = false; // For potential pausing
let borderLine; // Store border mesh globally
let textureLoader; // Global texture loader
let asteroidTextures = []; // Array for preloaded asteroid textures
let shipTextureA; // Texture for normal ship
let shipTextureB; // Texture for ship with thrust

let gameState = 'titleScreen'; // Initial state
let topScores = []; // Array of {initials, score}
const HIGH_SCORE_KEY = 'asteroidsTopScoresV1'; // Use a unique key
const MAX_HIGH_SCORES = 3;

// DOM Elements
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const startScreen = document.getElementById('startScreen');
const highScoreListElement = document.getElementById('highScoreList').querySelector('ol');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverMessage = document.getElementById('gameOverMessage');
const newHighScoreInput = document.getElementById('newHighScoreInput');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const initialsInput = document.getElementById('initialsInput');
const submitScoreButton = document.getElementById('submitScoreButton');

// --- Asset Preloading ---
const ASSET_PATHS = {
    shipA: 'ShipA.png',
    shipB: 'ShipB.png',
    asteroids: [
        'asteroid1.png',
        'asteroid2.png',
        'asteroid3.png',
        'asteroid4.png'
    ]
};

async function preloadAssets() {
    textureLoader = new THREE.TextureLoader();
    const promises = [];

    // Load Ship Textures
    promises.push(textureLoader.loadAsync(ASSET_PATHS.shipA));
    promises.push(textureLoader.loadAsync(ASSET_PATHS.shipB));

    // Load Asteroid Textures
    ASSET_PATHS.asteroids.forEach(path => {
        promises.push(textureLoader.loadAsync(path));
    });

    try {
        const loadedAssets = await Promise.all(promises);
        // Assign loaded textures
        shipTextureA = loadedAssets[0];
        shipTextureB = loadedAssets[1];
        asteroidTextures = loadedAssets.slice(2); // The rest are asteroids

        console.log("All textures preloaded successfully.");
    } catch (error) {
        console.error("Error preloading textures:", error);
        // Handle error - game might proceed without textures
    }
}

// --- High Score Logic ---
function loadTopScores() {
    try {
        const storedScores = localStorage.getItem(HIGH_SCORE_KEY);
        if (storedScores) {
            topScores = JSON.parse(storedScores);
        } else {
            // Initialize with defaults if nothing stored
            topScores = [];
        }
    } catch (e) {
        console.error("Error loading/parsing high scores:", e);
        topScores = [];
    }

    // Ensure array has default structure, is sorted, and capped
    while (topScores.length < MAX_HIGH_SCORES) {
        topScores.push({ initials: '---', score: 0 });
    }
    topScores.sort((a, b) => b.score - a.score); // Sort descending
    topScores = topScores.slice(0, MAX_HIGH_SCORES); // Ensure max length

    updateHighScoreDisplay(); // Update display after loading/normalizing
}

function saveTopScores() {
    try {
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(topScores));
    } catch (e) {
        console.error("Error saving high scores:", e);
    }
}

function isTopScore(currentScore) {
    if (topScores.length < MAX_HIGH_SCORES) {
        return true; // Always a top score if list isn't full
    }
    // Check against the lowest score in the current top list
    return currentScore > topScores[MAX_HIGH_SCORES - 1].score;
}

function addTopScore(initials, currentScore) {
    initials = initials.toUpperCase().padEnd(3, '-').substring(0, 3);
    topScores.push({ initials: initials, score: currentScore });
    topScores.sort((a, b) => b.score - a.score); // Sort descending
    topScores = topScores.slice(0, MAX_HIGH_SCORES); // Keep only top scores
    saveTopScores();
    updateHighScoreDisplay(); // Update display on title screen
}

function updateHighScoreDisplay() {
    const listItems = highScoreListElement.querySelectorAll('li');
    listItems.forEach((item, index) => {
        if (topScores[index]) {
            item.querySelector('.initials').textContent = topScores[index].initials;
            item.querySelector('.score').textContent = topScores[index].score;
        } else {
             // Should not happen if loadTopScores initializes correctly
            item.querySelector('.initials').textContent = '---';
            item.querySelector('.score').textContent = '0';
        }
    });
}

// --- Initialization ---
async function init() {
    // Load high scores first
    loadTopScores();

    // Preload assets
    await preloadAssets();

    // Initialize dimensions are now const
    // GAME_WIDTH = window.innerWidth; // Removed
    // GAME_HEIGHT = window.innerHeight; // Removed

    // Scene
    scene = new THREE.Scene();

    // Camera (Orthographic)
    camera = new THREE.OrthographicCamera(
        -GAME_WIDTH / 2, GAME_WIDTH / 2,
        GAME_HEIGHT / 2, -GAME_HEIGHT / 2,
        1, 1000
    );
    camera.position.z = 10;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(GAME_WIDTH, GAME_HEIGHT);
    document.body.appendChild(renderer.domElement);

    // Lights (Basic)
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // --- Add Border ---
    const halfW = GAME_WIDTH / 2;
    const halfH = GAME_HEIGHT / 2;
    const borderPoints = new Float32Array([
        -halfW,  halfH, 0, // Top-left
         halfW,  halfH, 0, // Top-right
         halfW, -halfH, 0, // Bottom-right
        -halfW, -halfH, 0, // Bottom-left
        -halfW,  halfH, 0  // Close loop
    ]);
    const borderGeometry = new THREE.BufferGeometry();
    borderGeometry.setAttribute('position', new THREE.BufferAttribute(borderPoints, 3));
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    borderLine = new THREE.Line(borderGeometry, borderMaterial); // Use Line
    scene.add(borderLine);
    // --- End Border ---

    // --- Add Starfield ---
    const starQty = 500;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    const starSpread = GAME_WIDTH * 1.5; // Adjust spread based on new fixed width
    const starDepth = 500; // How deep the starfield goes

    for (let i = 0; i < starQty; i++) {
        const x = THREE.MathUtils.randFloatSpread(starSpread);
        const y = THREE.MathUtils.randFloatSpread(starSpread);
        const z = THREE.MathUtils.randFloat(-starDepth, -10); // Place behind game plane (Z=0)
        starPositions.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        sizeAttenuation: false // Stars stay same size regardless of distance
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    // --- End Starfield ---

    // Initial UI state
    startScreen.style.display = 'flex';
    scoreDisplay.style.display = 'none';
    livesDisplay.style.display = 'none';
    gameOverScreen.style.display = 'none';

    // Add Event Listeners
    addEventListeners();

    gameLoop(); // Start loop
}

// --- Game State Management ---
function startGame() {
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    scoreDisplay.style.display = 'block';
    livesDisplay.style.display = 'block';
    resetGame(); // Initialize game elements
}

function showTitleScreen() {
    gameState = 'titleScreen';
    loadTopScores();
    updateHighScoreDisplay();
    startScreen.style.display = 'flex';
    gameOverScreen.style.display = 'none';
    scoreDisplay.style.display = 'none';
    livesDisplay.style.display = 'none';

     // Clean up any leftover game objects (optional but good practice)
    if (ship && ship.mesh) scene.remove(ship.mesh);
    bullets.forEach(b => scene.remove(b.mesh));
    bullets = [];
    asteroids.forEach(a => scene.remove(a.mesh));
    asteroids = [];
    ship = null; // Ensure ship is cleared
}

function showGameOver(playerScore) {
    gameState = 'gameOver';
    scoreDisplay.style.display = 'none';
    livesDisplay.style.display = 'none';
    gameOverScreen.style.display = 'block';

    if (isTopScore(playerScore)) {
        // Show initials input
        finalScoreDisplay.textContent = playerScore;
        gameOverMessage.style.display = 'none';
        newHighScoreInput.style.display = 'block';
        initialsInput.value = '';
        initialsInput.focus();
    } else {
        // Show standard game over message
        gameOverMessage.querySelector('p').textContent = `Final Score: ${playerScore}\nPress R to Return to Title`;
        gameOverMessage.style.display = 'block';
        newHighScoreInput.style.display = 'none';
    }
}

function handleSubmitScore() {
     const initials = initialsInput.value.trim();
     if (initials) { // Check if not empty
         addTopScore(initials, score); // Use the final game score
         showTitleScreen(); // Go back to title after submitting
     } else {
         // Optional: Show error or just default
         addTopScore("AAA", score); 
         showTitleScreen();
     }
}

function resetGame() {
    score = 0;
    lives = 3;
    level = 0;
    updateUI();

    // Clear existing objects from scene and arrays
    bullets.forEach(b => scene.remove(b.mesh));
    bullets = [];
    asteroids.forEach(a => scene.remove(a.mesh));
    asteroids = [];

    // Remove old ship mesh if resetting (shouldn't exist if coming from title)
    if (ship && ship.mesh) {
        scene.remove(ship.mesh);
    }
    ship = new Ship(); // Create NEW ship instance for the game
    newLevel(); // Start level 1
}

function updateUI() {
    scoreDisplay.innerText = "Score: " + score;
    livesDisplay.innerText = "Lives: " + lives;
}

// --- Classes ---

class Ship {
    constructor() {
        this.radius = SHIP_SIZE / 2; // Adjust collision radius based on new visual
        this.angle = 0; // Radians, 0 = right
        this.rotation = 0; // Rotation speed
        this.thrusting = false;
        this.vel = { x: 0, y: 0 };
        this.canShoot = true;
        this.shootCooldown = 10; // Frames
        this.shootTimer = 0;

        this.explodeTime = 0;
        this.invincibleTime = 0;
        this.blinkTime = 0;
        this.isRespawning = false;

        // --- Create Ship Mesh with Texture ---
        // Use default ShipA texture aspect ratio for initial geometry
        let initialWidth = SHIP_SIZE;
        let initialHeight = SHIP_SIZE;
        if (shipTextureA) {
             const textureAspect = shipTextureA.image.width / shipTextureA.image.height;
             initialHeight = SHIP_SIZE;
             initialWidth = SHIP_SIZE * textureAspect;
        } 
        const planeGeometry = new THREE.PlaneGeometry(initialWidth, initialHeight);

        // Create the material (will swap map later)
        const shipMaterial = new THREE.MeshStandardMaterial({
            map: shipTextureA ? shipTextureA : null, // Start with ShipA if loaded
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
         // Fallback color if texture A didn't load
        if (!shipTextureA) { 
            console.warn("ShipA texture not loaded, using fallback color.");
            shipMaterial.color = new THREE.Color(0xff00ff);
            shipMaterial.map = null; // Ensure no map is set
        }

        this.mesh = new THREE.Mesh(planeGeometry, shipMaterial);

        // If textures might have different aspect ratios, we might need to adjust geometry on swap,
        // but let's assume they are the same for now for simplicity.

        // --- Ship Mesh Setup ---
        this.mesh.position.set(0, 0, 0); // Center initially
        scene.add(this.mesh);

        // --- Remove Flame Mesh ---
        // No separate flame mesh needed

         // Respawn immediately
        this.respawn();
    }

    isAlive() {
        return this.explodeTime <= 0;
    }

    isInvincible() {
        return this.invincibleTime > 0;
    }

    explode() {
        if (!this.isAlive()) return; // Don't explode if already exploding
        this.explodeTime = SHIP_EXPLODE_DUR;
        this.mesh.visible = false; // Hide ship mesh
        // TODO: Add explosion particle effect
        // TODO: Add explosion sound
    }

    respawn() {
        this.mesh.position.set(0, 0, 0);
        this.vel = { x: 0, y: 0 };
        this.angle = 0; // Point right
        this.mesh.rotation.z = this.angle; // Sync mesh group rotation
        this.invincibleTime = SHIP_INV_DUR;
        this.blinkTime = SHIP_BLINK_DUR;
        this.explodeTime = 0; // Ensure not exploding
        this.mesh.visible = true; // Make sure mesh is visible
        this.isRespawning = true; // Flag to handle blinking in update
    }

    hyperspace() {
        if (!this.isAlive()) return;
        this.mesh.position.x = Math.random() * GAME_WIDTH - GAME_WIDTH / 2;
        this.mesh.position.y = Math.random() * GAME_HEIGHT - GAME_HEIGHT / 2;
        // Optional short invincibility
        // this.invincibleTime = 60;
        // this.isRespawning = true; // Trigger blinking
    }

    thrust() {
        if (!this.isAlive()) return;
        this.vel.x += SHIP_THRUST * Math.cos(this.angle);
        this.vel.y += SHIP_THRUST * Math.sin(this.angle);
        // No need to handle flame visibility here, done in update
    }

    shoot() {
        if (!this.isAlive() || this.shootTimer > 0) return;

        if (bullets.length < BULLET_MAX) {
            // Calculate offset based on ship's angle and size
            const forwardOffset = SHIP_SIZE * 0.5; // Start bullet roughly at the nose
            const bulletX = this.mesh.position.x + forwardOffset * Math.cos(this.angle);
            const bulletY = this.mesh.position.y + forwardOffset * Math.sin(this.angle);

            const bullet = new Bullet(bulletX, bulletY, this.angle);
            bullets.push(bullet);
            this.shootTimer = this.shootCooldown;
            // TODO: Add shoot sound
        }
    }

    update() {
        // Handle Explosion
        if (this.explodeTime > 0) {
            this.explodeTime--;
            if (this.explodeTime <= 0) {
                lives--;
                updateUI();
                if (lives <= 0) {
                    showGameOver(score); // Call new game over handler
                } else {
                    this.respawn();
                }
            }
            return; // Stop updates during explosion
        }

        // Determine if ship should be drawn (blinking or normal)
        let shipShouldBeVisible = true;
        if (!this.isAlive()) {
            shipShouldBeVisible = false; // Ship itself is not visible if exploding
        } else if (this.invincibleTime > 0) {
             this.invincibleTime--;
             if (this.isRespawning) {
                  this.blinkTime--;
                  if (this.blinkTime <= 0) {
                      this.blinkTime = SHIP_BLINK_DUR;
                       if (this.mesh.material && this.mesh.material.map) {
                          this.mesh.visible = !this.mesh.visible;
                      } else { 
                          this.mesh.visible = false;
                      }
                  }
                 // Use the current mesh visibility state for shipShouldBeVisible
                 shipShouldBeVisible = this.mesh.visible; 
             }
              if (this.invincibleTime <= 0) {
                  this.mesh.visible = true; // Ensure visible at end
                  this.isRespawning = false;
                  shipShouldBeVisible = true;
              }
         } else {
              this.mesh.visible = true; // Ensure visible if not invincible
              this.isRespawning = false;
              shipShouldBeVisible = true;
         }

        // Rotate
        this.angle += this.rotation * TURN_SPEED;

        // Thrust & Texture Swapping
        let targetTexture = shipTextureA; // Default to normal texture
        if (this.thrusting && shipShouldBeVisible) {
            this.thrust(); // Apply thrust force
            targetTexture = shipTextureB; // Target the thrust texture
        } 
        
        // Update material map only if needed and texture exists
        if (this.mesh.material.map !== targetTexture && targetTexture) {
            this.mesh.material.map = targetTexture;
            // We might need to update geometry if aspect ratios differ significantly
            // For now, assume they are similar enough.
            // const aspect = targetTexture.image.width / targetTexture.image.height;
            // const height = SHIP_SIZE;
            // const width = height * aspect;
            // this.mesh.geometry.dispose(); // Dispose old geometry
            // this.mesh.geometry = new THREE.PlaneGeometry(width, height);
            this.mesh.material.needsUpdate = true; 
        } else if (!targetTexture && this.mesh.material.map !== null) {
             // Handle case where target texture isn't loaded (fallback to no texture/color)
             this.mesh.material.map = null;
             this.mesh.material.color = new THREE.Color(0xff00ff); // Magenta error color
             this.mesh.material.needsUpdate = true; 
        }

        // Apply Friction
        this.vel.x *= FRICTION;
        this.vel.y *= FRICTION;

        // Move Ship (moves the parent mesh, flame follows)
        this.mesh.position.x += this.vel.x;
        this.mesh.position.y += this.vel.y;

        // Update ship mesh rotation (flame rotates automatically as a child)
        this.mesh.rotation.z = this.angle - Math.PI / 2;

        // Screen Wrapping
        const halfWidth = GAME_WIDTH / 2;
        const halfHeight = GAME_HEIGHT / 2;
        const wrapRadius = this.radius; // Use ship radius for wrapping buffer
        if (this.mesh.position.x > halfWidth + wrapRadius) this.mesh.position.x = -halfWidth - wrapRadius;
        if (this.mesh.position.x < -halfWidth - wrapRadius) this.mesh.position.x = halfWidth + wrapRadius;
        if (this.mesh.position.y > halfHeight + wrapRadius) this.mesh.position.y = -halfHeight - wrapRadius;
        if (this.mesh.position.y < -halfHeight - wrapRadius) this.mesh.position.y = halfHeight + wrapRadius;

        // Update shoot timer
        if (this.shootTimer > 0) {
            this.shootTimer--;
        }
    }
}

class Bullet {
    constructor(x, y, angle) {
        this.radius = 2;
        this.lifetime = BULLET_LIFETIME;

        // 3D Mesh
        const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red bullets
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, 0);
        scene.add(this.mesh);

        // Velocity (set after mesh creation)
        this.vel = {
            x: BULLET_SPEED * Math.cos(angle),
            y: BULLET_SPEED * Math.sin(angle)
        };
    }

    update() {
        this.mesh.position.x += this.vel.x;
        this.mesh.position.y += this.vel.y;
        this.lifetime--;

        // Screen Wrapping (optional, could just destroy off-screen)
        const halfWidth = GAME_WIDTH / 2;
        const halfHeight = GAME_HEIGHT / 2;
        if (this.mesh.position.x > halfWidth + this.radius) this.mesh.position.x = -halfWidth - this.radius;
        if (this.mesh.position.x < -halfWidth - this.radius) this.mesh.position.x = halfWidth + this.radius;
        if (this.mesh.position.y > halfHeight + this.radius) this.mesh.position.y = -halfHeight - this.radius;
        if (this.mesh.position.y < -halfHeight - this.radius) this.mesh.position.y = halfHeight + this.radius;
    }
}

class Asteroid {
    constructor(x, y, radius) {
        this.radius = radius !== undefined ? radius : Math.ceil(ASTEROID_SIZE / 2);

        // --- Select and Apply Preloaded Texture ---
        if (asteroidTextures.length === 0) {
            console.error("Asteroid textures not preloaded!");
            // Fallback geometry/material if loading failed
             const fallbackGeo = new THREE.IcosahedronGeometry(this.radius, 0);
             const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x808080, flatShading: true });
             this.mesh = new THREE.Mesh(fallbackGeo, fallbackMat);
        } else {
            // Randomly select a preloaded texture
            const textureIndex = Math.floor(Math.random() * asteroidTextures.length);
            const selectedTexture = asteroidTextures[textureIndex];

            // Adjust plane size to match texture aspect ratio
            const textureAspect = selectedTexture.image.width / selectedTexture.image.height;
            const planeHeight = this.radius * 2;
            const planeWidth = planeHeight * textureAspect;
            const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

            // Create material with the selected texture
            const material = new THREE.MeshStandardMaterial({
                map: selectedTexture,
                transparent: true,
                alphaTest: 0.1, // Adjust if needed
                side: THREE.DoubleSide
            });

            this.mesh = new THREE.Mesh(planeGeometry, material);
        }
        // --- End Texture Application ---

        // Position (avoid spawning on ship initially if possible)
        const safeRadius = SHIP_SIZE * 3;
        const startX = x !== undefined ? x : (Math.random() > 0.5 ? 1 : -1) * (Math.random() * (GAME_WIDTH / 2 - safeRadius) + safeRadius);
        const startY = y !== undefined ? y : (Math.random() > 0.5 ? 1 : -1) * (Math.random() * (GAME_HEIGHT / 2 - safeRadius) + safeRadius);
        this.mesh.position.set(startX, startY, 0);

        scene.add(this.mesh);

        // Velocity (smaller asteroids move faster)
        const speedMultiplier = (ASTEROID_SIZE / this.radius) * 0.5 + 0.5; // Adjust speed based on size
        const angle = Math.random() * Math.PI * 2;
        this.vel = {
            x: Math.cos(angle) * ASTEROID_SPEED * speedMultiplier * (Math.random() < 0.5 ? 1 : -1),
            y: Math.sin(angle) * ASTEROID_SPEED * speedMultiplier * (Math.random() < 0.5 ? 1 : -1)
        };
        // Simpler rotation for 2D sprite effect
        this.rotSpeed = (Math.random() - 0.5) * 0.03;
    }

    update() {
        this.mesh.position.x += this.vel.x;
        this.mesh.position.y += this.vel.y;
        // Rotate only around Z axis for 2D sprite effect
        this.mesh.rotation.z += this.rotSpeed;

        // Screen Wrapping
        const halfWidth = GAME_WIDTH / 2;
        const halfHeight = GAME_HEIGHT / 2;
        // Use radius for wrapping buffer
        const wrapRadius = this.radius; 
        if (this.mesh.position.x > halfWidth + wrapRadius) this.mesh.position.x = -halfWidth - wrapRadius;
        if (this.mesh.position.x < -halfWidth - wrapRadius) this.mesh.position.x = halfWidth + wrapRadius;
        if (this.mesh.position.y > halfHeight + wrapRadius) this.mesh.position.y = -halfHeight - wrapRadius;
        if (this.mesh.position.y < -halfHeight - wrapRadius) this.mesh.position.y = halfHeight + wrapRadius;
    }
}

// --- Game Logic Functions ---

function newLevel() {
    level++;
    createAsteroids();
    updateUI(); // Update score/lives display maybe for level start?
}

function createAsteroids() {
    const numAsteroids = ASTEROID_NUM + level - 1;
    for (let i = 0; i < numAsteroids; i++) {
        // Constructor now handles randomized safe spawning
        asteroids.push(new Asteroid(undefined, undefined, Math.ceil(ASTEROID_SIZE / 2)));
    }
}

function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function destroyAsteroid(index) {
    const asteroid = asteroids[index];
    if (!asteroid) return; // Avoid errors if already destroyed

    // Score points
    if (asteroid.radius === Math.ceil(ASTEROID_SIZE / 2)) score += ASTEROID_PTS_LGE;
    else if (asteroid.radius === Math.ceil(ASTEROID_SIZE / 4)) score += ASTEROID_PTS_MED;
    else score += ASTEROID_PTS_SML;
    updateUI();

    // Remove mesh from scene
    scene.remove(asteroid.mesh);

    // Break up asteroid
    if (asteroid.radius > Math.ceil(ASTEROID_SIZE / 8)) {
        const newRadius = Math.ceil(asteroid.radius / 2);
        asteroids.push(new Asteroid(asteroid.mesh.position.x, asteroid.mesh.position.y, newRadius));
        asteroids.push(new Asteroid(asteroid.mesh.position.x, asteroid.mesh.position.y, newRadius));
    }

    // Remove asteroid object from array
    asteroids.splice(index, 1);

    // TODO: Add asteroid explosion sound/effect

    // Check for level completion
    if (asteroids.length === 0 && ship.isAlive()) { // Only level up if ship is alive
        newLevel();
    }
}

function checkCollisions() {
    // Ship-Asteroid Collisions
    if (ship.isAlive() && !ship.isInvincible()) {
        for (let i = asteroids.length - 1; i >= 0; i--) {
             if (!asteroids[i] || !asteroids[i].mesh) continue; // Check if asteroid exists
            const dist = distBetweenPoints(ship.mesh.position.x, ship.mesh.position.y, asteroids[i].mesh.position.x, asteroids[i].mesh.position.y);
            if (dist < ship.radius + asteroids[i].radius) {
                ship.explode();
                destroyAsteroid(i);
                break; // Only one collision per frame
            }
        }
    }

    // Bullet-Asteroid Collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
         if (!bullets[i] || !bullets[i].mesh) continue; // Check if bullet exists
        for (let j = asteroids.length - 1; j >= 0; j--) {
             if (!asteroids[j] || !asteroids[j].mesh) continue; // Check if asteroid exists
            const dist = distBetweenPoints(bullets[i].mesh.position.x, bullets[i].mesh.position.y, asteroids[j].mesh.position.x, asteroids[j].mesh.position.y);
            if (dist < bullets[i].radius + asteroids[j].radius) {
                destroyAsteroid(j);
                scene.remove(bullets[i].mesh); // Remove bullet mesh
                bullets.splice(i, 1);        // Remove bullet object
                break; // Move to next bullet
            }
        }
    }
}

// --- Event Listeners ---
function addEventListeners() {
    // Submit Button Listener
    submitScoreButton.addEventListener('click', handleSubmitScore);
    // Optional: Allow Enter key in input field
    initialsInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if inside one
            handleSubmitScore();
        }
    });

    window.addEventListener('keydown', (event) => {
        switch (gameState) {
            case 'titleScreen':
                if (event.key === ' ' || event.key === 'Spacebar') {
                    startGame();
                }
                break;
            case 'playing':
                // Allow controls only if ship is alive (not exploding)
                if (!ship || (!ship.isAlive() && ship.explodeTime > 0)) return;

                switch(event.key) {
                    case 'ArrowRight': ship.rotation = -1; break;
                    case 'ArrowLeft': ship.rotation = 1; break;
                    case 'ArrowUp': ship.thrusting = true; break;
                    case 'Control': ship.hyperspace(); break;
                    case ' ':
                    case 'Spacebar': ship.shoot(); break;
                }
                break;
            case 'gameOver':
                 // Only allow restart if the initials input is NOT shown
                 if (newHighScoreInput.style.display === 'none') { 
                    if (event.key === 'r' || event.key === 'R') {
                        showTitleScreen(); 
                    }
                }
                break;
        }
    });

    window.addEventListener('keyup', (event) => {
        if (gameState !== 'playing') return; // Only handle keyup during play
        if (!ship || (!ship.isAlive() && ship.explodeTime > 0)) return;

        switch(event.key) {
            case 'ArrowRight': if (ship.rotation < 0) ship.rotation = 0; break;
            case 'ArrowLeft': if (ship.rotation > 0) ship.rotation = 0; break;
            case 'ArrowUp': ship.thrusting = false; break;
        }
    });
}

// --- Game Loop ---
function gameLoop() {
    requestAnimationFrame(gameLoop);

    switch (gameState) {
        case 'titleScreen':
             renderer.render(scene, camera); 
            break;
        case 'playing':
            // --- Normal Game Update Logic --- 
            if (!ship) return; // Should not happen, but safety check

            ship.update();

            for (let i = bullets.length - 1; i >= 0; i--) {
                if (!bullets[i]) continue;
                bullets[i].update();
                if (bullets[i].lifetime <= 0) {
                    if (bullets[i].mesh) scene.remove(bullets[i].mesh);
                    bullets.splice(i, 1);
                }
            }

            for (let i = asteroids.length - 1; i >= 0; i--) {
                if (!asteroids[i]) continue;
                asteroids[i].update();
            }

            checkCollisions();
            renderer.render(scene, camera);
            // --- End Normal Game Update Logic --- 
            break;
        case 'gameOver':
            // Keep rendering the final scene state, UI is handled by CSS/DOM
            renderer.render(scene, camera);
            break;
    }
}

// --- Start the game ---
init(); 