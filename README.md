# Nuclear-Stic Mines Retrash'd

> A roguelike inspired by Minesweeper and Chess.  
> Survive, rescue, and show off your score in every match.

---

## Description

Nuclear-Stic Mines is a roguelike game where you control characters with unique abilities to rescue children and survive on procedurally generated boards. Each match is unique, and if you lose, you lose — no saves, just a cold, hard death.

---

## Game Modes

| Mode | Description |
|------|-------------|
| **Legacy** | Progressive difficulty. Each victory increases the level, unlocking new hazards, children types, and biomes. |
| **Daily** | Fixed config per day using a seed. Everyone plays the same config. Only one attempt per day. |
| **Custom** | Full control over board size, hazard density, obstacle count, number of goals, and zone. |

---

## Characters

| Character | HP | AP | Flags | Force | Ability |
|-----------|----|----|-------|-------|---------|
| **Chef** | 5 | 0 | 5 | 3 | Immune to flagged/marked hazards |
| **Mosquito** | 3 | 0 | 8 | 2 | 20% chance to evade lethal hazards, 50% to evade damage |
| **Mommy** | 10 | 3 | 1 | 1 | Uses AP to absorb hazard damage |
| **Scout** | 1 | 0 | 2 | 5 | Passes through natural obstacles (trees, bushes) |

> **Force** = How many children the character can carry at once.

---

## Hazards

| Hazard | Behavior |
|--------|----------|
| **Mine** | Lethal. Kills instantly if not flagged. |
| **Cactus** | Deals 1 damage. |
| **Deadbush** | Moving cactus. Changes position randomly each turn. |
| **Radioactive** | Deals damage to adjacent tiles. |
| **SpiderMine** | Lethal + detects nearby players. |

> More coming soon 

---

## Obstacles

| Obstacle | Effect |
|----------|--------|
| **Natural** | Blocked unless playing as Scout. |
| **Pit** | Kills instantly (except Scout). |
| **River** | Pushes the player (except Scout). |

---

## Children (Goals)

| Child | Behavior |
|-------|----------|
| **Charlie** | Normal. Stands still. |
| **Joni** | Shy. Generates hidden tiles around them. Invisible until close. |

> More coming soon
---

## Zones 

| Zone | Visual Style |
|-------|--------------|
| **Desert** | Sandy watercolor and dead trees. |
| **Snow** | Frozen lake, bare trees and snowman. |
| **Ash** | Volcanic wasteland and Gray ash|

> More coming soon
---

## Vision System

- Each character has a **vision range** (1-3 tiles).
- Tiles outside vision are hidden (`hide = true`).
- Raycasting reveals tiles in straight lines until blocked by:
  - Hazards
  - Obstacles
  - Height differences (max ±1 level)
- Diagonal vision requires both cardinal directions to be clear.
- **Once revealed, tiles stay visible** for the rest of the match.

---

## Height System

- Mountains range from level 1 to 4.
- Players can only move between tiles with height difference ≤ 1.
- Higher tiles block vision and line of sight.
- Sprites scale and shift up/left to simulate elevation.

---

## Flag System

- Place flags on hidden tiles to mark suspected hazards.
- Correct flag → +200 points.
- Wrong flag → -200 points.
- Scout starts with 2 flags, Mosquito with 8.

---

## Scoring

| Action | Points |
|--------|--------|
| Rescue a child | +500 |
| Correct flag | +200 |
| Wrong flag | -200 |
| Step on mine (die) | -1000 |
| Step on damage hazard | -200 |
| Get detected | -50 to -500 |

---

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Move up |
| S / ↓ | Move down |
| A / ← | Move left |
| D / → | Move right |
| Arrow keys | Place flag in adjacent tile |

---

## Credits

Made with ❤️ by **imlildud**  
*Nuclear-Stic Mines Retrash'd — because minesweeper needed more love.*
