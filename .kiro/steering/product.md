# Product Overview

Spirit of Kiro is an infinite crafting workshop game that demonstrates AI-powered emergent gameplay. The game was developed as a demo project for Kiro, with >95% of the code written by prompting Kiro.

## Core Mechanics

- **Infinite Item Generation**: Every item is unique with AI-generated descriptions, damage values, and quirks
- **Freeform Crafting**: Items have skills/quirks that can be used on other items. AI calculates realistic outcomes without hardcoded recipes
- **Item Appraisal**: Sell items to an AI appraiser that evaluates their worth
- **Emergent Interactions**: No fixed item metadata schema - AI handles any semantically meaningful item structure

## Design Philosophy

1. **AI Enables Emergent Gameplay**: Unlike traditional games with hardcoded crafting recipes, this game uses AI to enable freeform interactions that are impossible in traditional gaming
2. **Scale Improves Performance**: The game gets better with more players through shared item pools and vector-based image reuse, reducing AI generation costs and wait times over time

## Game Objects

Interactive objects include: dispenser, workbench, garbage, storage chest, computer, and a physics-based movement system with collision detection.
