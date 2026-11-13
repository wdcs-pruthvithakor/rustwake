# Rustwake

You start with one rusty ship and a dead FTL drive. Mine, explore a procedurally generated galaxy,
colonise worlds, automate, build fleets and megastructures, and try not to be noticed.

Plain HTML, CSS and JavaScript. No build step, no server, no image or audio assets: planets, stars,
ships, aliens and sound are all generated at runtime.

## Run

Open `index.html` in a browser, or serve the folder:

    python3 -m http.server 8080

The save lives in `localStorage` (`rustwake.save.v1`). Menu (Esc) has export, import and wipe.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Fly |
| Shift | Afterburner (uses energy) |
| Space | Mine the nearest asteroid |
| E | Orbit a planet, dock, investigate |
| Q | Nova burst (25 energy, 18 s cooldown) |
| M | Galaxy map |
| 2 to 0 | Ship, Colonies, Research, Fleet, Diplomacy, Megastructures, Codex, Empire, Ascension |
| Click | Fly there, or focus a hostile |
| Wheel | Zoom |
| H | In-game guide |

On a phone or tablet the game shows a virtual stick, MINE / BOOST / NOVA buttons and a MENU button,
and the layout compacts. Pinch to zoom, tap the prompt to interact. Add `?touch=1` to the address to
try the touch layout on a desktop.

## How it fits together

| File | What it holds |
| --- | --- |
| `js/util.js` | Seeded RNG, hashing, noise, number formatting, name generator |
| `js/data.js` | Content tables: resources, planet and star types, buildings, tech tree, weapons, hulls, fleet, enemies, megastructures, artifacts, companions, perks, universe modifiers |
| `js/universe.js` | Deterministic generation of systems, planets, belts and alien civilisations from the seed |
| `js/econ.js` | Save state, bonuses, ship stats, colonies, the economy tick, research, fleet, offline progress |
| `js/empire.js` | Jumping, diplomacy, raids, the Silence, events engine, missions, achievements, ascension |
| `js/events.js` | Event templates |
| `js/flight.js` | Real-time layer: flying, mining, combat, waves |
| `js/render.js` | Canvas rendering of the system view, planet textures, ships, portraits, minimap |
| `js/galaxy.js` | Galaxy map |
| `js/ui.js` | HUD, panels, dialogs |
| `js/audio.js` | Synthesised sound |
| `js/main.js` | Boot, input, main loop |

Only the seed and the player's changes are saved. `sysAt(cx, cy)` always returns the same system
for the same seed, so the galaxy is unbounded and costs nothing to store.

## Check

    node tools/check.js

Loads the non-DOM half of the game headlessly and exercises generation, data integrity, every event
choice, the full production chain, megastructures, combat, death, diplomacy, saving and ascension.

Font: DM Mono, SIL Open Font License (see `fonts/OFL-DMMono.txt`).
