---
name: build-web-game
description: Build and verify production web-game systems as playable vertical slices with explicit authority, deterministic state, mobile controls, asset provenance, and performance budgets. Use for Three.js games, combat, enemies, levels, cameras, inventory, VFX, audio, editors, optimization, or release QA.
---

# Build Web Game

## Inputs

The requested player outcome, existing game state and systems, supported devices and controls, assets, and production constraints.

## System boundaries

- **World:** levels, routes, zones, collision, navigation, lighting, and camera.
- **Combat:** player verbs, timing, damage, hit reactions, and feedback.
- **Enemies:** content definitions, rigs/sockets/colliders, runtime state, and AI decisions.
- **Perception:** authoritative visibility, wall-aware line of sight, hidden-target rules, and render state derived from gameplay truth.
- **Encounters:** composition, pacing, spawn rules, objectives, and rewards.
- **Player systems:** inventory, equipment, progression, persistence, and migrations.
- **Presentation:** VFX, audio, HUD, touch controls, accessibility, and adaptive quality.
- **Production:** editor drafts, review fixtures, changelog, deployment, and player-journey QA.

## Method

1. Define authoritative data and runtime owners for each involved boundary. Keep content, visuals, collision, navigation, and encounter logic separable.
2. When perception is involved, compute one authoritative visibility state, test occlusion and target eligibility deterministically, and derive fog rendering from that state.
3. For a new combat-oriented loop, build one playable vertical slice in order: movement and camera → one verb → one enemy → feedback and reward → transition/save. Otherwise, exercise the smallest playable path through the requested subsystem.
4. Use typed versioned definitions and deterministic fixtures. Make inventory transfers, saves, and editor-to-source changes atomic and validated.
5. Design controls for keyboard, pointer, and non-overlapping reachable touch zones. Handle safe areas, orientation, audio unlock, subtitles, and reduced motion.
6. Set budgets for frame time, draw calls, geometry, textures, AI/ray work, audio voices, and long-session memory. Adapt quality deliberately.
7. Test invariants mechanically, then play the real journey on desktop and mobile. Verify crowded combat, pause/background/resume, saves, transitions, mute, failure, and release version.
8. Record source and license for every asset and connect release notes to the actual deployed revision.

## Output

A playable vertical slice or completed game-system change with deterministic state, supported controls, and player-journey evidence.

## Done

A player can complete the representative loop on supported inputs and devices, state remains conserved across transitions and saves, and production evidence matches the released build.