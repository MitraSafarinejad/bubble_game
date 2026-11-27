# Bubble Game

A polished, responsive bubble-popping game built with React, TypeScript, Vite, and Tailwind CSS. It includes multiple game modes, special bubbles, combo scoring, level progression, sound feedback, pause support, and locally stored personal records.

## Features

- Calm, Classic, and Rush game modes
- Animated bubbles and particle effects
- Gold, time, and burst special bubbles
- Combo scoring and level progression
- Live timer and score display
- Pause and resume controls
- Personal-best storage with Local Storage
- Responsive touch-friendly interface
- Persian RTL interface
- Mobile-safe and accessible interactions

## Technology

- React 18
- TypeScript
- Vite 6
- Tailwind CSS 4
- Web Audio API
- Local Storage API

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000`.

### Create Production Build

```bash
npm run build
```

Build output is generated in `dist`.

### Run Type Checking

```bash
npm run typecheck
```

## How to Play

1. Select a game mode.
2. Tap or click rising bubbles before they disappear.
3. Build combos for additional points.
4. Pop special bubbles for bonuses:
   - Gold: High bonus points
   - Time: Adds three seconds
   - Burst: Pops nearby bubbles
5. Earn the highest score before the timer reaches zero.

## Game Modes

| Mode | Duration | Speed | Bubble Limit |
|---|---:|---:|---:|
| Calm | 45 seconds | Relaxed | 10 |
| Classic | 60 seconds | Standard | 14 |
| Rush | 30 seconds | Fast | 18 |

## Project Structure

```text
src/
├── BubbleGame.tsx  # Main game state and UI
├── index.css       # Styling and animations
├── main.tsx        # Application entry point
└── App.tsx         # Legacy component retained in the workspace

index.html
package.json
vite.config.js
tsconfig.json
```

## Browser Support

Modern desktop and mobile browsers, including Chrome, Edge, Firefox, and Safari.

## Future Improvements

- Global leaderboard
- User accounts
- Themes and visual styles
- More power-ups
- Daily challenges and achievements
- Django or Node.js backend integration
- Native Android packaging

## Contributing

Create a feature branch and run validation before opening a pull request.

```bash
git switch -c feature/your-feature-name
npm run typecheck
npm run build
```

## License

License information will be added when a license is selected for the project.

## Keyboard Controls

| Key | Action |
|---|---|
| `1`–`3` | Select a mode on the start screen |
| `Enter` | Start or resume the game |
| `1`–`9` | Pop the numbered visible bubble |
| `P` or `Escape` | Pause the game |
| `M` | Toggle sound |
