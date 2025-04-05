# HTML5 Asteroids Game

This is a simple implementation of the classic Atari game Asteroids, built using HTML, CSS, and JavaScript.

## How to Play

1.  Ensure you have all three files (`index.html`, `style.css`, `script.js`) in the same directory.
2.  Open the `index.html` file in your web browser.

## Controls

*   **Rotate Left:** Right Arrow Key (`→`)
*   **Rotate Right:** Left Arrow Key (`←`)
*   **Thrust:** Down Arrow Key (`↓`)
*   **Shoot:** Space Bar
*   **Hyperspace:** Up Arrow Key (`↑`) - Instantly jumps to a random location (use with caution!)

## Gameplay

*   Shoot asteroids to destroy them and score points.
*   Large asteroids break into medium asteroids, medium break into small. Small asteroids are destroyed completely.
*   Avoid colliding with asteroids.
*   If your ship is hit, you lose a life. You have 3 lives initially.
*   After being hit, your ship will respawn and be invincible for a short time (blinking effect).
*   Clear all asteroids to advance to the next level, which will have more asteroids.
*   If you lose all lives, the game is over. Press 'R' to restart.

## Features (Implemented)

*   Ship movement (rotation, thrust, friction)
*   Shooting
*   Asteroids (spawning, movement, breaking apart)
*   Collision detection (bullet-asteroid, ship-asteroid)
*   Screen wrapping for ship, bullets, and asteroids
*   Scoring
*   Lives system
*   Ship explosion and respawn invincibility
*   Hyperspace
*   Basic level progression
*   Game Over state and restart

## Features (To Be Implemented - Potential)

*   UFOs / Satellites
*   Sound effects
*   Game variations (shields, flip, different scoring rules)
*   Start screen / Menu
*   High scores
*   Particle effects