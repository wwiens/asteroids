# HTML5 Asteroids Game (Three.js Version)

This is an implementation of the classic Atari game Asteroids, rebuilt using HTML, CSS, and JavaScript with the **Three.js** library for 3D rendering.

## How to Play

1.  Ensure you have all required files (`index.html`, `style.css`, `script.js`) and image assets in the same directory.
2.  Open the `index.html` file in your web browser.
3.  Press **Spacebar** on the title screen to start the game.

## Required Assets

The game expects the following image files in the same directory:
*   `ShipA.png` (Normal spaceship)
*   `ShipB.png` (Spaceship with engine thrust effect)
*   `asteroid1.png`
*   `asteroid2.png`
*   `asteroid3.png`
*   `asteroid4.png`

*(If these files are missing, the game may show fallback shapes/colors).*

## Controls

*   **Rotate Left:** Right Arrow Key (`→`)
*   **Rotate Right:** Left Arrow Key (`←`)
*   **Thrust:** Up Arrow Key (`↑`) - Shows `ShipB.png`
*   **Shoot:** Space Bar
*   **Hyperspace:** Control Key (`Ctrl`) - Instantly jumps to a random location.

## Gameplay

*   Destroy asteroids using your spaceship's cannon (Spacebar).
*   Large asteroids break into medium asteroids, medium break into small. Small asteroids are destroyed completely. Asteroids have randomized appearances.
*   Avoid colliding with asteroids.
*   Use Thrust (Up Arrow) to move forward. The ship drifts with inertia.
*   Use Hyperspace (Ctrl) for emergency escapes, but beware of where you might reappear!
*   Clear all asteroids to advance to the next level, which features more asteroids.
*   You start with 3 lives. If your ship is hit, you lose a life and respawn after a brief explosion, invincible for a few moments (blinking effect).
*   If you lose all lives, the game is over.
    *   If your score is in the top 3, you'll be prompted to enter your initials (3 characters).
    *   Otherwise, press 'R' to return to the title screen.
*   High scores are saved locally in your browser.

## Features (Implemented)

*   **Three.js Rendering:** Game objects rendered as 3D meshes (using orthographic camera for 2D feel).
*   **Sprite-based Objects:** Ship and Asteroids use PNG images as textures on planes.
*   **Start Screen:** Displays title and Top 3 High Scores (loaded from `localStorage`).
*   **High Score Tracking:** Saves the top 3 scores with initials locally. Prompts for initials if a top score is achieved.
*   **Ship Controls:** Rotation, Thrust (swaps ship texture), Inertia/Friction.
*   **Shooting:** Firing projectiles.
*   **Asteroids:** Spawning, randomized appearance, movement, breaking apart on hit.
*   **Collisions:** Bullet-Asteroid and Ship-Asteroid detection.
*   **Scoring:** Points awarded for destroying asteroids.
*   **Lives & Game Over:** Standard lives system, game over state, respawn invincibility.
*   **Hyperspace:** Random teleportation mechanic.
*   **Level Progression:** Increasing number of asteroids per level.
*   **Background:** Static starfield using `THREE.Points`.
*   **Fixed Centered Layout:** Game area has a fixed size and is centered on the page.

## Features (To Be Implemented - Potential)

*   UFOs / Satellites (enemies that shoot back).
*   Sound effects (shooting, explosion, thrust, background music).
*   Game variations (shields, flip, different scoring/lives rules).
*   More sophisticated particle effects (explosions, thrust).
*   Different asteroid types/behaviors.
*   Mobile controls.