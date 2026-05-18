# Card Cricket

Card Cricket is a local 2-player browser game built with React, TypeScript, Vite, and Tailwind CSS. It is designed for pass-device play, keeps hidden information off shared screens, and runs entirely in local browser state with no backend.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Run tests:

```bash
npm run test
```

4. Create a production build:

```bash
npm run build
```

## Game flow

- The app opens on a pass-device screen before the first secret setup.
- Player 1 secretly chooses 5 black starting cards.
- Player 2 secretly chooses 5 red starting cards.
- The app shows another pass-device screen before revealing only the total starting spend for each player.
- There are 10 rounds total.
- Player 1 attacks in odd rounds.
- Player 2 attacks in even rounds.
- After each defense choice, the app pauses on a pass-device screen before publicly revealing the round result.
- After rounds 1 to 5, each player secretly buys exactly 1 extra card from their remaining pool.
- Each player ends the game with exactly 10 selected cards and total spend of at most 69.
- Same rank on attack and defense is a wicket, which stops that attacker from scoring on all future attack rounds.

## Project structure

- `src/lib/deck.ts`: deck generation and card value helpers
- `src/lib/game.ts`: typed game rules, validation, reducer, and round resolution
- `src/components/*`: UI screens and reusable panels
- `src/test/game.test.ts`: core rules coverage

## Vercel deployment

This app is ready for static deployment on Vercel.

1. Push the repo to GitHub.
2. Import the repository into Vercel.
3. Confirm these settings:

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

4. Deploy.

Notes:

- `vercel.json` already sets the framework, install command, build command, and output directory.
- Production metadata, favicon, and social preview image are included via `index.html` and the `public/` assets.
- Generated folders like `dist/` and `node_modules/` are not meant to be committed and are ignored for normal development.
