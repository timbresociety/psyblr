# Psyblr

Psyblr is a monorepo for a strategy card game. It currently includes the playable React web app, a shared pure TypeScript game engine, and a Cloudflare Worker plus Durable Object backend for authoritative 2-player realtime rooms.

## Repository structure

```text
.
├── apps
│   ├── server
│   │   ├── src
│   │   │   ├── durable-objects
│   │   │   │   └── PsyblrRoom.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── wrangler.toml
│   └── web
│       ├── public
│       ├── src
│       │   ├── components
│       │   ├── test
│       │   ├── App.tsx
│       │   ├── index.css
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vercel.json
│       └── vite.config.ts
├── packages
│   └── game-engine
│       ├── src
│       │   ├── deck.ts
│       │   ├── game.ts
│       │   ├── index.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json
└── tsconfig.base.json
```

## Packages

- `apps/web`: the current Psyblr frontend built with React, TypeScript, Vite, and Tailwind CSS.
- `packages/game-engine`: shared pure TypeScript rules, validation, reducer logic, deck helpers, and game types.
- `apps/server`: Cloudflare Worker entrypoint plus one Durable Object per Psyblr room for multiplayer state.

## Workspace commands

Install dependencies from the repo root:

```bash
npm install
```

Start the full local stack from the repo root:

```bash
npm run dev
```

This runs both services together:

- `apps/web` with Vite on [http://127.0.0.1:5173](http://127.0.0.1:5173)
- `apps/server` with Wrangler dev on [http://127.0.0.1:8787](http://127.0.0.1:8787)

Run only the web frontend:

```bash
npm run dev:web
```

Run only the Worker backend:

```bash
npm run dev:server
```

Run the current test suite:

```bash
npm run test
```

This root test command includes:

- `packages/game-engine`
- `apps/server`
- `apps/web`

Build the shared game engine, type-check the server, and build the web app:

```bash
npm run build
```

Preview the production web build:

```bash
npm run preview
```

## Workspace-specific commands

Check the Cloudflare Worker server:

```bash
npm run check --workspace @psyblr/server
```

Start the Worker locally with Wrangler:

```bash
npm run dev --workspace @psyblr/server
```

The local Worker exposes:

- `POST /api/rooms` to create a room
- `POST /api/rooms/join` to join by room code
- `POST /api/rooms/resume` to reclaim a saved seat after refresh
- `GET /api/rooms/:code/socket?playerId=...&sessionToken=...` to open a room WebSocket

Example local flow:

```bash
curl -X POST http://127.0.0.1:8787/api/rooms \
  -H 'content-type: application/json' \
  -d '{"type":"create_room","displayName":"Host"}'
```

Use the returned `roomCode`, `playerId`, and `sessionToken` to join the room and then connect a WebSocket client.

## Vercel deployment for `apps/web`

The frontend is prepared for deployment at [https://psyblr.vercel.app/](https://psyblr.vercel.app/).

1. Import this monorepo into Vercel.
2. You can deploy from the repo root directly now. The root [vercel.json](/Users/deepsheth/Documents/GitHub/psyblr/vercel.json) builds the shared engine plus `apps/web` and points Vercel at `apps/web/dist`.
3. If you prefer using `apps/web` as the Vercel Root Directory instead, the app-level [apps/web/vercel.json](/Users/deepsheth/Documents/GitHub/psyblr/apps/web/vercel.json) still works too.
4. Add the required production environment variable:

```bash
VITE_API_BASE_URL=https://your-deployed-psyblr-worker.workers.dev
```

5. Deploy the Cloudflare Worker separately and make sure the URL above is the Worker origin, not the Vercel frontend URL.
6. Deploy.

Notes:

- `VITE_API_BASE_URL` should point to the deployed Psyblr Worker origin that exposes `/api/rooms`, `/api/rooms/join`, `/api/rooms/resume`, and the room WebSocket route.
- If `VITE_API_BASE_URL` is missing on Vercel, `Create room` and `Join room` will fail because the frontend will not have a live Worker API to talk to.
- The Worker now sends CORS headers for localhost development and `https://psyblr.vercel.app`, plus `psyblr-*.vercel.app` preview-style origins.
- Production metadata, canonical URLs, Open Graph tags, and the web manifest are already wired to `https://psyblr.vercel.app/`.

## Full local development flow

1. Install dependencies once from the repo root.

```bash
npm install
```

2. Start the full stack in two processes from one command.

```bash
npm run dev
```

3. Open the frontend in your browser.

- Web app: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Worker API: [http://127.0.0.1:8787](http://127.0.0.1:8787)

4. For a two-player local test, open the web app in two browser windows or one normal window plus one private window.

5. Use `Create room` in one client and `Join room` in the other.

## Web app flow

- The home screen offers `Create room` and `Join room` for two separate players on different browsers or devices.
- Player 1 is assigned the black pool and attacks odd rounds.
- Player 2 is assigned the red pool and attacks even rounds.
- Both players ready up in the live lobby before setup begins.
- Each player secretly chooses 5 starting cards on their own client.
- Only the opening spend totals are revealed publicly after both starting hands are submitted.
- There are 10 rounds total.
- After both players lock a round card, the server resolves the round and broadcasts the public result.
- After rounds 1 to 5, each player secretly buys exactly 1 extra card from their remaining pool.
- Each player ends the game with exactly 10 selected cards and total spend of at most 69.
- Same rank on attack and defense is a wicket, which stops that attacker from scoring on all future attack rounds.

## Notes

- The web app imports shared rules from `@psyblr/game-engine`.
- The backend keeps room-authoritative state inside Durable Objects and has typed contracts for room creation, joining, resuming, readiness, setup, round locks, replenishment, and phase progression.
- The frontend uses `VITE_API_BASE_URL` in deployed environments and uses the local Worker automatically on `localhost`.
- The frontend only renders the local player's private hand, pool, and budget details. Opponent hidden state is never included in public room snapshots.
- Room sessions are saved in browser storage so a page refresh can automatically reclaim the same seat with the existing session token.
- If both players disconnect, the Durable Object preserves match state for 30 minutes. If no one reconnects before that timeout, the abandoned room is deleted.
- During reconnects, the UI shows local reconnect status, persistent opponent connection badges, and a short opponent disconnected or reconnected notice when presence changes.
- The repo is set up as an npm workspace monorepo and is ready for further expansion.
