# FLAT·SIX OBD Bridge (MVP)

Local ELM327 bridge for validating Bluetooth/USB OBD dongles before wiring into the main app.

**Branch:** `feature/obd-bridge-mvp`  
**UI:** http://127.0.0.1:8765  
**Does not touch production** — standalone tool under `tools/obd-bridge/`.

---

## Quick start

From the **repo root**:

```bash
npm run obd-bridge
```

First run installs `serialport` in `tools/obd-bridge/`. Then open:

**http://127.0.0.1:8765**

---

## Mac + Ancel Bluetooth dongle

1. Dongle in OBD port, ignition **ON** (engine running helps RPM).
2. **System Settings → Bluetooth** — pair the dongle.
3. Run `npm run obd-bridge`.
4. In the test UI: **Refresh ports** → select `/dev/cu.…` (not `Bluetooth-Incoming-Port`).
5. Baud **38400** (try 9600 / 115200 if connect fails).
6. **Connect** → **Live poll** toggle → watch RPM / coolant / DTCs.
7. If nothing works: open **Debug log** — raw `AT` / `01` / `03` traffic.

### Find ports manually

```bash
ls /dev/cu.*
```

---

## API (for later FLAT·SIX integration)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Bridge up, link status |
| GET | `/ports` | List serial ports |
| POST | `/connect` | `{ "port": "/dev/cu.…", "baudRate": 38400 }` |
| POST | `/disconnect` | Close port |
| POST | `/snapshot` | One-shot PIDs + DTCs |
| POST | `/poll/start` | `{ "intervalMs": 1000 }` |
| POST | `/poll/stop` | Stop polling |
| GET | `/debug` | ELM327 TX/RX log + last snapshot |
| GET | `/status` | Connection + last snapshot |

---

## What it reads (Mode 01 / 03)

- RPM, coolant °C, speed, control-module voltage, engine load
- Stored DTCs (Mode 03)

Read-only — no code clearing, no adaptations.

---

## Troubleshooting

| Symptom | Try |
|---------|-----|
| Port list empty / no new cu device | Re-pair BT; unplug/replug dongle; ignition on |
| `UNABLE TO CONNECT` | Ignition on; reseat dongle; try another baud |
| PIDs `NO DATA` but DTCs work | Engine running; some PIDs unsupported on Porsche |
| Timeout on connect | Wrong port; dongle paired but not exposing SPP |
| `npm run obd-bridge` fails | `cd tools/obd-bridge && npm install` |

**VAS 6154** is not supported here — different protocol (J2534), not ELM327.

---

## Next steps (main app)

- v1: Web Serial for USB ELM327 in browser
- v2: This bridge as optional helper for Bluetooth Classic dongles
- CORS already allows any origin for local dev
