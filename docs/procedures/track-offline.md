# FLAT·SIX Track (offline companion)

Focused **track-day companion**: live OBD, session recording, offline knowledge search.
Ships as **one UI** (`apps/track`) with two shells — **PWA** and **Electron**.

Not a full garage/3D offline mode. Main Next.js app stays online; Track packages the OBD + KB path.

## Architecture

| Piece | Path |
| --- | --- |
| OBD core (decode, ELM, adapter seam) | [`lib/obd/`](../../lib/obd) |
| Knowledge (bundled TF search) | [`lib/knowledge/`](../../lib/knowledge) |
| Shared UI | [`apps/track/`](../../apps/track) |
| Electron shell (serialport in main) | [`apps/track-electron/`](../../apps/track-electron) |
| Lab HTTP bridge | [`tools/obd-bridge/`](../../tools/obd-bridge) |

```
lib/obd + lib/knowledge
        ↓
   apps/track (Vite React)
      ↙              ↘
  PWA build      Electron (IPC → ObdHost)
```

### Transport matrix

| Runtime | Live OBD | Offline KB / sessions |
| --- | --- | --- |
| Electron (Windows laptop) | USB + Bluetooth Classic COM | Yes |
| PWA desktop Chrome | Web Serial USB ELM | Yes |
| PWA Android Chrome | Not in v1 (browser limits) | Yes |

Adapters: `elm327` (default) · `vas6154` (experimental stub only).

## Dev

From repo root (Node 20+):

```bash
# Install Track UI deps
npm --prefix apps/track install

# UI only (talks to local bridge by default)
npm run track:dev
# → http://127.0.0.1:5173

# Local ELM bridge (USB / Classic BT)
npm run obd-bridge
# → http://127.0.0.1:8765

# Electron (bundles host + opens Vite)
npm --prefix apps/track-electron install
npm run track:electron
```

Web Serial (desktop Chrome, no bridge): open Track with `?transport=webserial` or check **Use Web Serial** on Connect. Same stack powers main-app **Live OBD** (`/obd`) via `lib/obd/webSerial.ts`.

## Build / install

```bash
# PWA assets (apps/track/dist) — host statically or preview
npm run track:pwa
npm --prefix apps/track run preview

# Windows portable Electron
npm run track:electron:pack
# → apps/track-electron/release/
```

In the main app, **Downloads** (`/downloads`) surfaces these companions (beta).
When you publish installers, set `href` on the matching entry in
[`lib/downloads.ts`](../../lib/downloads.ts).
## Offline knowledge

Track bundles `lib/knowledge` into the client. Search runs on-device (same TF `searchKnowledge` as the main app). Workshop-manual hybrid FTS + Voyage embeddings stay **online-only** in the main product.

Sessions (PID samples) store in **IndexedDB**.

## Verify

```bash
npm run obd:test
npx tsc --noEmit
npm --prefix apps/track run build
```
